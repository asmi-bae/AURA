import nodemailer from 'nodemailer';
import { createLogger } from '@aura/utils';

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export class EmailNotifier {
  private transporter: nodemailer.Transporter;
  private logger = createLogger();

  constructor(config: SMTPConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
  }

  async send(
    to: string | string[],
    subject: string,
    message: string,
    options?: {
      from?: string;
      html?: string;
      attachments?: Array<{
        filename?: string;
        content?: string | Buffer;
        path?: string;
        cid?: string;
        href?: string;
        contentType?: string;
        contentDisposition?: string;
        encoding?: string;
        raw?: string | Buffer;
      }>;
      cc?: string | string[];
      bcc?: string | string[];
    }
  ) {
    try {
      const result = await this.transporter.sendMail({
        from: options?.from || (this.transporter.options as any).auth?.user || 'noreply@aura.ai',
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        text: message,
        html: options?.html || message,
        attachments: options?.attachments as any,
        cc: options?.cc,
        bcc: options?.bcc,
      } as any);

      return { success: true, messageId: result.messageId };
    } catch (error) {
      this.logger.error('Error sending email', { error, to });
      throw error;
    }
  }

  async sendBulk(
    recipients: Array<{ to: string; subject: string; message: string; html?: string }>
  ) {
    const results = await Promise.allSettled(
      recipients.map(({ to, subject, message, html }) =>
        this.send(to, subject, message, { html })
      )
    );

    return results.map((result, index) => {
      const recipient = recipients[index];
      return {
        recipient: recipient?.to || 'unknown',
        success: result.status === 'fulfilled',
        error: result.status === 'rejected' ? result.reason : undefined,
      };
    });
  }
}

