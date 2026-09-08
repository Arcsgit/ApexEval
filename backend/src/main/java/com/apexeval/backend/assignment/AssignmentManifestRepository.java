package com.apexeval.backend.assignment;

import com.apexeval.backend.technology.Framework;
import com.apexeval.backend.technology.Technology;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Repository;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class AssignmentManifestRepository {

    private final Map<String, AssignmentManifest> manifests = new ConcurrentHashMap<>();

    public AssignmentManifestRepository(ObjectMapper objectMapper) {
        try {
            PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
            Resource[] resources = resolver.getResources("classpath:/assignments/*.json");

            for (Resource resource : resources) {
                AssignmentManifest manifest = objectMapper.readValue(
                        resource.getInputStream(),
                        AssignmentManifest.class
                );
                
                // Migration: Convert old format to new format
                migrateManifest(manifest);
                
                validate(manifest, resource.getFilename());
                manifests.put(manifest.getAssignmentId(), manifest);
            }

        } catch (IOException e) {
            throw new IllegalStateException("Failed to load assignment manifests", e);
        }
    }

    private void migrateManifest(AssignmentManifest manifest) {
        // Migrate from old fields to new structure.
        // Order matters: explicit fields first, ID heuristics last.
        if (manifest.getTechnology() == null) {
            Technology fromLanguage = mapLegacyLanguage(manifest.getLanguage());
            Technology fromAssignmentType = mapLegacyAssignmentType(manifest.getAssignmentType());
            Technology inferred = pickTechnology(manifest.getAssignmentId());

            if (fromLanguage != null) {
                manifest.setTechnology(fromLanguage);
            } else if (fromAssignmentType != null) {
                manifest.setTechnology(fromAssignmentType);
            } else if (inferred != null) {
                manifest.setTechnology(inferred);
            }
        }

        if (manifest.getFramework() == null) {
            Framework fromAssignmentType = mapLegacyFramework(manifest.getAssignmentType());
            if (fromAssignmentType != null) {
                manifest.setFramework(fromAssignmentType);
            }
        }

        migrateRemainingFields(manifest);
    }

    private Technology mapLegacyLanguage(String language) {
        if (language == null || language.isBlank()) {
            return null;
        }
        return switch (language.trim().toUpperCase()) {
            case "JAVA" -> Technology.JAVA;
            case "PYTHON" -> Technology.PYTHON;
            case "JAVASCRIPT", "JS" -> Technology.JAVASCRIPT;
            case "TYPESCRIPT", "TS" -> Technology.TYPESCRIPT;
            case "C" -> Technology.C;
            case "CPP", "C++", "CXX" -> Technology.CPP;
            case "GO" -> Technology.GO;
            case "RUST" -> Technology.RUST;
            case "CSHARP", "C#" -> Technology.C_SHARP;
            case "RUBY" -> Technology.RUBY;
            case "PHP" -> Technology.PHP;
            default -> null;
        };
    }

    private Technology mapLegacyAssignmentType(String assignmentType) {
        if (assignmentType == null || assignmentType.isBlank()) {
            return null;
        }
        String normalized = assignmentType.trim().toUpperCase();
        if (normalized.startsWith("PLAIN_JAVA") || normalized.startsWith("SPRING_BOOT")) {
            return Technology.JAVA;
        }
        if (normalized.startsWith("PYTHON")) {
            return Technology.PYTHON;
        }
        if (normalized.startsWith("PLAIN_C")) {
            return Technology.C;
        }
        if (normalized.startsWith("PLAIN_CPP")) {
            return Technology.CPP;
        }
        if (normalized.startsWith("JAVASCRIPT") || normalized.startsWith("REACT")
                || normalized.startsWith("ANGULAR") || normalized.startsWith("EXPRESS")) {
            return Technology.JAVASCRIPT;
        }
        return null;
    }

    private Framework mapLegacyFramework(String assignmentType) {
        if (assignmentType == null || assignmentType.isBlank()) {
            return null;
        }
        String normalized = assignmentType.trim().toUpperCase();
        if (normalized.startsWith("SPRING_BOOT")) {
            return Framework.SPRING_BOOT;
        }
        if (normalized.startsWith("DJANGO")) {
            return Framework.DJANGO;
        }
        if (normalized.startsWith("FAST_API") || normalized.startsWith("FASTAPI")) {
            return Framework.FAST_API;
        }
        if (normalized.startsWith("EXPRESS")) {
            return Framework.EXPRESS;
        }
        if (normalized.startsWith("REACT")) {
            return Framework.REACT;
        }
        if (normalized.startsWith("ANGULAR")) {
            return Framework.ANGULAR;
        }
        return null;
    }

    private Technology pickTechnology(String assignmentId) {
        if (assignmentId == null) {
            return null;
        }
        String lower = assignmentId.toLowerCase();

        // Use word-boundary style matching so substrings inside other words
        // (e.g. "c-" inside "generic-stack-v1") do not trigger false positives.
        if (matchesAtWordBoundary(lower, "python")) return Technology.PYTHON;
        if (matchesAtWordBoundary(lower, "react")) return Technology.JAVASCRIPT;
        if (matchesAtWordBoundary(lower, "angular")) return Technology.JAVASCRIPT;
        if (matchesAtWordBoundary(lower, "express")) return Technology.JAVASCRIPT;
        if (matchesAtWordBoundary(lower, "spring")) return Technology.JAVA;
        if (matchesAtWordBoundary(lower, "django")) return Technology.PYTHON;
        if (matchesAtWordBoundary(lower, "fastapi") || matchesAtWordBoundary(lower, "fast-api")) {
            return Technology.PYTHON;
        }
        if (lower.startsWith("c-") || lower.contains("-c-") || lower.endsWith("-c")) {
            return Technology.C;
        }
        if (matchesAtWordBoundary(lower, "cpp") || matchesAtWordBoundary(lower, "c++")) {
            return Technology.CPP;
        }
        if (matchesAtWordBoundary(lower, "go")) return Technology.GO;
        if (matchesAtWordBoundary(lower, "rust")) return Technology.RUST;
        if (matchesAtWordBoundary(lower, "csharp") || matchesAtWordBoundary(lower, "c#")) {
            return Technology.C_SHARP;
        }
        if (matchesAtWordBoundary(lower, "java")) return Technology.JAVA;
        return null;
    }

    private boolean matchesAtWordBoundary(String haystack, String needle) {
        int idx = haystack.indexOf(needle);
        while (idx >= 0) {
            boolean leftOk = idx == 0 || !isWordChar(haystack.charAt(idx - 1));
            boolean rightOk = idx + needle.length() == haystack.length()
                    || !isWordChar(haystack.charAt(idx + needle.length()));
            if (leftOk && rightOk) {
                return true;
            }
            idx = haystack.indexOf(needle, idx + 1);
        }
        return false;
    }

    private boolean isWordChar(char c) {
        return Character.isLetterOrDigit(c) || c == '_';
    }

    // Migrate runtime if missing
    private void migrateRemainingFields(AssignmentManifest manifest) {
        if (manifest.getRuntime() == null) {
            AssignmentManifest.RuntimeConfig runtime = new AssignmentManifest.RuntimeConfig();

            // Infer image based on technology
            if (manifest.getTechnology() == Technology.JAVA) {
                runtime.setImage("apexeval/student-workspace:latest");
            } else if (manifest.getTechnology() == Technology.PYTHON) {
                runtime.setImage("apexeval/python-runner:latest");
            } else if (manifest.getTechnology() == Technology.JAVASCRIPT ||
                       manifest.getTechnology() == Technology.TYPESCRIPT) {
                runtime.setImage("node:20-slim");
            } else if (manifest.getTechnology() == Technology.C ||
                       manifest.getTechnology() == Technology.CPP) {
                runtime.setImage("gcc:13");
            } else {
                runtime.setImage("apexeval/student-workspace:latest");
            }
            manifest.setRuntime(runtime);
        }

        // Migrate build if missing
        if (manifest.getBuild() == null) {
            manifest.setBuild(new AssignmentManifest.BuildConfig());
        }

        // Migrate test if missing
        if (manifest.getTest() == null) {
            manifest.setTest(new AssignmentManifest.TestConfig());
        }

        // Migrate limits if missing
        if (manifest.getLimits() == null) {
            manifest.setLimits(new AssignmentManifest.LimitsConfig());
            manifest.getLimits().setTimeoutSeconds(30);
            manifest.getLimits().setMemoryMb(1024);
            manifest.getLimits().setCpuCores(1.0);
            manifest.getLimits().setMaxOutputBytes(1000000);
            manifest.getLimits().setMaxProcesses(100);
            manifest.getLimits().setNetworkEnabled(false);
            manifest.getLimits().setPrivileged(false);
        }

        // Migrate hiddenTests if missing
        if (manifest.getHiddenTests() == null) {
            manifest.setHiddenTests(new AssignmentManifest.HiddenTestsConfig());
        }

        // Migrate dbVerification if missing
        if (manifest.getDbVerification() == null) {
            manifest.setDbVerification(new AssignmentManifest.DbVerificationConfig());
            manifest.getDbVerification().setApplicable(false);
            manifest.getDbVerification().setStrategy("NO_OP");
        }
    }

    public AssignmentManifest findById(String assignmentId) {
        AssignmentManifest manifest = manifests.get(assignmentId);
        if (manifest == null) {
            throw new IllegalArgumentException("Unknown assignmentId: " + assignmentId);
        }
        return manifest;
    }

    private void validate(AssignmentManifest manifest, String filename) {
        if (manifest.getAssignmentId() == null || manifest.getAssignmentId().isBlank()) {
            throw new IllegalStateException("Missing assignmentId in " + filename);
        }
        
        if (!"APPROVED".equals(manifest.getStatus())) {
            throw new IllegalStateException("Assignment is not APPROVED: " + manifest.getAssignmentId());
        }
        
        if (manifest.getTechnology() == null || manifest.getRuntime() == null) {
            throw new IllegalStateException("Incomplete assignment manifest: " + manifest.getAssignmentId());
        }
    }
}