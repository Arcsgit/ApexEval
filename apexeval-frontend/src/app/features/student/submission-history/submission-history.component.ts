/* ============================================================
   ApexEval — Submission History Component
   ============================================================ */

import { Component, ChangeDetectionStrategy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { SubmissionsService } from '../../../core/services/submissions.service';
import { Submission, PaginatedResponse, EvaluationResult } from '../../../core/models';

@Component({
  selector: 'app-submission-history',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="history">
      <header class="page-header">
        <h1>Submission History</h1>
        <p class="page-desc">View all your past submissions and results.</p>
      </header>

      <!-- Filters -->
      <div class="filters-bar">
        <div class="search-input-wrap">
          <span class="material-symbols-outlined search-icon">search</span>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearch()"
            placeholder="Search assignments..."
            class="search-input" />
        </div>
        <select [(ngModel)]="statusFilter" (ngModelChange)="loadSubmissions()" class="filter-select">
          <option value="">All statuses</option>
          <option value="pass">Passed</option>
          <option value="fail">Failed</option>
          <option value="flagged_for_review">Flagged</option>
          <option value="running">Running</option>
        </select>
      </div>

      <!-- Table -->
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Assignment</th>
              <th>Course</th>
              <th>Attempt</th>
              <th>Submitted</th>
              <th>Status</th>
              <th>Score</th>
              <th>Duration</th>
            </tr>
          </thead>
          <tbody>
            @for (sub of submissions(); track sub.id) {
              <tr class="table-row" [routerLink]="['/student/submissions', sub.id]">
                <td class="cell-primary">{{ sub.assignmentTitle }}</td>
                <td>{{ sub.courseName }}</td>
                <td class="cell-center">#{{ sub.attempt }}</td>
                <td>{{ sub.submittedAt | date:'MMM d, h:mm a' }}</td>
                <td>
                  <span class="status-badge" [attr.data-result]="sub.result">
                    {{ formatResult(sub.result) }}
                  </span>
                </td>
                <td class="cell-mono">{{ sub.score ?? '—' }}%</td>
                <td class="cell-mono">{{ sub.executionDurationMs ? ((sub.executionDurationMs / 1000).toFixed(1) + 's') : '—' }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7">
                  <div class="empty-state">
                    <span class="material-symbols-outlined">history</span>
                    <p class="empty-title">No submissions yet</p>
                    <p class="empty-desc">Your submitted assignments will appear here.</p>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      @if (totalPages() > 1) {
        <div class="pagination">
          <button class="page-btn" [disabled]="currentPage() <= 1" (click)="changePage(currentPage() - 1)">
            <span class="material-symbols-outlined">chevron_left</span>
          </button>
          <span class="page-info">Page {{ currentPage() }} of {{ totalPages() }}</span>
          <button class="page-btn" [disabled]="currentPage() >= totalPages()" (click)="changePage(currentPage() + 1)">
            <span class="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .history { max-width: var(--content-max-width); }
    .page-header { margin-bottom: var(--space-6); }
    .page-header h1 { font-size: var(--text-3xl); font-weight: var(--weight-bold); letter-spacing: -0.02em; }
    .page-desc { color: var(--text-secondary); margin-top: var(--space-1); }

    .filters-bar {
      display: flex; gap: var(--space-3); margin-bottom: var(--space-5); flex-wrap: wrap;
    }
    .search-input-wrap {
      display: flex; align-items: center; gap: var(--space-2);
      padding: 0 var(--space-3); height: 36px;
      border: 1px solid var(--border-primary); border-radius: var(--radius-md);
      flex: 1; min-width: 200px;
    }
    .search-icon { font-size: 18px; color: var(--text-tertiary); }
    .search-input { border: none; outline: none; background: transparent; flex: 1; font-size: var(--text-sm); color: var(--text-primary); }
    .search-input::placeholder { color: var(--text-disabled); }

    .filter-select {
      height: 36px; padding: 0 var(--space-3);
      border: 1px solid var(--border-primary); border-radius: var(--radius-md);
      font-size: var(--text-sm); background: var(--surface-primary); color: var(--text-primary);
    }

    .table-container { overflow-x: auto; border: 1px solid var(--border-primary); border-radius: var(--radius-lg); }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th {
      padding: var(--space-3) var(--space-4);
      font-size: var(--text-xs); font-weight: var(--weight-semibold);
      text-transform: uppercase; letter-spacing: 0.04em;
      color: var(--text-tertiary); text-align: left;
      background: var(--surface-secondary); border-bottom: 1px solid var(--border-primary);
    }
    .data-table td {
      padding: var(--space-3) var(--space-4);
      font-size: var(--text-sm); color: var(--text-secondary);
      border-bottom: 1px solid var(--border-secondary);
    }
    .table-row { cursor: pointer; transition: background var(--transition-fast); }
    .table-row:hover { background: var(--surface-secondary); }
    .cell-primary { color: var(--text-primary); font-weight: var(--weight-medium); }
    .cell-center { text-align: center; }
    .cell-mono { font-family: var(--font-mono); }

    .status-badge {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 10px; font-weight: var(--weight-semibold);
      text-transform: uppercase; letter-spacing: 0.04em;
      padding: 2px 8px; border-radius: var(--radius-sm);
    }
    .status-badge[data-result="pass"] { color: var(--color-pass); background: var(--color-pass-bg); }
    .status-badge[data-result="fail"] { color: var(--color-fail); background: var(--color-fail-bg); }
    .status-badge[data-result="flagged_for_review"] { color: var(--color-flagged); background: var(--color-flagged-bg); }
    .status-badge[data-result="running"] { color: var(--color-running); background: var(--color-running-bg); }

    .empty-state {
      display: flex; flex-direction: column; align-items: center; padding: var(--space-10); text-align: center;
    }
    .empty-state .material-symbols-outlined { font-size: 40px; color: var(--text-disabled); margin-bottom: var(--space-3); }
    .empty-title { font-weight: var(--weight-medium); }
    .empty-desc { font-size: var(--text-sm); color: var(--text-secondary); margin-top: var(--space-1); }

    .pagination {
      display: flex; align-items: center; justify-content: center; gap: var(--space-3);
      margin-top: var(--space-4);
    }
    .page-btn {
      display: flex; align-items: center; justify-content: center;
      width: 32px; height: 32px; border-radius: var(--radius-md);
      border: 1px solid var(--border-primary);
      transition: all var(--transition-fast);
    }
    .page-btn:hover:not(:disabled) { background: var(--surface-secondary); }
    .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .page-btn .material-symbols-outlined { font-size: 18px; }
    .page-info { font-size: var(--text-sm); color: var(--text-secondary); }

    @media (max-width: 767px) {
      .filters-bar { flex-direction: column; }
      .search-input-wrap { min-width: 100%; }
    }
  `]
})
export class SubmissionHistoryComponent implements OnInit {
  readonly submissions = signal<Submission[]>([]);
  readonly currentPage = signal(1);
  readonly totalPages = signal(1);
  searchQuery = '';
  statusFilter = '';

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly auth: AuthService,
    private readonly submissionsService: SubmissionsService
  ) {}

  ngOnInit(): void {
    this.loadSubmissions();
  }

  loadSubmissions(): void {
    this.submissionsService.getSubmissions({
      studentId: this.auth.currentUser()?.id ?? '',
      page: this.currentPage(),
      pageSize: 10,
      sortBy: 'submittedAt',
      sortDirection: 'desc',
      search: this.searchQuery,
      status: (this.statusFilter || undefined) as EvaluationResult | undefined,
    }).subscribe(r => {
      this.submissions.set(r.data);
      this.totalPages.set(r.totalPages);
    });
  }

  onSearch(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.currentPage.set(1);
      this.loadSubmissions();
    }, 300);
  }

  changePage(page: number): void {
    this.currentPage.set(page);
    this.loadSubmissions();
  }

  formatResult(result?: string): string {
    const map: Record<string, string> = {
      pass: 'Passed', fail: 'Failed', flagged_for_review: 'Flagged',
      running: 'Running', queued: 'Queued', error: 'Error',
    };
    return map[result ?? ''] ?? result ?? '';
  }
}
