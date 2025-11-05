/**
 * Security Manager
 * 
 * Manages security operations including encryption, keypair generation,
 * and secure communication.
 * 
 * @module @aura/agent/security
 */

import * as crypto from 'crypto';
import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * Keypair interface
 */
export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

/**
 * Security Manager
 * 
 * Handles all security operations for the agent.
 */
export class SecurityManager {
  private keypair: KeyPair;
  private encryptionKey: Buffer;
  private logger = createLogger();
  private algorithm = 'aes-256-gcm';
  private keyLength = 32;
  private ivLength = 16;

  constructor(keypair?: KeyPair) {
    this.keypair = keypair || this.generateKeypair();
    this.encryptionKey = crypto.randomBytes(this.keyLength);
  }

  /**
   * Generate RSA keypair
   */
  generateKeypair(): KeyPair {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    return { publicKey, privateKey };
  }

  /**
   * Get keypair
   */
  getKeypair(): KeyPair {
    return { ...this.keypair };
  }

  /**
   * Get encryption key
   */
  getEncryptionKey(): Buffer {
    return Buffer.from(this.encryptionKey);
  }

  /**
   * Encrypt data
   */
  encrypt(data: string | Buffer, key?: Buffer): { encrypted: Buffer; iv: Buffer; authTag: Buffer } {
    const keyToUse = key || this.encryptionKey;
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, keyToUse, iv);

    const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
    const encrypted = Buffer.concat([cipher.update(dataBuffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return { encrypted, iv, authTag };
  }

  /**
   * Decrypt data
   */
  decrypt(
    encrypted: Buffer,
    iv: Buffer,
    authTag: Buffer,
    key?: Buffer
  ): Buffer {
    const keyToUse = key || this.encryptionKey;
    const decipher = crypto.createDecipheriv(this.algorithm, keyToUse, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  /**
   * Sign data
   */
  sign(data: string | Buffer): string {
    const sign = crypto.createSign('SHA256');
    sign.update(data);
    sign.end();
    return sign.sign(this.keypair.privateKey, 'base64');
  }

  /**
   * Verify signature
   */
  verify(data: string | Buffer, signature: string, publicKey?: string): boolean {
    const verify = crypto.createVerify('SHA256');
    verify.update(data);
    verify.end();
    return verify.verify(publicKey || this.keypair.publicKey, signature, 'base64');
  }

  /**
   * Hash data
   */
  hash(data: string | Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

