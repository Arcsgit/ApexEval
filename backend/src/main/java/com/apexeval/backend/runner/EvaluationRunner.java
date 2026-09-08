package com.apexeval.backend.runner;

public interface EvaluationRunner {

    String id();

    boolean supports(ProjectDescriptor project);

    RunnerResult evaluate(ProjectDescriptor project, RunnerContext context);
}