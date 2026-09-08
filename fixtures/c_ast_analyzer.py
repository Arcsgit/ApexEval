#!/usr/bin/env python3
"""
ApexEval C/C++ static analyzer.

Uses pycparser to parse each .c/.cpp/.h file in the assignment tree and
emit a JSON document consumed by CStaticAnalyzer. Each finding carries
file, line, column, symbol, and evidence so the Java side can build a
StaticFinding with the same shape JavaParser produces for Java.

Supported rules:
  - HAS_FUNCTION <name>  : emits one finding per declared function
  - USES_TYPE   <name>  : emits one finding per type usage
  - UNSAFE_STRCPY       : flags every call to strcpy/strcat
  - MAGIC_NUMBER        : flags suspicious integer literals in arithmetic
                          (heuristic: literal != 0/1/-1 in a binary op or
                          return statement)
  - EMPTY_FUNCTION      : flags functions with an empty body
  - HACK_COMMENT        : flags TODO/HACK/FIXME comments (suspicious)

Output schema:
{
  "files": [
    {
      "path": "src/student_manager.c",
      "functions": [
        {
          "name": "add_student",
          "line": 12,
          "column": 5,
          "return_type": "int",
          "is_empty": false
        }
      ],
      "type_uses": [
        { "name": "Student", "line": 18, "column": 13 }
      ],
      "unsafe_calls": [
        { "function": "strcpy", "line": 30, "column": 9 }
      ],
      "magic_numbers": [
        { "value": "101", "line": 21, "column": 28 }
      ],
      "hack_comments": [
        { "text": "HACK: ...", "line": 28, "column": 5 }
      ]
    }
  ]
}
"""
import json
import os
import re
import sys

try:
    import pycparser
    from pycparser import c_ast
except ImportError:
    print(json.dumps({
        "error": "pycparser not installed - run: pip3 install pycparser",
        "files": []
    }))
    sys.exit(0)


# A tiny fake stdlib header so we can parse student C code that does
# #include <stdio.h> / <string.h> / <stdlib.h> without actually having
# the system headers. The script ships its own minimal set under
# fixtures/c_fake_libc_include/ (created when this analyzer is added
# to a workspace). pycparser also looks for fake_libc_include alongside
# its own module, but that's optional.
_HERE = os.path.dirname(os.path.abspath(__file__))
_FAKE_LIBC = os.path.join(_HERE, "c_fake_libc_include")
if not os.path.isdir(_FAKE_LIBC):
    _FAKE_LIBC = None


class AstCache:
    """One pycparser.CParser per file, lazily created."""

    def __init__(self):
        self._parsers = {}

    def parse(self, filepath, source):
        if filepath not in self._parsers:
            self._parsers[filepath] = pycparser.CParser()
        try:
            return self._parsers[filepath].parse(source, filename=filepath)
        except pycparser.plyparser.ParseError as e:
            return None


# Build a single CParser and reuse it. pycparser's CParser is not
# thread-safe but the analyzer is invoked serially per request.
_PARSER = pycparser.CParser()


def _preprocess_with_linemap(source, filepath):
    """Run gcc -E and return (cleaned source, lineno_map).

    lineno_map[ppl_line] = original_line_in_user_file. The preprocessor
    emits `# <new_lineno> "<file>"` whenever it switches files; the very
    next non-marker line is at line `new_lineno` in that file. We use
    that to build a per-output-line -> user-line lookup so analyzer
    findings point at the right spot in the student's source.
    """
    if not (_FAKE_LIBC and os.path.isdir(_FAKE_LIBC)):
        return None, None
    import subprocess
    extra_include = os.path.dirname(filepath)
    try:
        pre = subprocess.run(
            ["gcc", "-E", "-nostdinc",
             f"-I{_FAKE_LIBC}", f"-I{extra_include}", filepath],
            capture_output=True, text=True, timeout=10
        )
    except (subprocess.TimeoutExpired, FileNotFoundError, Exception):
        return None, None
    if pre.returncode != 0:
        return None, None

    out_lines = []
    linemap = []  # out_line_idx (0-based) -> user_line (1-based)
    current_user_line = 0  # 0 = "not in user file" / no line known
    in_user_file = False
    marker_re = re.compile(r'^#\s+(\d+)\s+"([^"]+)"')
    for line in pre.stdout.split("\n"):
        m = marker_re.match(line)
        if m:
            n = int(m.group(1))
            file = m.group(2)
            if file == filepath:
                in_user_file = True
                current_user_line = n
            else:
                in_user_file = False
                current_user_line = 0
            continue
        out_lines.append(line)
        if in_user_file and current_user_line > 0:
            linemap.append(current_user_line)
            current_user_line += 1
        else:
            linemap.append(0)

    return "\n".join(out_lines), linemap


