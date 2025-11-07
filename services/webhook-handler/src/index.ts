import express from 'express';
import crypto from 'crypto';
import { AuraWorkflowEngine, ServiceRegistration } from '@aura/core';
import { initializeDataSource } from '@aura/db';
import { createLogger } from '@aura/utils';
import Redis from 'ioredis';

const logger = createLogger();
const app = express();
const port = process.env.PORT || 3002;

app.use(express.json({ verify: (req, res, buf) => {
  (req as any).rawBody = buf;
}}));

// Service registration
const serviceRegistration = new ServiceRegistration({
  id: 'webhook-handler-service',
  name: 'Webhook Handler Service',
  version: '1.0.0',
  url: `http://${process.env.SERVICE_HOST || 'localhost'}:${port}`,
  metadata: {
    description: 'Webhook receiver and processor service',
  },
});

// Initialize Redis connection
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD,
});

// Initialize workflow engine
const workflowEngine = new AuraWorkflowEngine({
  redisConnection: redis,
  enableCache: true,
  enableMetrics: true,
});

// Initialize database
const dbConnection = await initializeDataSource();

// Update workflow engine with database connection
if (dbConnection && (dbConnection as any).isInitialized) {
  (workflowEngine as any).config.dbConnection = dbConnection;
}

// Initialize and start worker
await workflowEngine.init();
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
    const methodLower = method.toLowerCase() as 'get' | 'post' | 'put' | 'delete';
    (app[methodLower] as any)(webhookPath, async (req: express.Request, res: express.Response) => {
      try {
        // Verify signature if secret is provided
        if (webhookConfig.secret) {
          const signature = req.headers['x-signature'] as string;
          if (!signature || !verifySignature(signature, webhookConfig.secret, (req as any).rawBody)) {
            return res.status(401).json({ error: 'Invalid signature' });
          }
        }

        // Trigger workflow execution
        await workflowEngine.executeWorkflow(
          webhookConfig.workflowId,
          {
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
          },
          0, // priority
          0  // delay
        );

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

const server = app.listen(port, async () => {
  logger.info(`Webhook handler service running on port ${port}`);
  
  // Register with registry service
  await serviceRegistration.register();
  serviceRegistration.setupGracefulShutdown();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await serviceRegistration.unregister();
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await serviceRegistration.unregister();
  server.close(() => {
    process.exit(0);
  });
});

