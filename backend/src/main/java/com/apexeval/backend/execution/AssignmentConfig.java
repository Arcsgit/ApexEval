package com.apexeval.backend.execution;

import com.apexeval.backend.assignment.AssignmentSpec;

import java.nio.file.Path;

public class AssignmentConfig {

    private final AssignmentSpec specification;
    private final Path hiddenTestFile;

    public AssignmentConfig(
            AssignmentSpec specification,
            Path hiddenTestFile
    ) {
        this.specification = specification;
        this.hiddenTestFile = hiddenTestFile;
    }

    public AssignmentSpec getSpecification() {
        return specification;
    }

    public Path getHiddenTestFile() {
        return hiddenTestFile;
    }

    public String getAssignmentId() {
        return specification.getAssignmentId();
    }

    public String getAssignmentType() {
        return specification.getAssignmentType();
    }

    public String getTestClassName() {
        return specification.getHiddenTestClass();
    }

    public int getTimeoutSeconds() {
        return specification.getExecution().getTimeoutSeconds();
    }
}