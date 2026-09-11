/* ============================================================
   ApexEval — Mock Data: Submissions, Test Results, Findings
   ============================================================ */

import {
  Submission, TestResult, StaticFinding, DiffFile,
  EvaluationResult, TestStatus, FindingSeverity, FindingCategory
} from '../models';
import { MOCK_STUDENTS } from './mock-users';
import { MOCK_ASSIGNMENTS } from './mock-courses';

// ── Helper to generate submissions for students ──
function generateSubmission(
  id: string, assignmentId: string, studentId: string, attempt: number,
  result: EvaluationResult, testsPassed: number, testsTotal: number,
  staticPassed: number, staticTotal: number, durationMs: number,
  daysAgo: number, hourOffset: number
): Submission {
  const assignment = MOCK_ASSIGNMENTS.find(a => a.id === assignmentId)!;
  const student = MOCK_STUDENTS.find(s => s.id === studentId)!;
  const submittedAt = new Date();
  submittedAt.setDate(submittedAt.getDate() - daysAgo);
  submittedAt.setHours(submittedAt.getHours() - hourOffset);

  return {
    id,
    assignmentId,
    assignmentTitle: assignment.title,
    courseId: assignment.courseId,
    courseName: assignment.courseName,
    studentId,
    studentName: `${student.firstName} ${student.lastName}`,
    studentEmail: student.email,
    attempt,
    language: assignment.defaultLanguage,
    code: assignment.starterCode?.[assignment.defaultLanguage] ?? '// No starter code',
    status: 'complete',
    result,
    submittedAt: submittedAt.toISOString(),
    completedAt: new Date(submittedAt.getTime() + durationMs).toISOString(),
    executionDurationMs: durationMs,
    testsPassed,
    testsTotal,
    staticChecksPassed: staticPassed,
    staticChecksTotal: staticTotal,
    dbCheckPassed: result !== 'fail',
    score: Math.round((testsPassed / testsTotal) * 100),
  };
}

