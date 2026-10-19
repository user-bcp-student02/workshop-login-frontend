import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginRequest, LoginResponse, User } from '../models/auth.models';
import { isRecord } from '../utils/is-record';
import { ResponseError } from '../utils/user-facing-error';
import { SessionService } from './session.service';

const LOGIN_TIMEOUT_MS = 5000;
const CLIENT_ID = 'angular-workshop';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private http: HttpClient, private session: SessionService) {}

  async login(username: string, password: string): Promise<void> {
    const request: LoginRequest = { username, password, client: CLIENT_ID };
    const response = await firstValueFrom(
      this.http.post<unknown>(`${environment.authBaseUrl}/auth/login`, request)
        .pipe(timeout(LOGIN_TIMEOUT_MS))
    );
    const authenticated = this.readResponse(response);
    this.session.start(authenticated);
    this.session.savePreferences();
  }

  private readResponse(value: unknown): LoginResponse {
    if (!isRecord(value)) {
      throw new ResponseError('invalid-response');
    }
    if (!value['token']) {
      throw new ResponseError('missing-token');
    }
    if (typeof value['token'] !== 'string') {
      throw new ResponseError('invalid-response');
    }
    const user: unknown = value['user'] ?? {};
    if (!isRecord(user)
      || (user['username'] !== undefined && typeof user['username'] !== 'string')
      || (user['displayName'] !== undefined && typeof user['displayName'] !== 'string')) {
      throw new ResponseError('invalid-response');
    }
    const authenticatedUser: User = {};
    if (typeof user['username'] === 'string') authenticatedUser.username = user['username'];
    if (typeof user['displayName'] === 'string') authenticatedUser.displayName = user['displayName'];
    return { token: value['token'], user: authenticatedUser };
  }
}
