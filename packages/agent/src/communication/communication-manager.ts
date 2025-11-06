/**
 * Communication Manager
 * 
 * Manages secure communication with the gateway.
 * Handles WebSocket connections, message routing, and reconnection logic.
 * 
 * @module @aura/agent/communication
 */

import { EventEmitter } from 'events';
import { createLogger } from '@aura/utils';
import { io, Socket } from 'socket.io-client';
import { KeyPair } from '../security/security-manager';

const logger = createLogger();

/**
 * Communication Manager configuration
 */
export interface CommunicationManagerConfig {
  agentId: string;
  gatewayUrl: string;
  keypair: KeyPair;
  onMessage?: (message: any) => Promise<void>;
  onError?: (error: Error) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

/**
 * Communication Manager
 * 
 * Manages communication with the gateway.
 */
export class CommunicationManager extends EventEmitter {
  private config: CommunicationManagerConfig;
  private logger = createLogger();
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageQueue: Array<{ type: string; payload: any }> = [];
  private isProcessingQueue = false;
  private connectionPromise: Promise<void> | null = null;

  constructor(config: CommunicationManagerConfig) {
    super();
    this.config = config;
  }

  /**
   * Connect to gateway (with connection pooling and deduplication)
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      logger.warn('Already connected');
      return;
    }

    // If already connecting, wait for that promise
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this._connect();
    try {
      await this.connectionPromise;
    } finally {
      this.connectionPromise = null;
    }
  }

  /**
   * Internal connect implementation
   */
  private async _connect(): Promise<void> {
    try {
      this.socket = io(this.config.gatewayUrl, {
        auth: {
          agentId: this.config.agentId,
          publicKey: this.config.keypair.publicKey,
        },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: this.config.maxReconnectAttempts || 10,
        reconnectionDelay: this.config.reconnectInterval || 1000,
      });

      this.setupEventHandlers();

      await new Promise<void>((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('Socket not initialized'));
          return;
        }

        this.socket.on('connect', () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          logger.info('Connected to gateway', { agentId: this.config.agentId });
          
          // Process queued messages
          this.processMessageQueue().catch(error => {
            logger.error('Error processing message queue', { error });
          });
          
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          logger.error('Connection error', { error });
          reject(error);
        });
      });

      this.emit('connected', true);
    } catch (error) {
      logger.error('Failed to connect to gateway', { error });
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Disconnect from gateway
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected || !this.socket) {
      return;
    }

    try {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.emit('connected', false);
      logger.info('Disconnected from gateway');
    } catch (error) {
      logger.error('Error disconnecting from gateway', { error });
      throw error;
    }
  }

  /**
   * Send message to gateway (with queuing and batching)
   */
  async sendMessage(type: string, payload: any): Promise<void> {
    if (!this.isConnected || !this.socket) {
      // Queue message if not connected
      this.messageQueue.push({ type, payload });
      logger.debug('Message queued (not connected)', { type });
      
      // Try to reconnect if not already connecting
      if (!this.connectionPromise) {
        this.connect().catch(error => {
          logger.error('Failed to reconnect for queued message', { error });
        });
      }
      return;
    }

    try {
      this.socket.emit('message', {
        type,
        payload,
        timestamp: new Date().toISOString(),
      });

      logger.debug('Message sent to gateway', { type });
    } catch (error) {
      logger.error('Error sending message', { error, type });
      // Queue message on error
      this.messageQueue.push({ type, payload });
      throw error;
    }
  }

  /**
   * Process queued messages
   */
  private async processMessageQueue(): Promise<void> {
    if (this.isProcessingQueue || this.messageQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.messageQueue.length > 0 && this.isConnected && this.socket) {
        const message = this.messageQueue.shift();
        if (message) {
          await this.sendMessage(message.type, message.payload);
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) {
      return;
    }

    this.socket.on('message', async (message: any) => {
      if (this.config.onMessage) {
        await this.config.onMessage(message);
      }
      this.emit('message', message);
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      this.emit('connected', false);
      logger.warn('Disconnected from gateway');
    });

    this.socket.on('error', (error: Error) => {
      if (this.config.onError) {
        this.config.onError(error);
      }
      this.emit('error', error);
      logger.error('Socket error', { error });
    });
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    await this.disconnect();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    logger.info('Communication manager cleanup completed');
  }
}

