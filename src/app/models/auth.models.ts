export interface LoginRequest {
  username: string;
  password: string;
  client: string;
}

export interface User {
  username?: string;
  displayName?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}
