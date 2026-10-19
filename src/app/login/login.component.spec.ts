import '@angular/compiler';
import { ChangeDetectorRef, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';
import { ResponseError } from '../utils/user-facing-error';
import { LoginComponent } from './login.component';

describe('Login: characterized behavior and approved changes', () => {
  const navigate = vi.fn();
  const authenticate = vi.fn();
  const markForCheck = vi.fn();
  let login: LoginComponent;
  let session: SessionService;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('localStorage', { removeItem: vi.fn(), getItem: () => null, setItem: vi.fn() });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    session = new SessionService();
    navigate.mockReset().mockResolvedValue(true);
    markForCheck.mockClear();
    authenticate.mockReset().mockImplementation(async () => {
      session.start({ token: 'test-token', user: { username: 'student' } });
    });
    const injector = Injector.create({ providers: [
      { provide: Router, useValue: { navigate } },
      { provide: AuthService, useValue: { login: authenticate } },
      { provide: ChangeDetectorRef, useValue: { markForCheck } }
    ] });
    login = new LoginComponent(
      injector.get(Router), injector.get(AuthService), session, injector.get(ChangeDetectorRef)
    );
  });

  it.each([null, undefined, '', '   '])('rejects empty username %s first', async username => {
    login.username = username;
    await login.login();
    expect(login.message).toBe('Ingrese un usuario.');
    expect(authenticate).not.toHaveBeenCalled();
    expect(login.busy).toBe(false);
    expect(markForCheck).not.toHaveBeenCalled();
  });

  it.each([null, undefined, '', '   '])('rejects empty password %s', async password => {
    login.username = 'student';
    login.password = password;
    await login.login();
    expect(login.message).toBe('Ingrese una contraseña.');
    expect(authenticate).not.toHaveBeenCalled();
  });

  it('sends original credentials and has session before navigation', async () => {
    login.username = ' student ';
    login.password = ' password ';
    navigate.mockImplementation(async () => {
      expect(session.session?.token).toBe('test-token');
      return true;
    });
    const pending = login.login();
    expect(login.busy).toBe(true);
    await pending;
    expect(authenticate).toHaveBeenCalledWith(' student ', ' password ');
    expect(navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(login.busy).toBe(false);
    expect(markForCheck).toHaveBeenCalledTimes(1);
  });

  it('does not navigate without a token', async () => {
    login.username = 'student';
    login.password = 'password';
    authenticate.mockRejectedValue(new ResponseError('missing-token'));
    await login.login();
    expect(login.message).toBe('El backend respondió sin token.');
    expect(navigate).not.toHaveBeenCalled();
    expect(login.busy).toBe(false);
  });

  it('uses local text rather than remote details or username markup', async () => {
    login.username = '<img src=x>';
    login.password = 'password';
    authenticate.mockRejectedValue(new Error('<b>private backend detail</b>'));
    await login.login();
    expect(login.message).toBe('No se pudo autenticar. Intenta nuevamente.');
    expect(login.busy).toBe(false);
    expect(markForCheck).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith('Frontend operation failed',
      { operation: 'login', category: 'request-failed', status: undefined });
  });

  it.each(['rejected', 'cancelled'])('reports %s navigation and restores busy', async failure => {
    login.username = 'student';
    login.password = 'password';
    if (failure === 'rejected') navigate.mockRejectedValue(new Error('navigation failed'));
    else navigate.mockResolvedValue(false);
    await login.login();
    expect(login.message).toBe('No se pudo autenticar. Intenta nuevamente.');
    expect(login.busy).toBe(false);
  });
});
