/**
 * Workflow Repository
 * 
 * Custom repository methods for Workflow entity with optimized queries.
 * 
 * @module @aura/db/repositories
 */

import { BaseRepository } from './base.repository.js';
import { Workflow } from '../entities/Workflow.js';
import { FindOptionsWhere } from 'typeorm';

export class WorkflowRepository extends BaseRepository<Workflow> {
  constructor() {
    super(Workflow);
  }

  /**
   * Find workflows by owner
   */
  async findByOwner(ownerId: number): Promise<Workflow[]> {
    return this.find({
      where: { owner: { id: ownerId } } as FindOptionsWhere<Workflow>,
      relations: ['owner', 'plugins'],
    });
  }

  /**
   * Find workflows by status
   */
  async findByStatus(status: string): Promise<Workflow[]> {
    return this.find({
      where: { status } as FindOptionsWhere<Workflow>,
    });
  }

  /**
   * Find workflows by owner and status
   */
  async findByOwnerAndStatus(ownerId: number, status: string): Promise<Workflow[]> {
    return this.find({
      where: {
        owner: { id: ownerId },
        status,
      } as FindOptionsWhere<Workflow>,
      relations: ['owner'],
    });
  }

  /**
   * Find workflow by name and owner
   */
  async findByNameAndOwner(name: string, ownerId: number): Promise<Workflow | null> {
    return this.findOne({
      where: {
        name,
        owner: { id: ownerId },
      } as FindOptionsWhere<Workflow>,
      relations: ['owner', 'plugins'],
    });
  }

  /**
   * Update workflow status
   */
  async updateStatus(id: number, status: string): Promise<void> {
    await this.update(id, { status } as any);
  }
}

