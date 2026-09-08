package com.apexeval.backend.runner;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class EvaluationRunnerRegistry {

    private final Map<String, EvaluationRunner> runners = new ConcurrentHashMap<>();

    @Autowired(required = false)
    public void setRunners(List<EvaluationRunner> runnerList) {
        if (runnerList != null) {
            for (EvaluationRunner runner : runnerList) {
                register(runner);
            }
        }
    }

    @PostConstruct
    public void init() {
    }

    public void register(EvaluationRunner runner) {
        runners.put(runner.id(), runner);
    }

    public Optional<EvaluationRunner> resolve(ProjectDescriptor project) {
        return runners.values().stream()
                .filter(r -> r.supports(project))
                .findFirst();
    }

    public Optional<EvaluationRunner> getById(String id) {
        return Optional.ofNullable(runners.get(id));
    }
}