import { createLogger } from '@aura/utils';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import helmet from 'helmet';
import crypto from 'crypto';

const logger = createLogger();

export interface SecurityConfig {
  rateLimitWindow?: number; // milliseconds
  rateLimitMax?: number;
  slowDownWindow?: number; // milliseconds
  slowDownDelay?: number; // milliseconds
}

export class SecurityService {
  private config: SecurityConfig;

  constructor(config: SecurityConfig = {}) {
    this.config = {
      rateLimitWindow: config.rateLimitWindow || 15 * 60 * 1000, // 15 minutes
      rateLimitMax: config.rateLimitMax || 100,
      slowDownWindow: config.slowDownWindow || 15 * 60 * 1000,
      slowDownDelay: config.slowDownDelay || 500,
    };
  }

  getRateLimiter() {
    return rateLimit({
      windowMs: this.config.rateLimitWindow!,
      max: this.config.rateLimitMax!,
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit exceeded', { ip: req.ip });
        res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.ceil(this.config.rateLimitWindow! / 1000),
        });
      },
    });
  }

  getSlowDown(): ReturnType<typeof slowDown> {
    return slowDown({
      windowMs: this.config.slowDownWindow!,
      delayAfter: 50,
      delayMs: this.config.slowDownDelay!,
      maxDelayMs: 5000,
    });
  }

  getHelmetMiddleware() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    });
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  sanitizeInput(input: string): string {
    // Remove potentially dangerous characters
    return input.replace(/[<>\"']/g, '');
  }

  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  hashData(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

