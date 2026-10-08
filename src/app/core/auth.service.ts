import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL, TokenSet, User } from './api';

const STORAGE_KEY = 'poc-sso.session';

interface StoredSession {
  tokens: TokenSet;
  user: User;
  /** epoch ms */
  accessExpiresAt: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Bypasses interceptors so refresh/logout never recurse into the auth interceptor.
  private readonly http = new HttpClient(inject(HttpBackend));
  private readonly session = signal<StoredSession | null>(this.load());
  private refreshing?: Promise<string | null>;

  readonly user = computed(() => this.session()?.user ?? null);
  readonly isLoggedIn = computed(() => this.session() !== null);
  readonly tokens = computed(() => this.session()?.tokens ?? null);

  setSession(tokens: TokenSet, user: User) {
    this.save({ tokens, user, accessExpiresAt: Date.now() + tokens.expires_in * 1000 });
  }

  /** Returns a non-expired access token, refreshing it through the backend if needed. */
  async getAccessToken(): Promise<string | null> {
    const s = this.session();
    if (!s) return null;
    if (Date.now() < s.accessExpiresAt - 30_000) return s.tokens.access_token;
    this.refreshing ??= this.refresh(s).finally(() => (this.refreshing = undefined));
    return this.refreshing;
  }

  async logout() {
    const refreshToken = this.session()?.tokens.refresh_token;
    this.save(null);
    if (refreshToken) {
      await firstValueFrom(this.http.post(`${API_URL}/auth/logout`, { refresh_token: refreshToken })).catch(
        () => undefined,
      );
    }
  }

  private async refresh(s: StoredSession): Promise<string | null> {
    try {
      const tokens = await firstValueFrom(
        this.http.post<TokenSet>(`${API_URL}/auth/refresh`, { refresh_token: s.tokens.refresh_token }),
      );
      this.setSession(tokens, s.user);
      return tokens.access_token;
    } catch {
      this.save(null); // refresh token expired or session killed in Keycloak
      return null;
    }
  }

  private load(): StoredSession | null {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null');
    } catch {
      return null;
    }
  }

  private save(s: StoredSession | null) {
    this.session.set(s);
    try {
      if (s) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable - keep in memory only */
    }
  }
}
