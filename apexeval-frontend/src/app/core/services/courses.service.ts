/* ============================================================
   ApexEval — Courses Service (Real Backend + Mock Fallback)
   ============================================================ */

import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  Course, CourseWithProgress, CourseEnrollment, Assignment,
  StudentAssignment, StudentAssignmentStatus, PaginatedResponse, User, CourseWeek
} from '../models';
import { MOCK_COURSES, MOCK_ENROLLMENTS, MOCK_ASSIGNMENTS, MOCK_STUDENTS } from '../mock';
import { MOCK_SUBMISSIONS } from '../mock';
import { ApiService } from '../api/api.service';

@Injectable({ providedIn: 'root' })
export class CoursesService {

  constructor(private readonly api: ApiService) {}

  private enrichCourseWeeks(course: Course): Course {
    if (!course.weeks) return course;
    const now = new Date();
    const weeks = course.weeks.map(w => {
      let status = w.status;
      if (w.unlockMethod === 'manual') {
        status = 'available';
      } else {
        const release = new Date(w.releaseDate);
        if (now >= release) {
          status = 'available';
        } else {
          status = 'locked';
        }
      }
      return { ...w, status };
    });
    return { ...course, weeks };
  }

  getCourses(): Observable<Course[]> {
    return of(MOCK_COURSES.map(c => this.enrichCourseWeeks(c))).pipe(delay(300));
  }

  getActiveCourses(): Observable<Course[]> {
    return of(MOCK_COURSES.filter(c => c.status === 'active').map(c => this.enrichCourseWeeks(c))).pipe(delay(300));
  }

  getCourseById(id: string): Observable<Course | undefined> {
    const c = MOCK_COURSES.find(c => c.id === id);
    return of(c ? this.enrichCourseWeeks(c) : undefined).pipe(delay(200));
  }

  getFacultyCourses(facultyId: string): Observable<Course[]> {
    return of(MOCK_COURSES.filter(c => c.instructorId === facultyId).map(c => this.enrichCourseWeeks(c))).pipe(delay(300));
  }

  getCourseStudents(courseId: string): Observable<{ student: User; enrollment: CourseEnrollment }[]> {
    const enrolled = MOCK_ENROLLMENTS.filter(e => e.courseId === courseId);
    const result = enrolled
      .map(e => {
        const student = MOCK_STUDENTS.find(s => s.id === e.studentId);
        return student ? { student, enrollment: e } : null;
      })
      .filter((r): r is { student: User; enrollment: CourseEnrollment } => r !== null);
    return of(result).pipe(delay(300));
  }

  getStudentCourses(studentId: string): Observable<CourseWithProgress[]> {
    const enrollments = MOCK_ENROLLMENTS.filter(e => e.studentId === studentId);
    const courses: CourseWithProgress[] = enrollments
      .map(enrollment => {
        const course = MOCK_COURSES.find(c => c.id === enrollment.courseId);
        if (!course) return null;
        return { ...this.enrichCourseWeeks(course), enrollment };
      })
      .filter((c): c is CourseWithProgress => c !== null);
    return of(courses).pipe(delay(300));
  }

  getCourseAssignments(courseId: string): Observable<Assignment[]> {
    // Try real API first, fallback to mock
    return this.api.getAssignments().pipe(
      map(assignments => assignments.filter(a => a.courseId === courseId)),
      catchError(() => of(MOCK_ASSIGNMENTS.filter(a => a.courseId === courseId)))
    );
  }

  getStudentAssignments(courseId: string, studentId: string): Observable<StudentAssignment[]> {
    // First try to get assignments from real API
    return this.api.getAssignments().pipe(
      map(assignments => assignments.filter(a => a.courseId === courseId && a.status === 'published')),
      map(assignments => this.mapToStudentAssignments(assignments, studentId)),
      catchError(() => this.getMockStudentAssignments(courseId, studentId))
    );
  }

  getAssignmentById(id: string): Observable<Assignment | undefined> {
    // Try real API first, fallback to mock
    return this.api.getAssignmentById(id).pipe(
      catchError(() => of(MOCK_ASSIGNMENTS.find(a => a.id === id)))
    );
  }

  private mapToStudentAssignments(assignments: Assignment[], studentId: string): StudentAssignment[] {
    return assignments.map(a => {
      const submissions = MOCK_SUBMISSIONS.filter(
        s => s.assignmentId === a.id && s.studentId === studentId
      );
      const bestSubmission = submissions.find(s => s.result === 'pass');
      const latestSubmission = submissions[submissions.length - 1];
      const now = new Date();
      const dueDate = new Date(a.dueDate);

      let studentStatus: StudentAssignmentStatus = 'not_started';
      if (bestSubmission) {
        studentStatus = 'passed';
      } else if (latestSubmission?.result === 'flagged_for_review') {
        studentStatus = 'flagged';
      } else if (latestSubmission?.result === 'fail') {
        studentStatus = dueDate < now ? 'overdue' : 'failed';
      } else if (submissions.length > 0) {
        studentStatus = 'submitted';
      } else if (dueDate < now) {
        studentStatus = 'overdue';
      }

      const draftKey = `apexeval_draft_${a.id}_${studentId}`;
      const hasDraft = localStorage.getItem(draftKey);
      if (!submissions.length && hasDraft) {
        studentStatus = 'in_progress';
      }

      return {
        ...a,
        studentStatus,
        attemptsUsed: submissions.length,
        bestScore: bestSubmission?.score ?? latestSubmission?.score,
        lastSubmissionAt: latestSubmission?.submittedAt,
      };
    });
  }

