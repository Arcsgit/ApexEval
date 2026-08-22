package com.apexeval.backend.staticcheck;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class StaticCheckExceptionHandler {

    @ExceptionHandler(StaticCheckException.class)
    public ResponseEntity<Map<String, String>> handle(
            StaticCheckException exception
    ) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", exception.getMessage()));
    }
}