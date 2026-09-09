import { Component, ChangeDetectionStrategy, signal, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CoursesService } from '../../../core/services/courses.service';
import { ProgrammingLanguage } from '../../../core/models';

@Component({
  selector: 'app-assignment-creator', standalone: true, imports: [RouterLink, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <nav class="breadcrumb"><a routerLink="/admin/courses">Courses</a><span class="material-symbols-outlined">chevron_right</span><span>New Assignment</span></nav>
      <h1>Create Assignment</h1>
      <p class="subtitle">Step {{ step() }} of 4</p>

      <div class="stepper">
        @for (s of steps; track s.n) {
          <div class="step" [class.active]="step() === s.n" [class.done]="step() > s.n">
            <div class="step-circle">{{ step() > s.n ? '✓' : s.n }}</div>
            <span class="step-label">{{ s.label }}</span>
          </div>
        }
      </div>

      <div class="step-content">
        @switch (step()) {
          @case (1) {
            <div class="form-group"><label>Title</label><input [(ngModel)]="title" class="input" placeholder="Assignment title" /></div>
            <div class="form-group"><label>Description</label><textarea [(ngModel)]="description" class="textarea" rows="4" placeholder="Describe the assignment..."></textarea></div>
            <div class="form-group"><label>Difficulty</label>
              <select [(ngModel)]="difficulty" class="input"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select>
            </div>
          }
          @case (2) {
            <div class="form-group"><label>Runtime Limit (ms)</label><input type="number" [(ngModel)]="runtimeMs" class="input" /></div>
            <div class="form-group"><label>Memory Limit (MB)</label><input type="number" [(ngModel)]="memoryMb" class="input" /></div>
            <div class="form-group"><label>Max Attempts</label><input type="number" [(ngModel)]="maxAttempts" class="input" /></div>
          }
          @case (3) {
            <div class="form-group"><label>Due Date</label><input type="datetime-local" [(ngModel)]="dueDate" class="input" /></div>
            <div class="form-group"><label>Week</label><input type="number" [(ngModel)]="week" class="input" min="1" /></div>
            <div class="form-group"><label>Day</label><input type="number" [(ngModel)]="day" class="input" min="1" max="7" /></div>
          }
          @case (4) {
            <div class="review">
              <h3>Review</h3>
              <div class="review-row"><span class="label">Title</span><span>{{ title }}</span></div>
              <div class="review-row"><span class="label">Difficulty</span><span>{{ difficulty }}</span></div>
              <div class="review-row"><span class="label">Runtime</span><span>{{ runtimeMs }}ms</span></div>
              <div class="review-row"><span class="label">Memory</span><span>{{ memoryMb }}MB</span></div>
              <div class="review-row"><span class="label">Max Attempts</span><span>{{ maxAttempts }}</span></div>
              <div class="review-row"><span class="label">Week/Day</span><span>W{{ week }}D{{ day }}</span></div>
            </div>
          }
        }
      </div>

      <div class="actions">
        <button class="btn-secondary" [disabled]="step() <= 1" (click)="prevStep()">Back</button>
        @if (step() < 4) {
          <button class="btn-primary" (click)="nextStep()">Next</button>
        } @else {
          <button class="btn-primary" (click)="create()">Create Assignment</button>
        }
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 640px; }
    .breadcrumb { display: flex; align-items: center; gap: var(--space-1); font-size: var(--text-sm); color: var(--text-tertiary); margin-bottom: var(--space-6); }
    .breadcrumb a { color: var(--text-secondary); } .breadcrumb a:hover { color: var(--color-orange); }
    .breadcrumb .material-symbols-outlined { font-size: 16px; }
    h1 { font-size: var(--text-2xl); font-weight: var(--weight-bold); }
    .subtitle { color: var(--text-secondary); margin-top: var(--space-1); margin-bottom: var(--space-6); }
    .stepper { display: flex; gap: var(--space-4); margin-bottom: var(--space-8); }
    .step { display: flex; align-items: center; gap: var(--space-2); }
    .step-circle { width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--border-primary); display: flex; align-items: center; justify-content: center; font-size: var(--text-xs); font-weight: var(--weight-semibold); }
    .step.active .step-circle { border-color: var(--color-orange); background: var(--color-orange); color: white; }
    .step.done .step-circle { border-color: var(--color-pass); background: var(--color-pass); color: white; }
    .step-label { font-size: var(--text-sm); color: var(--text-tertiary); }
    .step.active .step-label { color: var(--text-primary); font-weight: var(--weight-medium); }
    .form-group { margin-bottom: var(--space-5); }
    .form-group label { display: block; font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--text-secondary); margin-bottom: var(--space-2); }
    .input, .textarea { width: 100%; padding: var(--space-2) var(--space-3); border: 1px solid var(--border-primary); border-radius: var(--radius-md); font-size: var(--text-sm); background: var(--surface-primary); color: var(--text-primary); }
    .input:focus, .textarea:focus { border-color: var(--color-orange); outline: none; box-shadow: 0 0 0 3px var(--color-orange-light); }
    .textarea { resize: vertical; font-family: var(--font-sans); }
    .review-row { display: flex; gap: var(--space-4); padding: var(--space-2) 0; border-bottom: 1px solid var(--border-secondary); font-size: var(--text-sm); }
    .review-row .label { font-weight: var(--weight-medium); color: var(--text-secondary); min-width: 120px; }
    .actions { display: flex; justify-content: space-between; margin-top: var(--space-8); padding-top: var(--space-5); border-top: 1px solid var(--border-primary); }
    .btn-primary { padding: var(--space-2) var(--space-5); background: var(--color-orange); color: white; border-radius: var(--radius-md); font-size: var(--text-sm); font-weight: var(--weight-semibold); }
    .btn-primary:hover { background: var(--color-orange-hover); }
    .btn-secondary { padding: var(--space-2) var(--space-5); border: 1px solid var(--border-primary); border-radius: var(--radius-md); font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--text-secondary); }
    .btn-secondary:hover { background: var(--surface-secondary); }
    .btn-secondary:disabled { opacity: 0.4; cursor: not-allowed; }
  `]
})
export class AssignmentCreatorComponent {
  courseId = input<string>('', { alias: 'courseId' });
  readonly step = signal(1);
  title = ''; description = ''; difficulty = 'medium'; runtimeMs = 10000; memoryMb = 256; maxAttempts = 5;
  dueDate = ''; week = 1; day = 1;
  readonly steps = [{ n: 1, label: 'Basics' }, { n: 2, label: 'Runtime' }, { n: 3, label: 'Schedule' }, { n: 4, label: 'Review' }];

  constructor(private coursesService: CoursesService, private router: Router) {}

  prevStep(): void {
    this.step.update(s => s - 1);
  }

  nextStep(): void {
    this.step.update(s => s + 1);
  }

  create(): void {
    this.coursesService.createAssignment({
      courseId: this.courseId(), title: this.title, description: this.description,
      difficulty: this.difficulty as 'easy'|'medium'|'hard', runtimeLimitMs: this.runtimeMs,
      memoryLimitMb: this.memoryMb, maxAttempts: this.maxAttempts, week: this.week, day: this.day,
      dueDate: new Date(this.dueDate).toISOString(),
    }).subscribe(() => this.router.navigate(['/admin/courses', this.courseId()]));
  }
}
