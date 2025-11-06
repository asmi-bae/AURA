/**
 * Recording Storage
 * 
 * Manages storage and retrieval of recorded mouse sequences.
 * Supports saving/loading recordings and converting to/from JSON.
 * 
 * @module @aura/agent/capabilities/mouse-control
 */

import { createLogger } from '@aura/utils';
import { LocalStorage } from '../../../storage/local-storage';
import { RecordingSession } from './recorder.js';

const logger = createLogger();

/**
 * Recording Storage
 * 
 * Manages storage of recorded sequences.
 */
export class RecordingStorage {
  private storage: LocalStorage;
  private recordings: Map<string, RecordingSession> = new Map();

  constructor(storage: LocalStorage) {
    this.storage = storage;
  }

  /**
   * Initialize storage
   */
  async init(): Promise<void> {
    try {
      const stored = await this.storage.get('mouse-recordings');
      if (stored && Array.isArray(stored)) {
        for (const session of stored) {
          this.recordings.set(session.id, session);
        }
      }
      logger.info('Recording storage initialized', {
        recordingCount: this.recordings.size,
      });
    } catch (error) {
      logger.warn('Failed to load recordings', { error });
    }
  }

  /**
   * Save recording
   */
  async save(session: RecordingSession): Promise<void> {
    this.recordings.set(session.id, session);
    await this.persist();
    logger.info('Recording saved', { sessionId: session.id, name: session.name });
  }

  /**
   * Load recording by ID
   */
  async load(sessionId: string): Promise<RecordingSession | null> {
    const session = this.recordings.get(sessionId);
    if (session) {
      return { ...session };
    }
    return null;
  }

  /**
   * Load all recordings
   */
  async loadAll(): Promise<RecordingSession[]> {
    return Array.from(this.recordings.values()).map(s => ({ ...s }));
  }

  /**
   * Delete recording
   */
  async delete(sessionId: string): Promise<void> {
    this.recordings.delete(sessionId);
    await this.persist();
    logger.info('Recording deleted', { sessionId });
  }

  /**
   * Export recording to JSON
   */
  exportToJSON(session: RecordingSession): string {
    return JSON.stringify(session, null, 2);
  }

  /**
   * Import recording from JSON
   */
  importFromJSON(json: string): RecordingSession {
    const session = JSON.parse(json) as RecordingSession;
    
    // Validate session structure
    if (!session.id || !session.actions || !Array.isArray(session.actions)) {
      throw new Error('Invalid recording format');
    }

    return session;
  }

  /**
   * Search recordings
   */
  search(query: {
    name?: string;
    startTime?: { from?: number; to?: number };
    minActions?: number;
    maxActions?: number;
  }): RecordingSession[] {
    let results = Array.from(this.recordings.values());

    if (query.name) {
      const nameLower = query.name.toLowerCase();
      results = results.filter(s => s.name.toLowerCase().includes(nameLower));
    }

    if (query.startTime) {
      if (query.startTime.from !== undefined) {
        results = results.filter(s => s.startTime >= query.startTime!.from!);
      }
      if (query.startTime.to !== undefined) {
        results = results.filter(s => s.startTime <= query.startTime!.to!);
      }
    }

    if (query.minActions !== undefined) {
      results = results.filter(s => s.actions.length >= query.minActions!);
    }

    if (query.maxActions !== undefined) {
      results = results.filter(s => s.actions.length <= query.maxActions!);
    }

    return results.map(s => ({ ...s }));
  }

  /**
   * Get recording statistics
   */
  getStatistics(): {
    totalRecordings: number;
    totalActions: number;
    averageActions: number;
    totalDuration: number;
    averageDuration: number;
  } {
    const recordings = Array.from(this.recordings.values());
    const totalRecordings = recordings.length;
    const totalActions = recordings.reduce((sum, s) => sum + s.actions.length, 0);
    const averageActions = totalRecordings > 0 ? totalActions / totalRecordings : 0;
    
    const totalDuration = recordings.reduce((sum, s) => {
      const duration = (s.endTime || Date.now()) - s.startTime;
      return sum + duration;
    }, 0);
    const averageDuration = totalRecordings > 0 ? totalDuration / totalRecordings : 0;

    return {
      totalRecordings,
      totalActions,
      averageActions,
      totalDuration,
      averageDuration,
    };
  }

  /**
   * Persist recordings to storage
   */
  private async persist(): Promise<void> {
    try {
      const recordings = Array.from(this.recordings.values());
      await this.storage.set('mouse-recordings', recordings);
    } catch (error) {
      logger.error('Failed to persist recordings', { error });
      throw error;
    }
  }

  /**
   * Clear all recordings
   */
  async clear(): Promise<void> {
    this.recordings.clear();
    await this.persist();
    logger.info('All recordings cleared');
  }
}

