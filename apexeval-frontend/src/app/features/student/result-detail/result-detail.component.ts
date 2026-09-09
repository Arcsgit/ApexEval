/* ============================================================
   ApexEval — Result Detail Component
   ============================================================ */

import { Component, ChangeDetectionStrategy, OnInit, signal, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, UpperCasePipe } from '@angular/common';
import { SubmissionsService } from '../../../core/services/submissions.service';
import { Submission, TestResult, StaticFinding, DiffFile } from '../../../core/models';

import { LoaderComponent } from '../../../shared/components/loader/loader.component';

@Component({
  selector: 'app-result-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, UpperCasePipe, LoaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="result-detail">
      <nav class="breadcrumb">
        <a routerLink="/student/dashboard">Dashboard</a>
        <span class="material-symbols-outlined bc-sep">chevron_right</span>
        <a routerLink="/student/submissions">Submissions</a>
        <span class="material-symbols-outlined bc-sep">chevron_right</span>
        <span>Result</span>
      </nav>

      @if (submission(); as sub) {
        <!-- Result Hero -->
        <div class="result-hero" [attr.data-result]="sub.result">
          <div class="hero-content">
            <div class="result-icon-wrap">
              <span class="material-symbols-outlined result-icon">{{ getResultIcon(sub.result) }}</span>
            </div>
            <div class="hero-info">
              <h1 class="result-status">{{ getResultLabel(sub.result) }}</h1>
              <p class="result-message">{{ getResultMessage(sub.result) }}</p>
            </div>
          </div>
          <div class="hero-meta">
            <span>{{ sub.assignmentTitle }}</span>
            <span class="meta-sep">·</span>
            <span>Attempt {{ sub.attempt }}</span>
            <span class="meta-sep">·</span>
            <span>{{ sub.submittedAt | date:'MMM d, y, h:mm a' }}</span>
            @if (sub.executionDurationMs) {
              <span class="meta-sep">·</span>
              <span>{{ (sub.executionDurationMs / 1000).toFixed(2) }}s</span>
            }
          </div>
          @if (sub.overridden) {
            <div class="override-banner">
              <span class="material-symbols-outlined">gavel</span>
              <span>Grade overridden by {{ sub.overriddenBy }} — {{ sub.overrideReason }}</span>
            </div>
          }
        </div>

        <!-- Summary Metrics -->
        <div class="summary-row">
          <div class="metric">
            <span class="metric-label">Tests</span>
            <span class="metric-value" [class.fail-metric]="sub.testsPassed !== sub.testsTotal">
              {{ sub.testsPassed }} / {{ sub.testsTotal }}
            </span>
          </div>
          <div class="metric">
            <span class="metric-label">Static Checks</span>
            <span class="metric-value" [class.fail-metric]="sub.staticChecksPassed !== sub.staticChecksTotal">
              {{ sub.staticChecksPassed }} / {{ sub.staticChecksTotal }}
            </span>
          </div>
          <div class="metric">
            <span class="metric-label">DB Checks</span>
            <span class="metric-value" [class.fail-metric]="!sub.dbCheckPassed">
              {{ sub.dbCheckPassed ? 'Passed' : 'Failed' }}
            </span>
          </div>
          <div class="metric">
            <span class="metric-label">Score</span>
            <span class="metric-value">{{ sub.score }}%</span>
          </div>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button class="tab" [class.active]="activeTab() === 'tests'" (click)="activeTab.set('tests')">
            Tests
            @if (sub.testsPassed !== sub.testsTotal) {
              <span class="tab-badge fail">{{ (sub.testsTotal ?? 0) - (sub.testsPassed ?? 0) }}</span>
            }
          </button>
          <button class="tab" [class.active]="activeTab() === 'analysis'" (click)="activeTab.set('analysis')">
            Static Analysis
            @if (findings().length) {
              <span class="tab-badge">{{ findings().length }}</span>
            }
          </button>
          <button class="tab" [class.active]="activeTab() === 'diff'" (click)="activeTab.set('diff')">
            Diff
          </button>
        </div>

        <!-- Tab Content -->
        <div class="tab-content">
          @switch (activeTab()) {
            @case ('tests') {
              <div class="tests-section">
                @for (suite of testSuites(); track suite.name) {
                  <div class="test-suite">
                    <h3 class="suite-name">{{ suite.name }}</h3>
                    @for (test of suite.tests; track test.id) {
                      <div class="test-row" [class.failed]="test.status === 'fail'" [class.expanded]="expandedTest() === test.id" (click)="toggleTest(test)">
                        <div class="test-header">
                          <span class="material-symbols-outlined test-icon" [attr.data-status]="test.status">
                            {{ test.status === 'pass' ? 'check_circle' : test.status === 'fail' ? 'cancel' : 'help' }}
                          </span>
                          <span class="test-name">{{ test.testName }}</span>
                          @if (test.isHidden) {
                            <span class="hidden-badge">Hidden</span>
                          }
                          <span class="test-duration">{{ test.durationMs }}ms</span>
                        </div>
                        @if (expandedTest() === test.id && test.status === 'fail') {
                          <div class="test-details" (click)="$event.stopPropagation()">
                            @if (test.message) {
                              <div class="detail-row">
                                <span class="detail-key">Message</span>
                                <span class="detail-val">{{ test.message }}</span>
                              </div>
                            }
                            @if (test.expected) {
                              <div class="detail-row">
                                <span class="detail-key">Expected</span>
                                <code class="detail-code">{{ test.expected }}</code>
                              </div>
                            }
                            @if (test.actual) {
                              <div class="detail-row">
                                <span class="detail-key">Actual</span>
                                <code class="detail-code actual">{{ test.actual }}</code>
                              </div>
                            }
                            @if (test.output) {
                              <div class="detail-row">
                                <span class="detail-key">Output</span>
                                <span class="detail-val">{{ test.output }}</span>
                              </div>
                            }
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            }

            @case ('analysis') {
              @if (sub.result === 'flagged_for_review') {
                <div class="flagged-banner">
                  <span class="material-symbols-outlined">flag</span>
                  <div>
                    <strong>Your submission has been flagged for instructor review.</strong>
                    <p>The findings below contributed to the flag. An instructor will review your submission.</p>
                  </div>
                </div>
              }
              <div class="findings-section">
                @for (category of ['required', 'suspicious']; track category) {
                  @if (findingsByCategory(category).length) {
                    <div class="findings-group">
                      <h3 class="findings-category">{{ category === 'required' ? 'Required' : 'Suspicious' }}</h3>
                      @for (finding of findingsByCategory(category); track finding.id) {
                        <div class="finding-row">
                          <div class="finding-severity" [attr.data-severity]="finding.severity">
                            {{ finding.severity | uppercase }}
                          </div>
                          <div class="finding-content">
                            <span class="finding-rule">{{ finding.ruleName }}</span>
                            <p class="finding-message">{{ finding.message }}</p>
                            <div class="finding-location">
                              <span class="material-symbols-outlined">code</span>
                              <span>{{ finding.file }}:{{ finding.line }}:{{ finding.column }}</span>
                              @if (finding.symbol) {
                                <span class="finding-symbol">{{ finding.symbol }}</span>
                              }
                            </div>
                            @if (finding.evidence) {
                              <code class="finding-evidence">{{ finding.evidence }}</code>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  }
                }
                @if (!findings().length) {
                  <div class="empty-tab">
                    <span class="material-symbols-outlined">verified</span>
                    <p>No static analysis findings</p>
                  </div>
                }
              </div>
            }

            @case ('diff') {
              @if (diffs().length) {
                @for (file of diffs(); track file.fileName) {
                  <div class="diff-file">
                    <div class="diff-file-header">
                      <span class="diff-filename">{{ file.fileName }}</span>
                      <span class="diff-stats">
                        <span class="additions">+{{ file.additions }}</span>
                        <span class="deletions">-{{ file.deletions }}</span>
                      </span>
                    </div>
                    <div class="diff-content">
                      @for (line of file.lines; track $index) {
                        <div class="diff-line" [attr.data-type]="line.type">
                          <span class="line-num old">{{ line.oldLineNumber ?? '' }}</span>
                          <span class="line-num new">{{ line.newLineNumber ?? '' }}</span>
                          <span class="line-prefix">{{ line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ' }}</span>
                          <span class="line-content">{{ line.content }}</span>
                        </div>
                      }
                    </div>
                  </div>
                }
              } @else {
                <div class="empty-tab">
                  <span class="material-symbols-outlined">difference</span>
                  <p>No diff available for this submission</p>
                </div>
              }
            }
          }
        </div>

        <!-- Actions -->
        <div class="result-actions">
          <a [routerLink]="['/student/courses', sub.courseId, 'assignments', sub.assignmentId]" class="action-btn primary">
            <span class="material-symbols-outlined">edit</span>
            {{ sub.result === 'pass' ? 'View Assignment' : 'Try Again' }}
          </a>
          <a routerLink="/student/submissions" class="action-btn secondary">
            View All Submissions
          </a>
        </div>
      } @else {
        <app-loader text="Loading submission details..."></app-loader>
      }
    </div>
  `,
  styles: [`
    .result-detail { max-width: var(--content-max-width); }
    .breadcrumb {
      display: flex; align-items: center; gap: var(--space-1);
      font-size: var(--text-sm); color: var(--text-tertiary); margin-bottom: var(--space-6);
    }
    .breadcrumb a { color: var(--text-secondary); }
    .breadcrumb a:hover { color: var(--color-orange); }
    .bc-sep { font-size: 16px; }

    /* Hero */
    .result-hero {
      padding: var(--space-6);
      border-radius: var(--radius-lg);
      margin-bottom: var(--space-5);
      border: 1px solid var(--border-primary);
    }
    .result-hero[data-result="pass"] { border-left: 4px solid var(--color-pass); background: var(--color-pass-bg); }
    .result-hero[data-result="fail"] { border-left: 4px solid var(--color-fail); background: var(--color-fail-bg); }
    .result-hero[data-result="flagged_for_review"] { border-left: 4px solid var(--color-flagged); background: var(--color-flagged-bg); }
    .result-hero[data-result="running"] { border-left: 4px solid var(--color-running); }
    .hero-content { display: flex; align-items: center; gap: var(--space-4); margin-bottom: var(--space-3); }
    .result-icon-wrap { flex-shrink: 0; }
    .result-icon { font-size: 36px; }
    .result-hero[data-result="pass"] .result-icon { color: var(--color-pass); }
    .result-hero[data-result="fail"] .result-icon { color: var(--color-fail); }
    .result-hero[data-result="flagged_for_review"] .result-icon { color: var(--color-flagged); }
    .result-status { font-size: var(--text-2xl); font-weight: var(--weight-bold); }
    .result-message { font-size: var(--text-base); color: var(--text-secondary); margin-top: var(--space-1); }
    .hero-meta {
      display: flex; align-items: center; gap: var(--space-2);
      font-size: var(--text-sm); color: var(--text-secondary); flex-wrap: wrap;
    }
    .meta-sep { color: var(--border-primary); }
    .override-banner {
      display: flex; align-items: center; gap: var(--space-2);
      margin-top: var(--space-3); padding: var(--space-2) var(--space-3);
      background: var(--color-overridden-bg); border-radius: var(--radius-md);
      font-size: var(--text-sm); color: var(--color-overridden);
    }
    .override-banner .material-symbols-outlined { font-size: 16px; }

    /* Summary */
    .summary-row {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-4);
      margin-bottom: var(--space-5);
    }
    .metric {
      padding: var(--space-4);
      border: 1px solid var(--border-primary); border-radius: var(--radius-lg);
      display: flex; flex-direction: column; gap: var(--space-1);
    }
    .metric-label { font-size: var(--text-xs); color: var(--text-tertiary); font-weight: var(--weight-medium); text-transform: uppercase; letter-spacing: 0.04em; }
    .metric-value { font-size: var(--text-xl); font-weight: var(--weight-bold); font-family: var(--font-mono); }
    .fail-metric { color: var(--color-fail); }

    /* Tabs */
    .tabs {
      display: flex; gap: 0; border-bottom: 1px solid var(--border-primary);
      margin-bottom: var(--space-5);
    }
    .tab {
      padding: var(--space-3) var(--space-4);
      font-size: var(--text-sm); font-weight: var(--weight-medium);
      color: var(--text-secondary); border-bottom: 2px solid transparent;
      transition: all var(--transition-fast);
      display: flex; align-items: center; gap: var(--space-2);
    }
    .tab:hover { color: var(--text-primary); }
    .tab.active { color: var(--color-orange); border-bottom-color: var(--color-orange); }
    .tab-badge {
      font-size: 10px; font-weight: var(--weight-semibold);
      padding: 1px 6px; border-radius: var(--radius-full);
      background: var(--color-gray-150); color: var(--text-secondary);
    }
    .tab-badge.fail { background: var(--color-fail-bg); color: var(--color-fail); }

    /* Tests */
    .test-suite { margin-bottom: var(--space-5); }
    .suite-name { font-size: var(--text-sm); font-weight: var(--weight-semibold); margin-bottom: var(--space-2); color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.04em; }
    .test-row {
      border: 1px solid var(--border-secondary);
      border-radius: var(--radius-md);
      margin-bottom: var(--space-1);
      cursor: pointer;
      transition: background var(--transition-fast);
    }
    .test-row:hover { background: var(--surface-secondary); }
    .test-row.failed { border-color: var(--color-fail-border); }
    .test-header {
      display: flex; align-items: center; gap: var(--space-3);
      padding: var(--space-2) var(--space-3);
    }
    .test-icon { font-size: 18px; }
    .test-icon[data-status="pass"] { color: var(--color-pass); }
    .test-icon[data-status="fail"] { color: var(--color-fail); }
    .test-icon[data-status="skip"] { color: var(--text-disabled); }
    .test-name { flex: 1; font-size: var(--text-sm); font-weight: var(--weight-medium); }
    .hidden-badge { font-size: 10px; padding: 1px 6px; background: var(--color-gray-100); border-radius: var(--radius-sm); color: var(--text-tertiary); }
    .test-duration { font-size: var(--text-xs); color: var(--text-tertiary); font-family: var(--font-mono); }

    .test-details {
      padding: var(--space-3) var(--space-4);
      margin: 0 var(--space-3) var(--space-3);
      background: var(--surface-secondary);
      border-radius: var(--radius-md);
      display: flex; flex-direction: column; gap: var(--space-2);
      animation: fadeInDown var(--transition-fast) ease;
    }
    .detail-row { display: flex; flex-direction: column; gap: 2px; }
    .detail-key { font-size: var(--text-xs); font-weight: var(--weight-semibold); color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.04em; }
    .detail-val { font-size: var(--text-sm); color: var(--text-primary); }
    .detail-code {
      font-family: var(--font-mono); font-size: var(--text-sm);
      padding: var(--space-1) var(--space-2); background: var(--surface-primary);
      border-radius: var(--radius-sm); border: 1px solid var(--border-secondary); color: var(--color-pass);
    }
    .detail-code.actual { color: var(--color-fail); }

    /* Findings */
    .flagged-banner {
      display: flex; align-items: flex-start; gap: var(--space-3);
      padding: var(--space-4); margin-bottom: var(--space-5);
      background: var(--color-flagged-bg); border: 1px solid var(--color-flagged-border);
      border-radius: var(--radius-md); font-size: var(--text-sm);
    }
    .flagged-banner .material-symbols-outlined { color: var(--color-flagged); font-size: 20px; margin-top: 2px; }
    .flagged-banner p { color: var(--text-secondary); margin-top: var(--space-1); }

    .findings-category { font-size: var(--text-sm); font-weight: var(--weight-semibold); margin-bottom: var(--space-3); text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-secondary); }
    .findings-group { margin-bottom: var(--space-5); }
    .finding-row {
      display: flex; gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      border: 1px solid var(--border-secondary); border-radius: var(--radius-md);
      margin-bottom: var(--space-2);
    }
    .finding-severity {
      flex-shrink: 0; font-size: 10px; font-weight: var(--weight-bold);
      padding: 2px 6px; border-radius: var(--radius-sm); height: fit-content;
    }
    .finding-severity[data-severity="critical"] { color: white; background: var(--color-fail); }
    .finding-severity[data-severity="high"] { color: var(--color-fail); background: var(--color-fail-bg); }
    .finding-severity[data-severity="medium"] { color: var(--color-flagged); background: var(--color-flagged-bg); }
    .finding-severity[data-severity="low"] { color: var(--text-secondary); background: var(--color-gray-100); }
    .finding-severity[data-severity="info"] { color: var(--color-running); background: var(--color-running-bg); }
    .finding-content { flex: 1; min-width: 0; }
    .finding-rule { font-size: var(--text-sm); font-weight: var(--weight-semibold); }
    .finding-message { font-size: var(--text-sm); color: var(--text-secondary); margin-top: 2px; }
    .finding-location {
      display: flex; align-items: center; gap: var(--space-1);
      font-size: var(--text-xs); color: var(--text-tertiary); font-family: var(--font-mono);
      margin-top: var(--space-2);
    }
    .finding-location .material-symbols-outlined { font-size: 14px; }
    .finding-symbol { padding: 0 4px; background: var(--surface-secondary); border-radius: var(--radius-sm); }
    .finding-evidence {
      display: block; margin-top: var(--space-2); padding: var(--space-2);
      font-family: var(--font-mono); font-size: var(--text-xs);
      background: var(--surface-secondary); border-radius: var(--radius-sm);
      color: var(--text-secondary);
    }

    /* Diff */
    .diff-file { border: 1px solid var(--border-primary); border-radius: var(--radius-md); margin-bottom: var(--space-4); overflow: hidden; }
    .diff-file-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: var(--space-2) var(--space-3);
      background: var(--surface-secondary); font-size: var(--text-sm); font-family: var(--font-mono);
    }
    .diff-stats { display: flex; gap: var(--space-2); font-size: var(--text-xs); }
    .additions { color: var(--color-pass); }
    .deletions { color: var(--color-fail); }
    .diff-content { font-family: var(--font-mono); font-size: 12px; line-height: 1.6; overflow-x: auto; }
    .diff-line { display: flex; min-height: 20px; }
    .diff-line[data-type="added"] { background: rgba(22, 163, 74, 0.08); }
    .diff-line[data-type="removed"] { background: rgba(220, 38, 38, 0.08); }
    .line-num { width: 40px; text-align: right; padding: 0 var(--space-2); color: var(--text-disabled); user-select: none; flex-shrink: 0; }
    .line-prefix { width: 20px; text-align: center; user-select: none; flex-shrink: 0; }
    .diff-line[data-type="added"] .line-prefix { color: var(--color-pass); }
    .diff-line[data-type="removed"] .line-prefix { color: var(--color-fail); }
    .line-content { flex: 1; padding-right: var(--space-3); white-space: pre; }

    /* Empty */
    .empty-tab {
      display: flex; flex-direction: column; align-items: center; gap: var(--space-2);
      padding: var(--space-10); color: var(--text-tertiary); text-align: center;
    }
    .empty-tab .material-symbols-outlined { font-size: 40px; }

    /* Actions */
    .result-actions {
      display: flex; gap: var(--space-3); margin-top: var(--space-6);
      padding-top: var(--space-5); border-top: 1px solid var(--border-primary);
    }
    .action-btn {
      display: flex; align-items: center; gap: var(--space-2);
      padding: var(--space-2) var(--space-5); border-radius: var(--radius-md);
      font-size: var(--text-sm); font-weight: var(--weight-medium); transition: all var(--transition-fast);
    }
    .action-btn .material-symbols-outlined { font-size: 18px; }
    .action-btn.primary { background: var(--color-orange); color: white; }
    .action-btn.primary:hover { background: var(--color-orange-hover); }
    .action-btn.secondary { border: 1px solid var(--border-primary); color: var(--text-secondary); }
    .action-btn.secondary:hover { background: var(--surface-secondary); }

    .loading-state { padding: var(--space-4); }

    @media (max-width: 767px) {
      .summary-row { grid-template-columns: repeat(2, 1fr); }
      .hero-meta { flex-direction: column; gap: var(--space-1); }
      .meta-sep { display: none; }
    }
  `]
})
export class ResultDetailComponent implements OnInit {
  submissionId = input<string>('', { alias: 'submissionId' });

  readonly submission = signal<Submission | undefined>(undefined);
  readonly tests = signal<TestResult[]>([]);
  readonly findings = signal<StaticFinding[]>([]);
  readonly diffs = signal<DiffFile[]>([]);
  readonly activeTab = signal<'tests' | 'analysis' | 'diff'>('tests');
  readonly expandedTest = signal<string | null>(null);

  constructor(private readonly submissionsService: SubmissionsService) {}

  ngOnInit(): void {
    const id = this.submissionId();
    this.submissionsService.getSubmissionById(id).subscribe(s => {
      this.submission.set(s);
      if (s?.result === 'flagged_for_review') {
        this.activeTab.set('analysis');
      }
    });
    this.submissionsService.getTestResults(id).subscribe(t => this.tests.set(t));
    this.submissionsService.getFindings(id).subscribe(f => this.findings.set(f));
    this.submissionsService.getDiff(id).subscribe(d => this.diffs.set(d));
  }

  testSuites(): { name: string; tests: TestResult[] }[] {
    const map = new Map<string, TestResult[]>();
    // Show failed tests first
    const sorted = [...this.tests()].sort((a, b) => {
      if (a.status === 'fail' && b.status !== 'fail') return -1;
      if (a.status !== 'fail' && b.status === 'fail') return 1;
      return 0;
    });
    sorted.forEach(t => {
      const list = map.get(t.testSuite) ?? [];
      list.push(t);
      map.set(t.testSuite, list);
    });
    return Array.from(map.entries()).map(([name, tests]) => ({ name, tests }));
  }

  findingsByCategory(category: string): StaticFinding[] {
    return this.findings().filter(f => f.category === category);
  }

  toggleTest(test: TestResult): void {
    if (test.status !== 'fail') return;
    this.expandedTest.update(v => v === test.id ? null : test.id);
  }

  getResultIcon(result?: string): string {
    switch (result) {
      case 'pass': return 'check_circle';
      case 'fail': return 'cancel';
      case 'flagged_for_review': return 'flag';
      default: return 'pending';
    }
  }

  getResultLabel(result?: string): string {
    switch (result) {
      case 'pass': return 'Passed';
      case 'fail': return 'Failed';
      case 'flagged_for_review': return 'Flagged for Review';
      default: return 'Processing';
    }
  }

  getResultMessage(result?: string): string {
    switch (result) {
      case 'pass': return 'Your submission passed all requirements successfully.';
      case 'fail': return 'Your submission did not pass all tests. Review the details below.';
      case 'flagged_for_review': return 'Your submission requires instructor review.';
      default: return 'Your submission is being evaluated.';
    }
  }
}
