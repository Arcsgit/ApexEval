/* ============================================================
   ApexEval — Core Domain Models
   ============================================================ */

// ── User & Auth ──

export type UserRole = 'student' | 'faculty' | 'admin' | 'superadmin';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
  lastLoginAt?: string;
  isActive: boolean;
  workspacePath?: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: string;
}

// ── Courses ──

export type CourseStatus = 'active' | 'archived' | 'draft';
export type UnlockMethod = 'scheduled' | 'manual';
export type WeekStatus = 'available' | 'locked' | 'completed';

export interface CourseWeek {
  number: number;
  releaseDate: string;
  status: WeekStatus;
  unlockMethod: UnlockMethod;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  description: string;
  instructorId: string;
  instructorName: string;
  status: CourseStatus;
  startDate: string;
  endDate: string;
  totalWeeks: number;
  currentWeek: number;
  studentCount: number;
  assignmentCount: number;
  createdAt: string;
  weeks?: CourseWeek[];
}

export interface CourseEnrollment {
  courseId: string;
  studentId: string;
  enrolledAt: string;
  completedAssignments: number;
  totalAssignments: number;
  progressPercent: number;
  currentStreak: number;
}

export interface CourseWithProgress extends Course {
  enrollment: CourseEnrollment;
}

// ── Assignments ──

export type AssignmentStatus = 'draft' | 'published' | 'closed';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type ProgrammingLanguage = 'java' | 'python' | 'cpp' | 'javascript' | 'typescript' | 'sql' | 'c';

export interface Assignment {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  description: string;
  requirements: string[];
  constraints: string[];
  allowedLanguages: ProgrammingLanguage[];
  defaultLanguage: ProgrammingLanguage;
  difficulty: DifficultyLevel;
  week: number;
  day: number;
  dueDate: string;
  maxAttempts: number;
  runtimeLimitMs: number;
  memoryLimitMb: number;
  status: AssignmentStatus;
  totalTests: number;
  totalHiddenTests: number;
  totalStaticChecks: number;
  starterCode?: Record<ProgrammingLanguage, string>;
  createdAt: string;
  publishedAt?: string;
  assignmentPath?: string;
}

export interface StudentAssignment extends Assignment {
  studentStatus: StudentAssignmentStatus;
  attemptsUsed: number;
  bestScore?: number;
  lastSubmissionAt?: string;
  draftCode?: string;
  draftLanguage?: ProgrammingLanguage;
}

export type StudentAssignmentStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'passed'
  | 'failed'
  | 'flagged'
  | 'overdue';

// ── Submissions ──

export type SubmissionStatus =
  | 'queued'
  | 'building'
  | 'running_tests'
  | 'static_analysis'
  | 'db_verification'
  | 'complete';

export type EvaluationResult =
  | 'pass'
  | 'fail'
  | 'flagged_for_review'
  | 'running'
  | 'queued'
  | 'error';

export interface Submission {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  courseId: string;
  courseName: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  attempt: number;
  language: ProgrammingLanguage;
  code: string;
  status: SubmissionStatus;
  result?: EvaluationResult;
  submittedAt: string;
  completedAt?: string;
  executionDurationMs?: number;
  testsPassed?: number;
  testsTotal?: number;
  staticChecksPassed?: number;
  staticChecksTotal?: number;
  dbCheckPassed?: boolean;
  score?: number;
  overridden?: boolean;
  overriddenBy?: string;
  overrideReason?: string;
  overriddenAt?: string;
}

// ── Test Results ──

export type TestStatus = 'pass' | 'fail' | 'error' | 'skip';

export interface TestResult {
  id: string;
  submissionId: string;
  testName: string;
  testSuite: string;
  status: TestStatus;
  durationMs: number;
  message?: string;
  expected?: string;
  actual?: string;
  output?: string;
  isHidden: boolean;
}

// ── Static Analysis ──

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type FindingCategory = 'required' | 'suspicious';

export interface StaticFinding {
  id: string;
  submissionId: string;
  ruleId: string;
  ruleName: string;
  severity: FindingSeverity;
  category: FindingCategory;
  message: string;
  file: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  symbol?: string;
  evidence?: string;
}

