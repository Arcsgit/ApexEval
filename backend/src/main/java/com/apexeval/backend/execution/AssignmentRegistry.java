package com.apexeval.backend.execution;

import com.apexeval.backend.assignment.AssignmentSpec;
import com.apexeval.backend.assignment.AssignmentSpecRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.file.Path;
import java.nio.file.Paths;

@Component
public class AssignmentRegistry {

    private final AssignmentSpecRepository repository;
    private final String fixturesBasePath;

    public AssignmentRegistry(
            AssignmentSpecRepository repository,
            @Value("${apexeval.fixtures.base-path}")
            String fixturesBasePath
    ) {
        this.repository = repository;
        this.fixturesBasePath = fixturesBasePath;
    }

    public AssignmentConfig get(String assignmentId) {
        AssignmentSpec spec = repository.findById(assignmentId);

        Path hiddenTest = Paths.get(
                fixturesBasePath,
                spec.getHiddenTestPath()
        );

        return new AssignmentConfig(spec, hiddenTest);
    }
}