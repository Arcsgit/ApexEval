import { Component, ChangeDetectionStrategy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { SuperadminService } from '../../../core/services/superadmin.service';
import { PlatformMetrics, RunnerHealth, CurrentJob } from '../../../core/models';

@Component({
  selector: 'app-superadmin-dashboard', standalone: true, imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="page-header"><h1>Platform Overview</h1><p class="desc">System status and platform health at a glance.</p></header>
      <div class="stats-row">
        <div class="stat-card"><div class="stat-value">{{ metrics()?.activeRunners }} / {{ metrics()?.totalRunners }}</div><div class="stat-label">Active Runners</div></div>
        <div class="stat-card"><div class="stat-value">{{ metrics()?.queueDepth }}</div><div class="stat-label">Queue Depth</div></div>
        <div class="stat-card"><div class="stat-value">{{ metrics()?.submissions24h }}</div><div class="stat-label">Submissions (24h)</div></div>
        <div class="stat-card"><div class="stat-value">{{ metrics()?.activeStudents24h }}</div><div class="stat-label">Active Students (24h)</div></div>
        <div class="stat-card"><div class="stat-value">{{ metrics()?.p95LatencyMs }}ms</div><div class="stat-label">P95 Latency</div></div>
        <div class="stat-card"><div class="stat-value">{{ metrics()?.cacheHitRate }}%</div><div class="stat-label">Cache Hit Rate</div></div>
      </div>

      <div class="grid-2">
        <section class="section">
          <div class="section-header"><h2>Runner Status</h2><a routerLink="/superadmin/health" class="view-all">View all</a></div>
          <div class="runners-list">
            @for (r of runners(); track r.id) {
              <div class="runner-row">
                <span class="runner-status-dot" [attr.data-status]="r.status"></span>
                <span class="runner-name">{{ r.name }}</span>
                <span class="runner-meta">CPU {{ r.cpuPercent }}% · Mem {{ r.memoryPercent }}%</span>
                <span class="runner-tag" [attr.data-status]="r.status">{{ r.status }}</span>
              </div>
            }
          </div>
        </section>

        <section class="section">
          <div class="section-header"><h2>Active Jobs</h2></div>
          <div class="jobs-list">
            @for (j of jobs(); track j.id) {
              <div class="job-row">
                <div class="job-info">
                  <span class="job-student">{{ j.studentName }}</span>
                  <span class="job-assignment">{{ j.assignmentTitle }}</span>
                </div>
                <span class="job-runner">{{ j.runnerName }}</span>
                <span class="job-tag" [attr.data-status]="j.status">{{ j.status }}</span>
              </div>
            } @empty { <p class="empty-text">No active jobs</p> }
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .page{max-width:var(--content-max-width)}.page-header{margin-bottom:var(--space-6)}.page-header h1{font-size:var(--text-3xl);font-weight:var(--weight-bold);letter-spacing:-0.02em}.desc{color:var(--text-secondary);margin-top:var(--space-1)}
    .stats-row{display:grid;grid-template-columns:repeat(6,1fr);gap:var(--space-3);margin-bottom:var(--space-6)}
    .stat-card{padding:var(--space-4);border:1px solid var(--border-primary);border-radius:var(--radius-lg)}
    .stat-value{font-size:var(--text-xl);font-weight:var(--weight-bold);letter-spacing:-0.02em;font-family:var(--font-mono)}
    .stat-label{font-size:var(--text-xs);color:var(--text-secondary);margin-top:var(--space-1)}
    .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-6)}
    .section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-4)}
    .section-header h2{font-size:var(--text-lg);font-weight:var(--weight-semibold)}
    .view-all{font-size:var(--text-sm);color:var(--color-orange);font-weight:var(--weight-medium)}
    .runner-row{display:flex;align-items:center;gap:var(--space-3);padding:var(--space-2) 0;border-bottom:1px solid var(--border-secondary);font-size:var(--text-sm)}
    .runner-status-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
    .runner-status-dot[data-status="healthy"]{background:var(--color-pass)}.runner-status-dot[data-status="degraded"]{background:var(--color-flagged)}.runner-status-dot[data-status="down"]{background:var(--color-fail)}
    .runner-name{font-weight:var(--weight-medium);font-family:var(--font-mono);font-size:var(--text-xs);flex:1}
    .runner-meta{font-size:var(--text-xs);color:var(--text-tertiary)}
    .runner-tag,.job-tag{font-size:10px;font-weight:var(--weight-semibold);text-transform:uppercase;padding:2px 6px;border-radius:var(--radius-sm)}
    .runner-tag[data-status="healthy"]{color:var(--color-pass);background:var(--color-pass-bg)}.runner-tag[data-status="degraded"]{color:var(--color-flagged);background:var(--color-flagged-bg)}.runner-tag[data-status="down"]{color:var(--color-fail);background:var(--color-fail-bg)}
    .job-row{display:flex;align-items:center;gap:var(--space-3);padding:var(--space-2) 0;border-bottom:1px solid var(--border-secondary);font-size:var(--text-sm)}
    .job-info{flex:1;display:flex;flex-direction:column;gap:1px}.job-student{font-weight:var(--weight-medium)}.job-assignment{font-size:var(--text-xs);color:var(--text-tertiary)}
    .job-runner{font-family:var(--font-mono);font-size:var(--text-xs);color:var(--text-tertiary)}
    .job-tag[data-status="running"]{color:var(--color-running);background:var(--color-running-bg)}.job-tag[data-status="queued"]{color:var(--color-queued);background:var(--color-queued-bg)}
    .empty-text{font-size:var(--text-sm);color:var(--text-tertiary);padding:var(--space-4) 0}
    @media(max-width:1200px){.stats-row{grid-template-columns:repeat(3,1fr)}}
    @media(max-width:1023px){.grid-2{grid-template-columns:1fr}.stats-row{grid-template-columns:repeat(2,1fr)}}
  `]
})
export class SuperadminDashboardComponent implements OnInit {
  readonly metrics = signal<PlatformMetrics | undefined>(undefined);
  readonly runners = signal<RunnerHealth[]>([]);
  readonly jobs = signal<CurrentJob[]>([]);
  constructor(readonly auth: AuthService, private svc: SuperadminService) {}
  ngOnInit(): void {
    this.svc.getPlatformMetrics().subscribe(m => this.metrics.set(m));
    this.svc.getRunners().subscribe(r => this.runners.set(r));
    this.svc.getCurrentJobs().subscribe(j => this.jobs.set(j));
  }
}
