/**
 * Mouse Action Auditor
 * 
 * Records all mouse actions for audit trail and telemetry.
 * Stores encrypted logs locally with optional upload to gateway.
 * 
 * @module @aura/agent/capabilities/mouse-control
 */

import { createLogger } from '@aura/utils';
import { MouseActionOptions, Point } from '../mouse-control-manager.js';
import { LocalStorage } from '../../../storage/local-storage';

const logger = createLogger();

/**
 * Action record
 */
export interface ActionRecord {
  id: string;
  type: string;
  timestamp: number;
  position?: Point;
  from?: Point;
  to?: Point;
  button?: string;
  amount?: number;
  direction?: string;
  duration: number;
  success: boolean;
  error?: string;
  workflowId?: string;
  userId?: string;
  correlationId?: string;
  screenshot?: Buffer;
}

/**
 * Mouse Action Auditor
 * 
 * Records and audits all mouse actions.
 */
export class MouseActionAuditor {
  private storage: LocalStorage;
  private records: ActionRecord[] = [];
  private maxRecords = 1000;
  private isInitialized = false;

  constructor(storage: LocalStorage) {
    this.storage = storage;
  }

  /**
   * Initialize auditor
   */
  async init(): Promise<void> {
    // Load existing records
    try {
      const stored = await this.storage.get('mouse-action-records');
      if (stored && Array.isArray(stored)) {
        this.records = stored.slice(-this.maxRecords);
      }
    } catch (error) {
      logger.warn('Failed to load action records', { error });
    }

    this.isInitialized = true;
    logger.info('Mouse action auditor initialized', {
      recordCount: this.records.length,
    });
  }

  /**
   * Record action
   */
  async recordAction(data: {
    type: string;
    position?: Point;
    from?: Point;
    to?: Point;
    button?: string;
    amount?: number;
    direction?: string;
    duration: number;
    [key: string]: any;
  } & MouseActionOptions): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    const record: ActionRecord = {
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: data.type,
      timestamp: Date.now(),
      position: data.position,
      from: data.from,
      to: data.to,
      button: data.button,
      amount: data.amount,
      direction: data.direction,
      duration: data.duration,
      success: true,
      workflowId: data.workflowId,
      userId: data.userId,
      correlationId: data.correlationId,
    };

    this.records.push(record);

    // Trim records if needed
    if (this.records.length > this.maxRecords) {
      this.records = this.records.slice(-this.maxRecords);
    }

    // Save to storage (async, non-blocking)
    this.saveRecords().catch(error => {
      logger.error('Failed to save action records', { error });
    });

    logger.debug('Action recorded', {
      type: record.type,
      duration: record.duration,
    });
  }

  /**
   * Record error
   */
  async recordError(
    type: string,
    error: any,
    options: MouseActionOptions = {}
  ): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    const record: ActionRecord = {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: Date.now(),
      duration: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      workflowId: options.workflowId,
      userId: options.userId,
      correlationId: options.correlationId,
    };

    this.records.push(record);

    // Trim records if needed
    if (this.records.length > this.maxRecords) {
      this.records = this.records.slice(-this.maxRecords);
    }

    // Save to storage
    this.saveRecords().catch(err => {
      logger.error('Failed to save error record', { error: err });
    });

    logger.warn('Action error recorded', {
      type: record.type,
      error: record.error,
    });
  }

  /**
   * Get action records
   */
  getRecords(limit?: number): ActionRecord[] {
    const records = [...this.records];
    return limit ? records.slice(-limit) : records;
  }

  /**
   * Get records by workflow
   */
  getRecordsByWorkflow(workflowId: string): ActionRecord[] {
    return this.records.filter(r => r.workflowId === workflowId);
  }

  /**
   * Get records by correlation ID
   */
  getRecordsByCorrelation(correlationId: string): ActionRecord[] {
    return this.records.filter(r => r.correlationId === correlationId);
  }

  /**
   * Clear records
   */
  async clearRecords(): Promise<void> {
    this.records = [];
    await this.storage.set('mouse-action-records', []);
    logger.info('Action records cleared');
  }

  /**
   * Save records to storage
   */
  private async saveRecords(): Promise<void> {
    try {
      await this.storage.set('mouse-action-records', this.records);
    } catch (error) {
      logger.error('Failed to save action records', { error });
      throw error;
    }
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    // Save records before cleanup
    await this.saveRecords();
    this.isInitialized = false;
    logger.info('Mouse action auditor cleanup completed');
  }
}

