/**
 * Capture Storage
 * 
 * Manages storage of captured screenshots.
 * Supports file system and in-memory storage.
 * 
 * @module @aura/agent/capabilities/screen-capture/storage
 */

import { createLogger } from '@aura/utils';
import { LocalStorage } from '../../../storage/local-storage.js';
import { CaptureResult, CaptureFormat } from '../types/index.js';
import path from 'node:path';
import fs from 'node:fs/promises';

const logger = createLogger();

/**
 * Storage options
 */
export interface StorageOptions {
  /** Storage directory */
  storageDir?: string;
  /** Maximum number of captures to keep */
  maxCaptures?: number;
  /** Auto-cleanup old captures */
  autoCleanup?: boolean;
  /** Compression enabled */
  compress?: boolean;
}

/**
 * Capture Storage
 * 
 * Manages storage of captured screenshots.
 */
export class CaptureStorage {
  private storage: LocalStorage;
  private options: Required<StorageOptions>;
  private captures: Map<string, CaptureResult> = new Map();

  constructor(storage: LocalStorage, options: StorageOptions = {}) {
    this.storage = storage;
    this.options = {
      storageDir: options.storageDir || './captures',
      maxCaptures: options.maxCaptures || 100,
      autoCleanup: options.autoCleanup ?? true,
      compress: options.compress ?? false,
    };
  }

  /**
   * Initialize storage
   */
  async init(): Promise<void> {
    // Create storage directory if it doesn't exist
    try {
      await fs.mkdir(this.options.storageDir, { recursive: true });
    } catch (error) {
      logger.warn('Failed to create storage directory', { error });
    }

    // Load existing captures
    try {
      const stored = await this.storage.get('screen-captures');
      if (stored && Array.isArray(stored)) {
        for (const capture of stored) {
          this.captures.set(capture.timestamp.toString(), capture);
        }
      }
    } catch (error) {
      logger.warn('Failed to load captures', { error });
    }

    logger.info('Capture storage initialized', {
      storageDir: this.options.storageDir,
      captureCount: this.captures.size,
    });
  }

  /**
   * Save capture
   */
  async save(capture: CaptureResult): Promise<string> {
    const id = `capture-${capture.timestamp}`;
    
    // Save to file if filePath is provided
    if (capture.filePath) {
      try {
        await fs.writeFile(capture.filePath, capture.buffer);
      } catch (error) {
        logger.error('Failed to save capture to file', { error, filePath: capture.filePath });
      }
    } else if (this.options.storageDir) {
      // Save to storage directory
      const filename = `${id}.${capture.format}`;
      const filePath = path.join(this.options.storageDir, filename);
      
      try {
        await fs.writeFile(filePath, capture.buffer);
        capture.filePath = filePath;
      } catch (error) {
        logger.error('Failed to save capture', { error, filePath });
      }
    }

    // Store in memory
    this.captures.set(id, capture);

    // Auto-cleanup if enabled
    if (this.options.autoCleanup) {
      await this.cleanupOld();
    }

    // Persist to storage
    await this.persist();

    logger.debug('Capture saved', { id, filePath: capture.filePath });
    return id;
  }

  /**
   * Load capture by ID
   */
  async load(id: string): Promise<CaptureResult | null> {
    const capture = this.captures.get(id);
    if (!capture) {
      return null;
    }

    // Load buffer from file if needed
    if (capture.filePath && capture.buffer.length === 0) {
      try {
        capture.buffer = await fs.readFile(capture.filePath);
      } catch (error) {
        logger.error('Failed to load capture from file', { error, filePath: capture.filePath });
        return null;
      }
    }

    return { ...capture };
  }

  /**
   * Delete capture
   */
  async delete(id: string): Promise<void> {
    const capture = this.captures.get(id);
    if (capture) {
      // Delete file if exists
      if (capture.filePath) {
        try {
          await fs.unlink(capture.filePath);
        } catch (error) {
          logger.warn('Failed to delete capture file', { error, filePath: capture.filePath });
        }
      }

      this.captures.delete(id);
      await this.persist();
      logger.info('Capture deleted', { id });
    }
  }

  /**
   * List all captures
   */
  async list(): Promise<CaptureResult[]> {
    return Array.from(this.captures.values()).map(c => ({ ...c }));
  }

  /**
   * Cleanup old captures
   */
  private async cleanupOld(): Promise<void> {
    if (this.captures.size <= this.options.maxCaptures) {
      return;
    }

    // Sort by timestamp (oldest first)
    const sorted = Array.from(this.captures.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Delete oldest captures
    const toDelete = sorted.slice(0, this.captures.size - this.options.maxCaptures);
    for (const [id] of toDelete) {
      await this.delete(id);
    }

    logger.info('Old captures cleaned up', { deleted: toDelete.length });
  }

  /**
   * Persist captures to storage
   */
  private async persist(): Promise<void> {
    try {
      const captures = Array.from(this.captures.values()).map(c => ({
        ...c,
        buffer: undefined, // Don't store buffer in storage
      }));
      await this.storage.set('screen-captures', captures);
    } catch (error) {
      logger.error('Failed to persist captures', { error });
    }
  }

  /**
   * Clear all captures
   */
  async clear(): Promise<void> {
    for (const id of this.captures.keys()) {
      await this.delete(id);
    }
    this.captures.clear();
    await this.persist();
    logger.info('All captures cleared');
  }
}

