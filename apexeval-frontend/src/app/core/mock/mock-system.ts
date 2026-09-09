/* ============================================================
   ApexEval — Mock Data: System Health, Audit Log, Settings
   ============================================================ */

import {
  RunnerHealth, SandboxHealth, PlatformMetrics, CurrentJob,
  AuditEntry, PlatformSettings, AppNotification
} from '../models';

export const MOCK_RUNNERS: RunnerHealth[] = [
  { id: 'run-001', name: 'runner-us-east-1a', status: 'healthy', cpuPercent: 42, memoryPercent: 58, queueDepth: 3, activeJobs: 2, avgExecutionMs: 4200, uptime: '14d 6h 23m' },
  { id: 'run-002', name: 'runner-us-east-1b', status: 'healthy', cpuPercent: 35, memoryPercent: 51, queueDepth: 1, activeJobs: 1, avgExecutionMs: 3800, uptime: '14d 6h 23m' },
  { id: 'run-003', name: 'runner-us-west-2a', status: 'degraded', cpuPercent: 78, memoryPercent: 82, queueDepth: 8, activeJobs: 4, avgExecutionMs: 6100, uptime: '7d 12h 45m' },
  { id: 'run-004', name: 'runner-eu-west-1a', status: 'healthy', cpuPercent: 28, memoryPercent: 44, queueDepth: 2, activeJobs: 2, avgExecutionMs: 4500, uptime: '21d 3h 10m' },
  { id: 'run-005', name: 'runner-eu-west-1b', status: 'healthy', cpuPercent: 31, memoryPercent: 47, queueDepth: 0, activeJobs: 0, avgExecutionMs: 3900, uptime: '21d 3h 10m' },
  { id: 'run-006', name: 'runner-ap-south-1a', status: 'down', cpuPercent: 0, memoryPercent: 0, queueDepth: 0, activeJobs: 0, avgExecutionMs: 0, uptime: '0' },
];

export const MOCK_SANDBOX_HEALTH: SandboxHealth = {
  successRate: 94.7,
  failureRate: 5.3,
  avgExecutionMs: 4350,
  totalExecutions24h: 847,
  errorCount24h: 45,
};

export const MOCK_PLATFORM_METRICS: PlatformMetrics = {
  activeRunners: 5,
  totalRunners: 6,
  queueDepth: 14,
  cacheHitRate: 72.3,
  p95LatencyMs: 6200,
  sandboxErrors24h: 45,
  submissions24h: 187,
  activeStudents24h: 68,
};

export const MOCK_CURRENT_JOBS: CurrentJob[] = [
  { id: 'job-001', studentName: 'Priya Sharma', assignmentTitle: 'Graph Traversal Algorithms', runnerId: 'run-001', runnerName: 'runner-us-east-1a', status: 'running', startedAt: new Date(Date.now() - 12000).toISOString(), durationMs: 12000 },
  { id: 'job-002', studentName: 'Marcus Johnson', assignmentTitle: 'Binary Search Tree', runnerId: 'run-001', runnerName: 'runner-us-east-1a', status: 'running', startedAt: new Date(Date.now() - 8000).toISOString(), durationMs: 8000 },
  { id: 'job-003', studentName: 'Sara Kim', assignmentTitle: 'Hash Map from Scratch', runnerId: 'run-002', runnerName: 'runner-us-east-1b', status: 'running', startedAt: new Date(Date.now() - 3000).toISOString(), durationMs: 3000 },
  { id: 'job-004', studentName: 'James Williams', assignmentTitle: 'Transaction Management', runnerId: 'run-003', runnerName: 'runner-us-west-2a', status: 'running', startedAt: new Date(Date.now() - 25000).toISOString(), durationMs: 25000 },
  { id: 'job-005', studentName: 'Elena Rodriguez', assignmentTitle: 'REST API Design', runnerId: 'run-003', runnerName: 'runner-us-west-2a', status: 'running', startedAt: new Date(Date.now() - 6000).toISOString(), durationMs: 6000 },
  { id: 'job-006', studentName: 'Omar Hassan', assignmentTitle: 'SQL Fundamentals', runnerId: 'run-004', runnerName: 'runner-eu-west-1a', status: 'queued', startedAt: new Date(Date.now() - 1000).toISOString(), durationMs: 1000 },
  { id: 'job-007', studentName: 'David Park', assignmentTitle: 'Sorting Algorithms', runnerId: 'run-003', runnerName: 'runner-us-west-2a', status: 'queued', startedAt: new Date(Date.now() - 500).toISOString(), durationMs: 500 },
];

