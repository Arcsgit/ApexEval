import { Component, ChangeDetectionStrategy, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SuperadminService } from '../../../core/services/superadmin.service';
import { AuditEntry } from '../../../core/models';

@Component({
  selector: 'app-audit-log', standalone: true, imports: [DatePipe, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="page-header"><h1>Audit Log</h1><p class="desc">Track all platform actions and changes.</p></header>
      <div class="filters"><div class="search-wrap"><span class="material-symbols-outlined">search</span><input type="text" [(ngModel)]="search" (ngModelChange)="load()" placeholder="Search actions, actors..." class="search-input" /></div></div>
      <div class="log-list">
        @for (e of entries(); track e.id) {
          <div class="log-entry">
            <div class="entry-icon" [attr.data-role]="e.actorRole"><span class="material-symbols-outlined">{{ getIcon(e.action) }}</span></div>
            <div class="entry-content">
              <div class="entry-header"><span class="actor">{{ e.actorName }}</span><span class="action-text">{{ formatAction(e.action) }}</span><span class="target">{{ e.target }}</span></div>
              @if (e.details) { <div class="entry-details">{{ formatDetails(e.details) }}</div> }
            </div>
            <div class="entry-meta">
              <span class="entry-time">{{ e.timestamp | date:'MMM d, h:mm a' }}</span>
              <span class="entry-result" [attr.data-result]="e.result">{{ e.result }}</span>
            </div>
          </div>
        } @empty { <p class="empty">No audit entries found.</p> }
      </div>
    </div>
  `,
  styles: [`
    .page{max-width:var(--content-max-width)}.page-header{margin-bottom:var(--space-6)}.page-header h1{font-size:var(--text-3xl);font-weight:var(--weight-bold);letter-spacing:-0.02em}.desc{color:var(--text-secondary);margin-top:var(--space-1)}
    .filters{margin-bottom:var(--space-5)}
    .search-wrap{display:flex;align-items:center;gap:var(--space-2);padding:0 var(--space-3);height:36px;border:1px solid var(--border-primary);border-radius:var(--radius-md);max-width:400px}
    .search-wrap .material-symbols-outlined{font-size:18px;color:var(--text-tertiary)}.search-input{border:none;outline:none;background:transparent;flex:1;font-size:var(--text-sm)}
    .log-entry{display:flex;gap:var(--space-3);padding:var(--space-3) 0;border-bottom:1px solid var(--border-secondary)}
    .entry-icon{width:32px;height:32px;border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .entry-icon[data-role="student"]{background:var(--color-running-bg);color:var(--color-running)}
    .entry-icon[data-role="admin"]{background:var(--color-flagged-bg);color:var(--color-flagged)}
    .entry-icon[data-role="superadmin"]{background:var(--color-orange-light);color:var(--color-orange)}
    .entry-icon .material-symbols-outlined{font-size:16px}
    .entry-content{flex:1;min-width:0}
    .entry-header{display:flex;align-items:center;gap:var(--space-2);font-size:var(--text-sm);flex-wrap:wrap}
    .actor{font-weight:var(--weight-semibold)}.action-text{color:var(--text-secondary)}.target{font-weight:var(--weight-medium)}
    .entry-details{font-size:var(--text-xs);color:var(--text-tertiary);margin-top:2px;font-family:var(--font-mono)}
    .entry-meta{display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex-shrink:0}
    .entry-time{font-size:var(--text-xs);color:var(--text-tertiary)}
    .entry-result{font-size:10px;font-weight:var(--weight-semibold);text-transform:uppercase;padding:1px 6px;border-radius:var(--radius-sm)}
    .entry-result[data-result="success"]{color:var(--color-pass);background:var(--color-pass-bg)}
    .entry-result[data-result="failure"]{color:var(--color-fail);background:var(--color-fail-bg)}
    .empty{color:var(--text-tertiary);font-size:var(--text-sm);padding:var(--space-6) 0}
  `]
})
export class AuditLogComponent implements OnInit {
  readonly entries = signal<AuditEntry[]>([]);
  search = '';
  constructor(private svc: SuperadminService) {}
  ngOnInit(): void { this.load(); }
  load(): void { this.svc.getAuditLog({ page: 1, pageSize: 20, search: this.search }).subscribe(r => this.entries.set(r.data)); }
  getIcon(action: string): string {
    if (action.includes('submit')) return 'upload'; if (action.includes('override') || action.includes('grade')) return 'gavel';
    if (action.includes('create')) return 'add_circle'; if (action.includes('update') || action.includes('publish')) return 'edit';
    if (action.includes('login')) return 'login'; if (action.includes('restart')) return 'restart_alt';
    if (action.includes('disable')) return 'block'; return 'receipt_long';
  }
  formatAction(action: string): string { return action.replace('.', ' → '); }
  formatDetails(details: Record<string, unknown>): string { return JSON.stringify(details); }
}
