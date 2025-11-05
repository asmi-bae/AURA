import {
  Entity,
  Column,
  ManyToOne,
  Index,
} from 'typeorm';
import { BaseEntity } from './base.entity.js';
import { User } from './User.js';

/**
 * Represents a persisted login session for an authenticated user.
 */
@Entity({ name: 'sessions' })
export class Session extends BaseEntity {
  @Index({ unique: true })
  @Column({ length: 255 })
  token!: string;

  @Column({ name: 'user_agent', length: 255, nullable: true })
  userAgent?: string;

  @Column({ name: 'ip_address', length: 64, nullable: true })
  ipAddress?: string;

  @Column({ name: 'expires_at', type: 'bigint' })
  expiresAt!: number;

  @ManyToOne(() => User, user => user.sessions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  user!: User;
}
