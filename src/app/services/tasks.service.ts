import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { LabelValue, Task } from '../models/task.models';
import { isRecord } from '../utils/is-record';
import { ResponseError } from '../utils/user-facing-error';

function isLabelValue(value: unknown): value is LabelValue | undefined {
  return value === undefined || value === null
    || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

function isTask(value: unknown): value is Task {
  return isRecord(value)
    && ['title', 'description', 'status'].every(key =>
      value[key] === undefined || typeof value[key] === 'string')
    && isLabelValue(value['priority']) && isLabelValue(value['owner']);
}

@Injectable({ providedIn: 'root' })
export class TasksService {
  constructor(private http: HttpClient) {}

  async list(username: string, token: string): Promise<Task[]> {
    const response: unknown = await firstValueFrom(this.http.get<unknown>(
      `${environment.tasksBaseUrl}/api/tasks?owner=${username}`,
      { headers: { Authorization: `Bearer ${token}` } }
    ));
    if (!Array.isArray(response) || !response.every(isTask)) {
      throw new ResponseError('invalid-response');
    }
    return response;
  }
}
