import '@angular/compiler';
import { HttpBackend, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChangeDetectorRef, Injector, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { TimeoutError, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';
import { TasksService } from '../services/tasks.service';
import { LoginComponent } from './login.component';

const LOGIN_URL = 'http://localhost:8080/auth/login';
const TASKS_URL = 'http://localhost:8000/api/tasks?owner=student';
const LOGIN_RESPONSE = {
  token: 'flow-test-token',
  user: { username: 'student', displayName: 'Student' }
};
const LOGIN_ERROR = 'No se pudo autenticar. Intenta nuevamente.';
const TASKS_ERROR = 'No se pudo cargar el dashboard. Intenta nuevamente.';
const INVALID_RESPONSE = 'El servicio devolvió una respuesta no válida.';
const TIMEOUT_MESSAGE = 'La solicitud tardó demasiado. Intenta nuevamente.';

describe('Login and tasks flow: real services with controlled HTTP', () => {
  const storage = new Map<string, string>();
  const navigate = vi.fn<(commands: string[]) => Promise<boolean>>();
  const markForCheck = vi.fn();
  const detectChanges = vi.fn();
  let http: HttpTestingController;
  let client: HttpClient;
  let session: SessionService;
  let login: LoginComponent;
  let dashboard: DashboardComponent;

  beforeEach(() => {
    vi.restoreAllMocks();
    storage.clear();
    navigate.mockReset().mockResolvedValue(true);
    markForCheck.mockClear();
    detectChanges.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
      removeItem: (key: string) => storage.delete(key)
    });
    const injector = Injector.create({ providers: [
      ...provideHttpClientTesting(),
      { provide: Router, useValue: { navigate } },
      { provide: ChangeDetectorRef, useValue: { markForCheck, detectChanges } },
      { provide: NgZone, useValue: { run: (work: () => void) => work() } }
    ] });
    http = injector.get(HttpTestingController);
    client = new HttpClient(injector.get(HttpBackend));
    session = new SessionService();
    login = new LoginComponent(
      injector.get(Router), new AuthService(client, session), session,
      injector.get(ChangeDetectorRef)
    );
    login.username = 'student';
    login.password = 'test-password';
    dashboard = new DashboardComponent(
      injector.get(Router), injector.get(ChangeDetectorRef), injector.get(NgZone),
      session, new TasksService(client)
    );
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function authenticate(): Promise<void> {
    const pending = login.login();
    const request = http.expectOne(LOGIN_URL);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      username: 'student', password: 'test-password', client: 'angular-workshop'
    });
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush(LOGIN_RESPONSE);
    await pending;
    expect(login.message).toBe('');
    expect(session.session).toEqual(LOGIN_RESPONSE);
    expect(navigate).toHaveBeenCalledWith(['/dashboard']);
    navigate.mockClear();
  }

  function expectLoginFailure(message: string): void {
    expect(login.message).toBe(message);
    expect(login.busy).toBe(false);
    expect(markForCheck).toHaveBeenCalledTimes(1);
    expect(session.session).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
    expect(storage.has('workshop_token')).toBe(false);
    http.expectNone(request => request.method === 'GET');
  }

  function expectTasksFailure(message: string): void {
    expect(dashboard.error).toBe(message);
    expect(dashboard.loading).toBe(false);
    expect(dashboard.visibleTasks).toEqual([]);
    expect(detectChanges).toHaveBeenCalledTimes(1);
    expect(session.session).toEqual(LOGIN_RESPONSE);
    expect(navigate).not.toHaveBeenCalled();
    http.expectNone(() => true);
  }

  function networkFailure(): ProgressEvent {
    return new class extends Event {
      readonly lengthComputable = false;
      readonly loaded = 0;
      readonly total = 0;
    }('error');
  }

  it('happy path: login establishes session before navigation, tasks load, logout preserves preferences', async () => {
    navigate.mockImplementation(async commands => {
      if (commands[0] === '/dashboard') {
        expect(session.session).toEqual(LOGIN_RESPONSE);
      }
      return true;
    });
    await authenticate();
    const pending = dashboard.ngOnInit();
    expect(dashboard.loading).toBe(true);
    const request = http.expectOne(TASKS_URL);
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe(`Bearer ${LOGIN_RESPONSE.token}`);
    request.flush([
      { title: 'Task', description: 'Description', status: 'TODO', priority: 'HIGH', owner: 'student' },
      { title: 'Hidden', status: 'ARCHIVED' }
    ]);
    await pending;
    expect(dashboard.user.displayName).toBe('Student');
    expect(dashboard.visibleTasks).toEqual([{
      title: 'Task', description: 'Description', status: 'TODO',
      priority: 'HIGH', owner: 'student', label: 'HIGH · STUDENT'
    }]);
    expect(dashboard.loading).toBe(false);
    expect(dashboard.error).toBe('');
    expect(detectChanges).toHaveBeenCalledTimes(1);
    expect(storage.has('workshop_token')).toBe(false);
    expect(storage.has('workshop_user')).toBe(false);
    const preferences = storage.get('workshop_preferences');
    await dashboard.logout();
    expect(session.session).toBeNull();
    expect(dashboard.user).toEqual({});
    expect(dashboard.visibleTasks).toEqual([]);
    expect(storage.get('workshop_preferences')).toBe(preferences);
    expect(preferences).toBeDefined();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it.each([
    { username: '', password: '', message: 'Ingrese un usuario.' },
    { username: '   ', password: 'test-password', message: 'Ingrese un usuario.' },
    { username: 'student', password: '', message: 'Ingrese una contraseña.' },
    { username: 'student', password: '   ', message: 'Ingrese una contraseña.' }
  ])('edge: required fields $username / $password prevent requests', async ({ username, password, message }) => {
    login.username = username;
    login.password = password;
    await login.login();
    expect(login.message).toBe(message);
    expect(login.busy).toBe(false);
    expect(session.session).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
    http.expectNone(() => true);
  });

  it.each([{}, { token: '' }, { token: null }, { token: false }, { token: 0 }])
    ('edge: missing/falsy token %j prevents session and tasks', async response => {
      const pending = login.login();
      http.expectOne(LOGIN_URL).flush(response);
      await pending;
      expectLoginFailure('El backend respondió sin token.');
    });

  it.each([400, 401, 403, 404, 429, 500, 503])('login HTTP %i reaches safe UI and restores busy', async status => {
    const pending = login.login();
    expect(login.busy).toBe(true);
    http.expectOne(LOGIN_URL).flush({ message: '<b>PRIVATE_DETAIL</b>' },
      { status, statusText: 'Rejected' });
    await pending;
    expectLoginFailure(status === 401 || status === 403
      ? 'No se pudo autenticar. Revisa tus credenciales.' : LOGIN_ERROR);
  });

  it('login backend unavailable / CORS-style status 0 reaches generic UI error', async () => {
    const pending = login.login();
    http.expectOne(LOGIN_URL).error(networkFailure());
    await pending;
    expectLoginFailure(LOGIN_ERROR);
  });

  it('login timeout occurs at 5000ms, cancels request, restores UI and does not query tasks', async () => {
    vi.useFakeTimers();
    const pending = login.login();
    const request = http.expectOne(LOGIN_URL);
    await vi.advanceTimersByTimeAsync(4999);
    expect(login.busy).toBe(true);
    expect(login.message).toBe('');
    expect(request.cancelled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(request.cancelled).toBe(true);
    expectLoginFailure(TIMEOUT_MESSAGE);
  });

  it.each([
    null, [], 'unexpected', { token: 1 }, { token: 'token', user: [] },
    { token: 'token', user: { username: null } },
    { token: 'token', user: { displayName: null } }
  ].map(response => ({ response })))('login malformed successful response $response is not a successful authentication', async ({ response }) => {
    const pending = login.login();
    http.expectOne(LOGIN_URL).flush(response);
    await pending;
    expectLoginFailure(INVALID_RESPONSE);
  });

  it('login 204 without body is an explicit invalid response', async () => {
    const pending = login.login();
    http.expectOne(LOGIN_URL).flush(null, { status: 204, statusText: 'No Content' });
    await pending;
    expectLoginFailure(INVALID_RESPONSE);
  });

  it('login parse error delivered by HttpClient is generic, not a schema validation message', async () => {
    vi.spyOn(client, 'post').mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 200, error: { error: new SyntaxError('Invalid JSON'), text: 'PRIVATE_JSON' }
    })));
    await login.login();
    expectLoginFailure(LOGIN_ERROR);
  });

  it('preference save failure leaves authenticated session and visible notice without blocking tasks', async () => {
    vi.mocked(localStorage.setItem).mockImplementation(() => { throw new Error('quota'); });
    await authenticate();
    expect(login.session.notice).toBe('No se pudieron guardar las preferencias.');
    const pending = dashboard.ngOnInit();
    http.expectOne(TASKS_URL).flush([]);
    await pending;
    expect(dashboard.session.notice).toBe('No se pudieron guardar las preferencias.');
    expect(dashboard.error).toBe('');
    expect(dashboard.loading).toBe(false);
  });

  it.each([false, 'rejected'])('navigation %s reports error but does not roll back established session', async result => {
    if (result === false) navigate.mockResolvedValue(false);
    else navigate.mockRejectedValue(new Error('navigation rejected'));
    const pending = login.login();
    http.expectOne(LOGIN_URL).flush(LOGIN_RESPONSE);
    await pending;
    expect(login.message).toBe(LOGIN_ERROR);
    expect(login.busy).toBe(false);
    expect(session.session).toEqual(LOGIN_RESPONSE);
    http.expectNone(() => true);
  });

  it.each([
    { response: [] }, { response: [{ status: 'ARCHIVED' }] }
  ])('tasks edge: empty visible list $response is success, not an error', async ({ response }) => {
    await authenticate();
    const pending = dashboard.ngOnInit();
    http.expectOne(TASKS_URL).flush(response);
    await pending;
    expect(dashboard.visibleTasks).toEqual([]);
    expect(dashboard.loading).toBe(false);
    expect(dashboard.error).toBe('');
  });

  it.each([400, 401, 403, 404, 429, 500, 503])('tasks HTTP %i preserves session and does not redirect or retry', async status => {
    await authenticate();
    const pending = dashboard.ngOnInit();
    const request = http.expectOne(TASKS_URL);
    expect(request.request.headers.get('Authorization')).toBe(`Bearer ${LOGIN_RESPONSE.token}`);
    request.flush({ detail: 'PRIVATE_DETAIL' }, { status, statusText: 'Rejected' });
    await pending;
    expectTasksFailure(TASKS_ERROR);
  });

  it('tasks backend unavailable reaches generic dashboard error and finishes loading', async () => {
    await authenticate();
    const pending = dashboard.ngOnInit();
    http.expectOne(TASKS_URL).error(networkFailure());
    await pending;
    expectTasksFailure(TASKS_ERROR);
  });

  it.each([null, {}, { tasks: [] }, [null], [{ title: null }], [{ status: false }], [{ owner: {} }]]
    .map(response => ({ response })))
    ('tasks malformed successful response $response produces visible validation error', async ({ response }) => {
      await authenticate();
      const pending = dashboard.ngOnInit();
      http.expectOne(TASKS_URL).flush(response);
      await pending;
      expectTasksFailure(INVALID_RESPONSE);
    });

  it('tasks 204 without body is an explicit invalid response', async () => {
    await authenticate();
    const pending = dashboard.ngOnInit();
    http.expectOne(TASKS_URL).flush(null, { status: 204, statusText: 'No Content' });
    await pending;
    expectTasksFailure(INVALID_RESPONSE);
  });

  it('tasks parse error delivered by HttpClient uses generic dashboard message', async () => {
    await authenticate();
    vi.spyOn(client, 'get').mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 200, error: { error: new SyntaxError('Invalid JSON'), text: 'PRIVATE_JSON' }
    })));
    await dashboard.ngOnInit();
    expectTasksFailure(TASKS_ERROR);
  });

  it('tasks has no 5000ms timeout: loading remains until response arrives', async () => {
    vi.useFakeTimers();
    await authenticate();
    const pending = dashboard.ngOnInit();
    const request = http.expectOne(TASKS_URL);
    await vi.advanceTimersByTimeAsync(6000);
    expect(request.cancelled).toBe(false);
    expect(dashboard.loading).toBe(true);
    expect(dashboard.error).toBe('');
    expect(detectChanges).not.toHaveBeenCalled();
    request.flush([]);
    await pending;
    expect(dashboard.loading).toBe(false);
    expect(dashboard.error).toBe('');
  });

  it('tasks translates an externally supplied TimeoutError but does not create a GET timeout', async () => {
    await authenticate();
    vi.spyOn(client, 'get').mockReturnValue(throwError(() => new TimeoutError()));
    await dashboard.ngOnInit();
    expectTasksFailure(TIMEOUT_MESSAGE);
  });

  it('missing session redirects to login without making any HTTP request', async () => {
    await dashboard.ngOnInit();
    expect(navigate).toHaveBeenCalledWith(['/login']);
    http.expectNone(() => true);
  });
});
