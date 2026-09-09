import { Component, ChangeDetectionStrategy, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { CoursesService } from '../../../core/services/courses.service';
import { SubmissionsService } from '../../../core/services/submissions.service';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { Course, Assignment, Submission, User, StudentPerformance } from '../../../core/models';

type Tab = 'overview' | 'assignments' | 'students' | 'submissions' | 'schedule';

@Component({
  selector: 'app-faculty-course-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (course()) {
      <div class="course-detail">
        <header class="course-header">
          <div class="header-main">
            <div class="course-badges">
              <span class="status-badge" [attr.data-status]="course()?.status">{{ course()?.status }}</span>
              <span class="course-code">{{ course()?.code }}</span>
            </div>
            <h1>{{ course()?.title }}</h1>
            <p class="course-desc">{{ course()?.description }}</p>
          </div>
        </header>

        <div class="tabs">
          <button class="tab-btn" [class.active]="activeTab() === 'overview'" (click)="activeTab.set('overview')">Overview</button>
          <button class="tab-btn" [class.active]="activeTab() === 'schedule'" (click)="activeTab.set('schedule')">Schedule</button>
          <button class="tab-btn" [class.active]="activeTab() === 'assignments'" (click)="activeTab.set('assignments')">Assignments</button>
          <button class="tab-btn" [class.active]="activeTab() === 'students'" (click)="activeTab.set('students')">Enrolled Students</button>
          <button class="tab-btn" [class.active]="activeTab() === 'submissions'" (click)="activeTab.set('submissions')">Submissions</button>
        </div>

        <div class="tab-content">
          <!-- Overview Tab -->
          @if (activeTab() === 'overview') {
            <div class="overview-grid">
              <div class="stat-card">
                <span class="stat-label">Students</span>
                <span class="stat-value">{{ course()?.studentCount }}</span>
              </div>
              <div class="stat-card">
                <span class="stat-label">Assignments</span>
                <span class="stat-value">{{ course()?.assignmentCount }}</span>
              </div>
              <div class="stat-card">
                <span class="stat-label">Current Week</span>
                <span class="stat-value">{{ course()?.currentWeek }} / {{ course()?.totalWeeks }}</span>
              </div>
            </div>
          }

          <!-- Assignments Tab -->
          @if (activeTab() === 'assignments') {
            <div class="list-container">
              @for (asg of assignments(); track asg.id) {
                <div class="list-item">
                  <div class="item-main">
                    <h4>{{ asg.title }}</h4>
                    <div class="item-meta">
                      <span class="badge status-badge" [attr.data-status]="asg.status">{{ asg.status }}</span>
                      <span>Week {{ asg.week }}</span>
                      <span>Due: {{ asg.dueDate | date:'MMM d, y' }}</span>
                    </div>
                  </div>
                  <div class="item-actions">
                    <!-- In a real app, faculty could edit/grade from here -->
                    <a [routerLink]="['/faculty/submissions']" [queryParams]="{ assignmentId: asg.id }" class="btn-text">View Submissions</a>
                  </div>
                </div>
              } @empty {
                <p class="empty-text">No assignments found for this course.</p>
              }
            </div>
          }

          <!-- Students Tab -->
          @if (activeTab() === 'students') {
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Email</th>
                    <th>Completed</th>
                    <th>Avg Score</th>
                    <th>Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  @for (perf of studentPerformance(); track perf.studentId) {
                    <tr>
                      <td class="font-medium">{{ perf.studentName }}</td>
                      <td class="text-secondary">{{ perf.studentEmail }}</td>
                      <td>{{ perf.assignmentsCompleted }} / {{ perf.assignmentsTotal }}</td>
                      <td>
                        <span class="score-badge" [class.excellent]="perf.averageScore >= 90" [class.good]="perf.averageScore >= 75 && perf.averageScore < 90" [class.poor]="perf.averageScore < 75">
                          {{ perf.averageScore }}%
                        </span>
                      </td>
                      <td class="text-tertiary">{{ perf.lastActiveAt | date:'MMM d' }}</td>
                    </tr>
                  } @empty {
                    <tr><td colspan="5" class="empty-cell">No students enrolled.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          }

          <!-- Submissions Tab -->
          @if (activeTab() === 'submissions') {
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Assignment</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  @for (sub of recentSubmissions(); track sub.id) {
                    <tr>
                      <td class="font-medium">{{ sub.studentName }}</td>
                      <td>{{ sub.assignmentTitle }}</td>
                      <td>
                        <span class="result-badge" [attr.data-result]="sub.result">{{ formatResult(sub.result) }}</span>
                      </td>
                      <td>{{ sub.score }}%</td>
                      <td class="text-tertiary">{{ sub.submittedAt | date:'MMM d, h:mm a' }}</td>
                    </tr>
                  } @empty {
                    <tr><td colspan="5" class="empty-cell">No submissions yet.</td></tr>
                  }
                </tbody>
              </table>
              <div class="mt-4 text-center">
                <a routerLink="/faculty/submissions" [queryParams]="{ courseId: course()?.id }" class="btn-text">View Full Submissions History</a>
              </div>
            </div>
          }

          <!-- Schedule Tab -->
          @if (activeTab() === 'schedule') {
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Week</th>
                    <th>Status</th>
                    <th>Scheduled Release</th>
                    <th>Unlock Method</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (week of course()?.weeks; track week.number) {
                    <tr>
                      <td class="font-medium">Week {{ week.number }}</td>
                      <td>
                        <span class="status-badge" [attr.data-status]="week.status === 'locked' ? 'draft' : 'published'">
                          {{ week.status }}
                        </span>
                      </td>
                      <td class="text-secondary">{{ week.releaseDate | date:'MMM d, y' }}</td>
                      <td class="text-tertiary" style="text-transform: capitalize;">{{ week.unlockMethod }}</td>
                      <td>
                        @if (week.status === 'locked') {
                          <button class="btn-text" (click)="unlockWeek(week.number)">Unlock Now</button>
                        } @else {
                          <span class="text-tertiary">Unlocked</span>
                        }
                      </td>
                    </tr>
                  } @empty {
                    <tr><td colspan="5" class="empty-cell">No schedule available.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </div>
    } @else {
      <div class="loading-state">Loading course details...</div>
    }
  `,
  styles: [`
    .course-detail { max-width: var(--content-max-width); }
    .course-header { margin-bottom: var(--space-6); }
    .course-badges { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-2); }
    .status-badge { font-size: 10px; font-weight: var(--weight-bold); text-transform: uppercase; padding: 4px 8px; border-radius: var(--radius-full); }
    .status-badge[data-status="active"], .status-badge[data-status="published"] { background: var(--color-pass-bg); color: var(--color-pass); }
    .status-badge[data-status="draft"] { background: var(--surface-secondary); color: var(--text-secondary); }
    .status-badge[data-status="archived"] { background: var(--color-fail-bg); color: var(--color-fail); }
    .course-code { font-size: var(--text-sm); font-weight: var(--weight-bold); color: var(--color-orange); }
    .header-main h1 { font-size: var(--text-3xl); font-weight: var(--weight-bold); margin-bottom: var(--space-2); }
    .course-desc { font-size: var(--text-base); color: var(--text-secondary); max-width: 800px; }
    
    .tabs { display: flex; gap: var(--space-6); border-bottom: 1px solid var(--border-secondary); margin-bottom: var(--space-6); }
    .tab-btn { background: none; border: none; padding: var(--space-3) 0; font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--text-secondary); cursor: pointer; border-bottom: 2px solid transparent; transition: all var(--transition-fast); }
    .tab-btn:hover { color: var(--text-primary); }
    .tab-btn.active { color: var(--color-orange); border-bottom-color: var(--color-orange); }
    
    .overview-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: var(--space-4); }
    .stat-card { padding: var(--space-5); border: 1px solid var(--border-primary); border-radius: var(--radius-lg); display: flex; flex-direction: column; gap: var(--space-1); }
    .stat-label { font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); font-weight: var(--weight-medium); }
    .stat-value { font-size: var(--text-2xl); font-weight: var(--weight-bold); }
    
    .list-container { display: flex; flex-direction: column; gap: var(--space-3); }
    .list-item { display: flex; align-items: center; justify-content: space-between; padding: var(--space-4); border: 1px solid var(--border-primary); border-radius: var(--radius-md); }
    .item-main h4 { font-size: var(--text-base); font-weight: var(--weight-semibold); margin-bottom: var(--space-1); }
    .item-meta { display: flex; align-items: center; gap: var(--space-3); font-size: var(--text-xs); color: var(--text-tertiary); }
    .btn-text { color: var(--color-orange); font-size: var(--text-sm); font-weight: var(--weight-medium); text-decoration: none; cursor: pointer; }
    .btn-text:hover { text-decoration: underline; }
    
    .table-container { width: 100%; overflow-x: auto; border: 1px solid var(--border-primary); border-radius: var(--radius-lg); }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; }
    .data-table th { padding: var(--space-3) var(--space-4); font-size: var(--text-xs); font-weight: var(--weight-medium); color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border-primary); background: var(--surface-secondary); }
    .data-table td { padding: var(--space-3) var(--space-4); font-size: var(--text-sm); border-bottom: 1px solid var(--border-secondary); }
    .data-table tr:last-child td { border-bottom: none; }
    .font-medium { font-weight: var(--weight-medium); }
    .text-secondary { color: var(--text-secondary); }
    .text-tertiary { color: var(--text-tertiary); }
    .empty-cell { text-align: center; color: var(--text-tertiary); padding: var(--space-6) !important; }
    
    .score-badge { display: inline-block; padding: 2px 8px; border-radius: var(--radius-full); font-size: 11px; font-weight: var(--weight-bold); }
    .score-badge.excellent { background: var(--color-pass-bg); color: var(--color-pass); }
    .score-badge.good { background: var(--color-running-bg); color: var(--color-running); }
    .score-badge.poor { background: var(--color-fail-bg); color: var(--color-fail); }
    
    .result-badge { font-size: 10px; font-weight: var(--weight-bold); text-transform: uppercase; padding: 2px 8px; border-radius: var(--radius-sm); }
    .result-badge[data-result="pass"] { color: var(--color-pass); background: var(--color-pass-bg); }
    .result-badge[data-result="fail"] { color: var(--color-fail); background: var(--color-fail-bg); }
    .result-badge[data-result="flagged_for_review"] { color: var(--color-flagged); background: var(--color-flagged-bg); }
    .result-badge[data-result="running"] { color: var(--color-running); background: var(--color-running-bg); }
    
    .mt-4 { margin-top: var(--space-4); }
    .text-center { text-align: center; }
  `]
})
export class FacultyCourseDetailComponent implements OnInit {
  readonly activeTab = signal<Tab>('overview');
  
  readonly course = signal<Course | null>(null);
  readonly assignments = signal<Assignment[]>([]);
  readonly studentPerformance = signal<StudentPerformance[]>([]);
  readonly recentSubmissions = signal<Submission[]>([]);

  constructor(
    private route: ActivatedRoute,
    private auth: AuthService,
    private coursesService: CoursesService,
    private submissionsService: SubmissionsService,
    private analyticsService: AnalyticsService
  ) {}

  ngOnInit(): void {
    const courseId = this.route.snapshot.paramMap.get('courseId');
    const user = this.auth.currentUser();
    
    if (courseId && user) {
      // In a real app, the backend would guard this to ensure the faculty is assigned to the course
      this.coursesService.getCourseById(courseId).subscribe(c => {
        if (c && c.instructorId === user.id) {
          this.course.set(c);
          
          // Load assignments
          this.coursesService.getCourseAssignments(courseId).subscribe(asgs => {
            this.assignments.set(asgs);
          });
          
          // Load students performance
          this.analyticsService.getStudentPerformance(courseId).subscribe(perf => {
            this.studentPerformance.set(perf);
          });
          
          // Load recent submissions for this course
          this.submissionsService.getSubmissions({ courseId, page: 1, pageSize: 10, sortBy: 'submittedAt', sortDirection: 'desc' })
            .subscribe(res => {
              this.recentSubmissions.set(res.data);
            });
            
        } else {
          // Not authorized or not found
          this.course.set(null);
        }
      });
    }
  }

  formatResult(r?: string): string {
    return { pass: 'Passed', fail: 'Failed', flagged_for_review: 'Flagged', running: 'Running' }[r ?? ''] ?? r ?? '';
  }

  unlockWeek(weekNumber: number): void {
    const c = this.course();
    if (c) {
      this.coursesService.manuallyUnlockWeek(c.id, weekNumber).subscribe(success => {
        if (success) {
          // Reload the course to reflect changes
          this.coursesService.getCourseById(c.id).subscribe(updated => {
            if (updated) this.course.set(updated);
          });
        }
      });
    }
  }
}
