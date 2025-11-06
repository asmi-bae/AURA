/**
 * Mouse Control Manager
 * 
 * Main API for mouse control automation. Provides high-level primitives
 * for mouse operations with safety, humanization, and vision integration.
 * 
 * @module @aura/agent/capabilities/mouse-control
 */

import { EventEmitter } from 'events';
import { createLogger } from '@aura/utils';
import { MouseBackend } from './backends/mouse-backend.js';
import { SafetyPolicyGate } from './safety/index.js';
import { Humanizer } from './utils/index.js';
import { MultiMonitorManager } from './managers/index.js';
import { WindowFocusManager } from './managers/index.js';
import { VisionBridge } from './vision/index.js';
import { ActionScheduler } from './scheduling/index.js';
import { MouseActionAuditor } from './audit/index.js';

const logger = createLogger();

/**
 * Mouse button types
 */
export type MouseButton = 'left' | 'right' | 'middle';

/**
 * Mouse action options
 */
export interface MouseActionOptions {
  /** Humanization level (0-1, where 1 is most human-like) */
  humanize?: number;
  /** Delay before action (ms) */
  delay?: number;
  /** Retry attempts */
  retries?: number;
  /** Timeout for action (ms) */
  timeout?: number;
  /** Confidence threshold for vision-based actions */
  confidenceThreshold?: number;
  /** Workflow ID for audit trail */
  workflowId?: string;
  /** User ID for audit trail */
  userId?: string;
  /** Risk level */
  riskLevel?: 'low' | 'medium' | 'high';
  /** Requires explicit consent */
  requiresConsent?: boolean;
  /** Correlation ID for tracking */
  correlationId?: string;
}

/**
 * Coordinate point
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Screen/Window information (Mouse Control)
 */
export interface MouseControlScreenInfo {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  scaleFactor: number;
}

/**
 * Mouse Control Manager
 * 
 * Main API for mouse control operations.
 */
export class MouseControlManager extends EventEmitter {
  private backend: MouseBackend;
  private safetyGate: SafetyPolicyGate;
  private humanizer: Humanizer;
  private monitorManager: MultiMonitorManager;
  private windowManager: WindowFocusManager;
  private visionBridge: VisionBridge;
  private scheduler: ActionScheduler;
  private auditor: MouseActionAuditor;
  private isEnabled = false;
  private emergencyStop = false;

  constructor(config: {
    backend: MouseBackend;
    safetyGate: SafetyPolicyGate;
    humanizer: Humanizer;
    monitorManager: MultiMonitorManager;
    windowManager: WindowFocusManager;
    visionBridge: VisionBridge;
    scheduler: ActionScheduler;
    auditor: MouseActionAuditor;
  }) {
    super();
    this.backend = config.backend;
    this.safetyGate = config.safetyGate;
    this.humanizer = config.humanizer;
    this.monitorManager = config.monitorManager;
    this.windowManager = config.windowManager;
    this.visionBridge = config.visionBridge;
    this.scheduler = config.scheduler;
    this.auditor = config.auditor;
  }

  /**
   * Initialize mouse control manager
   */
  async init(): Promise<void> {
    try {
      await this.backend.init();
      await this.monitorManager.init();
      await this.visionBridge.init();
      await this.auditor.init();
      
      this.isEnabled = true;
      logger.info('Mouse control manager initialized');
      this.emit('initialized');
    } catch (error) {
      logger.error('Failed to initialize mouse control manager', { error });
      throw error;
    }
  }

  /**
   * Enable mouse control
   */
  async enable(): Promise<void> {
    if (this.isEnabled) {
      return;
    }

    // Check permissions
    const hasPermission = await this.safetyGate.checkPermission('mouse-control');
    if (!hasPermission) {
      throw new Error('Mouse control permission denied');
    }

    this.isEnabled = true;
    this.emergencyStop = false;
    logger.info('Mouse control enabled');
    this.emit('enabled');
  }

  /**
   * Disable mouse control
   */
  async disable(): Promise<void> {
    this.isEnabled = false;
    this.emergencyStop = true;
    logger.info('Mouse control disabled');
    this.emit('disabled');
  }

