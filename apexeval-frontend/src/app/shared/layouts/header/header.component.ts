/* ============================================================
   ApexEval — Header Component
   ============================================================ */

import { Component, ChangeDetectionStrategy, output, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="header">
      <div class="header-left">
        <button class="menu-toggle" (click)="menuToggle.emit()" aria-label="Toggle menu">
          <span class="material-symbols-outlined">menu</span>
        </button>
      </div>

      <div class="header-right">
        <!-- Theme Toggle -->
        <button class="header-btn" (click)="auth.toggleTheme()" [attr.aria-label]="'Switch to ' + (auth.theme() === 'light' ? 'dark' : 'light') + ' mode'">
          <span class="material-symbols-outlined">{{ auth.theme() === 'light' ? 'dark_mode' : 'light_mode' }}</span>
        </button>

        <!-- Notifications -->
        <button class="header-btn notification-btn" (click)="toggleNotifications()" aria-label="Notifications">
          <span class="material-symbols-outlined">notifications</span>
          @if (auth.unreadCount() > 0) {
            <span class="notification-badge">{{ auth.unreadCount() }}</span>
          }
        </button>

        @if (notificationsOpen()) {
          <div class="notifications-dropdown">
            <div class="notifications-header">
              <span class="notifications-title">Notifications</span>
              <button class="mark-all-btn" (click)="auth.markAllNotificationsRead()">Mark all read</button>
            </div>
            <div class="notifications-list">
              @for (notif of auth.notifications(); track notif.id) {
                <div class="notification-item" [class.unread]="!notif.read" (click)="onNotificationClick(notif)">
                  <span class="material-symbols-outlined notif-icon" [attr.data-type]="notif.type">
                    {{ getNotifIcon(notif.type) }}
                  </span>
                  <div class="notif-content">
                    <span class="notif-title">{{ notif.title }}</span>
                    <span class="notif-message">{{ notif.message }}</span>
                  </div>
                </div>
              } @empty {
                <div class="no-notifications">No notifications</div>
              }
            </div>
          </div>
        }

        <!-- User Menu -->
        <div class="user-menu-container">
          <button class="user-btn" (click)="toggleUserMenu()" aria-label="User menu">
            <div class="user-avatar">
              {{ getInitials() }}
            </div>
            <span class="user-name hide-below-desktop">{{ auth.currentUser()?.firstName }}</span>
            <span class="material-symbols-outlined chevron">expand_more</span>
          </button>

          @if (userMenuOpen()) {
            <div class="user-dropdown">
              <div class="user-dropdown-header">
                <div class="user-avatar-lg">{{ getInitials() }}</div>
                <div>
                  <div class="user-full-name">{{ auth.currentUser()?.firstName }} {{ auth.currentUser()?.lastName }}</div>
                  <div class="user-email">{{ auth.currentUser()?.email }}</div>
                  <div class="user-role-badge">{{ auth.currentUser()?.role }}</div>
                </div>
              </div>
              <div class="user-dropdown-divider"></div>
              <button class="user-dropdown-item" (click)="signOut()">
                <span class="material-symbols-outlined">logout</span>
                Sign out
              </button>
            </div>
          }
        </div>
      </div>
    </header>

    @if (notificationsOpen() || userMenuOpen()) {
      <div class="backdrop" (click)="closeMenus()"></div>
    }
  `,
  styles: [`
    .header {
      height: var(--header-height);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 var(--space-4);
      background: var(--surface-header);
      border-bottom: 1px solid var(--border-primary);
      position: sticky;
      top: 0;
      z-index: var(--z-sticky);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    .menu-toggle {
      display: none;
      padding: var(--space-2);
      border-radius: var(--radius-md);
      color: var(--text-secondary);
      transition: all var(--transition-fast);
    }
    .menu-toggle:hover {
      background: var(--surface-secondary);
      color: var(--text-primary);
    }

    @media (max-width: 1023px) {
      .menu-toggle { display: flex; }
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      position: relative;
    }

    .header-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      color: var(--text-secondary);
      transition: all var(--transition-fast);
      position: relative;
    }
    .header-btn:hover {
      background: var(--surface-secondary);
      color: var(--text-primary);
    }
    .header-btn .material-symbols-outlined {
      font-size: 20px;
    }

    .notification-badge {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 16px;
      height: 16px;
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

    .notifications-dropdown {
      position: absolute;
      top: calc(100% + var(--space-2));
      right: 0;
      width: 380px;
      max-height: 440px;
      background: var(--surface-elevated);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-lg);
      z-index: var(--z-dropdown);
      overflow: hidden;
      animation: fadeInDown var(--transition-fast) ease;
    }

    .notifications-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-3) var(--space-4);
      border-bottom: 1px solid var(--border-secondary);
    }

    .notifications-title {
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
    }

    .mark-all-btn {
      font-size: var(--text-xs);
      color: var(--color-orange);
      font-weight: var(--weight-medium);
    }
    .mark-all-btn:hover { text-decoration: underline; }

    .notifications-list {
      max-height: 380px;
      overflow-y: auto;
    }

    .notification-item {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      cursor: pointer;
      transition: background var(--transition-fast);
    }
    .notification-item:hover {
      background: var(--surface-secondary);
    }
    .notification-item.unread {
      background: var(--color-orange-lighter);
    }

    .notif-icon {
      font-size: 18px;
      margin-top: 2px;
      flex-shrink: 0;
    }
    .notif-icon[data-type="success"] { color: var(--color-pass); }
    .notif-icon[data-type="error"] { color: var(--color-fail); }
    .notif-icon[data-type="warning"] { color: var(--color-flagged); }
    .notif-icon[data-type="info"] { color: var(--color-running); }

    .notif-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .notif-title {
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
    }

    .notif-message {
      font-size: var(--text-xs);
      color: var(--text-secondary);
      line-height: var(--leading-normal);
    }

    .no-notifications {
      padding: var(--space-8);
      text-align: center;
      color: var(--text-tertiary);
      font-size: var(--text-sm);
    }

    /* User Menu */
    .user-menu-container {
      position: relative;
    }

    .user-btn {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-1) var(--space-2);
      border-radius: var(--radius-md);
      transition: background var(--transition-fast);
    }
    .user-btn:hover {
      background: var(--surface-secondary);
    }

    .user-avatar {
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

    .user-name {
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
    }

    .chevron {
      font-size: 18px;
      color: var(--text-tertiary);
    }

    .user-dropdown {
      position: absolute;
      top: calc(100% + var(--space-2));
      right: 0;
      width: 280px;
      background: var(--surface-elevated);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-lg);
      z-index: var(--z-dropdown);
      overflow: hidden;
      animation: fadeInDown var(--transition-fast) ease;
    }

    .user-dropdown-header {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-4);
    }

    .user-avatar-lg {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-full);
      background: var(--color-orange);
      color: white;
      font-size: var(--text-base);
      font-weight: var(--weight-semibold);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .user-full-name {
      font-size: var(--text-sm);
      font-weight: var(--weight-semibold);
    }

    .user-email {
      font-size: var(--text-xs);
      color: var(--text-secondary);
    }

    .user-role-badge {
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

    .user-dropdown-divider {
      height: 1px;
      background: var(--border-secondary);
    }

    .user-dropdown-item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      width: 100%;
      padding: var(--space-3) var(--space-4);
      font-size: var(--text-sm);
      color: var(--text-secondary);
      transition: all var(--transition-fast);
    }
    .user-dropdown-item:hover {
      background: var(--surface-secondary);
      color: var(--text-primary);
    }
    .user-dropdown-item .material-symbols-outlined {
      font-size: 18px;
    }

    .backdrop {
      position: fixed;
      inset: 0;
      z-index: calc(var(--z-dropdown) - 1);
    }

    @media (max-width: 767px) {
      .notifications-dropdown {
        width: calc(100vw - var(--space-8));
        right: calc(-1 * var(--space-4));
      }
    }
  `]
})
export class HeaderComponent {
  menuToggle = output();
  readonly notificationsOpen = signal(false);
  readonly userMenuOpen = signal(false);

  constructor(
    readonly auth: AuthService,
    private readonly router: Router
  ) {}

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

  toggleNotifications(): void {
    this.userMenuOpen.set(false);
    this.notificationsOpen.update(v => !v);
  }

  toggleUserMenu(): void {
    this.notificationsOpen.set(false);
    this.userMenuOpen.update(v => !v);
  }

  closeMenus(): void {
    this.notificationsOpen.set(false);
    this.userMenuOpen.set(false);
  }

  onNotificationClick(notif: { id: string; link?: string }): void {
    this.auth.markNotificationRead(notif.id);
    if (notif.link) {
      this.router.navigateByUrl(notif.link);
    }
    this.closeMenus();
  }

  signOut(): void {
    this.closeMenus();
    this.auth.signOut();
  }
}
