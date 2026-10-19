import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';

export class ResponseError extends Error {
  constructor(readonly reason: 'missing-token' | 'invalid-response') {
    super(reason);
  }
}

export function userFacingError(error: unknown, operation: 'login' | 'tasks'): string {
  const status = error instanceof HttpErrorResponse ? error.status : undefined;
  const category = error instanceof ResponseError ? error.reason : 'request-failed';
  console.error('Frontend operation failed', { operation, category, status });

  if (error instanceof ResponseError) {
    return error.reason === 'missing-token'
      ? 'El backend respondió sin token.'
      : 'El servicio devolvió una respuesta no válida.';
  }
  if (error instanceof TimeoutError) {
    return 'La solicitud tardó demasiado. Intenta nuevamente.';
  }
  if (operation === 'tasks') {
    return 'No se pudo cargar el dashboard. Intenta nuevamente.';
  }
  return status === 401 || status === 403
    ? 'No se pudo autenticar. Revisa tus credenciales.'
    : 'No se pudo autenticar. Intenta nuevamente.';
}
