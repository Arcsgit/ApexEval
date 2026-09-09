import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({ selector: 'app-admin-assignment-detail', standalone: true, imports: [RouterLink], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="page"><nav class="breadcrumb"><a routerLink="/admin/courses">Courses</a><span class="material-symbols-outlined">chevron_right</span><span>Assignment Detail</span></nav><h1>Assignment Detail</h1><p class="desc">View assignment details and submissions.</p></div>`,
  styles: [`.page{max-width:var(--content-max-width)}.breadcrumb{display:flex;align-items:center;gap:var(--space-1);font-size:var(--text-sm);color:var(--text-tertiary);margin-bottom:var(--space-6)}.breadcrumb a{color:var(--text-secondary)}.breadcrumb a:hover{color:var(--color-orange)}.breadcrumb .material-symbols-outlined{font-size:16px}h1{font-size:var(--text-2xl);font-weight:var(--weight-bold)}.desc{color:var(--text-secondary);margin-top:var(--space-2)}`]
})
export class AdminAssignmentDetailComponent { courseId = input(''); assignmentId = input(''); }
