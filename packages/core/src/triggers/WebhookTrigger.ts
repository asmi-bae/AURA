/**
 * Webhook Trigger
 * 
 * Trigger workflows via webhook requests
 */

import { EventEmitter } from 'events';
import { createLogger } from '@aura/utils';

const logger = createLogger();

export interface WebhookTriggerConfig {
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  secret?: string;
  headers?: Record<string, string>;
}

export interface WebhookPayload {
  body: any;
  headers: Record<string, string>;
  query: Record<string, string>;
  params: Record<string, string>;
  method: string;
  path: string;
  timestamp: Date;
}

/**
 * Webhook Trigger
 */
export class WebhookTrigger extends EventEmitter {
  private config: Required<Omit<WebhookTriggerConfig, 'secret'>> & { secret?: string };
  private registeredWebhooks: Map<string, string> = new Map(); // webhookId -> workflowId

  constructor(config: WebhookTriggerConfig) {
    super();
    this.config = {
      method: config.method || 'POST',
      headers: config.headers || {},
      ...config,
    };
  }

  /**
   * Register a workflow for webhook
   */
  register(workflowId: string, webhookId?: string): string {
    const id = webhookId || `webhook_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    this.registeredWebhooks.set(id, workflowId);
    logger.info(`Webhook registered`, { webhookId: id, workflowId, path: this.config.path });
    this.emit('registered', id, workflowId);
    return id;
  }

  /**
   * Unregister a webhook
   */
  unregister(webhookId: string): void {
    if (this.registeredWebhooks.has(webhookId)) {
      const workflowId = this.registeredWebhooks.get(webhookId);
      this.registeredWebhooks.delete(webhookId);
      logger.info(`Webhook unregistered`, { webhookId, workflowId });
      this.emit('unregistered', webhookId);
    }
  }

  /**
   * Get workflow ID for webhook
   */
  getWorkflowId(webhookId: string): string | undefined {
    return this.registeredWebhooks.get(webhookId);
  }

  /**
   * Verify webhook signature (if secret is provided)
   */
  verifySignature(payload: string, signature: string): boolean {
    if (!this.config.secret) {
      return true; // No secret, skip verification
    }

    // Simple HMAC verification (can be enhanced)
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', this.config.secret)
      .update(payload)
      .digest('hex');

    return signature === expectedSignature;
  }

  /**
   * Handle webhook request
   */
  handle(payload: WebhookPayload): { webhookId: string; workflowId: string; payload: WebhookPayload } | null {
    // Find matching webhook
    for (const [webhookId, workflowId] of this.registeredWebhooks.entries()) {
      // Check if method matches
      if (payload.method !== this.config.method) {
        continue;
      }

      // Verify signature if secret is provided
      const signature = payload.headers['x-signature'] || payload.headers['x-hub-signature-256'];
      if (this.config.secret && signature) {
        const payloadString = typeof payload.body === 'string' 
          ? payload.body 
          : JSON.stringify(payload.body);
        
        if (!this.verifySignature(payloadString, signature)) {
          logger.warn(`Webhook signature verification failed`, { webhookId });
          continue;
        }
      }

      logger.info(`Webhook triggered`, { webhookId, workflowId });
      this.emit('triggered', webhookId, workflowId, payload);
      
      return {
        webhookId,
        workflowId,
        payload,
      };
    }

    return null;
  }

  /**
   * Get registered webhooks
   */
  getRegistered(): Map<string, string> {
    return new Map(this.registeredWebhooks);
  }
}
