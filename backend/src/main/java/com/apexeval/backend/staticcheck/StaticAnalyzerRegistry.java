package com.apexeval.backend.staticcheck;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import jakarta.annotation.PostConstruct;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class StaticAnalyzerRegistry {

    private static final Logger log = LoggerFactory.getLogger(StaticAnalyzerRegistry.class);

    private final Map<String, StaticAnalyzer> analyzers = new ConcurrentHashMap<>();

    @Autowired(required = false)
    public void setAnalyzers(List<StaticAnalyzer> analyzerList) {
        log.info("StaticAnalyzerRegistry: Received {} analyzers for registration", analyzerList != null ? analyzerList.size() : 0);
        if (analyzerList != null) {
            for (StaticAnalyzer analyzer : analyzerList) {
                log.info("Registering static analyzer: {}", analyzer.id());
                register(analyzer);
            }
        }
    }

    @PostConstruct
    public void init() {
        log.info("StaticAnalyzerRegistry initialized with analyzers: {}", analyzers.keySet());
    }

    public void register(StaticAnalyzer analyzer) {
        analyzers.put(analyzer.id(), analyzer);
    }

    public Optional<StaticAnalyzer> resolve(com.apexeval.backend.technology.Technology technology, com.apexeval.backend.technology.Framework framework) {
        log.debug("Resolving analyzer for technology: {}, framework: {}", technology, framework);
        Optional<StaticAnalyzer> result = analyzers.values().stream()
                .filter(a -> a.supports(technology, framework))
                .findFirst();
        log.debug("Resolved analyzer: {}", result.map(StaticAnalyzer::id).orElse("none"));
        return result;
    }

    public Optional<StaticAnalyzer> getById(String id) {
        return Optional.ofNullable(analyzers.get(id));
    }
}