import {
  Entity,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  OneToMany,
  Index,
} from 'typeorm';
import { BaseEntity } from './base.entity.js';
import { User } from './User.js';
import { Plugin } from './Plugin.js';
import { Log } from './Log.js';

/**
 * Represents an automation workflow authored inside AURA. Stores the node
 * graph definition, execution metadata, and links to contributing plugins.
 */
@Entity({ name: 'workflows' })
@Index(['name', 'owner'])
export class Workflow extends BaseEntity {
  @Column({ length: 160 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @ManyToOne(() => User, user => user.workflows, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  owner!: User;

  @Column({ name: 'nodes', type: 'simple-json', nullable: true })
  nodes?: Record<string, unknown>;

  @Column({ name: 'connections', type: 'simple-json', nullable: true })
  connections?: Record<string, unknown>;

  @Column({ name: 'settings', type: 'simple-json', nullable: true })
  settings?: Record<string, unknown>;

  @Column({ name: 'status', default: 'draft' })
  status!: string;

  @ManyToMany(() => Plugin, plugin => plugin.workflows, {
    cascade: ['insert', 'update'],
  })
  @JoinTable({
    name: 'workflow_plugins',
    joinColumn: { name: 'workflow_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'plugin_id', referencedColumnName: 'id' },
  })
  plugins!: Plugin[];

  @OneToMany(() => Log, log => log.workflow)
  logs!: Log[];
}
