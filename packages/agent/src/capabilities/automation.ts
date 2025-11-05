/**
 * Automation Capability
 * 
 * Provides automation functionality (mouse, keyboard).
 * 
 * @module @aura/agent/capabilities
 */

import { Capability } from './capability-registry';
import { AutomationService } from '../legacy/automation';

/**
 * Automation Capability
 */
export class AutomationCapability implements Capability {
  name = 'automation';
  private service: AutomationService;

  constructor() {
    this.service = new AutomationService();
  }

  async execute(action: string, parameters: Record<string, any>): Promise<any> {
    switch (action) {
      case 'mouse-move':
        await this.service.executeCommand({
          type: 'mouse-move',
          x: parameters.x,
          y: parameters.y,
        });
        break;
      case 'mouse-click':
        await this.service.executeCommand({
          type: 'mouse-click',
          button: parameters.button || 'left',
        });
        break;
      case 'keyboard-type':
        await this.service.executeCommand({
          type: 'keyboard-type',
          text: parameters.text,
        });
        break;
      case 'keyboard-press':
        await this.service.executeCommand({
          type: 'keyboard-press',
          key: parameters.key,
        });
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
}

