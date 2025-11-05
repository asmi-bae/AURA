import * as robot from 'robotjs';
import { createLogger } from '@aura/utils';
import { AutomationCommand } from './types';

export class AutomationService {
  private logger = createLogger();

  async executeCommand(command: AutomationCommand): Promise<void> {
    try {
      switch (command.type) {
        case 'mouse-move':
          if (command.x !== undefined && command.y !== undefined) {
            robot.moveMouse(command.x, command.y);
            this.logger.debug('Mouse moved', { x: command.x, y: command.y });
          }
          break;

        case 'mouse-click':
          robot.mouseClick(command.button || 'left');
          this.logger.debug('Mouse clicked', { button: command.button });
          break;

        case 'mouse-drag':
          if (command.x !== undefined && command.y !== undefined) {
            robot.mouseToggle('down');
            robot.moveMouseSmooth(command.x, command.y);
            robot.mouseToggle('up');
            this.logger.debug('Mouse dragged', { x: command.x, y: command.y });
          }
          break;

        case 'keyboard-type':
          if (command.text) {
            robot.typeString(command.text);
            this.logger.debug('Keyboard typed', { text: command.text });
          }
          break;

        case 'keyboard-press':
          if (command.key) {
            robot.keyTap(command.key);
            this.logger.debug('Keyboard pressed', { key: command.key });
          }
          break;

        case 'keyboard-shortcut':
          if (command.keys && command.keys.length > 0) {
            robot.keyTap(command.keys[0], command.keys.slice(1));
            this.logger.debug('Keyboard shortcut', { keys: command.keys });
          }
          break;

        default:
          this.logger.warn('Unknown automation command type', { type: command.type });
      }
    } catch (error) {
      this.logger.error('Error executing automation command', { error, command });
      throw error;
    }
  }

  getMousePosition(): { x: number; y: number } {
    return robot.getMousePos();
  }

  getScreenSize(): { width: number; height: number } {
    return robot.getScreenSize();
  }

  async typeString(text: string, options?: { delay?: number }): Promise<void> {
    const delay = options?.delay || 0;
    for (const char of text) {
      robot.typeString(char);
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

