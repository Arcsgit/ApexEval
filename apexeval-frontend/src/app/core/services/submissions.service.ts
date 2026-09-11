/* ============================================================
   ApexEval — Submissions Service (Real Backend + Mock Fallback)
   ============================================================ */

import { Injectable } from '@angular/core';
import { Observable, of, delay, Subject } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  Submission, TestResult, StaticFinding, DiffFile,
  SubmissionStatus, EvaluationResult,
  PaginatedResponse, SubmissionFilter
} from '../models';
import { MOCK_SUBMISSIONS, MOCK_TEST_RESULTS, MOCK_FINDINGS, MOCK_DIFFS } from '../mock';
import { MOCK_ASSIGNMENTS } from '../mock';
import { ApiService, SubmitCodeRequest, SubmitCodeResponse, RunTestRequest, RunTestResult } from '../api/api.service';

@Injectable({ providedIn: 'root' })
export class SubmissionsService {

  constructor(private readonly api: ApiService) {}

  getSubmissions(filter: SubmissionFilter): Observable<PaginatedResponse<Submission>> {
    // Try real API first, fallback to mock
    return this.api.getSubmissions(filter).pipe(
      catchError(() => this.getMockSubmissions(filter))
    );
  }

  getSubmissionById(id: string): Observable<Submission | undefined> {
    return this.api.getSubmissionById(id).pipe(
      catchError(() => of(MOCK_SUBMISSIONS.find(s => s.id === id)))
    );
  }

  getTestResults(submissionId: string): Observable<TestResult[]> {
    return this.api.getTestResults(submissionId).pipe(
      catchError(() => of(MOCK_TEST_RESULTS.filter(t => t.submissionId === submissionId)))
    );
  }

  getFindings(submissionId: string): Observable<StaticFinding[]> {
    return this.api.getFindings(submissionId).pipe(
      catchError(() => of(MOCK_FINDINGS.filter(f => f.submissionId === submissionId)))
    );
  }

  getDiff(submissionId: string): Observable<DiffFile[]> {
    return this.api.getDiff(submissionId).pipe(
      catchError(() => of(MOCK_DIFFS[submissionId] ?? []))
    );
  }

  /** Run test using the actual backend execution endpoint with workspace path */
  runTestWithWorkspace(workspacePath: string, assignmentPath: string, assignmentId: string, studentId: string): Observable<RunTestResult> {
    const request: RunTestRequest = {
      workspacePath,
      assignmentPath,
      assignmentId,
      lastTestedCommit: '',
      studentId
    };
    return this.api.runTestWithWorkspace(request).pipe(
      catchError((error) => {
        console.error('Run test failed:', error);
        throw error;
      })
    );
  }

  /** Submit code to backend for evaluation */
  submitCode(assignmentId: string, studentId: string, code: string, language: string): Observable<{ status: SubmissionStatus; submission?: Submission }> {
    const request: SubmitCodeRequest = { studentId, assignmentId, code, language };
    
    return this.api.submitCode(request).pipe(
      map(response => ({
        status: 'complete' as SubmissionStatus,
        submission: response.submission
      })),
      catchError(() => this.mockSubmitCode(assignmentId, studentId, code, language))
    );
  }

  overrideGrade(submissionId: string, newResult: EvaluationResult, reason: string, overriddenBy: string): Observable<Submission> {
    // For now use mock - backend doesn't have this endpoint yet
    const submission = MOCK_SUBMISSIONS.find(s => s.id === submissionId);
    if (submission) {
      submission.result = newResult;
      submission.overridden = true;
      submission.overriddenBy = overriddenBy;
      submission.overrideReason = reason;
      submission.overriddenAt = new Date().toISOString();
      if (newResult === 'pass') {
        submission.score = 100;
      }
    }
    return of(submission!).pipe(delay(500));
  }

  private getMockSubmissions(filter: SubmissionFilter): Observable<PaginatedResponse<Submission>> {
    let filtered = [...MOCK_SUBMISSIONS];

    if (filter.studentId) {
      filtered = filtered.filter(s => s.studentId === filter.studentId);
    }
    if (filter.courseId) {
      filtered = filtered.filter(s => s.courseId === filter.courseId);
    }
    if (filter.assignmentId) {
      filtered = filtered.filter(s => s.assignmentId === filter.assignmentId);
    }
    if (filter.status) {
      filtered = filtered.filter(s => s.result === filter.status);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      filtered = filtered.filter(s =>
        s.assignmentTitle.toLowerCase().includes(q) ||
        s.studentName.toLowerCase().includes(q) ||
        s.courseName.toLowerCase().includes(q)
      );
    }

    const sortBy = filter.sortBy ?? 'submittedAt';
    const dir = filter.sortDirection ?? 'desc';
    filtered.sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[sortBy];
      const bVal = (b as unknown as Record<string, unknown>)[sortBy];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return dir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

    const total = filtered.length;
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 10;
    const start = (page - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize);

    return of({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }).pipe(delay(300));
  }

  private mockSubmitCode(assignmentId: string, studentId: string, code: string, language: string): Observable<{ status: SubmissionStatus; submission?: Submission }> {
    const stages: SubmissionStatus[] = [
      'queued', 'building', 'running_tests', 'static_analysis', 'db_verification', 'complete'
    ];
    const stageDelays = [1000, 1500, 2000, 1500, 1000, 500];

    const assignment = MOCK_ASSIGNMENTS.find(a => a.id === assignmentId);
    const existingSubmissions = MOCK_SUBMISSIONS.filter(
      s => s.assignmentId === assignmentId && s.studentId === studentId
    );
    const attempt = existingSubmissions.length + 1;

    let result: EvaluationResult = 'pass';
    let testsPassed = assignment?.totalTests ?? 10;
    const testsTotal = assignment?.totalTests ?? 10;
    const staticTotal = assignment?.totalStaticChecks ?? 5;
    let staticPassed = staticTotal;

    if (assignmentId === 'asg-004' || assignmentId === 'asg-006') {
      result = 'fail';
      testsPassed = Math.floor(testsTotal * 0.65);
      staticPassed = Math.floor(staticTotal * 0.7);
    } else if (assignmentId === 'asg-203') {
      result = 'flagged_for_review';
      testsPassed = Math.floor(testsTotal * 0.88);
      staticPassed = Math.floor(staticTotal * 0.66);
    }

    const subject = new Subject<{ status: SubmissionStatus; submission?: Submission }>();

    let totalDelay = 0;
    stages.forEach((stage, index) => {
      totalDelay += stageDelays[index];
      setTimeout(() => {
        if (stage === 'complete') {
          const newSubmission: Submission = {
            id: `sub-${Date.now()}`,
            assignmentId,
            assignmentTitle: assignment?.title ?? '',
            courseId: assignment?.courseId ?? '',
            courseName: assignment?.courseName ?? '',
            studentId,
            studentName: 'Alex Chen',
            studentEmail: 'student@apexeval.demo',
            attempt,
            language: language as Submission['language'],
            code,
            status: 'complete',
            result,
            submittedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            executionDurationMs: totalDelay,
            testsPassed,
            testsTotal,
            staticChecksPassed: staticPassed,
            staticChecksTotal: staticTotal,
            dbCheckPassed: result !== 'fail',
            score: Math.round((testsPassed / testsTotal) * 100),
          };
          MOCK_SUBMISSIONS.push(newSubmission);
          subject.next({ status: stage, submission: newSubmission });
          subject.complete();
        } else {
          subject.next({ status: stage });
        }
      }, totalDelay);
    });

    return subject.asObservable();
  }
}