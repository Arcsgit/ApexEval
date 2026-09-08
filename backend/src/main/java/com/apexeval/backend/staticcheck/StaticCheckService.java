package com.apexeval.backend.staticcheck;

import com.apexeval.backend.assignment.AssignmentPathValidator;
import com.apexeval.backend.assignment.AssignmentSpec;
import com.apexeval.backend.assignment.AssignmentSpecRepository;
import com.apexeval.backend.assignment.StaticRuleSpec;
import com.github.javaparser.StaticJavaParser;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.Node;
import com.github.javaparser.ast.body.ClassOrInterfaceDeclaration;
import com.github.javaparser.ast.body.MethodDeclaration;
import com.github.javaparser.ast.expr.AnnotationExpr;
import com.github.javaparser.ast.expr.MethodCallExpr;
import com.github.javaparser.ast.stmt.BlockStmt;
import com.github.javaparser.ast.stmt.ExpressionStmt;
import com.github.javaparser.ast.stmt.ReturnStmt;
import com.github.javaparser.ast.stmt.Statement;
import com.github.javaparser.ast.type.ClassOrInterfaceType;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

@Service
public class StaticCheckService {

    private final AssignmentSpecRepository assignmentRepository;
    private final AssignmentPathValidator pathValidator;

    public StaticCheckService(
            AssignmentSpecRepository assignmentRepository,
            AssignmentPathValidator pathValidator
    ) {
        this.assignmentRepository = assignmentRepository;
        this.pathValidator = pathValidator;
    }

    public StaticCheckResponse check(
            String workspacePath,
            String assignmentPath,
            String assignmentId
    ) {
        AssignmentSpec spec = assignmentRepository.findById(assignmentId);
        List<ParsedFile> parsedFiles = parseStudentSources(
                pathValidator.resolve(workspacePath, assignmentPath)
        );

        List<StaticFinding> required = new ArrayList<>();
        for (StaticRuleSpec rule : safeList(spec.getRequiredRules())) {
            required.addAll(evaluateRequiredRule(rule, parsedFiles));
        }

        List<StaticFinding> suspicious = new ArrayList<>();
        for (StaticRuleSpec rule : safeList(spec.getSuspiciousRules())) {
            suspicious.addAll(evaluateSuspiciousRule(rule, parsedFiles));
        }

        return new StaticCheckResponse(required, suspicious);
    }

    private record ParsedFile(String relativePath, CompilationUnit unit) {
    }

    private List<ParsedFile> parseStudentSources(Path assignmentDir) {
        List<ParsedFile> parsed = new ArrayList<>();

        try (Stream<Path> files = Files.walk(assignmentDir)) {
            for (Path path : files
                    .filter(Files::isRegularFile)
                    .filter(p -> p.toString().endsWith(".java"))
                    .filter(p -> !p.toString().contains("/.git/"))
                    .toList()) {
                try {
                    CompilationUnit unit = StaticJavaParser.parse(path);
                    String relative = assignmentDir.relativize(path)
                            .toString().replace('\\', '/');
                    parsed.add(new ParsedFile(relative, unit));
                } catch (IOException | RuntimeException ignored) {
                    // An unparseable file produces no positive static finding.
                }
            }
        } catch (IOException e) {
            throw new StaticCheckException("Could not read assignment directory", e);
        }
        return parsed;
    }

    private List<StaticFinding> evaluateRequiredRule(StaticRuleSpec rule, List<ParsedFile> files) {
        // METHOD_FORBIDDEN can match multiple methods; emit one finding per match
        // so the student sees every violation, not just the first one.
        if ("METHOD_FORBIDDEN".equals(rule.getRule())) {
            return evaluateForbiddenMethodRule(rule, files);
        }

        RuleMatch match = switch (rule.getRule()) {
            case "USES_TYPE" -> findTypeUsage(files, rule.getValue());
            case "HAS_CLASS" -> findClassDeclaration(files, rule.getValue(), false);
            case "HAS_INTERFACE" -> findClassDeclaration(files, rule.getValue(), true);
            case "HAS_INHERITANCE" -> findInheritance(files, rule.getValue());
            case "HAS_METHOD" -> findMethod(files, rule.getValue());
            case "OVERRIDES_METHOD" -> findOverriddenMethod(files, rule.getValue());
            case "HAS_ANNOTATION" -> findAnnotation(files, rule.getValue());
            case "EXTENDS_TYPE" -> findExtendsType(files, rule.getTarget(), rule.getValue());
            case "CONTAINS_TEXT" -> findText(files, rule.getValue());
            default -> throw new StaticCheckException("Unsupported required rule: " + rule.getRule());
        };

        StaticFinding finding = finding(rule, match != null, /*negated*/ false);
        if (match != null) {
            apply(finding, match);
        } else {
            // Rule was NOT satisfied. Pinpoint the closest related node so the
            // student has an actionable file/line/column rather than a blank
            // finding. This is student-specific diagnostics data - never
            // cached across submissions.
            RuleMatch violation = findViolationLocation(rule, files);
            if (violation != null) apply(finding, violation);
        }
        return List.of(finding);
    }

