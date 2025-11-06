import jwt from 'jsonwebtoken';
import { createLogger } from '@aura/utils';
import * as crypto from 'crypto';

const logger = createLogger();

export interface JWTPayload {
  userId: string;
  email: string;
  roles: string[];
  provider?: string;
  iat?: number;
  exp?: number;
  jti?: string; // JWT ID for token revocation
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface TokenOptions {
  expiresIn?: string;
  issuer?: string;
  audience?: string;
  subject?: string;
}

export class JWTService {
  private accessTokenSecret: string;
  private refreshTokenSecret: string;
  private issuer: string;
  private algorithm: jwt.Algorithm = 'HS256';

  constructor(
    accessTokenSecret: string = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'aura-access-secret-key',
    refreshTokenSecret: string = process.env.JWT_REFRESH_SECRET || 'aura-refresh-secret-key',
    issuer: string = process.env.JWT_ISSUER || 'aura'
  ) {
    if (!accessTokenSecret || accessTokenSecret.length < 32) {
      throw new Error('JWT access token secret must be at least 32 characters');
    }
    if (!refreshTokenSecret || refreshTokenSecret.length < 32) {
      throw new Error('JWT refresh token secret must be at least 32 characters');
    }

    this.accessTokenSecret = accessTokenSecret;
    this.refreshTokenSecret = refreshTokenSecret;
    this.issuer = issuer;
  }

  sign(payload: Omit<JWTPayload, 'iat' | 'exp' | 'jti'>, options: TokenOptions = {}): string {
    const jti = crypto.randomBytes(16).toString('hex');
    const tokenPayload: any = {
      ...payload,
      jti,
    };

    return jwt.sign(tokenPayload as any, this.accessTokenSecret, {
      expiresIn: options.expiresIn || '15m', // Short-lived access tokens
      issuer: options.issuer || this.issuer,
      audience: options.audience,
      subject: options.subject || payload.userId,
      algorithm: this.algorithm,
    } as any);
  }

  signRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp' | 'jti'>, options: TokenOptions = {}): string {
    const jti = crypto.randomBytes(16).toString('hex');
    const tokenPayload: any = {
      ...payload,
      jti,
    };

    return jwt.sign(tokenPayload as any, this.refreshTokenSecret, {
      expiresIn: options.expiresIn || '7d', // Longer-lived refresh tokens
      issuer: options.issuer || this.issuer,
      audience: options.audience,
      subject: options.subject || payload.userId,
      algorithm: this.algorithm,
    } as any);
  }

  generateTokenPair(payload: Omit<JWTPayload, 'iat' | 'exp' | 'jti'>, options: TokenOptions = {}): TokenPair {
    const accessToken = this.sign(payload, { ...options, expiresIn: options.expiresIn || '15m' });
    const refreshToken = this.signRefreshToken(payload, { ...options, expiresIn: '7d' });

    const decoded = jwt.decode(accessToken) as JWTPayload;
    const expiresIn = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 900; // 15 minutes default

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  verify(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.accessTokenSecret, {
        algorithms: [this.algorithm],
        issuer: this.issuer,
      }) as JWTPayload;
    } catch (error) {
      logger.error('Error verifying access token', { error });
      throw new Error('Invalid or expired token');
    }
  }

  verifyRefreshToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.refreshTokenSecret, {
        algorithms: [this.algorithm],
        issuer: this.issuer,
      }) as JWTPayload;
    } catch (error) {
      logger.error('Error verifying refresh token', { error });
      throw new Error('Invalid or expired refresh token');
    }
  }

  decode(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch {
      return null;
    }
  }

  rotateToken(refreshToken: string): TokenPair {
    const payload = this.verifyRefreshToken(refreshToken);
    // Remove jti and timestamp fields for new token
    const { jti, iat, exp, ...newPayload } = payload;
    return this.generateTokenPair(newPayload);
  }
}

