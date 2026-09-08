#!/usr/bin/env python3
"""
ApexEval Python static analyzer.

Performs AST-only analysis (no external mypy/ruff dependency at runtime) and
emits a JSON document consumed by PythonStaticAnalyzer. Each finding carries
file, line, column, symbol, and evidence so the Java side can build a
StaticFinding with the same shape JavaParser produces for Java.

Output schema:
{
  "files": [
    {
      "path": "src/main/python/calculator.py",
      "functions": [
        {
          "name": "add",
          "line": 23,
          "column": 1,
          "has_return_annotation": true,
          "has_param_annotations": true,
          "missing_return_annotation": false,
          "missing_param_annotations": [],
          "constant_returns": [ {"line": 25, "value": "0"} ],
          "is_print_only": false,
          "is_empty": false
        }
      ]
    }
  ]
}
"""
import ast
import json
import os
import sys


def analyze_function(node):
    """Return a per-function findings dict."""
    has_return_annotation = node.returns is not None
    has_param_annotations = bool(node.args.args) and all(
        a.annotation is not None for a in node.args.args
    )
    missing_param_annotations = [
        a.arg for a in node.args.args if a.annotation is None
    ]

    constant_returns = []
    for sub in ast.walk(node):
        if isinstance(sub, ast.Return) and sub.value is not None:
            if isinstance(sub.value, ast.Constant):
                constant_returns.append({
                    "line": sub.lineno,
                    "column": sub.col_offset,
                    "value": repr(sub.value.value),
                })

    is_print_only = False
    is_empty = False
    if node.body:
        if len(node.body) == 1:
            stmt = node.body[0]
            if isinstance(stmt, ast.Expr) and isinstance(stmt.value, ast.Call):
                func = stmt.value.func
                if isinstance(func, ast.Name) and func.id == "print":
                    is_print_only = True
            elif isinstance(stmt, ast.Pass):
                is_empty = True

    return {
        "name": node.name,
        "line": node.lineno,
        "column": node.col_offset,
        "has_return_annotation": has_return_annotation,
        "has_param_annotations": has_param_annotations,
        "missing_param_annotations": missing_param_annotations,
        "missing_return_annotation": not has_return_annotation,
        "constant_returns": constant_returns,
        "is_print_only": is_print_only,
        "is_empty": is_empty,
    }


def analyze_file(filepath):
    """Parse one .py file and return its findings."""
    with open(filepath, "r", encoding="utf-8") as f:
        source = f.read()
    try:
        tree = ast.parse(source, filename=filepath)
    except SyntaxError as e:
        return {"path": filepath, "error": f"SyntaxError: {e}", "functions": []}

    functions = []
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            functions.append(analyze_function(node))
    return {"path": filepath, "functions": functions}


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "usage: python_ast_analyzer.py <path>"}))
        sys.exit(0)

    root = sys.argv[1]
    # Skip directories that aren't student source. hidden-tests/, test/,
    # tests/, __pycache__/, .pytest_cache/, node_modules/ etc. should not
    # contribute to findings - the student is being graded on their
    # implementation, not on the test scaffolding.
    skip_dirs = {
        "__pycache__", ".pytest_cache", ".git", "node_modules",
        "hidden-tests", "test", "tests", "build", "dist", ".venv", "venv",
    }
    # Skip test files at the file level too. The PythonRunner copies a
    # hidden test_*.py into the source dir at execution time; if the
    # static analyzer walks the workspace it would see those tests and
    # report false HAS_TYPE_HINTS violations on them.
    is_test_file = lambda name: (
        name.startswith("test_") or name.endswith("_test.py") or name == "conftest.py"
    )
    files_out = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in skip_dirs and not d.startswith(".")]
        for filename in filenames:
            if not filename.endswith(".py"):
                continue
            if is_test_file(filename):
                continue
            filepath = os.path.join(dirpath, filename)
            relpath = os.path.relpath(filepath, root)
            result = analyze_file(filepath)
            result["path"] = relpath.replace(os.sep, "/")
            files_out.append(result)

    print(json.dumps({"files": files_out}))


if __name__ == "__main__":
    main()