package com.apexeval.assignment;

import java.util.ArrayList;
import java.util.EmptyStackException;
import java.util.List;

/**
 * ApexEval sample fixture assignment: Generic Stack.
 *
 * TODO (student): implement a generic Stack<T> backed by an ArrayList.
 *
 * Required behavior:
 *  - push(item): adds item to the top of the stack
 *  - pop(): removes and returns the top item; throws EmptyStackException if empty
 *  - peek(): returns (without removing) the top item; throws EmptyStackException if empty
 *  - isEmpty(): returns true if the stack has no elements
 *  - size(): returns the number of elements currently in the stack
 *
 * Static-check note (Track A staticcheck module will verify this):
 *  - Must use ArrayList as the backing collection (required element).
 *  - Must NOT hardcode return values or fake behavior with println-only stubs.
 */
public class GenericStack<T> {

    private final List<T> elements = new ArrayList<>();

    public void push(T item) {
        elements.add(item);
    }

    public T pop() {
        if (isEmpty()) {
            throw new EmptyStackException();
        }
        return elements.remove(elements.size() - 1);
    }

    public T peek() {
        if (isEmpty()) {
            throw new EmptyStackException();
        }
        return elements.get(elements.size() - 1);
    }

    public boolean isEmpty() {
        return elements.isEmpty();
    }

    public int size() {
        return elements.size();
    }
}

