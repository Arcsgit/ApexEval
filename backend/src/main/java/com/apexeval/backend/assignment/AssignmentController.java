package com.apexeval.backend.assignment;

import com.apexeval.backend.technology.Technology;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/assignments")
@RequiredArgsConstructor
public class AssignmentController {

    private final AssignmentManifestRepository manifestRepository;

    @GetMapping
    public ResponseEntity<List<AssignmentResponse>> listAssignments() {
        // Get all loaded manifests and convert to frontend response
        List<AssignmentResponse> assignments = manifestRepository.findAll()
            .stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
        return ResponseEntity.ok(assignments);
    }

    @GetMapping("/{assignmentId}")
    public ResponseEntity<AssignmentResponse> getAssignment(@PathVariable String assignmentId) {
        try {
            AssignmentManifest manifest = manifestRepository.findById(assignmentId);
            return ResponseEntity.ok(toResponse(manifest));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    private AssignmentResponse toResponse(AssignmentManifest manifest) {
        AssignmentResponse response = new AssignmentResponse();
        response.setId(manifest.getAssignmentId());
        response.setCourseId(manifest.getMetadata() != null ? manifest.getMetadata().get("courseId") : "cs101");
        response.setCourseName(manifest.getMetadata() != null ? manifest.getMetadata().get("courseName") : "Data Structures");
        response.setTitle(manifest.getMetadata() != null ? manifest.getMetadata().get("title") : manifest.getAssignmentId());
        response.setDescription(manifest.getMetadata() != null ? manifest.getMetadata().get("description") : "");
        
        // Extract requirements from requiredRules
        if (manifest.getRequiredRules() != null) {
            response.setRequirements(manifest.getRequiredRules()
                .stream()
                .map(r -> r.getMessage() != null ? r.getMessage() : r.getRule())
                .collect(Collectors.toList()));
        }
        
        // Extract constraints from suspiciousRules
        if (manifest.getSuspiciousRules() != null) {
            response.setConstraints(manifest.getSuspiciousRules()
                .stream()
                .map(r -> r.getMessage() != null ? r.getMessage() : r.getRule())
                .collect(Collectors.toList()));
        }
        
        // Map technology to allowed languages
        Technology tech = manifest.getTechnology();
        response.setAllowedLanguages(mapTechnologyToLanguages(tech));
        response.setDefaultLanguage(mapTechnologyToDefaultLanguage(tech));
        
        // Difficulty from metadata
        response.setDifficulty(manifest.getMetadata() != null ? manifest.getMetadata().getOrDefault("difficulty", "MEDIUM") : "MEDIUM");
        
        // Week/day from metadata or defaults
        response.setWeek(manifest.getMetadata() != null && manifest.getMetadata().containsKey("week") 
            ? Integer.parseInt(manifest.getMetadata().get("week")) : 1);
        response.setDay(manifest.getMetadata() != null && manifest.getMetadata().containsKey("day") 
            ? Integer.parseInt(manifest.getMetadata().get("day")) : 1);
        
        // Due date - use a future date for testing
        response.setDueDate(Instant.now().plusSeconds(86400 * 7).toString()); // 1 week from now
        
        response.setMaxAttempts(5);
        response.setRuntimeLimitMs(manifest.getLimits() != null ? manifest.getLimits().getTimeoutSeconds() * 1000 : 60000);
        response.setMemoryLimitMb((int) (manifest.getLimits() != null ? manifest.getLimits().getMemoryMb() : 1024));
        response.setStatus(manifest.getStatus() != null ? manifest.getStatus() : "PUBLISHED");
        
        // Estimate test counts from rules
        int requiredCount = manifest.getRequiredRules() != null ? manifest.getRequiredRules().size() : 0;
        int suspiciousCount = manifest.getSuspiciousRules() != null ? manifest.getSuspiciousRules().size() : 0;
        response.setTotalTests(Math.max(requiredCount, 10)); // At least 10 tests
        response.setTotalHiddenTests(5);
        response.setTotalStaticChecks(requiredCount + suspiciousCount);
        
        // Starter code - empty for now
        response.setStarterCode(Map.of());
        
        response.setCreatedAt(Instant.now().minusSeconds(86400 * 30).toString()); // 30 days ago
        response.setPublishedAt(Instant.now().minusSeconds(86400 * 10).toString()); // 10 days ago
        
        // Extract assignmentPath from hiddenTests.path or build.workingDirectory
        String path = null;
        if (manifest.getHiddenTests() != null && manifest.getHiddenTests().getPath() != null) {
            path = manifest.getHiddenTests().getPath().split("/")[0];
        } else if (manifest.getBuild() != null && manifest.getBuild().getWorkingDirectory() != null) {
            path = manifest.getBuild().getWorkingDirectory().replace("/workspace/", "");
        }
        response.setAssignmentPath(path);
        
        return response;
    }

    private List<String> mapTechnologyToLanguages(Technology tech) {
        if (tech == null) return List.of("java");
        return switch (tech) {
            case JAVA -> List.of("java");
            case PYTHON -> List.of("python");
            case JAVASCRIPT -> List.of("javascript", "typescript");
            case TYPESCRIPT -> List.of("typescript", "javascript");
            case C -> List.of("c");
            case CPP -> List.of("cpp");
            case GO -> List.of("go");
            case RUST -> List.of("rust");
            case C_SHARP -> List.of("csharp");
            default -> List.of("java");
        };
    }

    private String mapTechnologyToDefaultLanguage(Technology tech) {
        if (tech == null) return "java";
        return switch (tech) {
            case JAVA -> "java";
            case PYTHON -> "python";
            case JAVASCRIPT -> "javascript";
            case TYPESCRIPT -> "typescript";
            case C -> "c";
            case CPP -> "cpp";
            case GO -> "go";
            case RUST -> "rust";
            case C_SHARP -> "csharp";
            default -> "java";
        };
    }
}