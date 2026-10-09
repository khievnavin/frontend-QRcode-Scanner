import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe, JsonPipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { API_URL, AccountSession, MeOverview } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { ThemeToggle } from '../../shared/theme-toggle';

interface AccessClaims {
  exp: number;
  iat: number;
  auth_time?: number;
  sid?: string;
  azp?: string;
  scope?: string;
  iss?: string;
  realm_access?: { roles?: string[] };
  resource_access?: Record<string, { roles?: string[] }>;
  [claim: string]: unknown;
}

/** A Keycloak session = one phone sign-in, plus the desktops it approved. */
interface SessionRow extends AccountSession {
  device: string;
  phone: boolean;
  desktops: number;
}

function decodeJwt<T>(token: string): T {
  const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(decodeURIComponent(escape(atob(payload))));
}

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

@Component({
  selector: 'app-home',
  imports: [DatePipe, JsonPipe, ThemeToggle],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly overview = signal<MeOverview | null>(null);
  protected readonly loadError = signal('');
  protected readonly busySession = signal<string | null>(null);
  protected readonly copied = signal(false);
  private readonly now = signal(Date.now());

  protected readonly claims = computed(() => {
    const t = this.auth.tokens();
    return t ? decodeJwt<AccessClaims>(t.access_token) : null;
  });
  protected readonly profile = computed(() => this.overview()?.profile);
  protected readonly displayName = computed(
    () => this.profile()?.name ?? this.auth.user()?.name ?? this.auth.user()?.username ?? '',
  );
  protected readonly initials = computed(() =>
    this.displayName()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join(''),
  );
  protected readonly greeting = computed(() => {
    const h = new Date(this.now()).getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  });

  /** Seconds until the current access token expires (it is refreshed automatically). */
  protected readonly tokenSecondsLeft = computed(() => {
    const c = this.claims();
    return c ? Math.max(0, Math.round(c.exp - this.now() / 1000)) : 0;
  });
  protected readonly tokenProgress = computed(() => {
    const c = this.claims();
    if (!c) return 0;
    return Math.min(100, (this.tokenSecondsLeft() / (c.exp - c.iat)) * 100);
  });

  protected readonly realmRoles = computed(() =>
    (this.claims()?.realm_access?.roles ?? []).filter((r) => !r.startsWith('default-roles-')),
  );
  protected readonly clientRoles = computed(() =>
    Object.entries(this.claims()?.resource_access ?? {}).map(([client, v]) => ({ client, roles: v.roles ?? [] })),
  );
  protected readonly scopes = computed(() => (this.claims()?.scope ?? '').split(' ').filter(Boolean));

  protected readonly sessions = computed<SessionRow[]>(() =>
    (this.overview()?.devices ?? [])
      .flatMap((d) =>
        d.sessions.map((s) => ({
          ...s,
          current: s.id === this.claims()?.sid,
          device: [s.browser, d.os !== 'Other' ? d.os : ''].filter(Boolean).join(' on '),
          phone: s.clients.some((c) => c.clientId === 'poc-phone'),
          desktops: s.clients.filter((c) => c.clientId === 'poc-backend').length,
        })),
      )
      .sort((a, b) => Number(b.current) - Number(a.current) || b.lastAccess - a.lastAccess),
  );
  protected readonly currentSession = computed(() => this.sessions().find((s) => s.current));

  constructor() {
    const clock = setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(clock));
  }

  ngOnInit() {
    this.load();
  }

  protected async load() {
    this.loadError.set('');
    try {
      this.overview.set(await firstValueFrom(this.http.get<MeOverview>(`${API_URL}/me/overview`)));
    } catch (e) {
      this.loadError.set((e as { error?: { message?: string } }).error?.message ?? 'Could not load your account.');
    }
  }

  /** Signs a session out in Keycloak. Signing out the current one also ends this desktop. */
  protected async signOut(s: SessionRow) {
    const what = s.current
      ? 'This signs out your phone AND this desktop.'
      : `Sign out ${s.device} (${s.ipAddress})? That phone will need the password again.`;
    if (!confirm(what)) return;
    this.busySession.set(s.id);
    try {
      await firstValueFrom(this.http.delete(`${API_URL}/me/sessions/${s.id}`));
      if (s.current) return this.logout();
      await this.load();
    } finally {
      this.busySession.set(null);
    }
  }

  protected async logout() {
    await this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  protected async copy(text: string) {
    await navigator.clipboard?.writeText(text);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 1500);
  }

  protected ago(epochSeconds?: number): string {
    if (!epochSeconds) return '';
    const diff = epochSeconds - this.now() / 1000;
    const abs = Math.abs(diff);
    if (abs < 45) return 'just now';
    for (const [unit, sec] of [['day', 86400], ['hour', 3600], ['minute', 60]] as const) {
      if (abs >= sec) return rtf.format(Math.round(diff / sec), unit);
    }
    return rtf.format(Math.round(diff), 'second');
  }

  protected countdown(seconds: number): string {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }
}
