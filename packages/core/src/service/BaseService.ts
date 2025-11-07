/**
 * Base Service
 * 
 * Base class for all services in AURA
 */

import { EventEmitter } from 'events';
import { createLogger } from '@aura/utils';
import { Lifecycle, LifecycleState } from './Lifecycle';

export interface ServiceConfig {
  name: string;
  version?: string;
  dependencies?: string[];
  autoStart?: boolean;
}

/**
 * Base Service Class
 */
export abstract class BaseService extends EventEmitter {
  protected logger = createLogger();
  protected lifecycle: Lifecycle;
  protected config: ServiceConfig;
  protected isInitialized = false;
  protected isRunning = false;

  constructor(config: ServiceConfig) {
    super();
    this.config = {
      version: '0.0.1',
      dependencies: [],
      autoStart: false,
      ...config,
    };
    this.lifecycle = new Lifecycle(this.config.name);
    
    this.setupLifecycleListeners();
  }

  /**
   * Setup lifecycle event listeners
   */
  private setupLifecycleListeners(): void {
    this.lifecycle.on('stateChange', (state: LifecycleState) => {
      this.logger.info(`Service ${this.config.name} state changed`, { state });
      this.emit('stateChange', state);
    });

    this.lifecycle.on('error', (error: Error) => {
      this.logger.error(`Service ${this.config.name} error`, { error });
      this.emit('error', error);
    });
  }

  /**
   * Initialize service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn(`Service ${this.config.name} already initialized`);
      return;
    }

    try {
      this.lifecycle.transitionTo('initializing');
      await this.onInitialize();
      this.isInitialized = true;
      this.lifecycle.transitionTo('initialized');
      this.logger.info(`Service ${this.config.name} initialized`);
    } catch (error) {
      this.lifecycle.transitionTo('error', error as Error);
      throw error;
    }
  }

  /**
   * Start service
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.isRunning) {
      this.logger.warn(`Service ${this.config.name} already running`);
      return;
    }

    try {
      this.lifecycle.transitionTo('starting');
      await this.onStart();
      this.isRunning = true;
      this.lifecycle.transitionTo('running');
      this.logger.info(`Service ${this.config.name} started`);
    } catch (error) {
      this.lifecycle.transitionTo('error', error as Error);
      throw error;
    }
  }

  /**
   * Stop service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn(`Service ${this.config.name} not running`);
      return;
    }

    try {
      this.lifecycle.transitionTo('stopping');
      await this.onStop();
      this.isRunning = false;
      this.lifecycle.transitionTo('stopped');
      this.logger.info(`Service ${this.config.name} stopped`);
    } catch (error) {
      this.lifecycle.transitionTo('error', error as Error);
      throw error;
    }
  }

  /**
   * Get service state
   */
  getState(): LifecycleState {
    return this.lifecycle.getState();
  }

  /**
   * Get service name
   */
  getName(): string {
    return this.config.name;
  }

  /**
   * Get service version
   */
  getVersion(): string {
    return this.config.version || '0.0.1';
  }

  /**
   * Check if service is healthy
   */
  async healthCheck(): Promise<{ healthy: boolean; details?: any }> {
    try {
      const health = await this.onHealthCheck();
      return { healthy: true, details: health };
    } catch (error) {
      return {
        healthy: false,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Override in subclass: Initialize service
   */
  protected async onInitialize(): Promise<void> {
    // Override in subclass
  }

  /**
   * Override in subclass: Start service
   */
  protected async onStart(): Promise<void> {
    // Override in subclass
  }

  /**
   * Override in subclass: Stop service
   */
  protected async onStop(): Promise<void> {
    // Override in subclass
  }

  /**
   * Override in subclass: Health check
   */
  protected async onHealthCheck(): Promise<any> {
    return {};
  }
}