  /**
   * Emergency stop - immediately halt all actions
   */
  async stopEmergency(): Promise<void> {
    this.emergencyStop = true;
    await this.scheduler.cancelAll();
    logger.warn('Emergency stop activated');
    this.emit('emergency-stop');
  }

  /**
   * Move mouse to absolute coordinates
   */
  async moveTo(x: number, y: number, options: MouseActionOptions = {}): Promise<void> {
    await this.checkEnabled();
    await this.checkEmergencyStop();

    // Normalize coordinates for multi-monitor/DPI
    const normalized = await this.monitorManager.normalizeCoordinates(x, y);
    
    // Check safety policy
    const allowed = await this.safetyGate.checkAction('move', {
      type: 'move',
      coordinates: normalized,
      ...options,
    });
    if (!allowed) {
      throw new Error('Move action denied by safety policy');
    }

    // Humanize movement
    const path = this.humanizer.generatePath(
      await this.getCurrentPosition(),
      normalized,
      options.humanize ?? 0.7
    );

    // Execute with audit
    const startTime = Date.now();
    try {
      for (const point of path) {
        await this.backend.moveTo(point.x, point.y);
        await this.humanizer.delay(10); // Small delay between path points
      }

      const duration = Date.now() - startTime;
      await this.auditor.recordAction({
        type: 'move',
        from: await this.getCurrentPosition(),
        to: normalized,
        duration,
        ...options,
      });

      this.emit('moved', { x: normalized.x, y: normalized.y });
    } catch (error) {
      await this.auditor.recordError('move', error, options);
      throw error;
    }
  }

  /**
   * Move mouse relative to current position
   */
  async moveRelative(dx: number, dy: number, options: MouseActionOptions = {}): Promise<void> {
    const current = await this.getCurrentPosition();
    await this.moveTo(current.x + dx, current.y + dy, options);
  }

  /**
   * Click mouse button
   */
  async click(button: MouseButton = 'left', options: MouseActionOptions = {}): Promise<void> {
    await this.checkEnabled();
    await this.checkEmergencyStop();

    // Check safety policy
    const allowed = await this.safetyGate.checkAction('click', {
      type: 'click',
      button,
      ...options,
    });
    if (!allowed) {
      throw new Error('Click action denied by safety policy');
    }

    const startTime = Date.now();
    try {
      await this.humanizer.delay(options.delay || 50);
      await this.backend.click(button);
      await this.humanizer.delay(50); // Natural delay after click

      const duration = Date.now() - startTime;
      await this.auditor.recordAction({
        type: 'click',
        button,
        position: await this.getCurrentPosition(),
        duration,
        ...options,
      });

      this.emit('clicked', { button });
    } catch (error) {
      await this.auditor.recordError('click', error, options);
      throw error;
    }
  }

  /**
   * Double click
   */
  async doubleClick(button: MouseButton = 'left', options: MouseActionOptions = {}): Promise<void> {
    await this.checkEnabled();
    await this.checkEmergencyStop();

    const allowed = await this.safetyGate.checkAction('double-click', {
      type: 'double-click',
      button,
      ...options,
    });
    if (!allowed) {
      throw new Error('Double-click action denied by safety policy');
    }

    const startTime = Date.now();
    try {
      await this.humanizer.delay(options.delay || 50);
      await this.backend.doubleClick(button);
      await this.humanizer.delay(100);

      const duration = Date.now() - startTime;
      await this.auditor.recordAction({
        type: 'double-click',
        button,
        position: await this.getCurrentPosition(),
        duration,
        ...options,
      });

      this.emit('double-clicked', { button });
    } catch (error) {
      await this.auditor.recordError('double-click', error, options);
      throw error;
    }
  }

