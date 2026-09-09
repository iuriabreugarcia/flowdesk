export type UserRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'USER';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string;
  companyName: string;
}

export interface LoginRequest { email: string; password: string; }
export interface LoginResponse { accessToken: string; expiresAtUtc: string; user: AuthUser; }
export interface AuthSession extends LoginResponse {}
