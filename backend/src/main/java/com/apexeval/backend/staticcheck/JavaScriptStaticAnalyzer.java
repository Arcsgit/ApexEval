package com.apexeval.backend.staticcheck;

import com.apexeval.backend.runner.ProjectDescriptor;
import com.apexeval.backend.runner.RunnerContext;
import com.apexeval.backend.technology.Framework;
import com.apexeval.backend.technology.Technology;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
public class JavaScriptStaticAnalyzer implements StaticAnalyzer {

    @Override
    public String id() {
        return "javascript-static-analyzer";
    }

    @Override
    public boolean supports(Technology technology, Framework framework) {
        return technology == Technology.JAVASCRIPT || technology == Technology.TYPESCRIPT;
    }

    @Override
    public StaticCheckResponse analyze(ProjectDescriptor project, RunnerContext context) {
        // TODO: Implement JavaScript/TypeScript static analysis using ESLint or TypeScript compiler API
        // For now, return empty response
        return new StaticCheckResponse(List.of(), List.of());
    }
}