package com.apexeval.backend.technology;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum Framework {
    NONE("none"),
    SPRING_BOOT("spring_boot"),
    DJANGO("django"),
    FAST_API("fast_api"),
    EXPRESS("express"),
    REACT("react"),
    ANGULAR("angular"),
    UNKNOWN("unknown");

    private final String value;

    Framework(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static Framework fromValue(String value) {
        for (Framework f : values()) {
            if (f.value.equalsIgnoreCase(value)) {
                return f;
            }
        }
        return UNKNOWN;
    }
}