def safe_parse(source, filepath):
    """Parse C source, returning None on syntax error.

    Preprocesses the file with gcc -E so #include statements resolve
    against our minimal fake_libc_include (no system headers), then
    parses the cleaned output with pycparser. Returns the parsed AST.
    """
    cleaned, _ = _preprocess_with_linemap(source, filepath)
    if cleaned is not None:
        try:
            return _PARSER.parse(cleaned, filename=filepath)
        except Exception:
            pass
    try:
        return _PARSER.parse(source, filename=filepath)
    except Exception:
        return None


def remap_line(linemap, line):
    """Translate a post-preprocess line number to the user-visible one."""
    if not linemap:
        return line
    if line <= 0:
        return line
    if line > len(linemap):
        return linemap[-1] if linemap else line
    mapped = linemap[line - 1]
    return mapped if mapped > 0 else line


def _return_type_name(return_type_node):
    """Stringify a pycparser return-type node into a short name."""
    if return_type_node is None:
        return "?"
    if isinstance(return_type_node, c_ast.TypeDecl):
        return _return_type_name(return_type_node.type)
    if isinstance(return_type_node, c_ast.IdentifierType):
        return " ".join(return_type_node.names or [])
    if isinstance(return_type_node, c_ast.PtrDecl):
        return _return_type_name(return_type_node.type) + " *"
    return "?"


def collect_functions(ast, linemap=None):
    """Return list of FuncDef info dicts."""
    out = []
    if ast is None:
        return out
    for node in ast.ext:
        if isinstance(node, c_ast.FuncDef):
            decl = node.decl
            ret_type = _return_type_name(decl.type.type if decl.type else None)
            line = decl.coord.line if decl.coord else 0
            column = decl.coord.column if decl.coord else 0
            out.append({
                "name": decl.name,
                "line": remap_line(linemap, line),
                "column": column,
                "return_type": ret_type,
                "is_empty": _is_empty_body(node.body),
            })
    return out


def _is_empty_body(body):
    if body is None or not isinstance(body, c_ast.Compound):
        return False
    return len(body.block_items or []) == 0


def collect_type_uses(ast, type_name, linemap=None):
    """Return every ClassOrInterfaceType-equivalent usage of `type_name`."""
    if ast is None:
        return []
    out = []
    for node in ast.ext:
        if isinstance(node, c_ast.Decl) and getattr(node, "type", None) is not None:
            _walk_type_use(node.type, type_name, out, node.coord, linemap)
    return out


def _walk_type_use(node, type_name, out, coord, linemap=None):
    if node is None:
        return
    if isinstance(node, c_ast.TypeDecl):
        if isinstance(node.type, c_ast.IdentifierType) and type_name in (node.type.names or []):
            if coord:
                out.append({
                    "name": type_name,
                    "line": remap_line(linemap, coord.line),
                    "column": coord.column,
                })
        _walk_type_use(node.type, type_name, out, coord, linemap)
    elif isinstance(node, c_ast.PtrDecl):
        _walk_type_use(node.type, type_name, out, coord, linemap)
    elif isinstance(node, c_ast.ArrayDecl):
        _walk_type_use(node.type, type_name, out, coord, linemap)
    elif isinstance(node, c_ast.FuncDecl):
        _walk_type_use(node.type, type_name, out, coord, linemap)
    elif isinstance(node, c_ast.Struct):
        if node.name == type_name and coord:
            out.append({
                "name": type_name,
                "line": remap_line(linemap, coord.line),
                "column": coord.column,
            })


def collect_unsafe_calls(ast, source_lines, names=("strcpy", "strcat", "sprintf", "vsprintf", "gets")):
    """Return calls to unsafe libc functions, with file location.

    We use a regex over the source because pycparser won't see macro
    expansions and we still want to catch the obvious case where a
    student wrote strcpy(dst, src) literally.
    """
    out = []
    pattern = re.compile(r"\b(" + "|".join(names) + r")\s*\(")
    for lineno, line in enumerate(source_lines, start=1):
        for m in pattern.finditer(line):
            out.append({
                "function": m.group(1),
                "line": lineno,
                "column": m.start() + 1,
            })
    return out


