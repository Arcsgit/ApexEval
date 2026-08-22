package com.apexeval.backend.staticcheck;

public class StaticCheckException extends RuntimeException {

    public StaticCheckException(String message) {
        super(message);
    }

    public StaticCheckException(String message, Throwable cause) {
        super(message, cause);
    }
}