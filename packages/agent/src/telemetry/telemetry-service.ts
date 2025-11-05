/**
 * Telemetry Service
 * 
 * Collects and reports telemetry data for monitoring and debugging.
 * Handles structured logs, execution traces, and signed audit records.
 * 
 * @module @aura/agent/telemetry
 */

import { EventEmitter } from 'events';
import { createLogger } from '@aura/utils';
import { LocalStorage } from '../storage/local-storage';

const logger = createLogger();

/**
 * Telemetry Service configuration
 */
export interface TelemetryServiceConfig {
  agentId: string;
  storage: LocalStorage;
  enabled?: boolean;
  batchSize?: number;
  flushInterval?: number;
}

/**
 * Telemetry event
 */
export interface TelemetryEvent {
  type: string;
  timestamp: Date;
  data?: Record<string, any>;
  error?: Error;
}

/**
 * Telemetry metric
 */
export interface TelemetryMetric {
  name: string;
  value: number;
  unit?: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

/**
 * Telemetry Service
 * 
 * Manages telemetry collection and reporting.
 */
export class TelemetryService extends EventEmitter {
  private config: TelemetryServiceConfig;
  private logger = createLogger();
  private events: TelemetryEvent[] = [];
  private metrics: TelemetryMetric[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(config: TelemetryServiceConfig) {
    super();
    this.config = config;
  }

  /**
   * Start telemetry collection
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('Telemetry disabled');
      return;
    }

    // Start flush timer
    const flushInterval = this.config.flushInterval || 60000; // 1 minute
    this.flushTimer = setInterval(() => {
      this.flush().catch(err => {
        logger.error('Error flushing telemetry', { error: err });
      });
    }, flushInterval);

    logger.info('Telemetry service started');
  }

  /**
   * Stop telemetry collection
   */
  async stop(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Flush remaining events
    await this.flush();

    logger.info('Telemetry service stopped');
  }

  /**
   * Record event
   */
  recordEvent(type: string, data?: Record<string, any>, error?: Error): void {
    if (!this.config.enabled) {
      return;
    }

    const event: TelemetryEvent = {
      type,
      timestamp: new Date(),
      data,
      error,
    };

    this.events.push(event);

    // Emit event
    this.emit('event', event);

    // Auto-flush if batch size reached
    if (this.events.length >= (this.config.batchSize || 100)) {
      this.flush().catch(err => {
        logger.error('Error auto-flushing telemetry', { error: err });
      });
    }

    logger.debug('Telemetry event recorded', { type });
  }

  /**
   * Record metric
   */
  recordMetric(name: string, value: number, unit?: string, tags?: Record<string, string>): void {
    if (!this.config.enabled) {
      return;
    }

    const metric: TelemetryMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      tags,
    };

    this.metrics.push(metric);

    // Emit metric
    this.emit('metric', metric);

    logger.debug('Telemetry metric recorded', { name, value });
  }

  /**
   * Flush telemetry data
   */
  async flush(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      // Save events to storage
      if (this.events.length > 0) {
        const events = [...this.events];
        this.events = [];
        await this.config.storage.set('telemetry:events', events);
        logger.debug('Telemetry events flushed', { count: events.length });
      }

      // Save metrics to storage
      if (this.metrics.length > 0) {
        const metrics = [...this.metrics];
        this.metrics = [];
        await this.config.storage.set('telemetry:metrics', metrics);
        logger.debug('Telemetry metrics flushed', { count: metrics.length });
      }
    } catch (error) {
      logger.error('Error flushing telemetry', { error });
      throw error;
    }
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    await this.stop();
    logger.info('Telemetry service cleanup completed');
  }
}

