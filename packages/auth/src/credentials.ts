import bcrypt from 'bcrypt';
import { createLogger } from '@aura/utils';
import { JWTService } from './jwt';
import * as crypto from 'crypto';

const logger = createLogger();

export interface Credentials {
  email: string;
  password: string;
}

export interface UserCredentials {
  userId: string;
  email: string;
  passwordHash: string;
  salt?: string;
  roles: string[];
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  lastLogin?: Date;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge?: number; // days
}

const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxAge: 90,
};

export class CredentialsService {
  private jwtService: JWTService;
  private passwordPolicy: PasswordPolicy;
  private saltRounds: number = 12;
  private maxLoginAttempts: number = 5;
  private lockoutDuration: number = 30 * 60 * 1000; // 30 minutes

  constructor(
    passwordPolicy: PasswordPolicy = DEFAULT_PASSWORD_POLICY,
    saltRounds: number = 12
  ) {
    this.jwtService = new JWTService();
    this.passwordPolicy = passwordPolicy;
    this.saltRounds = saltRounds;
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < this.passwordPolicy.minLength) {
      errors.push(`Password must be at least ${this.passwordPolicy.minLength} characters long`);
    }

    if (this.passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (this.passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (this.passwordPolicy.requireNumbers && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (this.passwordPolicy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common passwords
    const commonPasswords = ['password', '12345678', 'qwerty', 'admin', 'letmein'];
    if (commonPasswords.some(cp => password.toLowerCase().includes(cp))) {
      errors.push('Password is too common');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async register(credentials: Credentials, roles: string[] = ['user']): Promise<{
    success: boolean;
    user?: UserCredentials;
    token?: string;
    errors?: string[];
  }> {
    try {
      // Validate password
      const validation = this.validatePassword(credentials.password);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors,
        };
      }

      // Hash password
      const passwordHash = await this.hashPassword(credentials.password);

      // Create user
      const user: UserCredentials = {
        userId: crypto.randomUUID(),
        email: credentials.email.toLowerCase(),
        passwordHash,
        roles,
        emailVerified: false,
        twoFactorEnabled: false,
        failedLoginAttempts: 0,
      };

      // Generate token
      const token = this.jwtService.sign({
        userId: user.userId,
        email: user.email,
        roles: user.roles,
      });

      logger.info('User registered successfully', { userId: user.userId, email: user.email });

      return {
        success: true,
        user,
        token,
      };
    } catch (error) {
      logger.error('Error registering user', { error, email: credentials.email });
      return {
        success: false,
        errors: ['Registration failed. Please try again.'],
      };
    }
  }

  async login(
    credentials: Credentials,
    user: UserCredentials
  ): Promise<{
    success: boolean;
    token?: string;
    requires2FA?: boolean;
    errors?: string[];
  }> {
    try {
      // Check if account is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
        return {
          success: false,
          errors: [`Account is locked. Try again in ${minutesLeft} minutes.`],
        };
      }

      // Verify password
      const passwordValid = await this.verifyPassword(credentials.password, user.passwordHash);
      if (!passwordValid) {
        // Increment failed attempts
        const failedAttempts = (user.failedLoginAttempts || 0) + 1;
        const lockedUntil =
          failedAttempts >= this.maxLoginAttempts
            ? new Date(Date.now() + this.lockoutDuration)
            : undefined;

        logger.warn('Failed login attempt', {
          email: credentials.email,
          failedAttempts,
          lockedUntil,
        });

        return {
          success: false,
          errors: [
            `Invalid credentials. ${this.maxLoginAttempts - failedAttempts} attempts remaining.`,
          ],
        };
      }

      // Reset failed attempts on successful login
      user.failedLoginAttempts = 0;
      user.lockedUntil = undefined;
      user.lastLogin = new Date();

      // Check if 2FA is required
      if (user.twoFactorEnabled) {
        return {
          success: true,
          requires2FA: true,
        };
      }

      // Generate token
      const token = this.jwtService.sign({
        userId: user.userId,
        email: user.email,
        roles: user.roles,
      });

      logger.info('User logged in successfully', { userId: user.userId, email: user.email });

      return {
        success: true,
        token,
      };
    } catch (error) {
      logger.error('Error logging in user', { error, email: credentials.email });
      return {
        success: false,
        errors: ['Login failed. Please try again.'],
      };
    }
  }

  async generatePasswordResetToken(email: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour

    logger.info('Password reset token generated', { email, expires });

    return token;
  }

  async resetPassword(
    token: string,
    newPassword: string,
    user: UserCredentials
  ): Promise<{
    success: boolean;
    errors?: string[];
  }> {
    try {
      // Validate token
      if (user.passwordResetToken !== token) {
        return {
          success: false,
          errors: ['Invalid reset token.'],
        };
      }

      if (user.passwordResetExpires && user.passwordResetExpires < new Date()) {
        return {
          success: false,
          errors: ['Reset token has expired.'],
        };
      }

      // Validate new password
      const validation = this.validatePassword(newPassword);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors,
        };
      }

      // Hash new password
      user.passwordHash = await this.hashPassword(newPassword);
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;

      logger.info('Password reset successfully', { userId: user.userId });

      return {
        success: true,
      };
    } catch (error) {
      logger.error('Error resetting password', { error, userId: user.userId });
      return {
        success: false,
        errors: ['Password reset failed. Please try again.'],
      };
    }
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    user: UserCredentials
  ): Promise<{
    success: boolean;
    errors?: string[];
  }> {
    try {
      // Verify current password
      const passwordValid = await this.verifyPassword(currentPassword, user.passwordHash);
      if (!passwordValid) {
        return {
          success: false,
          errors: ['Current password is incorrect.'],
        };
      }

      // Validate new password
      const validation = this.validatePassword(newPassword);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors,
        };
      }

      // Hash new password
      user.passwordHash = await this.hashPassword(newPassword);

      logger.info('Password changed successfully', { userId });

      return {
        success: true,
      };
    } catch (error) {
      logger.error('Error changing password', { error, userId });
      return {
        success: false,
        errors: ['Password change failed. Please try again.'],
      };
    }
  }
}

