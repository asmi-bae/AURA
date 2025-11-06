/**
 * Mock Mouse Backend
 * 
 * Mock implementation for testing and development.
 * Logs all actions without actually moving the mouse.
 * 
 * @module @aura/agent/capabilities/mouse-control/backends
 */

import { MouseBackend } from './mouse-backend.js';
import { MouseButton } from '../mouse-control-manager.js';
import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * Mock Backend Implementation
 */
export class MockMouseBackend implements MouseBackend {
  private position = { x: 0, y: 0 };
  private isInitialized = false;

  async init(): Promise<void> {
    this.isInitialized = true;
    logger.info('Mock mouse backend initialized');
  }

  async moveTo(x: number, y: number): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Backend not initialized');
    }

    logger.debug('Mock: moveTo', { x, y });
    this.position = { x, y };
  }

  async click(button: MouseButton): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Backend not initialized');
    }

    logger.debug('Mock: click', { button, position: this.position });
  }

  async doubleClick(button: MouseButton): Promise<void> {
    logger.debug('Mock: doubleClick', { button, position: this.position });
  }

  async mouseDown(button: MouseButton): Promise<void> {
    logger.debug('Mock: mouseDown', { button, position: this.position });
  }

  async mouseUp(button: MouseButton): Promise<void> {
    logger.debug('Mock: mouseUp', { button, position: this.position });
  }

  async scroll(amount: number, direction: 'up' | 'down'): Promise<void> {
    logger.debug('Mock: scroll', { amount, direction });
  }

  async getPosition(): Promise<{ x: number; y: number }> {
    return { ...this.position };
  }

  async cleanup(): Promise<void> {
    this.isInitialized = false;
    logger.info('Mock mouse backend cleanup completed');
  }
}

