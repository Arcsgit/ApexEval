/* ============================================================
   ApexEval — Assignment Workspace Component
   VS Code Server Integration + Floating Question Overlay
   ============================================================ */

import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, signal, input, HostListener, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { CoursesService } from '../../../core/services/courses.service';
import { SubmissionsService } from '../../../core/services/submissions.service';
import { Assignment, SubmissionStatus } from '../../../core/models';

@Component({
  selector: 'app-assignment-workspace',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="workspace">

      <!-- Layer 1: VS Code Server (full-screen iframe) -->
      <iframe
        [src]="vscodeUrl"
        class="vscode-frame"
        title="VS Code Server"
        allow="clipboard-read; clipboard-write">
      </iframe>

      <!-- Layer 2: Floating Assignment Pill -->
      @if (!overlayOpen() && assignment()) {
        <button class="assignment-pill" (click)="openOverlay()">
          <span class="pill-glyph">✦</span>
          <span class="pill-label">Assignment</span>
        </button>
      }

      <!-- Layer 3: Assignment Question Overlay -->
      @if (overlayOpen() && assignment(); as a) {
        <div class="overlay-backdrop" (click)="closeOverlay()"></div>
        <div class="overlay-panel" (click)="$event.stopPropagation()">
          <!-- Header -->
          <div class="overlay-header">
            <div class="overlay-title-group">
              <h1 class="overlay-title">{{ a.title }}</h1>
              <span class="difficulty-badge" [attr.data-diff]="a.difficulty">{{ a.difficulty }}</span>
            </div>
            <button class="overlay-close" (click)="closeOverlay()" title="Close (Esc)">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <!-- Scrollable Content -->
          <div class="overlay-body">
            <section class="q-section">
              <h3 class="q-heading">Description</h3>
              <p class="q-text">{{ a.description }}</p>
            </section>

            <section class="q-section">
              <h3 class="q-heading">Requirements</h3>
              <ul class="q-list">
                @for (req of a.requirements; track $index) {
                  <li>{{ req }}</li>
                }
              </ul>
            </section>

            @if (a.constraints.length) {
              <section class="q-section">
                <h3 class="q-heading">Constraints</h3>
                <ul class="q-list">
                  @for (c of a.constraints; track $index) {
                    <li>{{ c }}</li>
                  }
                </ul>
              </section>
            }

            <section class="q-section">
              <h3 class="q-heading">Details</h3>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">Languages</span>
                  <span class="detail-value">{{ a.allowedLanguages.join(', ').toUpperCase() }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Runtime Limit</span>
                  <span class="detail-value">{{ a.runtimeLimitMs / 1000 }}s</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Memory Limit</span>
                  <span class="detail-value">{{ a.memoryLimitMb }} MB</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Max Attempts</span>
                  <span class="detail-value">{{ a.maxAttempts }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Tests</span>
                  <span class="detail-value">{{ a.totalTests }} visible + {{ a.totalHiddenTests }} hidden</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Due Date</span>
                  <span class="detail-value">{{ formatDate(a.dueDate) }}</span>
                </div>
              </div>
            </section>
          </div>

          <!-- Footer -->
          <div class="overlay-footer">
            <span class="footer-course">{{ a.courseName }} · Week {{ a.week }}</span>
            <div class="footer-actions">
              <button class="run-btn" (click)="runCode()" [disabled]="runningCode()">
                <span class="material-symbols-outlined">play_arrow</span>
                {{ runningCode() ? 'Running...' : 'Run Code' }}
              </button>
              <button class="close-btn" (click)="closeOverlay()">Close</button>
            </div>
          </div>
        </div>
      }

      <!-- Layer 4: Submission Progress Overlay (preserved) -->
      @if (submissionInProgress()) {
        <div class="submission-overlay">
          <div class="submission-progress-card">
            <h2 class="progress-title">Evaluating your submission</h2>
            <p class="progress-subtitle">{{ assignment()?.title }}</p>
            <div class="pipeline-stages">
              @for (stage of pipelineStages; track stage.key) {
                <div class="stage" [attr.data-state]="getStageState(stage.key)">
                  <div class="stage-indicator">
                    @switch (getStageState(stage.key)) {
                      @case ('complete') {
                        <span class="material-symbols-outlined stage-icon done">check_circle</span>
                      }
                      @case ('running') {
                        <span class="stage-spinner"></span>
                      }
                      @case ('failed') {
                        <span class="material-symbols-outlined stage-icon failed">cancel</span>
                      }
                      @default {
                        <span class="material-symbols-outlined stage-icon pending">radio_button_unchecked</span>
                      }
                    }
                  </div>
                  <span class="stage-label">{{ stage.label }}</span>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    /* ── Workspace Container ── */
    .workspace {
      position: fixed;
      inset: 0;
      top: var(--header-height, 72px);
      z-index: 0;
    }

    /* ── VS Code Server iframe ── */
    .vscode-frame {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      border: none;
      background: #1e1e1e;
    }

    /* ══════════════════════════════════════════════
       Floating Assignment Pill
       ══════════════════════════════════════════════ */
    .assignment-pill {
      position: fixed;
      bottom: 28px;
      right: 32px;
      z-index: 100;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 22px;
      background: var(--color-white);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-full);
      box-shadow:
        0 2px 8px rgba(0, 0, 0, 0.08),
        0 8px 32px rgba(0, 0, 0, 0.06);
      cursor: pointer;
      transition: all 200ms cubic-bezier(0.2, 0, 0, 1);
      animation: pill-enter 400ms cubic-bezier(0.2, 0, 0, 1) both;
    }

    .assignment-pill:hover {
      transform: translateY(-2px) scale(1.03);
      box-shadow:
        0 4px 16px rgba(255, 109, 31, 0.12),
        0 12px 40px rgba(0, 0, 0, 0.1);
      border-color: var(--color-orange);
    }
    .assignment-pill:active {
      transform: translateY(0) scale(0.98);
    }

    .pill-glyph {
      font-size: 16px;
      color: var(--color-orange);
      transition: transform 200ms ease;
    }
    .assignment-pill:hover .pill-glyph {
      transform: rotate(20deg) scale(1.15);
    }

    .pill-label {
      font-family: var(--font-header);
      font-size: 14px;
      font-weight: 800;
      color: var(--color-dark);
      letter-spacing: -0.01em;
    }

    @keyframes pill-enter {
      from {
        opacity: 0;
        transform: translateY(16px) scale(0.9);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    /* ══════════════════════════════════════════════
       Overlay Backdrop
       ══════════════════════════════════════════════ */
    .overlay-backdrop {
      position: fixed;
      inset: 0;
      z-index: 500;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      animation: backdrop-in 250ms ease both;
    }

    @keyframes backdrop-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* ══════════════════════════════════════════════
       Overlay Panel (Assignment Question)
       ══════════════════════════════════════════════ */
    .overlay-panel {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 510;
      width: 640px;
      max-width: calc(100vw - 48px);
      max-height: 80vh;
      background: var(--surface-primary);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-2xl);
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: panel-in 300ms cubic-bezier(0.2, 0, 0, 1) both;
    }

    @keyframes panel-in {
      from {
        opacity: 0;
        transform: translate(-50%, -48%) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
    }

    /* ── Overlay Header ── */
    .overlay-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-4);
      padding: var(--space-6) var(--space-6) var(--space-4);
      border-bottom: 1px solid var(--border-secondary);
      flex-shrink: 0;
    }

    .overlay-title-group {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      flex-wrap: wrap;
    }

    .overlay-title {
      font-family: var(--font-header);
      font-size: var(--text-2xl);
      font-weight: 800;
      color: var(--text-primary);
      letter-spacing: -0.02em;
      margin: 0;
    }

    .difficulty-badge {
      font-family: var(--font-label);
      font-size: 10px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: var(--radius-full);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .difficulty-badge[data-diff="easy"] { color: var(--color-pass); background: var(--color-pass-bg); }
    .difficulty-badge[data-diff="medium"] { color: var(--color-flagged); background: var(--color-flagged-bg); }
    .difficulty-badge[data-diff="hard"] { color: var(--color-fail); background: var(--color-fail-bg); }

    .overlay-close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: var(--radius-md);
      border: none;
      background: transparent;
      color: var(--text-tertiary);
      cursor: pointer;
      transition: all var(--transition-fast);
      flex-shrink: 0;
    }
    .overlay-close:hover {
      background: var(--surface-secondary);
      color: var(--text-primary);
    }
    .overlay-close .material-symbols-outlined { font-size: 20px; }

    /* ── Overlay Body (scrollable) ── */
    .overlay-body {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-5) var(--space-6);
    }

    .q-section {
      margin-bottom: var(--space-6);
    }
    .q-section:last-child {
      margin-bottom: 0;
    }

    .q-heading {
      font-family: var(--font-label);
      font-size: var(--text-xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-tertiary);
      margin-bottom: var(--space-3);
    }

    .q-text {
      font-size: var(--text-base);
      line-height: var(--leading-relaxed);
      color: var(--text-secondary);
    }

    .q-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      padding: 0;
      margin: 0;
    }
    .q-list li {
      font-size: var(--text-sm);
      line-height: var(--leading-normal);
      color: var(--text-secondary);
      padding-left: var(--space-4);
      position: relative;
    }
    .q-list li::before {
      content: '';
      position: absolute;
      left: 0;
      top: 8px;
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--color-orange);
    }

    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-3);
    }
    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .detail-label {
      font-family: var(--font-label);
      font-size: var(--text-xs);
      font-weight: 700;
      color: var(--text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .detail-value {
      font-size: var(--text-sm);
      color: var(--text-primary);
      font-weight: var(--weight-medium);
    }

    /* ── Overlay Footer ── */
    .overlay-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-4) var(--space-6);
      border-top: 1px solid var(--border-secondary);
      flex-shrink: 0;
    }

    .footer-course {
      font-size: var(--text-xs);
      color: var(--text-tertiary);
    }

    .footer-actions {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    .run-btn {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-5);
      background: var(--color-orange);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      cursor: pointer;
      transition: all var(--transition-fast);
    }
    .run-btn:hover:not(:disabled) {
      background: var(--color-orange-hover);
    }
    .run-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .run-btn .material-symbols-outlined { font-size: 18px; }

    .close-btn {
      padding: var(--space-2) var(--space-5);
      background: var(--surface-secondary);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-md);
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--text-primary);
      cursor: pointer;
      transition: all var(--transition-fast);
    }
    .close-btn:hover {
      background: var(--border-primary);
    }

    /* ══════════════════════════════════════════════
       Submission Progress Overlay (preserved)
       ══════════════════════════════════════════════ */
    .submission-overlay {
      position: fixed;
      inset: 0;
      background: var(--surface-overlay);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 600;
      animation: backdrop-in 150ms ease;
    }
    .submission-progress-card {
      background: var(--surface-elevated);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-xl);
      padding: var(--space-8);
      width: 420px;
      max-width: 90vw;
      animation: panel-in 200ms ease;
    }
    .progress-title {
      font-family: var(--font-header);
      font-size: var(--text-xl);
      font-weight: 800;
      margin-bottom: var(--space-1);
    }
    .progress-subtitle {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      margin-bottom: var(--space-6);
    }

    .pipeline-stages {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }
    .stage {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }
    .stage-indicator {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .stage-icon { font-size: 22px; }
    .stage-icon.done { color: var(--color-pass); }
    .stage-icon.failed { color: var(--color-fail); }
    .stage-icon.pending { color: var(--color-gray-300); }
    .stage-spinner {
      width: 18px;
      height: 18px;
      border: 2px solid var(--color-gray-200);
      border-top-color: var(--color-orange);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .stage-label {
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
    }
    .stage[data-state="complete"] .stage-label { color: var(--color-pass); }
    .stage[data-state="running"] .stage-label { color: var(--text-primary); font-weight: var(--weight-semibold); }
    .stage[data-state="pending"] .stage-label { color: var(--text-tertiary); }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* ── Responsive ── */
    @media (max-width: 767px) {
      .overlay-panel {
        width: calc(100vw - 24px);
        max-height: 90vh;
      }
      .assignment-pill {
        bottom: 16px;
        right: 16px;
        padding: 10px 18px;
      }
      .detail-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class AssignmentWorkspaceComponent implements OnInit, OnDestroy {
  courseId = input<string>('', { alias: 'courseId' });
  assignmentId = input<string>('', { alias: 'assignmentId' });

  readonly assignment = signal<Assignment | undefined>(undefined);
  readonly overlayOpen = signal(false);
  readonly submissionInProgress = signal(false);
  readonly currentStage = signal<SubmissionStatus>('queued');
  readonly runningCode = signal(false);

  vscodeUrl: SafeResourceUrl;

  readonly pipelineStages = [
    { key: 'queued' as const, label: 'Queued' },
    { key: 'building' as const, label: 'Building' },
    { key: 'running_tests' as const, label: 'Running Tests' },
    { key: 'static_analysis' as const, label: 'Static Analysis' },
    { key: 'db_verification' as const, label: 'Database Verification' },
    { key: 'complete' as const, label: 'Complete' },
  ];

  private readonly stageOrder: SubmissionStatus[] = [
    'queued', 'building', 'running_tests', 'static_analysis', 'db_verification', 'complete'
  ];

  constructor(
    private readonly auth: AuthService,
    private readonly coursesService: CoursesService,
    private readonly submissionsService: SubmissionsService,
    private readonly sanitizer: DomSanitizer,
    private readonly router: Router
  ) {
    // VS Code Server (code-server) runs in a per-student Docker container;
    // docker-compose maps student-1/2/3 to host ports 8443/8444/8445.
    const codeServerPorts: Record<string, number> = {
      'student-1': 8443,
      'student-2': 8444,
      'student-3': 8445,
    };
    const studentId = this.auth.currentUser()?.id ?? '';
    const port = codeServerPorts[studentId] ?? 8443;
    this.vscodeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`http://localhost:${port}`);
  }

  ngOnInit(): void {
    this.coursesService.getAssignmentById(this.assignmentId()).subscribe(a => {
      if (a) {
        this.coursesService.getCourseById(a.courseId).subscribe(c => {
          if (c && c.weeks) {
            const week = c.weeks.find(w => w.number === a.week);
            if (week && week.status === 'locked') {
              window.location.href = `/student/courses/${c.id}`;
              return;
            }
          }
          this.assignment.set(a);
        });
      }
    });
  }

  ngOnDestroy(): void {}

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.overlayOpen()) {
      this.closeOverlay();
    }
  }

  openOverlay(): void {
    this.overlayOpen.set(true);
  }

  closeOverlay(): void {
    this.overlayOpen.set(false);
  }

  getStageState(stageKey: SubmissionStatus): 'complete' | 'running' | 'pending' | 'failed' {
    const currentIndex = this.stageOrder.indexOf(this.currentStage());
    const stageIndex = this.stageOrder.indexOf(stageKey);
    if (stageIndex < currentIndex) return 'complete';
    if (stageIndex === currentIndex) return 'running';
    return 'pending';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  }

  runCode(): void {
    const a = this.assignment();
    const user = this.auth.currentUser();
    if (!a || !user?.workspacePath) {
      console.error('Missing assignment or workspace path');
      return;
    }

    // Use assignmentPath from API response if available, otherwise fall back to constructed path
    const assignmentPath = (a as any).assignmentPath || 
      a.courseName.toLowerCase().replace(/\s+/g, '-') + '-' + a.title.toLowerCase().replace(/\s+/g, '-');

    this.runningCode.set(true);
    this.submissionsService.runTestWithWorkspace(
      user.workspacePath,
      assignmentPath,
      a.id,
      user.id
    ).subscribe({
      next: (result) => {
        console.log('Run test result:', result);
        this.runningCode.set(false);
        // Navigate to result detail page
        if (result?.submissionId) {
          this.router.navigate(['/student/submissions', result.submissionId]);
        }
      },
      error: (err) => {
        console.error('Run test failed:', err);
        this.runningCode.set(false);
      }
    });
  }
}
