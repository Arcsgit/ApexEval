/* ============================================================
   ApexEval — Sign In Component
   ============================================================ */

import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sign-in-page">
      <div class="sign-in-left">
        <div class="brand-content">
          <div class="brand-logo">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 19h20L12 2z" fill="var(--color-orange)" />
              <path d="M12 8l-5 9h10l-5-9z" fill="white" />
            </svg>
            <span class="brand-name">ApexEval</span>
          </div>
          <h1 class="brand-headline">Assignment evaluation, elevated.</h1>
          <p class="brand-description">
            A professional platform for submitting, evaluating, and reviewing
            programming assignments with automated testing, static analysis,
            and detailed feedback.
          </p>
          <div class="brand-features">
            <div class="feature">
              <span class="material-symbols-outlined">code</span>
              <span>Integrated code editor</span>
            </div>
            <div class="feature">
              <span class="material-symbols-outlined">play_circle</span>
              <span>Automated evaluation pipeline</span>
            </div>
            <div class="feature">
              <span class="material-symbols-outlined">bug_report</span>
              <span>Static analysis &amp; test results</span>
            </div>
            <div class="feature">
              <span class="material-symbols-outlined">analytics</span>
              <span>Class analytics &amp; insights</span>
            </div>
          </div>
        </div>
      </div>

      <div class="sign-in-right">
        <div class="sign-in-form-container">
          <h2 class="form-title">Sign in</h2>
          <p class="form-subtitle">Enter your credentials to access ApexEval</p>

          @if (error()) {
            <div class="error-banner" role="alert">
              <span class="material-symbols-outlined">error</span>
              <span>{{ error() }}</span>
            </div>
          }

          <form (ngSubmit)="onSubmit()" class="form">
            <div class="form-field">
              <label for="email" class="form-label">Email</label>
              <div class="input-wrapper" [class.focused]="emailFocused()">
                <span class="material-symbols-outlined input-icon">mail</span>
                <input
                  id="email"
                  type="email"
                  [(ngModel)]="email"
                  name="email"
                  placeholder="you@university.edu"
                  autocomplete="email"
                  required
                  (focus)="emailFocused.set(true)"
                  (blur)="emailFocused.set(false)" />
              </div>
            </div>

            <div class="form-field">
              <label for="password" class="form-label">Password</label>
              <div class="input-wrapper" [class.focused]="passwordFocused()">
                <span class="material-symbols-outlined input-icon">lock</span>
                <input
                  [type]="showPassword() ? 'text' : 'password'"
                  id="password"
                  [(ngModel)]="password"
                  name="password"
                  placeholder="Enter your password"
                  autocomplete="current-password"
                  required
                  (focus)="passwordFocused.set(true)"
                  (blur)="passwordFocused.set(false)" />
                <button
                  type="button"
                  class="toggle-password"
                  (click)="toggleShowPassword()"
                  [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'">
                  <span class="material-symbols-outlined">{{ showPassword() ? 'visibility_off' : 'visibility' }}</span>
                </button>
              </div>
            </div>

            <div class="form-row">
              <label class="checkbox-label">
                <input type="checkbox" [(ngModel)]="rememberMe" name="rememberMe" />
                <span class="checkbox-custom"></span>
                <span>Remember me</span>
              </label>
            </div>

            <button
              type="submit"
              class="submit-btn"
              [disabled]="auth.isLoading() || !email || !password">
              @if (auth.isLoading()) {
                <span class="spinner"></span>
                Signing in…
              } @else {
                Sign in
              }
            </button>
          </form>

          <div class="demo-section">
            <div class="demo-divider">
              <span>Demo accounts</span>
            </div>
            <div class="demo-accounts">
              <button class="demo-btn" (click)="loginAs('student-1')">
                <span class="material-symbols-outlined">person</span>
                <div class="demo-info">
                  <span class="demo-role">Student 1 (Alex)</span>
                  <span class="demo-email">student-1&#64;apexeval.demo</span>
                </div>
              </button>
              <button class="demo-btn" (click)="loginAs('student-2')">
                <span class="material-symbols-outlined">person</span>
                <div class="demo-info">
                  <span class="demo-role">Student 2 (Priya)</span>
                  <span class="demo-email">student-2&#64;apexeval.demo</span>
                </div>
              </button>
              <button class="demo-btn" (click)="loginAs('student-3')">
                <span class="material-symbols-outlined">person</span>
                <div class="demo-info">
                  <span class="demo-role">Student 3 (Marcus)</span>
                  <span class="demo-email">student-3&#64;apexeval.demo</span>
                </div>
              </button>
              <button class="demo-btn" (click)="loginAs('faculty')">
                <span class="material-symbols-outlined">school</span>
                <div class="demo-info">
                  <span class="demo-role">Faculty</span>
                  <span class="demo-email">faculty&#64;apexeval.demo</span>
                </div>
              </button>
              <button class="demo-btn" (click)="loginAs('admin')">
                <span class="material-symbols-outlined">manage_accounts</span>
                <div class="demo-info">
                  <span class="demo-role">Admin</span>
                  <span class="demo-email">admin&#64;apexeval.demo</span>
                </div>
              </button>
              <button class="demo-btn" (click)="loginAs('superadmin')">
                <span class="material-symbols-outlined">shield_person</span>
                <div class="demo-info">
                  <span class="demo-role">Superadmin</span>
                  <span class="demo-email">superadmin&#64;apexeval.demo</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sign-in-page {
      display: flex;
      min-height: 100vh;
      position: relative;
    }

    .sign-in-left {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-12);
      background: var(--color-dark);
      color: white;
      position: relative;
      z-index: 1;
    }

    .brand-content {
      max-width: 440px;
    }

    .brand-logo {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      margin-bottom: var(--space-10);
    }

    .brand-name {
      font-size: var(--text-2xl);
      font-weight: var(--weight-bold);
      letter-spacing: -0.02em;
    }

    .brand-headline {
      font-size: 2.5rem;
      font-weight: var(--weight-bold);
      line-height: 1.15;
      letter-spacing: -0.03em;
      margin-bottom: var(--space-4);
      color: white;
    }

    .brand-description {
      font-size: var(--text-md);
      line-height: var(--leading-relaxed);
      color: rgba(255, 255, 255, 0.65);
      margin-bottom: var(--space-10);
    }

    .brand-features {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .feature {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      font-size: var(--text-sm);
      color: rgba(255, 255, 255, 0.8);
    }

    .feature .material-symbols-outlined {
      font-size: 20px;
      color: var(--color-orange);
    }

    /* Right Panel — z-index: 3 to occlude avatar */
    .sign-in-right {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-8);
      background: var(--surface-primary);
      position: relative;
      z-index: 3;
    }

    .sign-in-form-container {
      width: 100%;
      max-width: 400px;
    }

    .form-title {
      font-size: var(--text-3xl);
      font-weight: var(--weight-bold);
      letter-spacing: -0.02em;
      margin-bottom: var(--space-2);
    }

    .form-subtitle {
      font-size: var(--text-base);
      color: var(--text-secondary);
      margin-bottom: var(--space-8);
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4);
      background: var(--color-fail-bg);
      border: 1px solid var(--color-fail-border);
      border-radius: var(--radius-md);
      font-size: var(--text-sm);
      color: var(--color-fail);
      margin-bottom: var(--space-6);
    }
    .error-banner .material-symbols-outlined { font-size: 18px; }

    .form { display: flex; flex-direction: column; gap: var(--space-5); }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .form-label {
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--text-secondary);
    }

    .input-wrapper {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: 0 var(--space-3);
      height: 42px;
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-md);
      background: var(--surface-primary);
      transition: all var(--transition-fast);
    }

    .input-wrapper.focused {
      border-color: var(--color-orange);
      box-shadow: 0 0 0 3px var(--color-orange-light);
    }

    .input-icon {
      font-size: 18px;
      color: var(--text-tertiary);
    }

    .input-wrapper input {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      font-size: var(--text-base);
      height: 100%;
      color: var(--text-primary);
    }

    .input-wrapper input::placeholder {
      color: var(--text-disabled);
    }

    .toggle-password {
      display: flex;
      padding: var(--space-1);
      color: var(--text-tertiary);
      border-radius: var(--radius-sm);
    }
    .toggle-password:hover { color: var(--text-secondary); }
    .toggle-password .material-symbols-outlined { font-size: 18px; }

    .form-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-sm);
      color: var(--text-secondary);
      cursor: pointer;
    }

    .checkbox-label input[type="checkbox"] {
      width: 16px;
      height: 16px;
      accent-color: var(--color-orange);
    }

    .submit-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      height: 42px;
      background: var(--color-orange);
      color: white;
      border: none;
      border-radius: var(--radius-md);
      font-size: var(--text-base);
      font-weight: var(--weight-semibold);
      cursor: pointer;
      transition: all var(--transition-fast);
    }
    .submit-btn:hover:not(:disabled) { background: var(--color-orange-hover); }
    .submit-btn:active:not(:disabled) { background: var(--color-orange-active); transform: scale(0.99); }
    .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    /* Demo Section */
    .demo-section { margin-top: var(--space-8); }

    .demo-divider {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      margin-bottom: var(--space-4);
    }
    .demo-divider::before,
    .demo-divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--border-primary);
    }
    .demo-divider span {
      font-size: var(--text-xs);
      font-weight: var(--weight-medium);
      color: var(--text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .demo-accounts {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .demo-btn {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      width: 100%;
      padding: var(--space-3) var(--space-4);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-md);
      background: var(--surface-primary);
      cursor: pointer;
      transition: all var(--transition-fast);
      text-align: left;
    }
    .demo-btn:hover {
      border-color: var(--color-orange);
      background: var(--color-orange-lighter);
    }
    .demo-btn .material-symbols-outlined {
      font-size: 20px;
      color: var(--color-orange);
    }

    .demo-info {
      display: flex;
      flex-direction: column;
    }

    .demo-role {
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--text-primary);
    }

    .demo-email {
      font-size: var(--text-xs);
      color: var(--text-tertiary);
    }

    /* Responsive */
    @media (max-width: 1023px) {
      .sign-in-left { display: none; }
      .sign-in-right { padding: var(--space-6); }
    }

    @media (max-width: 767px) {
      .sign-in-right { padding: var(--space-4); }
      .sign-in-form-container { max-width: 100%; }
    }
  `]
})
export class SignInComponent {
  email = '';
  password = '';
  rememberMe = false;

  readonly showPassword = signal(false);
  readonly error = signal('');
  readonly emailFocused = signal(false);
  readonly passwordFocused = signal(false);

  constructor(
    readonly auth: AuthService,
    private readonly router: Router
  ) {}

  toggleShowPassword(): void {
    this.showPassword.update(v => !v);
  }

  onSubmit(): void {
    if (!this.email || !this.password) return;
    this.error.set('');

    this.auth.signIn({
      email: this.email,
      password: this.password,
      rememberMe: this.rememberMe,
    }).subscribe({
      next: () => {
        this.router.navigate([this.auth.getHomeRoute()]);
      },
      error: (err: Error) => {
        this.error.set(err.message);
      },
    });
  }

  loginAs(role: 'student-1' | 'student-2' | 'student-3' | 'faculty' | 'admin' | 'superadmin'): void {
    const accounts: Record<string, { email: string; password: string }> = {
      'student-1': { email: 'student-1@apexeval.demo', password: 'demo' },
      'student-2': { email: 'student-2@apexeval.demo', password: 'demo' },
      'student-3': { email: 'student-3@apexeval.demo', password: 'demo' },
      faculty: { email: 'faculty@apexeval.demo', password: 'demo' },
      admin: { email: 'admin@apexeval.demo', password: 'demo' },
      superadmin: { email: 'superadmin@apexeval.demo', password: 'demo' },
    };
    const account = accounts[role];
    this.email = account.email;
    this.password = account.password;
    this.rememberMe = true;
    this.onSubmit();
  }
}
