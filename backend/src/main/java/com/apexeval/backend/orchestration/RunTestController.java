package com.apexeval.backend.orchestration;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class RunTestController {
    private final RunTestService runTestService;

    @PostMapping("/api/run-test")
    public ResponseEntity<RunTestResponse> runTest(@Valid @RequestBody RunTestRequest request) {
        return ResponseEntity.ok(runTestService.run(request));
    }
}
