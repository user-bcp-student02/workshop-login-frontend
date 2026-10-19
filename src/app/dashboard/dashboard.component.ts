import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '../models/auth.models';
import { Task, VisibleTask } from '../models/task.models';
import { SessionService } from '../services/session.service';
import { TasksService } from '../services/tasks.service';
import { statusLabel, visibleTasks } from '../utils/task-presentation';
import { userFacingError } from '../utils/user-facing-error';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  tasks: Task[] = [];
  visibleTasks: VisibleTask[] = [];
  user: User = {};
  loading = true;
  error = '';
  readonly statusLabel = statusLabel;

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    readonly session: SessionService,
    private taskService: TasksService
  ) {}

  async ngOnInit(): Promise<void> {
    const authenticated = this.session.session;
    if (!authenticated) {
      await this.router.navigate(['/login']);
      return;
    }
    this.user = authenticated.user;
    try {
      this.tasks = await this.taskService.list(this.user.username || '', authenticated.token);
      this.visibleTasks = visibleTasks(this.tasks);
    } catch (error: unknown) {
      this.error = userFacingError(error, 'tasks');
    } finally {
      this.zone.run(() => {
        this.loading = false;
        this.cdr.detectChanges();
      });
    }
  }

  async logout(): Promise<void> {
    this.session.clear();
    this.user = {};
    this.tasks = [];
    this.visibleTasks = [];
    await this.router.navigate(['/login']);
  }
}
