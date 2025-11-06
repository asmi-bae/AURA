import jwt from 'jsonwebtoken';

export interface JWTPayload {
  userId: string;
  email: string;
  roles: string[];
  iat?: number;
  exp?: number;
}

export class JWTService {
  constructor(private secret: string = process.env.JWT_SECRET || 'aura-secret-key') {
    if (!secret || secret.length < 32) {
      throw new Error('JWT secret must be at least 32 characters');
    }
  }

  sign(payload: Omit<JWTPayload, 'iat' | 'exp'>, expiresIn: string = '7d'): string {
    return jwt.sign(payload, this.secret, { expiresIn } as any);
  }

  verify(token: string): JWTPayload {
    return jwt.verify(token, this.secret) as JWTPayload;
  }

  decode(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch {
      return null;
    }
  }
}

