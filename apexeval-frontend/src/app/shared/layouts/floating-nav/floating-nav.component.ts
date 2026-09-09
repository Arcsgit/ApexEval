/* ============================================================
   ApexEval — Floating Navigation Bar Component
   Unified navigation: workspace panel + header controls.
   ============================================================ */

import {
  Component,
  ChangeDetectionStrategy,
  computed,
  signal,
  HostListener,
  ElementRef,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

interface MenuLink {
  label: string;
  icon: string;
  route: string;
}

interface MenuSection {
  title: string;
  links: MenuLink[];
}

@Component({
  selector: 'app-floating-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="floating-nav" aria-label="Main navigation">
      <!-- LEFT — Workspace Button -->
      <div class="nav-left">
        <button
          class="workspace-btn"
          [class.open]="workspaceOpen()"
          (click)="toggleWorkspace($event)"
          aria-haspopup="true"
          [attr.aria-expanded]="workspaceOpen()"
          aria-label="Open workspace menu">
          <span class="material-symbols-outlined workspace-icon">
            {{ workspaceOpen() ? 'close' : 'grid_view' }}
          </span>
          <span class="workspace-label">Workspace</span>
        </button>
      </div>

      <!-- CENTER — Brand -->
      <div class="nav-center">
        <a [routerLink]="homeRoute()" class="brand-link" aria-label="ApexEval Home">
          <svg class="brand-logo" width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 19h20L12 2z" fill="var(--color-orange)" />
            <path d="M12 8l-5 9h10l-5-9z" fill="var(--surface-elevated)" />
          </svg>
          <span class="brand-text">ApexEval</span>
        </a>
      </div>

      <!-- RIGHT — Controls -->
      <div class="nav-right">
        <!-- Notification Bell -->
        <div class="control-wrapper">
          <button
            class="nav-btn"
            (click)="toggleNotifications($event)"
            aria-label="Notifications">
            <span class="material-symbols-outlined">notifications</span>
            @if (auth.unreadCount() > 0) {
              <span class="badge">{{ auth.unreadCount() }}</span>
            }
          </button>

          @if (notificationsOpen()) {
            <div class="dropdown notifications-dropdown">
              <div class="dropdown-header">
                <span class="dropdown-title">Notifications</span>
                <button class="text-btn" (click)="auth.markAllNotificationsRead()">
                  Mark all read
                </button>
              </div>
              <div class="dropdown-body">
                @for (notif of auth.notifications(); track notif.id) {
                  <div
                    class="notif-item"
                    [class.unread]="!notif.read"
                    (click)="onNotificationClick(notif)">
                    <span
                      class="material-symbols-outlined notif-type-icon"
                      [attr.data-type]="notif.type">
                      {{ getNotifIcon(notif.type) }}
                    </span>
                    <div class="notif-text">
                      <span class="notif-title">{{ notif.title }}</span>
                      <span class="notif-message">{{ notif.message }}</span>
                    </div>
                  </div>
                } @empty {
                  <div class="dropdown-empty">No notifications</div>
                }
              </div>
            </div>
          }
        </div>

        <!-- Theme Toggle -->
        <button
          class="nav-btn"
          (click)="auth.toggleTheme()"
          [attr.aria-label]="'Switch to ' + (auth.theme() === 'light' ? 'dark' : 'light') + ' mode'">
          <span class="material-symbols-outlined">
            {{ auth.theme() === 'light' ? 'dark_mode' : 'light_mode' }}
          </span>
        </button>

        <!-- User / Auth -->
        <div class="control-wrapper">
          <button
            class="user-trigger"
            (click)="toggleUserMenu($event)"
            aria-label="User menu">
            <div class="avatar">{{ getInitials() }}</div>
            <span class="user-name-text">{{ auth.currentUser()?.firstName }}</span>
            <span class="material-symbols-outlined chevron-icon">expand_more</span>
          </button>

          @if (userMenuOpen()) {
            <div class="dropdown user-dropdown">
              <div class="user-info">
                <div class="avatar avatar-lg">{{ getInitials() }}</div>
                <div>
                  <div class="user-full-name">
                    {{ auth.currentUser()?.firstName }} {{ auth.currentUser()?.lastName }}
                  </div>
                  <div class="user-email">{{ auth.currentUser()?.email }}</div>
                  <span class="role-badge">{{ auth.currentUser()?.role }}</span>
                </div>
              </div>
              <div class="dropdown-divider"></div>
              <button class="dropdown-action" (click)="signOut()">
                <span class="material-symbols-outlined">logout</span>
                Sign out
              </button>
            </div>
          }
        </div>
      </div>
    </nav>

    <!-- ─── Workspace Floating Panel ─── -->
    @if (workspaceOpen()) {
      <div class="workspace-panel" role="menu" aria-label="Workspace navigation">
        <div class="panel-inner">
          @for (section of menuSections(); track section.title) {
            <div class="panel-section">
              <div class="section-label">{{ section.title }}</div>
              @for (link of section.links; track link.route) {
                <a
                  class="panel-link"
                  [routerLink]="link.route"
                  routerLinkActive="active"
                  [routerLinkActiveOptions]="{ exact: link.route.endsWith('dashboard') }"
                  role="menuitem"
                  (click)="onPanelNavigate()">
                  <span class="material-symbols-outlined panel-link-icon">{{ link.icon }}</span>
                  <span class="panel-link-label">{{ link.label }}</span>
                  <span class="active-indicator"></span>
                </a>
              }
            </div>
          }
        </div>
      </div>
    }

    <!-- Backdrop for dropdowns -->
    @if (notificationsOpen() || userMenuOpen()) {
      <div class="nav-backdrop" (click)="closeAll()"></div>
    }

    <!-- Backdrop for workspace panel -->
    @if (workspaceOpen()) {
      <div class="workspace-backdrop" (click)="closeAll()"></div>
    }
  `,
  styles: [`
    /* ─── Floating Bar ─── */
    .floating-nav {
      position: fixed;
      top: var(--floating-nav-top, 12px);
      left: 50%;
      transform: translateX(-50%);
      width: calc(100% - 32px);
      max-width: 1200px;
      height: var(--floating-nav-height, 56px);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 var(--space-4);
      background: var(--surface-elevated);
      border: 1px solid var(--border-secondary);
      border-radius: 16px;
      box-shadow: 0 2px 16px rgba(0, 0, 0, 0.06), 0 0 1px rgba(0, 0, 0, 0.08);
      z-index: var(--z-overlay);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      transition: box-shadow var(--transition-base), background var(--transition-base), border-color var(--transition-base);
    }

    :host-context([data-theme="dark"]) .floating-nav {
      box-shadow: 0 2px 20px rgba(0, 0, 0, 0.25), 0 0 1px rgba(255, 255, 255, 0.06);
    }

    /* ─── Sections ─── */
    .nav-left,
    .nav-right {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      z-index: 1;
    }

    .nav-center {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
    }

    /* ─── Workspace Button ─── */
    .workspace-btn {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: 7px 14px;
      border-radius: 12px;
      border: 1px solid var(--border-secondary);
      background: var(--surface-primary);
      color: var(--text-secondary);
      font-family: var(--font-header);
      font-size: var(--text-sm);
      font-weight: 800;
      cursor: pointer;
      transition: all 200ms cubic-bezier(0.22, 1, 0.36, 1);
      position: relative;
    }

    .workspace-btn:hover {
      background: var(--surface-secondary);
      border-color: var(--border-primary);
      color: var(--text-primary);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
    }

    .workspace-btn:active {
      transform: scale(0.97);
    }

    .workspace-btn:focus-visible {
      outline: 2px solid var(--border-focus);
      outline-offset: 2px;
    }

    .workspace-btn.open {
      background: var(--color-orange-light);
      border-color: var(--color-orange);
      color: var(--color-orange);
      box-shadow: 0 0 0 3px var(--color-orange-lighter, rgba(255, 109, 31, 0.08));
    }

    .workspace-icon {
      font-size: 18px;
      transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
    }

    .workspace-btn.open .workspace-icon {
      transform: rotate(90deg);
    }

    .workspace-label {
      line-height: 1;
    }

    /* ─── Workspace Floating Panel ─── */
    .workspace-panel {
      position: fixed;
      top: calc(var(--floating-nav-top, 12px) + var(--floating-nav-height, 56px) + 10px);
      left: max(16px, calc(50% - 600px + 16px));
      width: 280px;
      max-height: calc(100vh - var(--floating-nav-top, 12px) - var(--floating-nav-height, 56px) - 32px);
      overflow-y: auto;
      background: var(--surface-elevated);
      border: 1px solid var(--border-secondary);
      border-radius: 16px;
      box-shadow:
        0 8px 40px rgba(0, 0, 0, 0.10),
        0 2px 8px rgba(0, 0, 0, 0.04),
        0 0 1px rgba(0, 0, 0, 0.08);
      z-index: var(--z-overlay);
      padding: var(--space-3);
      animation: panelIn 220ms cubic-bezier(0.22, 1, 0.36, 1);
    }

    :host-context([data-theme="dark"]) .workspace-panel {
      box-shadow:
        0 8px 40px rgba(0, 0, 0, 0.35),
        0 2px 8px rgba(0, 0, 0, 0.15),
        0 0 1px rgba(255, 255, 255, 0.06);
    }

    @keyframes panelIn {
      from {
        opacity: 0;
        transform: translateY(-8px) scale(0.97);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .panel-inner {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    /* ─── Panel Sections ─── */
    .panel-section {
      padding: var(--space-1) 0;
    }

    .panel-section + .panel-section {
      border-top: 1px solid var(--border-secondary);
      padding-top: var(--space-2);
      margin-top: var(--space-1);
    }

    .section-label {
      font-family: var(--font-label);
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-tertiary);
      padding: var(--space-2) var(--space-3);
      user-select: none;
    }

    /* ─── Panel Links ─── */
    .panel-link {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: 9px var(--space-3);
      border-radius: 10px;
      font-family: var(--font-label);
      font-size: var(--text-sm);
      font-weight: 700;
      color: var(--text-secondary);
      text-decoration: none;
      position: relative;
      transition: all 150ms ease;
    }

    .panel-link:hover {
      background: var(--surface-secondary);
      color: var(--text-primary);
    }

    .panel-link:focus-visible {
      outline: 2px solid var(--border-focus);
      outline-offset: -2px;
      border-radius: 10px;
    }

    .panel-link.active {
      background: var(--color-orange-light);
      color: var(--color-orange);
    }

    .panel-link-icon {
      font-size: 19px;
      flex-shrink: 0;
      opacity: 0.7;
    }

    .panel-link.active .panel-link-icon {
      opacity: 1;
    }

    .panel-link-label {
      flex: 1;
      line-height: 1.2;
    }

    .active-indicator {
      width: 5px;
      height: 5px;
      border-radius: var(--radius-full);
      background: transparent;
      flex-shrink: 0;
      transition: background 150ms ease;
    }

    .panel-link.active .active-indicator {
      background: var(--color-orange);
    }

    /* ─── Workspace Backdrop ─── */
    .workspace-backdrop {
      position: fixed;
      inset: 0;
      z-index: calc(var(--z-overlay) - 1);
      background: rgba(0, 0, 0, 0.04);
      backdrop-filter: blur(1px);
      -webkit-backdrop-filter: blur(1px);
      animation: fadeIn 180ms ease;
    }

    :host-context([data-theme="dark"]) .workspace-backdrop {
      background: rgba(0, 0, 0, 0.2);
    }

    /* ─── Brand ─── */
    .brand-link {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      text-decoration: none;
    }

    .brand-logo {
      flex-shrink: 0;
    }

    .brand-text {
      font-family: var(--font-header);
      font-size: var(--text-lg);
      font-weight: 800;
      color: var(--text-primary);
      letter-spacing: -0.02em;
      line-height: 1;
    }

    /* ─── Control Buttons ─── */
    .nav-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: var(--radius-lg);
      color: var(--text-secondary);
      position: relative;
      transition: all var(--transition-fast);
    }

    .nav-btn:hover {
      background: var(--surface-secondary);
      color: var(--text-primary);
    }

    .nav-btn:focus-visible {
      outline: 2px solid var(--border-focus);
      outline-offset: 2px;
    }

    .nav-btn:active {
      transform: scale(0.95);
    }

    .nav-btn .material-symbols-outlined {
      font-size: 20px;
    }

    /* ─── Badge ─── */
    .badge {
      position: absolute;
      top: 4px;
      right: 4px;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      border-radius: var(--radius-full);
      background: var(--color-orange);
      color: white;
      font-size: 10px;
      font-weight: var(--weight-semibold);
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }

    /* ─── User Trigger ─── */
    .user-trigger {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: 4px 8px 4px 4px;
      border-radius: var(--radius-lg);
      transition: background var(--transition-fast);
    }

    .user-trigger:hover {
      background: var(--surface-secondary);
    }

    .user-trigger:focus-visible {
      outline: 2px solid var(--border-focus);
      outline-offset: 2px;
    }

    .avatar {
      width: 28px;
      height: 28px;
      border-radius: var(--radius-full);
      background: var(--color-orange);
      color: white;
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .avatar-lg {
      width: 40px;
      height: 40px;
      font-size: var(--text-base);
    }

    .user-name-text {
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--text-primary);
    }

    .chevron-icon {
      font-size: 18px;
      color: var(--text-tertiary);
    }

    /* ─── Control Wrapper (for dropdown positioning) ─── */
    .control-wrapper {
      position: relative;
    }

    /* ─── Dropdowns ─── */
    .dropdown {
      position: absolute;
      top: calc(100% + var(--space-3));
      right: 0;
      background: var(--surface-elevated);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-lg);
      z-index: var(--z-dropdown);
      overflow: hidden;
      animation: floatDropIn 150ms ease;
    }

    @keyframes floatDropIn {
      from {
        opacity: 0;
        transform: translateY(-6px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* Notifications Dropdown */
    .notifications-dropdown {
      width: 380px;
      max-height: 440px;
    }

    .dropdown-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-3) var(--space-4);
      border-bottom: 1px solid var(--border-secondary);
    }

    .dropdown-title {
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      color: var(--text-primary);
    }

    .text-btn {
      font-size: var(--text-xs);
      color: var(--color-orange);
      font-weight: var(--weight-medium);
      transition: opacity var(--transition-fast);
    }
    .text-btn:hover {
      opacity: 0.8;
    }

    .dropdown-body {
      max-height: 380px;
      overflow-y: auto;
    }

    .notif-item {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      cursor: pointer;
      transition: background var(--transition-fast);
    }
    .notif-item:hover {
      background: var(--surface-secondary);
    }
    .notif-item.unread {
      background: var(--color-orange-lighter);
    }

    .notif-type-icon {
      font-size: 18px;
      margin-top: 2px;
      flex-shrink: 0;
    }
    .notif-type-icon[data-type="success"] { color: var(--color-pass); }
    .notif-type-icon[data-type="error"] { color: var(--color-fail); }
    .notif-type-icon[data-type="warning"] { color: var(--color-flagged); }
    .notif-type-icon[data-type="info"] { color: var(--color-running); }

    .notif-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .notif-title {
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--text-primary);
    }

    .notif-message {
      font-size: var(--text-xs);
      color: var(--text-secondary);
      line-height: var(--leading-normal);
    }

    .dropdown-empty {
      padding: var(--space-8);
      text-align: center;
      color: var(--text-tertiary);
      font-size: var(--text-sm);
    }

    /* User Dropdown */
    .user-dropdown {
      width: 280px;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-4);
    }

    .user-full-name {
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
      color: var(--text-primary);
    }

    .user-email {
      font-size: var(--text-xs);
      color: var(--text-secondary);
    }

    .role-badge {
      display: inline-block;
      margin-top: var(--space-1);
      padding: 1px 8px;
      font-size: 10px;
      font-weight: var(--weight-semibold);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: var(--color-orange-light);
      color: var(--color-orange);
      border-radius: var(--radius-full);
    }

    .dropdown-divider {
      height: 1px;
      background: var(--border-secondary);
    }

    .dropdown-action {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      width: 100%;
      padding: var(--space-3) var(--space-4);
      font-size: var(--text-sm);
      color: var(--text-secondary);
      transition: all var(--transition-fast);
    }
    .dropdown-action:hover {
      background: var(--surface-secondary);
      color: var(--text-primary);
    }
    .dropdown-action .material-symbols-outlined {
      font-size: 18px;
    }

    /* ─── Backdrop (for closing dropdowns) ─── */
    .nav-backdrop {
      position: fixed;
      inset: 0;
      z-index: calc(var(--z-overlay) - 1);
    }

    /* ─── Responsive — Tablet ─── */
    @media (max-width: 1023px) {
      .workspace-label {
        display: none;
      }

      .workspace-btn {
        padding: 7px 10px;
      }

      .user-name-text,
      .chevron-icon {
        display: none;
      }

      .user-trigger {
        padding: 4px;
      }

      .notifications-dropdown {
        position: fixed;
        top: calc(var(--floating-nav-top, 12px) + var(--floating-nav-height, 56px) + 8px);
        right: 16px;
        left: 16px;
        width: auto;
      }

      .user-dropdown {
        position: fixed;
        top: calc(var(--floating-nav-top, 12px) + var(--floating-nav-height, 56px) + 8px);
        right: 16px;
        width: 280px;
      }
    }

    /* ─── Responsive — Mobile ─── */
    @media (max-width: 767px) {
      .brand-text {
        display: none;
      }

      .nav-center {
        position: static;
        transform: none;
      }

      .floating-nav {
        justify-content: space-between;
        padding: 0 var(--space-3);
      }

      .workspace-panel {
        left: 16px;
        right: 16px;
        width: auto;
      }

      .notifications-dropdown {
        left: 16px;
        right: 16px;
        width: auto;
      }
    }
  `]
})
export class FloatingNavComponent {
  readonly workspaceOpen = signal(false);
  readonly notificationsOpen = signal(false);
  readonly userMenuOpen = signal(false);

  constructor(
    readonly auth: AuthService,
    private readonly router: Router,
    private readonly elRef: ElementRef
  ) {}

  readonly homeRoute = computed(() => this.auth.getHomeRoute());

  /** Role-aware menu sections for the floating workspace panel */
  readonly menuSections = computed<MenuSection[]>(() => {
    switch (this.auth.userRole()) {
      case 'student':
        return [
          {
            title: 'Overview',
            links: [
              { label: 'Dashboard', icon: 'space_dashboard', route: '/student/dashboard' },
            ],
          },
          {
            title: 'Learning',
            links: [
              { label: 'Submissions', icon: 'assignment_turned_in', route: '/student/submissions' },
            ],
          },
        ];

      case 'faculty':
        return [
          {
            title: 'Overview',
            links: [
              { label: 'Dashboard', icon: 'space_dashboard', route: '/faculty/dashboard' },
            ],
          },
          {
            title: 'Teaching',
            links: [
              { label: 'My Courses', icon: 'school', route: '/faculty/courses' },
              { label: 'Submissions', icon: 'assignment_turned_in', route: '/faculty/submissions' },
            ],
          },
        ];

      case 'admin':
        return [
          {
            title: 'Overview',
            links: [
              { label: 'Dashboard', icon: 'space_dashboard', route: '/admin/dashboard' },
            ],
          },
          {
            title: 'Academic',
            links: [
              { label: 'All Courses', icon: 'school', route: '/admin/courses' },
              { label: 'Submissions', icon: 'assignment_turned_in', route: '/admin/submissions' },
            ],
          },
          {
            title: 'Insights',
            links: [
              { label: 'Analytics', icon: 'bar_chart', route: '/admin/analytics' },
            ],
          },
        ];

      case 'superadmin':
        return [
          {
            title: 'Overview',
            links: [
              { label: 'Dashboard', icon: 'space_dashboard', route: '/superadmin/dashboard' },
            ],
          },
          {
            title: 'Management',
            links: [
              { label: 'Administrators', icon: 'admin_panel_settings', route: '/superadmin/admins' },
              { label: 'Submissions', icon: 'assignment_turned_in', route: '/superadmin/submissions' },
            ],
          },
          {
            title: 'System',
            links: [
              { label: 'Platform Settings', icon: 'settings', route: '/superadmin/platform' },
              { label: 'System Health', icon: 'monitor_heart', route: '/superadmin/health' },
              { label: 'Audit Log', icon: 'receipt_long', route: '/superadmin/audit' },
            ],
          },
        ];

      default:
        return [];
    }
  });

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeAll();
  }

  getInitials(): string {
    const user = this.auth.currentUser();
    if (!user) return '?';
    return `${user.firstName[0]}${user.lastName[0]}`;
  }

  getNotifIcon(type: string): string {
    switch (type) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      case 'warning': return 'warning';
      default: return 'info';
    }
  }

  toggleWorkspace(event: Event): void {
    event.stopPropagation();
    this.notificationsOpen.set(false);
    this.userMenuOpen.set(false);
    this.workspaceOpen.update(v => !v);
  }

  toggleNotifications(event: Event): void {
    event.stopPropagation();
    this.workspaceOpen.set(false);
    this.userMenuOpen.set(false);
    this.notificationsOpen.update(v => !v);
  }

  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.workspaceOpen.set(false);
    this.notificationsOpen.set(false);
    this.userMenuOpen.update(v => !v);
  }

  closeAll(): void {
    this.workspaceOpen.set(false);
    this.notificationsOpen.set(false);
    this.userMenuOpen.set(false);
  }

  onPanelNavigate(): void {
    this.closeAll();
  }

  onNotificationClick(notif: { id: string; link?: string }): void {
    this.auth.markNotificationRead(notif.id);
    if (notif.link) {
      this.router.navigateByUrl(notif.link);
    }
    this.closeAll();
  }

  signOut(): void {
    this.closeAll();
    this.auth.signOut();
  }
}
