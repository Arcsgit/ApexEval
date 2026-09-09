import { Component, ChangeDetectionStrategy, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubmissionsService } from '../../../core/services/submissions.service';
import { Submission, EvaluationResult } from '../../../core/models';

@Component({
  selector: 'app-global-submissions', standalone: true, imports: [DatePipe, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="page-header"><h1>All Submissions</h1><p class="desc">Platform-wide submission monitoring.</p></header>
      <div class="filters"><div class="search-wrap"><span class="material-symbols-outlined">search</span><input type="text" [(ngModel)]="search" (ngModelChange)="load()" placeholder="Search..." class="search-input" /></div>
        <select [(ngModel)]="statusFilter" (ngModelChange)="load()" class="filter-select"><option value="">All</option><option value="pass">Passed</option><option value="fail">Failed</option><option value="flagged_for_review">Flagged</option></select>
      </div>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>Student</th><th>Assignment</th><th>Course</th><th>Submitted</th><th>Status</th><th>Score</th></tr></thead>
        <tbody>@for (s of submissions(); track s.id) {
          <tr><td class="primary">{{ s.studentName }}</td><td>{{ s.assignmentTitle }}</td><td>{{ s.courseName }}</td><td>{{ s.submittedAt | date:'MMM d, h:mm a' }}</td>
          <td><span class="badge" [attr.data-r]="s.result">{{ fmt(s.result) }}</span></td><td class="mono">{{ s.score }}%</td></tr>
        } @empty { <tr><td colspan="6"><div class="empty"><span class="material-symbols-outlined">inbox</span><p>No submissions</p></div></td></tr> }</tbody></table></div>
    </div>
  `,
  styles: [`
    .page{max-width:var(--content-max-width)}.page-header{margin-bottom:var(--space-6)}.page-header h1{font-size:var(--text-3xl);font-weight:var(--weight-bold);letter-spacing:-0.02em}.desc{color:var(--text-secondary);margin-top:var(--space-1)}
    .filters{display:flex;gap:var(--space-3);margin-bottom:var(--space-5);flex-wrap:wrap}
    .search-wrap{display:flex;align-items:center;gap:var(--space-2);padding:0 var(--space-3);height:36px;border:1px solid var(--border-primary);border-radius:var(--radius-md);flex:1;min-width:200px}.search-wrap .material-symbols-outlined{font-size:18px;color:var(--text-tertiary)}.search-input{border:none;outline:none;background:transparent;flex:1;font-size:var(--text-sm)}
    .filter-select{height:36px;padding:0 var(--space-3);border:1px solid var(--border-primary);border-radius:var(--radius-md);font-size:var(--text-sm);background:var(--surface-primary)}
    .table-wrap{overflow-x:auto;border:1px solid var(--border-primary);border-radius:var(--radius-lg)}.data-table{width:100%;border-collapse:collapse}
    .data-table th{padding:var(--space-3) var(--space-4);font-size:var(--text-xs);font-weight:var(--weight-semibold);text-transform:uppercase;letter-spacing:0.04em;color:var(--text-tertiary);text-align:left;background:var(--surface-secondary);border-bottom:1px solid var(--border-primary)}
    .data-table td{padding:var(--space-3) var(--space-4);font-size:var(--text-sm);color:var(--text-secondary);border-bottom:1px solid var(--border-secondary)}.primary{color:var(--text-primary);font-weight:var(--weight-medium)}.mono{font-family:var(--font-mono)}
    .badge{font-size:10px;font-weight:var(--weight-semibold);text-transform:uppercase;padding:2px 8px;border-radius:var(--radius-sm)}.badge[data-r="pass"]{color:var(--color-pass);background:var(--color-pass-bg)}.badge[data-r="fail"]{color:var(--color-fail);background:var(--color-fail-bg)}.badge[data-r="flagged_for_review"]{color:var(--color-flagged);background:var(--color-flagged-bg)}
    .empty{display:flex;flex-direction:column;align-items:center;padding:var(--space-10);color:var(--text-tertiary)}.empty .material-symbols-outlined{font-size:40px;margin-bottom:var(--space-2)}
  `]
})
export class GlobalSubmissionsComponent implements OnInit {
  readonly submissions = signal<Submission[]>([]);
  search = ''; statusFilter = '';
  constructor(private svc: SubmissionsService) {}
  ngOnInit(): void { this.load(); }
  load(): void { this.svc.getSubmissions({ page: 1, pageSize: 20, search: this.search, status: (this.statusFilter || undefined) as EvaluationResult | undefined }).subscribe(r => this.submissions.set(r.data)); }
  fmt(r?: string): string { return { pass: 'Passed', fail: 'Failed', flagged_for_review: 'Flagged', running: 'Running' }[r ?? ''] ?? r ?? ''; }
}
