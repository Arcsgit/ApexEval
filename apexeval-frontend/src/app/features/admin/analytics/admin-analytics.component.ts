import { Component, ChangeDetectionStrategy } from '@angular/core';
@Component({ selector: 'app-admin-analytics', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="page"><h1>Analytics</h1><p class="desc">Course performance analytics and insights.</p><div class="placeholder"><span class="material-symbols-outlined">bar_chart</span><p>Analytics charts will be rendered here with Chart.js integration.</p></div></div>`,
  styles: [`.page{max-width:var(--content-max-width)}h1{font-size:var(--text-3xl);font-weight:var(--weight-bold);letter-spacing:-0.02em;margin-bottom:var(--space-2)}.desc{color:var(--text-secondary);margin-bottom:var(--space-8)}.placeholder{display:flex;flex-direction:column;align-items:center;padding:var(--space-16);border:1px dashed var(--border-primary);border-radius:var(--radius-lg);text-align:center;color:var(--text-tertiary)}.placeholder .material-symbols-outlined{font-size:48px;margin-bottom:var(--space-3)}`]
})
export class AdminAnalyticsComponent {}