// ── Generate submissions for the demo student (Alex Chen, stu-001) ──
export const MOCK_SUBMISSIONS: Submission[] = [
  // Linked List — passed on attempt 2
  generateSubmission('sub-001', 'c-linked-list-v1', 'student-1', 1, 'fail', 11, 15, 5, 6, 3200, 12, 2),
  generateSubmission('sub-002', 'c-linked-list-v1', 'student-1', 2, 'pass', 15, 15, 6, 6, 2800, 11, 5),

  // BST — passed on attempt 3
  generateSubmission('sub-003', 'generic-stack-v1', 'student-1', 1, 'fail', 12, 20, 5, 7, 4100, 8, 3),
  generateSubmission('sub-004', 'generic-stack-v1', 'student-1', 2, 'fail', 17, 20, 6, 7, 3900, 7, 1),
  generateSubmission('sub-005', 'generic-stack-v1', 'student-1', 3, 'pass', 20, 20, 7, 7, 3500, 6, 4),

  // Hash Map — passed on attempt 1
  generateSubmission('sub-006', 'movie-watchlist-v1', 'student-1', 1, 'pass', 18, 18, 8, 8, 4200, 4, 2),

  // Graph Traversal — in progress (failed attempt, not yet re-submitted)
  generateSubmission('sub-007', 'python-calculator-v1', 'student-1', 1, 'fail', 14, 22, 5, 7, 7800, 1, 6),

  // SQL Fundamentals — passed on attempt 1
  generateSubmission('sub-008', 'spring-boot-taskmanager-v1', 'student-1', 1, 'pass', 12, 12, 4, 4, 1500, 10, 3),

  // Schema Design — passed on attempt 2
  generateSubmission('sub-009', 'spring-boot-taskmanager-v1', 'student-1', 1, 'fail', 7, 10, 4, 6, 3800, 5, 1),
  generateSubmission('sub-010', 'spring-boot-taskmanager-v1', 'student-1', 2, 'pass', 10, 10, 6, 6, 3200, 4, 8),

  // REST API — passed
  generateSubmission('sub-011', 'spring-boot-taskmanager-v1', 'student-1', 1, 'pass', 14, 14, 5, 5, 2900, 9, 4),

  // Component Architecture — passed
  generateSubmission('sub-012', 'react-todo-v1', 'student-1', 1, 'pass', 16, 16, 7, 7, 4100, 3, 2),

  // State Management — flagged for review
  generateSubmission('sub-013', 'react-todo-v1', 'student-1', 1, 'flagged_for_review', 16, 18, 4, 6, 4800, 0, 5),

  // Other student submissions for admin views
  generateSubmission('sub-101', 'c-linked-list-v1', 'student-2', 1, 'pass', 15, 15, 6, 6, 3100, 11, 3),
  generateSubmission('sub-102', 'c-linked-list-v1', 'student-3', 1, 'fail', 10, 15, 4, 6, 4500, 12, 1),
  generateSubmission('sub-103', 'c-linked-list-v1', 'student-3', 2, 'pass', 14, 15, 6, 6, 3200, 11, 7),
  generateSubmission('sub-104', 'c-linked-list-v1', 'student-1', 1, 'pass', 15, 15, 6, 6, 2900, 11, 5),
  generateSubmission('sub-105', 'c-linked-list-v1', 'student-2', 1, 'fail', 8, 15, 3, 6, 5100, 12, 2),
  generateSubmission('sub-106', 'c-linked-list-v1', 'student-2', 2, 'fail', 12, 15, 5, 6, 4200, 11, 8),
  generateSubmission('sub-107', 'c-linked-list-v1', 'student-3', 1, 'pass', 15, 15, 6, 6, 2700, 11, 4),
  generateSubmission('sub-108', 'c-linked-list-v1', 'student-1', 1, 'flagged_for_review', 15, 15, 6, 6, 1200, 12, 1),
  generateSubmission('sub-109', 'generic-stack-v1', 'student-2', 1, 'pass', 20, 20, 7, 7, 3800, 6, 2),
  generateSubmission('sub-110', 'generic-stack-v1', 'student-3', 1, 'fail', 15, 20, 5, 7, 4900, 7, 3),
  generateSubmission('sub-111', 'generic-stack-v1', 'student-1', 1, 'pass', 19, 20, 7, 7, 3600, 6, 5),
  generateSubmission('sub-112', 'generic-stack-v1', 'student-2', 1, 'fail', 9, 20, 3, 7, 6200, 8, 1),
  generateSubmission('sub-113', 'generic-stack-v1', 'student-3', 1, 'pass', 20, 20, 7, 7, 3100, 6, 7),
  generateSubmission('sub-114', 'movie-watchlist-v1', 'student-2', 1, 'pass', 18, 18, 8, 8, 4500, 3, 4),
  generateSubmission('sub-115', 'movie-watchlist-v1', 'student-3', 1, 'fail', 14, 18, 6, 8, 5200, 4, 2),
  generateSubmission('sub-116', 'python-calculator-v1', 'student-2', 1, 'running', 0, 22, 0, 7, 0, 0, 0),
  generateSubmission('sub-117', 'spring-boot-taskmanager-v1', 'student-2', 1, 'pass', 12, 12, 4, 4, 1200, 9, 6),
  generateSubmission('sub-118', 'spring-boot-taskmanager-v1', 'student-3', 1, 'fail', 9, 12, 3, 4, 2100, 10, 2),
  // Override example
  {
    ...generateSubmission('sub-200', 'c-linked-list-v1', 'student-2', 1, 'fail', 13, 15, 5, 6, 3400, 10, 3),
    result: 'pass' as EvaluationResult,
    overridden: true,
    overriddenBy: 'Dr. Sarah Mitchell',
    overrideReason: 'Test infrastructure issue caused 2 false failures. Student solution is correct.',
    overriddenAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    score: 100,
  },
];

