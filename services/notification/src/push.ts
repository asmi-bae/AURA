import admin from 'firebase-admin';
import { createLogger } from '@aura/utils';

export interface FirebaseConfig {
  serviceAccountPath?: string;
  serviceAccount?: any;
}

export class PushNotifier {
  private app: admin.app.App;
  private logger = createLogger();

  constructor(config: FirebaseConfig) {
    if (config.serviceAccountPath) {
      this.app = admin.initializeApp({
        credential: admin.credential.cert(config.serviceAccountPath),
      });
    } else if (config.serviceAccount) {
      this.app = admin.initializeApp({
        credential: admin.credential.cert(config.serviceAccount),
      });
    } else {
      // Use default credentials (e.g., from environment)
      this.app = admin.initializeApp();
    }
  }

  async send(
    token: string | string[],
    title: string,
    body: string,
    options?: {
      data?: Record<string, string>;
      sound?: string;
      badge?: number;
      priority?: 'high' | 'normal';
    }
  ) {
    try {
      const tokens = Array.isArray(token) ? token : [token];
      const message: admin.messaging.MulticastMessage = {
        notification: {
          title,
          body,
        },
        data: options?.data,
        apns: {
          payload: {
            aps: {
              sound: options?.sound || 'default',
              badge: options?.badge,
            },
          },
        },
        android: {
          priority: options?.priority || 'normal',
        },
        tokens,
      };

      const result = await this.app.messaging().sendEachForMulticast(message);

      return {
        success: result.failureCount === 0,
        successCount: result.successCount,
        failureCount: result.failureCount,
        responses: result.responses,
      };
    } catch (error) {
      this.logger.error('Error sending push notification', { error });
      throw error;
    }
  }

  async sendToTopic(
    topic: string,
    title: string,
    body: string,
    options?: {
      data?: Record<string, string>;
      sound?: string;
      badge?: number;
    }
  ) {
    try {
      const message: admin.messaging.Message = {
        notification: {
          title,
          body,
        },
        data: options?.data,
        apns: {
          payload: {
            aps: {
              sound: options?.sound || 'default',
              badge: options?.badge,
            },
          },
        },
        topic,
      };

      const result = await this.app.messaging().send(message);

      return { success: true, messageId: result };
    } catch (error) {
      this.logger.error('Error sending push notification to topic', { error, topic });
      throw error;
    }
  }
}

