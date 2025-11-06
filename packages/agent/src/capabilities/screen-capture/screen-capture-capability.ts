/**
 * Screen Capture Capability
 * 
 * Wraps ScreenCaptureManager as a Capability interface.
 * 
 * @module @aura/agent/capabilities/screen-capture
 */

import { Capability } from '../core/index.js';
import { ScreenCaptureManager } from './screen-capture-manager.js';
import { CaptureOptions, CaptureRegion } from './types/index.js';

/**
 * Screen Capture Capability
 */
export class ScreenCaptureCapability implements Capability {
  name = 'screen-capture';
  private manager: ScreenCaptureManager;

  constructor(manager: ScreenCaptureManager) {
    this.manager = manager;
  }

  /**
   * Initialize capability
   */
  async init(): Promise<void> {
    await this.manager.init();
  }

  /**
   * Execute screen capture action
   */
  async execute(action: string, parameters: Record<string, any>): Promise<any> {
    switch (action) {
      case 'capture':
        const captureOptions: CaptureOptions = {
          format: parameters.format || 'png',
          quality: parameters.quality,
          screenId: parameters.screenId,
          includeCursor: parameters.includeCursor,
          saveToFile: parameters.saveToFile,
          filePath: parameters.filePath,
          metadata: parameters.metadata,
        };
        return await this.manager.captureScreen(captureOptions);
      
      case 'capture-region':
        const region: CaptureRegion = {
          x: parameters.x,
          y: parameters.y,
          width: parameters.width,
          height: parameters.height,
        };
        const regionOptions: CaptureOptions = {
          format: parameters.format || 'png',
          quality: parameters.quality,
          screenId: parameters.screenId,
          includeCursor: parameters.includeCursor,
          saveToFile: parameters.saveToFile,
          filePath: parameters.filePath,
          metadata: parameters.metadata,
        };
        return await this.manager.captureRegion(region, regionOptions);
      
      case 'get-screens':
        return await this.manager.getScreens();
      
      case 'get-primary-screen':
        return await this.manager.getPrimaryScreen();
      
      case 'load-capture':
        return await this.manager.loadCapture(parameters.id);
      
      case 'list-captures':
        return await this.manager.listCaptures();
      
      case 'delete-capture':
        await this.manager.deleteCapture(parameters.id);
        break;
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Cleanup capability
   */
  async cleanup(): Promise<void> {
    await this.manager.cleanup();
  }
}

