import { describe, expect, it } from 'vitest';
import { statusLabel, visibleTasks } from './task-presentation';

describe('Task presentation preserves existing rules', () => {
  it.each([
    ['TODO', 'Por hacer'], ['in_progress', 'En progreso'], ['DONE', 'Completado'],
    ['RESUELTO', 'Resuelto'], ['COMPLETED', 'Completado'], ['CUSTOM', 'CUSTOM'],
    ['', ''], [undefined, '']
  ])('labels %s', (status, expected) => {
    expect(statusLabel(status)).toBe(expected);
  });

  it('filters exact ARCHIVED without mutating response tasks', () => {
    const tasks = [{ status: 'ARCHIVED' }, { status: 'archived' }, {}];
    const result = visibleTasks(tasks);
    expect(result).toHaveLength(2);
    expect(result[1].label).toBe('NORMAL · SIN-ASIGNAR');
    expect(tasks).toEqual([{ status: 'ARCHIVED' }, { status: 'archived' }, {}]);
  });

  it('retains descending lexical order and stable equal priorities', () => {
    const tasks = [
      { title: 'high', priority: 'HIGH' }, { title: 'first low', priority: 'LOW' },
      { title: 'second low', priority: 'LOW' }
    ];
    expect(visibleTasks(tasks).map(task => task.title)).toEqual(['first low', 'second low', 'high']);
  });

  it('preserves JavaScript scalar comparison for null/numeric/boolean priorities', () => {
    expect(visibleTasks([
      { priority: -1 }, { priority: null }, { priority: true }, { priority: 2 }
    ]).map(task => task.priority)).toEqual([2, true, null, -1]);
  });
});
