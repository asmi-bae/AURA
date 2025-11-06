/**
 * Dynamic Query Builder
 * 
 * Provides a fluent, type-safe query builder for common database operations.
 * Supports dynamic filtering, sorting, pagination, and eager loading.
 * 
 * @module @aura/db/query-builder
 */

import { Repository, SelectQueryBuilder, FindOptionsWhere, FindManyOptions } from 'typeorm';
import { BaseEntity } from '../entities/base.entity.js';

/**
 * Query options
 */
export interface QueryOptions<T> {
  where?: FindOptionsWhere<T> | FindOptionsWhere<T>[];
  relations?: string[];
  order?: { [key: string]: 'ASC' | 'DESC' };
  skip?: number;
  take?: number;
  select?: (keyof T)[];
  cache?: boolean | number; // Cache TTL in milliseconds
}

/**
 * Pagination result
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Dynamic Query Builder
 */
export class DynamicQueryBuilder<T extends BaseEntity> {
  private repository: Repository<T>;
  private queryBuilder: SelectQueryBuilder<T>;

  constructor(repository: Repository<T>) {
    this.repository = repository;
    this.queryBuilder = repository.createQueryBuilder();
  }

  /**
   * Add where conditions dynamically
   */
  where(conditions: FindOptionsWhere<T> | FindOptionsWhere<T>[]): this {
    if (Array.isArray(conditions)) {
      this.queryBuilder = this.queryBuilder.andWhere(
        conditions.map((cond, index) => {
          const alias = `condition${index}`;
          return this.buildWhereCondition(cond, alias);
        }).join(' AND ')
      );
    } else {
      this.queryBuilder = this.queryBuilder.where(conditions);
    }
    return this;
  }

  /**
   * Add relation joins
   */
  relations(relations: string[]): this {
    for (const relation of relations) {
      this.queryBuilder = this.queryBuilder.leftJoinAndSelect(
        `${this.queryBuilder.alias}.${relation}`,
        relation
      );
    }
    return this;
  }

  /**
   * Add ordering
   */
  orderBy(field: keyof T, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.queryBuilder = this.queryBuilder.orderBy(
      `${this.queryBuilder.alias}.${String(field)}`,
      direction
    );
    return this;
  }

  /**
   * Add multiple orderings
   */
  orderByMultiple(order: { [key: string]: 'ASC' | 'DESC' }): this {
    for (const [field, direction] of Object.entries(order)) {
      this.orderBy(field as keyof T, direction);
    }
    return this;
  }

  /**
   * Add pagination
   */
  paginate(page: number = 1, pageSize: number = 10): this {
    const skip = (page - 1) * pageSize;
    this.queryBuilder = this.queryBuilder.skip(skip).take(pageSize);
    return this;
  }

  /**
   * Add select fields
   */
  select(fields: (keyof T)[]): this {
    const selectFields = fields.map(field => `${this.queryBuilder.alias}.${String(field)}`);
    this.queryBuilder = this.queryBuilder.select(selectFields);
    return this;
  }

  /**
   * Exclude soft deleted records
   */
  excludeDeleted(): this {
    this.queryBuilder = this.queryBuilder.andWhere(
      `${this.queryBuilder.alias}.deletedAt IS NULL`
    );
    return this;
  }

  /**
   * Include soft deleted records
   */
  includeDeleted(): this {
    // No filter needed - will include all
    return this;
  }

  /**
   * Only soft deleted records
   */
  onlyDeleted(): this {
    this.queryBuilder = this.queryBuilder.andWhere(
      `${this.queryBuilder.alias}.deletedAt IS NOT NULL`
    );
    return this;
  }

  /**
   * Execute query and get results
   */
  async getMany(): Promise<T[]> {
    return this.queryBuilder.getMany();
  }

  /**
   * Execute query and get one result
   */
  async getOne(): Promise<T | null> {
    return this.queryBuilder.getOne();
  }

  /**
   * Execute query and get count
   */
  async getCount(): Promise<number> {
    return this.queryBuilder.getCount();
  }

  /**
   * Execute query with pagination
   */
  async getManyAndCount(): Promise<[T[], number]> {
    return this.queryBuilder.getManyAndCount();
  }

  /**
   * Execute paginated query
   */
  async getPaginated(page: number = 1, pageSize: number = 10): Promise<PaginatedResult<T>> {
    const [data, total] = await this.paginate(page, pageSize).getManyAndCount();
    const totalPages = Math.ceil(total / pageSize);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Build where condition from object
   */
  private buildWhereCondition(condition: FindOptionsWhere<T>, alias: string): string {
    const conditions: string[] = [];
    for (const [key, value] of Object.entries(condition)) {
      if (value !== undefined && value !== null) {
        conditions.push(`${alias}.${key} = :${key}`);
      }
    }
    return conditions.join(' AND ');
  }

  /**
   * Get raw query builder for advanced queries
   */
  getQueryBuilder(): SelectQueryBuilder<T> {
    return this.queryBuilder;
  }

  /**
   * Reset query builder
   */
  reset(): this {
    this.queryBuilder = this.repository.createQueryBuilder();
    return this;
  }
}