def collect_magic_numbers(ast, source_lines):
    """Heuristic: flag integer literals in binary ops or return statements
    that are not 0, 1, or -1. Skip literals inside comments and strings."""
    if ast is None:
        return []
    out = []
    literal_pattern = re.compile(r"(?<![A-Za-z0-9_])(\d{2,})(?![A-Za-z0-9_])")
    for lineno, line in enumerate(source_lines, start=1):
        # crude comment/string stripper - good enough for a heuristic
        clean = re.sub(r"//.*$", "", line)
        clean = re.sub(r'".*?"', "", clean)
        for m in literal_pattern.finditer(clean):
            value = m.group(1)
            try:
                iv = int(value)
            except ValueError:
                continue
            if iv in (0, 1, -1, 100):
                # 100 is the canonical "max grade" - allowed.
                continue
            # Only flag when the literal is in a comparison/arithmetic-ish
            # context: surrounded by spaces and an operator nearby.
            surrounding = clean[max(0, m.start() - 3):m.end() + 3]
            if any(op in surrounding for op in ("==", "!=", "<", ">", "<=", ">=", "+", "-", "*", "/", "%", "return")):
                out.append({
                    "value": value,
                    "line": lineno,
                    "column": m.start() + 1,
                })
    return out


def collect_hack_comments(source_lines):
    """Flag TODO/FIXME/HACK/XXX markers in comments."""
    out = []
    pattern = re.compile(r"(?://|/\*|\*)\s*(TODO|FIXME|HACK|XXX)\b[^\n]*", re.IGNORECASE)
    for lineno, line in enumerate(source_lines, start=1):
        for m in pattern.finditer(line):
            out.append({
                "text": m.group(0).strip(),
                "line": lineno,
                "column": m.start() + 1,
            })
    return out


# Heuristic: spot printf family calls where the format specifier
# obviously does not match the argument list. We only catch the
# grossest mismatches (int arg with %s, string arg with %d, etc.)
# because a real type checker would need full type inference. The
# value here is flagging student mistakes like
# `printf("-> %s", cur->value)` where value is an int.
_PRINTF_INT_FMT = re.compile(r"%(?:\d+|\.\d+|\d+\.\d+)?(?:l|h|hh|ll|j|z|t)?d")
_PRINTF_STR_FMT = re.compile(r"%(?:\d+|\.\d+|\d+\.\d+)?(?:l|h|hh|ll|j|z|t)?s")
_PRINTF_FLT_FMT = re.compile(r"%(?:\d+|\.\d+|\d+\.\d+)?(?:l|h|hh|ll|j|z|t)?[fe]")
_PRINTF_PTR_FMT = re.compile(r"%(?:\d+|\.\d+|\d+\.\d+)?(?:l|h|hh|ll|j|z|t)?p")
_INT_CAST_PATTERN = re.compile(r"\(\s*(?:const\s+)?(?:unsigned\s+)?(?:long|long\s+long|int|short|char)\s*\*?\s*\)\s*[^,)]*")
_STRING_CAST_PATTERN = re.compile(r'"[^"\\]*(?:\\.[^"\\]*)*"')


def _classify_printf_format(fmt_str):
    """Return a list of (kind, position) tuples for each format specifier
    in fmt_str. kind is one of 'int', 'string', 'float', 'ptr', 'other'."""
    specs = []
    i = 0
    while i < len(fmt_str):
        if fmt_str[i] != "%" or i + 1 >= len(fmt_str):
            i += 1
            continue
        # skip the % and the optional flags/width/precision
        j = i + 1
        if j < len(fmt_str) and fmt_str[j] in "-+ #0":
            j += 1
        while j < len(fmt_str) and fmt_str[j].isdigit():
            j += 1
        if j < len(fmt_str) and fmt_str[j] == ".":
            j += 1
            while j < len(fmt_str) and fmt_str[j].isdigit():
                j += 1
        if j < len(fmt_str) and fmt_str[j] in "lhLjzt":
            if j + 1 < len(fmt_str) and fmt_str[j + 1] == fmt_str[j]:
                j += 2
            else:
                j += 1
        if j >= len(fmt_str):
            break
        conv = fmt_str[j]
        if conv == "d" or conv == "i":
            specs.append(("int", j))
        elif conv == "s":
            specs.append(("string", j))
        elif conv in "feg":
            specs.append(("float", j))
        elif conv == "p":
            specs.append(("ptr", j))
        else:
            specs.append(("other", j))
        i = j + 1
    return specs


def _strip_string_literals(s):
    """Replace each "..." with a sentinel so argument commas inside
    strings don't confuse our tokenizer."""
    return re.sub(r'"(?:[^"\\]|\\.)*"', '""', s)


# Cast patterns - used to identify the type of an argument by the
# cast applied to it. If the source says `(int *)p` we know the
# argument is treated as an int. If it says `(char *)p` or
# `(const char *)p` it's treated as a string.
_CAST_INT_RE = re.compile(
    r"\(\s*(?:const\s+)?(?:unsigned\s+)?"
    r"(?:long\s+long|long|int|short|char\s*\**)\s*\*?\s*\)"
)
_CAST_STR_RE = re.compile(
    r"\(\s*(?:const\s+)?(?:char|unsigned\s+char)\s*\*\s*\)"
)