  /**
   * Drag from start to end position
   */
  async drag(start: Point, end: Point, options: MouseActionOptions = {}): Promise<void> {
    await this.checkEnabled();
    await this.checkEmergencyStop();

    const normalizedStart = await this.monitorManager.normalizeCoordinates(start.x, start.y);
    const normalizedEnd = await this.monitorManager.normalizeCoordinates(end.x, end.y);

    const allowed = await this.safetyGate.checkAction('drag', {
      type: 'drag',
      from: normalizedStart,
      to: normalizedEnd,
      ...options,
    });
    if (!allowed) {
      throw new Error('Drag action denied by safety policy');
    }

    const startTime = Date.now();
    try {
      // Move to start
      await this.moveTo(normalizedStart.x, normalizedStart.y, options);
      
      // Press button
      await this.backend.mouseDown('left');
      await this.humanizer.delay(50);

      // Drag to end
      const path = this.humanizer.generatePath(normalizedStart, normalizedEnd, options.humanize ?? 0.7);
      for (const point of path) {
        await this.backend.moveTo(point.x, point.y);
        await this.humanizer.delay(10);
      }

      // Release button
      await this.humanizer.delay(50);
      await this.backend.mouseUp('left');

      const duration = Date.now() - startTime;
      await this.auditor.recordAction({
        type: 'drag',
        from: normalizedStart,
        to: normalizedEnd,
        duration,
        ...options,
      });

      this.emit('dragged', { from: normalizedStart, to: normalizedEnd });
    } catch (error) {
      await this.backend.mouseUp('left'); // Ensure button is released
      await this.auditor.recordError('drag', error, options);
      throw error;
    }
  }

  /**
   * Scroll mouse wheel
   */
  async scroll(amount: number, direction: 'up' | 'down' = 'down', options: MouseActionOptions = {}): Promise<void> {
    await this.checkEnabled();
    await this.checkEmergencyStop();

    const allowed = await this.safetyGate.checkAction('scroll', {
      type: 'scroll',
      amount,
      direction,
      ...options,
    });
    if (!allowed) {
      throw new Error('Scroll action denied by safety policy');
    }

    const startTime = Date.now();
    try {
      await this.backend.scroll(amount, direction);
      await this.humanizer.delay(100);

      const duration = Date.now() - startTime;
      await this.auditor.recordAction({
        type: 'scroll',
        amount,
        direction,
        duration,
        ...options,
      });

      this.emit('scrolled', { amount, direction });
    } catch (error) {
      await this.auditor.recordError('scroll', error, options);
      throw error;
    }
  }

  /**
   * Find element using vision and click it
   */
  async findAndClick(
    locator: string | Point,
    options: MouseActionOptions = {}
  ): Promise<Point> {
    await this.checkEnabled();
    await this.checkEmergencyStop();

    let target: Point;

    if (typeof locator === 'string') {
      // Use vision bridge to find element
      const result = await this.visionBridge.findElement(locator, {
        confidenceThreshold: options.confidenceThreshold ?? 0.8,
        timeout: options.timeout ?? 5000,
      });

      if (!result) {
        throw new Error(`Element not found: ${locator}`);
      }

      if (result.confidence < (options.confidenceThreshold ?? 0.8)) {
        throw new Error(`Low confidence: ${result.confidence} < ${options.confidenceThreshold ?? 0.8}`);
      }

      target = { x: result.x, y: result.y };
    } else {
      target = locator;
    }

    // Move to target and click
    await this.moveTo(target.x, target.y, options);
    await this.click('left', options);

    return target;
  }

  /**
   * Get current mouse position
   */
  async getCurrentPosition(): Promise<Point> {
    return this.backend.getPosition();
  }

  /**
   * Get all screens
   */
  async getScreens(): Promise<MouseControlScreenInfo[]> {
    return this.monitorManager.getScreens();
  }

  /**
   * Focus window by title/executable
   */
  async focusWindow(titleOrExecutable: string): Promise<void> {
    await this.windowManager.focusWindow(titleOrExecutable);
  }

  /**
   * Check if enabled
   */
  private async checkEnabled(): Promise<void> {
    if (!this.isEnabled) {
      throw new Error('Mouse control is not enabled');
    }
  }

  /**
   * Check emergency stop
   */
  private async checkEmergencyStop(): Promise<void> {
    if (this.emergencyStop) {
      throw new Error('Emergency stop is active');
    }
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    await this.disable();
    await this.backend.cleanup();
    await this.auditor.cleanup();
    logger.info('Mouse control manager cleanup completed');
  }
}

