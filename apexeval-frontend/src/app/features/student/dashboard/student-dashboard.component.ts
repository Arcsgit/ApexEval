/* ============================================================
   ApexEval — Student Dashboard
   ============================================================ */

import { Component, ChangeDetectionStrategy, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../../core/auth/auth.service';
import { CoursesService } from '../../../core/services/courses.service';
import { SubmissionsService } from '../../../core/services/submissions.service';
import { CourseWithProgress, Submission, StudentAssignment } from '../../../core/models';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dashboard">
      <!-- Greeting -->
      <header class="dash-header">
        <div>
          <h1 class="greeting">Good {{ getTimeOfDay() }}, {{ auth.currentUser()?.firstName }}</h1>
          <p class="greeting-sub">Continue where you left off.</p>
        </div>
      </header>

      <!-- Overview Stats -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-value">{{ courses().length }}</div>
          <div class="stat-label">Courses Enrolled</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ completedCount() }}</div>
          <div class="stat-label">Assignments Completed</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ streakCount() }}</div>
          <div class="stat-label">Day Streak</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ upcomingDeadlines().length }}</div>
          <div class="stat-label">Upcoming Deadlines</div>
        </div>
      </div>

      <div class="dash-grid">
        <!-- My Courses -->
        <section class="section courses-section">
          <div class="section-header">
            <h2 class="section-title">My Courses</h2>
          </div>
          <div class="courses-grid">
            @for (course of courses(); track course.id) {
              <a [routerLink]="['/student/courses', course.id]" class="course-card">
                <div class="course-card-header">
                  <span class="course-code">{{ course.code }}</span>
                  <span class="course-week">Week {{ course.currentWeek }}</span>
                </div>
                <h3 class="course-title">{{ course.title }}</h3>
                <p class="course-instructor">{{ course.instructorName }}</p>
                <div class="course-progress">
                  <div class="progress-bar">
                    <div class="progress-fill" [style.width.%]="course.enrollment.progressPercent"></div>
                  </div>
                  <span class="progress-text">{{ course.enrollment.completedAssignments }}/{{ course.enrollment.totalAssignments }} assignments</span>
                </div>
              </a>
            } @empty {
              <div class="empty-state">
                <span class="material-symbols-outlined empty-icon">school</span>
                <p class="empty-title">No courses yet</p>
                <p class="empty-desc">You're not enrolled in any courses.</p>
              </div>
            }
          </div>
        </section>

        <!-- Right Column -->
        <div class="right-col">
          <!-- Upcoming Deadlines -->
          <section class="section">
            <h2 class="section-title">Upcoming Deadlines</h2>
            <div class="deadlines-list">
              @for (item of upcomingDeadlines(); track item.id) {
                <a [routerLink]="['/student/courses', item.courseId, 'assignments', item.id]" class="deadline-item">
                  <div class="deadline-info">
                    <span class="deadline-title">{{ item.title }}</span>
                    <span class="deadline-course">{{ item.courseName }}</span>
                  </div>
                  <div class="deadline-meta">
                    <span class="deadline-date" [class.urgent]="isUrgent(item.dueDate)">
                      {{ formatDueDate(item.dueDate) }}
                    </span>
                    <span class="deadline-status" [attr.data-status]="item.studentStatus">
                      {{ formatStatus(item.studentStatus) }}
                    </span>
                  </div>
                </a>
              } @empty {
                <p class="empty-text">No upcoming deadlines</p>
              }
            </div>
          </section>

          <!-- Recent Submissions -->
          <section class="section">
            <div class="section-header">
              <h2 class="section-title">Recent Submissions</h2>
              <a routerLink="/student/submissions" class="view-all">View all</a>
            </div>
            <div class="submissions-list">
              @for (sub of recentSubmissions(); track sub.id) {
                <a [routerLink]="['/student/submissions', sub.id]" class="submission-item">
                  <div class="sub-info">
                    <span class="sub-title">{{ sub.assignmentTitle }}</span>
                    <span class="sub-meta">Attempt {{ sub.attempt }} · {{ sub.submittedAt | date:'MMM d, h:mm a' }}</span>
                  </div>
                  <span class="status-badge" [attr.data-result]="sub.result">
                    {{ formatResult(sub.result) }}
                  </span>
                </a>
              } @empty {
                <p class="empty-text">No submissions yet</p>
              }
            </div>
          </section>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard { max-width: var(--content-max-width); }

    .dash-header { margin-bottom: var(--space-6); }
    .greeting {
      font-size: var(--text-3xl);
      font-weight: var(--weight-bold);
      letter-spacing: -0.02em;
    }
    .greeting-sub {
      font-size: var(--text-base);
      color: var(--text-secondary);
      margin-top: var(--space-1);
    }

    /* Stats */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--space-4);
      margin-bottom: var(--space-6);
    }
    .stat-card {
      padding: var(--space-5);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-lg);
      background: var(--surface-primary);
    }
    .stat-value {
      font-size: var(--text-3xl);
      font-weight: var(--weight-bold);
      color: var(--text-primary);
      letter-spacing: -0.02em;
    }
    .stat-label {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      margin-top: var(--space-1);
    }

    /* Grid Layout */
    .dash-grid {
      display: grid;
      grid-template-columns: 1.3fr 1fr;
      gap: var(--space-6);
    }

    .section { margin-bottom: var(--space-6); }
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--space-4);
    }
    .section-title {
      font-size: var(--text-lg);
      font-weight: var(--weight-semibold);
    }
    .view-all {
      font-size: var(--text-sm);
      color: var(--color-orange);
      font-weight: var(--weight-medium);
    }
    .view-all:hover { text-decoration: underline; }

    /* Course Cards */
    .courses-grid {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }
    .course-card {
      display: block;
      padding: var(--space-5);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-lg);
      background: var(--surface-primary);
      transition: all var(--transition-fast);
      text-decoration: none;
    }
    .course-card:hover {
      border-color: var(--border-hover);
      box-shadow: var(--shadow-xs);
    }
    .course-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--space-2);
    }
    .course-code {
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      color: var(--color-orange);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .course-week {
      font-size: var(--text-xs);
      color: var(--text-tertiary);
    }
    .course-title {
      font-size: var(--text-md);
      font-weight: var(--weight-semibold);
      margin-bottom: var(--space-1);
    }
    .course-instructor {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      margin-bottom: var(--space-4);
    }
    .course-progress { display: flex; flex-direction: column; gap: var(--space-2); }
    .progress-bar {
      width: 100%;
      height: 4px;
      background: var(--color-gray-150);
      border-radius: var(--radius-full);
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: var(--color-orange);
      border-radius: var(--radius-full);
      transition: width var(--transition-slow);
    }
    .progress-text {
      font-size: var(--text-xs);
      color: var(--text-tertiary);
    }

    /* Deadlines */
    .deadlines-list {
      display: flex;
      flex-direction: column;
    }
    .deadline-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-3) 0;
      border-bottom: 1px solid var(--border-secondary);
      text-decoration: none;
      transition: background var(--transition-fast);
      gap: var(--space-3);
    }
    .deadline-item:last-child { border-bottom: none; }
    .deadline-item:hover { opacity: 0.8; }
    .deadline-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .deadline-title {
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .deadline-course {
      font-size: var(--text-xs);
      color: var(--text-tertiary);
    }
    .deadline-meta {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
      flex-shrink: 0;
    }
    .deadline-date {
      font-size: var(--text-xs);
      color: var(--text-secondary);
      font-weight: var(--weight-medium);
    }
    .deadline-date.urgent { color: var(--color-fail); }
    .deadline-status {
      font-size: 10px;
      font-weight: var(--weight-semibold);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 1px 6px;
      border-radius: var(--radius-sm);
    }
    .deadline-status[data-status="not_started"] { color: var(--color-queued); background: var(--color-queued-bg); }
    .deadline-status[data-status="in_progress"] { color: var(--color-running); background: var(--color-running-bg); }
    .deadline-status[data-status="passed"] { color: var(--color-pass); background: var(--color-pass-bg); }
    .deadline-status[data-status="failed"] { color: var(--color-fail); background: var(--color-fail-bg); }
    .deadline-status[data-status="flagged"] { color: var(--color-flagged); background: var(--color-flagged-bg); }
    .deadline-status[data-status="overdue"] { color: var(--color-fail); background: var(--color-fail-bg); }

    /* Submissions */
    .submissions-list {
      display: flex;
      flex-direction: column;
    }
    .submission-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-3) 0;
      border-bottom: 1px solid var(--border-secondary);
      text-decoration: none;
      gap: var(--space-3);
    }
    .submission-item:last-child { border-bottom: none; }
    .submission-item:hover { opacity: 0.8; }
    .sub-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .sub-title {
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .sub-meta {
      font-size: var(--text-xs);
      color: var(--text-tertiary);
    }
    .status-badge {
      font-size: 10px;
      font-weight: var(--weight-semibold);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 2px 8px;
      border-radius: var(--radius-sm);
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .status-badge[data-result="pass"] { color: var(--color-pass); background: var(--color-pass-bg); }
    .status-badge[data-result="fail"] { color: var(--color-fail); background: var(--color-fail-bg); }
    .status-badge[data-result="flagged_for_review"] { color: var(--color-flagged); background: var(--color-flagged-bg); }
    .status-badge[data-result="running"] { color: var(--color-running); background: var(--color-running-bg); }
    .status-badge[data-result="queued"] { color: var(--color-queued); background: var(--color-queued-bg); }

    /* Empty states */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--space-10) var(--space-6);
      text-align: center;
      border: 1px dashed var(--border-primary);
      border-radius: var(--radius-lg);
    }
    .empty-icon { font-size: 40px; color: var(--text-disabled); margin-bottom: var(--space-3); }
    .empty-title { font-size: var(--text-base); font-weight: var(--weight-medium); }
    .empty-desc { font-size: var(--text-sm); color: var(--text-secondary); margin-top: var(--space-1); }
    .empty-text { font-size: var(--text-sm); color: var(--text-tertiary); padding: var(--space-4) 0; }

    /* Responsive */
    @media (max-width: 1023px) {
      .stats-row { grid-template-columns: repeat(2, 1fr); }
      .dash-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 767px) {
      .stats-row { grid-template-columns: 1fr 1fr; gap: var(--space-3); }
      .stat-card { padding: var(--space-4); }
      .stat-value { font-size: var(--text-2xl); }
    }
  `]
})
export class StudentDashboardComponent implements OnInit {
  readonly courses = signal<CourseWithProgress[]>([]);
  readonly recentSubmissions = signal<Submission[]>([]);
  readonly upcomingDeadlines = signal<StudentAssignment[]>([]);

  constructor(
    readonly auth: AuthService,
    private readonly coursesService: CoursesService,
    private readonly submissionsService: SubmissionsService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    const userId = this.auth.currentUser()?.id ?? '';

    this.coursesService.getStudentCourses(userId).subscribe(c => this.courses.set(c));

    this.submissionsService.getSubmissions({
      studentId: userId, page: 1, pageSize: 5, sortBy: 'submittedAt', sortDirection: 'desc'
    }).subscribe(r => this.recentSubmissions.set(r.data));

    // Gather upcoming deadlines from all enrolled courses
    this.coursesService.getStudentCourses(userId).subscribe(courses => {
      const allDeadlines: StudentAssignment[] = [];
      let loaded = 0;
      courses.forEach(course => {
        this.coursesService.getStudentAssignments(course.id, userId).subscribe(assignments => {
          const upcoming = assignments.filter(a => {
            const due = new Date(a.dueDate);
            return due > new Date() && a.studentStatus !== 'passed';
          });
          allDeadlines.push(...upcoming);
          loaded++;
          if (loaded === courses.length) {
            allDeadlines.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
            this.upcomingDeadlines.set(allDeadlines.slice(0, 6));
          }
        });
      });
    });
  }

  completedCount(): number {
    return this.courses().reduce((sum, c) => sum + c.enrollment.completedAssignments, 0);
  }

  streakCount(): number {
    const maxStreak = this.courses().reduce((max, c) => Math.max(max, c.enrollment.currentStreak), 0);
    return maxStreak;
  }

  getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }

  isUrgent(dueDate: string): boolean {
    const diff = new Date(dueDate).getTime() - Date.now();
    return diff < 2 * 24 * 60 * 60 * 1000; // < 2 days
  }

  formatDueDate(dueDate: string): string {
    const diff = new Date(dueDate).getTime() - Date.now();
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    if (days < 7) return `${days} days left`;
    return new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  formatStatus(status: string): string {
    const map: Record<string, string> = {
      not_started: 'Not started',
      in_progress: 'In progress',
      passed: 'Passed',
      failed: 'Failed',
      flagged: 'Flagged',
      overdue: 'Overdue',
      submitted: 'Submitted',
    };
    return map[status] ?? status;
  }

  formatResult(result?: string): string {
    const map: Record<string, string> = {
      pass: 'Passed',
      fail: 'Failed',
      flagged_for_review: 'Flagged',
      running: 'Running',
      queued: 'Queued',
      error: 'Error',
    };
    return map[result ?? ''] ?? result ?? '';
  }
}
