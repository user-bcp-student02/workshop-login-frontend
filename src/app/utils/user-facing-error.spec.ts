import '@angular/compiler';
import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResponseError, userFacingError } from './user-facing-error';

describe('Safe error messages', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it.each([
    [new ResponseError('missing-token'), 'El backend respondió sin token.'],
    [new ResponseError('invalid-response'), 'El servicio devolvió una respuesta no válida.'],
    [new TimeoutError(), 'La solicitud tardó demasiado. Intenta nuevamente.'],
    [new HttpErrorResponse({ status: 401 }), 'No se pudo autenticar. Revisa tus credenciales.'],
    [new HttpErrorResponse({ status: 403 }), 'No se pudo autenticar. Revisa tus credenciales.'],
    [new Error('private'), 'No se pudo autenticar. Intenta nuevamente.'],
    [null, 'No se pudo autenticar. Intenta nuevamente.']
  ])('translates login errors without raw details', (error, expected) => {
    expect(userFacingError(error, 'login')).toBe(expected);
  });

  it('does not expose response, request, token or username in diagnostics', () => {
    const error = new HttpErrorResponse({ status: 500, error: { detail: 'PRIVATE-TOKEN' } });
    expect(userFacingError(error, 'tasks')).toBe('No se pudo cargar el dashboard. Intenta nuevamente.');
    expect(console.error).toHaveBeenLastCalledWith('Frontend operation failed',
      { operation: 'tasks', category: 'request-failed', status: 500 });
  });
});
