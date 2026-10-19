import '@angular/compiler';
import { ChangeDetectorRef, Injector, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionService } from '../services/session.service';
import { TasksService } from '../services/tasks.service';
import { DashboardComponent } from './dashboard.component';

describe('Dashboard: characterized behavior and approved changes', () => {
  const navigate = vi.fn();
  const detectChanges = vi.fn();
  const list = vi.fn();
  const run = vi.fn((work: () => void) => work());
  let dashboard: DashboardComponent;
  let session: SessionService;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('localStorage', { removeItem: vi.fn(), getItem: () => null });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    session = new SessionService();
    session.start({ token: 'test-token', user: { username: 'student' } });
    navigate.mockReset().mockResolvedValue(true);
    detectChanges.mockReset();
    run.mockClear();
    list.mockReset().mockResolvedValue([]);
    const injector = Injector.create({ providers: [
      { provide: Router, useValue: { navigate } },
      { provide: ChangeDetectorRef, useValue: { detectChanges } },
      { provide: NgZone, useValue: { run } },
      { provide: TasksService, useValue: { list } }
    ] });
    dashboard = new DashboardComponent(
      injector.get(Router), injector.get(ChangeDetectorRef), injector.get(NgZone),
      session, injector.get(TasksService)
    );
  });

  it.each(['student', '', 'a&owner=b'])('preserves owner %s and token', async username => {
    session.start({ token: 'test-token', user: { username } });
    await dashboard.ngOnInit();
    expect(list).toHaveBeenCalledWith(username, 'test-token');
    expect(dashboard.loading).toBe(false);
    expect(detectChanges).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('uses empty owner for optional username', async () => {
    session.start({ token: 'test-token', user: {} });
    await dashboard.ngOnInit();
    expect(list).toHaveBeenCalledWith('', 'test-token');
  });

  it('redirects without querying if session is missing', async () => {
    session.clear();
    await dashboard.ngOnInit();
    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(list).not.toHaveBeenCalled();
  });

  it('presents tasks, finishes once and preserves raw list', async () => {
    const tasks = [
      { title: 'removed', status: 'ARCHIVED', priority: 'z' },
      { title: 'low', status: 'TODO', priority: 'LOW', owner: 'student' },
      { title: 'high', status: 'DONE', priority: 'HIGH', owner: 'trainer' },
      { title: 'lowercase', status: 'archived' }
    ];
    list.mockResolvedValue(tasks);
    const pending = dashboard.ngOnInit();
    expect(dashboard.loading).toBe(true);
    await pending;
    expect(dashboard.visibleTasks.map(task => task.title)).toEqual(['low', 'high', 'lowercase']);
    expect(dashboard.visibleTasks[2].label).toBe('NORMAL · SIN-ASIGNAR');
    expect(dashboard.tasks).toBe(tasks);
    expect(detectChanges).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('finishes a response resolved outside Angular zone', async () => {
    const outside = Promise.resolve([{ title: 'outside' }]);
    list.mockReturnValue(outside);
    await dashboard.ngOnInit();
    expect(dashboard.visibleTasks[0].title).toBe('outside');
    expect(run).toHaveBeenCalledTimes(1);
    expect(detectChanges).toHaveBeenCalledTimes(1);
  });

  it('shows safe error, finishes once and does not redirect', async () => {
    list.mockRejectedValue(new Error('private detail'));
    await dashboard.ngOnInit();
    expect(dashboard.error).toBe('No se pudo cargar el dashboard. Intenta nuevamente.');
    expect(dashboard.loading).toBe(false);
    expect(detectChanges).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
    expect(session.session).not.toBeNull();
  });

  it('logout clears session and visible user/tasks, preserves preferences', async () => {
    session.preferences.compact = true;
    await dashboard.ngOnInit();
    await dashboard.logout();
    expect(session.session).toBeNull();
    expect(session.preferences.compact).toBe(true);
    expect(dashboard.user).toEqual({});
    expect(dashboard.tasks).toEqual([]);
    expect(dashboard.visibleTasks).toEqual([]);
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
