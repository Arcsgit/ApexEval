import { Component, ChangeDetectionStrategy, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { SubmissionsService } from '../../../core/services/submissions.service';
import { CoursesService } from '../../../core/services/courses.service';
import { Submission, SubmissionFilter, EvaluationResult } from '../../../core/models';

@Component({
  selector: 'app-faculty-submissions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="submissions-page">
      <header class="page-header">
        <div class="header-content">
          <h1>Submissions</h1>
          <p class="header-sub">Review and grade student submissions across your courses.</p>
        </div>
      </header>

      <div class="filters-bar">
        <div class="search-box">
          <span class="material-symbols-outlined search-icon">search</span>
          <input 
            type="text" 
            [ngModel]="searchQuery()"
            (ngModelChange)="onSearchChange($event)"
            placeholder="Search by student, assignment, or course..." 
            class="search-input" />
        </div>
        
        <div class="filter-selects">
          <select 
            [ngModel]="statusFilter()"
            (ngModelChange)="onStatusChange($event)"
            class="filter-select">
            <option value="">All Statuses</option>
            <option value="flagged_for_review">Needs Review</option>
            <option value="pass">Passed</option>
            <option value="fail">Failed</option>
            <option value="running">Running</option>
          </select>
        </div>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Course</th>
              <th>Assignment</th>
              <th>Status</th>
              <th>Score</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (sub of submissions(); track sub.id) {
              <tr>
                <td class="font-medium">
                  {{ sub.studentName }}
                  <div class="text-xs text-tertiary">{{ sub.studentEmail }}</div>
                </td>
                <td class="text-secondary">{{ sub.courseName }}</td>
                <td class="font-medium">{{ sub.assignmentTitle }}</td>
                <td>
                  <span class="result-badge" [attr.data-result]="sub.result">{{ formatResult(sub.result) }}</span>
                </td>
                <td>
                  <span [class.text-pass]="sub.result === 'pass'" [class.text-fail]="sub.result === 'fail'">
                    {{ sub.score !== undefined ? sub.score + '%' : '-' }}
                  </span>
                </td>
                <td class="text-tertiary">{{ sub.submittedAt | date:'MMM d, y, h:mm a' }}</td>
                <td>
                  <!-- In a real app, this would open a grading/review modal or page -->
                  <button class="btn-text" (click)="reviewSubmission(sub)">Review</button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" class="empty-cell">
                  <div class="empty-state">
                    <span class="material-symbols-outlined empty-icon">assignment_turned_in</span>
                    <p>No submissions found matching the criteria.</p>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      
      @if (totalPages() > 1) {
        <div class="pagination">
          <button 
            class="page-btn" 
            [disabled]="currentPage() === 1"
            (click)="onPageChange(currentPage() - 1)">
            Previous
          </button>
          <span class="page-info">Page {{ currentPage() }} of {{ totalPages() }}</span>
          <button 
            class="page-btn" 
            [disabled]="currentPage() === totalPages()"
            (click)="onPageChange(currentPage() + 1)">
            Next
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .submissions-page { max-width: var(--content-max-width); }
    
    .page-header { margin-bottom: var(--space-6); }
    .page-header h1 { font-size: var(--text-3xl); font-weight: var(--weight-bold); letter-spacing: -0.02em; }
    .header-sub { color: var(--text-secondary); margin-top: var(--space-2); }
    
    .filters-bar { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); margin-bottom: var(--space-6); flex-wrap: wrap; }
    .search-box { position: relative; flex: 1; min-width: 250px; max-width: 400px; }
    .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-tertiary); font-size: 20px; }
    .search-input { width: 100%; height: 40px; padding: 0 12px 0 40px; border: 1px solid var(--border-primary); border-radius: var(--radius-md); background: var(--surface-primary); color: var(--text-primary); font-size: var(--text-sm); }
    .search-input:focus { outline: none; border-color: var(--color-orange); box-shadow: 0 0 0 3px var(--color-orange-light); }
    
    .filter-selects { display: flex; gap: var(--space-3); }
    .filter-select { height: 40px; padding: 0 32px 0 12px; border: 1px solid var(--border-primary); border-radius: var(--radius-md); background: var(--surface-primary) url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M480-360 280-560h400L480-360Z" fill="%23666"/></svg>') no-repeat right 8px center; -webkit-appearance: none; appearance: none; color: var(--text-primary); font-size: var(--text-sm); cursor: pointer; }
    .filter-select:focus { outline: none; border-color: var(--color-orange); }
    
    .table-container { width: 100%; overflow-x: auto; border: 1px solid var(--border-primary); border-radius: var(--radius-lg); background: var(--surface-primary); margin-bottom: var(--space-6); }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; }
    .data-table th { padding: var(--space-3) var(--space-4); font-size: var(--text-xs); font-weight: var(--weight-medium); color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border-primary); background: var(--surface-secondary); }
    .data-table td { padding: var(--space-3) var(--space-4); font-size: var(--text-sm); border-bottom: 1px solid var(--border-secondary); }
    .data-table tr:last-child td { border-bottom: none; }
    .data-table tr:hover { background: var(--surface-secondary); }
    
    .font-medium { font-weight: var(--weight-medium); }
    .text-secondary { color: var(--text-secondary); }
    .text-tertiary { color: var(--text-tertiary); }
    .text-xs { font-size: var(--text-xs); margin-top: 2px; }
    .text-pass { color: var(--color-pass); font-weight: var(--weight-medium); }
    .text-fail { color: var(--color-fail); font-weight: var(--weight-medium); }
    
    .result-badge { font-size: 10px; font-weight: var(--weight-bold); text-transform: uppercase; padding: 2px 8px; border-radius: var(--radius-sm); }
    .result-badge[data-result="pass"] { color: var(--color-pass); background: var(--color-pass-bg); }
    .result-badge[data-result="fail"] { color: var(--color-fail); background: var(--color-fail-bg); }
    .result-badge[data-result="flagged_for_review"] { color: var(--color-flagged); background: var(--color-flagged-bg); }
    .result-badge[data-result="running"] { color: var(--color-running); background: var(--color-running-bg); }
    
    .btn-text { background: none; border: none; color: var(--color-orange); font-size: var(--text-sm); font-weight: var(--weight-medium); cursor: pointer; padding: 0; }
    .btn-text:hover { text-decoration: underline; }
    
    .empty-cell { padding: var(--space-10) var(--space-4) !important; }
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-3); color: var(--text-tertiary); }
    .empty-icon { font-size: 32px; }
    
    .pagination { display: flex; align-items: center; justify-content: space-between; padding: 0 var(--space-2); }
    .page-btn { padding: 6px 12px; border: 1px solid var(--border-primary); border-radius: var(--radius-md); background: var(--surface-primary); color: var(--text-primary); font-size: var(--text-sm); cursor: pointer; transition: all var(--transition-fast); }
    .page-btn:hover:not(:disabled) { background: var(--surface-secondary); }
    .page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .page-info { font-size: var(--text-sm); color: var(--text-secondary); }
  `]
})
export class FacultySubmissionsComponent implements OnInit {
  readonly submissions = signal<Submission[]>([]);
  readonly totalPages = signal(1);
  readonly currentPage = signal(1);
  
  readonly searchQuery = signal('');
  readonly statusFilter = signal('');
  
  // Faculty only sees submissions for their assigned courses
  private facultyCourseIds: string[] = [];

  constructor(
    private auth: AuthService,
    private submissionsService: SubmissionsService,
    private coursesService: CoursesService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (user) {
      this.coursesService.getFacultyCourses(user.id).subscribe(courses => {
        this.facultyCourseIds = courses.map(c => c.id);
        
        // Handle query params initial load
        this.route.queryParams.subscribe(params => {
          if (params['status']) {
            this.statusFilter.set(params['status']);
          }
          if (params['search']) {
            this.searchQuery.set(params['search']);
          }
          this.loadSubmissions();
        });
      });
    }
  }
  
  onSearchChange(val: string): void {
    this.searchQuery.set(val);
    this.currentPage.set(1);
    this.loadSubmissions();
  }
  
  onStatusChange(val: string): void {
    this.statusFilter.set(val);
    this.currentPage.set(1);
    this.loadSubmissions();
  }
  
  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadSubmissions();
  }

  loadSubmissions(): void {
    const filter: SubmissionFilter = {
      page: this.currentPage(),
      pageSize: 15,
      sortBy: 'submittedAt',
      sortDirection: 'desc'
    };
    
    if (this.searchQuery()) {
      filter.search = this.searchQuery();
    }
    
    if (this.statusFilter()) {
      filter.status = this.statusFilter() as EvaluationResult;
    }
    
    this.submissionsService.getSubmissions(filter).subscribe(res => {
      // Filter out submissions that do not belong to the faculty's courses
      // (In a real app, the API would accept facultyId or an array of courseIds)
      const filteredForFaculty = res.data.filter(s => this.facultyCourseIds.includes(s.courseId));
      
      this.submissions.set(filteredForFaculty);
      
      // Calculate realistic pagination
      this.totalPages.set(Math.ceil(res.total / filter.pageSize!));
      this.currentPage.set(res.page);
    });
  }

  formatResult(r?: string): string {
    return { pass: 'Passed', fail: 'Failed', flagged_for_review: 'Needs Review', running: 'Running' }[r ?? ''] ?? r ?? '';
  }
  
  reviewSubmission(sub: Submission): void {
    alert(`In a real application, this would open a grading/review interface for ${sub.studentName}'s submission of ${sub.assignmentTitle}.`);
  }
}
