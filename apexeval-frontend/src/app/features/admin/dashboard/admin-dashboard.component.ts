import { Component, ChangeDetectionStrategy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../../core/auth/auth.service';
import { CoursesService } from '../../../core/services/courses.service';
import { SubmissionsService } from '../../../core/services/submissions.service';
import { Course, Submission } from '../../../core/models';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dashboard">
      <header class="dash-header">
        <h1>Dashboard</h1>
        <p class="dash-sub">Welcome back, {{ auth.currentUser()?.firstName }}. Here's your overview.</p>
      </header>

      <div class="stats-row">
        <div class="stat-card"><div class="stat-value">{{ courses().length }}</div><div class="stat-label">Active Courses</div></div>
        <div class="stat-card"><div class="stat-value">{{ totalStudents() }}</div><div class="stat-label">Total Students</div></div>
        <div class="stat-card"><div class="stat-value">{{ totalAssignments() }}</div><div class="stat-label">Assignments</div></div>
        <div class="stat-card"><div class="stat-value">{{ flaggedCount() }}</div><div class="stat-label">Flagged Submissions</div></div>
      </div>

      <div class="dash-grid">
        <section class="section">
          <div class="section-header">
            <h2 class="section-title">Needs Attention</h2>
          </div>
          <div class="attention-list">
            @for (sub of flaggedSubmissions(); track sub.id) {
              <div class="attention-item">
                <span class="material-symbols-outlined attention-icon">flag</span>
                <div class="attention-info">
                  <span class="attention-title">{{ sub.studentName }} — {{ sub.assignmentTitle }}</span>
                  <span class="attention-meta">Flagged · {{ sub.submittedAt | date:'MMM d, h:mm a' }}</span>
                </div>
                <a [routerLink]="['/admin/submissions']" class="attention-action">Review</a>
              </div>
            } @empty {
              <p class="empty-text">No flagged submissions requiring attention.</p>
            }
          </div>
        </section>

        <section class="section">
          <div class="section-header">
            <h2 class="section-title">Recent Submissions</h2>
            <a routerLink="/admin/submissions" class="view-all">View all</a>
          </div>
          <div class="submissions-list">
            @for (sub of recentSubmissions(); track sub.id) {
              <div class="submission-item">
                <div class="sub-info">
                  <span class="sub-student">{{ sub.studentName }}</span>
                  <span class="sub-assignment">{{ sub.assignmentTitle }}</span>
                </div>
                <span class="status-badge" [attr.data-result]="sub.result">{{ formatResult(sub.result) }}</span>
              </div>
            }
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .dashboard { max-width: var(--content-max-width); }
    .dash-header { margin-bottom: var(--space-6); }
    .dash-header h1 { font-size: var(--text-3xl); font-weight: var(--weight-bold); letter-spacing: -0.02em; }
    .dash-sub { color: var(--text-secondary); margin-top: var(--space-1); }

    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-4); margin-bottom: var(--space-6); }
    .stat-card { padding: var(--space-5); border: 1px solid var(--border-primary); border-radius: var(--radius-lg); }
    .stat-value { font-size: var(--text-3xl); font-weight: var(--weight-bold); letter-spacing: -0.02em; }
    .stat-label { font-size: var(--text-sm); color: var(--text-secondary); margin-top: var(--space-1); }

    .dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); }
    .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4); }
    .section-title { font-size: var(--text-lg); font-weight: var(--weight-semibold); }
    .view-all { font-size: var(--text-sm); color: var(--color-orange); font-weight: var(--weight-medium); }

    .attention-item {
      display: flex; align-items: center; gap: var(--space-3);
      padding: var(--space-3) 0; border-bottom: 1px solid var(--border-secondary);
    }
    .attention-item:last-child { border-bottom: none; }
    .attention-icon { font-size: 18px; color: var(--color-flagged); }
    .attention-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .attention-title { font-size: var(--text-sm); font-weight: var(--weight-medium); }
    .attention-meta { font-size: var(--text-xs); color: var(--text-tertiary); }
    .attention-action { font-size: var(--text-sm); color: var(--color-orange); font-weight: var(--weight-medium); }

    .submission-item {
      display: flex; align-items: center; justify-content: space-between;
      padding: var(--space-3) 0; border-bottom: 1px solid var(--border-secondary);
    }
    .submission-item:last-child { border-bottom: none; }
    .sub-info { display: flex; flex-direction: column; gap: 2px; }
    .sub-student { font-size: var(--text-sm); font-weight: var(--weight-medium); }
    .sub-assignment { font-size: var(--text-xs); color: var(--text-tertiary); }
    .status-badge { font-size: 10px; font-weight: var(--weight-semibold); text-transform: uppercase; padding: 2px 8px; border-radius: var(--radius-sm); }
    .status-badge[data-result="pass"] { color: var(--color-pass); background: var(--color-pass-bg); }
    .status-badge[data-result="fail"] { color: var(--color-fail); background: var(--color-fail-bg); }
    .status-badge[data-result="flagged_for_review"] { color: var(--color-flagged); background: var(--color-flagged-bg); }
    .status-badge[data-result="running"] { color: var(--color-running); background: var(--color-running-bg); }

    .empty-text { font-size: var(--text-sm); color: var(--text-tertiary); padding: var(--space-4) 0; }

    @media (max-width: 1023px) { .stats-row { grid-template-columns: repeat(2, 1fr); } .dash-grid { grid-template-columns: 1fr; } }
  `]
})
export class AdminDashboardComponent implements OnInit {
  readonly courses = signal<Course[]>([]);
  readonly recentSubmissions = signal<Submission[]>([]);
  readonly flaggedSubmissions = signal<Submission[]>([]);

  constructor(readonly auth: AuthService, private coursesService: CoursesService, private submissionsService: SubmissionsService) {}

  ngOnInit(): void {
    this.coursesService.getActiveCourses().subscribe(c => this.courses.set(c));
    this.submissionsService.getSubmissions({ page: 1, pageSize: 8, sortBy: 'submittedAt', sortDirection: 'desc' }).subscribe(r => this.recentSubmissions.set(r.data));
    this.submissionsService.getSubmissions({ page: 1, pageSize: 5, status: 'flagged_for_review' }).subscribe(r => this.flaggedSubmissions.set(r.data));
  }

  totalStudents(): number { return this.courses().reduce((s, c) => s + c.studentCount, 0); }
  totalAssignments(): number { return this.courses().reduce((s, c) => s + c.assignmentCount, 0); }
  flaggedCount(): number { return this.flaggedSubmissions().length; }

  formatResult(r?: string): string {
    return { pass: 'Passed', fail: 'Failed', flagged_for_review: 'Flagged', running: 'Running' }[r ?? ''] ?? r ?? '';
  }
}