// ── Test Results for sub-007 (Graph Traversal — Failed) ──
export const MOCK_TEST_RESULTS: TestResult[] = [
  // sub-007 tests (14/22 passed)
  { id: 'tr-001', submissionId: 'sub-007', testName: 'creates empty graph', testSuite: 'Graph Construction', status: 'pass', durationMs: 12, isHidden: false },
  { id: 'tr-002', submissionId: 'sub-007', testName: 'adds vertices correctly', testSuite: 'Graph Construction', status: 'pass', durationMs: 8, isHidden: false },
  { id: 'tr-003', submissionId: 'sub-007', testName: 'adds edges correctly', testSuite: 'Graph Construction', status: 'pass', durationMs: 15, isHidden: false },
  { id: 'tr-004', submissionId: 'sub-007', testName: 'handles duplicate edges', testSuite: 'Graph Construction', status: 'pass', durationMs: 11, isHidden: false },
  { id: 'tr-005', submissionId: 'sub-007', testName: 'BFS traverses level by level', testSuite: 'BFS', status: 'pass', durationMs: 23, isHidden: false },
  { id: 'tr-006', submissionId: 'sub-007', testName: 'BFS finds shortest path', testSuite: 'BFS', status: 'pass', durationMs: 18, isHidden: false },
  { id: 'tr-007', submissionId: 'sub-007', testName: 'BFS handles disconnected graph', testSuite: 'BFS', status: 'fail', durationMs: 45, isHidden: false,
    message: 'Expected BFS to visit all components', expected: '[0, 1, 2, 3, 4, 5]', actual: '[0, 1, 2]', output: 'BFS only traversed the first connected component' },
  { id: 'tr-008', submissionId: 'sub-007', testName: 'BFS returns empty for empty graph', testSuite: 'BFS', status: 'pass', durationMs: 5, isHidden: false },
  { id: 'tr-009', submissionId: 'sub-007', testName: 'DFS traverses depth first', testSuite: 'DFS', status: 'pass', durationMs: 19, isHidden: false },
  { id: 'tr-010', submissionId: 'sub-007', testName: 'DFS handles cycles', testSuite: 'DFS', status: 'pass', durationMs: 22, isHidden: false },
  { id: 'tr-011', submissionId: 'sub-007', testName: 'DFS handles disconnected graph', testSuite: 'DFS', status: 'fail', durationMs: 38, isHidden: false,
    message: 'DFS did not visit all connected components', expected: '6 vertices visited', actual: '3 vertices visited', output: 'Similar to BFS — only first component traversed' },
  { id: 'tr-012', submissionId: 'sub-007', testName: 'detects cycle in directed graph', testSuite: 'Cycle Detection', status: 'pass', durationMs: 28, isHidden: false },
  { id: 'tr-013', submissionId: 'sub-007', testName: 'returns false for acyclic graph', testSuite: 'Cycle Detection', status: 'pass', durationMs: 16, isHidden: false },
  { id: 'tr-014', submissionId: 'sub-007', testName: 'detects self-loop', testSuite: 'Cycle Detection', status: 'fail', durationMs: 12, isHidden: false,
    message: 'Self-loop not detected as cycle', expected: 'true', actual: 'false' },
  { id: 'tr-015', submissionId: 'sub-007', testName: 'topological sort on DAG', testSuite: 'Topological Sort', status: 'pass', durationMs: 25, isHidden: false },
  { id: 'tr-016', submissionId: 'sub-007', testName: 'topological sort detects cycle', testSuite: 'Topological Sort', status: 'pass', durationMs: 20, isHidden: false },
  { id: 'tr-017', submissionId: 'sub-007', testName: 'counts connected components', testSuite: 'Components', status: 'fail', durationMs: 35, isHidden: false,
    message: 'Incorrect component count', expected: '3', actual: '1', output: 'Only counting the first component' },
  { id: 'tr-018', submissionId: 'sub-007', testName: 'handles large sparse graph', testSuite: 'Performance', status: 'pass', durationMs: 180, isHidden: true },
  { id: 'tr-019', submissionId: 'sub-007', testName: 'handles large dense graph', testSuite: 'Performance', status: 'fail', durationMs: 5000, isHidden: true,
    message: 'Time limit exceeded', expected: 'Complete within 5000ms', actual: 'Timed out' },
  { id: 'tr-020', submissionId: 'sub-007', testName: 'shortest path on weighted graph', testSuite: 'Shortest Path', status: 'fail', durationMs: 42, isHidden: true,
    message: 'Incorrect shortest path distance', expected: '7', actual: '9' },
  { id: 'tr-021', submissionId: 'sub-007', testName: 'BFS on bipartite graph', testSuite: 'Advanced', status: 'fail', durationMs: 30, isHidden: true,
    message: 'Failed bipartite check' },
  { id: 'tr-022', submissionId: 'sub-007', testName: 'strongly connected components', testSuite: 'Advanced', status: 'fail', durationMs: 55, isHidden: true,
    message: 'SCC algorithm not implemented' },

  // sub-013 tests (State Management — flagged)
  { id: 'tr-100', submissionId: 'sub-013', testName: 'creates signal', testSuite: 'Signal Primitive', status: 'pass', durationMs: 5, isHidden: false },
  { id: 'tr-101', submissionId: 'sub-013', testName: 'updates signal value', testSuite: 'Signal Primitive', status: 'pass', durationMs: 8, isHidden: false },
  { id: 'tr-102', submissionId: 'sub-013', testName: 'computed value derives correctly', testSuite: 'Computed', status: 'pass', durationMs: 12, isHidden: false },
  { id: 'tr-103', submissionId: 'sub-013', testName: 'effect runs on change', testSuite: 'Effects', status: 'pass', durationMs: 15, isHidden: false },
  { id: 'tr-104', submissionId: 'sub-013', testName: 'batch updates', testSuite: 'Effects', status: 'pass', durationMs: 18, isHidden: false },
  { id: 'tr-105', submissionId: 'sub-013', testName: 'unsubscribe works', testSuite: 'Effects', status: 'pass', durationMs: 10, isHidden: false },
  { id: 'tr-106', submissionId: 'sub-013', testName: 'todo app adds item', testSuite: 'Todo App', status: 'pass', durationMs: 20, isHidden: false },
  { id: 'tr-107', submissionId: 'sub-013', testName: 'todo app removes item', testSuite: 'Todo App', status: 'pass', durationMs: 16, isHidden: false },
  { id: 'tr-108', submissionId: 'sub-013', testName: 'todo app toggles item', testSuite: 'Todo App', status: 'pass', durationMs: 14, isHidden: false },
  { id: 'tr-109', submissionId: 'sub-013', testName: 'todo app filters', testSuite: 'Todo App', status: 'pass', durationMs: 22, isHidden: false },
  { id: 'tr-110', submissionId: 'sub-013', testName: 'state history logging', testSuite: 'DevTools', status: 'pass', durationMs: 25, isHidden: false },
  { id: 'tr-111', submissionId: 'sub-013', testName: 'circular dependency detection', testSuite: 'Edge Cases', status: 'pass', durationMs: 30, isHidden: false },
  { id: 'tr-112', submissionId: 'sub-013', testName: 'memory leak prevention', testSuite: 'Edge Cases', status: 'pass', durationMs: 45, isHidden: false },
  { id: 'tr-113', submissionId: 'sub-013', testName: 'concurrent updates', testSuite: 'Edge Cases', status: 'pass', durationMs: 38, isHidden: false },
  { id: 'tr-114', submissionId: 'sub-013', testName: 'diamond dependency', testSuite: 'Advanced', status: 'fail', durationMs: 28, isHidden: true,
    message: 'Diamond dependency causes double computation', expected: '1 computation', actual: '2 computations' },
  { id: 'tr-115', submissionId: 'sub-013', testName: 'async effect handling', testSuite: 'Advanced', status: 'fail', durationMs: 50, isHidden: true,
    message: 'Async effects not properly awaited' },
];

