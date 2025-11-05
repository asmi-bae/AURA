import { Role } from './rbac';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roles: Role[];
  picture?: string;
}

export interface AuthSession {
  userId: string;
  token: string;
  expiresAt: Date;
  refreshToken?: string;
}

