package com.apexeval.backend.orchestration;

import com.apexeval.backend.assignment.AssignmentPathValidator;
import com.github.javaparser.ParserConfiguration;
import com.github.javaparser.StaticJavaParser;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.printer.PrettyPrinter;
import com.github.javaparser.printer.configuration.PrettyPrinterConfiguration;
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
public class SourceContentHasher {

    private final AssignmentPathValidator pathValidator;
    private final PrettyPrinter prettyPrinter;

    public SourceContentHasher(
            AssignmentPathValidator pathValidator
    ) {
        this.pathValidator = pathValidator;

        ParserConfiguration parserConfiguration =
                new ParserConfiguration()
                        .setLanguageLevel(
                                ParserConfiguration.LanguageLevel.JAVA_17
                        );

        StaticJavaParser.setConfiguration(parserConfiguration);

        PrettyPrinterConfiguration printerConfiguration =
                new PrettyPrinterConfiguration()
                        .setPrintComments(false)
                        .setEndOfLineCharacter("\n")
                        .setIndentSize(4);

        this.prettyPrinter =
                new PrettyPrinter(printerConfiguration);
    }

    public String hashStudentSources(
            String workspacePath,
            String assignmentPath
    ) {
        Path assignmentDir = pathValidator.resolve(
                workspacePath,
                assignmentPath
        );

        try (Stream<Path> paths = Files.walk(assignmentDir)) {
            List<Path> sourceFiles = paths
                    .filter(Files::isRegularFile)
                    .filter(path ->
                            path.toString().endsWith(".java")
                    )
                    .filter(path ->
                            !path.toString().contains("/.git/")
                    )
                    .sorted()
                    .toList();

            if (sourceFiles.isEmpty()) {
                throw new IllegalArgumentException(
                        "No student .java files found in "
                                + assignmentPath
                );
            }

            MessageDigest digest =
                    MessageDigest.getInstance("SHA-256");

            for (Path sourceFile : sourceFiles) {
                String relativePath =
                        assignmentDir.relativize(sourceFile)
                                .toString()
                                .replace('\\', '/');

                String canonicalSource =
                        canonicalize(sourceFile);

                updateLengthPrefixed(
                        digest,
                        relativePath.getBytes(
                                StandardCharsets.UTF_8
                        )
                );

                updateLengthPrefixed(
                        digest,
                        canonicalSource.getBytes(
                                StandardCharsets.UTF_8
                        )
                );
            }

            return HexFormat.of().formatHex(
                    digest.digest()
            );

        } catch (IOException e) {
            throw new IllegalStateException(
                    "Could not hash assignment source files",
                    e
            );
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(
                    "SHA-256 is unavailable",
                    e
            );
        }
    }

    private String canonicalize(Path sourceFile)
            throws IOException {
        String source = Files.readString(
                sourceFile,
                StandardCharsets.UTF_8
        );

        if (source.startsWith("\uFEFF")) {
            source = source.substring(1);
        }

        CompilationUnit compilationUnit =
                StaticJavaParser.parse(source);

        return prettyPrinter.print(compilationUnit);
    }

    private void updateLengthPrefixed(
            MessageDigest digest,
            byte[] bytes
    ) {
        digest.update((byte) (bytes.length >>> 24));
        digest.update((byte) (bytes.length >>> 16));
        digest.update((byte) (bytes.length >>> 8));
        digest.update((byte) bytes.length);
        digest.update(bytes);
    }
}