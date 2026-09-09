/* ============================================================
   ApexEval — Mock Data: Users
   ============================================================ */

import { User } from '../models';

export const MOCK_STUDENTS: User[] = [
  { id: 'student-1', email: 'student-1@apexeval.demo', firstName: 'Alex', lastName: 'Chen', role: 'student', isActive: true, createdAt: '2025-08-15T10:00:00Z', lastLoginAt: '2026-09-04T08:30:00Z', workspacePath: '/Users/archit/projectS/ApexEval/workspaces/student-1' },
  { id: 'student-2', email: 'student-2@apexeval.demo', firstName: 'Priya', lastName: 'Sharma', role: 'student', isActive: true, createdAt: '2025-08-15T10:00:00Z', lastLoginAt: '2026-09-03T14:22:00Z', workspacePath: '/Users/archit/projectS/ApexEval/workspaces/student-2' },
  { id: 'student-3', email: 'student-3@apexeval.demo', firstName: 'Marcus', lastName: 'Johnson', role: 'student', isActive: true, createdAt: '2025-08-16T09:00:00Z', lastLoginAt: '2026-09-04T09:15:00Z', workspacePath: '/Users/archit/projectS/ApexEval/workspaces/student-3' },
];

// Faculty — course instructors (scoped to their own courses only)
export const MOCK_FACULTY: User[] = [
  { id: 'fac-001', email: 'dr.mitchell@university.edu', firstName: 'Dr. Sarah', lastName: 'Mitchell', role: 'faculty', isActive: true, createdAt: '2025-01-10T09:00:00Z', lastLoginAt: '2026-09-04T08:00:00Z' },
  { id: 'fac-002', email: 'prof.kumar@university.edu', firstName: 'Prof. Raj', lastName: 'Kumar', role: 'faculty', isActive: true, createdAt: '2025-02-15T10:00:00Z', lastLoginAt: '2026-09-03T14:00:00Z' },
  { id: 'fac-003', email: 'dr.foster@university.edu', firstName: 'Dr. Emily', lastName: 'Foster', role: 'faculty', isActive: true, createdAt: '2025-03-20T11:00:00Z', lastLoginAt: '2026-09-02T09:30:00Z' },
];

// Admin — department head (sees all department courses)
export const MOCK_ADMINS: User[] = [
  { id: 'adm-001', email: 'admin@apexeval.demo', firstName: 'Dr. Robert', lastName: 'Hayes', role: 'admin', isActive: true, createdAt: '2025-01-05T09:00:00Z', lastLoginAt: '2026-09-04T07:30:00Z' },
];

export const MOCK_SUPERADMINS: User[] = [
  { id: 'sa-001', email: 'superadmin@apexeval.demo', firstName: 'Michael', lastName: 'Torres', role: 'superadmin', isActive: true, createdAt: '2024-12-01T09:00:00Z', lastLoginAt: '2026-09-04T07:00:00Z' },
  { id: 'sa-002', email: 'ops@apexeval.io', firstName: 'Lisa', lastName: 'Nakamura', role: 'superadmin', isActive: true, createdAt: '2025-01-05T10:00:00Z', lastLoginAt: '2026-09-03T22:30:00Z' },
];

export const DEMO_ACCOUNTS = {
  'student-1': { email: 'student-1@apexeval.demo', password: 'demo', user: MOCK_STUDENTS[0] },
  'student-2': { email: 'student-2@apexeval.demo', password: 'demo', user: MOCK_STUDENTS[1] },
  'student-3': { email: 'student-3@apexeval.demo', password: 'demo', user: MOCK_STUDENTS[2] },
  faculty: { email: 'faculty@apexeval.demo', password: 'demo', user: MOCK_FACULTY[0] },
  admin: { email: 'admin@apexeval.demo', password: 'demo', user: MOCK_ADMINS[0] },
  superadmin: { email: 'superadmin@apexeval.demo', password: 'demo', user: MOCK_SUPERADMINS[0] },
};

export const ALL_USERS: User[] = [...MOCK_STUDENTS, ...MOCK_FACULTY, ...MOCK_ADMINS, ...MOCK_SUPERADMINS];
