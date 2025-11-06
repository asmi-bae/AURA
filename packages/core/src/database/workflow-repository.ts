/**
 * Workflow Repository
 * 
 * TypeORM repository wrapper for workflow database operations.
 * Provides high-level methods for workflow CRUD operations with caching support.
 * 
 * @module @aura/core/database
 */

import { Repository, Connection } from 'typeorm';
import { Workflow } from '@aura/db';
import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * Workflow Repository
 * 
 * Handles all database operations for workflows using TypeORM.
 */
export class WorkflowRepository {
  private repository: Repository<Workflow>;

  constructor(private connection: Connection) {
    this.repository = this.connection.getRepository(Workflow);
  }

  /**
   * Find workflow by ID
   */
  async findById(id: string): Promise<Workflow | null> {
    try {
      return await this.repository.findOne({
        where: { id } as any,
        relations: ['owner'], // Include related entities if needed
      });
    } catch (error) {
      logger.error('Error finding workflow by ID', { error, id });
      throw error;
    }
  }

  /**
   * Find all workflows with pagination
   */
  async findAll(options: {
    page?: number;
    limit?: number;
    active?: boolean;
    userId?: string;
  }): Promise<{ workflows: Workflow[]; total: number }> {
    try {
      const { page = 1, limit = 20, active, userId } = options;
      const skip = (page - 1) * limit;

      const queryBuilder = this.repository.createQueryBuilder('workflow');

      if (active !== undefined) {
        queryBuilder.where('workflow.status = :status', { status: active ? 'active' : 'draft' });
      }

      if (userId) {
        queryBuilder.andWhere('workflow.createdBy = :userId', { userId });
      }

      const [workflows, total] = await queryBuilder
        .skip(skip)
        .take(limit)
        .orderBy('workflow.updatedAt', 'DESC')
        .getManyAndCount();

      return { workflows, total };
    } catch (error) {
      logger.error('Error finding workflows', { error, options });
      throw error;
    }
  }

  /**
   * Create a new workflow
   */
  async create(workflowData: Partial<Workflow>): Promise<Workflow> {
    try {
      const workflow = this.repository.create(workflowData);
      const saved = await this.repository.save(workflow);
      logger.info('Workflow created', { workflowId: saved.id });
      return saved;
    } catch (error) {
      logger.error('Error creating workflow', { error, workflowData });
      throw error;
    }
  }

  /**
   * Update workflow
   */
  async update(id: string, updates: Partial<Workflow>): Promise<Workflow> {
    try {
      await this.repository.update(id, {
        ...updates,
      } as any);
      const updated = await this.findById(id);
      if (!updated) {
        throw new Error(`Workflow ${id} not found`);
      }
      logger.info('Workflow updated', { workflowId: id });
      return updated;
    } catch (error) {
      logger.error('Error updating workflow', { error, id, updates });
      throw error;
    }
  }

  /**
   * Delete workflow
   */
  async delete(id: string): Promise<void> {
    try {
      await this.repository.delete(id);
      logger.info('Workflow deleted', { workflowId: id });
    } catch (error) {
      logger.error('Error deleting workflow', { error, id });
      throw error;
    }
  }

  /**
   * Activate workflow
   */
  async activate(id: string): Promise<Workflow> {
    return this.update(id, { status: 'active' });
  }

  /**
   * Deactivate workflow
   */
  async deactivate(id: string): Promise<Workflow> {
    return this.update(id, { status: 'draft' });
  }

  /**
   * Find active workflows
   */
  async findActive(): Promise<Workflow[]> {
    try {
      return await this.repository.find({
        where: { status: 'active' },
        order: { updatedAt: 'DESC' },
      });
    } catch (error) {
      logger.error('Error finding active workflows', { error });
      throw error;
    }
  }
}

