package com.apexeval.assignment;

import org.junit.jupiter.api.Test;
import java.util.EmptyStackException;

import static org.junit.jupiter.api.Assertions.*;

/**
 * ApexEval HIDDEN test file for the Generic Stack assignment.
 * This file is injected by the Track A execution engine at grading time —
 * it is NOT visible to the student in their workspace.
 */
class GenericStackTest {

    @Test
    void newStackIsEmpty() {
        GenericStack<Integer> stack = new GenericStack<>();
        assertTrue(stack.isEmpty());
        assertEquals(0, stack.size());
    }

    @Test
    void pushIncreasesSize() {
        GenericStack<String> stack = new GenericStack<>();
        stack.push("a");
        stack.push("b");
        assertEquals(2, stack.size());
        assertFalse(stack.isEmpty());
    }

    @Test
    void peekReturnsTopWithoutRemoving() {
        GenericStack<Integer> stack = new GenericStack<>();
        stack.push(10);
        stack.push(20);
        assertEquals(20, stack.peek());
        assertEquals(2, stack.size());
    }

    @Test
    void popReturnsAndRemovesTop() {
        GenericStack<Integer> stack = new GenericStack<>();
        stack.push(1);
        stack.push(2);
        stack.push(3);
        assertEquals(3, stack.pop());
        assertEquals(2, stack.pop());
        assertEquals(1, stack.size());
    }

    @Test
    void popOnEmptyStackThrows() {
        GenericStack<Integer> stack = new GenericStack<>();
        assertThrows(EmptyStackException.class, stack::pop);
    }

    @Test
    void peekOnEmptyStackThrows() {
        GenericStack<Integer> stack = new GenericStack<>();
        assertThrows(EmptyStackException.class, stack::peek);
    }

    @Test
    void followsLIFOOrder() {
        GenericStack<String> stack = new GenericStack<>();
        stack.push("first");
        stack.push("second");
        stack.push("third");
        assertEquals("third", stack.pop());
        assertEquals("second", stack.pop());
        assertEquals("first", stack.pop());
        assertTrue(stack.isEmpty());
    }
}
