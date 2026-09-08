package com.apexeval.backend.orchestration;

import com.apexeval.backend.assignment.AssignmentPathValidator;
import com.apexeval.backend.technology.Technology;
import com.github.javaparser.ParserConfiguration;
import com.github.javaparser.StaticJavaParser;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.printer.PrettyPrinter;
import com.github.javaparser.printer.configuration.PrettyPrinterConfiguration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.stream.Stream;

@Component
public class GenericSourceContentHasher {

    private final AssignmentPathValidator pathValidator;
    private final PrettyPrinter javaPrettyPrinter;
    private final String fakeLibcIncludePath;

    public GenericSourceContentHasher(
            AssignmentPathValidator pathValidator,
            @Value("${apexeval.fixtures.base-path}") String fixturesBasePath) {
        this.pathValidator = pathValidator;
        this.fakeLibcIncludePath = computeFakeLibcIncludePath(fixturesBasePath);

        // Java canonicalizer - normalizes formatting but preserves string literals
        ParserConfiguration parserConfiguration = new ParserConfiguration()
                .setLanguageLevel(ParserConfiguration.LanguageLevel.JAVA_17);
        StaticJavaParser.setConfiguration(parserConfiguration);

        PrettyPrinterConfiguration printerConfiguration = new PrettyPrinterConfiguration()
                .setPrintComments(false)
                .setEndOfLineCharacter("\n")
                .setIndentSize(4);

        this.javaPrettyPrinter = new PrettyPrinter(printerConfiguration);
    }

    public String hashStudentSources(
            String workspacePath,
            String assignmentPath,
            Technology technology
    ) {
        Path assignmentDir = pathValidator.resolve(workspacePath, assignmentPath);

        try (Stream<Path> paths = Files.walk(assignmentDir)) {
            List<Path> sourceFiles = paths
                    .filter(Files::isRegularFile)
                    .filter(path -> !path.toString().contains("/.git/"))
                    .filter(path -> isSourceFile(path, technology))
                    .sorted()
                    .toList();

            if (sourceFiles.isEmpty()) {
                throw new IllegalArgumentException(
                        "No student source files found for technology " + technology + " in " + assignmentPath
                );
            }

            MessageDigest digest = MessageDigest.getInstance("SHA-256");

            for (Path sourceFile : sourceFiles) {
                String relativePath = assignmentDir.relativize(sourceFile)
                        .toString().replace('\\', '/');

                String content = Files.readString(sourceFile, StandardCharsets.UTF_8);
                String canonicalContent = canonicalize(content, technology, sourceFile);

                updateLengthPrefixed(digest, relativePath.getBytes(StandardCharsets.UTF_8));
                updateLengthPrefixed(digest, canonicalContent.getBytes(StandardCharsets.UTF_8));
            }

            return HexFormat.of().formatHex(digest.digest());

        } catch (IOException e) {
            throw new IllegalStateException("Could not hash assignment source files", e);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is unavailable", e);
        }
    }

    private String canonicalize(String content, Technology technology, Path sourceFile) {
        return switch (technology) {
            case JAVA -> canonicalizeJava(content);
            case PYTHON -> canonicalizePython(content);
            case C, CPP -> canonicalizeC(content, sourceFile);
            case JAVASCRIPT, TYPESCRIPT -> canonicalizeJs(content);
            default -> normalizeWhitespace(content);
        };
    }

    private String canonicalizeC(String content, Path sourceFile) {
        // Two-step canonicalization for C:
        //   1. Run gcc -E -nostdinc to strip comments and collapse
        //      whitespace, then strip trailing whitespace per line.
        //   2. As a safety net (no gcc available / parse error), fall
        //      back to the basic whitespace normalizer.
        String preprocessed = runGccPreprocessorOnly(content, sourceFile);
        String working = preprocessed != null ? preprocessed : normalizeWhitespace(content);

        // First, strip trailing whitespace from each line.
        // Then collapse ALL blank lines (preserving only the
        // separation between non-blank lines). This is aggressive on
        // purpose: a comment that gets stripped during preprocessing
        // would otherwise leave a stray blank line that breaks the
        // hash even though the program is semantically identical.
        StringBuilder out = new StringBuilder();
        boolean lastWasBlank = true;  // suppress leading blanks
        for (String line : working.split("\n")) {
            String trimmed = line.stripTrailing();
            boolean isBlank = trimmed.isEmpty();
            if (isBlank) {
                if (lastWasBlank) continue;
                out.append('\n');
                lastWasBlank = true;
            } else {
                out.append(trimmed).append('\n');
                lastWasBlank = false;
            }
        }
        // Trailing newline is fine; strip only the last one if the
        // very last output line is blank to keep the canonical form
        // consistent across "ends with newline" vs "no trailing newline".
        if (out.length() > 0 && out.charAt(out.length() - 1) == '\n' && lastWasBlank) {
            out.setLength(out.length() - 1);
        }
        return out.toString();
    }