def collect_printf_format_mismatches(source_lines):
    """Flag calls to printf-family functions where the format
    specifier obviously doesn't match the argument type.

    Only catches the most common student mistake: %d paired with a
    char* (or vice versa) within a single argument position. We
    don't try to do real type inference.
    """
    out = []
    call_re = re.compile(r"\b(printf|fprintf|sprintf)\s*\(")
    for lineno, line in enumerate(source_lines, start=1):
        # Skip comment-only lines quickly.
        stripped = re.sub(r"//.*$", "", line)
        for m in call_re.finditer(stripped):
            # Find the matching close paren by counting parens.
            i = m.end()
            depth = 1
            while i < len(stripped) and depth > 0:
                c = stripped[i]
                if c == "(": depth += 1
                elif c == ")": depth -= 1
                i += 1
            if depth != 0:
                continue
            args = stripped[m.end():i - 1]
            # Split args by top-level commas.
            parts = []
            depth = 0
            cur = []
            for c in args:
                if c == "," and depth == 0:
                    parts.append("".join(cur).strip())
                    cur = []
                else:
                    if c == "(": depth += 1
                    elif c == ")": depth -= 1
                    cur.append(c)
            if cur:
                parts.append("".join(cur).strip())
            if not parts:
                continue
            fmt = _strip_string_literals(parts[0])
            specs = _classify_printf_format(fmt)
            # If we have only one string-literal format and N>0 other args,
            # pair the (k+1)-th spec with the (k+1)-th arg.
            arg_kinds = []
            for arg in parts[1:]:
                a = _strip_string_literals(arg)
                stripped_a = a.strip()
                # String literal argument
                if stripped_a.startswith('"'):
                    arg_kinds.append("string")
                # Cast to (char *) / (const char *)
                elif _CAST_STR_RE.match(stripped_a):
                    arg_kinds.append("string")
                # Cast to (int/long/etc *)
                elif _CAST_INT_RE.match(stripped_a):
                    arg_kinds.append("int")
                # Heuristic: variable/field with int type-ish name
                elif re.search(r"\b(cur|node|val|count|len|size|idx|n|num|retval|result)\b", stripped_a, re.I):
                    arg_kinds.append("int")
                # Heuristic: char / string variable
                elif re.search(r"\b(str|buf|name|msg|text|s)\b", stripped_a, re.I):
                    arg_kinds.append("string")
                else:
                    arg_kinds.append("int")  # default guess
            for idx, (spec_kind, spec_pos) in enumerate(specs):
                if idx >= len(arg_kinds):
                    break
                if spec_kind in ("int", "string") and arg_kinds[idx] != spec_kind:
                    out.append({
                        "function": m.group(1),
                        "spec": "%" + fmt[spec_pos],
                        "expected": spec_kind,
                        "actual": arg_kinds[idx],
                        "line": lineno,
                        "column": m.start() + 1,
                    })
    return out


def analyze_file(filepath):
    relpath = os.path.basename(filepath)
    with open(filepath, "r", encoding="utf-8", errors="replace") as f:
        source = f.read()
    source_lines = source.split("\n")

    ast = safe_parse(source, filepath)
    linemap = None
    if ast is not None:
        # If we have an AST from a preprocessed parse, the line numbers
        # are post-preprocess. Re-run the preprocessor to get the line
        # map so we can translate back to user-visible line numbers.
        _, linemap = _preprocess_with_linemap(source, filepath)

    return {
        "path": relpath,
        "functions": collect_functions(ast, linemap),
        "type_uses": collect_type_uses(ast, "Student", linemap),
        "unsafe_calls": collect_unsafe_calls(ast, source_lines),
        "magic_numbers": collect_magic_numbers(ast, source_lines),
        "hack_comments": collect_hack_comments(source_lines),
        "printf_mismatches": collect_printf_format_mismatches(source_lines),
    }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "usage: c_ast_analyzer.py <path>"}))
        sys.exit(0)

    root = sys.argv[1]
    skip_dirs = {
        "__pycache__", ".pytest_cache", ".git", "node_modules",
        "hidden-tests", "test", "tests", "build", "dist",
    }
    is_test_file = lambda n: (
        n.startswith("test_") or n.endswith("_test.c") or n.endswith("_test.cpp")
        or n == "conftest.py"
    )
    c_extensions = (".c", ".cc", ".cpp", ".cxx", ".h", ".hpp")

    files_out = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in skip_dirs and not d.startswith(".")]
        for filename in filenames:
            if is_test_file(filename):
                continue
            if not filename.endswith(c_extensions):
                continue
            filepath = os.path.join(dirpath, filename)
            relpath = os.path.relpath(filepath, root).replace(os.sep, "/")
            result = analyze_file(filepath)
            result["path"] = relpath
            files_out.append(result)

    print(json.dumps({"files": files_out}))


if __name__ == "__main__":
    main()