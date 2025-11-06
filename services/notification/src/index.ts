import express from 'express';
import { SlackNotifier } from './slack';
import { EmailNotifier } from './email';
import { SMSNotifier } from './sms';
import { PushNotifier } from './push';
import { createLogger } from '@aura/utils';

const logger = createLogger();
const app = express();
const port = process.env.PORT || 3004;

app.use(express.json());

// Initialize notifiers
const slackNotifier = new SlackNotifier(process.env.SLACK_TOKEN || '');
const emailNotifier = new EmailNotifier({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});
const smsNotifier = new SMSNotifier({
  accountSid: process.env.TWILIO_ACCOUNT_SID || '',
  authToken: process.env.TWILIO_AUTH_TOKEN || '',
  from: process.env.TWILIO_FROM || '',
});
const pushNotifier = new PushNotifier({
  serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT || '',
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'notification' });
});

// Send notification endpoint
app.post('/notifications/send', async (req, res) => {
  try {
    const { type, recipient, subject, message, options } = req.body;

    if (!type || !recipient || !message) {
      return res.status(400).json({ error: 'type, recipient, and message are required' });
    }

    let result;

    switch (type) {
      case 'slack':
        result = await slackNotifier.send(recipient, message, options);
        break;
      case 'email':
        result = await emailNotifier.send(recipient, subject || 'Notification', message, options);
        break;
      case 'sms':
        result = await smsNotifier.send(recipient, message);
        break;
      case 'push':
        result = await pushNotifier.send(recipient, subject || 'Notification', message, options);
        break;
      default:
        return res.status(400).json({ error: `Unknown notification type: ${type}` });
    }

    res.json({ success: true, result });
  } catch (error) {
    logger.error('Error sending notification', { error });
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Send bulk notifications
app.post('/notifications/send-bulk', async (req, res) => {
  try {
    const { notifications } = req.body;

    if (!Array.isArray(notifications)) {
      return res.status(400).json({ error: 'notifications must be an array' });
    }

    const results = await Promise.allSettled(
      notifications.map(async (notif: any) => {
        const { type, recipient, subject, message, options } = notif;
        switch (type) {
          case 'slack':
            return await slackNotifier.send(recipient, message, options);
          case 'email':
            return await emailNotifier.send(recipient, subject || 'Notification', message, options);
          case 'sms':
            return await smsNotifier.send(recipient, message);
          case 'push':
            return await pushNotifier.send(recipient, subject || 'Notification', message, options);
          default:
            throw new Error(`Unknown notification type: ${type}`);
        }
      })
    );

    res.json({ success: true, results });
  } catch (error) {
    logger.error('Error sending bulk notifications', { error });
    res.status(500).json({ error: 'Failed to send bulk notifications' });
  }
});

app.listen(port, () => {
  logger.info(`Notification service running on port ${port}`);
});

