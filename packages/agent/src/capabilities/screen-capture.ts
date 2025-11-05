/**
 * Screen Capture Capability
 * 
 * Provides screen capture functionality.
 * 
 * @module @aura/agent/capabilities
 */

import { Capability } from './capability-registry';
import { ScreenCaptureService } from '../legacy/screencapture';

/**
 * Screen Capture Capability
 */
export class ScreenCaptureCapability implements Capability {
  name = 'screen-capture';
  private service: ScreenCaptureService;

  constructor() {
    this.service = new ScreenCaptureService();
  }

  async execute(action: string, parameters: Record<string, any>): Promise<any> {
    switch (action) {
      case 'capture':
        return await this.service.captureScreen(parameters.format || 'png');
      case 'capture-region':
        return await this.service.captureRegion(
          parameters.x,
          parameters.y,
          parameters.width,
          parameters.height,
          parameters.format || 'png'
        );
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
}

