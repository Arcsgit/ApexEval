/* ============================================================
   ApexEval — Analytics Service (Mock)
   ============================================================ */

import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import {
  PassRateData, SubmissionActivityData, ViolationData,
  StudentPerformance, TimeToSubmitData
} from '../models';
import { MOCK_ASSIGNMENTS, MOCK_SUBMISSIONS, MOCK_STUDENTS } from '../mock';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {

  getPassRates(courseId?: string): Observable<PassRateData[]> {
    const assignments = courseId
      ? MOCK_ASSIGNMENTS.filter(a => a.courseId === courseId)
      : MOCK_ASSIGNMENTS;

    const data: PassRateData[] = assignments
      .filter(a => a.status === 'published')
      .map(a => {
        const subs = MOCK_SUBMISSIONS.filter(s => s.assignmentId === a.id && s.status === 'complete');
        const passCount = subs.filter(s => s.result === 'pass').length;
        const failCount = subs.filter(s => s.result === 'fail').length;
        const flaggedCount = subs.filter(s => s.result === 'flagged_for_review').length;
        return {
          assignmentId: a.id,
          assignmentTitle: a.title,
          totalSubmissions: subs.length,
          passCount,
          failCount,
          flaggedCount,
          passRate: subs.length > 0 ? Math.round((passCount / subs.length) * 100) : 0,
        };
      });

    return of(data).pipe(delay(300));
  }

  getSubmissionActivity(days: number = 14): Observable<SubmissionActivityData[]> {
    const data: SubmissionActivityData[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      // Generate realistic-looking activity
      const base = Math.floor(Math.random() * 15) + 5;
      const weekday = date.getDay();
      const multiplier = (weekday === 0 || weekday === 6) ? 0.4 : 1;
      data.push({ date: dateStr, count: Math.floor(base * multiplier) });
    }
    return of(data).pipe(delay(300));
  }

  getTopViolations(courseId?: string): Observable<ViolationData[]> {
    return of([
      { ruleId: 'NULL-001', ruleName: 'Potential Null Dereference', count: 42, severity: 'high' as const },
      { ruleId: 'PERF-001', ruleName: 'Inefficient Collection Usage', count: 38, severity: 'medium' as const },
      { ruleId: 'RESOURCE-001', ruleName: 'Resource Leak', count: 31, severity: 'high' as const },
      { ruleId: 'STYLE-002', ruleName: 'Missing Documentation', count: 28, severity: 'low' as const },
      { ruleId: 'COMPLEX-001', ruleName: 'High Cyclomatic Complexity', count: 24, severity: 'medium' as const },
      { ruleId: 'SQL-001', ruleName: 'SQL Injection Risk', count: 19, severity: 'critical' as const },
      { ruleId: 'STYLE-001', ruleName: 'Inconsistent Code Style', count: 17, severity: 'low' as const },
      { ruleId: 'PERF-002', ruleName: 'Unnecessary Re-computation', count: 15, severity: 'medium' as const },
      { ruleId: 'SEC-001', ruleName: 'Hardcoded Credentials', count: 8, severity: 'critical' as const },
      { ruleId: 'TYPE-001', ruleName: 'Unsafe Type Cast', count: 6, severity: 'medium' as const },
    ]).pipe(delay(300));
  }

  getStudentPerformance(courseId?: string): Observable<StudentPerformance[]> {
    const performances: StudentPerformance[] = MOCK_STUDENTS.slice(0, 20).map(student => {
      const subs = MOCK_SUBMISSIONS.filter(s => s.studentId === student.id);
      const passedSubs = subs.filter(s => s.result === 'pass');
      const uniqueAssignments = new Set(subs.map(s => s.assignmentId));
      const passedAssignments = new Set(passedSubs.map(s => s.assignmentId));

      return {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        studentEmail: student.email,
        assignmentsCompleted: passedAssignments.size,
        assignmentsTotal: 8,
        averageScore: subs.length > 0
          ? Math.round(subs.reduce((sum, s) => sum + (s.score ?? 0), 0) / subs.length)
          : 0,
        passRate: subs.length > 0
          ? Math.round((passedSubs.length / subs.length) * 100)
          : 0,
        totalSubmissions: subs.length,
        lastActiveAt: student.lastLoginAt ?? student.createdAt,
      };
    });

    return of(performances).pipe(delay(400));
  }

  getTimeToSubmit(): Observable<TimeToSubmitData[]> {
    return of([
      { range: '< 1h', count: 12 },
      { range: '1-3h', count: 28 },
      { range: '3-6h', count: 35 },
      { range: '6-12h', count: 22 },
      { range: '12-24h', count: 18 },
      { range: '1-2d', count: 15 },
      { range: '2-5d', count: 8 },
      { range: '> 5d', count: 3 },
    ]).pipe(delay(300));
  }
}
