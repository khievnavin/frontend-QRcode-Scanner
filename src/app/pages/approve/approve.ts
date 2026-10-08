import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL, ApprovalInfo } from '../../core/api';

const ERRORS: Record<string, string> = {
  expired: 'This QR code has expired. Generate a new one on the desktop and scan again.',
  already_used: 'This QR code was already used.',
  access_denied: 'Sign-in was cancelled.',
  login_failed: 'Sign-in with Keycloak failed.',
};

/** Opened on the phone after the Keycloak login (backend redirects here). */
@Component({
  selector: 'app-approve',
  templateUrl: './approve.html',
})
export class Approve implements OnInit {
  private readonly http = inject(HttpClient);

  // Query params, bound by withComponentInputBinding()
  readonly sid = input<string>();
  readonly t = input<string>();
  readonly error = input<string>();

  protected readonly info = signal<ApprovalInfo | null>(null);
  protected readonly state = signal<'loading' | 'ready' | 'busy' | 'approved' | 'rejected' | 'error'>('loading');
  protected readonly message = signal('');

  ngOnInit() {
    const error = this.error();
    if (error || !this.sid() || !this.t()) {
      return this.fail(ERRORS[error ?? ''] ?? `Invalid login request${error ? ` (${error})` : ''}.`);
    }
    this.http
      .get<ApprovalInfo>(`${API_URL}/qr/session/${this.sid()}/approval`, { params: { t: this.t()! } })
      .subscribe({
        next: (info) => {
          this.info.set(info);
          this.state.set('ready');
        },
        error: (e: HttpErrorResponse) => this.fail(e.error?.message ?? 'This login request is no longer valid.'),
      });
  }

  protected async decide(decision: 'approve' | 'reject') {
    this.state.set('busy');
    try {
      await firstValueFrom(this.http.post(`${API_URL}/qr/session/${this.sid()}/${decision}`, { t: this.t() }));
      this.state.set(decision === 'approve' ? 'approved' : 'rejected');
    } catch (e) {
      this.fail((e as HttpErrorResponse).error?.message ?? 'Something went wrong.');
    }
  }

  private fail(message: string) {
    this.message.set(message);
    this.state.set('error');
  }
}
