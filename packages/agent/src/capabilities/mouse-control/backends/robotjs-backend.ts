/**
 * RobotJS Backend
 * 
 * Platform-specific implementation using robotjs library.
 * 
 * @module @aura/agent/capabilities/mouse-control/backends
 */

import { MouseBackend } from './mouse-backend.js';
import { MouseButton } from '../mouse-control-manager.js';
import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * RobotJS Backend Implementation
 */
export class RobotJSBackend implements MouseBackend {
  private robotjs: any;
  private isInitialized = false;

  constructor() {
    // Dynamic import to handle optional dependency
    try {
      this.robotjs = require('robotjs');
    } catch (error) {
      logger.warn('robotjs not available, using mock backend');
    }
  }

  async init(): Promise<void> {
    if (!this.robotjs) {
      throw new Error('robotjs is not available');
    }

    this.isInitialized = true;
    logger.info('RobotJS backend initialized');
  }

  async moveTo(x: number, y: number): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Backend not initialized');
    }

    this.robotjs.moveMouse(x, y);
  }

  async click(button: MouseButton): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Backend not initialized');
    }

    const buttonMap: Record<MouseButton, string> = {
      left: 'left',
      right: 'right',
      middle: 'center',
    };

    this.robotjs.mouseClick(buttonMap[button]);
  }

  async doubleClick(button: MouseButton): Promise<void> {
    await this.click(button);
    await new Promise(resolve => setTimeout(resolve, 50));
    await this.click(button);
  }

  async mouseDown(button: MouseButton): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Backend not initialized');
    }

    const buttonMap: Record<MouseButton, string> = {
      left: 'left',
      right: 'right',
      middle: 'center',
    };

    this.robotjs.mouseToggle('down', buttonMap[button]);
  }

  async mouseUp(button: MouseButton): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Backend not initialized');
    }

    const buttonMap: Record<MouseButton, string> = {
      left: 'left',
      right: 'right',
      middle: 'center',
    };

    this.robotjs.mouseToggle('up', buttonMap[button]);
  }

  async scroll(amount: number, direction: 'up' | 'down'): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Backend not initialized');
    }

    const scrollAmount = direction === 'up' ? amount : -amount;
    this.robotjs.scrollMouse(0, scrollAmount);
  }

  async getPosition(): Promise<{ x: number; y: number }> {
    if (!this.isInitialized) {
      throw new Error('Backend not initialized');
    }

    const pos = this.robotjs.getMousePos();
    return { x: pos.x, y: pos.y };
  }

  async cleanup(): Promise<void> {
    this.isInitialized = false;
    logger.info('RobotJS backend cleanup completed');
  }
}

