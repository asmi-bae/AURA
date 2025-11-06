/**
 * Mock Screen Capture Backend
 * 
 * Mock implementation for testing and development.
 * 
 * @module @aura/agent/capabilities/screen-capture/backends
 */

import { ScreenCaptureBackend } from './screen-capture-backend.js';
import { CaptureRegion, CaptureFormat } from '../types/index.js';
import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * Mock Backend Implementation
 */
export class MockScreenCaptureBackend implements ScreenCaptureBackend {
  private isInitialized = false;

  async init(): Promise<void> {
    this.isInitialized = true;
    logger.info('Mock screen capture backend initialized');
  }

  async captureScreen(format: CaptureFormat): Promise<Buffer> {
    if (!this.isInitialized) {
      throw new Error('Backend not initialized');
    }

    logger.debug('Mock: captureScreen', { format });
    // Return empty buffer for mock
    return Buffer.alloc(0);
  }

  async captureRegion(
    region: CaptureRegion,
    format: CaptureFormat
  ): Promise<Buffer> {
    if (!this.isInitialized) {
      throw new Error('Backend not initialized');
    }

    logger.debug('Mock: captureRegion', { region, format });
    // Return empty buffer for mock
    return Buffer.alloc(0);
  }

  async getScreens(): Promise<Array<{
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    scaleFactor: number;
    isPrimary: boolean;
  }>> {
    return [{
      id: 0,
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
      scaleFactor: 1.0,
      isPrimary: true,
    }];
  }

  async getPrimaryScreen(): Promise<{
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    scaleFactor: number;
    isPrimary: boolean;
  } | null> {
    const screens = await this.getScreens();
    return screens[0] || null;
  }

  async cleanup(): Promise<void> {
    this.isInitialized = false;
    logger.info('Mock screen capture backend cleanup completed');
  }
}

