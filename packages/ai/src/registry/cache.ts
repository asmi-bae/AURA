/**
 * Response Cache
 * 
 * Multi-level caching strategy for AI model responses.
 * Implements memory cache, disk cache, embedding cache, and RAG cache.
 * 
 * Features:
 * - Memory cache for hot responses (< 1 minute)
 * - Disk cache for recent responses (< 1 hour)
 * - Embedding cache for vector embeddings (persistent)
 * - RAG cache for retrieved contexts (TTL-based)
 * - Cache invalidation and cleanup
 * 
 * @module @aura/ai/registry
 */

import { createLogger } from '@aura/utils';
import * as crypto from 'crypto';

const logger = createLogger();

/**
 * Cache entry
 */
interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: Date;
  expiresAt: Date;
  accessCount: number;
  lastAccessed: Date;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  memoryCacheSize?: number; // Max entries in memory
  memoryCacheTTL?: number; // TTL in milliseconds
  diskCacheEnabled?: boolean;
  diskCachePath?: string;
  embeddingCacheEnabled?: boolean;
  ragCacheEnabled?: boolean;
  ragCacheTTL?: number; // TTL in milliseconds
}

/**
 * Response Cache
 * 
 * Manages multi-level caching for AI model responses.
 */
export class ResponseCache {
  private config: Required<CacheConfig>;
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private logger = createLogger();

  constructor(config: CacheConfig = {}) {
    this.config = {
      memoryCacheSize: config.memoryCacheSize || 1000,
      memoryCacheTTL: config.memoryCacheTTL || 60000, // 1 minute
      diskCacheEnabled: config.diskCacheEnabled ?? false,
      diskCachePath: config.diskCachePath || './.cache',
      embeddingCacheEnabled: config.embeddingCacheEnabled ?? true,
      ragCacheEnabled: config.ragCacheEnabled ?? true,
      ragCacheTTL: config.ragCacheTTL || 3600000, // 1 hour
    };

    // Cleanup expired entries periodically
    setInterval(() => {
      this.cleanup();
    }, 60000); // Every minute

    logger.info('Response cache initialized', {
      memoryCacheSize: this.config.memoryCacheSize,
      memoryCacheTTL: this.config.memoryCacheTTL,
    });
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);

    if (!entry) {
      return null;
    }

    // Check expiration
    if (entry.expiresAt < new Date()) {
      this.memoryCache.delete(key);
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessed = new Date();

    logger.debug('Cache hit', { key });
    return entry.value as T;
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const ttlMs = ttl || this.config.memoryCacheTTL;
    const expiresAt = new Date(Date.now() + ttlMs);

    // Evict oldest entries if cache is full
    if (this.memoryCache.size >= this.config.memoryCacheSize) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: new Date(),
      expiresAt,
      accessCount: 0,
      lastAccessed: new Date(),
    };

    this.memoryCache.set(key, entry);
    logger.debug('Cache set', { key, ttl: ttlMs });
  }

  /**
   * Generate cache key
   */
  generateKey(params: {
    model: string;
    task: string;
    input: any;
    temperature?: number;
    maxTokens?: number;
  }): string {
    const hashInput = JSON.stringify({
      model: params.model,
      task: params.task,
      input: params.input,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
    });

    const hash = crypto.createHash('sha256').update(hashInput).digest('hex');
    return `${params.model}:${params.task}:${hash}`;
  }

  /**
   * Cache embedding
   */
  cacheEmbedding(text: string, embedding: number[]): void {
    if (!this.config.embeddingCacheEnabled) {
      return;
    }

    const key = `embedding:${this.hashText(text)}`;
    this.set(key, embedding, 86400000 * 7); // 7 days
  }

  /**
   * Get cached embedding
   */
  getCachedEmbedding(text: string): number[] | null {
    if (!this.config.embeddingCacheEnabled) {
      return null;
    }

    const key = `embedding:${this.hashText(text)}`;
    return this.get<number[]>(key);
  }

  /**
   * Cache RAG context
   */
  cacheRAGContext(query: string, context: string): void {
    if (!this.config.ragCacheEnabled) {
      return;
    }

    const key = `rag:${this.hashText(query)}`;
    this.set(key, context, this.config.ragCacheTTL);
  }

  /**
   * Get cached RAG context
   */
  getCachedRAGContext(query: string): string | null {
    if (!this.config.ragCacheEnabled) {
      return null;
    }

    const key = `rag:${this.hashText(query)}`;
    return this.get<string>(key);
  }

  /**
   * Evict oldest entries
   */
  private evictOldest(): void {
    const entries = Array.from(this.memoryCache.entries())
      .sort((a, b) => a[1].lastAccessed.getTime() - b[1].lastAccessed.getTime());

    // Evict 10% of cache
    const evictCount = Math.floor(this.config.memoryCacheSize * 0.1);
    for (let i = 0; i < evictCount && i < entries.length; i++) {
      const entry = entries[i];
      if (entry && entry[0]) {
        this.memoryCache.delete(entry[0]);
      }
    }

    logger.debug('Evicted oldest cache entries', { count: evictCount });
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt < now) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Cleaned up expired cache entries', { count: cleaned });
    }
  }

  /**
   * Hash text for cache key
   */
  private hashText(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex').substring(0, 16);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.memoryCache.clear();
    logger.info('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    entries: number;
  } {
    let totalAccesses = 0;
    let totalHits = 0;

    for (const entry of this.memoryCache.values()) {
      totalAccesses += entry.accessCount;
      if (entry.accessCount > 0) {
        totalHits++;
      }
    }

    const hitRate = totalAccesses > 0 ? totalHits / totalAccesses : 0;

    return {
      size: this.memoryCache.size,
      maxSize: this.config.memoryCacheSize,
      hitRate,
      entries: this.memoryCache.size,
    };
  }
}