function daysAgo(d: number, h: number = 0): string {
  const date = new Date();
  date.setDate(date.getDate() - d);
  date.setHours(date.getHours() - h);
  return date.toISOString();
}

export const MOCK_AUDIT_LOG: AuditEntry[] = [
  { id: 'aud-001', timestamp: daysAgo(0, 1), actorId: 'stu-001', actorName: 'Alex Chen', actorRole: 'student', action: 'submission.submit', target: 'State Management (asg-203)', targetId: 'sub-013', result: 'success', ipAddress: '192.168.1.42' },
  { id: 'aud-002', timestamp: daysAgo(0, 2), actorId: 'fac-001', actorName: 'Dr. Sarah Mitchell', actorRole: 'faculty', action: 'grade.override', target: 'Linked List submission by Mia Thompson', targetId: 'sub-200', result: 'success', details: { previousResult: 'fail', newResult: 'pass', reason: 'Test infrastructure issue' }, ipAddress: '10.0.0.15' },
  { id: 'aud-003', timestamp: daysAgo(0, 3), actorId: 'sa-001', actorName: 'Michael Torres', actorRole: 'superadmin', action: 'settings.update', target: 'Execution settings', result: 'success', details: { field: 'maxConcurrentJobs', oldValue: 50, newValue: 75 }, ipAddress: '10.0.0.1' },
  { id: 'aud-004', timestamp: daysAgo(0, 4), actorId: 'fac-001', actorName: 'Dr. Sarah Mitchell', actorRole: 'faculty', action: 'assignment.publish', target: 'Sorting Algorithms Comparison (asg-005)', targetId: 'asg-005', result: 'success', ipAddress: '10.0.0.15' },
  { id: 'aud-005', timestamp: daysAgo(0, 5), actorId: 'stu-002', actorName: 'Priya Sharma', actorRole: 'student', action: 'submission.submit', target: 'Graph Traversal Algorithms (asg-004)', targetId: 'sub-116', result: 'success', ipAddress: '192.168.1.100' },
  { id: 'aud-006', timestamp: daysAgo(0, 8), actorId: 'fac-002', actorName: 'Prof. Raj Kumar', actorRole: 'faculty', action: 'course.update', target: 'Database Systems (crs-002)', targetId: 'crs-002', result: 'success', details: { field: 'description', action: 'updated' }, ipAddress: '10.0.0.22' },
  { id: 'aud-007', timestamp: daysAgo(1, 2), actorId: 'sa-001', actorName: 'Michael Torres', actorRole: 'superadmin', action: 'admin.create', target: 'Prof. Wei Chen', targetId: 'adm-004', result: 'success', ipAddress: '10.0.0.1' },
  { id: 'aud-008', timestamp: daysAgo(1, 5), actorId: 'stu-005', actorName: 'James Williams', actorRole: 'student', action: 'submission.submit', target: 'Linked List Implementation (asg-001)', targetId: 'sub-106', result: 'success', ipAddress: '192.168.1.55' },
  { id: 'aud-009', timestamp: daysAgo(1, 8), actorId: 'fac-001', actorName: 'Dr. Sarah Mitchell', actorRole: 'faculty', action: 'assignment.create', target: 'Dynamic Programming Challenges (asg-006)', targetId: 'asg-006', result: 'success', ipAddress: '10.0.0.15' },
  { id: 'aud-010', timestamp: daysAgo(2, 1), actorId: 'sa-002', actorName: 'Lisa Nakamura', actorRole: 'superadmin', action: 'system.restart', target: 'runner-ap-south-1a', targetId: 'run-006', result: 'failure', details: { error: 'Connection timeout to runner instance' }, ipAddress: '10.0.0.2' },
  { id: 'aud-011', timestamp: daysAgo(2, 4), actorId: 'stu-007', actorName: 'Omar Hassan', actorRole: 'student', action: 'submission.submit', target: 'Linked List Implementation (asg-001)', targetId: 'sub-108', result: 'success', ipAddress: '192.168.1.78' },
  { id: 'aud-012', timestamp: daysAgo(2, 6), actorId: 'fac-003', actorName: 'Dr. Emily Foster', actorRole: 'faculty', action: 'assignment.publish', target: 'State Management (asg-203)', targetId: 'asg-203', result: 'success', ipAddress: '10.0.0.33' },
  { id: 'aud-013', timestamp: daysAgo(3, 2), actorId: 'sa-001', actorName: 'Michael Torres', actorRole: 'superadmin', action: 'admin.disable', target: 'Prof. Wei Chen', targetId: 'adm-004', result: 'success', details: { reason: 'Sabbatical leave' }, ipAddress: '10.0.0.1' },
  { id: 'aud-014', timestamp: daysAgo(3, 9), actorId: 'stu-001', actorName: 'Alex Chen', actorRole: 'student', action: 'user.login', target: 'Session', result: 'success', ipAddress: '192.168.1.42' },
  { id: 'aud-015', timestamp: daysAgo(4, 3), actorId: 'fac-001', actorName: 'Dr. Sarah Mitchell', actorRole: 'faculty', action: 'user.login', target: 'Session', result: 'success', ipAddress: '10.0.0.15' },
];

