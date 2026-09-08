package com.apexeval.backend.technology;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum Technology {
    JAVA("java"),
    PYTHON("python"),
    JAVASCRIPT("javascript"),
    TYPESCRIPT("typescript"),
    C("c"),
    CPP("cpp"),
    GO("go"),
    RUST("rust"),
    C_SHARP("c_sharp"),
    RUBY("ruby"),
    PHP("php"),
    UNKNOWN("unknown");

    private final String value;

    Technology(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static Technology fromValue(String value) {
        for (Technology t : values()) {
            if (t.value.equalsIgnoreCase(value)) {
                return t;
            }
        }
        return UNKNOWN;
    }
}