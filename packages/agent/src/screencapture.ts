import * as robot from 'robotjs';
import { createLogger } from '@aura/utils';
import { ScreenCaptureResult } from './types';

export class ScreenCaptureService {
  private logger = createLogger();

  async captureScreen(format: 'png' | 'jpeg' = 'png'): Promise<ScreenCaptureResult> {
    try {
      const screenSize = robot.getScreenSize();
      const mousePos = robot.getMousePos();

      // Capture screen using robotjs
      const bitmap = robot.screen.capture(0, 0, screenSize.width, screenSize.height);
      
      // Convert bitmap to buffer
      const image = bitmap.image;
      const buffer = Buffer.from(image);

      // Convert to base64 if needed
      const base64 = buffer.toString('base64');
      const dataUri = `data:image/${format};base64,${base64}`;

      return {
        image: dataUri,
        format,
        timestamp: Date.now(),
        dimensions: {
          width: screenSize.width,
          height: screenSize.height,
        },
      };
    } catch (error) {
      this.logger.error('Error capturing screen', { error });
      throw error;
    }
  }

  async captureRegion(
    x: number,
    y: number,
    width: number,
    height: number,
    format: 'png' | 'jpeg' = 'png'
  ): Promise<ScreenCaptureResult> {
    try {
      const bitmap = robot.screen.capture(x, y, width, height);
      const buffer = Buffer.from(bitmap.image);
      const base64 = buffer.toString('base64');
      const dataUri = `data:image/${format};base64,${base64}`;

      return {
        image: dataUri,
        format,
        timestamp: Date.now(),
        dimensions: { width, height },
      };
    } catch (error) {
      this.logger.error('Error capturing screen region', { error });
      throw error;
    }
  }
}

