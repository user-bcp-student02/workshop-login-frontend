import '@angular/compiler';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionService } from './session.service';

describe('SessionService: approved memory session and preferences', () => {
  const storage = new Map<string, string>();
  beforeEach(() => {
    vi.restoreAllMocks();
    storage.clear();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
      removeItem: (key: string) => storage.delete(key)
    });
  });

  it('removes legacy credentials and never restores or persists them', () => {
    storage.set('workshop_token', 'legacy-token');
    storage.set('workshop_user', '{"username":"legacy"}');
    const session = new SessionService();
    expect(session.session).toBeNull();
    expect(storage.has('workshop_token')).toBe(false);
    expect(storage.has('workshop_user')).toBe(false);
    session.start({ token: 'test-token', user: { username: 'student' } });
    session.savePreferences();
    expect(session.session?.token).toBe('test-token');
    expect([...storage.keys()]).toEqual(['workshop_preferences']);
    expect(new SessionService().session).toBeNull();
    session.clear();
    expect(session.session).toBeNull();
    expect(storage.has('workshop_preferences')).toBe(true);
  });

  it.each([
    ['{}', { theme: 'light', showTips: true, compact: false }],
    ['{"showTips":false}', { theme: 'light', showTips: false, compact: false }],
    ['{"theme":"dark","compact":true}', { theme: 'dark', showTips: true, compact: true }]
  ])('preserves valid partial preference merge %s', (saved, expected) => {
    storage.set('workshop_preferences', saved);
    const session = new SessionService();
    expect(session.preferences).toEqual(expected);
    expect(session.notice).toBe('');
    session.savePreferences();
    expect(JSON.parse(storage.get('workshop_preferences') || '{}')).toEqual(expected);
  });

  it.each(['{', 'null', '[]', '{"extra":1}', '{"theme":{}}',
    '{"showTips":"yes"}', '{"compact":1}', '{"toString":true}'])
    ('reports invalid preferences and explicitly recovers defaults %s', saved => {
      storage.set('workshop_preferences', saved);
      const session = new SessionService();
      expect(session.preferences).toEqual({ theme: 'light', showTips: true, compact: false });
      expect(session.notice).toContain('Se usan preferencias iniciales.');
      expect(console.warn).toHaveBeenCalledWith('Session storage operation failed', { operation: 'load' });
    });

  it('reports unavailable storage without exposing stored contents', () => {
    vi.stubGlobal('localStorage', {
      removeItem: () => { throw new Error('private storage detail'); }
    });
    const session = new SessionService();
    expect(session.session).toBeNull();
    expect(session.notice).toContain('sesión anterior');
    expect(console.warn).toHaveBeenCalledWith('Session storage operation failed', { operation: 'load' });
  });

  it('reports save failure rather than pretending preferences were saved', () => {
    const session = new SessionService();
    vi.mocked(localStorage.setItem).mockImplementation(() => { throw new Error('quota'); });
    session.savePreferences();
    expect(session.notice).toBe('No se pudieron guardar las preferencias.');
    expect(console.warn).toHaveBeenCalledWith('Session storage operation failed', { operation: 'save' });
  });

  it('keeps recovery notice visible after saving defaults on login', () => {
    storage.set('workshop_preferences', '{');
    const session = new SessionService();
    session.savePreferences();
    expect(session.notice).toContain('Se usan preferencias iniciales.');
  });
});
