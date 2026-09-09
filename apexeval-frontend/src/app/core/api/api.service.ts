/* ============================================================
   ApexEval — API Service
   ============================================================ */

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  Submission, TestResult, StaticFinding, DiffFile,
  PaginatedResponse, SubmissionFilter,
  Assignment
} from '../models';
import { API_ENDPOINTS } from './api.config';

export interface RunTestRequest {
  workspacePath: string;
  assignmentPath: string;
  assignmentId: string;
  lastTestedCommit?: string;
}

export interface PaginatedApiResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SubmitCodeRequest {
  studentId: string;
  assignmentId: string;
  code: string;
  language: string;
}

export interface SubmitCodeResponse {
  status: string;
  submission?: Submission;
}

export interface TestResultApiResponse {
  id: string;
  submissionId: string;
  testName: string;
  testSuite: string;
  status: string;
  durationMs: number;
  message?: string;
  expected?: string;
  actual?: string;
  output?: string;
  isHidden: boolean;
}

export interface FindingApiResponse {
  id: string;
  submissionId: string;
  ruleId: string;
  ruleName: string;
  severity: string;
  category: string;
  message: string;
  file: string;
  line: number;
  column: number;
  symbol?: string;
  evidence?: string;
}

export interface DiffFileApiResponse {
  fileName: string;
  language: string;
  additions: number;
  deletions: number;
  lines: DiffLineApiResponse[];
}

export interface DiffLineApiResponse {
  type: string;
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private readonly http: HttpClient) {}

  getAssignments(): Observable<Assignment[]> {
    return this.http.get<Assignment[]>(API_ENDPOINTS.assignments).pipe(
      map(assignments => assignments.map(a => this.normalizeAssignmentStatus(a)))
    );
  }

  getAssignmentById(id: string): Observable<Assignment | undefined> {
    return this.http.get<Assignment>(`${API_ENDPOINTS.assignments}/${id}`).pipe(
      map(a => this.normalizeAssignmentStatus(a))
    );
  }

  // Backend returns the assignment-manifest workflow status (e.g. "APPROVED"),
  // not the frontend's published/draft/closed lifecycle — derive it from publishedAt instead.
  private normalizeAssignmentStatus(a: Assignment): Assignment {
    return { ...a, status: a.publishedAt ? 'published' : 'draft' };
  }

  getSubmissions(filter: SubmissionFilter): Observable<PaginatedResponse<Submission>> {
    let params = new HttpParams()
      .set('page', (filter.page ?? 1).toString())
      .set('pageSize', (filter.pageSize ?? 10).toString());

    if (filter.studentId) params = params.set('studentId', filter.studentId);
    if (filter.assignmentId) params = params.set('assignmentId', filter.assignmentId);
    if (filter.courseId) params = params.set('courseId', filter.courseId);
    if (filter.status) params = params.set('status', filter.status);

    return this.http.get<PaginatedApiResponse<any>>(API_ENDPOINTS.submissions, { params })
      .pipe(map(response => this.mapPaginatedResponse(response)));
  }

  getSubmissionById(id: string): Observable<Submission | undefined> {
    return this.http.get<Submission>(`${API_ENDPOINTS.submissions}/${id}`);
  }

  getTestResults(submissionId: string): Observable<TestResult[]> {
    return this.http.get<TestResultApiResponse[]>(`${API_ENDPOINTS.submissions}/${submissionId}/test-results`)
      .pipe(map(results => results.map(this.mapTestResult)));
  }

  getFindings(submissionId: string): Observable<StaticFinding[]> {
    return this.http.get<FindingApiResponse[]>(`${API_ENDPOINTS.submissions}/${submissionId}/findings`)
      .pipe(map(findings => findings.map(this.mapFinding)));
  }

  getDiff(submissionId: string): Observable<DiffFile[]> {
    return this.http.get<DiffFileApiResponse[]>(`${API_ENDPOINTS.submissions}/${submissionId}/diff`)
      .pipe(map(diffs => diffs.map(this.mapDiffFile)));
  }

  submitCode(request: SubmitCodeRequest): Observable<SubmitCodeResponse> {
    return this.http.post<SubmitCodeResponse>(`${API_ENDPOINTS.submissions}/submit`, request);
  }

  rerunSubmission(submissionId: string): Observable<Submission> {
    return this.http.post<Submission>(`${API_ENDPOINTS.submissions}/${submissionId}/rerun`, {});
  }

  runTest(request: any): Observable<any> {
    return this.http.post(API_ENDPOINTS.runTest, request);
  }

  runTestWithWorkspace(request: RunTestRequest): Observable<any> {
    return this.http.post(API_ENDPOINTS.runTest, request);
  }

  staticCheck(request: any): Observable<any> {
    return this.http.post(API_ENDPOINTS.staticCheck, request);
  }

  getDiffLegacy(request: any): Observable<any> {
    return this.http.post(API_ENDPOINTS.diff, request);
  }

  execute(request: any): Observable<any> {
    return this.http.post(API_ENDPOINTS.execute, request);
  }

  private mapPaginatedResponse(response: PaginatedApiResponse<any>): PaginatedResponse<Submission> {
    return {
      data: response.data.map(this.mapSubmission),
      total: response.total,
      page: response.page,
      pageSize: response.pageSize,
      totalPages: response.totalPages,
    };
  }

  private mapSubmission = (api: any): Submission => ({
    id: api.id,
    assignmentId: api.assignmentId,
    assignmentTitle: api.assignmentTitle,
    courseId: api.courseId,
    courseName: api.courseName,
    studentId: api.studentId,
    studentName: api.studentName,
    studentEmail: api.studentEmail,
    attempt: api.attempt,
    language: api.language,
    code: api.code,
    status: api.status,
    result: api.result,
    submittedAt: api.submittedAt,
    completedAt: api.completedAt,
    executionDurationMs: api.executionDurationMs,
    testsPassed: api.testsPassed,
    testsTotal: api.testsTotal,
    staticChecksPassed: api.staticChecksPassed,
    staticChecksTotal: api.staticChecksTotal,
    dbCheckPassed: api.dbCheckPassed,
    score: api.score,
    overridden: api.overridden,
    overriddenBy: api.overriddenBy,
    overrideReason: api.overrideReason,
    overriddenAt: api.overriddenAt,
  });

  private mapTestResult = (api: TestResultApiResponse): TestResult => ({
    id: api.id,
    submissionId: api.submissionId,
    testName: api.testName,
    testSuite: api.testSuite,
    status: api.status as TestResult['status'],
    durationMs: api.durationMs,
    message: api.message,
    expected: api.expected,
    actual: api.actual,
    output: api.output,
    isHidden: api.isHidden,
  });

  private mapFinding = (api: FindingApiResponse): StaticFinding => ({
    id: api.id,
    submissionId: api.submissionId,
    ruleId: api.ruleId,
    ruleName: api.ruleName,
    severity: api.severity as StaticFinding['severity'],
    category: api.category as StaticFinding['category'],
    message: api.message,
    file: api.file,
    line: api.line,
    column: api.column,
    symbol: api.symbol,
    evidence: api.evidence,
  });

  private mapDiffFile = (api: DiffFileApiResponse): DiffFile => ({
    fileName: api.fileName,
    language: api.language,
    additions: api.additions,
    deletions: api.deletions,
    lines: api.lines.map(l => ({
      type: l.type as DiffFile['lines'][0]['type'],
      content: l.content,
      oldLineNumber: l.oldLineNumber,
      newLineNumber: l.newLineNumber,
    })),
  });
}