#include "linked_list.h"
#include <stdio.h>
#include <stdlib.h>

Node *list_create(void) {
    return NULL;
}

void list_push_back(Node **head, int value) {
    if (head == NULL) return;
    Node *node = (Node *) malloc(sizeof(Node));
    if (node == NULL) return;
    node->value = value;
    node->next = NULL;
    if (*head == NULL) {
        *head = node;
        return;
    }
    Node *cur = *head;
    while (cur->next != NULL) cur = cur->next;
    cur->next = node;
}

void list_push_front(Node **head, int value) {
    if (head == NULL) return;
    Node *node = (Node *) malloc(sizeof(Node));
    if (node == NULL) return;
    node->value = value;
    node->next = *head;
    *head = node;
}

int list_delete(Node **head, int value) {
    if (head == NULL || *head == NULL) return 0;
    Node *cur = *head;
    Node *prev = NULL;
    while (cur != NULL) {
        if (cur->value == value) {
            if (prev == NULL) {
                *head = cur->next;
            } else {
                prev->next = cur->next;
            }
            free(cur);
            return 1;
        }
        prev = cur;
        cur = cur->next;
    }
    return 0;
}

int list_contains(const Node *head, int value) {
    for (const Node *cur = head; cur != NULL; cur = cur->next) {
        if (cur->value == value) return 1;
    }
    return 0;
}

int list_length(const Node *head) {
    int n = 0;
    for (const Node *cur = head; cur != NULL; cur = cur->next) n++;
    return n;
}

long list_sum(const Node *head) {
    long s = 0;
    for (const Node *cur = head; cur != NULL; cur = cur->next) s += cur->value;
    return s;
}

void list_print(const Node *head) {
    printf("head");
    for (const Node *cur = head; cur != NULL; cur = cur->next) {
        printf(" -> %d", cur->value);
    }
    printf(" -> NULL\n");
}

static void list_print_reverse_recurse(const Node *cur) {
    if (cur == NULL) return;
    list_print_reverse_recurse(cur->next);
    printf(" -> %d", cur->value);
}

void list_print_reverse(const Node *head) {
    printf("head");
    list_print_reverse_recurse(head);
    printf(" -> NULL\n");
}

void list_clear(Node **head) {
    if (head == NULL) return;
    Node *cur = *head;
    while (cur != NULL) {
        Node *next = cur->next;
        free(cur);
        cur = next;
    }
    *head = NULL;
}

static int read_int(void) {
    int x;
    if (scanf("%d", &x) != 1) return 0;
    return x;
}

int main(void) {
    Node *list = list_create();
    int n = read_int();
    for (int i = 0; i < n; i++) {
        list_push_back(&list, read_int());
    }

    char cmd[32];
    while (scanf("%31s", cmd) == 1) {
        if (cmd[0] == 'p' && cmd[1] == 'r' && cmd[2] == 'i' &&
            cmd[3] == 'n' && cmd[4] == 't' && cmd[5] == '\0') {
            list_print(list);
        } else if (cmd[0] == 'r' && cmd[1] == 'e' && cmd[2] == 'v' &&
                   cmd[3] == 'e' && cmd[4] == 'r' && cmd[5] == 's' &&
                   cmd[6] == 'e' && cmd[7] == '\0') {
            list_print_reverse(list);
        } else if (cmd[0] == 'd' && cmd[1] == 'e' && cmd[2] == 'l' &&
                   cmd[3] == 'e' && cmd[4] == 't' && cmd[5] == 'e' &&
                   cmd[6] == '\0') {
            int v = read_int();
            printf("%d\n", list_delete(&list, v));
        } else if (cmd[0] == 'l' && cmd[1] == 'e' && cmd[2] == 'n' &&
                   cmd[3] == 'g' && cmd[4] == 't' && cmd[5] == 'h' &&
                   cmd[6] == '\0') {
            printf("%d\n", list_length(list));
        } else if (cmd[0] == 's' && cmd[1] == 'u' && cmd[2] == 'm' &&
                   cmd[3] == '\0') {
            printf("%ld\n", list_sum(list));
        } else if (cmd[0] == 'c' && cmd[1] == 'o' && cmd[2] == 'n' &&
                   cmd[3] == 't' && cmd[4] == 'a' && cmd[5] == 'i' &&
                   cmd[6] == 'n' && cmd[7] == 's' && cmd[8] == '\0') {
            int v = read_int();
            printf("%d\n", list_contains(list, v));
        } else if (cmd[0] == 'c' && cmd[1] == 'l' && cmd[2] == 'e' &&
                   cmd[3] == 'a' && cmd[4] == 'r' && cmd[5] == '\0') {
            list_clear(&list);
        } else {
            fprintf(stderr, "unknown command: %s\n", cmd);
            return 1;
        }
    }

    list_clear(&list);
    return 0;
}
