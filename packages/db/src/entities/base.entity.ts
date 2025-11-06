/**
 * Common fields shared by all entities in the AURA data model.
 * Provides an auto-incrementing identifier along with audit timestamps.
 * Enhanced with soft delete and audit trail support.
 */
import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Column,
} from 'typeorm';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  /**
   * Soft delete support - records are not physically deleted
   */
  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;

  /**
   * Audit trail - who created this record
   */
  @Column({ name: 'created_by', nullable: true, type: 'integer' })
  createdBy?: number;

  /**
   * Audit trail - who last updated this record
   */
  @Column({ name: 'updated_by', nullable: true, type: 'integer' })
  updatedBy?: number;

  /**
   * Check if entity is soft deleted
   */
  isDeleted(): boolean {
    return this.deletedAt !== null && this.deletedAt !== undefined;
  }
}
