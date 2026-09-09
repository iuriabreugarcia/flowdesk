import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { AuthSession, LoginRequest, LoginResponse, UserRole } from './auth.models';
import { isRoleAllowed } from './role.utils';

const STORAGE_KEY = 'flowdesk.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly sessionSignal = signal<AuthSession | null>(this.readSession());

  readonly session = this.sessionSignal.asReadonly();
  readonly user = computed(() => this.sessionSignal()?.user ?? null);
  readonly role = computed<UserRole>(() => this.user()?.role ?? 'USER');

  readonly isAuthenticated = computed(() => {
    const session = this.sessionSignal();

    return !!session &&
      new Date(session.expiresAtUtc).getTime() > Date.now();
  });

  readonly canManageTeam = computed(() =>
    this.hasAnyRole(['OWNER', 'ADMIN'])
  );

  readonly canManageCatalog = computed(() =>
    this.hasAnyRole(['OWNER', 'ADMIN', 'MANAGER'])
  );

  readonly canDeleteProducts = computed(() =>
    this.hasAnyRole(['OWNER', 'ADMIN'])
  );

  get accessToken(): string | null {
    const session = this.sessionSignal();

    return this.isAuthenticated() && session
      ? session.accessToken
      : null;
  }

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${API_BASE_URL}/auth/login`, payload)
      .pipe(
        tap((response) => this.saveSession(response))
      );
  }

  hasRole(role: UserRole): boolean {
    return this.role() === role;
  }

  hasAnyRole(roles: readonly UserRole[]): boolean {
    return isRoleAllowed(this.role(), roles);
  }

  logout(): void {
    this.clearSession();

    void this.router
      .navigateByUrl('/login', { replaceUrl: true })
      .then((navigated) => {
        if (!navigated && window.location.pathname !== '/login') {
          window.location.replace('/login');
        }
      })
      .catch(() => {
        window.location.replace('/login');
      });
  }

  private clearSession(): void {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);

    // Limpa possíveis chaves antigas do FlowDesk deixadas por versões
    // anteriores durante o desenvolvimento.
    for (let index = localStorage.length - 1; index >= 0; index--) {
      const key = localStorage.key(index);

      if (key?.toLowerCase().startsWith('flowdesk')) {
        localStorage.removeItem(key);
      }
    }

    for (let index = sessionStorage.length - 1; index >= 0; index--) {
      const key = sessionStorage.key(index);

      if (key?.toLowerCase().startsWith('flowdesk')) {
        sessionStorage.removeItem(key);
      }
    }

    this.sessionSignal.set(null);
  }

  private saveSession(session: AuthSession): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    this.sessionSignal.set(session);
  }

  private readSession(): AuthSession | null {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    try {
      const session = JSON.parse(raw) as AuthSession;

      if (new Date(session.expiresAtUtc).getTime() <= Date.now()) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }

      return session;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }
}
