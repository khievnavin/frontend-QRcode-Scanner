import { HttpClient } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { JsonPipe } from '@angular/common';
import { catchError, of } from 'rxjs';
import { API_URL, User } from '../../core/api';
import { AuthService } from '../../core/auth.service';

function decodeJwt(token: string): Record<string, unknown> {
  const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(decodeURIComponent(escape(atob(payload))));
}

@Component({
  selector: 'app-home',
  imports: [JsonPipe],
  templateUrl: './home.html',
})
export class Home {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.auth.user;
  /** Verified by the NestJS backend against Keycloak's public keys. */
  protected readonly me = toSignal(
    inject(HttpClient)
      .get<{ user: User; serverTime: string }>(`${API_URL}/me`)
      .pipe(catchError((e) => of({ error: e.error?.message ?? e.message }))),
  );
  protected readonly claims = computed(() => {
    const t = this.auth.tokens();
    return t ? decodeJwt(t.access_token) : null;
  });

  protected async logout() {
    await this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
