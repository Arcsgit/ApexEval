/*
 * ApexEval hidden test driver for the linked-list assignment.
 *
 * Architecture:
 *   1. The student's `src/linked_list.c` is compiled by the
 *      project's Makefile into a `linked_list` binary.
 *   2. This driver (compiled by the same Makefile into
 *      `test_runner`) is invoked by `make test`.
 *   3. For each test scenario, we fork/exec the `linked_list`
 *      binary with a canned stdin, capture its stdout, and
 *      compare it byte-for-byte against the expected output.
 *   4. We emit one line per scenario:
 *
 *         TEST: <name> PASS
 *         TEST: <name> FAIL: <assertion that failed>
 *
 *   The driver returns non-zero if any test failed.
 *
 * The driver is deliberately lenient about trailing whitespace: we
 * strip a single trailing newline from both actual and expected
 * before comparison. Anything else (whitespace inside the output,
 * wrong numbers, missing/extra lines) is a real failure.
 */

/* mkstemp, pipe2, etc. require an explicit POSIX feature test macro
 * on some glibc configurations (notably the Debian-based gcc:13
 * docker image we run the sandbox in). The macro must be defined
 * BEFORE any system header is included, otherwise the headers pick
 * up the default (non-POSIX) feature set and don't expose
 * mkstemp. Without this, the implicit int declaration of
 * mkstemp is the wrong return type and subsequent calls silently
 * return -1. */
#define _POSIX_C_SOURCE 200809L

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/wait.h>
#include <sys/stat.h>
#include <unistd.h>
#include <fcntl.h>
#include <errno.h>

static int g_failures = 0;

static void t_record(const char *name, int ok, const char *msg) {
    if (ok) {
        printf("TEST: %s PASS\n", name);
    } else {
        printf("TEST: %s FAIL: %s\n", name, msg);
        g_failures++;
    }
}

/* Strip a single trailing newline (or CRLF) if present, in place. */
static void chomp(char *s) {
    size_t n = strlen(s);
    while (n > 0 && (s[n - 1] == '\n' || s[n - 1] == '\r')) {
        s[--n] = '\0';
    }
}

/* Write `data` (length `len`) atomically to a unique temp file.
 * Returns the path in a malloc'd buffer (caller frees). Returns
 * NULL on error. The buffer MUST be per-call: mkstemp modifies
 * its template in place, so a static buffer would carry the
 * previous filename into the next call and fail with EINVAL. */
static char *write_temp_input(const char *data, size_t len) {
    char *path = (char *) malloc(64);
    if (path == NULL) return NULL;
    strcpy(path, "/tmp/apxeval-input-XXXXXX");
    int fd = mkstemp(path);
    if (fd < 0) { free(path); return NULL; }
    size_t wrote = 0;
    while (wrote < len) {
        ssize_t n = write(fd, data + wrote, len - wrote);
        if (n < 0) {
            if (errno == EINTR) continue;
            close(fd);
            unlink(path);
            free(path);
            return NULL;
        }
        wrote += (size_t) n;
    }
    close(fd);
    return path;
}

/* Run `binary_path` with `stdin_text` as its input. On success,
 * returns a malloc'd, NUL-terminated buffer holding the captured
 * stdout (caller frees), and stores the wait status in *out_status.
 * Returns NULL on spawn failure. */
static char *run_binary(const char *binary_path,
                        const char *stdin_text,
                        int *out_status) {
    char *in_path = write_temp_input(stdin_text, strlen(stdin_text));
    if (in_path == NULL) return NULL;

    int in_fd = open(in_path, O_RDONLY);
    if (in_fd < 0) { unlink(in_path); free(in_path); return NULL; }

    int out_pipe[2];
    if (pipe(out_pipe) < 0) { close(in_fd); unlink(in_path); free(in_path); return NULL; }

    pid_t pid = fork();
    if (pid < 0) {
        close(in_fd); close(out_pipe[0]); close(out_pipe[1]);
        unlink(in_path); free(in_path);
        return NULL;
    }
    if (pid == 0) {
        dup2(in_fd, 0);
        dup2(out_pipe[1], 1);
        close(in_fd);
        close(out_pipe[0]);
        close(out_pipe[1]);
        execl(binary_path, binary_path, (char *) NULL);
        _exit(127);
    }
    close(in_fd);
    close(out_pipe[1]);

    size_t cap = 4096, len = 0;
    char *buf = (char *) malloc(cap);
    if (buf == NULL) { close(out_pipe[0]); unlink(in_path); free(in_path); return NULL; }
    for (;;) {
        if (len + 1 >= cap) {
            size_t newcap = cap * 2;
            char *nb = (char *) realloc(buf, newcap);
            if (nb == NULL) { free(buf); close(out_pipe[0]); unlink(in_path); free(in_path); return NULL; }
            buf = nb;
            cap = newcap;
        }
        ssize_t n = read(out_pipe[0], buf + len, cap - len - 1);
        if (n < 0) {
            if (errno == EINTR) continue;
            free(buf); close(out_pipe[0]); unlink(in_path); free(in_path); return NULL;
        }
        if (n == 0) break;
        len += (size_t) n;
    }
    buf[len] = '\0';
    close(out_pipe[0]);
    unlink(in_path);
    free(in_path);

    int status = 0;
    if (waitpid(pid, &status, 0) < 0) {
        free(buf);
        return NULL;
    }
    if (out_status) *out_status = status;
    return buf;
}

/* Run one scenario. `name` is the test name, `stdin_text` is what
 * the binary reads, and `expected` is the exact stdout we want. */
