/* ============================================================
   ApexEval — Mock Data: Courses & Assignments
   ============================================================ */

import { Course, Assignment, CourseEnrollment, ProgrammingLanguage } from '../models';

export const MOCK_COURSES: Course[] = [
  {
    id: 'crs-101', code: 'CS101', title: 'Programming Fundamentals',
    description: 'Core programming concepts across multiple languages including C, Java, Python, JavaScript, and Spring Boot. Hands-on assignments with automated evaluation.',
    instructorId: 'fac-001', instructorName: 'Dr. Sarah Mitchell',
    status: 'active', startDate: '2026-08-18T00:00:00Z', endDate: '2026-12-15T00:00:00Z',
    totalWeeks: 16, currentWeek: 3, studentCount: 25, assignmentCount: 6, createdAt: '2026-07-01T10:00:00Z'
  },
];

// Generate weeks for all mock courses
MOCK_COURSES.forEach(course => {
  const weeks = [];
  const start = new Date(course.startDate);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  const firstMonday = new Date(start.setDate(diff));

  for (let i = 1; i <= course.totalWeeks; i++) {
    const releaseDate = new Date(firstMonday);
    releaseDate.setDate(releaseDate.getDate() + (i - 1) * 7);
    
    weeks.push({
      number: i,
      releaseDate: releaseDate.toISOString(),
      status: 'locked' as const,
      unlockMethod: 'scheduled' as const
    });
  }
  course.weeks = weeks;
});

// Enrollments for the 3 demo students (student-1, student-2, student-3)
export const MOCK_ENROLLMENTS: CourseEnrollment[] = [
  // student-1 (Alex Chen)
  { courseId: 'crs-101', studentId: 'student-1', enrolledAt: '2026-08-15T09:00:00Z', completedAssignments: 2, totalAssignments: 6, progressPercent: 33, currentStreak: 5 },
  // student-2 (Priya Sharma)
  { courseId: 'crs-101', studentId: 'student-2', enrolledAt: '2026-08-15T09:00:00Z', completedAssignments: 1, totalAssignments: 6, progressPercent: 17, currentStreak: 2 },
  // student-3 (Marcus Johnson)
  { courseId: 'crs-101', studentId: 'student-3', enrolledAt: '2026-08-15T09:00:00Z', completedAssignments: 0, totalAssignments: 6, progressPercent: 0, currentStreak: 0 },
];

function makeStarterCode(title: string, language: ProgrammingLanguage): string {
  const className = title.replace(/[^a-zA-Z]/g, '');
  
  switch (language) {
    case 'java':
      return `public class ${className} {\n    // TODO: Implement your solution here\n\n    public static void main(String[] args) {\n        System.out.println("${title}");\n    }\n}\n`;
    case 'python':
      return `# ${title}\n# TODO: Implement your solution here\n\ndef main():\n    pass\n\nif __name__ == "__main__":\n    main()\n`;
    case 'c':
      return `#include <stdio.h>\n\n// ${title}\n// TODO: Implement your solution here\n\nint main() {\n    printf("${title}\\n");\n    return 0;\n}\n`;
    case 'javascript':
      return `// ${title}\n// TODO: Implement your solution here\n\nfunction main() {\n    console.log("${title}");\n}\n\nmain();\n`;
    case 'typescript':
      return `// ${title}\n// TODO: Implement your solution here\n\nfunction main(): void {\n    console.log("${title}");\n}\n\nmain();\n`;
    default:
      return `// ${title}\n// TODO: Implement your solution here\n`;
  }
}

function makeStarterCodeMap(title: string): Record<ProgrammingLanguage, string> {
  return {
    java: makeStarterCode(title, 'java'),
    python: makeStarterCode(title, 'python'),
    cpp: makeStarterCode(title, 'cpp'),
    javascript: makeStarterCode(title, 'javascript'),
    typescript: makeStarterCode(title, 'typescript'),
    c: makeStarterCode(title, 'c'),
    sql: `-- ${title}\n-- TODO: Write your SQL query here\n\nSELECT 1;\n`,
  };
}

