/* ============================================================
   ApexEval — Superadmin Service (Mock)
   ============================================================ */

import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import {
  RunnerHealth, SandboxHealth, PlatformMetrics, CurrentJob,
  AuditEntry, AuditFilter, PaginatedResponse, PlatformSettings,
  User
} from '../models';
import {
  MOCK_RUNNERS, MOCK_SANDBOX_HEALTH, MOCK_PLATFORM_METRICS,
  MOCK_CURRENT_JOBS, MOCK_AUDIT_LOG, MOCK_PLATFORM_SETTINGS
} from '../mock';
import { MOCK_ADMINS, MOCK_SUPERADMINS, MOCK_FACULTY } from '../mock';

@Injectable({ providedIn: 'root' })
export class SuperadminService {

  getRunners(): Observable<RunnerHealth[]> {
    return of(MOCK_RUNNERS).pipe(delay(300));
  }

  getSandboxHealth(): Observable<SandboxHealth> {
    return of(MOCK_SANDBOX_HEALTH).pipe(delay(200));
  }

  getPlatformMetrics(): Observable<PlatformMetrics> {
    return of(MOCK_PLATFORM_METRICS).pipe(delay(200));
  }

  getCurrentJobs(): Observable<CurrentJob[]> {
    return of(MOCK_CURRENT_JOBS).pipe(delay(250));
  }

  getAuditLog(filter: AuditFilter): Observable<PaginatedResponse<AuditEntry>> {
    let filtered = [...MOCK_AUDIT_LOG];

    if (filter.action) {
      filtered = filtered.filter(e => e.action === filter.action);
    }
    if (filter.actorId) {
      filtered = filtered.filter(e => e.actorId === filter.actorId);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      filtered = filtered.filter(e =>
        e.actorName.toLowerCase().includes(q) ||
        e.target.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q)
      );
    }
    if (filter.dateFrom) {
      filtered = filtered.filter(e => e.timestamp >= filter.dateFrom!);
    }
    if (filter.dateTo) {
      filtered = filtered.filter(e => e.timestamp <= filter.dateTo!);
    }

    const total = filtered.length;
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 10;
    const start = (page - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize);

    return of({ data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }).pipe(delay(300));
  }

  getSettings(): Observable<PlatformSettings> {
    const saved = localStorage.getItem('apexeval_settings');
    if (saved) {
      try {
        return of(JSON.parse(saved) as PlatformSettings).pipe(delay(200));
      } catch { /* fall through */ }
    }
    return of({ ...MOCK_PLATFORM_SETTINGS }).pipe(delay(200));
  }

  updateSettings(settings: PlatformSettings): Observable<PlatformSettings> {
    localStorage.setItem('apexeval_settings', JSON.stringify(settings));
    return of(settings).pipe(delay(500));
  }

  getAdministrators(): Observable<User[]> {
    return of([...MOCK_ADMINS, ...MOCK_SUPERADMINS, ...MOCK_FACULTY]).pipe(delay(300));
  }

  createAdmin(admin: Partial<User>): Observable<User> {
    const newAdmin: User = {
      id: `adm-${Date.now()}`,
      email: admin.email ?? '',
      firstName: admin.firstName ?? '',
      lastName: admin.lastName ?? '',
      role: admin.role ?? 'admin',
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    MOCK_ADMINS.push(newAdmin);
    return of(newAdmin).pipe(delay(500));
  }

  toggleAdminStatus(id: string): Observable<User> {
    const admin = [...MOCK_ADMINS, ...MOCK_SUPERADMINS, ...MOCK_FACULTY].find(a => a.id === id);
    if (admin) {
      admin.isActive = !admin.isActive;
    }
    return of(admin!).pipe(delay(400));
  }

  changeAdminRole(id: string, newRole: 'faculty' | 'admin' | 'superadmin'): Observable<User> {
    const admin = [...MOCK_ADMINS, ...MOCK_SUPERADMINS, ...MOCK_FACULTY].find(a => a.id === id);
    if (admin) {
      admin.role = newRole;
    }
    return of(admin!).pipe(delay(400));
  }
}
