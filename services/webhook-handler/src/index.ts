import express from 'express';
import crypto from 'crypto';
import { AuraWorkflowEngine } from '@aura/core';
import { initializeDataSource } from '@aura/db';
import { createLogger } from '@aura/utils';
import Redis from 'ioredis';

const logger = createLogger();
const app = express();
const port = process.env.PORT || 3002;

app.use(express.json({ verify: (req, res, buf) => {
  (req as any).rawBody = buf;
}}));

// Initialize Redis connection
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD,
});

// Initialize workflow engine
const workflowEngine = new AuraWorkflowEngine(redis);

// Initialize database
await initializeDataSource();

// Start worker
await workflowEngine.startWorker();

// Webhook registry
interface WebhookConfig {
  id: string;
  path: string;
  workflowId: string;
  secret?: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
}

const webhookRegistry = new Map<string, WebhookConfig>();

// Verify webhook signature
function verifySignature(
  signature: string,
  secret: string,
  body: Buffer
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body);
  const expectedSignature = hmac.digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'webhook-handler' });
});

// Register webhook endpoint
app.post('/webhooks/register', async (req, res) => {
  try {
    const { path, workflowId, secret, method = 'POST' }: WebhookConfig = req.body;

    if (!path || !workflowId) {
      return res.status(400).json({ error: 'path and workflowId are required' });
    }

    const id = crypto.randomUUID();
    const webhookConfig: WebhookConfig = {
      id,
      path: path.startsWith('/') ? path : `/${path}`,
      workflowId,
      secret,
      method,
    };

    webhookRegistry.set(id, webhookConfig);

    // Create dynamic route
    const webhookPath = `/webhook${webhookConfig.path}`;
    app[method.toLowerCase()](webhookPath, async (req, res) => {
      try {
        // Verify signature if secret is provided
        if (webhookConfig.secret) {
          const signature = req.headers['x-signature'] as string;
          if (!signature || !verifySignature(signature, webhookConfig.secret, (req as any).rawBody)) {
            return res.status(401).json({ error: 'Invalid signature' });
          }
        }

        // Trigger workflow execution
        await workflowEngine.executeWorkflow({
          id: webhookConfig.workflowId,
          trigger: {
            type: 'webhook',
            data: {
              method: req.method,
              headers: req.headers,
              body: req.body,
              query: req.query,
              params: req.params,
            },
          },
        });

        res.json({ success: true, message: 'Webhook received and workflow triggered' });
      } catch (error) {
        logger.error('Error processing webhook', { error, webhookId: id });
        res.status(500).json({ error: 'Failed to process webhook' });
      }
    });

    res.json({
      success: true,
      webhook: {
        id,
        url: `http://localhost:${port}${webhookPath}`,
        path: webhookPath,
      },
    });
  } catch (error) {
    logger.error('Error registering webhook', { error });
    res.status(500).json({ error: 'Failed to register webhook' });
  }
});

// List webhooks endpoint
app.get('/webhooks', (req, res) => {
  const webhooks = Array.from(webhookRegistry.values()).map(w => ({
    id: w.id,
    path: w.path,
    workflowId: w.workflowId,
    method: w.method,
  }));
  res.json({ webhooks });
});

// Delete webhook endpoint
app.delete('/webhooks/:id', (req, res) => {
  const { id } = req.params;
  if (webhookRegistry.has(id)) {
    webhookRegistry.delete(id);
    res.json({ success: true, message: 'Webhook deleted' });
  } else {
    res.status(404).json({ error: 'Webhook not found' });
  }
});

app.listen(port, () => {
  logger.info(`Webhook handler service running on port ${port}`);
});

