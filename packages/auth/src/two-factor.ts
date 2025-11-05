import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { createLogger } from '@aura/utils';

const logger = createLogger();

export interface TwoFactorConfig {
  issuer: string;
  label: string;
}

export class TwoFactorService {
  private issuer: string;

  constructor(issuer: string = 'AURA') {
    this.issuer = issuer;
  }

  generateSecret(userEmail: string, label?: string): { secret: string; qrCode: string } {
    const secret = speakeasy.generateSecret({
      name: `${this.issuer} (${userEmail})`,
      issuer: this.issuer,
      length: 32,
    });

    return {
      secret: secret.base32,
      qrCode: secret.otpauth_url || '',
    };
  }

  async generateQRCode(otpauthUrl: string): Promise<string> {
    try {
      const qrCode = await QRCode.toDataURL(otpauthUrl);
      return qrCode;
    } catch (error) {
      logger.error('Error generating QR code', { error });
      throw error;
    }
  }

  verifyToken(token: string, secret: string): boolean {
    try {
      return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 2, // Allow 2 time steps before/after
      });
    } catch (error) {
      logger.error('Error verifying 2FA token', { error });
      return false;
    }
  }

  generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    const crypto = require('crypto');
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }
}

