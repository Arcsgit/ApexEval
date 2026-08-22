package com.apexeval.backend.execution;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ExecuteController {

    private final ExecutionStrategyResolver resolver;

    public ExecuteController(ExecutionStrategyResolver resolver) {
        this.resolver = resolver;
    }

    @PostMapping("/api/execute")
    public ResponseEntity<ExecuteResponse> execute(@Valid @RequestBody ExecuteRequest request) {
        return ResponseEntity.ok(resolver.executeFor(
                request.getWorkspacePath(),
                request.getAssignmentPath(),
                request.getAssignmentId()
        ));
    }
}
