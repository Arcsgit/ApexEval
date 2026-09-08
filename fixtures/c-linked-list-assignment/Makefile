CC = gcc
CFLAGS = -Wall -Wextra -std=c99 -g -Isrc

# The hidden test driver compiles the student's src/linked_list.c
# into a `linked_list` binary itself (see compile_student_binary()
# in test_linked_list.c). It also builds itself into `test_runner`.
# This Makefile only needs to build the test_runner.

TEST_SRC = hidden-tests/test_linked_list.c
TARGET    = test_runner

all: $(TARGET)

$(TARGET): $(TEST_SRC)
	$(CC) $(CFLAGS) -o $@ $(TEST_SRC)

test: $(TARGET)
	./$(TARGET)

clean:
	rm -f $(TARGET) $(TEST_SRC:.c=.o)

.PHONY: all test clean
