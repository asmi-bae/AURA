import twilio from 'twilio';
import { createLogger } from '@aura/utils';

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  from: string;
}

export class SMSNotifier {
  private client: twilio.Twilio;
  private from: string;
  private logger = createLogger();

  constructor(config: TwilioConfig) {
    this.client = twilio(config.accountSid, config.authToken);
    this.from = config.from;
  }

  async send(to: string, message: string) {
    try {
      const result = await this.client.messages.create({
        body: message,
        from: this.from,
        to,
      });

      return { success: true, sid: result.sid, status: result.status };
    } catch (error) {
      this.logger.error('Error sending SMS', { error, to });
      throw error;
    }
  }

  async sendBulk(recipients: Array<{ to: string; message: string }>) {
    const results = await Promise.allSettled(
      recipients.map(({ to, message }) => this.send(to, message))
    );

    return results.map((result, index) => ({
      recipient: recipients[index].to,
      success: result.status === 'fulfilled',
      error: result.status === 'rejected' ? result.reason : undefined,
    }));
  }
}

