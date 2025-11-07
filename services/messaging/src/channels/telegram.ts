/**
 * Telegram Channel
 * 
 * Telegram messaging channel
 */

import { Telegraf, Context } from 'telegraf';
import { createLogger } from '@aura/utils';
import { EventEmitter } from 'events';

const logger = createLogger();

export interface TelegramChannelConfig {
  token: string;
}

export interface TelegramMessage {
  id: string;
  chatId: number;
  userId: number;
  content: string;
  timestamp: Date;
}

/**
 * Telegram Channel
 */
export class TelegramChannel extends EventEmitter {
  private bot: Telegraf;
  private config: TelegramChannelConfig;
  private isConnected = false;

  constructor(config: TelegramChannelConfig) {
    super();
    this.config = config;
    this.bot = new Telegraf(config.token);
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.bot.on('text', (ctx: Context) => {
      if (!ctx.message || !ctx.chat) {
        logger.warn('Telegram message missing required fields', { ctx });
        return;
      }

      // Type guard for text messages
      const textMessage = 'text' in ctx.message ? ctx.message : null;
      if (!textMessage || typeof textMessage.text !== 'string') {
        return;
      }

      const message: TelegramMessage = {
        id: ctx.message.message_id.toString(),
        chatId: ctx.chat.id,
        userId: ctx.from?.id || 0,
        content: textMessage.text,
        timestamp: new Date(ctx.message.date * 1000),
      };

      this.emit('message', message);
    });

    this.bot.catch((err: any, ctx: Context) => {
      logger.error('Telegram bot error', { error: err, ctx });
      this.emit('error', err);
    });
  }

  /**
   * Connect to Telegram
   */
  async connect(): Promise<void> {
    try {
      await this.bot.launch();
      this.isConnected = true;
      logger.info('Telegram bot connected');
      this.emit('ready');
    } catch (error) {
      logger.error('Failed to connect to Telegram', { error });
      throw error;
    }
  }

  /**
   * Disconnect from Telegram
   */
  async disconnect(): Promise<void> {
    this.bot.stop();
    this.isConnected = false;
    logger.info('Telegram bot disconnected');
  }

  /**
   * Send message to chat
   */
  async sendToChat(chatId: number, message: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Telegram bot not connected');
    }

    try {
      await this.bot.telegram.sendMessage(chatId, message);
      logger.debug('Message sent to Telegram chat', { chatId });
    } catch (error) {
      logger.error('Failed to send message to Telegram chat', { chatId, error });
      throw error;
    }
  }

  /**
   * Setup command handler
   */
  command(command: string, handler: (ctx: Context) => void): void {
    this.bot.command(command, handler);
  }
}
