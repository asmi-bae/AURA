/**
 * Screen Capture Types
 * 
 * Type definitions for screen capture functionality.
 * 
 * @module @aura/agent/capabilities/screen-capture/types
 */

/**
 * Capture format
 */
export type CaptureFormat = 'png' | 'jpeg' | 'jpg' | 'webp' | 'bmp';

/**
 * Capture region
 */
export interface CaptureRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Screen information
 */
export interface ScreenInfo {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  scaleFactor: number;
  isPrimary: boolean;
}

/**
 * Capture options
 */
export interface CaptureOptions {
  /** Image format */
  format?: CaptureFormat;
  /** Quality (0-100, for JPEG/WebP) */
  quality?: number;
  /** Capture region */
  region?: CaptureRegion;
  /** Screen ID (for multi-monitor) */
  screenId?: number;
  /** Include cursor */
  includeCursor?: boolean;
  /** Save to file */
  saveToFile?: boolean;
  /** File path (if saveToFile is true) */
  filePath?: string;
  /** Metadata */
  metadata?: Record<string, any>;
  /** Convert to format */
  convertTo?: CaptureFormat;
  /** Resize options */
  resize?: {
    width?: number;
    height?: number;
    maintainAspectRatio?: boolean;
  };
  /** Optimize image */
  optimize?: boolean;
}

/**
 * Capture result
 */
export interface CaptureResult {
  /** Image buffer */
  buffer: Buffer;
  /** Image format */
  format: CaptureFormat;
  /** Width */
  width: number;
  /** Height */
  height: number;
  /** File path (if saved) */
  filePath?: string;
  /** Metadata */
  metadata?: Record<string, any>;
  /** Timestamp */
  timestamp: number;
}

