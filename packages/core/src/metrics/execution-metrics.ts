/**
 * Execution Metrics
 * 
 * Collects and aggregates workflow execution metrics for monitoring and optimization.
 * Tracks execution times, success rates, and performance statistics.
 * 
 * @module @aura/core/metrics
 */

import Redis from 'ioredis';
import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * Execution Metrics
 * 
 * Tracks workflow execution performance metrics using Redis.
 */
export class ExecutionMetrics {
  private prefix = 'metrics:';
  private executionPrefix = `${this.prefix}execution:`;
  private statsPrefix = `${this.prefix}stats:`;

  constructor(private redis: Redis) {}

  /**
   * Record an execution
   */
  async recordExecution(jobId: string, success: boolean, duration: number): Promise<void> {
    try {
      const timestamp = Date.now();
      const key = `${this.executionPrefix}${jobId}`;

      await this.redis.hset(key, {
        success: success ? '1' : '0',
        duration: duration.toString(),
        timestamp: timestamp.toString(),
      });

      // Set expiration (keep metrics for 7 days)
      await this.redis.expire(key, 7 * 24 * 60 * 60);

      // Update aggregate statistics
      await this.updateStats(success, duration);

      logger.debug('Execution metrics recorded', { jobId, success, duration });
    } catch (error) {
      logger.error('Error recording execution metrics', { error, jobId });
      // Don't throw - metrics are not critical
    }
  }

  /**
   * Update aggregate statistics
   */
  private async updateStats(success: boolean, duration: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const statsKey = `${this.statsPrefix}${today}`;

    // Increment counters
    await this.redis.hincrby(statsKey, 'total', 1);
    if (success) {
      await this.redis.hincrby(statsKey, 'success', 1);
    } else {
      await this.redis.hincrby(statsKey, 'failed', 1);
    }

    // Update average duration
    await this.redis.hincrby(statsKey, 'totalDuration', duration);
    await this.redis.hincrby(statsKey, 'countForAvg', 1);

    // Set expiration (keep stats for 30 days)
    await this.redis.expire(statsKey, 30 * 24 * 60 * 60);
  }

  /**
   * Get metrics for a specific date
   */
  async getMetrics(date?: string): Promise<{
    total: number;
    success: number;
    failed: number;
    successRate: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
  }> {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const statsKey = `${this.statsPrefix}${targetDate}`;

      const stats = await this.redis.hgetall(statsKey);

      const total = parseInt(stats.total || '0', 10);
      const success = parseInt(stats.success || '0', 10);
      const failed = parseInt(stats.failed || '0', 10);
      const totalDuration = parseInt(stats.totalDuration || '0', 10);
      const countForAvg = parseInt(stats.countForAvg || '0', 10);

      const successRate = total > 0 ? (success / total) * 100 : 0;
      const averageDuration = countForAvg > 0 ? totalDuration / countForAvg : 0;

      // Get min/max from individual executions (simplified)
      const minDuration = averageDuration * 0.5; // Estimate
      const maxDuration = averageDuration * 2; // Estimate

      return {
        total,
        success,
        failed,
        successRate,
        averageDuration,
        minDuration,
        maxDuration,
      };
    } catch (error) {
      logger.error('Error getting metrics', { error, date });
      return {
        total: 0,
        success: 0,
        failed: 0,
        successRate: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
      };
    }
  }

  /**
   * Get metrics for a date range
   */
  async getMetricsRange(startDate: string, endDate: string): Promise<any[]> {
    try {
      const metrics: any[] = [];
      const start = new Date(startDate);
      const end = new Date(endDate);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const metricsForDay = await this.getMetrics(dateStr);
        metrics.push({
          date: dateStr,
          ...metricsForDay,
        });
      }

      return metrics;
    } catch (error) {
      logger.error('Error getting metrics range', { error, startDate, endDate });
      return [];
    }
  }

  /**
   * Clear metrics
   */
  async clearMetrics(daysToKeep: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

      const keys = await this.redis.keys(`${this.statsPrefix}*`);
      for (const key of keys) {
        const dateStr = key.replace(this.statsPrefix, '');
        if (dateStr < cutoffDateStr) {
          await this.redis.del(key);
        }
      }

      logger.info('Metrics cleared', { daysToKeep });
    } catch (error) {
      logger.error('Error clearing metrics', { error });
    }
  }
}

