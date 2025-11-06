/**
 * Capture Utilities
 * 
 * Utility functions for screen capture operations.
 * 
 * @module @aura/agent/capabilities/screen-capture/utils
 */

import { CaptureFormat, CaptureRegion } from '../types/index.js';

/**
 * Capture Utilities
 * 
 * Utility functions for screen capture.
 */
export class CaptureUtils {
  /**
   * Validate capture region
   */
  static validateRegion(region: CaptureRegion): boolean {
    return (
      region.x >= 0 &&
      region.y >= 0 &&
      region.width > 0 &&
      region.height > 0
    );
  }

  /**
   * Normalize capture region
   */
  static normalizeRegion(region: CaptureRegion, maxWidth: number, maxHeight: number): CaptureRegion {
    return {
      x: Math.max(0, Math.min(region.x, maxWidth)),
      y: Math.max(0, Math.min(region.y, maxHeight)),
      width: Math.max(1, Math.min(region.width, maxWidth - region.x)),
      height: Math.max(1, Math.min(region.height, maxHeight - region.y)),
    };
  }

  /**
   * Get file extension for format
   */
  static getFileExtension(format: CaptureFormat): string {
    const extensions: Record<CaptureFormat, string> = {
      png: 'png',
      jpeg: 'jpg',
      jpg: 'jpg',
      webp: 'webp',
      bmp: 'bmp',
    };
    return extensions[format] || 'png';
  }

  /**
   * Generate filename
   */
  static generateFilename(format: CaptureFormat, prefix: string = 'capture'): string {
    const timestamp = Date.now();
    const extension = this.getFileExtension(format);
    return `${prefix}-${timestamp}.${extension}`;
  }

  /**
   * Calculate buffer size estimate
   */
  static estimateBufferSize(width: number, height: number, format: CaptureFormat): number {
    // Rough estimates (bytes)
    const estimates: Record<CaptureFormat, number> = {
      png: width * height * 4, // RGBA
      jpeg: width * height * 0.5, // Compressed
      jpg: width * height * 0.5, // Compressed
      webp: width * height * 0.4, // Compressed
      bmp: width * height * 3, // RGB
    };
    return estimates[format] || width * height * 4;
  }
}

