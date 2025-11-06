/**
 * Screen Capture Manager
 * 
 * Main API for screen capture operations.
 * Provides high-level primitives for capturing screens with processing and storage.
 * 
 * @module @aura/agent/capabilities/screen-capture
 */

import { EventEmitter } from 'events';
import { createLogger } from '@aura/utils';
import { ScreenCaptureBackend } from './backends/index.js';
import { ScreenManager } from './managers/index.js';
import { ImageProcessor } from './processors/index.js';
import { CaptureStorage } from './storage/index.js';
import { CaptureUtils } from './utils/index.js';
import { CaptureOptions, CaptureResult, CaptureFormat, CaptureRegion, ScreenInfo } from './types/index.js';

const logger = createLogger();

/**
 * Screen Capture Manager Configuration
 */
export interface ScreenCaptureManagerConfig {
  backend: ScreenCaptureBackend;
  storage?: CaptureStorage;
  processor?: ImageProcessor;
  screenManager?: ScreenManager;
}

/**
 * Screen Capture Manager
 * 
 * Main API for screen capture operations.
 */
export class ScreenCaptureManager extends EventEmitter {
  private backend: ScreenCaptureBackend;
  private storage?: CaptureStorage;
  private processor: ImageProcessor;
  private screenManager: ScreenManager;
  private isInitialized = false;
  private isEnabled = false;

  constructor(config: ScreenCaptureManagerConfig) {
    super();
    this.backend = config.backend;
    this.storage = config.storage;
    this.processor = config.processor || new ImageProcessor();
    this.screenManager = config.screenManager || new ScreenManager();
  }

  /**
   * Initialize screen capture manager
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.backend.init();
      await this.screenManager.init();
      if (this.storage) {
        await this.storage.init();
      }

      this.isInitialized = true;
      logger.info('Screen capture manager initialized');
      this.emit('initialized');
    } catch (error) {
      logger.error('Failed to initialize screen capture manager', { error });
      throw error;
    }
  }

  /**
   * Enable screen capture
   */
  async enable(): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }

    this.isEnabled = true;
    logger.info('Screen capture enabled');
    this.emit('enabled');
  }

  /**
   * Disable screen capture
   */
  async disable(): Promise<void> {
    this.isEnabled = false;
    logger.info('Screen capture disabled');
    this.emit('disabled');
  }

  /**
   * Capture entire screen
   */
  async captureScreen(options: CaptureOptions = {}): Promise<CaptureResult> {
    await this.checkEnabled();

    const format = options.format || 'png';
    const startTime = Date.now();

    try {
      // Capture screen
      let buffer = await this.backend.captureScreen(format);

      // Get screen info
      const screen = options.screenId
        ? this.screenManager.getScreen(options.screenId)
        : this.screenManager.getPrimaryScreen();

      if (!screen) {
        throw new Error('No screen available');
      }

      // Process image if needed
      if (options.quality || options.convertTo || options.resize || options.optimize) {
        buffer = await this.processor.process(buffer, format, {
          quality: options.quality,
          convertTo: options.convertTo,
          resize: options.resize,
          optimize: options.optimize,
        });
      }

      // Get metadata
      const metadata = await this.processor.getMetadata(buffer);

      const result: CaptureResult = {
        buffer,
        format: options.convertTo || format,
        width: screen.width,
        height: screen.height,
        timestamp: startTime,
        metadata: {
          ...options.metadata,
          screenId: screen.id,
          processingTime: Date.now() - startTime,
        },
      };

      // Save to file if requested
      if (options.saveToFile) {
        const filename = options.filePath || CaptureUtils.generateFilename(result.format);
        result.filePath = filename;
      }

      // Save to storage if available
      if (this.storage && options.saveToFile) {
        await this.storage.save(result);
      }

      this.emit('captured', result);
      logger.debug('Screen captured', {
        format: result.format,
        width: result.width,
        height: result.height,
      });

      return result;
    } catch (error) {
      logger.error('Screen capture failed', { error });
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Capture screen region
   */
  async captureRegion(region: CaptureRegion, options: CaptureOptions = {}): Promise<CaptureResult> {
    await this.checkEnabled();

    if (!CaptureUtils.validateRegion(region)) {
      throw new Error('Invalid capture region');
    }

    const format = options.format || 'png';
    const startTime = Date.now();

    try {
      // Normalize region
      const screen = options.screenId
        ? this.screenManager.getScreen(options.screenId)
        : this.screenManager.getPrimaryScreen();

      if (!screen) {
        throw new Error('No screen available');
      }

      const normalizedRegion = CaptureUtils.normalizeRegion(
        region,
        screen.width,
        screen.height
      );

      // Capture region
      let buffer = await this.backend.captureRegion(normalizedRegion, format);

      // Process image if needed
      if (options.quality || options.convertTo || options.resize || options.optimize) {
        buffer = await this.processor.process(buffer, format, {
          quality: options.quality,
          convertTo: options.convertTo,
          resize: options.resize,
          optimize: options.optimize,
        });
      }

      // Get metadata
      const metadata = await this.processor.getMetadata(buffer);

      const result: CaptureResult = {
        buffer,
        format: options.convertTo || format,
        width: normalizedRegion.width,
        height: normalizedRegion.height,
        timestamp: startTime,
        metadata: {
          ...options.metadata,
          region: normalizedRegion,
          screenId: screen.id,
          processingTime: Date.now() - startTime,
        },
      };

      // Save to file if requested
      if (options.saveToFile) {
        const filename = options.filePath || CaptureUtils.generateFilename(result.format);
        result.filePath = filename;
      }

      // Save to storage if available
      if (this.storage && options.saveToFile) {
        await this.storage.save(result);
      }

      this.emit('captured', result);
      logger.debug('Region captured', {
        format: result.format,
        width: result.width,
        height: result.height,
        region: normalizedRegion,
      });

      return result;
    } catch (error) {
      logger.error('Region capture failed', { error, region });
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get available screens
   */
  async getScreens(): Promise<ScreenInfo[]> {
    return this.screenManager.getScreens();
  }

  /**
   * Get primary screen
   */
  async getPrimaryScreen(): Promise<ScreenInfo | null> {
    return this.screenManager.getPrimaryScreen();
  }

  /**
   * Get screen at coordinates
   */
  async getScreenAt(x: number, y: number): Promise<ScreenInfo | null> {
    return this.screenManager.getScreenAt(x, y);
  }

  /**
   * Load capture from storage
   */
  async loadCapture(id: string): Promise<CaptureResult | null> {
    if (!this.storage) {
      throw new Error('Storage not configured');
    }
    return this.storage.load(id);
  }

  /**
   * List all captures
   */
  async listCaptures(): Promise<CaptureResult[]> {
    if (!this.storage) {
      throw new Error('Storage not configured');
    }
    return this.storage.list();
  }

  /**
   * Delete capture
   */
  async deleteCapture(id: string): Promise<void> {
    if (!this.storage) {
      throw new Error('Storage not configured');
    }
    await this.storage.delete(id);
  }

  /**
   * Check if enabled
   */
  private async checkEnabled(): Promise<void> {
    if (!this.isEnabled) {
      throw new Error('Screen capture is not enabled');
    }
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    await this.disable();
    await this.backend.cleanup();
    if (this.storage) {
      await this.storage.clear();
    }
    logger.info('Screen capture manager cleanup completed');
  }
}

