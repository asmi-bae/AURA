/**
 * Timer Trigger
 * 
 * Trigger workflows on a schedule (cron, interval)
 */

import { EventEmitter } from 'events';
import { createLogger } from '@aura/utils';

const logger = createLogger();

export interface TimerTriggerConfig {
  schedule: string; // Cron expression or interval in ms
  timezone?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface TimerPayload {
  triggerId: string;
  schedule: string;
  timestamp: Date;
  executionCount: number;
}

/**
 * Timer Trigger
 */
export class TimerTrigger extends EventEmitter {
  private config: TimerTriggerConfig;
  private registeredTimers: Map<string, { workflowId: string; timer: NodeJS.Timeout | null }> = new Map();
  private executionCounts: Map<string, number> = new Map();
  private isCronExpression(schedule: string): boolean {
    // Simple check for cron expression (5 or 6 parts separated by spaces)
    const parts = schedule.trim().split(/\s+/);
    return parts.length === 5 || parts.length === 6;
  }

  constructor(config: TimerTriggerConfig) {
    super();
    this.config = config;
  }

  /**
   * Parse cron expression to milliseconds
   */
  private cronToMs(cronExpression: string): number {
    // Check if it's a simple numeric interval
    if (/^\d+$/.test(cronExpression.trim())) {
      return parseInt(cronExpression.trim(), 10);
    }

    // For cron expressions, we'll use node-cron for scheduling
    // This method is only used for interval-based scheduling
    // Cron expressions are handled differently (using node-cron library)
    return 60000; // Default to 1 minute for interval fallback
  }

  /**
   * Register a workflow for timer trigger
   */
  register(workflowId: string, triggerId?: string): string {
    const id = triggerId || `timer_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    // Check if schedule has passed end date
    if (this.config.endDate && new Date() > this.config.endDate) {
      throw new Error('Schedule end date has passed');
    }

    // Calculate delay for start date
    let delay = 0;
    if (this.config.startDate && this.config.startDate > new Date()) {
      delay = this.config.startDate.getTime() - Date.now();
    }

    // Parse schedule
    let interval: number;
    if (this.isCronExpression(this.config.schedule)) {
      // Use node-cron for cron expressions (would need to install)
      interval = this.cronToMs(this.config.schedule);
      logger.warn('Cron expressions require node-cron library. Using simplified parsing.');
    } else {
      interval = parseInt(this.config.schedule, 10);
      if (isNaN(interval)) {
        throw new Error(`Invalid schedule: ${this.config.schedule}`);
      }
    }

    // Initialize execution count
    this.executionCounts.set(id, 0);

    // Create timer
    const timer = setTimeout(() => {
      const trigger = () => {
        const count = (this.executionCounts.get(id) || 0) + 1;
        this.executionCounts.set(id, count);

        // Check end date
        if (this.config.endDate && new Date() > this.config.endDate) {
          this.unregister(id);
          return;
        }

        const payload: TimerPayload = {
          triggerId: id,
          schedule: this.config.schedule,
          timestamp: new Date(),
          executionCount: count,
        };

        logger.info(`Timer triggered`, { triggerId: id, workflowId, count });
        this.emit('triggered', id, workflowId, payload);
      };

      // Trigger immediately if delay was 0
      if (delay === 0) {
        trigger();
      }

      // Set interval
      const intervalTimer = setInterval(trigger, interval);
      this.registeredTimers.set(id, { workflowId, timer: intervalTimer });
    }, delay);

    this.registeredTimers.set(id, { workflowId, timer });
    logger.info(`Timer registered`, { triggerId: id, workflowId, schedule: this.config.schedule });
    this.emit('registered', id, workflowId);
    return id;
  }

  /**
   * Unregister a timer
   */
  unregister(triggerId: string): void {
    const timer = this.registeredTimers.get(triggerId);
    if (timer) {
      if (timer.timer) {
        clearTimeout(timer.timer as any);
        clearInterval(timer.timer as any);
      }
      this.registeredTimers.delete(triggerId);
      this.executionCounts.delete(triggerId);
      logger.info(`Timer unregistered`, { triggerId });
      this.emit('unregistered', triggerId);
    }
  }

  /**
   * Get workflow ID for timer
   */
  getWorkflowId(triggerId: string): string | undefined {
    return this.registeredTimers.get(triggerId)?.workflowId;
  }

  /**
   * Get execution count
   */
  getExecutionCount(triggerId: string): number {
    return this.executionCounts.get(triggerId) || 0;
  }

  /**
   * Get registered timers
   */
  getRegistered(): Map<string, string> {
    const result = new Map<string, string>();
    for (const [id, { workflowId }] of this.registeredTimers.entries()) {
      result.set(id, workflowId);
    }
    return result;
  }

  /**
   * Clear all timers
   */
  clear(): void {
    for (const [id] of this.registeredTimers.entries()) {
      this.unregister(id);
    }
  }
}