// ── Static Analysis Findings for sub-007 ──
export const MOCK_FINDINGS: StaticFinding[] = [
  { id: 'sf-001', submissionId: 'sub-007', ruleId: 'PERF-001', ruleName: 'Inefficient Collection Usage',
    satisfied: true, category: 'suspicious', message: 'ArrayList used where LinkedList would be more efficient for frequent insertions',
    file: 'GraphTraversal.java', line: 42, column: 12, symbol: 'adjacencyList', evidence: 'new ArrayList<>()' },
  { id: 'sf-002', submissionId: 'sub-007', ruleId: 'NULL-001', ruleName: 'Potential Null Dereference',
    satisfied: false, category: 'required', message: 'Method getNeighbors() may return null when vertex does not exist',
    file: 'GraphTraversal.java', line: 67, column: 20, endLine: 67, endColumn: 35, symbol: 'getNeighbors', evidence: 'return adjacencyList.get(vertex);' },
  { id: 'sf-003', submissionId: 'sub-007', ruleId: 'STYLE-002', ruleName: 'Missing JavaDoc',
    satisfied: true, category: 'suspicious', message: 'Public method bfs() lacks documentation',
    file: 'GraphTraversal.java', line: 78, column: 5, symbol: 'bfs' },
  { id: 'sf-004', submissionId: 'sub-007', ruleId: 'COMPLEX-001', ruleName: 'High Cyclomatic Complexity',
    satisfied: true, category: 'suspicious', message: 'Method detectCycle has cyclomatic complexity of 12 (threshold: 10)',
    file: 'GraphTraversal.java', line: 112, column: 5, symbol: 'detectCycle' },
  { id: 'sf-005', submissionId: 'sub-007', ruleId: 'RESOURCE-001', ruleName: 'Resource Leak',
    satisfied: false, category: 'required', message: 'Scanner not closed after use in readGraph()',
    file: 'GraphTraversal.java', line: 25, column: 15, symbol: 'scanner', evidence: 'new Scanner(System.in)' },

  // Findings for sub-013 (flagged)
  { id: 'sf-100', submissionId: 'sub-013', ruleId: 'SIM-001', ruleName: 'Code Similarity Detection',
    satisfied: false, category: 'required', message: 'High structural similarity (92%) detected with known solution repository',
    file: 'signal.ts', line: 1, column: 1, endLine: 45, endColumn: 1,
    evidence: 'Structure matches reference implementation pattern' },
  { id: 'sf-101', submissionId: 'sub-013', ruleId: 'SIM-002', ruleName: 'Unusual Code Pattern',
    satisfied: false, category: 'required', message: 'Variable naming pattern suggests copied code — identical non-obvious variable names',
    file: 'signal.ts', line: 12, column: 7, symbol: '__subscriberQueue__' },
  { id: 'sf-102', submissionId: 'sub-013', ruleId: 'STYLE-001', ruleName: 'Inconsistent Code Style',
    satisfied: true, category: 'suspicious', message: 'Code style abruptly changes at line 48 — different formatting conventions',
    file: 'todo-app.ts', line: 48, column: 1 },
  { id: 'sf-103', submissionId: 'sub-013', ruleId: 'PERF-002', ruleName: 'Unnecessary Re-computation',
    satisfied: true, category: 'suspicious', message: 'Computed value recalculates on every access instead of caching',
    file: 'computed.ts', line: 22, column: 10, symbol: 'get' },
];