export const MOCK_PLATFORM_SETTINGS: PlatformSettings = {
  general: {
    platformName: 'ApexEval',
    supportEmail: 'support@apexeval.io',
    maxFileSize: 5242880,
    maintenanceMode: false,
  },
  execution: {
    defaultTimeoutMs: 10000,
    maxTimeoutMs: 30000,
    defaultMemoryMb: 256,
    maxMemoryMb: 1024,
    maxConcurrentJobs: 75,
  },
  caching: {
    enabled: true,
    ttlSeconds: 3600,
    maxCacheSize: 1073741824,
  },
  rateLimits: {
    submissionsPerHour: 10,
    apiRequestsPerMinute: 60,
    maxAttemptsPerAssignment: 5,
  },
  featureFlags: {
    enableDiffViewer: true,
    enableStaticAnalysis: true,
    enableDbVerification: true,
    enableStudentCodeReview: false,
    enableAutoGrading: true,
  },
  security: {
    sessionTimeoutMinutes: 480,
    maxLoginAttempts: 5,
    requireMfa: false,
    allowedDomains: ['university.edu', 'apexeval.io', 'apexeval.demo'],
  },
};

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  { id: 'notif-001', type: 'warning', title: 'Submission Flagged', message: 'Your State Management submission has been flagged for instructor review.', read: false, timestamp: daysAgo(0, 5), link: '/student/submissions/sub-013' },
  { id: 'notif-002', type: 'success', title: 'Assignment Passed', message: 'You passed Component Architecture with a score of 100%.', read: false, timestamp: daysAgo(3, 2), link: '/student/submissions/sub-012' },
  { id: 'notif-003', type: 'info', title: 'New Assignment', message: 'Sorting Algorithms Comparison is now available in Data Structures & Algorithms.', read: true, timestamp: daysAgo(1, 0), link: '/student/courses/crs-001' },
  { id: 'notif-004', type: 'error', title: 'Submission Failed', message: 'Your Graph Traversal submission failed 8 out of 22 tests.', read: true, timestamp: daysAgo(1, 6), link: '/student/submissions/sub-007' },
  { id: 'notif-005', type: 'info', title: 'Deadline Approaching', message: 'Graph Traversal Algorithms is due in 4 days.', read: true, timestamp: daysAgo(2, 0) },
];
