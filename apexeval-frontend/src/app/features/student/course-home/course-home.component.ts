/* ============================================================
   ApexEval — Course Home Component
   ============================================================ */

import { Component, ChangeDetectionStrategy, OnInit, signal, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, UpperCasePipe } from '@angular/common';
import { AuthService } from '../../../core/auth/auth.service';
import { CoursesService } from '../../../core/services/courses.service';
import { Course, StudentAssignment } from '../../../core/models';

@Component({
  selector: 'app-course-home',
  standalone: true,
  imports: [RouterLink, DatePipe, UpperCasePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="course-home">
      <!-- Breadcrumb -->
      <nav class="breadcrumb">
        <a routerLink="/student/dashboard">Dashboard</a>
        <span class="material-symbols-outlined bc-sep">chevron_right</span>
        <span>{{ course()?.title }}</span>
      </nav>

      @if (course(); as c) {
        <!-- Course Header -->
        <header class="course-header">
          <div class="course-header-info">
            <span class="course-code">{{ c.code }}</span>
            <h1 class="course-title">{{ c.title }}</h1>
            <p class="course-desc">{{ c.description }}</p>
            <div class="course-meta">
              <span class="meta-item">
                <span class="material-symbols-outlined">person</span>
                Faculty: {{ c.instructorName }}
              </span>
              <span class="separator">·</span>
              <span class="meta-item">
                Week {{ c.currentWeek }} of {{ c.totalWeeks }}
              </span>
            </div>
            
            <!-- Linear Progress -->
            <div class="course-progress-linear">
              <div class="progress-header">
                <span class="progress-label">Your Progress</span>
                <span class="progress-value">{{ progressPercent() }}%</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill" [style.width.%]="progressPercent()"></div>
              </div>
            </div>
          </div>
        </header>

        <!-- Weekly Roadmap -->
        <section class="weekly-roadmap">
          <div class="timeline-line"></div>
          
          @for (week of c.weeks; track week.number) {
            <div class="week-node" [attr.data-status]="week.status">
              <div class="node-dot">
                @if (week.status === 'completed') {
                  <span class="material-symbols-outlined">check</span>
                }
              </div>
              
              <div class="week-card" [class.is-open]="isWeekOpen(week.number)">
                <!-- Week Header -->
                <button class="week-header-btn" 
                        (click)="toggleWeek(week.number, week.status)"
                        [disabled]="week.status === 'locked'"
                        [title]="week.status === 'locked' ? 'This week will become available on ' + (week.releaseDate | date:'EEEE, MMM d') : ''">
                  <div class="week-header-content">
                    <div class="week-title-group">
                      @if (week.status === 'locked') {
                        <span class="material-symbols-outlined lock-icon">lock</span>
                      }
                      <h3 class="week-title">Week {{ week.number }}</h3>
                    </div>
                    <div class="week-status-label">
                      @if (week.status === 'locked') {
                        <span>Available {{ week.releaseDate | date:'EEEE, MMM d' }}</span>
                      } @else if (week.status === 'completed') {
                        <span class="status-completed">Completed</span>
                      } @else if (week.unlockMethod === 'manual') {
                        <span class="status-available">Available · Manually Unlocked</span>
                      } @else {
                        <span class="status-available">Available</span>
                      }
                    </div>
                  </div>
                  @if (week.status !== 'locked') {
                    <span class="material-symbols-outlined chevron-icon">
                      {{ isWeekOpen(week.number) ? 'expand_less' : 'expand_more' }}
                    </span>
                  }
                </button>
                
                <!-- Week Content (Accordion) -->
                @if (isWeekOpen(week.number) && week.status !== 'locked') {
                  <div class="week-content">
                    <!-- Dummy Note -->
                    <div class="learning-item">
                      <div class="item-icon note-icon"><span class="material-symbols-outlined">article</span></div>
                      <div class="item-info">
                        <span class="item-title">Introduction to Week {{ week.number }}</span>
                        <span class="item-meta">Read · 5 min</span>
                      </div>
                      <button class="item-action"><span class="material-symbols-outlined">arrow_forward</span></button>
                    </div>
                    
                    <!-- Dummy Video -->
                    <div class="learning-item">
                      <div class="item-icon video-icon"><span class="material-symbols-outlined">play_circle</span></div>
                      <div class="item-info">
                        <span class="item-title">Week {{ week.number }} Fundamentals</span>
                        <span class="item-meta">12 min</span>
                      </div>
                      <button class="item-action"><span class="material-symbols-outlined">arrow_forward</span></button>
                    </div>
                    
                    <!-- Actual Assignments -->
                    @for (assignment of getAssignmentsForWeek(week.number); track assignment.id) {
                      <a class="learning-item assignment-item" 
                         [routerLink]="['/student/courses', c.id, 'assignments', assignment.id]">
                        <div class="item-icon asg-icon"><span class="material-symbols-outlined">task</span></div>
                        <div class="item-info">
                          <span class="item-title">{{ assignment.title }}</span>
                          <span class="item-meta">Due {{ assignment.dueDate | date:'EEEE' }} · {{ formatStatus(assignment.studentStatus) }}</span>
                        </div>
                        <button class="item-action"><span class="material-symbols-outlined">arrow_forward</span></button>
                      </a>
                    }
                  </div>
                }
              </div>
            </div>
          }
        </section>
      } @else {
        <!-- Loading skeleton -->
        <div class="skeleton-header">
          <div class="skeleton" style="width:80px;height:16px;margin-bottom:8px"></div>
          <div class="skeleton" style="width:300px;height:28px;margin-bottom:8px"></div>
          <div class="skeleton" style="width:500px;height:16px"></div>
        </div>
      }
    </div>
  `,
  styles: [`
    .course-home { max-width: 1000px; margin: 0 auto; padding-bottom: var(--space-12); }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      font-size: var(--text-sm);
      color: var(--text-tertiary);
      margin-bottom: var(--space-6);
    }
    .breadcrumb a { color: var(--text-secondary); text-decoration: none; }
    .breadcrumb a:hover { color: var(--color-orange); }
    .bc-sep { font-size: 16px; }

    .course-header {
      margin-bottom: var(--space-8);
      padding-bottom: var(--space-6);
    }
    .course-code {
      display: inline-block;
      font-family: var(--font-label);
      font-size: var(--text-xs);
      font-weight: 700;
      color: var(--color-orange);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: var(--space-2);
    }
    .course-title {
      font-family: var(--font-header);
      font-size: var(--text-4xl);
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: var(--space-2);
    }
    .course-desc {
      font-size: var(--text-base);
      color: var(--text-secondary);
      line-height: var(--leading-relaxed);
      max-width: 600px;
      margin-bottom: var(--space-5);
    }
    .course-meta {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      margin-bottom: var(--space-6);
    }
    .meta-item {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      font-size: var(--text-sm);
      color: var(--text-secondary);
    }
    .meta-item .material-symbols-outlined { font-size: 16px; }
    .separator { color: var(--border-primary); }

    /* Linear Progress */
    .course-progress-linear {
      max-width: 400px;
    }
    .progress-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: var(--space-2);
    }
    .progress-label {
      font-family: var(--font-label);
      font-size: var(--text-sm);
      font-weight: 700;
      color: var(--text-primary);
    }
    .progress-value {
      font-size: var(--text-sm);
      color: var(--text-secondary);
      font-weight: var(--weight-semibold);
    }
    .progress-track {
      height: 8px;
      background: var(--surface-tertiary);
      border-radius: var(--radius-full);
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: var(--color-orange);
      border-radius: var(--radius-full);
      transition: width 500ms ease;
    }

    /* Weekly Roadmap */
    .weekly-roadmap {
      position: relative;
      padding-left: 28px;
    }
    
    .timeline-line {
      position: absolute;
      top: 24px;
      bottom: 24px;
      left: 5px;
      width: 2px;
      background: var(--border-secondary);
      z-index: 0;
    }

    .week-node {
      position: relative;
      margin-bottom: var(--space-4);
      z-index: 1;
    }

    .node-dot {
      position: absolute;
      left: -28px;
      top: 28px;
      width: 12px;
      height: 12px;
      border-radius: var(--radius-full);
      background: var(--surface-tertiary);
      border: 2px solid var(--border-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--transition-base);
    }
    .node-dot .material-symbols-outlined {
      font-size: 8px;
      font-weight: 800;
      color: white;
      opacity: 0;
    }

    .week-node[data-status="available"] .node-dot {
      background: var(--surface-primary);
      border-color: var(--color-orange);
      box-shadow: 0 0 0 4px var(--color-orange-light);
    }
    .week-node[data-status="completed"] .node-dot {
      background: var(--color-pass);
      border-color: var(--color-pass);
    }
    .week-node[data-status="completed"] .node-dot .material-symbols-outlined {
      opacity: 1;
    }

    .week-card {
      width: 100%;
      background: var(--surface-primary);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-xl);
      overflow: hidden;
      transition: all var(--transition-base);
      box-shadow: var(--shadow-sm);
    }
    .week-card.is-open {
      border-color: var(--color-orange);
      box-shadow: 0 4px 20px rgba(255, 109, 31, 0.08);
    }
    .week-node[data-status="locked"] .week-card {
      background: var(--surface-secondary);
      box-shadow: none;
      opacity: 0.8;
    }

    .week-header-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-4) var(--space-5);
      background: transparent;
      border: none;
      cursor: pointer;
      text-align: left;
    }
    .week-header-btn:disabled {
      cursor: not-allowed;
    }
    .week-header-btn:focus-visible {
      outline: 2px solid var(--color-orange);
      outline-offset: -2px;
    }

    .week-header-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .week-title-group {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }
    .lock-icon {
      font-size: 16px;
      color: var(--text-tertiary);
    }
    .week-title {
      font-family: var(--font-header);
      font-size: var(--text-xl);
      font-weight: 800;
      color: var(--text-primary);
      margin: 0;
    }
    .week-node[data-status="locked"] .week-title {
      color: var(--text-secondary);
    }

    .week-status-label {
      font-family: var(--font-label);
      font-size: var(--text-xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-tertiary);
    }
    .status-completed { color: var(--color-pass); }
    .status-available { color: var(--color-orange); }

    .chevron-icon {
      color: var(--text-secondary);
      font-size: 24px;
      transition: transform var(--transition-base);
    }

    .week-content {
      border-top: 1px solid var(--border-primary);
      background: var(--surface-primary);
    }

    .learning-item {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-4) var(--space-5);
      border-bottom: 1px solid var(--border-secondary);
      text-decoration: none;
      color: inherit;
      transition: background var(--transition-fast);
    }
    .learning-item:last-child {
      border-bottom: none;
    }
    .learning-item:hover {
      background: var(--surface-secondary);
    }

    .item-icon {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .item-icon .material-symbols-outlined { font-size: 18px; }
    
    .note-icon { background: rgba(37, 99, 235, 0.1); color: var(--color-info); }
    .video-icon { background: rgba(220, 38, 38, 0.1); color: var(--color-fail); }
    .asg-icon { background: var(--color-orange-light); color: var(--color-orange); }

    .item-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .item-title {
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      color: var(--text-primary);
    }
    .item-meta {
      font-size: var(--text-xs);
      color: var(--text-secondary);
    }

    .item-action {
      background: transparent;
      border: none;
      color: var(--text-tertiary);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .item-action .material-symbols-outlined { font-size: 20px; }
    .learning-item:hover .item-action { color: var(--color-orange); transform: translateX(2px); transition: transform var(--transition-fast); }

    .skeleton-header { padding: var(--space-6); }

    @media (max-width: 767px) {
      .weekly-roadmap { padding-left: 0; }
      .timeline-line { display: none; }
      .node-dot { display: none; }
      .week-node { margin-bottom: var(--space-4); }
    }
  `]
})
export class CourseHomeComponent implements OnInit {
  courseId = input<string>('', { alias: 'courseId' });

  readonly course = signal<Course | undefined>(undefined);
  readonly assignments = signal<StudentAssignment[]>([]);
  
  // Set of week numbers that are currently expanded
  readonly openWeeks = signal<Set<number>>(new Set());

  constructor(
    private readonly auth: AuthService,
    private readonly coursesService: CoursesService
  ) {}

  ngOnInit(): void {
    const id = this.courseId();
    this.coursesService.getCourseById(id).subscribe(c => {
      if (c) {
        this.course.set(c);
        
        // Auto-expand the highest available/completed week
        if (c.weeks) {
          const availableWeeks = c.weeks.filter(w => w.status !== 'locked');
          if (availableWeeks.length > 0) {
            const latest = Math.max(...availableWeeks.map(w => w.number));
            this.openWeeks.set(new Set([latest]));
          }
        }
      }
    });
    
    this.coursesService.getStudentAssignments(id, this.auth.currentUser()?.id ?? '').subscribe(a => {
      this.assignments.set(a);
    });
  }

  isWeekOpen(weekNumber: number): boolean {
    return this.openWeeks().has(weekNumber);
  }

  toggleWeek(weekNumber: number, status: string): void {
    if (status === 'locked') return;
    
    const current = new Set(this.openWeeks());
    if (current.has(weekNumber)) {
      current.delete(weekNumber);
    } else {
      current.add(weekNumber);
    }
    this.openWeeks.set(current);
  }

  getAssignmentsForWeek(weekNumber: number): StudentAssignment[] {
    return this.assignments()
      .filter(a => a.week === weekNumber)
      .sort((a, b) => a.day - b.day);
  }

  progressPercent(): number {
    const total = this.assignments().length;
    if (!total) return 0;
    const completed = this.assignments().filter(a => a.studentStatus === 'passed').length;
    return Math.round((completed / total) * 100);
  }

  completedCount(): number {
    return this.assignments().filter(a => a.studentStatus === 'passed').length;
  }

  totalCount(): number {
    return this.assignments().length;
  }

  formatStatus(status: string): string {
    const map: Record<string, string> = {
      not_started: 'Not started', in_progress: 'In progress', passed: 'Passed',
      failed: 'Failed', flagged: 'Flagged', overdue: 'Overdue', submitted: 'Submitted',
    };
    return map[status] ?? status;
  }
}
