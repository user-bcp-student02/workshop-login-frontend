import { Task, VisibleTask } from '../models/task.models';
import { formatTaskLabel } from './legacy-format';

const STATUS_LABELS: Record<string, string> = {
  TODO: 'Por hacer',
  IN_PROGRESS: 'En progreso',
  DONE: 'Completado',
  RESUELTO: 'Resuelto',
  COMPLETED: 'Completado'
};

export function statusLabel(status?: string): string {
  return STATUS_LABELS[(status || '').toUpperCase()] || status || '';
}

export function visibleTasks(tasks: Task[]): VisibleTask[] {
  return tasks
    .filter(task => task.status !== 'ARCHIVED')
    .map(task => ({ ...task, label: formatTaskLabel(task) }))
    // Preserve the existing comparison, including equal/missing priorities.
    .sort((a, b) => {
      const greater = typeof a.priority === 'string' && typeof b.priority === 'string'
        ? a.priority > b.priority
        : Number(a.priority) > Number(b.priority);
      return greater ? -1 : 1;
    });
}
