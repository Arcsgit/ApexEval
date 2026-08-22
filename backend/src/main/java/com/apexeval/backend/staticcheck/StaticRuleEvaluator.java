package com.apexeval.backend.staticcheck;

import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.body.ClassOrInterfaceDeclaration;
import com.github.javaparser.ast.body.MethodDeclaration;
import com.github.javaparser.ast.expr.AnnotationExpr;
import com.github.javaparser.ast.type.ClassOrInterfaceType;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class StaticRuleEvaluator {

    public boolean evaluate(
            StaticRule rule,
            List<CompilationUnit> units
    ) {
        return switch (rule.getRule()) {
            case "USES_TYPE" ->
                    usesType(units, rule.getValue());

            case "HAS_INTERFACE" ->
                    hasInterface(units, rule.getValue());

            case "HAS_INHERITANCE" ->
                    hasInheritance(units, rule.getValue());

            case "OVERRIDES_METHOD" ->
                    overridesMethod(units, rule.getValue());

            case "HAS_ANNOTATION" ->
                    hasAnnotation(units, rule.getValue());

            case "CONTAINS_TEXT" ->
                    containsText(units, rule.getValue());

            default ->
                    throw new StaticCheckException(
                            "Unsupported static rule: " + rule.getRule()
                    );
        };
    }

    private boolean usesType(
            List<CompilationUnit> units,
            String typeName
    ) {
        return units.stream()
                .flatMap(unit ->
                        unit.findAll(ClassOrInterfaceType.class).stream()
                )
                .anyMatch(type ->
                        type.getNameAsString().equals(typeName)
                );
    }

    private boolean hasInterface(
            List<CompilationUnit> units,
            String interfaceName
    ) {
        return units.stream()
                .flatMap(unit ->
                        unit.findAll(
                                ClassOrInterfaceDeclaration.class
                        ).stream()
                )
                .anyMatch(declaration ->
                        declaration.isInterface()
                                && declaration.getNameAsString()
                                .equals(interfaceName)
                );
    }

    private boolean hasInheritance(
            List<CompilationUnit> units,
            String parentClassName
    ) {
        return units.stream()
                .flatMap(unit ->
                        unit.findAll(
                                ClassOrInterfaceDeclaration.class
                        ).stream()
                )
                .anyMatch(declaration ->
                        declaration.getExtendedTypes()
                                .stream()
                                .anyMatch(type ->
                                        type.getNameAsString()
                                                .equals(parentClassName)
                                )
                );
    }

    private boolean overridesMethod(
            List<CompilationUnit> units,
            String methodName
    ) {
        return units.stream()
                .flatMap(unit ->
                        unit.findAll(MethodDeclaration.class).stream()
                )
                .anyMatch(method ->
                        method.getNameAsString().equals(methodName)
                                && method.getAnnotations()
                                .stream()
                                .anyMatch(annotation ->
                                        annotation.getNameAsString()
                                                .equals("Override")
                                )
                );
    }

    private boolean hasAnnotation(
            List<CompilationUnit> units,
            String annotationName
    ) {
        return units.stream()
                .flatMap(unit ->
                        unit.findAll(AnnotationExpr.class).stream()
                )
                .anyMatch(annotation ->
                        annotation.getNameAsString()
                                .equals(annotationName)
                );
    }

    private boolean containsText(
            List<CompilationUnit> units,
            String text
    ) {
        return units.stream()
                .anyMatch(unit -> unit.toString().contains(text));
    }
}