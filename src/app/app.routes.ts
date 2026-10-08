import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: 'login', loadComponent: () => import('./pages/qr-login/qr-login').then((m) => m.QrLogin) },
  { path: 'approve', loadComponent: () => import('./pages/approve/approve').then((m) => m.Approve) },
  {
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  { path: '**', redirectTo: 'home' },
];
