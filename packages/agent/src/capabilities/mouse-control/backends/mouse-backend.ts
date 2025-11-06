/**
 * Mouse Backend Interface
 * 
 * Abstract interface for platform-specific mouse control backends.
 * Enables testing with Mock backend and supports multiple platforms.
 * 
 * @module @aura/agent/capabilities/mouse-control/backends
 */

import { MouseButton } from '../mouse-control-manager.js';

/**
 * Mouse Backend Interface
 * 
 * All platform-specific backends must implement this interface.
 */
export interface MouseBackend {
  /**
   * Initialize the backend
   */
  init(): Promise<void>;

  /**
   * Move mouse to absolute coordinates
   */
  moveTo(x: number, y: number): Promise<void>;

  /**
   * Click mouse button
   */
  click(button: MouseButton): Promise<void>;

  /**
   * Double click
   */
  doubleClick(button: MouseButton): Promise<void>;

  /**
   * Press mouse button down
   */
  mouseDown(button: MouseButton): Promise<void>;

  /**
   * Release mouse button
   */
  mouseUp(button: MouseButton): Promise<void>;

  /**
   * Scroll mouse wheel
   */
  scroll(amount: number, direction: 'up' | 'down'): Promise<void>;

  /**
   * Get current mouse position
   */
  getPosition(): Promise<{ x: number; y: number }>;

  /**
   * Cleanup resources
   */
  cleanup(): Promise<void>;
}