    private List<StaticFinding> evaluateForbiddenMethodRule(StaticRuleSpec rule, List<ParsedFile> files) {
        List<RuleMatch> forbidden = findAllForbiddenMethods(files, rule.getValueList());
        if (forbidden.isEmpty()) {
            return List.of(finding(rule, true, /*negated*/ false));
        }
        List<StaticFinding> findings = new ArrayList<>();
        for (RuleMatch match : forbidden) {
            String perMatchMessage = rule.getMessage() + " (found '" + match.symbol() + "')";
            StaticFinding finding = new StaticFinding(
                    rule.getRule(),
                    rule.getValue(),
                    rule.getSeverity(),
                    perMatchMessage,
                    false
            );
            apply(finding, match);
            findings.add(finding);
        }
        return findings;
    }

    private RuleMatch findViolationLocation(StaticRuleSpec rule, List<ParsedFile> files) {
        return switch (rule.getRule()) {
            case "USES_TYPE" -> findClosestTypeUsage(files, rule.getValue());
            case "HAS_CLASS", "HAS_INTERFACE" ->
                    findFirstTypeDeclaration(files, rule.getValue());
            case "HAS_INHERITANCE", "EXTENDS_TYPE" ->
                    findFirstTypeDeclaration(files, rule.getTarget());
            case "HAS_METHOD" -> findFirstMethod(files);
            case "OVERRIDES_METHOD" -> findFirstMethod(files);
            case "HAS_ANNOTATION" -> findFirstAnnotation(files);
            case "CONTAINS_TEXT" -> null;
            default -> null;
        };
    }

    private RuleMatch findClosestTypeUsage(List<ParsedFile> files, String requiredType) {
        // Prefer a type reference in the same conceptual family (e.g. for the
        // required type "ArrayList" we want to point at any java.util.List
        // implementation the student wrote, like "LinkedList"). Falls back to
        // the very first type reference if nothing in the family exists.
        String family = collectionFamily(requiredType);
        for (ParsedFile file : files) {
            Optional<ClassOrInterfaceType> familyMatch = file.unit().findAll(ClassOrInterfaceType.class).stream()
                    .filter(t -> sameFamily(t.getNameAsString(), family))
                    .findFirst();
            if (familyMatch.isPresent()) return RuleMatch.of(file, familyMatch.get(), familyMatch.get().getNameAsString());
        }
        for (ParsedFile file : files) {
            Optional<ClassOrInterfaceType> anyMatch = file.unit().findAll(ClassOrInterfaceType.class).stream().findFirst();
            if (anyMatch.isPresent()) return RuleMatch.of(file, anyMatch.get(), anyMatch.get().getNameAsString());
        }
        return null;
    }

    private static String collectionFamily(String typeName) {
        if (typeName == null) return "";
        return switch (typeName) {
            case "ArrayList", "LinkedList", "Vector", "Stack", "ArrayDeque" -> "List";
            case "HashSet", "TreeSet", "LinkedHashSet" -> "Set";
            case "HashMap", "TreeMap", "LinkedHashMap", "Hashtable" -> "Map";
            case "PriorityQueue" -> "Queue";
            default -> typeName;
        };
    }

    private static boolean sameFamily(String actual, String expectedFamily) {
        if (actual == null || expectedFamily == null || expectedFamily.isEmpty()) return false;
        return actual.equals(expectedFamily) || collectionFamily(actual).equals(expectedFamily);
    }

    private RuleMatch findFirstTypeDeclaration(List<ParsedFile> files, String nameHint) {
        for (ParsedFile file : files) {
            Optional<ClassOrInterfaceDeclaration> match = file.unit().findAll(ClassOrInterfaceDeclaration.class).stream().findFirst();
            if (match.isPresent()) return RuleMatch.of(file, match.get(), match.get().getNameAsString());
        }
        return null;
    }

    private RuleMatch findFirstMethod(List<ParsedFile> files) {
        for (ParsedFile file : files) {
            Optional<MethodDeclaration> match = file.unit().findAll(MethodDeclaration.class).stream().findFirst();
            if (match.isPresent()) return RuleMatch.of(file, match.get(), match.get().getNameAsString());
        }
        return null;
    }

    private RuleMatch findFirstAnnotation(List<ParsedFile> files) {
        for (ParsedFile file : files) {
            Optional<AnnotationExpr> match = file.unit().findAll(AnnotationExpr.class).stream().findFirst();
            if (match.isPresent()) return RuleMatch.of(file, match.get(), match.get().getNameAsString());
        }
        return null;
    }

