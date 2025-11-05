import {
  Entity,
  Column,
  Unique,
  ManyToMany,
} from 'typeorm';
import { BaseEntity } from './base.entity.js';
import { Workflow } from './Workflow.js';

/**
 * Represents an integration or automation capability installable into AURA.
 */
@Entity({ name: 'plugins' })
@Unique(['name'])
export class Plugin extends BaseEntity {
  @Column({ length: 120 })
  name!: string;

  @Column({ length: 240 })
  description!: string;

  @Column({ name: 'version', length: 32 })
  version!: string;

  @Column({ name: 'author', length: 160, nullable: true })
  author?: string;

  @Column({ name: 'is_enabled', default: true })
  isEnabled!: boolean;

  @Column({ name: 'config_schema', type: 'simple-json', nullable: true })
  configSchema?: Record<string, unknown>;

  @ManyToMany(() => Workflow, workflow => workflow.plugins)
  workflows!: Workflow[];
}
