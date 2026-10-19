import '@angular/compiler';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Injector } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TasksService } from './tasks.service';

describe('TasksService HTTP contract', () => {
  let tasks: TasksService;
  let http: HttpTestingController;
  beforeEach(() => {
    const injector = Injector.create({ providers: provideHttpClientTesting() });
    http = injector.get(HttpTestingController);
    tasks = new TasksService(new HttpClient(injector.get(HttpBackend)));
  });
  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it.each(['student', '', 'a&owner=b'])('preserves URL for owner %s and bearer', async owner => {
    const pending = tasks.list(owner, 'test-token');
    const request = http.expectOne('http://localhost:8000/api/tasks?owner=' + owner);
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
    const response = [{ title: 'Task', description: 'Description', status: 'CUSTOM', priority: 'HIGH', owner }];
    request.flush(response);
    expect(await pending).toEqual(response);
  });

  it('keeps GET pending beyond login timeout and accepts scalar label values', async () => {
    vi.useFakeTimers();
    const pending = tasks.list('', 'test-token');
    const request = http.expectOne('http://localhost:8000/api/tasks?owner=');
    await vi.advanceTimersByTimeAsync(6000);
    expect(request.cancelled).toBe(false);
    request.flush([{}, { priority: 0, owner: false }, { priority: null, owner: null }]);
    expect(await pending).toHaveLength(3);
  });

  it.each([null, {}, [null], [{ title: 1 }], [{ status: false }], [{ priority: {} }], [{ owner: [] }]]
    .map(response => ({ response })))
    ('rejects malformed tasks $response rather than a success-shaped empty list', async ({ response }) => {
      const pending = tasks.list('', 'test-token');
      const assertion = expect(pending).rejects.toMatchObject({ reason: 'invalid-response' });
      http.expectOne('http://localhost:8000/api/tasks?owner=').flush(response);
      await assertion;
    });

  it.each([401, 403, 500])('propagates %s without another request', async status => {
    const pending = tasks.list('student', 'test-token');
    const assertion = expect(pending).rejects.toMatchObject({ status });
    http.expectOne('http://localhost:8000/api/tasks?owner=student')
      .flush({ detail: 'private' }, { status, statusText: 'Rejected' });
    await assertion;
    http.expectNone('http://localhost:8080/auth/login');
  });

  it('propagates network errors', async () => {
    const pending = tasks.list('', 'test-token');
    const assertion = expect(pending).rejects.toMatchObject({ status: 0 });
    const networkError = new class extends Event {
      readonly lengthComputable = false;
      readonly loaded = 0;
      readonly total = 0;
    }('error');
    http.expectOne('http://localhost:8000/api/tasks?owner=').error(networkError);
    await assertion;
  });
});
