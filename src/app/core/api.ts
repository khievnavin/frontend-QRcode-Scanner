/** Same origin as the page - the Angular dev server proxies /api to NestJS (proxy.conf.json). */
export const API_URL = '/api';

export interface User {
  sub: string;
  username: string;
  name: string;
  email?: string;
  roles: string[];
}

export interface TokenSet {
  access_token: string;
  refresh_token: string;
  id_token: string;
  expires_in: number;
  refresh_expires_in: number;
}

export type QrStatus = 'pending' | 'scanned' | 'awaiting_approval' | 'approved' | 'rejected' | 'expired';

export interface QrSession {
  sid: string;
  pollToken: string;
  scanUrl: string;
  qrDataUrl: string;
  expiresAt: number;
}

export interface QrStatusResponse {
  status: QrStatus;
  user?: User;
  tokens?: TokenSet;
  expiresAt?: number;
}

export interface ApprovalInfo {
  status: QrStatus;
  user: User;
  desktop: { ip?: string; userAgent?: string };
  expiresAt: number;
}

/** OIDC userinfo, as returned by Keycloak. */
export interface UserProfile {
  sub: string;
  preferred_username?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  email_verified?: boolean;
}

export interface AccountSession {
  id: string;
  ipAddress: string;
  /** epoch seconds */
  started: number;
  lastAccess: number;
  expires: number;
  browser: string;
  current?: boolean;
  clients: { clientId: string; clientName?: string }[];
}

/** Keycloak Account API: a device and its sessions. */
export interface AccountDevice {
  os: string;
  osVersion: string;
  device: string;
  lastAccess: number;
  current: boolean;
  sessions: AccountSession[];
}

export interface MeOverview {
  user: User;
  profile: UserProfile;
  devices: AccountDevice[];
  serverTime: string;
}
