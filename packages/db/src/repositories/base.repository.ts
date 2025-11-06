/**
 * Base Repository
 * 
 * Provides common repository methods with caching, transactions, and retry logic.
 * 
 * @module @aura/db/repositories
 */

import { Repository, EntityTarget, FindOptionsWhere, FindManyOptions, DeepPartial, SaveOptions } from 'typeorm';
import { AppDataSource } from '../datasource.js';

/**
 * Query result cache entry
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Base repository with enhanced features
 */
export class BaseRepository<T extends { id: number }> {
  protected repository: Repository<T>;
  private cache: Map<string, CacheEntry<T | T[]>> = new Map();
  private defaultCacheTTL = 30000; // 30 seconds
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  constructor(entity: EntityTarget<T>) {
    this.repository = AppDataSource.getRepository(entity);
  }

  /**
   * Find entities with caching
   */
  async find(options?: FindManyOptions<T>): Promise<T[]> {
    const cacheKey = this.getCacheKey('find', options);
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as T[];
    }

    // Execute query with retry
    const result = await this.withRetry(() => this.repository.find(options || {}));
    
    // Cache result
    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
      ttl: this.defaultCacheTTL,
    });

    return result;
  }

  /**
   * Find one entity with caching
   */
  async findOne(options: FindManyOptions<T>): Promise<T | null> {
    const cacheKey = this.getCacheKey('findOne', options);
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as T;
    }

    // Execute query with retry
    const result = await this.withRetry(() => this.repository.findOne(options));
    
    // Cache result
    if (result) {
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        ttl: this.defaultCacheTTL,
      });
    }

    return result;
  }

  /**
   * Find by ID with caching
   */
  async findById(id: number): Promise<T | null> {
    return this.findOne({ where: { id } as FindOptionsWhere<T> });
  }

  /**
   * Save entity with transaction support
   */
  async save(entity: DeepPartial<T>, options?: SaveOptions): Promise<T> {
    return this.withRetry(async () => {
      return this.repository.save(entity, options);
    });
  }

  /**
   * Save multiple entities in a transaction
   */
  async saveMany(entities: DeepPartial<T>[], options?: SaveOptions): Promise<T[]> {
    return this.withTransaction(async (manager) => {
      return manager.save(this.repository.target, entities, options);
    });
  }

  /**
   * Delete entity (hard delete)
   */
  async delete(id: number): Promise<void> {
    await this.withRetry(async () => {
      await this.repository.delete(id);
      this.invalidateCache();
    });
  }

  /**
   * Delete multiple entities
   */
  async deleteMany(ids: number[]): Promise<void> {
    await this.withTransaction(async (manager) => {
      await manager.delete(this.repository.target, ids);
      this.invalidateCache();
    });
  }

  /**
   * Update entity
   */
  async update(id: number, partial: DeepPartial<T>): Promise<void> {
    await this.withRetry(async () => {
      await this.repository.update(id, partial as any);
      this.invalidateCache();
    });
  }

  /**
   * Count entities
   */
  async count(options?: FindManyOptions<T>): Promise<number> {
    return this.withRetry(() => this.repository.count(options || {}));
  }

  /**
   * Execute query with retry logic
   */
  protected async withRetry<TResult>(
    operation: () => Promise<TResult>,
    retries = this.maxRetries
  ): Promise<TResult> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * (attempt + 1)));
        }
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }

  /**
   * Execute operation in a transaction
   */
  protected async withTransaction<TResult>(
    operation: (manager: any) => Promise<TResult>
  ): Promise<TResult> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await operation(queryRunner.manager);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Check if error is non-retryable
   */
  protected isNonRetryableError(error: any): boolean {
    // Don't retry on validation errors, constraint violations, etc.
    const nonRetryableMessages = [
      'violates unique constraint',
      'violates foreign key constraint',
      'not null constraint',
      'validation failed',
    ];

    const errorMessage = error?.message?.toLowerCase() || '';
    return nonRetryableMessages.some(msg => errorMessage.includes(msg));
  }

  /**
   * Get cache key for query
   */
  protected getCacheKey(operation: string, options?: any): string {
    return `${operation}:${JSON.stringify(options || {})}`;
  }

  /**
   * Invalidate cache
   */
  protected invalidateCache(): void {
    this.cache.clear();
  }

  /**
   * Invalidate cache for specific pattern
   */
  protected invalidateCachePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get raw repository for advanced queries
   */
  getRawRepository(): Repository<T> {
    return this.repository;
  }
}

