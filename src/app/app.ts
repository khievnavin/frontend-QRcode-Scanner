import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { ThemeToggle } from './shared/theme-toggle';

@Component({
  imports: [RouterOutlet, ThemeToggle],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  /** /home puts the theme switch in its own top bar. */
  protected readonly ownToggle = toSignal(
    inject(Router).events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects.startsWith('/home')),
    ),
    { initialValue: false },
  );
}