// ── Diff ──

export type DiffLineType = 'added' | 'removed' | 'context';

export interface DiffLine {
  type: DiffLineType;
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffFile {
  fileName: string;
  language: string;
  lines: DiffLine[];
  additions: number;
  deletions: number;
}

// ── Analytics ──

export interface PassRateData {
  assignmentId: string;
  assignmentTitle: string;
  totalSubmissions: number;
  passCount: number;
  failCount: number;
  flaggedCount: number;
  passRate: number;
}

export interface SubmissionActivityData {
  date: string;
  count: number;
}

export interface ViolationData {
  ruleId: string;
  ruleName: string;
  count: number;
  severity: FindingSeverity;
}

export interface StudentPerformance {
  studentId: string;
  studentName: string;
  studentEmail: string;
  assignmentsCompleted: number;
  assignmentsTotal: number;
  averageScore: number;
  passRate: number;
  totalSubmissions: number;
  lastActiveAt: string;
}

export interface TimeToSubmitData {
  range: string;
  count: number;
}

// ── System Health (Superadmin) ──

export interface RunnerHealth {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  cpuPercent: number;
  memoryPercent: number;
  queueDepth: number;
  activeJobs: number;
  avgExecutionMs: number;
  uptime: string;
}

export interface SandboxHealth {
  successRate: number;
  failureRate: number;
  avgExecutionMs: number;
  totalExecutions24h: number;
  errorCount24h: number;
}

export interface PlatformMetrics {
  activeRunners: number;
  totalRunners: number;
  queueDepth: number;
  cacheHitRate: number;
  p95LatencyMs: number;
  sandboxErrors24h: number;
  submissions24h: number;
  activeStudents24h: number;
}

export interface CurrentJob {
  id: string;
  studentName: string;
  assignmentTitle: string;
  runnerId: string;
  runnerName: string;
  status: 'running' | 'queued';
  startedAt: string;
  durationMs: number;
}

// ── Audit Log ──

export type AuditAction =
  | 'user.login'
  | 'user.logout'
  | 'course.create'
  | 'course.update'
  | 'course.delete'
  | 'assignment.create'
  | 'assignment.publish'
  | 'assignment.update'
  | 'submission.submit'
  | 'submission.evaluate'
  | 'grade.override'
  | 'admin.create'
  | 'admin.disable'
  | 'admin.role_change'
  | 'settings.update'
  | 'system.restart';

export interface AuditEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: AuditAction;
  target: string;
  targetId?: string;
  result: 'success' | 'failure';
  details?: Record<string, unknown>;
  ipAddress: string;
}

// ── Platform Settings ──

export interface PlatformSettings {
  general: {
    platformName: string;
    supportEmail: string;
    maxFileSize: number;
    maintenanceMode: boolean;
  };
  execution: {
    defaultTimeoutMs: number;
    maxTimeoutMs: number;
    defaultMemoryMb: number;
    maxMemoryMb: number;
    maxConcurrentJobs: number;
  };
  caching: {
    enabled: boolean;
    ttlSeconds: number;
    maxCacheSize: number;
  };
  rateLimits: {
    submissionsPerHour: number;
    apiRequestsPerMinute: number;
    maxAttemptsPerAssignment: number;
  };
  featureFlags: {
    enableDiffViewer: boolean;
    enableStaticAnalysis: boolean;
    enableDbVerification: boolean;
    enableStudentCodeReview: boolean;
    enableAutoGrading: boolean;
  };
  security: {
    sessionTimeoutMinutes: number;
    maxLoginAttempts: number;
    requireMfa: boolean;
    allowedDomains: string[];
  };
}

// ── Notifications ──

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  link?: string;
}

// ── Pagination ──

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  search?: string;
}

// ── Filter Types ──

export interface SubmissionFilter extends PaginationParams {
  courseId?: string;
  assignmentId?: string;
  studentId?: string;
  status?: EvaluationResult;
  dateFrom?: string;
  dateTo?: string;
}

export interface AuditFilter extends PaginationParams {
  action?: AuditAction;
  actorId?: string;
  dateFrom?: string;
  dateTo?: string;
}
