/* ============================================================
   ApexEval — Application Routes
   ============================================================ */

import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/guards/guards';

export const routes: Routes = [
  {
    path: 'sign-in',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/sign-in/sign-in.component').then(m => m.SignInComponent),
  },
  {
    path: 'student',
    canActivate: [authGuard, roleGuard('student')],
    loadComponent: () => import('./shared/layouts/app-shell/app-shell.component').then(m => m.AppShellComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/student/dashboard/student-dashboard.component').then(m => m.StudentDashboardComponent),
      },
      {
        path: 'courses/:courseId',
        loadComponent: () => import('./features/student/course-home/course-home.component').then(m => m.CourseHomeComponent),
      },
      {
        path: 'courses/:courseId/assignments/:assignmentId',
        loadComponent: () => import('./features/student/assignment-workspace/assignment-workspace.component').then(m => m.AssignmentWorkspaceComponent),
      },
      {
        path: 'submissions',
        loadComponent: () => import('./features/student/submission-history/submission-history.component').then(m => m.SubmissionHistoryComponent),
      },
      {
        path: 'submissions/:submissionId',
        loadComponent: () => import('./features/student/result-detail/result-detail.component').then(m => m.ResultDetailComponent),
      },
    ],
  },
  {
    path: 'faculty',
    canActivate: [authGuard, roleGuard('faculty')],
    loadComponent: () => import('./shared/layouts/app-shell/app-shell.component').then(m => m.AppShellComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/faculty/dashboard/faculty-dashboard.component').then(m => m.FacultyDashboardComponent),
      },
      {
        path: 'courses',
        loadComponent: () => import('./features/faculty/courses/faculty-courses.component').then(m => m.FacultyCoursesComponent),
      },
      {
        path: 'courses/:courseId',
        loadComponent: () => import('./features/faculty/course-detail/faculty-course-detail.component').then(m => m.FacultyCourseDetailComponent),
      },
      {
        path: 'submissions',
        loadComponent: () => import('./features/faculty/submissions/faculty-submissions.component').then(m => m.FacultySubmissionsComponent),
      },
    ],
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard('admin')],
    loadComponent: () => import('./shared/layouts/app-shell/app-shell.component').then(m => m.AppShellComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
      },
      {
        path: 'courses',
        loadComponent: () => import('./features/admin/courses/admin-courses.component').then(m => m.AdminCoursesComponent),
      },
      {
        path: 'courses/:courseId',
        loadComponent: () => import('./features/admin/course-detail/admin-course-detail.component').then(m => m.AdminCourseDetailComponent),
      },
      {
        path: 'courses/:courseId/assignments/new',
        loadComponent: () => import('./features/admin/assignment-creator/assignment-creator.component').then(m => m.AssignmentCreatorComponent),
      },
      {
        path: 'courses/:courseId/assignments/:assignmentId',
        loadComponent: () => import('./features/admin/assignment-detail/admin-assignment-detail.component').then(m => m.AdminAssignmentDetailComponent),
      },
      {
        path: 'submissions',
        loadComponent: () => import('./features/admin/submissions/admin-submissions.component').then(m => m.AdminSubmissionsComponent),
      },
      {
        path: 'analytics',
        loadComponent: () => import('./features/admin/analytics/admin-analytics.component').then(m => m.AdminAnalyticsComponent),
      },
    ],
  },
  {
    path: 'superadmin',
    canActivate: [authGuard, roleGuard('superadmin')],
    loadComponent: () => import('./shared/layouts/app-shell/app-shell.component').then(m => m.AppShellComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/superadmin/dashboard/superadmin-dashboard.component').then(m => m.SuperadminDashboardComponent),
      },
      {
        path: 'admins',
        loadComponent: () => import('./features/superadmin/admins/admin-management.component').then(m => m.AdminManagementComponent),
      },
      {
        path: 'platform',
        loadComponent: () => import('./features/superadmin/platform/platform-settings.component').then(m => m.PlatformSettingsComponent),
      },
      {
        path: 'health',
        loadComponent: () => import('./features/superadmin/health/system-health.component').then(m => m.SystemHealthComponent),
      },
      {
        path: 'audit',
        loadComponent: () => import('./features/superadmin/audit/audit-log.component').then(m => m.AuditLogComponent),
      },
      {
        path: 'submissions',
        loadComponent: () => import('./features/superadmin/submissions/global-submissions.component').then(m => m.GlobalSubmissionsComponent),
      },
    ],
  },
  {
    path: '403',
    loadComponent: () => import('./shared/components/error-pages/forbidden.component').then(m => m.ForbiddenComponent),
  },
  {
    path: '404',
    loadComponent: () => import('./shared/components/error-pages/not-found.component').then(m => m.NotFoundComponent),
  },
  { path: '', redirectTo: '/sign-in', pathMatch: 'full' },
  { path: '**', redirectTo: '/404' },
];
