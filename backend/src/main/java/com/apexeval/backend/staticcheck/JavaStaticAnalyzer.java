package com.apexeval.backend.staticcheck;

import com.apexeval.backend.runner.ProjectDescriptor;
import com.apexeval.backend.runner.RunnerContext;
import com.apexeval.backend.technology.Technology;
import com.apexeval.backend.technology.Framework;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class JavaStaticAnalyzer implements StaticAnalyzer {

    private final StaticCheckService staticCheckService;

    public JavaStaticAnalyzer(StaticCheckService staticCheckService) {
        this.staticCheckService = staticCheckService;
    }

    @Override
    public String id() {
        return "java-static-analyzer";
    }

    @Override
    public boolean supports(Technology technology, Framework framework) {
        return technology == Technology.JAVA;
    }

    @Override
    public StaticCheckResponse analyze(ProjectDescriptor project, RunnerContext context) {
        return staticCheckService.check(
                context.workspacePath(),
                context.assignmentPath(),
                project.assignmentId()
        );
    }
}