    private List<StaticFinding> evaluateSuspiciousRule(StaticRuleSpec rule, List<ParsedFile> files) {
        List<RuleMatch> matches = switch (rule.getRule()) {
            case "CONSTANT_RETURN" -> constantReturns(files);
            case "PRINT_ONLY_METHOD" -> printOnlyMethods(files);
            case "EMPTY_METHOD" -> emptyMethods(files);
            default -> throw new StaticCheckException("Unsupported suspicious rule: " + rule.getRule());
        };

        if (matches.isEmpty()) {
            return List.of(finding(rule, false));
        }

        List<StaticFinding> findings = new ArrayList<>();
        for (RuleMatch match : matches) {
            StaticFinding finding = finding(rule, true);
            apply(finding, match);
            findings.add(finding);
        }
        return findings;
    }

    private StaticFinding finding(StaticRuleSpec rule, boolean satisfied) {
        return finding(rule, satisfied, false);
    }

    /**
     * Build a finding. When {@code negated} is true, the rule's
     * "presence = satisfied" semantics are inverted (used by METHOD_FORBIDDEN,
     * where finding a forbidden method means the rule is violated and a
     * per-violation message like "Forbidden method 'addMovie' was found at
     * line 9" is more useful than the generic rule message).
     */
    private StaticFinding finding(StaticRuleSpec rule, boolean satisfied, boolean negated) {
        return new StaticFinding(
                rule.getRule(), rule.getValue(), rule.getSeverity(), rule.getMessage(), satisfied
        );
    }

    private void apply(StaticFinding finding, RuleMatch match) {
        finding.withLocation(match.file(), match.line(), match.column(), match.symbol(), match.evidence());
    }

    private record RuleMatch(String file, Integer line, Integer column, String symbol, String evidence) {
        static RuleMatch of(ParsedFile file, Node node, String symbol) {
            return new RuleMatch(
                    file.relativePath(),
                    node.getBegin().map(p -> p.line).orElse(null),
                    node.getBegin().map(p -> p.column).orElse(null),
                    symbol,
                    node.toString().lines().findFirst().orElse("").trim()
            );
        }
    }

    private RuleMatch findTypeUsage(List<ParsedFile> files, String value) {
        for (ParsedFile file : files) {
            Optional<ClassOrInterfaceType> match = file.unit().findAll(ClassOrInterfaceType.class).stream()
                    .filter(t -> t.getNameAsString().equals(value)).findFirst();
            if (match.isPresent()) return RuleMatch.of(file, match.get(), value);
        }
        return null;
    }

    private RuleMatch findClassDeclaration(List<ParsedFile> files, String value, boolean interfaceRequired) {
        for (ParsedFile file : files) {
            Optional<ClassOrInterfaceDeclaration> match = file.unit().findAll(ClassOrInterfaceDeclaration.class).stream()
                    .filter(d -> d.getNameAsString().equals(value) && d.isInterface() == interfaceRequired)
                    .findFirst();
            if (match.isPresent()) return RuleMatch.of(file, match.get(), value);
        }
        return null;
    }

    private RuleMatch findInheritance(List<ParsedFile> files, String parent) {
        for (ParsedFile file : files) {
            Optional<ClassOrInterfaceDeclaration> match = file.unit().findAll(ClassOrInterfaceDeclaration.class).stream()
                    .filter(d -> d.getExtendedTypes().stream().anyMatch(t -> t.getNameAsString().equals(parent)))
                    .findFirst();
            if (match.isPresent()) return RuleMatch.of(file, match.get(), match.get().getNameAsString());
        }
        return null;
    }

    private RuleMatch findExtendsType(List<ParsedFile> files, String className, String parent) {
        for (ParsedFile file : files) {
            Optional<ClassOrInterfaceDeclaration> match = file.unit().findAll(ClassOrInterfaceDeclaration.class).stream()
                    .filter(d -> d.getNameAsString().equals(className))
                    .filter(d -> d.getExtendedTypes().stream().anyMatch(t -> t.getNameAsString().equals(parent)))
                    .findFirst();
            if (match.isPresent()) return RuleMatch.of(file, match.get(), className);
        }
        return null;
    }

    private RuleMatch findMethod(List<ParsedFile> files, String name) {
        for (ParsedFile file : files) {
            Optional<MethodDeclaration> match = file.unit().findAll(MethodDeclaration.class).stream()
                    .filter(m -> m.getNameAsString().equals(name)).findFirst();
            if (match.isPresent()) return RuleMatch.of(file, match.get(), name);
        }
        return null;
    }

