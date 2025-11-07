/**
 * Email Channel
 * 
 * Email messaging channel
 */

import nodemailer, { Transporter } from 'nodemailer';
import { createLogger } from '@aura/utils';

const logger = createLogger();

export interface EmailChannelConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from?: string;
}

export interface EmailMessage {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
  }>;
}

/**
 * Email Channel
 */
export class EmailChannel {
  private transporter: Transporter;
  private config: EmailChannelConfig;

  constructor(config: EmailChannelConfig) {
    this.config = config;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
  }

  /**
   * Send email
   */
  async send(message: EmailMessage): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.config.from || this.config.auth.user,
        to: Array.isArray(message.to) ? message.to.join(', ') : message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        attachments: message.attachments,
      });

      logger.info('Email sent', { 
        to: message.to,
        subject: message.subject,
      });
    } catch (error) {
      logger.error('Failed to send email', { error, to: message.to });
      throw error;
    }
  }

  /**
   * Verify email configuration
   */
  async verify(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('Email configuration verified');
      return true;
    } catch (error) {
      logger.error('Email configuration verification failed', { error });
      return false;
    }
  }
}
