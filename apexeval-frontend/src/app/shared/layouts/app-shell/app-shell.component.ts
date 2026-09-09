/* ============================================================
   ApexEval — Application Shell Component
   ============================================================ */

import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FloatingNavComponent } from '../floating-nav/floating-nav.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, FloatingNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app-shell">
      <app-floating-nav />
      <main class="app-content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .app-shell {
      min-height: 100vh;
      background: var(--surface-primary);
    }

    .app-content {
      /* Clear the floating nav: nav-top (12px) + nav-height (56px) + gap (12px) */
      padding-top: 80px;
      padding-left: var(--space-6);
      padding-right: var(--space-6);
      padding-bottom: var(--space-6);
      max-width: 100%;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
    }

    ::ng-deep .app-content > :not(router-outlet) {
      width: 100%;
      margin: 0 auto;
    }

    @media (max-width: 1023px) {
      .app-content {
        padding: 80px var(--space-4) var(--space-4);
      }
    }

    @media (max-width: 767px) {
      .app-content {
        padding: 80px var(--space-4) var(--space-3);
      }
    }
  `]
})
export class AppShellComponent {}
