import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="error-page">
      <span class="material-symbols-outlined error-icon">explore_off</span>
      <h1>404</h1>
      <p class="error-title">Page Not Found</p>
      <p class="error-message">The page you're looking for doesn't exist or has been moved.</p>
      <a routerLink="/" class="error-link">Go home</a>
    </div>
  `,
  styles: [`
    .error-page {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: var(--space-8);
      text-align: center;
    }
    .error-icon { font-size: 48px; color: var(--color-orange); margin-bottom: var(--space-4); }
    h1 { font-size: 72px; font-weight: var(--weight-bold); color: var(--text-primary); line-height: 1; }
    .error-title { font-size: var(--text-xl); font-weight: var(--weight-semibold); margin-top: var(--space-2); }
    .error-message { color: var(--text-secondary); margin-top: var(--space-2); }
    .error-link {
      margin-top: var(--space-6);
      padding: var(--space-2) var(--space-6);
      background: var(--color-orange);
      color: white;
      border-radius: var(--radius-md);
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      transition: background var(--transition-fast);
    }
    .error-link:hover { background: var(--color-orange-hover); }
  `]
})
export class NotFoundComponent {}
