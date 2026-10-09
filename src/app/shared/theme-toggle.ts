import { Component, computed, inject } from '@angular/core';
import { ThemeService } from '../core/theme.service';

const LABELS = { system: 'System theme', light: 'Light theme', dark: 'Dark theme' } as const;

/** Round button cycling System -> Light -> Dark. */
@Component({
  selector: 'app-theme-toggle',
  template: `
    <button
      type="button"
      class="theme-toggle"
      (click)="theme.next()"
      [attr.aria-label]="label() + ' - click to change'"
      [title]="label() + ' (click to change)'"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        @switch (theme.mode()) {
          @case ('light') {
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          }
          @case ('dark') {
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          }
          @default {
            <rect x="3" y="4" width="18" height="12" rx="2" />
            <path d="M8 20h8M12 16v4" />
          }
        }
      </svg>
      <span class="theme-label">{{ short() }}</span>
    </button>
  `,
  styles: `
    .theme-toggle {
      display: inline-flex; align-items: center; gap: 6px;
      height: 34px; padding: 0 12px; border-radius: 999px;
      border: 1px solid var(--border); background: var(--card); color: var(--text);
      font: inherit; font-size: 0.8rem; cursor: pointer;
      transition: border-color 0.15s, background 0.15s;
    }
    .theme-toggle:hover { border-color: var(--primary); }
    .theme-toggle:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
    @media (max-width: 640px) { .theme-label { display: none; } .theme-toggle { width: 34px; padding: 0; justify-content: center; } }
  `,
})
export class ThemeToggle {
  protected readonly theme = inject(ThemeService);
  protected readonly label = computed(() => LABELS[this.theme.mode()]);
  protected readonly short = computed(() => this.label().replace(' theme', ''));
}
