import { Component, ChangeDetectionStrategy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SuperadminService } from '../../../core/services/superadmin.service';
import { PlatformSettings } from '../../../core/models';

@Component({
  selector: 'app-platform-settings', standalone: true, imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="page-header"><h1>Platform Settings</h1><p class="desc">Configure platform-wide settings and feature flags.</p></header>
      @if (settings(); as s) {
        <div class="sections">
          <section class="settings-section">
            <h2>Execution</h2>
            <div class="setting-row"><label>Default Timeout (ms)</label><input type="number" [(ngModel)]="s.execution.defaultTimeoutMs" class="input" /></div>
            <div class="setting-row"><label>Max Timeout (ms)</label><input type="number" [(ngModel)]="s.execution.maxTimeoutMs" class="input" /></div>
            <div class="setting-row"><label>Default Memory (MB)</label><input type="number" [(ngModel)]="s.execution.defaultMemoryMb" class="input" /></div>
            <div class="setting-row"><label>Max Concurrent Jobs</label><input type="number" [(ngModel)]="s.execution.maxConcurrentJobs" class="input" /></div>
          </section>
          <section class="settings-section">
            <h2>Rate Limits</h2>
            <div class="setting-row"><label>Submissions/Hour</label><input type="number" [(ngModel)]="s.rateLimits.submissionsPerHour" class="input" /></div>
            <div class="setting-row"><label>API Requests/Minute</label><input type="number" [(ngModel)]="s.rateLimits.apiRequestsPerMinute" class="input" /></div>
            <div class="setting-row"><label>Max Attempts/Assignment</label><input type="number" [(ngModel)]="s.rateLimits.maxAttemptsPerAssignment" class="input" /></div>
          </section>
          <section class="settings-section">
            <h2>Feature Flags</h2>
            <div class="toggle-row"><label>Diff Viewer</label><input type="checkbox" [(ngModel)]="s.featureFlags.enableDiffViewer" /></div>
            <div class="toggle-row"><label>Static Analysis</label><input type="checkbox" [(ngModel)]="s.featureFlags.enableStaticAnalysis" /></div>
            <div class="toggle-row"><label>DB Verification</label><input type="checkbox" [(ngModel)]="s.featureFlags.enableDbVerification" /></div>
            <div class="toggle-row"><label>Auto Grading</label><input type="checkbox" [(ngModel)]="s.featureFlags.enableAutoGrading" /></div>
          </section>
          <div class="actions">
            <button class="btn-primary" (click)="save()">{{ saving() ? 'Saving…' : 'Save Settings' }}</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page{max-width:640px}.page-header{margin-bottom:var(--space-6)}.page-header h1{font-size:var(--text-3xl);font-weight:var(--weight-bold);letter-spacing:-0.02em}.desc{color:var(--text-secondary);margin-top:var(--space-1)}
    .settings-section{margin-bottom:var(--space-8);padding-bottom:var(--space-6);border-bottom:1px solid var(--border-primary)}
    .settings-section h2{font-size:var(--text-lg);font-weight:var(--weight-semibold);margin-bottom:var(--space-4)}
    .setting-row{display:flex;align-items:center;justify-content:space-between;padding:var(--space-3) 0;border-bottom:1px solid var(--border-secondary)}
    .setting-row label{font-size:var(--text-sm);font-weight:var(--weight-medium);color:var(--text-secondary)}
    .input{width:120px;padding:var(--space-1) var(--space-2);border:1px solid var(--border-primary);border-radius:var(--radius-sm);font-size:var(--text-sm);text-align:right;background:var(--surface-primary);color:var(--text-primary)}
    .input:focus{border-color:var(--color-orange);outline:none;box-shadow:0 0 0 2px var(--color-orange-light)}
    .toggle-row{display:flex;align-items:center;justify-content:space-between;padding:var(--space-3) 0;border-bottom:1px solid var(--border-secondary)}
    .toggle-row label{font-size:var(--text-sm);font-weight:var(--weight-medium);color:var(--text-secondary)}
    .toggle-row input[type="checkbox"]{width:18px;height:18px;accent-color:var(--color-orange)}
    .actions{margin-top:var(--space-6)}.btn-primary{padding:var(--space-2) var(--space-6);background:var(--color-orange);color:white;border-radius:var(--radius-md);font-size:var(--text-sm);font-weight:var(--weight-semibold)}.btn-primary:hover{background:var(--color-orange-hover)}
  `]
})
export class PlatformSettingsComponent implements OnInit {
  readonly settings = signal<PlatformSettings | undefined>(undefined);
  readonly saving = signal(false);
  constructor(private svc: SuperadminService) {}
  ngOnInit(): void { this.svc.getSettings().subscribe(s => this.settings.set(s)); }
  save(): void {
    const s = this.settings();
    if (!s) return;
    this.saving.set(true);
    this.svc.updateSettings(s).subscribe(() => this.saving.set(false));
  }
}
