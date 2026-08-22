package com.apexeval.backend.diff;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DiffController {

    private final GitDiffService gitDiffService;

    public DiffController(GitDiffService gitDiffService) {
        this.gitDiffService = gitDiffService;
    }

    @PostMapping("/api/diff")
    public ResponseEntity<DiffResponse> diff(@Valid @RequestBody DiffRequest request) {
        return ResponseEntity.ok(gitDiffService.computeDiff(
                request.getWorkspacePath(),
                request.getAssignmentPath(),
                request.getLastTestedCommit()
        ));
    }
}
