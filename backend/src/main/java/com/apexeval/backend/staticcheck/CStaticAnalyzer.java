package com.apexeval.backend.staticcheck;

import com.apexeval.backend.runner.ProjectDescriptor;
import com.apexeval.backend.runner.RunnerContext;
import com.apexeval.backend.technology.Framework;
import com.apexeval.backend.technology.Technology;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Component
public class CStaticAnalyzer implements StaticAnalyzer {

    private static final Logger log = LoggerFactory.getLogger(CStaticAnalyzer.class);

    private final String fixturesBasePath;
    private final ObjectMapper objectMapper;

    public CStaticAnalyzer(
            @Value("${apexeval.fixtures.base-path}") String fixturesBasePath) {
        this.fixturesBasePath = fixturesBasePath;
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public String id() {
        return "c-static-analyzer";
    }

    @Override
    public boolean supports(Technology technology, Framework framework) {
        return technology == Technology.C || technology == Technology.CPP;
    }

    @Override
    public StaticCheckResponse analyze(ProjectDescriptor project, RunnerContext context) {
        log.info("CStaticAnalyzer.analyze for assignmentId={} path={}",
                project.assignmentId(), context.assignmentPath());

        List<StaticFinding> required = new ArrayList<>();
        List<StaticFinding> suspicious = new ArrayList<>();

        try {
            String analyzerScript = fixturesBasePath + "/c_ast_analyzer.py";
            Path targetPath = Path.of(context.workspacePath(), context.assignmentPath());

            log.debug("Running C analyzer: {} on {}", analyzerScript, targetPath);

            ProcessBuilder pb = new ProcessBuilder("python3", analyzerScript, targetPath.toString());
            pb.directory(new java.io.File(context.workspacePath()));
            Process process = pb.start();

            StringBuilder stdout = new StringBuilder();
            StringBuilder stderr = new StringBuilder();
            try (BufferedReader outReader = new BufferedReader(new InputStreamReader(process.getInputStream()));
                 BufferedReader errReader = new BufferedReader(new InputStreamReader(process.getErrorStream()))) {
                String line;
                while ((line = outReader.readLine()) != null) {
                    stdout.append(line).append("\n");
                }
                while ((line = errReader.readLine()) != null) {
                    stderr.append(line).append("\n");
                }
            }

            boolean finished = process.waitFor(30, TimeUnit.SECONDS);
            if (!finished || process.exitValue() != 0) {
                log.warn("C analyzer failed: exit={} stderr={}", process.exitValue(), stderr);
                addFallback(project, context, required, suspicious);
                return new StaticCheckResponse(required, suspicious);
            }

            JsonNode root = objectMapper.readTree(stdout.toString());
            JsonNode files = root.path("files");
            if (!files.isArray()) {
                log.warn("C analyzer returned no 'files' array");
                addFallback(project, context, required, suspicious);
                return new StaticCheckResponse(required, suspicious);
            }

            // We want one HAS_FUNCTION finding per declared function and
            // one USES_TYPE finding per usage of the type. Match the
            // Java analyzer's per-symbol shape.
            for (JsonNode fileNode : files) {
                String relPath = fileNode.path("path").asText("");

                JsonNode functions = fileNode.path("functions");
                if (functions.isArray()) {
                    for (JsonNode fn : functions) {
                        String name = fn.path("name").asText("");
                        int line = fn.path("line").asInt(0);
                        int column = fn.path("column").asInt(0);
                        boolean isEmpty = fn.path("is_empty").asBoolean(false);
                        String retType = fn.path("return_type").asText("?");
                        required.add(new StaticFinding(
                                "HAS_FUNCTION", name, "FLAG",
                                "Function '" + name + "' is declared", true
                        ).withLocation(relPath, line, column, name,
                                retType + " " + name + "(...)"));
                    }
                }

                JsonNode typeUses = fileNode.path("type_uses");
                if (typeUses.isArray()) {
                    for (JsonNode tu : typeUses) {
                        String name = tu.path("name").asText("");
                        int line = tu.path("line").asInt(0);
                        int column = tu.path("column").asInt(0);
                        required.add(new StaticFinding(
                                "USES_TYPE", name, "FLAG",
                                "Type '" + name + "' is used", true
                        ).withLocation(relPath, line, column, name, "Student"));
                    }
                }

                JsonNode unsafe = fileNode.path("unsafe_calls");
                if (unsafe.isArray()) {
                    for (JsonNode u : unsafe) {
                        String fn = u.path("function").asText("");
                        int line = u.path("line").asInt(0);
                        int column = u.path("column").asInt(0);
                        suspicious.add(new StaticFinding(
                                "UNSAFE_STRCPY", fn, "FLAG",
                                "Avoid " + fn + " - use strncpy or strlcpy to prevent buffer overflow", true
                        ).withLocation(relPath, line, column, fn, fn + "(...)"));
                    }
                }

                JsonNode hacks = fileNode.path("hack_comments");
                if (hacks.isArray()) {
                    for (JsonNode h : hacks) {
                        String text = h.path("text").asText("");
                        int line = h.path("line").asInt(0);
                        int column = h.path("column").asInt(0);
                        suspicious.add(new StaticFinding(
                                "HACK_COMMENT", text, "WARN",
                                "Suspicious marker in code: " + text, true
                        ).withLocation(relPath, line, column, "comment", text));
                    }
                }

                JsonNode printfMismatches = fileNode.path("printf_mismatches");
                if (printfMismatches.isArray()) {
                    for (JsonNode p : printfMismatches) {
                        String fn = p.path("function").asText("printf");
                        String spec = p.path("spec").asText("");
                        String expected = p.path("expected").asText("");
                        String actual = p.path("actual").asText("");
                        int line = p.path("line").asInt(0);
                        int column = p.path("column").asInt(0);
                        String msg = fn + " format specifier " + spec
                                + " expects " + expected + " but argument looks like " + actual;
                        suspicious.add(new StaticFinding(
                                "PRINTF_FORMAT_MISMATCH", spec, "WARN",
                                msg, true
                        ).withLocation(relPath, line, column, fn, spec));
                    }
                }
            }

            log.info("C analyzer done: required={}, suspicious={}",
                    required.size(), suspicious.size());

        } catch (Exception e) {
            log.error("CStaticAnalyzer failed, using fallback: {}", e.getMessage(), e);
            addFallback(project, context, required, suspicious);
        }

        return new StaticCheckResponse(required, suspicious);
    }

    private void addFallback(ProjectDescriptor project, RunnerContext context,
                             List<StaticFinding> required, List<StaticFinding> suspicious) {
        // When the C analyzer subprocess fails (e.g. pycparser not
        // available), emit one unsatisfied HAS_FUNCTION finding per
        // declared function so the student gets a clear signal that
        // static analysis is unavailable rather than a silent pass.
        required.add(new StaticFinding("HAS_FUNCTION", null, "FLAG",
                "C static analyzer unavailable - cannot verify required functions", false));
    }
}