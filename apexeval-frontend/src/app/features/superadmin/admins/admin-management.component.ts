import { Component, ChangeDetectionStrategy, OnInit, signal } from '@angular/core';
import { SuperadminService } from '../../../core/services/superadmin.service';
import { User } from '../../../core/models';

@Component({
  selector: 'app-admin-management', standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="page-header"><div><h1>Administrators</h1><p class="desc">Manage platform administrators and their permissions.</p></div>
        <button class="btn-primary" (click)="showCreate.set(true)"><span class="material-symbols-outlined">person_add</span> Add Admin</button>
      </header>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>@for (a of admins(); track a.id) {
          <tr><td class="primary">{{ a.firstName }} {{ a.lastName }}</td><td>{{ a.email }}</td>
          <td><span class="role-badge">{{ a.role }}</span></td>
          <td><span class="status-dot" [class.active]="a.isActive"></span> {{ a.isActive ? 'Active' : 'Disabled' }}</td>
          <td><button class="action-btn" (click)="toggleStatus(a.id)">{{ a.isActive ? 'Disable' : 'Enable' }}</button></td></tr>
        }</tbody></table></div>
    </div>
  `,
  styles: [`
    .page{max-width:var(--content-max-width)}.page-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:var(--space-6)}.page-header h1{font-size:var(--text-3xl);font-weight:var(--weight-bold);letter-spacing:-0.02em}.desc{color:var(--text-secondary);margin-top:var(--space-1)}
    .btn-primary{display:flex;align-items:center;gap:var(--space-2);padding:var(--space-2) var(--space-4);background:var(--color-orange);color:white;border-radius:var(--radius-md);font-size:var(--text-sm);font-weight:var(--weight-semibold)}.btn-primary:hover{background:var(--color-orange-hover)}.btn-primary .material-symbols-outlined{font-size:18px}
    .table-wrap{overflow-x:auto;border:1px solid var(--border-primary);border-radius:var(--radius-lg)}.data-table{width:100%;border-collapse:collapse}
    .data-table th{padding:var(--space-3) var(--space-4);font-size:var(--text-xs);font-weight:var(--weight-semibold);text-transform:uppercase;letter-spacing:0.04em;color:var(--text-tertiary);text-align:left;background:var(--surface-secondary);border-bottom:1px solid var(--border-primary)}
    .data-table td{padding:var(--space-3) var(--space-4);font-size:var(--text-sm);color:var(--text-secondary);border-bottom:1px solid var(--border-secondary)}.primary{color:var(--text-primary);font-weight:var(--weight-medium)}
    .role-badge{font-size:10px;font-weight:var(--weight-semibold);text-transform:uppercase;padding:2px 8px;border-radius:var(--radius-sm);background:var(--color-orange-light);color:var(--color-orange)}
    .status-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--color-fail);margin-right:var(--space-1)}.status-dot.active{background:var(--color-pass)}
    .action-btn{font-size:var(--text-sm);color:var(--color-orange);font-weight:var(--weight-medium);padding:var(--space-1) var(--space-2);border-radius:var(--radius-sm)}.action-btn:hover{background:var(--color-orange-lighter)}
  `]
})
export class AdminManagementComponent implements OnInit {
  readonly admins = signal<User[]>([]);
  readonly showCreate = signal(false);
  constructor(private svc: SuperadminService) {}
  ngOnInit(): void { this.svc.getAdministrators().subscribe(a => this.admins.set(a)); }
  toggleStatus(id: string): void { this.svc.toggleAdminStatus(id).subscribe(() => this.svc.getAdministrators().subscribe(a => this.admins.set(a))); }
}
