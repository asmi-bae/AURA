/**
 * Local Storage
 * 
 * Encrypted local database for storing agent data.
 * Uses SQLite with encryption for sensitive data.
 * 
 * @module @aura/agent/storage
 */

import { createLogger } from '@aura/utils';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const logger = createLogger();

/**
 * Local Storage configuration
 */
export interface LocalStorageConfig {
  agentId: string;
  encryptionKey: Buffer;
  dataDir?: string;
}

/**
 * Local Storage
 * 
 * Manages encrypted local storage for agent data.
 */
export class LocalStorage {
  private config: LocalStorageConfig;
  private logger = createLogger();
  private dataDir: string;
  private data: Map<string, any> = new Map();
  private algorithm = 'aes-256-gcm';
  private keyLength = 32;
  private ivLength = 16;

  constructor(config: LocalStorageConfig) {
    this.config = config;
    this.dataDir = config.dataDir || path.join(process.cwd(), '.aura-data', config.agentId);
  }

  /**
   * Initialize storage
   */
  async init(): Promise<void> {
    try {
      // Create data directory if it doesn't exist
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      // Load existing data
      await this.loadData();

      logger.info('Local storage initialized', { dataDir: this.dataDir });
    } catch (error) {
      logger.error('Failed to initialize storage', { error });
      throw error;
    }
  }

  /**
   * Get value
   */
  async get(key: string): Promise<any> {
    try {
      // Check in-memory cache first
      if (this.data.has(key)) {
        return this.data.get(key);
      }

      // Load from disk
      const filePath = path.join(this.dataDir, `${this.hash(key)}.json`);
      if (fs.existsSync(filePath)) {
        const encrypted = fs.readFileSync(filePath);
        const decrypted = await this.decrypt(encrypted);
        const value = JSON.parse(decrypted.toString('utf8'));
        this.data.set(key, value);
        return value;
      }

      return undefined;
    } catch (error) {
      logger.error('Error getting value', { error, key });
      throw error;
    }
  }

  /**
   * Set value
   */
  async set(key: string, value: any): Promise<void> {
    try {
      // Store in memory
      this.data.set(key, value);

      // Encrypt and save to disk
      const filePath = path.join(this.dataDir, `${this.hash(key)}.json`);
      const encrypted = await this.encrypt(Buffer.from(JSON.stringify(value)));
      fs.writeFileSync(filePath, encrypted);

      logger.debug('Value stored', { key });
    } catch (error) {
      logger.error('Error setting value', { error, key });
      throw error;
    }
  }

  /**
   * Delete value
   */
  async delete(key: string): Promise<void> {
    try {
      this.data.delete(key);

      const filePath = path.join(this.dataDir, `${this.hash(key)}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      logger.debug('Value deleted', { key });
    } catch (error) {
      logger.error('Error deleting value', { error, key });
      throw error;
    }
  }

  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    try {
      this.data.clear();

      if (fs.existsSync(this.dataDir)) {
        const files = fs.readdirSync(this.dataDir);
        for (const file of files) {
          fs.unlinkSync(path.join(this.dataDir, file));
        }
      }

      logger.info('Storage cleared');
    } catch (error) {
      logger.error('Error clearing storage', { error });
      throw error;
    }
  }

  /**
   * Load data from disk
   */
  private async loadData(): Promise<void> {
    // Placeholder - would load all encrypted files
    logger.debug('Loading data from disk');
  }

  /**
   * Encrypt data
   */
  private async encrypt(data: Buffer): Promise<Buffer> {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.config.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]);
  }

  /**
   * Decrypt data
   */
  private async decrypt(encrypted: Buffer): Promise<Buffer> {
    const iv = encrypted.slice(0, this.ivLength);
    const authTag = encrypted.slice(this.ivLength, this.ivLength + 16);
    const data = encrypted.slice(this.ivLength + 16);
    const decipher = crypto.createDecipheriv(this.algorithm, this.config.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(data), decipher.final()]);
  }

  /**
   * Hash key
   */
  private hash(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    // Save all data to disk
    for (const [key, value] of this.data.entries()) {
      await this.set(key, value);
    }

    logger.info('Storage cleanup completed');
  }
}

