/* ============================================================
   ApexEval — Auth Service
   ============================================================ */

import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of, delay, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';
import { User, UserRole, AuthCredentials, AuthSession, AppNotification } from '../models';
import { DEMO_ACCOUNTS, MOCK_NOTIFICATIONS } from '../mock';

const SESSION_KEY = 'apexeval_session';
const THEME_KEY = 'apexeval_theme';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _currentUser = signal<User | null>(null);
  private readonly _isLoading = signal(false);
  private readonly _notifications = signal<AppNotification[]>([...MOCK_NOTIFICATIONS]);
  private readonly _theme = signal<'light' | 'dark'>(this.loadTheme());

  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);
  readonly userRole = computed(() => this._currentUser()?.role ?? null);
  readonly notifications = this._notifications.asReadonly();
  readonly unreadCount = computed(() => this._notifications().filter(n => !n.read).length);
  readonly theme = this._theme.asReadonly();

  constructor(private readonly router: Router) {
    this.restoreSession();
  }

  signIn(credentials: AuthCredentials): Observable<AuthSession> {
    this._isLoading.set(true);

    const account = Object.values(DEMO_ACCOUNTS).find(
      a => a.email === credentials.email && a.password === credentials.password
    );

    if (!account) {
      return throwError(() => new Error('Invalid email or password')).pipe(
        delay(800),
        tap({ error: () => this._isLoading.set(false) })
      );
    }

    const session: AuthSession = {
      user: account.user,
      token: `demo-token-${account.user.role}-${Date.now()}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    return of(session).pipe(
      delay(800),
      tap(s => {
        this._currentUser.set(s.user);
        this._isLoading.set(false);
        if (credentials.rememberMe) {
          localStorage.setItem(SESSION_KEY, JSON.stringify(s));
        } else {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
        }
      })
    );
  }

  signOut(): void {
    this._currentUser.set(null);
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    this.router.navigate(['/sign-in']);
  }

  getHomeRoute(): string {
    const role = this._currentUser()?.role;
    switch (role) {
      case 'student': return '/student/dashboard';
      case 'faculty': return '/faculty/dashboard';
      case 'admin': return '/admin/dashboard';
      case 'superadmin': return '/superadmin/dashboard';
      default: return '/sign-in';
    }
  }

  hasRole(role: UserRole): boolean {
    return this._currentUser()?.role === role;
  }

  markNotificationRead(id: string): void {
    this._notifications.update(notifs =>
      notifs.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }

  markAllNotificationsRead(): void {
    this._notifications.update(notifs =>
      notifs.map(n => ({ ...n, read: true }))
    );
  }

  toggleTheme(): void {
    const newTheme = this._theme() === 'light' ? 'dark' : 'light';
    this._theme.set(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
  }

  private restoreSession(): void {
    const stored = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        const session: AuthSession = JSON.parse(stored);
        if (new Date(session.expiresAt) > new Date()) {
          this._currentUser.set(session.user);
        } else {
          localStorage.removeItem(SESSION_KEY);
          sessionStorage.removeItem(SESSION_KEY);
        }
      } catch {
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_KEY);
      }
    }
    // Apply saved theme
    document.documentElement.setAttribute('data-theme', this._theme());
  }

  private loadTheme(): 'light' | 'dark' {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    return 'light';
  }
}
