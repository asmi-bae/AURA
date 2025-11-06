/**
 * User Repository
 * 
 * Custom repository methods for User entity with optimized queries.
 * 
 * @module @aura/db/repositories
 */

import { BaseRepository } from './base.repository.js';
import { User } from '../entities/User.js';
import { FindOptionsWhere } from 'typeorm';

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super(User);
  }

  /**
   * Find user by email (with caching)
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({
      where: { email } as FindOptionsWhere<User>,
    });
  }

  /**
   * Find active users
   */
  async findActive(): Promise<User[]> {
    return this.find({
      where: { isActive: true } as FindOptionsWhere<User>,
    });
  }

  /**
   * Find users by role
   */
  async findByRole(role: string): Promise<User[]> {
    return this.find({
      where: { role } as FindOptionsWhere<User>,
    });
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    return user !== null;
  }

  /**
   * Activate user
   */
  async activate(id: number): Promise<void> {
    await this.update(id, { isActive: true } as any);
  }

  /**
   * Deactivate user
   */
  async deactivate(id: number): Promise<void> {
    await this.update(id, { isActive: false } as any);
  }
}

