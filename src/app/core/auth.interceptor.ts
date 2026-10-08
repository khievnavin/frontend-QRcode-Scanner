import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { API_URL } from './api';
import { AuthService } from './auth.service';

/** Attaches the Keycloak access token to backend calls. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_URL)) return next(req);
  const auth = inject(AuthService);
  return from(auth.getAccessToken()).pipe(
    switchMap((token) =>
      next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req),
    ),
  );
};
