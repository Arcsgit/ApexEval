package com.apexeval.backend.technology;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum EvaluationMode {
    FUNCTION("function"),
    CLI("cli"),
    HTTP_API("http_api"),
    FRONTEND("frontend"),
    STATIC_ANALYSIS("static_analysis"),
    INTEGRATION("integration"),
    END_TO_END("end_to_end");

    private final String value;

    EvaluationMode(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static EvaluationMode fromValue(String value) {
        for (EvaluationMode e : values()) {
            if (e.value.equalsIgnoreCase(value)) {
                return e;
            }
        }
        return CLI;
    }
}