// ── Diff for sub-007 ──
export const MOCK_DIFFS: Record<string, DiffFile[]> = {
  'sub-007': [
    {
      fileName: 'GraphTraversal.java',
      language: 'java',
      additions: 12,
      deletions: 3,
      lines: [
        { type: 'context', content: 'public class GraphTraversal {', oldLineNumber: 1, newLineNumber: 1 },
        { type: 'context', content: '    private Map<Integer, List<Integer>> adjacencyList;', oldLineNumber: 2, newLineNumber: 2 },
        { type: 'context', content: '', oldLineNumber: 3, newLineNumber: 3 },
        { type: 'removed', content: '    public List<Integer> bfs(int start) {', oldLineNumber: 78 },
        { type: 'added', content: '    public List<Integer> bfs(int start, boolean visitAll) {', newLineNumber: 78 },
        { type: 'context', content: '        List<Integer> result = new ArrayList<>();', oldLineNumber: 79, newLineNumber: 79 },
        { type: 'context', content: '        Queue<Integer> queue = new LinkedList<>();', oldLineNumber: 80, newLineNumber: 80 },
        { type: 'context', content: '        Set<Integer> visited = new HashSet<>();', oldLineNumber: 81, newLineNumber: 81 },
        { type: 'context', content: '', oldLineNumber: 82, newLineNumber: 82 },
        { type: 'removed', content: '        queue.offer(start);', oldLineNumber: 83 },
        { type: 'removed', content: '        visited.add(start);', oldLineNumber: 84 },
        { type: 'added', content: '        // Start BFS from the given vertex', newLineNumber: 83 },
        { type: 'added', content: '        queue.offer(start);', newLineNumber: 84 },
        { type: 'added', content: '        visited.add(start);', newLineNumber: 85 },
        { type: 'context', content: '', oldLineNumber: 85, newLineNumber: 86 },
        { type: 'context', content: '        while (!queue.isEmpty()) {', oldLineNumber: 86, newLineNumber: 87 },
        { type: 'context', content: '            int vertex = queue.poll();', oldLineNumber: 87, newLineNumber: 88 },
        { type: 'context', content: '            result.add(vertex);', oldLineNumber: 88, newLineNumber: 89 },
        { type: 'added', content: '', newLineNumber: 90 },
        { type: 'added', content: '            // Visit all unvisited neighbors', newLineNumber: 91 },
        { type: 'context', content: '            for (int neighbor : getNeighbors(vertex)) {', oldLineNumber: 89, newLineNumber: 92 },
        { type: 'context', content: '                if (!visited.contains(neighbor)) {', oldLineNumber: 90, newLineNumber: 93 },
        { type: 'context', content: '                    visited.add(neighbor);', oldLineNumber: 91, newLineNumber: 94 },
        { type: 'context', content: '                    queue.offer(neighbor);', oldLineNumber: 92, newLineNumber: 95 },
        { type: 'context', content: '                }', oldLineNumber: 93, newLineNumber: 96 },
        { type: 'context', content: '            }', oldLineNumber: 94, newLineNumber: 97 },
        { type: 'context', content: '        }', oldLineNumber: 95, newLineNumber: 98 },
        { type: 'added', content: '', newLineNumber: 99 },
        { type: 'added', content: '        // TODO: Handle disconnected components when visitAll is true', newLineNumber: 100 },
        { type: 'added', content: '        // Currently only visits the component containing start vertex', newLineNumber: 101 },
        { type: 'added', content: '', newLineNumber: 102 },
        { type: 'context', content: '        return result;', oldLineNumber: 96, newLineNumber: 103 },
        { type: 'context', content: '    }', oldLineNumber: 97, newLineNumber: 104 },
      ]
    }
  ],
  'sub-013': [
    {
      fileName: 'signal.ts',
      language: 'typescript',
      additions: 8,
      deletions: 2,
      lines: [
        { type: 'context', content: 'type Subscriber<T> = (value: T) => void;', oldLineNumber: 1, newLineNumber: 1 },
        { type: 'context', content: '', oldLineNumber: 2, newLineNumber: 2 },
        { type: 'removed', content: 'export function createSignal<T>(initial: T) {', oldLineNumber: 3 },
        { type: 'added', content: 'export function createSignal<T>(initialValue: T) {', newLineNumber: 3 },
        { type: 'removed', content: '  let value = initial;', oldLineNumber: 4 },
        { type: 'added', content: '  let value = initialValue;', newLineNumber: 4 },
        { type: 'context', content: '  const __subscriberQueue__: Set<Subscriber<T>> = new Set();', oldLineNumber: 5, newLineNumber: 5 },
        { type: 'added', content: '', newLineNumber: 6 },
        { type: 'added', content: '  const get = (): T => {', newLineNumber: 7 },
        { type: 'added', content: '    // Track dependency if in computed context', newLineNumber: 8 },
        { type: 'added', content: '    if (currentComputed) {', newLineNumber: 9 },
        { type: 'added', content: '      __subscriberQueue__.add(currentComputed);', newLineNumber: 10 },
        { type: 'added', content: '    }', newLineNumber: 11 },
        { type: 'added', content: '    return value;', newLineNumber: 12 },
        { type: 'added', content: '  };', newLineNumber: 13 },
      ]
    }
  ]
};
