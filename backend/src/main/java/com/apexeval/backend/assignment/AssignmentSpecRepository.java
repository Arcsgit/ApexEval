package com.apexeval.backend.assignment;

import tools.jackson.databind.ObjectMapper;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Repository;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class AssignmentSpecRepository {

    private final Map<String, AssignmentSpec> specifications =
            new ConcurrentHashMap<>();

    public AssignmentSpecRepository(ObjectMapper objectMapper) {
        try {
            PathMatchingResourcePatternResolver resolver =
                    new PathMatchingResourcePatternResolver();

            Resource[] resources = resolver.getResources(
                    "classpath:/assignments/*.json"
            );

            for (Resource resource : resources) {
                AssignmentSpec spec = objectMapper.readValue(
                        resource.getInputStream(),
                        AssignmentSpec.class
                );

                validate(spec, resource.getFilename());
                specifications.put(spec.getAssignmentId(), spec);
            }

        } catch (IOException e) {
            throw new IllegalStateException(
                    "Failed to load assignment specifications",
                    e
            );
        }
    }

    public AssignmentSpec findById(String assignmentId) {
        AssignmentSpec spec = specifications.get(assignmentId);

        if (spec == null) {
            throw new IllegalArgumentException(
                    "Unknown assignmentId: " + assignmentId
            );
        }

        return spec;
    }

    private void validate(
            AssignmentSpec spec,
            String filename
    ) {
        if (spec.getAssignmentId() == null
                || spec.getAssignmentId().isBlank()) {
            throw new IllegalStateException(
                    "Missing assignmentId in " + filename
            );
        }

        if (!"APPROVED".equals(spec.getStatus())) {
            throw new IllegalStateException(
                    "Assignment is not APPROVED: "
                            + spec.getAssignmentId()
            );
        }

        // Support both old format (assignmentType + execution) and new format (technology + runtime + build + test + limits)
        boolean hasOldFormat = spec.getAssignmentType() != null && spec.getExecution() != null;
        boolean hasNewFormat = spec.getTechnology() != null && spec.getRuntime() != null && spec.getBuild() != null && spec.getTest() != null && spec.getLimits() != null;

        if (!hasOldFormat && !hasNewFormat) {
            throw new IllegalStateException(
                    "Incomplete assignment specification (needs either old format: assignmentType + execution, or new format: technology + runtime + build + test + limits): "
                            + spec.getAssignmentId()
            );
        }
    }
}