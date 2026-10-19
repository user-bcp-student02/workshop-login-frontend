import '@angular/compiler';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Injector } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';

describe('AuthService HTTP contract', () => {
  let auth: AuthService;
  let session: SessionService;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.stubGlobal('localStorage', { removeItem: vi.fn(), getItem: () => null, setItem: vi.fn() });
    const injector = Injector.create({ providers: provideHttpClientTesting() });
    http = injector.get(HttpTestingController);
    session = new SessionService();
    auth = new AuthService(new HttpClient(injector.get(HttpBackend)), session);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('posts original credentials without Authorization and starts session', async () => {
    const pending = auth.login(' student ', ' password ');
    const request = http.expectOne('http://localhost:8080/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      username: ' student ', password: ' password ', client: 'angular-workshop'
    });
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ token: 'test-token', user: { username: 'student', displayName: 'Student' } });
    await pending;
    expect(session.session).toEqual({
      token: 'test-token', user: { username: 'student', displayName: 'Student' }
    });
    expect(localStorage.setItem).toHaveBeenCalledTimes(1);
    expect(localStorage.setItem).toHaveBeenCalledWith('workshop_preferences',
      '{"theme":"light","showTips":true,"compact":false}');
  });

  it('allows missing optional user fields', async () => {
    const pending = auth.login('student', 'password');
    http.expectOne('http://localhost:8080/auth/login').flush({ token: 'test-token' });
    await pending;
    expect(session.session?.user).toEqual({});
  });

  it.each([
    [{}, 'missing-token'], [{ token: '' }, 'missing-token'],
    [null, 'invalid-response'], [{ token: 1 }, 'invalid-response'],
    [{ token: 'token', user: [] }, 'invalid-response'],
    [{ token: 'token', user: { username: 1 } }, 'invalid-response'],
    [{ token: 'token', user: { displayName: false } }, 'invalid-response']
  ])('rejects malformed response %s explicitly', async (response, reason) => {
    const pending = auth.login('student', 'password');
    const assertion = expect(pending).rejects.toMatchObject({ reason });
    http.expectOne('http://localhost:8080/auth/login').flush(response);
    await assertion;
    expect(session.session).toBeNull();
  });

  it.each([401, 403, 500])('propagates HTTP %s without saving session', async status => {
    const pending = auth.login('student', 'password');
    const assertion = expect(pending).rejects.toMatchObject({ status });
    http.expectOne('http://localhost:8080/auth/login').flush({ message: 'private' },
      { status, statusText: 'Rejected' });
    await assertion;
    expect(session.session).toBeNull();
  });

  it('times out at 5000ms, cancels request and never starts session', async () => {
    vi.useFakeTimers();
    const pending = auth.login('student', 'password');
    const assertion = expect(pending).rejects.toMatchObject({ name: 'TimeoutError' });
    const request = http.expectOne('http://localhost:8080/auth/login');
    await vi.advanceTimersByTimeAsync(4999);
    expect(request.cancelled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await assertion;
    expect(request.cancelled).toBe(true);
    expect(session.session).toBeNull();
  });
});