    private String runGccPreprocessorOnly(String content, Path sourceFile) {
        try {
            // Write the source to a temp file in the SAME directory as
            // the original so #include "local.h" (with quotes) can
            // resolve sibling headers. Without this, gcc returns
            // exit code 1 when it can't find the header, and the
            // canonicalizer silently falls back to the basic
            // whitespace normalizer that doesn't strip comments.
            java.io.File parent = sourceFile.toFile().getParentFile();
            java.io.File tmp = java.io.File.createTempFile("apexeval-", ".c", parent);
            try {
                java.nio.file.Files.writeString(tmp.toPath(), content);
                // gcc -E runs the preprocessor, which strips /* */ block
                // comments and // line comments. -nostdinc keeps the
                // system include path out of the way; we add the
                // source file's directory explicitly so quoted
                // includes like #include "student_manager.h" resolve,
                // and a tiny fake-libc path so <stdio.h>/<string.h>
                // style headers do not cause a fatal error. (The fake
                // headers are bundled next to the c_ast_analyzer.py
                // script.)
                String fakeLibc = fakeLibcIncludePath;
                java.util.List<String> cmd = new java.util.ArrayList<>();
                cmd.add("gcc");
                cmd.add("-E");
                cmd.add("-nostdinc");
                cmd.add("-I" + parent.getAbsolutePath());
                if (fakeLibc != null) cmd.add("-I" + fakeLibc);
                cmd.add(tmp.getAbsolutePath());
                ProcessBuilder pb = new ProcessBuilder(cmd);
                pb.redirectErrorStream(true);
                Process process = pb.start();
                StringBuilder out = new StringBuilder();
                try (var reader = new java.io.BufferedReader(
                        new java.io.InputStreamReader(process.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        if (line.startsWith("#")) continue;
                        out.append(line).append('\n');
                    }
                }
                boolean done = process.waitFor(5, java.util.concurrent.TimeUnit.SECONDS);
                if (!done) {
                    process.destroyForcibly();
                    return null;
                }
                if (process.exitValue() != 0) return null;
                return out.toString();
            } finally {
                tmp.delete();
            }
        } catch (Exception e) {
            return null;
        }
    }

    private static String computeFakeLibcIncludePath(String fixturesBasePath) {
        if (fixturesBasePath == null || fixturesBasePath.isEmpty()) return null;
        java.io.File candidate = new java.io.File(fixturesBasePath, "c_fake_libc_include");
        return candidate.isDirectory() ? candidate.getAbsolutePath() : null;
    }

    private String canonicalizeJs(String content) {
        // JS/TS: strip block + line comments, strip trailing whitespace,
        // collapse blank lines. We avoid full AST parsing here because
        // template literals with embedded `${...}` would be expensive
        // to canonicalize correctly.
        String stripped = content.replaceAll("/\\*.*?\\*/", "");
        StringBuilder out = new StringBuilder();
        for (String line : stripped.split("\n")) {
            int commentIdx = line.indexOf("//");
            String noLineComment = commentIdx >= 0 ? line.substring(0, commentIdx) : line;
            String trimmed = noLineComment.stripTrailing();
            if (trimmed.isEmpty() && out.length() > 0
                    && out.charAt(out.length() - 1) == '\n') {
                continue;
            }
            out.append(trimmed).append('\n');
        }
        return out.toString();
    }

    private String canonicalizeJava(String source) {
        if (source.startsWith("\uFEFF")) {
            source = source.substring(1);
        }
        CompilationUnit compilationUnit = StaticJavaParser.parse(source);
        return javaPrettyPrinter.print(compilationUnit);
    }

    private String normalizeWhitespace(String content) {
        // Basic normalization: remove BOM, normalize line endings
        if (content.startsWith("\uFEFF")) {
            content = content.substring(1);
        }
        return content.replace("\r\n", "\n").replace("\r", "\n");
    }

    private String canonicalizePython(String source) {
        try {
            // Use Python's ast module via Jython or a simple normalization
            // For now, do a basic normalization that preserves string literals
            // but normalizes whitespace and removes comments
            return normalizePythonWhitespace(source);
        } catch (Exception e) {
            return normalizeWhitespace(source);
        }
    }

    private String normalizePythonWhitespace(String source) {
        // Basic Python whitespace normalization
        // This is a simplified version - in production would use Python's ast module
        StringBuilder result = new StringBuilder();
        String[] lines = source.split("\n");
        for (String line : lines) {
            // Strip trailing whitespace
            String trimmed = line.stripTrailing();
            // Skip empty lines and comments for cache key
            if (!trimmed.isEmpty() && !trimmed.startsWith("#")) {
                // Normalize indentation - replace tabs with 4 spaces
                trimmed = trimmed.replace("\t", "    ");
                result.append(trimmed).append("\n");
            }
        }
        return result.toString();
    }

    private boolean isSourceFile(Path path, Technology technology) {
        String fileName = path.getFileName().toString();
        return switch (technology) {
            case JAVA -> fileName.endsWith(".java");
            case PYTHON -> fileName.endsWith(".py");
            case JAVASCRIPT, TYPESCRIPT -> fileName.endsWith(".js") || fileName.endsWith(".ts") || fileName.endsWith(".jsx") || fileName.endsWith(".tsx");
            case C, CPP -> fileName.endsWith(".c") || fileName.endsWith(".cpp") || fileName.endsWith(".cc") || fileName.endsWith(".h") || fileName.endsWith(".hpp");
            case GO -> fileName.endsWith(".go");
            case RUST -> fileName.endsWith(".rs");
            case C_SHARP -> fileName.endsWith(".cs");
            default -> true;
        };
    }

    private void updateLengthPrefixed(MessageDigest digest, byte[] bytes) {
        digest.update((byte) (bytes.length >>> 24));
        digest.update((byte) (bytes.length >>> 16));
        digest.update((byte) (bytes.length >>> 8));
        digest.update((byte) bytes.length);
        digest.update(bytes);
    }
}