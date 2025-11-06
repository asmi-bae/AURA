/**
 * Action Scheduler / Executor
 * 
 * Queues actions, handles concurrency, and supports scheduled execution.
 * Integrates with queue service for distributed execution.
 * 
 * @module @aura/agent/capabilities/mouse-control
 */

import { EventEmitter } from 'events';
import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * Scheduled action
 */
export interface ScheduledAction {
  id: string;
  action: () => Promise<void>;
  scheduledAt: number;
  priority: number;
  retries: number;
  correlationId?: string;
}

/**
 * Action Scheduler
 * 
 * Manages action queue and execution.
 */
export class ActionScheduler extends EventEmitter {
  private queue: ScheduledAction[] = [];
  private executing: Set<string> = new Set();
  private isProcessing = false;
  private maxConcurrency = 1; // Mouse actions must be sequential
  private cancelled = new Set<string>();

  /**
   * Schedule action
   */
  async schedule(
    action: () => Promise<void>,
    options: {
      delay?: number;
      priority?: number;
      retries?: number;
      correlationId?: string;
    } = {}
  ): Promise<string> {
    const id = `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const scheduledAt = Date.now() + (options.delay || 0);

    const scheduledAction: ScheduledAction = {
      id,
      action,
      scheduledAt,
      priority: options.priority || 0,
      retries: options.retries || 0,
      correlationId: options.correlationId,
    };

    this.queue.push(scheduledAction);
    this.queue.sort((a, b) => {
      if (a.scheduledAt !== b.scheduledAt) {
        return a.scheduledAt - b.scheduledAt;
      }
      return b.priority - a.priority;
    });

    this.processQueue();

    return id;
  }

  /**
   * Cancel action
   */
  async cancel(actionId: string): Promise<void> {
    this.cancelled.add(actionId);
    this.queue = this.queue.filter(a => a.id !== actionId);
    logger.info('Action cancelled', { actionId });
  }

  /**
   * Cancel all actions
   */
  async cancelAll(): Promise<void> {
    const allIds = this.queue.map(a => a.id);
    for (const id of allIds) {
      this.cancelled.add(id);
    }
    this.queue = [];
    logger.info('All actions cancelled');
  }

  /**
   * Process queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.queue.length > 0 && this.executing.size < this.maxConcurrency) {
        const now = Date.now();
        const ready = this.queue.filter(a => a.scheduledAt <= now);

        if (ready.length === 0) {
          // Wait for next scheduled action
          const next = this.queue[0];
          if (next) {
            const delay = next.scheduledAt - now;
            await new Promise(resolve => setTimeout(resolve, Math.max(0, delay)));
            continue;
          }
          break;
        }

        // Execute ready actions (mouse actions are sequential, so only one at a time)
        const action = ready[0];
        this.queue = this.queue.filter(a => a.id !== action.id);

        if (this.cancelled.has(action.id)) {
          continue;
        }

        this.executing.add(action.id);
        this.executeAction(action).finally(() => {
          this.executing.delete(action.id);
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Execute action
   */
  private async executeAction(scheduledAction: ScheduledAction): Promise<void> {
    const { id, action, retries, correlationId } = scheduledAction;

    try {
      this.emit('action-started', { id, correlationId });
      await action();
      this.emit('action-completed', { id, correlationId });
    } catch (error) {
      logger.error('Action execution failed', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
        retries,
      });

      if (retries > 0 && !this.cancelled.has(id)) {
        // Retry with exponential backoff
        const delay = 1000 * Math.pow(2, scheduledAction.retries - retries);
        await new Promise(resolve => setTimeout(resolve, delay));

        scheduledAction.retries = retries - 1;
        scheduledAction.scheduledAt = Date.now();
        this.queue.push(scheduledAction);
        this.queue.sort((a, b) => a.scheduledAt - b.scheduledAt);
      } else {
        this.emit('action-failed', { id, correlationId, error });
      }
    }
  }

  /**
   * Get queue status
   */
  getStatus(): {
    queued: number;
    executing: number;
    cancelled: number;
  } {
    return {
      queued: this.queue.length,
      executing: this.executing.size,
      cancelled: this.cancelled.size,
    };
  }
}

