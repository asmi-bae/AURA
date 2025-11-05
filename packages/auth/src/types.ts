import { Role } from './rbac';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roles: Role[];
  picture?: string;
}

export interface OAuthUser {
  provider: 'google' | 'github' | 'microsoft' | 'apple';
  providerId: string;
  email: string;
  name: string;
  picture?: string;
  verified: boolean;
}

export interface AuthSession {
  userId: string;
  token: string;
  expiresAt: Date;
  refreshToken?: string;
  provider?: 'google' | 'github' | 'microsoft' | 'apple' | 'credentials';
}

