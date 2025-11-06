import { createLogger } from '@aura/utils';
import * as crypto from 'crypto';

const logger = createLogger();

export interface Session {
  id: string;
  userId: string;
  tokenId: string; // JWT jti
  accessToken: string;
  refreshToken: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
  revoked: boolean;
}

export interface SessionStore {
  save(session: Session): Promise<void>;
  findById(sessionId: string): Promise<Session | null>;
  findByTokenId(tokenId: string): Promise<Session | null>;
  findByUserId(userId: string): Promise<Session[]>;
  revoke(sessionId: string): Promise<void>;
  revokeAll(userId: string, excludeSessionId?: string): Promise<void>;
  deleteExpired(): Promise<void>;
}

export class InMemorySessionStore implements SessionStore {
  private sessions: Map<string, Session> = new Map();

  async save(session: Session): Promise<void> {
    this.sessions.set(session.id, session);
  }

  async findById(sessionId: string): Promise<Session | null> {
    return this.sessions.get(sessionId) || null;
  }

  async findByTokenId(tokenId: string): Promise<Session | null> {
    for (const session of this.sessions.values()) {
      if (session.tokenId === tokenId && !session.revoked) {
        return session;
      }
    }
    return null;
  }

  async findByUserId(userId: string): Promise<Session[]> {
    const userSessions: Session[] = [];
    for (const session of this.sessions.values()) {
      if (session.userId === userId && !session.revoked) {
        userSessions.push(session);
      }
    }
    return userSessions;
  }

  async revoke(sessionId: string): Promise<void> {
    const session = await this.findById(sessionId);
    if (session) {
      session.revoked = true;
      this.sessions.set(sessionId, session);
    }
  }

  async revokeAll(userId: string, excludeSessionId?: string): Promise<void> {
    for (const [id, session] of this.sessions.entries()) {
      if (session.userId === userId && id !== excludeSessionId) {
        session.revoked = true;
        this.sessions.set(id, session);
      }
    }
  }

  async deleteExpired(): Promise<void> {
    const now = new Date();
    for (const [id, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(id);
      }
    }
  }
}

export class SessionService {
  private store: SessionStore;
  private sessionDuration: number = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor(store?: SessionStore) {
    this.store = store || new InMemorySessionStore();
    
    // Clean up expired sessions periodically
    setInterval(() => {
      this.store.deleteExpired().catch(err => {
        logger.error('Error deleting expired sessions', { error: err });
      });
    }, 60 * 60 * 1000); // Every hour
  }

  async createSession(
    userId: string,
    tokenId: string,
    accessToken: string,
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<Session> {
    const now = new Date();
    const session: Session = {
      id: crypto.randomUUID(),
      userId,
      tokenId,
      accessToken,
      refreshToken,
      ipAddress,
      userAgent,
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.sessionDuration),
      lastActivityAt: now,
      revoked: false,
    };

    await this.store.save(session);
    logger.info('Session created', { sessionId: session.id, userId });
    return session;
  }

  async getSession(sessionId: string): Promise<Session | null> {
    const session = await this.store.findById(sessionId);
    if (session && session.expiresAt > new Date() && !session.revoked) {
      return session;
    }
    return null;
  }

  async getSessionByTokenId(tokenId: string): Promise<Session | null> {
    return this.store.findByTokenId(tokenId);
  }

  async updateActivity(sessionId: string): Promise<void> {
    const session = await this.store.findById(sessionId);
    if (session) {
      session.lastActivityAt = new Date();
      await this.store.save(session);
    }
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.store.revoke(sessionId);
    logger.info('Session revoked', { sessionId });
  }

  async revokeAllSessions(userId: string, excludeSessionId?: string): Promise<void> {
    await this.store.revokeAll(userId, excludeSessionId);
    logger.info('All sessions revoked for user', { userId, excludeSessionId });
  }

  async getUserSessions(userId: string): Promise<Session[]> {
    return this.store.findByUserId(userId);
  }
}