  private getMockStudentAssignments(courseId: string, studentId: string): Observable<StudentAssignment[]> {
    const assignments = MOCK_ASSIGNMENTS.filter(a => a.courseId === courseId && a.status === 'published');
    const studentAssignments: StudentAssignment[] = assignments.map(a => {
      const submissions = MOCK_SUBMISSIONS.filter(
        s => s.assignmentId === a.id && s.studentId === studentId
      );
      const bestSubmission = submissions.find(s => s.result === 'pass');
      const latestSubmission = submissions[submissions.length - 1];
      const now = new Date();
      const dueDate = new Date(a.dueDate);

      let studentStatus: StudentAssignmentStatus = 'not_started';
      if (bestSubmission) {
        studentStatus = 'passed';
      } else if (latestSubmission?.result === 'flagged_for_review') {
        studentStatus = 'flagged';
      } else if (latestSubmission?.result === 'fail') {
        studentStatus = dueDate < now ? 'overdue' : 'failed';
      } else if (submissions.length > 0) {
        studentStatus = 'submitted';
      } else if (dueDate < now) {
        studentStatus = 'overdue';
      }

      const draftKey = `apexeval_draft_${a.id}_${studentId}`;
      const hasDraft = localStorage.getItem(draftKey);
      if (!submissions.length && hasDraft) {
        studentStatus = 'in_progress';
      }

      return {
        ...a,
        studentStatus,
        attemptsUsed: submissions.length,
        bestScore: bestSubmission?.score ?? latestSubmission?.score,
        lastSubmissionAt: latestSubmission?.submittedAt,
      };
    });
    return of(studentAssignments).pipe(delay(300));
  }

  createCourse(course: Partial<Course>): Observable<Course> {
    const newCourse: Course = {
      id: `crs-${Date.now()}`,
      code: course.code ?? '',
      title: course.title ?? '',
      description: course.description ?? '',
      instructorId: course.instructorId ?? '',
      instructorName: course.instructorName ?? '',
      status: 'draft',
      startDate: course.startDate ?? new Date().toISOString(),
      endDate: course.endDate ?? new Date().toISOString(),
      totalWeeks: course.totalWeeks ?? 16,
      currentWeek: 1,
      studentCount: 0,
      assignmentCount: 0,
      createdAt: new Date().toISOString(),
    };
    MOCK_COURSES.push(newCourse);
    return of(newCourse).pipe(delay(500));
  }

  createAssignment(assignment: Partial<Assignment>): Observable<Assignment> {
    const newAssignment: Assignment = {
      id: `asg-${Date.now()}`,
      courseId: assignment.courseId ?? '',
      courseName: assignment.courseName ?? '',
      title: assignment.title ?? '',
      description: assignment.description ?? '',
      requirements: assignment.requirements ?? [],
      constraints: assignment.constraints ?? [],
      allowedLanguages: assignment.allowedLanguages ?? ['java'],
      defaultLanguage: assignment.defaultLanguage ?? 'java',
      difficulty: assignment.difficulty ?? 'medium',
      week: assignment.week ?? 1,
      day: assignment.day ?? 1,
      dueDate: assignment.dueDate ?? new Date().toISOString(),
      maxAttempts: assignment.maxAttempts ?? 5,
      runtimeLimitMs: assignment.runtimeLimitMs ?? 10000,
      memoryLimitMb: assignment.memoryLimitMb ?? 256,
      status: 'draft',
      totalTests: assignment.totalTests ?? 0,
      totalHiddenTests: assignment.totalHiddenTests ?? 0,
      totalStaticChecks: assignment.totalStaticChecks ?? 0,
      createdAt: new Date().toISOString(),
    };
    MOCK_ASSIGNMENTS.push(newAssignment);
    return of(newAssignment).pipe(delay(500));
  }

  publishAssignment(id: string): Observable<Assignment> {
    const assignment = MOCK_ASSIGNMENTS.find(a => a.id === id);
    if (assignment) {
      assignment.status = 'published';
      assignment.publishedAt = new Date().toISOString();
    }
    return of(assignment!).pipe(delay(400));
  }

  manuallyUnlockWeek(courseId: string, weekNumber: number): Observable<boolean> {
    const course = MOCK_COURSES.find(c => c.id === courseId);
    if (!course || !course.weeks) return of(false);
    
    const week = course.weeks.find(w => w.number === weekNumber);
    if (week) {
      week.unlockMethod = 'manual';
      week.status = 'available';
    }
    return of(true).pipe(delay(300));
  }
}