import { Component, ChangeDetectionStrategy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CoursesService } from '../../../core/services/courses.service';
import { Course } from '../../../core/models';

@Component({
  selector: 'app-admin-courses',
  standalone: true,
  imports: [RouterLink, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1>Courses</h1>
          <p class="page-desc">Manage your courses and assignments.</p>
        </div>
        <button class="btn-primary" (click)="showCreateDialog.set(true)">
          <span class="material-symbols-outlined">add</span> New Course
        </button>
      </header>
      <div class="search-bar">
        <div class="search-wrap">
          <span class="material-symbols-outlined">search</span>
          <input type="text" [(ngModel)]="search" placeholder="Search courses..." class="search-input" />
        </div>
      </div>
      <div class="courses-list">
        @for (c of filteredCourses(); track c.id) {
          <a [routerLink]="['/admin/courses', c.id]" class="course-row">
            <div class="course-info">
              <span class="course-code">{{ c.code }}</span>
              <span class="course-title">{{ c.title }}</span>
            </div>
            <div class="course-meta">
              <span class="meta-item">{{ c.instructorName }}</span>
              <span class="meta-item">{{ c.studentCount }} students</span>
              <span class="meta-item">{{ c.assignmentCount }} assignments</span>
              <span class="status-tag" [attr.data-status]="c.status">{{ c.status }}</span>
            </div>
          </a>
        } @empty {
          <div class="empty-state">
            <span class="material-symbols-outlined">school</span>
            <p>No courses found</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: var(--content-max-width); }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: var(--space-6); }
    .page-header h1 { font-size: var(--text-3xl); font-weight: var(--weight-bold); letter-spacing: -0.02em; }
    .page-desc { color: var(--text-secondary); margin-top: var(--space-1); }
    .btn-primary {
      display: flex; align-items: center; gap: var(--space-2);
      padding: var(--space-2) var(--space-4); background: var(--color-orange); color: white;
      border-radius: var(--radius-md); font-size: var(--text-sm); font-weight: var(--weight-semibold);
      transition: background var(--transition-fast);
    }
    .btn-primary:hover { background: var(--color-orange-hover); }
    .btn-primary .material-symbols-outlined { font-size: 18px; }

    .search-bar { margin-bottom: var(--space-5); }
    .search-wrap {
      display: flex; align-items: center; gap: var(--space-2);
      padding: 0 var(--space-3); height: 36px;
      border: 1px solid var(--border-primary); border-radius: var(--radius-md); max-width: 320px;
    }
    .search-wrap .material-symbols-outlined { font-size: 18px; color: var(--text-tertiary); }
    .search-input { border: none; outline: none; background: transparent; flex: 1; font-size: var(--text-sm); }

    .course-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: var(--space-4); border: 1px solid var(--border-primary); border-radius: var(--radius-md);
      margin-bottom: var(--space-2); transition: all var(--transition-fast); text-decoration: none;
    }
    .course-row:hover { border-color: var(--border-hover); background: var(--surface-secondary); }
    .course-info { display: flex; align-items: center; gap: var(--space-3); }
    .course-code { font-size: var(--text-xs); font-weight: var(--weight-semibold); color: var(--color-orange); text-transform: uppercase; }
    .course-title { font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--text-primary); }
    .course-meta { display: flex; align-items: center; gap: var(--space-4); }
    .meta-item { font-size: var(--text-xs); color: var(--text-tertiary); }
    .status-tag {
      font-size: 10px; font-weight: var(--weight-semibold); text-transform: uppercase;
      padding: 2px 8px; border-radius: var(--radius-sm);
    }
    .status-tag[data-status="active"] { color: var(--color-pass); background: var(--color-pass-bg); }
    .status-tag[data-status="draft"] { color: var(--text-tertiary); background: var(--color-gray-100); }
    .status-tag[data-status="archived"] { color: var(--text-disabled); background: var(--color-gray-100); }
    .empty-state { display: flex; flex-direction: column; align-items: center; padding: var(--space-10); color: var(--text-tertiary); }
    .empty-state .material-symbols-outlined { font-size: 40px; margin-bottom: var(--space-2); }
  `]
})
export class AdminCoursesComponent implements OnInit {
  readonly courses = signal<Course[]>([]);
  readonly showCreateDialog = signal(false);
  search = '';

  constructor(private coursesService: CoursesService) {}

  ngOnInit(): void {
    this.coursesService.getCourses().subscribe(c => this.courses.set(c));
  }

  filteredCourses(): Course[] {
    if (!this.search) return this.courses();
    const q = this.search.toLowerCase();
    return this.courses().filter(c => c.title.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
  }
}
