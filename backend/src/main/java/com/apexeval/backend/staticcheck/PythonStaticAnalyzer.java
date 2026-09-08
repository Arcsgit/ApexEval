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
public class PythonStaticAnalyzer implements StaticAnalyzer {

    private static final Logger log = LoggerFactory.getLogger(PythonStaticAnalyzer.class);

    private final String fixturesBasePath;
    private final ObjectMapper objectMapper;

    public PythonStaticAnalyzer(
            @Value("${apexeval.fixtures.base-path}") String fixturesBasePath) {
        this.fixturesBasePath = fixturesBasePath;
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public String id() {
        return "python-static-analyzer";
    }

    @Override
    public boolean supports(Technology technology, Framework framework) {
        return technology == Technology.PYTHON;
    }

    @Override
    public StaticCheckResponse analyze(ProjectDescriptor project, RunnerContext context) {
        log.info("PythonStaticAnalyzer.analyze for assignmentId={} path={}",
                project.assignmentId(), context.assignmentPath());

        List<StaticFinding> required = new ArrayList<>();
        List<StaticFinding> suspicious = new ArrayList<>();

        try {
            String analyzerScript = fixturesBasePath + "/python_ast_analyzer.py";
            String assignmentPath = context.assignmentPath();
            Path targetPath = Path.of(context.workspacePath(), assignmentPath);

            log.debug("Running Python analyzer: {} on {}", analyzerScript, targetPath);

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
                log.warn("Python analyzer failed: exit={} stderr={}", process.exitValue(), stderr);
                addBasicPythonChecks(required, suspicious);
                return new StaticCheckResponse(required, suspicious);
            }

            JsonNode root = objectMapper.readTree(stdout.toString());
            JsonNode files = root.path("files");
            if (!files.isArray()) {
                log.warn("Python analyzer returned no 'files' array: {}", stdout);
                addBasicPythonChecks(required, suspicious);
                return new StaticCheckResponse(required, suspicious);
            }

            int totalFunctions = 0;
            int functionsWithTypeHints = 0;

            for (JsonNode fileNode : files) {
                String relPath = fileNode.path("path").asText("");
                JsonNode functions = fileNode.path("functions");
                if (!functions.isArray()) continue;

                for (JsonNode fn : functions) {
                    totalFunctions++;
                    String name = fn.path("name").asText("");
                    int line = fn.path("line").asInt(0);
                    int column = fn.path("column").asInt(0);
                    boolean hasReturnAnno = fn.path("has_return_annotation").asBoolean(false);
                    boolean hasParamAnno = fn.path("has_param_annotations").asBoolean(false);
                    boolean missingReturn = fn.path("missing_return_annotation").asBoolean(false);
                    JsonNode missingParams = fn.path("missing_param_annotations");
                    boolean isPrintOnly = fn.path("is_print_only").asBoolean(false);
                    boolean isEmpty = fn.path("is_empty").asBoolean(false);
                    JsonNode constReturns = fn.path("constant_returns");

                    if (hasReturnAnno && hasParamAnno) {
                        functionsWithTypeHints++;
                    }

                    // Required: HAS_TYPE_HINTS per function. Java equivalent
                    // uses one HAS_CLASS / HAS_METHOD finding per declared
                    // symbol; we mirror that one-finding-per-function.
                    if (missingReturn || (missingParams.isArray() && missingParams.size() > 0)) {
                        StringBuilder msg = new StringBuilder("Function '").append(name)
                                .append("' is missing type annotations");
                        if (missingReturn) {
                            msg.append(" (return type)");
                        }
                        if (missingParams.isArray() && missingParams.size() > 0) {
                            msg.append(" (params: ");
                            for (int i = 0; i < missingParams.size(); i++) {
                                if (i > 0) msg.append(", ");
                                msg.append(missingParams.get(i).asText());
                            }
                            msg.append(")");
                        }
                        required.add(new StaticFinding(
                                "HAS_TYPE_HINTS", name, "FLAG",
                                msg.toString(), false
                        ).withLocation(relPath, line, column, name, "def " + name + "(...)"));
                    } else {
                        required.add(new StaticFinding(
                                "HAS_TYPE_HINTS", name, "FLAG",
                                "Function '" + name + "' has complete type annotations", true
                        ).withLocation(relPath, line, column, name, "def " + name + "(...)"));
                    }

                    if (isPrintOnly) {
                        suspicious.add(new StaticFinding(
                                "PRINT_ONLY_FUNCTION", name, "FLAG",
                                "Function '" + name + "' contains only a print statement", true
                        ).withLocation(relPath, line, column, name, name + "()"));
                    }

                    if (isEmpty) {
                        suspicious.add(new StaticFinding(
                                "EMPTY_FUNCTION", name, "FLAG",
                                "Function '" + name + "' has an empty body", true
                        ).withLocation(relPath, line, column, name, name + "()"));
                    }

                    if (constReturns.isArray()) {
                        for (JsonNode ret : constReturns) {
                            int retLine = ret.path("line").asInt(line);
                            int retCol = ret.path("column").asInt(column);
                            String value = ret.path("value").asText("");
                            suspicious.add(new StaticFinding(
                                    "CONSTANT_RETURN", name, "FLAG",
                                    "Function '" + name + "' returns a constant: " + value, true
                            ).withLocation(relPath, retLine, retCol, name,
                                    "return " + value));
                        }
                    }
                }
            }

            log.info("Python analyzer done: {} functions, {} with full type hints",
                    totalFunctions, functionsWithTypeHints);

        } catch (Exception e) {
            log.error("PythonStaticAnalyzer failed, using fallback: {}", e.getMessage(), e);
            addBasicPythonChecks(required, suspicious);
        }

        return new StaticCheckResponse(required, suspicious);
    }

    private void addBasicPythonChecks(List<StaticFinding> required, List<StaticFinding> suspicious) {
        required.add(new StaticFinding("HAS_TYPE_HINTS", null, "FLAG",
                "Functions must have type hints (analyzer unavailable - cannot verify)", false));
    }
}