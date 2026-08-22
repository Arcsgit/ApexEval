package com.apexeval.backend.diff;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Setter
@Getter
public class DiffResponse {

    private List<String> changedFiles;
    private String currentCommit;
    private String diffContent;

    public DiffResponse() {
    }

    public DiffResponse(
            List<String> changedFiles,
            String currentCommit,
            String diffContent
    ) {
        this.changedFiles = changedFiles;
        this.currentCommit = currentCommit;
        this.diffContent = diffContent;
    }
}