    private RuleMatch findOverriddenMethod(List<ParsedFile> files, String name) {
        for (ParsedFile file : files) {
            Optional<MethodDeclaration> match = file.unit().findAll(MethodDeclaration.class).stream()
                    .filter(m -> m.getNameAsString().equals(name))
                    .filter(m -> m.getAnnotations().stream().anyMatch(a -> a.getNameAsString().equals("Override")))
                    .findFirst();
            if (match.isPresent()) return RuleMatch.of(file, match.get(), name);
        }
        return null;
    }

    private RuleMatch findAnnotation(List<ParsedFile> files, String name) {
        for (ParsedFile file : files) {
            Optional<AnnotationExpr> match = file.unit().findAll(AnnotationExpr.class).stream()
                    .filter(a -> a.getNameAsString().equals(name)).findFirst();
            if (match.isPresent()) return RuleMatch.of(file, match.get(), name);
        }
        return null;
    }

    private RuleMatch findText(List<ParsedFile> files, String text) {
        for (ParsedFile file : files) {
            if (file.unit().toString().contains(text)) {
                return new RuleMatch(file.relativePath(), null, null, text, text);
            }
        }
        return null;
    }

    private RuleMatch findForbiddenMethod(List<ParsedFile> files, List<String> names) {
        for (ParsedFile file : files) {
            for (MethodDeclaration method : file.unit().findAll(MethodDeclaration.class)) {
                if (names.contains(method.getNameAsString())) {
                    return RuleMatch.of(file, method, method.getNameAsString());
                }
            }
        }
        return null;
    }

    /**
     * Return one match per occurrence of any forbidden method name. Used to
     * emit a separate finding per violation so the student sees every
     * offending method, not just the first one.
     */
    private List<RuleMatch> findAllForbiddenMethods(List<ParsedFile> files, List<String> names) {
        if (names == null || names.isEmpty()) return List.of();
        List<RuleMatch> matches = new ArrayList<>();
        for (ParsedFile file : files) {
            for (MethodDeclaration method : file.unit().findAll(MethodDeclaration.class)) {
                if (names.contains(method.getNameAsString())) {
                    matches.add(RuleMatch.of(file, method, method.getNameAsString()));
                }
            }
        }
        return matches;
    }

    private List<RuleMatch> constantReturns(List<ParsedFile> files) {
        List<RuleMatch> matches = new ArrayList<>();
        for (ParsedFile file : files) {
            for (ReturnStmt statement : file.unit().findAll(ReturnStmt.class)) {
                boolean constant = statement.getExpression().map(e ->
                        e.isStringLiteralExpr() || e.isIntegerLiteralExpr() || e.isBooleanLiteralExpr()
                                || e.isDoubleLiteralExpr() || e.isLongLiteralExpr()
                ).orElse(false);
                if (constant) {
                    String method = statement.findAncestor(MethodDeclaration.class)
                            .map(MethodDeclaration::getNameAsString).orElse("unknown");
                    matches.add(RuleMatch.of(file, statement, method));
                }
            }
        }
        return matches;
    }

    private List<RuleMatch> printOnlyMethods(List<ParsedFile> files) {
        List<RuleMatch> matches = new ArrayList<>();
        for (ParsedFile file : files) {
            for (MethodDeclaration method : file.unit().findAll(MethodDeclaration.class)) {
                if (method.getBody().isPresent() && isPrintOnly(method.getBody().get())) {
                    matches.add(RuleMatch.of(file, method, method.getNameAsString()));
                }
            }
        }
        return matches;
    }

    private List<RuleMatch> emptyMethods(List<ParsedFile> files) {
        List<RuleMatch> matches = new ArrayList<>();
        for (ParsedFile file : files) {
            for (MethodDeclaration method : file.unit().findAll(MethodDeclaration.class)) {
                if (method.getBody().isPresent() && method.getBody().get().getStatements().isEmpty()) {
                    matches.add(RuleMatch.of(file, method, method.getNameAsString()));
                }
            }
        }
        return matches;
    }

//    private boolean isPrintOnly(BlockStmt body) {
//        if (body.getStatements().size() != 1) return false;
//        Node node = body.getStatement(0);
//        if (!node.isExpressionStmt()) return false;
//        ExpressionStmt statement = node.asExpressionStmt();
//        return statement.getExpression().findFirst(MethodCallExpr.class)
//                .map(call -> call.getNameAsString().equals("println") || call.getNameAsString().equals("print"))
//                .orElse(false);
//    }
    private boolean isPrintOnly(BlockStmt body) {
        if (body.getStatements().size() != 1) return false;
        Statement statement = body.getStatement(0);
        if (!(statement instanceof ExpressionStmt expressionStmt)) return false;
        return expressionStmt.getExpression()
                .findFirst(MethodCallExpr.class)
                .map(call -> call.getNameAsString().equals("println")
                        || call.getNameAsString().equals("print"))
                .orElse(false);
    }


    private <T> List<T> safeList(List<T> values) {
        return values == null ? List.of() : values;
    }
}
