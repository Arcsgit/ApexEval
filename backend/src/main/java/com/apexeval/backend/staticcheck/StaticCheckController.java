package com.apexeval.backend.staticcheck;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class StaticCheckController {

    private final StaticCheckService staticCheckService;

    public StaticCheckController(StaticCheckService staticCheckService) {
        this.staticCheckService = staticCheckService;
    }

    @PostMapping("/api/static-check")
    public ResponseEntity<StaticCheckResponse> check(@Valid @RequestBody StaticCheckRequest request) {
        return ResponseEntity.ok(staticCheckService.check(
                request.getWorkspacePath(),
                request.getAssignmentPath(),
                request.getAssignmentId()
        ));
    }
}
