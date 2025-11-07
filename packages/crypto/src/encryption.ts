/**
 * Encryption Utilities
 * 
 * Provides encryption and decryption functionality using AES-256-GCM
 */

import { createHash, createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'crypto';
import { createLogger } from '@aura/utils';

const logger = createLogger();

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const ITERATIONS = 100000;

/**
 * Generate encryption key from password
 */
export function deriveKey(password: string, salt: Buffer): Buffer {
  return pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt data
 */
export function encrypt(data: string, password: string): string {
  try {
    // Generate salt
    const salt = randomBytes(SALT_LENGTH);
    
    // Derive key
    const key = deriveKey(password, salt);
    
    // Generate IV
    const iv = randomBytes(IV_LENGTH);
    
    // Create cipher
    const cipher = createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get auth tag
    const tag = cipher.getAuthTag();
    
    // Combine: salt + iv + tag + encrypted
    const result = Buffer.concat([
      salt,
      iv,
      tag,
      Buffer.from(encrypted, 'hex'),
    ]).toString('base64');
    
    return result;
  } catch (error) {
    logger.error('Encryption failed', { error });
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypt data
 */
export function decrypt(encryptedData: string, password: string): string {
  try {
    // Decode base64
    const data = Buffer.from(encryptedData, 'base64');
    
    // Extract components
    const salt = data.subarray(0, SALT_LENGTH);
    const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    
    // Derive key
    const key = deriveKey(password, salt);
    
    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    // Decrypt
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error('Decryption failed', { error });
    throw new Error('Decryption failed: Invalid password or corrupted data');
  }
}

/**
 * Hash data using SHA-256
 */
export function hash(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Hash data with salt
 */
export function hashWithSalt(data: string, salt: string): string {
  return createHash('sha256').update(data + salt).digest('hex');
}

/**
 * Generate random bytes
 */
export function generateRandomBytes(length: number): Buffer {
  return randomBytes(length);
}

/**
 * Generate random string
 */
export function generateRandomString(length: number): string {
  return randomBytes(length).toString('hex');
}
