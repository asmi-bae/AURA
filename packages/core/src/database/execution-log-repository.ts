/**
 * Execution Log Repository
 * 
 * TypeORM repository wrapper for workflow execution log operations.
 * Provides methods for tracking and querying workflow executions.
 * 
 * @module @aura/core/database
 */

import { Repository, Connection } from 'typeorm';
import { Log } from '@aura/db';
import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * Execution Log Repository
 * 
 * Handles all database operations for workflow execution logs.
 */
export class ExecutionLogRepository {
  private repository: Repository<Log>;

  constructor(private connection: Connection) {
    this.repository = this.connection.getRepository(Log);
  }

  /**
   * Create execution log entry
   */
  async create(logData: Partial<Log>): Promise<Log> {
    try {
      const log = this.repository.create({
        ...logData,
      });
      const saved = await this.repository.save(log);
      logger.debug('Execution log created', { logId: saved.id });
      return saved;
    } catch (error) {
      logger.error('Error creating execution log', { error, logData });
      throw error;
    }
  }

  /**
   * Update execution log
   */
  async update(id: string, updates: Partial<Log>): Promise<Log> {
    try {
      await this.repository.update(id, updates as any);
      const updated = await this.repository.findOne({ where: { id } as any });
      if (!updated) {
        throw new Error(`Execution log ${id} not found`);
      }
      return updated;
    } catch (error) {
      logger.error('Error updating execution log', { error, id, updates });
      throw error;
    }
  }

  /**
   * Find execution logs by workflow ID
   */
  async findByWorkflowId(
    workflowId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<Log[]> {
    try {
      const { limit = 50, offset = 0 } = options;
      return await this.repository.find({
        where: { workflow: { id: workflowId } } as any,
        take: limit,
        skip: offset,
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      logger.error('Error finding execution logs by workflow', { error, workflowId });
      throw error;
    }
  }

  /**
   * Find execution logs by execution ID
   */
  async findByExecutionId(executionId: string): Promise<Log[]> {
    try {
      // Log entity doesn't have executionId, use metadata instead
      return await this.repository.find({
        where: { metadata: { executionId } } as any,
        order: { createdAt: 'ASC' },
      });
    } catch (error) {
      logger.error('Error finding execution logs by execution', { error, executionId });
      throw error;
    }
  }

  /**
   * Get execution statistics
   */
  async getStatistics(workflowId: string): Promise<{
    total: number;
    success: number;
    failed: number;
    averageDuration: number;
  }> {
    try {
      const logs = await this.repository.find({
        where: { workflow: { id: workflowId } } as any,
      });

      const total = logs.length;
      const success = logs.filter((log: Log) => log.level === 'info').length;
      const failed = logs.filter((log: Log) => log.level === 'error').length;
      
      // Calculate average duration from logs with duration data
      const durations = logs
        .map((log: Log) => (log.metadata as any)?.duration)
        .filter((d: any): d is number => typeof d === 'number');
      
      const averageDuration = durations.length > 0
        ? durations.reduce((a: number, b: number) => a + b, 0) / durations.length
        : 0;

      return {
        total,
        success,
        failed,
        averageDuration,
      };
    } catch (error) {
      logger.error('Error getting execution statistics', { error, workflowId });
      throw error;
    }
  }
}

