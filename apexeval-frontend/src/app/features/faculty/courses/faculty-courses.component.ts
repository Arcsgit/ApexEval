import { Component, ChangeDetectionStrategy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../../core/auth/auth.service';
import { CoursesService } from '../../../core/services/courses.service';
import { Course } from '../../../core/models';

@Component({
  selector: 'app-faculty-courses',
  standalone: true,
  imports: [RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="courses-page">
      <header class="page-header">
        <div class="header-content">
          <h1>My Courses</h1>
          <p class="header-sub">Manage your assigned courses, students, and assignments.</p>
        </div>
      </header>

      <div class="courses-grid">
        @for (course of courses(); track course.id) {
          <div class="course-card">
            <div class="course-header">
              <div class="course-badges">
                <span class="status-badge" [attr.data-status]="course.status">{{ course.status }}</span>
                <span class="course-code">{{ course.code }}</span>
              </div>
            </div>
            
            <div class="course-body">
              <h2 class="course-title">{{ course.title }}</h2>
              <p class="course-desc">{{ course.description }}</p>
            </div>
            
            <div class="course-stats">
              <div class="stat">
                <span class="material-symbols-outlined">group</span>
                <span>{{ course.studentCount }} Students</span>
              </div>
              <div class="stat">
                <span class="material-symbols-outlined">assignment</span>
                <span>{{ course.assignmentCount }} Assignments</span>
              </div>
              <div class="stat">
                <span class="material-symbols-outlined">calendar_today</span>
                <span>Week {{ course.currentWeek }} / {{ course.totalWeeks }}</span>
              </div>
            </div>
            
            <div class="course-footer">
              <a [routerLink]="['/faculty/courses', course.id]" class="btn-primary">Manage Course</a>
            </div>
          </div>
        } @empty {
          <div class="empty-state">
            <span class="material-symbols-outlined empty-icon">school</span>
            <h3>No Courses Assigned</h3>
            <p>You have not been assigned as an instructor for any courses yet.</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .courses-page { max-width: var(--content-max-width); }
    
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-end;
      margin-bottom: var(--space-8);
    }
    .page-header h1 { font-size: var(--text-3xl); font-weight: var(--weight-bold); letter-spacing: -0.02em; }
    .header-sub { color: var(--text-secondary); margin-top: var(--space-2); }
    
    .courses-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: var(--space-6);
    }
    
    .course-card {
      display: flex; flex-direction: column;
      background: var(--surface-primary); border: 1px solid var(--border-primary);
      border-radius: var(--radius-xl); overflow: hidden;
      transition: transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast);
    }
    .course-card:hover {
      transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: var(--border-hover);
    }
    
    .course-header {
      padding: var(--space-4) var(--space-5) 0;
    }
    .course-badges {
      display: flex; align-items: center; justify-content: space-between;
    }
    
    .status-badge {
      font-size: 10px; font-weight: var(--weight-bold); text-transform: uppercase;
      letter-spacing: 0.05em; padding: 4px 8px; border-radius: var(--radius-full);
    }
    .status-badge[data-status="active"] { background: var(--color-pass-bg); color: var(--color-pass); }
    .status-badge[data-status="draft"] { background: var(--surface-secondary); color: var(--text-secondary); }
    .status-badge[data-status="archived"] { background: var(--color-fail-bg); color: var(--color-fail); }
    
    .course-code { font-size: var(--text-xs); font-weight: var(--weight-bold); color: var(--color-orange); }
    
    .course-body { padding: var(--space-4) var(--space-5); flex: 1; }
    .course-title { font-size: var(--text-xl); font-weight: var(--weight-bold); margin-bottom: var(--space-2); line-height: 1.3; }
    .course-desc { font-size: var(--text-sm); color: var(--text-secondary); line-height: var(--leading-relaxed); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    
    .course-stats {
      display: flex; flex-direction: column; gap: var(--space-2);
      padding: var(--space-4) var(--space-5); background: var(--surface-secondary);
      border-top: 1px solid var(--border-secondary); border-bottom: 1px solid var(--border-secondary);
    }
    .stat { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-sm); color: var(--text-secondary); }
    .stat .material-symbols-outlined { font-size: 18px; color: var(--text-tertiary); }
    
    .course-footer { padding: var(--space-4) var(--space-5); }
    .btn-primary {
      display: flex; align-items: center; justify-content: center;
      width: 100%; height: 40px; border-radius: var(--radius-md);
      background: var(--color-orange); color: white;
      font-size: var(--text-sm); font-weight: var(--weight-medium); text-decoration: none;
      transition: background var(--transition-fast);
    }
    .btn-primary:hover { background: var(--color-orange-hover); }
    
    .empty-state {
      grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: var(--space-12) var(--space-6); text-align: center;
      background: var(--surface-secondary); border-radius: var(--radius-xl); border: 1px dashed var(--border-primary);
    }
    .empty-icon { font-size: 48px; color: var(--text-tertiary); margin-bottom: var(--space-4); }
    .empty-state h3 { font-size: var(--text-xl); font-weight: var(--weight-semibold); margin-bottom: var(--space-2); }
    .empty-state p { color: var(--text-secondary); max-width: 400px; }
  `]
})
export class FacultyCoursesComponent implements OnInit {
  readonly courses = signal<Course[]>([]);

  constructor(
    private auth: AuthService,
    private coursesService: CoursesService
  ) {}

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (user) {
      this.coursesService.getFacultyCourses(user.id).subscribe(c => this.courses.set(c));
    }
  }
}
