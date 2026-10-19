import { Injectable } from '@angular/core';
import { LoginResponse } from '../models/auth.models';
import { DEFAULT_PREFERENCES, Preferences } from '../models/preferences.models';
import { isRecord } from '../utils/is-record';

const STORAGE_KEYS = {
  token: 'workshop_token',
  user: 'workshop_user',
  preferences: 'workshop_preferences'
};

@Injectable({ providedIn: 'root' })
export class SessionService {
  private currentSession: LoginResponse | null = null;
  preferences: Preferences = { ...DEFAULT_PREFERENCES };
  notice = '';

  constructor() {
    try {
      localStorage.removeItem(STORAGE_KEYS.token);
      localStorage.removeItem(STORAGE_KEYS.user);
      const saved = localStorage.getItem(STORAGE_KEYS.preferences);
      if (saved !== null) {
        this.preferences = this.readPreferences(JSON.parse(saved));
      }
    } catch {
      this.reportStorageFailure('load');
    }
  }

  get session(): LoginResponse | null {
    return this.currentSession;
  }

  start(session: LoginResponse): void {
    this.currentSession = session;
  }

  clear(): void {
    this.currentSession = null;
  }

  savePreferences(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.preferences, JSON.stringify(this.preferences));
    } catch {
      this.reportStorageFailure('save');
    }
  }

  private readPreferences(value: unknown): Preferences {
    if (!isRecord(value)
      || Object.keys(value).some(key => !Object.hasOwn(DEFAULT_PREFERENCES, key))
      || (value['theme'] !== undefined && typeof value['theme'] !== 'string')
      || (value['showTips'] !== undefined && typeof value['showTips'] !== 'boolean')
      || (value['compact'] !== undefined && typeof value['compact'] !== 'boolean')) {
      throw new Error('Invalid preferences');
    }
    return {
      theme: typeof value['theme'] === 'string' ? value['theme'] : DEFAULT_PREFERENCES.theme,
      showTips: typeof value['showTips'] === 'boolean' ? value['showTips'] : DEFAULT_PREFERENCES.showTips,
      compact: typeof value['compact'] === 'boolean' ? value['compact'] : DEFAULT_PREFERENCES.compact
    };
  }

  private reportStorageFailure(operation: 'load' | 'save'): void {
    this.notice = operation === 'load'
      ? 'No se pudieron cargar las preferencias o limpiar la sesión anterior. Se usan preferencias iniciales.'
      : 'No se pudieron guardar las preferencias.';
    console.warn('Session storage operation failed', { operation });
  }
}
