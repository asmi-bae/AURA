/**
 * Mouse Control Capability
 * 
 * Wraps MouseControlManager as a Capability interface.
 * 
 * @module @aura/agent/capabilities/mouse-control
 */

import { Capability } from '../core/index.js';
import { MouseControlManager, MouseButton, Point } from './mouse-control-manager.js';

/**
 * Mouse Control Capability
 */
export class MouseControlCapability implements Capability {
  name = 'mouse-control';
  private manager: MouseControlManager;

  constructor(manager: MouseControlManager) {
    this.manager = manager;
  }

  /**
   * Initialize capability
   */
  async init(): Promise<void> {
    await this.manager.init();
  }

  /**
   * Execute mouse control action
   */
  async execute(action: string, parameters: Record<string, any>): Promise<any> {
    switch (action) {
      case 'move':
        await this.manager.moveTo(parameters.x, parameters.y, parameters.options);
        break;
      case 'move-relative':
        await this.manager.moveRelative(parameters.dx, parameters.dy, parameters.options);
        break;
      case 'click':
        await this.manager.click(parameters.button || 'left', parameters.options);
        break;
      case 'double-click':
        await this.manager.doubleClick(parameters.button || 'left', parameters.options);
        break;
      case 'drag':
        await this.manager.drag(
          parameters.from as Point,
          parameters.to as Point,
          parameters.options
        );
        break;
      case 'scroll':
        await this.manager.scroll(
          parameters.amount,
          parameters.direction || 'down',
          parameters.options
        );
        break;
      case 'find-and-click':
        return await this.manager.findAndClick(parameters.locator, parameters.options);
      default:
        throw new Error(`Unknown mouse action: ${action}`);
    }
  }

  /**
   * Cleanup capability
   */
  async cleanup(): Promise<void> {
    await this.manager.cleanup();
  }
}

