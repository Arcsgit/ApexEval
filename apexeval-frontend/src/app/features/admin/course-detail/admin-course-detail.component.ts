import { Component, ChangeDetectionStrategy, OnInit, signal, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { CoursesService } from '../../../core/services/courses.service';
import { Course, Assignment } from '../../../core/models';

@Component({
  selector: 'app-admin-course-detail', standalone: true, imports: [RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <nav class="breadcrumb"><a routerLink="/admin/courses">Courses</a><span class="material-symbols-outlined">chevron_right</span><span>{{ course()?.title }}</span></nav>
      @if (course(); as c) {
        <header class="course-header">
          <div><span class="code">{{ c.code }}</span><h1>{{ c.title }}</h1><p class="desc">{{ c.description }}</p></div>
          <a [routerLink]="['/admin/courses', c.id, 'assignments', 'new']" class="btn-primary"><span class="material-symbols-outlined">add</span> New Assignment</a>
        </header>
        <div class="tabs">
          <button class="tab" [class.active]="tab() === 'assignments'" (click)="tab.set('assignments')">Assignments ({{ assignments().length }})</button>
          <button class="tab" [class.active]="tab() === 'overview'" (click)="tab.set('overview')">Overview</button>
        </div>
        @if (tab() === 'assignments') {
          <div class="assignments-list">
            @for (a of assignments(); track a.id) {
              <div class="asg-row">
                <div class="asg-info">
                  <span class="asg-title">{{ a.title }}</span>
                  <span class="asg-meta">Week {{ a.week }}, Day {{ a.day }} · {{ a.difficulty }} · Due {{ a.dueDate | date:'MMM d' }}</span>
                </div>
                <span class="status-tag" [attr.data-status]="a.status">{{ a.status }}</span>
              </div>
            } @empty { <p class="empty-text">No assignments yet. Create your first assignment.</p> }
          </div>
        } @else {
          <div class="overview"><p class="desc">{{ c.description }}</p>
            <div class="detail-row"><span class="detail-label">Instructor</span><span>{{ c.instructorName }}</span></div>
            <div class="detail-row"><span class="detail-label">Students</span><span>{{ c.studentCount }}</span></div>
            <div class="detail-row"><span class="detail-label">Duration</span><span>{{ c.totalWeeks }} weeks</span></div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .page { max-width: var(--content-max-width); }
    .breadcrumb { display: flex; align-items: center; gap: var(--space-1); font-size: var(--text-sm); color: var(--text-tertiary); margin-bottom: var(--space-6); }
    .breadcrumb a { color: var(--text-secondary); } .breadcrumb a:hover { color: var(--color-orange); }
    .breadcrumb .material-symbols-outlined { font-size: 16px; }
    .course-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-6); }
    .code { font-size: var(--text-xs); font-weight: var(--weight-semibold); color: var(--color-orange); text-transform: uppercase; letter-spacing: 0.05em; }
    h1 { font-size: var(--text-2xl); font-weight: var(--weight-bold); margin-top: var(--space-1); }
    .desc { color: var(--text-secondary); font-size: var(--text-sm); margin-top: var(--space-2); max-width: 600px; }
    .btn-primary { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-4); background: var(--color-orange); color: white; border-radius: var(--radius-md); font-size: var(--text-sm); font-weight: var(--weight-semibold); white-space: nowrap; }
    .btn-primary:hover { background: var(--color-orange-hover); }
    .btn-primary .material-symbols-outlined { font-size: 18px; }
    .tabs { display: flex; border-bottom: 1px solid var(--border-primary); margin-bottom: var(--space-5); }
    .tab { padding: var(--space-3) var(--space-4); font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--text-secondary); border-bottom: 2px solid transparent; }
    .tab:hover { color: var(--text-primary); }
    .tab.active { color: var(--color-orange); border-bottom-color: var(--color-orange); }
    .asg-row { display: flex; align-items: center; justify-content: space-between; padding: var(--space-3) var(--space-4); border: 1px solid var(--border-secondary); border-radius: var(--radius-md); margin-bottom: var(--space-2); }
    .asg-title { font-size: var(--text-sm); font-weight: var(--weight-medium); }
    .asg-meta { font-size: var(--text-xs); color: var(--text-tertiary); display: block; margin-top: 2px; }
    .status-tag { font-size: 10px; font-weight: var(--weight-semibold); text-transform: uppercase; padding: 2px 8px; border-radius: var(--radius-sm); }
    .status-tag[data-status="published"] { color: var(--color-pass); background: var(--color-pass-bg); }
    .status-tag[data-status="draft"] { color: var(--text-tertiary); background: var(--color-gray-100); }
    .empty-text { color: var(--text-tertiary); font-size: var(--text-sm); padding: var(--space-6) 0; }
    .overview { padding: var(--space-4) 0; }
    .detail-row { display: flex; gap: var(--space-4); padding: var(--space-2) 0; font-size: var(--text-sm); border-bottom: 1px solid var(--border-secondary); }
    .detail-label { font-weight: var(--weight-medium); color: var(--text-secondary); min-width: 100px; }
  `]
})
export class AdminCourseDetailComponent implements OnInit {
  courseId = input<string>('', { alias: 'courseId' });
  readonly course = signal<Course | undefined>(undefined);
  readonly assignments = signal<Assignment[]>([]);
  readonly tab = signal<'assignments' | 'overview'>('assignments');

  constructor(private coursesService: CoursesService) {}
  ngOnInit(): void {
    this.coursesService.getCourseById(this.courseId()).subscribe(c => this.course.set(c));
    this.coursesService.getCourseAssignments(this.courseId()).subscribe(a => this.assignments.set(a));
  }
}
