import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'poc-sso.theme';
const ORDER: ThemeMode[] = ['system', 'light', 'dark'];

/**
 * Light / dark / system theme. The choice is applied as `data-theme` on <html> (styles.css
 * reads it) and remembered per browser. index.html applies it before Angular starts, so the
 * page doesn't flash the wrong theme on load.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>(this.load());

  constructor() {
    this.apply(this.mode());
  }

  set(mode: ThemeMode) {
    this.mode.set(mode);
    this.apply(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* storage unavailable - keep it for this page only */
    }
  }

  /** system -> light -> dark -> system */
  next() {
    this.set(ORDER[(ORDER.indexOf(this.mode()) + 1) % ORDER.length]);
  }

  private apply(mode: ThemeMode) {
    const root = document.documentElement;
    if (mode === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', mode);
  }

  private load(): ThemeMode {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      return saved && ORDER.includes(saved) ? saved : 'system';
    } catch {
      return 'system';
    }
  }
}
