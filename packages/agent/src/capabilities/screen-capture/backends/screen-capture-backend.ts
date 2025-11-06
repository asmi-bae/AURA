/**
 * Screen Capture Backend Interface
 * 
 * Abstract interface for platform-specific screen capture backends.
 * 
 * @module @aura/agent/capabilities/screen-capture/backends
 */

import { CaptureRegion, CaptureFormat } from '../types/index.js';

/**
 * Screen Capture Backend Interface
 * 
 * All platform-specific backends must implement this interface.
 */
export interface ScreenCaptureBackend {
  /**
   * Initialize the backend
   */
  init(): Promise<void>;

  /**
   * Capture entire screen
   */
  captureScreen(format: CaptureFormat): Promise<Buffer>;

  /**
   * Capture screen region
   */
  captureRegion(
    region: CaptureRegion,
    format: CaptureFormat
  ): Promise<Buffer>;

  /**
   * Get available screens
   */
  getScreens(): Promise<Array<{
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    scaleFactor: number;
    isPrimary: boolean;
  }>>;

  /**
   * Get primary screen
   */
  getPrimaryScreen(): Promise<{
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    scaleFactor: number;
    isPrimary: boolean;
  } | null>;

  /**
   * Cleanup resources
   */
  cleanup(): Promise<void>;
}

