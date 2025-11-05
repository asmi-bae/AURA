import {
  Entity,
  Column,
  Index,
  OneToMany,
  Unique,
} from 'typeorm';
import { BaseEntity } from './base.entity.js';
import { Session } from './Session.js';
import { Workflow } from './Workflow.js';

/**
 * Represents an authenticated AURA account able to author workflows,
 * install plugins, and collaborate across the platform.
 */
@Entity({ name: 'users' })
@Unique(['email'])
export class User extends BaseEntity {
  @Column({ length: 120 })
  name!: string;

  @Index()
  @Column({ length: 160 })
  email!: string;

  @Column({ name: 'hashed_password', length: 255 })
  hashedPassword!: string;

  @Column({ name: 'role', default: 'user' })
  role!: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @OneToMany(() => Session, session => session.user)
  sessions!: Session[];

  @OneToMany(() => Workflow, workflow => workflow.owner)
  workflows!: Workflow[];
}
