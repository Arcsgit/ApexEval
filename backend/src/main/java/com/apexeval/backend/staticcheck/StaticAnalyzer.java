package com.apexeval.backend.staticcheck;

import com.apexeval.backend.runner.ProjectDescriptor;
import com.apexeval.backend.runner.RunnerContext;
import com.apexeval.backend.technology.Technology;
import com.apexeval.backend.technology.Framework;

public interface StaticAnalyzer {

    String id();

    boolean supports(Technology technology, Framework framework);

    StaticCheckResponse analyze(
            ProjectDescriptor project,
            RunnerContext context
    );
}