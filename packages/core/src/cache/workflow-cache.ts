/**
 * Workflow Cache
 * 
 * Redis-based caching layer for workflows to improve performance.
 * Reduces database load by caching frequently accessed workflows.
 * 
 * @module @aura/core/cache
 */

import Redis from 'ioredis';
import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * Workflow Cache
 * 
 * Provides caching functionality for workflows using Redis.
 */
export class WorkflowCache {
  private prefix = 'workflow:';
  private defaultTTL: number;

  constructor(
    private redis: Redis,
    defaultTTL: number = 300 // 5 minutes default
  ) {
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get workflow from cache
   */
  async get(workflowId: string): Promise<any | null> {
    try {
      const key = `${this.prefix}${workflowId}`;
      const cached = await this.redis.get(key);
      
      if (cached) {
        logger.debug('Workflow cache hit', { workflowId });
        return JSON.parse(cached);
      }

      logger.debug('Workflow cache miss', { workflowId });
      return null;
    } catch (error) {
      logger.error('Error getting workflow from cache', { error, workflowId });
      return null; // Return null on error to allow fallback to DB
    }
  }

  /**
   * Set workflow in cache
   */
  async set(workflowId: string, workflow: any, ttl?: number): Promise<void> {
    try {
      const key = `${this.prefix}${workflowId}`;
      const ttlSeconds = ttl || this.defaultTTL;
      
      await this.redis.setex(
        key,
        ttlSeconds,
        JSON.stringify(workflow)
      );

      logger.debug('Workflow cached', { workflowId, ttl: ttlSeconds });
    } catch (error) {
      logger.error('Error setting workflow in cache', { error, workflowId });
      // Don't throw - caching is not critical
    }
  }

  /**
   * Delete workflow from cache
   */
  async delete(workflowId: string): Promise<void> {
    try {
      const key = `${this.prefix}${workflowId}`;
      await this.redis.del(key);
      logger.debug('Workflow removed from cache', { workflowId });
    } catch (error) {
      logger.error('Error deleting workflow from cache', { error, workflowId });
    }
  }

  /**
   * Clear all cached workflows
   */
  async clear(): Promise<void> {
    try {
      const keys = await this.redis.keys(`${this.prefix}*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.info('Workflow cache cleared', { count: keys.length });
      }
    } catch (error) {
      logger.error('Error clearing workflow cache', { error });
    }
  }

  /**
   * Invalidate cache for multiple workflows
   */
  async invalidate(workflowIds: string[]): Promise<void> {
    try {
      const keys = workflowIds.map(id => `${this.prefix}${id}`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.debug('Workflows invalidated from cache', { count: keys.length });
      }
    } catch (error) {
      logger.error('Error invalidating workflows from cache', { error });
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    keys: number;
    memory: string;
  }> {
    try {
      const keys = await this.redis.keys(`${this.prefix}*`);
      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memory = memoryMatch ? memoryMatch[1].trim() : 'unknown';

      return {
        keys: keys.length,
        memory,
      };
    } catch (error) {
      logger.error('Error getting cache stats', { error });
      return { keys: 0, memory: 'unknown' };
    }
  }
}

