import {
  Entity,
  Column,
  ManyToOne,
  Index,
} from 'typeorm';
import { BaseEntity } from './base.entity.js';
import { Workflow } from './Workflow.js';

/**
 * Captures individual workflow execution events and diagnostic information.
 */
@Entity({ name: 'logs' })
@Index(['workflow', 'createdAt'])
export class Log extends BaseEntity {
  @Column({ length: 16 })
  level!: 'info' | 'warn' | 'error';

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: Record<string, unknown>;

  @ManyToOne(() => Workflow, workflow => workflow.logs, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  workflow!: Workflow;
}
