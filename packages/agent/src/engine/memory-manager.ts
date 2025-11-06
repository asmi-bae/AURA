/**
 * Memory Manager
 * 
 * Manages short-term episodic memory and long-term cache.
 * Stores events, context, and learned patterns.
 * 
 * @module @aura/agent/engine
 */

import { createLogger } from '@aura/utils';
import { LocalStorage } from '../storage/local-storage';

const logger = createLogger();

/**
 * Memory Manager configuration
 */
export interface MemoryManagerConfig {
  agentId: string;
  storage: LocalStorage;
  maxEpisodicMemory: number;
  maxLongTermMemory: number;
}

/**
 * Memory event
 */
export interface MemoryEvent {
  type: string;
  taskId?: string;
  workflowId?: string;
  result?: any;
  error?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Memory Manager
 * 
 * Manages agent memory and context.
 */
export class MemoryManager {
  private config: MemoryManagerConfig;
  private logger = createLogger();
  private episodicMemory: MemoryEvent[] = [];
  private longTermMemory: MemoryEvent[] = [];
  private memoryCache: Map<string, MemoryEvent[]> = new Map();
  private lastSaveTime = 0;
  private saveDebounceMs = 1000; // Save at most once per second

  constructor(config: MemoryManagerConfig) {
    this.config = config;
  }

  /**
   * Initialize the memory manager
   */
  async init(): Promise<void> {
    // Load from storage
    try {
      const episodic = await this.config.storage.get('memory:episodic');
      const longTerm = await this.config.storage.get('memory:longterm');
      
      if (episodic) {
        this.episodicMemory = episodic;
      }
      if (longTerm) {
        this.longTermMemory = longTerm;
      }
    } catch (error) {
      logger.warn('Failed to load memory from storage', { error });
    }

    logger.info('Memory manager initialized', {
      episodic: this.episodicMemory.length,
      longTerm: this.longTermMemory.length,
    });
  }

  /**
   * Record an event
   * Optimized with debounced saving and efficient array operations
   */
  async recordEvent(event: MemoryEvent): Promise<void> {
    // Add to episodic memory (use unshift for O(1) if we need recent-first)
    this.episodicMemory.push(event);
    
    // Trim if needed (keep only recent events)
    if (this.episodicMemory.length > this.config.maxEpisodicMemory) {
      this.episodicMemory = this.episodicMemory.slice(-this.config.maxEpisodicMemory);
    }

    // Add to long-term memory if significant
    if (this.isSignificantEvent(event)) {
      this.longTermMemory.push(event);
      
      // Trim if needed
      if (this.longTermMemory.length > this.config.maxLongTermMemory) {
        this.longTermMemory = this.longTermMemory.slice(-this.config.maxLongTermMemory);
      }
    }

    // Invalidate cache
    this.memoryCache.clear();

    // Debounced save to storage (save at most once per second)
    const now = Date.now();
    if (now - this.lastSaveTime > this.saveDebounceMs) {
      this.lastSaveTime = now;
      // Save asynchronously without blocking
      this.saveToStorage().catch(error => {
        logger.error('Failed to save memory to storage', { error });
      });
    }

    logger.debug('Event recorded', { type: event.type });
  }

  /**
   * Save memory to storage (async, non-blocking)
   */
  private async saveToStorage(): Promise<void> {
    try {
      // Save both in parallel
      await Promise.all([
        this.config.storage.set('memory:episodic', this.episodicMemory),
        this.config.storage.set('memory:longterm', this.longTermMemory),
      ]);
    } catch (error) {
      logger.error('Failed to save memory to storage', { error });
      throw error;
    }
  }

  /**
   * Get episodic memory (with caching)
   */
  getEpisodicMemory(limit?: number): MemoryEvent[] {
    const cacheKey = `episodic:${limit || 'all'}`;
    if (this.memoryCache.has(cacheKey)) {
      return this.memoryCache.get(cacheKey)!;
    }

    const memory = limit ? this.episodicMemory.slice(-limit) : this.episodicMemory;
    this.memoryCache.set(cacheKey, memory);
    return memory;
  }

  /**
   * Get long-term memory (with caching)
   */
  getLongTermMemory(limit?: number): MemoryEvent[] {
    const cacheKey = `longterm:${limit || 'all'}`;
    if (this.memoryCache.has(cacheKey)) {
      return this.memoryCache.get(cacheKey)!;
    }

    const memory = limit ? this.longTermMemory.slice(-limit) : this.longTermMemory;
    this.memoryCache.set(cacheKey, memory);
    return memory;
  }

  /**
   * Clear episodic memory
   */
  async clearEpisodicMemory(): Promise<void> {
    this.episodicMemory = [];
    await this.config.storage.set('memory:episodic', []);
    logger.info('Episodic memory cleared');
  }

  /**
   * Clear long-term memory
   */
  async clearLongTermMemory(): Promise<void> {
    this.longTermMemory = [];
    await this.config.storage.set('memory:longterm', []);
    logger.info('Long-term memory cleared');
  }

  /**
   * Check if event is significant
   */
  private isSignificantEvent(event: MemoryEvent): boolean {
    // Significant events: workflow completions, errors, user corrections
    return (
      event.type.includes('completed') ||
      event.type.includes('failed') ||
      event.type.includes('correction') ||
      event.type.includes('learned')
    );
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    // Save to storage
    try {
      await this.config.storage.set('memory:episodic', this.episodicMemory);
      await this.config.storage.set('memory:longterm', this.longTermMemory);
    } catch (error) {
      logger.error('Failed to save memory during cleanup', { error });
    }

    logger.info('Memory manager cleanup completed');
  }
}

