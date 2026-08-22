package com.apexeval.backend.assignment;

import org.springframework.stereotype.Component;

import java.nio.file.Path;
import java.nio.file.Paths;

/** Resolves a safe assignment-relative directory inside a student's workspace. */
@Component
public class AssignmentPathValidator {

    public Path resolve(String workspacePath, String assignmentPath) {
        if (assignmentPath == null || assignmentPath.isBlank()) {
            throw new IllegalArgumentException("assignmentPath must not be blank");
        }

        Path workspace = Paths.get(workspacePath).toAbsolutePath().normalize();
        Path assignment = workspace.resolve(assignmentPath).normalize();

        if (!assignment.startsWith(workspace) || assignment.equals(workspace)) {
            throw new IllegalArgumentException(
                    "assignmentPath must be a relative directory inside workspacePath"
            );
        }

        if (!assignment.toFile().isDirectory()) {
            throw new IllegalArgumentException(
                    "Assignment directory does not exist: " + assignmentPath
            );
        }

        return assignment;
    }
}
