import { describe, expect, it } from 'vitest';
import { formatTaskLabel } from './legacy-format';

describe('formatTaskLabel', () => {
  it('formats priority and owner', () => {
    expect(formatTaskLabel({ priority: 'high', owner: 'student' })).toBe('HIGH · STUDENT');
  });

  it.each([null, undefined])('handles missing task %s', task => {
    expect(formatTaskLabel(task)).toBe('SIN-DATOS');
  });

  it.each([{}, { priority: '', owner: '' }, { priority: 0, owner: false }])('uses defaults %s', task => {
    expect(formatTaskLabel(task)).toBe('NORMAL · SIN-ASIGNAR');
  });
});
