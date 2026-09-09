import { Component, ChangeDetectionStrategy, OnInit, signal } from '@angular/core';
import { SuperadminService } from '../../../core/services/superadmin.service';
import { RunnerHealth, SandboxHealth } from '../../../core/models';

@Component({
  selector: 'app-system-health', standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="page-header"><h1>System Health</h1><p class="desc">Monitor runner infrastructure and sandbox performance.</p></header>
      @if (sandbox(); as sb) {
        <div class="metrics-row">
          <div class="metric"><span class="metric-label">Success Rate</span><span class="metric-value good">{{ sb.successRate }}%</span></div>
          <div class="metric"><span class="metric-label">Avg Execution</span><span class="metric-value">{{ sb.avgExecutionMs }}ms</span></div>
          <div class="metric"><span class="metric-label">Executions (24h)</span><span class="metric-value">{{ sb.totalExecutions24h }}</span></div>
          <div class="metric"><span class="metric-label">Errors (24h)</span><span class="metric-value warn">{{ sb.errorCount24h }}</span></div>
        </div>
      }
      <h2 class="section-title">Runners</h2>
      <div class="runners-grid">
        @for (r of runners(); track r.id) {
          <div class="runner-card" [attr.data-status]="r.status">
            <div class="runner-header"><span class="runner-status-dot" [attr.data-status]="r.status"></span><span class="runner-name">{{ r.name }}</span><span class="runner-tag" [attr.data-status]="r.status">{{ r.status }}</span></div>
            <div class="runner-stats">
              <div class="runner-stat"><span class="label">CPU</span><div class="bar-wrap"><div class="bar" [style.width.%]="r.cpuPercent" [class.danger]="r.cpuPercent > 80"></div></div><span class="val">{{ r.cpuPercent }}%</span></div>
              <div class="runner-stat"><span class="label">Memory</span><div class="bar-wrap"><div class="bar" [style.width.%]="r.memoryPercent" [class.danger]="r.memoryPercent > 80"></div></div><span class="val">{{ r.memoryPercent }}%</span></div>
            </div>
            <div class="runner-detail"><span>Queue: {{ r.queueDepth }}</span><span>Active: {{ r.activeJobs }}</span><span>Avg: {{ r.avgExecutionMs }}ms</span><span>Up: {{ r.uptime }}</span></div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page{max-width:var(--content-max-width)}.page-header{margin-bottom:var(--space-6)}.page-header h1{font-size:var(--text-3xl);font-weight:var(--weight-bold);letter-spacing:-0.02em}.desc{color:var(--text-secondary);margin-top:var(--space-1)}
    .metrics-row{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-4);margin-bottom:var(--space-8)}
    .metric{padding:var(--space-4);border:1px solid var(--border-primary);border-radius:var(--radius-lg);display:flex;flex-direction:column;gap:var(--space-1)}
    .metric-label{font-size:var(--text-xs);color:var(--text-tertiary);font-weight:var(--weight-medium);text-transform:uppercase;letter-spacing:0.04em}
    .metric-value{font-size:var(--text-2xl);font-weight:var(--weight-bold);font-family:var(--font-mono)}.good{color:var(--color-pass)}.warn{color:var(--color-flagged)}
    .section-title{font-size:var(--text-lg);font-weight:var(--weight-semibold);margin-bottom:var(--space-4)}
    .runners-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:var(--space-4)}
    .runner-card{padding:var(--space-4);border:1px solid var(--border-primary);border-radius:var(--radius-lg)}
    .runner-card[data-status="down"]{border-color:var(--color-fail-border);opacity:0.6}
    .runner-card[data-status="degraded"]{border-color:var(--color-flagged-border)}
    .runner-header{display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-3)}
    .runner-status-dot{width:8px;height:8px;border-radius:50%}.runner-status-dot[data-status="healthy"]{background:var(--color-pass)}.runner-status-dot[data-status="degraded"]{background:var(--color-flagged)}.runner-status-dot[data-status="down"]{background:var(--color-fail)}
    .runner-name{flex:1;font-family:var(--font-mono);font-size:var(--text-sm);font-weight:var(--weight-medium)}
    .runner-tag{font-size:10px;font-weight:var(--weight-semibold);text-transform:uppercase;padding:2px 6px;border-radius:var(--radius-sm)}
    .runner-tag[data-status="healthy"]{color:var(--color-pass);background:var(--color-pass-bg)}.runner-tag[data-status="degraded"]{color:var(--color-flagged);background:var(--color-flagged-bg)}.runner-tag[data-status="down"]{color:var(--color-fail);background:var(--color-fail-bg)}
    .runner-stats{display:flex;flex-direction:column;gap:var(--space-2);margin-bottom:var(--space-3)}
    .runner-stat{display:flex;align-items:center;gap:var(--space-2)}.label{font-size:var(--text-xs);color:var(--text-tertiary);width:48px}
    .bar-wrap{flex:1;height:6px;background:var(--color-gray-150);border-radius:var(--radius-full);overflow:hidden}
    .bar{height:100%;background:var(--color-pass);border-radius:var(--radius-full);transition:width var(--transition-slow)}.bar.danger{background:var(--color-fail)}
    .val{font-size:var(--text-xs);font-family:var(--font-mono);color:var(--text-secondary);width:36px;text-align:right}
    .runner-detail{display:flex;gap:var(--space-3);font-size:var(--text-xs);color:var(--text-tertiary);flex-wrap:wrap}
    @media(max-width:767px){.metrics-row{grid-template-columns:repeat(2,1fr)}}
  `]
})
export class SystemHealthComponent implements OnInit {
  readonly runners = signal<RunnerHealth[]>([]);
  readonly sandbox = signal<SandboxHealth | undefined>(undefined);
  constructor(private svc: SuperadminService) {}
  ngOnInit(): void { this.svc.getRunners().subscribe(r => this.runners.set(r)); this.svc.getSandboxHealth().subscribe(s => this.sandbox.set(s)); }
}
