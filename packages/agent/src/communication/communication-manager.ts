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

  constructor(config: CommunicationManagerConfig) {
    super();
    this.config = config;
  }

  /**
   * Connect to gateway
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      logger.warn('Already connected');
      return;
    }

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
   * Send message to gateway
   */
  async sendMessage(type: string, payload: any): Promise<void> {
    if (!this.isConnected || !this.socket) {
      throw new Error('Not connected to gateway');
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
      throw error;
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