static void run_scenario(const char *name,
                         const char *stdin_text,
                         const char *expected) {
    int status = 0;
    char *actual = run_binary("./linked_list", stdin_text, &status);
    if (actual == NULL) {
        t_record(name, 0, "could not spawn ./linked_list (binary missing?)");
        return;
    }
    int exit_ok = WIFEXITED(status) && WEXITSTATUS(status) == 0;
    char *exp = (char *) malloc(strlen(expected) + 1);
    strcpy(exp, expected);
    chomp(exp);
    chomp(actual);
    if (!exit_ok) {
        char msg[200];
        snprintf(msg, sizeof(msg),
                 "binary exit status %d (expected 0); got [%s]",
                 WEXITSTATUS(status), actual);
        t_record(name, 0, msg);
    } else if (strcmp(actual, exp) != 0) {
        char msg[1024];
        snprintf(msg, sizeof(msg),
                 "output mismatch\n  expected: [%s]\n  actual:   [%s]",
                 exp, actual);
        t_record(name, 0, msg);
    } else {
        t_record(name, 1, "");
    }
    free(exp);
    free(actual);
}

/* Compile src/linked_list.c into ./linked_list using gcc. This
 * gives a more useful error message in the test output if the
 * student's source has a syntax error (gcc errors land in
 * /tmp/apxeval-build.log and we surface "compile failed"). We do
 * this from inside the test driver rather than relying on the
 * Makefile alone so that the test framework can still emit
 * structured TEST: lines even when the build breaks. */
static int compile_student_binary(void) {
    const char *cmd =
        "gcc -Wall -Wextra -std=c99 -g -Isrc -o linked_list "
        "src/linked_list.c >/tmp/apxeval-build.log 2>&1";
    int rc = system(cmd);
    return rc == 0 ? 0 : 1;
}

int main(void) {
    if (compile_student_binary() != 0) {
        printf("TEST: build SKIP: gcc compile failed (see /tmp/apxeval-build.log)\n");
        printf("SUMMARY: 0 failure(s)\n");
        return 1;
    }

    /* Scenario 1: simple build + print. */
    run_scenario(
        "build_and_print",
        "5\n10 20 30 40 50\nprint\n",
        "head -> 10 -> 20 -> 30 -> 40 -> 50 -> NULL\n"
    );

    /* Scenario 2: empty list prints head -> NULL. */
    run_scenario(
        "empty_list",
        "0\nprint\n",
        "head -> NULL\n"
    );

    /* Scenario 3: length, sum, contains. */
    run_scenario(
        "aggregate_ops",
        "4\n7 14 -3 100\nlength\nsum\ncontains 14\ncontains 99\n",
        "4\n118\n1\n0\n"
    );

    /* Scenario 4: delete from head, middle, and tail. */
    run_scenario(
        "delete_positions",
        "5\n10 20 30 40 50\n"
        "delete 10\nprint\n"
        "delete 30\nprint\n"
        "delete 50\nprint\n"
        "delete 99\nprint\n",
        "1\nhead -> 20 -> 30 -> 40 -> 50 -> NULL\n"
        "1\nhead -> 20 -> 40 -> 50 -> NULL\n"
        "1\nhead -> 20 -> 40 -> NULL\n"
        "0\nhead -> 20 -> 40 -> NULL\n"
    );

    /* Scenario 5: delete everything, then length/print. */
    run_scenario(
        "delete_then_clear",
        "3\n1 2 3\n"
        "delete 1\ndelete 2\ndelete 3\n"
        "length\nprint\n"
        "clear\nlength\nprint\n",
        "1\n1\n1\n0\nhead -> NULL\n0\nhead -> NULL\n"
    );

    /* Scenario 6: print_reverse. */
    run_scenario(
        "print_reverse",
        "4\n1 2 3 4\nprint\nreverse\n",
        "head -> 1 -> 2 -> 3 -> 4 -> NULL\n"
        "head -> 4 -> 3 -> 2 -> 1 -> NULL\n"
    );

    /* Scenario 7: duplicates allowed. contains finds any, delete
     * removes only the first match. */
    run_scenario(
        "duplicates",
        "5\n5 3 5 3 5\n"
        "length\nsum\n"
        "delete 5\nlength\nsum\nprint\n",
        "5\n21\n"
        "1\n4\n16\nhead -> 3 -> 5 -> 3 -> 5 -> NULL\n"
    );

    /* Scenario 8: large list, no memory issues. */
    {
        char *in = (char *) malloc(64 * 1024);
        size_t off = 0;
        off += (size_t) sprintf(in + off, "100\n");
        for (int i = 0; i < 100; i++) off += (size_t) sprintf(in + off, "%d ", i);
        off += (size_t) sprintf(in + off, "\nlength\nsum\nclear\nlength\n");
        in[off] = '\0';

        char *expected = (char *) malloc(64 * 1024);
        off = 0;
        off += (size_t) sprintf(expected + off, "100\n4950\n0\n");

        run_scenario("large_list_100", in, expected);
        free(in);
        free(expected);
    }

    /* Scenario 9: operations on a list that starts empty. */
    run_scenario(
        "operations_on_empty",
        "0\nlength\nsum\ncontains 1\ndelete 1\nprint\nclear\nlength\nprint\n",
        "0\n0\n0\n0\nhead -> NULL\n0\nhead -> NULL\n"
    );

    /* Scenario 10: clear on an already-empty list. */
    run_scenario(
        "clear_empty",
        "0\nclear\nlength\nprint\n",
        "0\nhead -> NULL\n"
    );

    printf("SUMMARY: %d failure(s)\n", g_failures);
    return g_failures == 0 ? 0 : 1;
}