export const MOCK_ASSIGNMENTS: Assignment[] = [
  // C - Linked List
  {
    id: 'c-linked-list-v1', courseId: 'crs-101', courseName: 'Programming Fundamentals',
    title: 'C Linked List Implementation', 
    description: 'Implement a singly linked list in C with operations for insertion, deletion, search, and reversal. Your implementation must handle edge cases such as empty lists and single-element lists.',
    requirements: [
      'Implement list_create to initialize an empty list',
      'Implement list_push_back to add element at the end',
      'Implement list_push_front to add element at the front',
      'Implement list_delete to remove element by value',
      'Implement list_contains to search for a value',
      'Implement list_length to return the number of elements',
      'Implement list_sum to sum all values in the list',
      'Implement list_print to print the list forward',
      'Implement list_print_reverse to print the list backward',
      'Implement list_clear to free all nodes',
      'Implement main function as entry point'
    ],
    constraints: [
      'Must use C99 standard',
      'Do not use built-in linked list libraries',
      'Must handle memory allocation/free correctly',
      'O(1) insert at head, O(n) for other operations',
      'No memory leaks allowed'
    ],
    allowedLanguages: ['c'], defaultLanguage: 'c', difficulty: 'easy',
    week: 1, day: 2, dueDate: '2026-09-15T23:59:00Z', maxAttempts: 5, runtimeLimitMs: 60000, memoryLimitMb: 1024,
    status: 'published', totalTests: 11, totalHiddenTests: 5, totalStaticChecks: 13,
    starterCode: makeStarterCodeMap('CLinkedList'), createdAt: '2026-08-01T10:00:00Z', publishedAt: '2026-08-18T08:00:00Z'
  },
  // Java - Generic Stack
  {
    id: 'generic-stack-v1', courseId: 'crs-101', courseName: 'Programming Fundamentals',
    title: 'Generic Stack Implementation (Java)',
    description: 'Implement a generic Stack data structure in Java using generics. The stack should support push, pop, peek, isEmpty, and size operations with proper exception handling.',
    requirements: [
      'Create a generic Stack<T> class',
      'Implement push(T item) method',
      'Implement pop() method with exception handling',
      'Implement peek() method',
      'Implement isEmpty() and size() methods',
      'Handle empty stack edge cases properly',
      'Use array or linked list as underlying storage',
      'Write comprehensive tests'
    ],
    constraints: [
      'Must use Java generics',
      'Cannot use java.util.Stack or java.util.ArrayDeque',
      'Must throw appropriate exceptions for empty stack operations',
      'O(1) for all operations',
      'Code must compile with Java 17+'
    ],
    allowedLanguages: ['java'], defaultLanguage: 'java', difficulty: 'easy',
    week: 2, day: 1, dueDate: '2026-09-20T23:59:00Z', maxAttempts: 5, runtimeLimitMs: 60000, memoryLimitMb: 1024,
    status: 'published', totalTests: 10, totalHiddenTests: 5, totalStaticChecks: 6,
    starterCode: makeStarterCodeMap('GenericStack'), createdAt: '2026-08-05T10:00:00Z', publishedAt: '2026-08-25T08:00:00Z'
  },
  // Java - Movie Watchlist
  {
    id: 'movie-watchlist-v1', courseId: 'crs-101', courseName: 'Programming Fundamentals',
    title: 'Movie Watchlist Manager (Java)',
    description: 'Build a movie watchlist application that allows users to add, remove, search, and list movies. Use ArrayList to store movies with title, genre, year, and watched status.',
    requirements: [
      'Create a Movie class with title, genre, year, watched fields',
      'Implement addMovie, removeMovie, searchMovie methods',
      'Implement listMovies (all, watched, unwatched)',
      'Implement markWatched/unwatched methods',
      'Implement save/load from file',
      'Create a simple CLI menu interface',
      'Handle duplicate movies appropriately'
    ],
    constraints: [
      'Use ArrayList for storage',
      'Must implement Serializable for file persistence',
      'Handle edge cases (empty list, not found)',
      'Follow Java naming conventions',
      'Proper encapsulation with getters/setters'
    ],
    allowedLanguages: ['java'], defaultLanguage: 'java', difficulty: 'medium',
    week: 2, day: 3, dueDate: '2026-09-25T23:59:00Z', maxAttempts: 5, runtimeLimitMs: 60000, memoryLimitMb: 1024,
    status: 'published', totalTests: 12, totalHiddenTests: 5, totalStaticChecks: 8,
    starterCode: makeStarterCodeMap('MovieWatchlist'), createdAt: '2026-08-10T10:00:00Z', publishedAt: '2026-08-27T08:00:00Z'
  },
  // Python - Calculator
  {
    id: 'python-calculator-v1', courseId: 'crs-101', courseName: 'Programming Fundamentals',
    title: 'Python Calculator with Type Hints',
    description: 'Build a command-line calculator in Python with full type hints. Support basic arithmetic operations, parentheses, and operator precedence. Include comprehensive unit tests with pytest.',
    requirements: [
      'Implement evaluate(expression: str) -> float function',
      'Support +, -, *, / operators with correct precedence',
      'Support parentheses for grouping',
      'Handle division by zero gracefully',
      'Add type hints to all functions',
      'Write unit tests with pytest',
      'Support negative numbers'
    ],
    constraints: [
      'Must use Python 3.10+ type hints',
      'Cannot use eval() or exec()',
      'Implement recursive descent parser or shunting yard',
      'All functions must have type annotations',
      'Tests must cover edge cases'
    ],
    allowedLanguages: ['python'], defaultLanguage: 'python', difficulty: 'medium',
    week: 3, day: 1, dueDate: '2026-09-28T23:59:00Z', maxAttempts: 5, runtimeLimitMs: 30000, memoryLimitMb: 512,
    status: 'published', totalTests: 15, totalHiddenTests: 5, totalStaticChecks: 8,
    starterCode: makeStarterCodeMap('PythonCalculator'), createdAt: '2026-08-12T10:00:00Z', publishedAt: '2026-09-01T08:00:00Z'
  },
  // JavaScript/React - Todo App
  {
    id: 'react-todo-v1', courseId: 'crs-101', courseName: 'Programming Fundamentals',
    title: 'React Todo Application',
    description: 'Build a Todo application using React with functional components and hooks. Features: add, remove, toggle, filter todos. Use localStorage for persistence.',
    requirements: [
      'Create TodoApp component with useState/useEffect',
      'Add todo with input validation',
      'Toggle todo completion status',
      'Delete todo with confirmation',
      'Filter: All, Active, Completed',
      'Persist todos to localStorage',
      'Show todo count',
      'Clear completed todos'
    ],
    constraints: [
      'Must use React 18+ with functional components',
      'Use useState, useEffect hooks',
      'No class components allowed',
      'Must be responsive design',
      'Accessible markup (ARIA labels)'
    ],
    allowedLanguages: ['javascript', 'typescript'], defaultLanguage: 'javascript', difficulty: 'medium',
    week: 3, day: 3, dueDate: '2026-10-05T23:59:00Z', maxAttempts: 5, runtimeLimitMs: 60000, memoryLimitMb: 1024,
    status: 'published', totalTests: 14, totalHiddenTests: 4, totalStaticChecks: 5,
    starterCode: makeStarterCodeMap('ReactTodo'), createdAt: '2026-08-15T10:00:00Z', publishedAt: '2026-09-03T08:00:00Z'
  },
  // Java/Spring Boot - Task Manager
  {
    id: 'spring-boot-taskmanager-v1', courseId: 'crs-101', courseName: 'Programming Fundamentals',
    title: 'Spring Boot Task Manager REST API',
    description: 'Build a REST API for task management using Spring Boot. Implement CRUD operations for tasks with proper validation, error handling, and database persistence.',
    requirements: [
      'Create Task entity with id, title, description, completed, createdAt',
      'Implement TaskRepository with JPA',
      'Implement TaskService with business logic',
      'Create TaskController with REST endpoints',
      'GET /api/tasks - list all tasks',
      'POST /api/tasks - create task',
      'GET /api/tasks/{id} - get task by id',
      'PUT /api/tasks/{id} - update task',
      'DELETE /api/tasks/{id} - delete task',
      'Add validation for title (required, max 200 chars)',
      'Use H2 in-memory database'
    ],
    constraints: [
      'Must use Spring Boot 3.x',
      'Use Spring Data JPA with H2 database',
      'Follow REST conventions',
      'Return proper HTTP status codes',
      'Use @Valid for request validation',
      'Global exception handler with @ControllerAdvice'
    ],
    allowedLanguages: ['java'], defaultLanguage: 'java', difficulty: 'hard',
    week: 4, day: 1, dueDate: '2026-10-10T23:59:00Z', maxAttempts: 5, runtimeLimitMs: 120000, memoryLimitMb: 2048,
    status: 'published', totalTests: 10, totalHiddenTests: 5, totalStaticChecks: 6,
    starterCode: makeStarterCodeMap('SpringBootTaskManager'), createdAt: '2026-08-20T10:00:00Z', publishedAt: '2026-09-10T08:00:00Z'
  },
];