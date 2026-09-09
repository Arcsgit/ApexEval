import { Component, ChangeDetectionStrategy, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../../core/auth/auth.service';
import { CoursesService } from '../../../core/services/courses.service';
import { SubmissionsService } from '../../../core/services/submissions.service';
import { Course, Submission } from '../../../core/models';

@Component({
  selector: 'app-faculty-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dashboard">
      <header class="dash-header">
        <h1>Faculty Dashboard</h1>
        <p class="dash-sub">Welcome back, {{ auth.currentUser()?.firstName }}. Here's your overview.</p>
      </header>

      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-value">{{ courses().length }}</div>
          <div class="stat-label">My Courses</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ totalStudents() }}</div>
          <div class="stat-label">Enrolled Students</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ totalAssignments() }}</div>
          <div class="stat-label">Total Assignments</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ flaggedCount() }}</div>
          <div class="stat-label">Submissions to Review</div>
        </div>
      </div>

      <div class="dash-grid">
        <section class="section">
          <div class="section-header">
            <h2 class="section-title">Needs Attention</h2>
            <a routerLink="/faculty/submissions" [queryParams]="{ status: 'flagged_for_review' }" class="view-all">View all</a>
          </div>
          <div class="attention-list">
            @for (sub of flaggedSubmissions(); track sub.id) {
              <div class="attention-item">
                <span class="material-symbols-outlined attention-icon">flag</span>
                <div class="attention-info">
                  <span class="attention-title">{{ sub.studentName }} — {{ sub.assignmentTitle }}</span>
                  <span class="attention-meta">{{ sub.courseName }} · {{ sub.submittedAt | date:'MMM d, h:mm a' }}</span>
                </div>
                <a [routerLink]="['/faculty/submissions']" class="attention-action">Review</a>
              </div>
            } @empty {
              <p class="empty-text">No flagged submissions requiring attention.</p>
            }
          </div>
        </section>

        <section class="section">
          <div class="section-header">
            <h2 class="section-title">My Courses</h2>
            <a routerLink="/faculty/courses" class="view-all">View all</a>
          </div>
          <div class="courses-list">
            @for (course of courses().slice(0, 3); track course.id) {
              <a [routerLink]="['/faculty/courses', course.id]" class="course-item">
                <div class="course-info">
                  <span class="course-code">{{ course.code }}</span>
                  <span class="course-title">{{ course.title }}</span>
                </div>
                <span class="material-symbols-outlined chevron">chevron_right</span>
              </a>
            } @empty {
              <p class="empty-text">You have not been assigned any courses yet.</p>
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
    .view-all { font-size: var(--text-sm); color: var(--color-orange); font-weight: var(--weight-medium); text-decoration: none; }
    .view-all:hover { text-decoration: underline; }

    .attention-item {
      display: flex; align-items: center; gap: var(--space-3);
      padding: var(--space-3) 0; border-bottom: 1px solid var(--border-secondary);
    }
    .attention-item:last-child { border-bottom: none; }
    .attention-icon { font-size: 18px; color: var(--color-flagged); }
    .attention-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .attention-title { font-size: var(--text-sm); font-weight: var(--weight-medium); }
    .attention-meta { font-size: var(--text-xs); color: var(--text-tertiary); }
    .attention-action { font-size: var(--text-sm); color: var(--color-orange); font-weight: var(--weight-medium); text-decoration: none; }
    .attention-action:hover { text-decoration: underline; }

    .course-item {
      display: flex; align-items: center; justify-content: space-between;
      padding: var(--space-4); margin-bottom: var(--space-3);
      border: 1px solid var(--border-primary); border-radius: var(--radius-md);
      text-decoration: none; color: inherit; transition: all var(--transition-fast);
    }
    .course-item:hover { border-color: var(--color-orange); box-shadow: var(--shadow-sm); transform: translateY(-1px); }
    .course-item:last-child { margin-bottom: 0; }
    .course-info { display: flex; flex-direction: column; gap: 2px; }
    .course-code { font-size: var(--text-xs); font-weight: var(--weight-bold); color: var(--color-orange); }
    .course-title { font-size: var(--text-sm); font-weight: var(--weight-medium); }
    .chevron { color: var(--text-tertiary); }

    .empty-text { font-size: var(--text-sm); color: var(--text-tertiary); padding: var(--space-4) 0; }

    @media (max-width: 1023px) { .stats-row { grid-template-columns: repeat(2, 1fr); } .dash-grid { grid-template-columns: 1fr; } }
  `]
})
export class FacultyDashboardComponent implements OnInit {
  readonly courses = signal<Course[]>([]);
  readonly flaggedSubmissions = signal<Submission[]>([]);

  readonly totalStudents = computed(() => this.courses().reduce((s, c) => s + c.studentCount, 0));
  readonly totalAssignments = computed(() => this.courses().reduce((s, c) => s + c.assignmentCount, 0));
  readonly flaggedCount = computed(() => this.flaggedSubmissions().length);

  constructor(
    readonly auth: AuthService,
    private coursesService: CoursesService,
    private submissionsService: SubmissionsService
  ) {}

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (!user) return;

    // Load only courses for this faculty member
    this.coursesService.getFacultyCourses(user.id).subscribe(c => {
      this.courses.set(c);

      // Now load flagged submissions only for these courses
      // (In a real app this would be a single API call with an array of courseIds or facultyId)
      const courseIds = c.map(course => course.id);
      
      this.submissionsService.getSubmissions({ page: 1, pageSize: 50, status: 'flagged_for_review' }).subscribe(res => {
        // Filter in memory for mock purposes
        const facultyFlagged = res.data.filter(s => courseIds.includes(s.courseId));
        this.flaggedSubmissions.set(facultyFlagged.slice(0, 5)); // Just take top 5
      });
    });
  }
}
