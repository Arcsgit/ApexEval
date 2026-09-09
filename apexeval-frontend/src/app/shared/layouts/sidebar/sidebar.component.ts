/* ============================================================
   ApexEval — Sidebar Component
   ============================================================ */

import { Component, ChangeDetectionStrategy, input, output, computed, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="sidebar" 
           [class.mobile-open]="mobileOpen()"
           [class.hover-open]="isHovered()"
           (mouseenter)="isHovered.set(true)"
           (mouseleave)="isHovered.set(false)">
      <div class="sidebar-header">
        <a [routerLink]="homeRoute()" class="logo-link">
          <div class="logo-mark">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 19h20L12 2z" fill="var(--color-orange)" />
              <path d="M12 8l-5 9h10l-5-9z" fill="var(--surface-primary)" />
            </svg>
          </div>
          <span class="logo-text">ApexEval</span>
        </a>
      </div>

      <nav class="sidebar-nav" aria-label="Main navigation">
        @for (item of navItems(); track item.route) {
          <a
            class="nav-item"
            [routerLink]="item.route"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: item.route.endsWith('dashboard') }"
            [attr.aria-label]="item.label"
            title="{{ item.label }}">
            <span class="material-symbols-outlined nav-icon">{{ item.icon }}</span>
            <span class="nav-label">{{ item.label }}</span>
          </a>
        }
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-footer-content">
          <span class="material-symbols-outlined footer-icon">info</span>
          <span class="footer-text">Mock Mode</span>
        </div>
      </div>
    </aside>
    <div class="sidebar-backdrop" [class.show]="mobileOpen() || isHovered()"></div>
  `,
  styles: [`
    .sidebar {
      width: var(--sidebar-collapsed-width);
      height: 100vh;
      position: fixed;
      top: 0;
      left: 0;
      display: flex;
      flex-direction: column;
      background: var(--surface-sidebar);
      border-right: 1px solid var(--border-primary);
      z-index: var(--z-overlay);
      transition: width var(--transition-base);
      overflow: hidden;
    }

    .sidebar:hover, .sidebar.hover-open, .sidebar.mobile-open {
      width: var(--sidebar-width);
    }

    .sidebar-backdrop {
      position: fixed;
      inset: 0;
      background: var(--surface-overlay);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: calc(var(--z-overlay) - 1);
      opacity: 0;
      pointer-events: none;
      transition: opacity var(--transition-base);
    }

    .sidebar-backdrop.show {
      opacity: 1;
    }

    @media (max-width: 1023px) {
      .sidebar-backdrop.show {
        opacity: 1;
        pointer-events: auto;
      }
      /* On mobile, desktop hover shouldn't trigger backdrop if it somehow fires */
      .sidebar:not(.mobile-open) + .sidebar-backdrop.show {
        opacity: 0;
        pointer-events: none;
      }
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      height: var(--header-height);
      padding: 0 var(--space-4);
      border-bottom: 1px solid var(--border-primary);
      flex-shrink: 0;
      overflow: hidden;
    }

    .logo-link {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      text-decoration: none;
    }

    .logo-mark {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
    }

    .logo-text, .nav-label, .sidebar-footer-content {
      opacity: 0;
      width: 0;
      overflow: hidden;
      white-space: nowrap;
      transition: opacity var(--transition-base);
    }

    .sidebar:hover .logo-text,
    .sidebar.hover-open .logo-text,
    .sidebar:hover .nav-label,
    .sidebar.hover-open .nav-label,
    .sidebar:hover .sidebar-footer-content,
    .sidebar.hover-open .sidebar-footer-content,
    .sidebar.mobile-open .logo-text,
    .sidebar.mobile-open .nav-label,
    .sidebar.mobile-open .sidebar-footer-content {
      opacity: 1;
      width: auto;
    }

    .logo-text {
      font-size: var(--text-lg);
      font-weight: var(--weight-bold);
      color: var(--text-primary);
      letter-spacing: -0.02em;
    }

    .sidebar-nav {
      flex: 1;
      padding: var(--space-3) var(--space-2);
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow-y: auto;
      overflow-x: hidden;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-2);
      border-radius: var(--radius-md);
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--text-secondary);
      text-decoration: none;
      transition: all var(--transition-fast);
      position: relative;
    }

    .sidebar:not(:hover):not(.hover-open):not(.mobile-open) .nav-item {
      justify-content: center;
    }

    .nav-item:hover {
      background: var(--surface-secondary);
      color: var(--text-primary);
    }

    .nav-item.active {
      background: var(--color-orange-light);
      color: var(--color-orange);
    }

    .sidebar:hover .nav-item.active::before,
    .sidebar.hover-open .nav-item.active::before,
    .sidebar.mobile-open .nav-item.active::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 20px;
      background: var(--color-orange);
      border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    }

    .nav-icon {
      font-size: 20px;
      flex-shrink: 0;
    }

    .sidebar-footer {
      padding: var(--space-3) var(--space-4);
      border-top: 1px solid var(--border-secondary);
      flex-shrink: 0;
      overflow: hidden;
      height: 48px;
      display: flex;
      align-items: center;
    }

    .sidebar-footer-content {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-xs);
      color: var(--text-tertiary);
    }

    @media (max-width: 1023px) {
      .sidebar {
        transform: translateX(-100%);
        width: var(--sidebar-width);
      }

      .sidebar.mobile-open {
        transform: translateX(0);
        box-shadow: var(--shadow-overlay);
      }
    }
  `]
})
export class SidebarComponent {
  mobileOpen = input(false);
  mobileClose = output();
  isHovered = signal(false);

  constructor(readonly auth: AuthService) {}

  readonly homeRoute = computed(() => this.auth.getHomeRoute());

  readonly navItems = computed<NavItem[]>(() => {
    switch (this.auth.userRole()) {
      case 'student':
        return [
          { label: 'Dashboard', icon: 'dashboard', route: '/student/dashboard' },
          { label: 'My Courses', icon: 'school', route: '/student/courses' },
          { label: 'Submissions', icon: 'history', route: '/student/submissions' },
        ];
      case 'admin':
        return [
          { label: 'Dashboard', icon: 'dashboard', route: '/admin/dashboard' },
          { label: 'Courses', icon: 'school', route: '/admin/courses' },
          { label: 'Submissions', icon: 'assignment', route: '/admin/submissions' },
          { label: 'Analytics', icon: 'bar_chart', route: '/admin/analytics' },
        ];
      case 'superadmin':
        return [
          { label: 'Dashboard', icon: 'dashboard', route: '/superadmin/dashboard' },
          { label: 'Administrators', icon: 'admin_panel_settings', route: '/superadmin/admins' },
          { label: 'Platform', icon: 'settings', route: '/superadmin/platform' },
          { label: 'System Health', icon: 'monitor_heart', route: '/superadmin/health' },
          { label: 'Audit Log', icon: 'receipt_long', route: '/superadmin/audit' },
          { label: 'Submissions', icon: 'assignment', route: '/superadmin/submissions' },
        ];
      default:
        return [];
    }
  });
}
