package com.apexeval.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * ApexEval — Track A Backend Service.
 * Deterministic execution pipeline: git diff, sandboxed test execution,
 * DB-state verification (stubbed), static AST integrity checks,
 * orchestration, and agent handoff to Track B.
 */
@SpringBootApplication
public class ApexEvalApplication {

    public static void main(String[] args) {
        SpringApplication.run(ApexEvalApplication.class, args);
    }
}
