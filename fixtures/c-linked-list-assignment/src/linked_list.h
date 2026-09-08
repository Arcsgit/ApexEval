#ifndef LINKED_LIST_H
#define LINKED_LIST_H

/*
 * Singly-linked list of integers.
 *
 * The head pointer is always passed by address (Node **) so that
 * insert/delete/clear can rebind it. Read-only operations (length,
 * sum, contains, print) take the head by value.
 */

typedef struct Node {
    int value;
    struct Node *next;
} Node;

/* Allocate and return a new empty list (NULL). */
Node *list_create(void);

/* Append `value` to the tail of the list. */
void list_push_back(Node **head, int value);

/* Prepend `value` to the head of the list. */
void list_push_front(Node **head, int value);

/*
 * Remove the FIRST node whose `value` matches. Returns 1 if a node
 * was removed, 0 if no such node existed. Does nothing on NULL head
 * or empty list.
 */
int list_delete(Node **head, int value);

/* Return 1 if `value` is in the list, 0 otherwise. */
int list_contains(const Node *head, int value);

/* Return the number of nodes in the list. */
int list_length(const Node *head);

/* Return the sum of all values; 0 for an empty list. */
long list_sum(const Node *head);

/* Print the list to stdout in the format:  head -> a -> b -> NULL */
void list_print(const Node *head);

/* Print the list to stdout in reverse order, same format. */
void list_print_reverse(const Node *head);

/* Free every node and set *head = NULL. Safe to call repeatedly. */
void list_clear(Node **head);

#endif
