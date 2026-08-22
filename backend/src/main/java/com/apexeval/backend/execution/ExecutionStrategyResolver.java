package com.apexeval.backend.execution;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class ExecutionStrategyResolver {

    private final Map<String, ExecutionStrategy> strategiesByType;
    private final AssignmentRegistry assignmentRegistry;

    public ExecutionStrategyResolver(
            List<ExecutionStrategy> strategies,
            AssignmentRegistry assignmentRegistry
    ) {
        this.strategiesByType = strategies.stream()
                .collect(Collectors.toUnmodifiableMap(
                        ExecutionStrategy::getAssignmentType,
                        Function.identity()
                ));
        this.assignmentRegistry = assignmentRegistry;
    }

    public ExecuteResponse executeFor(
            String workspacePath,
            String assignmentPath,
            String assignmentId
    ) {
        AssignmentConfig config = assignmentRegistry.get(assignmentId);
        String strategyName = config.getSpecification().getExecution().getStrategy();
        ExecutionStrategy strategy = strategiesByType.get(strategyName);

        if (strategy == null) {
            throw new ExecutionException("No execution strategy registered for: " + strategyName);
        }

        return strategy.execute(workspacePath, assignmentPath, assignmentId);
    }
}
