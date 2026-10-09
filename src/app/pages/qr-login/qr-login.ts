import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_URL, QrSession, QrStatus, QrStatusResponse, User } from '../../core/api';
import { AuthService } from '../../core/auth.service';

const POLL_MS = 1500;
/** How long to show "rejected" / "cannot reach backend" before trying again. */
const RETRY_MS = 3000;

@Component({
  selector: 'app-qr-login',
  templateUrl: './qr-login.html',
})
export class QrLogin implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly apiUrl = API_URL;
  protected readonly session = signal<QrSession | null>(null);
  protected readonly status = signal<QrStatus | 'loading' | 'error'>('loading');
  protected readonly user = signal<User | undefined>(undefined);
  private readonly now = signal(Date.now());

  protected readonly secondsLeft = computed(() => {
    const s = this.session();
    return s ? Math.max(0, Math.ceil((s.expiresAt - this.now()) / 1000)) : 0;
  });
  protected readonly isFinal = computed(() => ['expired', 'rejected', 'error'].includes(this.status()));

  private pollTimer?: ReturnType<typeof setInterval>;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private polling = false;
  private regenerateWhenVisible = false;

  constructor() {
    const clock = setInterval(() => this.now.set(Date.now()), 1000);
    const onVisible = () => {
      if (!document.hidden && this.regenerateWhenVisible) this.newQr();
    };
    document.addEventListener('visibilitychange', onVisible);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(clock);
      clearTimeout(this.retryTimer);
      document.removeEventListener('visibilitychange', onVisible);
      this.stopPolling();
    });
  }

  ngOnInit() {
    if (this.auth.isLoggedIn()) {
      this.router.navigateByUrl('/home');
      return;
    }
    this.newQr();
  }

  protected async newQr() {
    this.stopPolling();
    clearTimeout(this.retryTimer);
    this.regenerateWhenVisible = false;
    this.status.set('loading');
    this.user.set(undefined);
    try {
      const session = await firstValueFrom(this.http.post<QrSession>(`${API_URL}/qr/session`, {}));
      this.session.set(session);
      this.now.set(Date.now());
      this.status.set('pending');
      this.pollTimer = setInterval(() => this.poll(), POLL_MS);
    } catch {
      this.status.set('error');
      this.scheduleNewQr(RETRY_MS);
    }
  }

  private async poll() {
    const s = this.session();
    if (!s || this.polling) return;
    this.polling = true;
    try {
      const res = await firstValueFrom(
        this.http.get<QrStatusResponse>(`${API_URL}/qr/session/${s.sid}/status`, {
          headers: { 'x-poll-token': s.pollToken },
        }),
      );
      this.status.set(res.status);
      this.user.set(res.user);
      if (res.status === 'approved' && res.tokens && res.user) {
        this.stopPolling();
        this.auth.setSession(res.tokens, res.user);
        this.router.navigateByUrl('/home');
      } else if (res.status === 'expired' || res.status === 'rejected') {
        this.stopPolling();
        this.scheduleNewQr(res.status === 'rejected' ? RETRY_MS : 0);
      }
    } catch {
      this.status.set('expired'); // session purged on the server, or backend restarted
      this.stopPolling();
      this.scheduleNewQr(0);
    } finally {
      this.polling = false;
    }
  }

  private scheduleNewQr(delayMs: number) {
    clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => {
      if (document.hidden) this.regenerateWhenVisible = true;
      else this.newQr();
    }, delayMs);
  }

  private stopPolling() {
    clearInterval(this.pollTimer);
    this.pollTimer = undefined;
  }
}
