import express from 'express';
import { AuraWorkflowEngine } from '@aura/core';
import { initializeDataSource } from '@aura/db';
import { createLogger } from '@aura/utils';
import Redis from 'ioredis';

const logger = createLogger();
const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

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

// Load plugins
const pluginsDir = process.env.PLUGINS_DIR || '../packages/plugins/src';
await workflowEngine.init(pluginsDir);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'workflow-engine' });
});

// Execute workflow endpoint
app.post('/workflows/execute', async (req, res) => {
  try {
    const { workflowData } = req.body;
    if (!workflowData) {
      return res.status(400).json({ error: 'workflowData is required' });
    }

    await workflowEngine.executeWorkflow(workflowData);
    res.json({ success: true, message: 'Workflow queued for execution' });
  } catch (error) {
    logger.error('Error executing workflow', { error });
    res.status(500).json({ error: 'Failed to execute workflow' });
  }
});

// Get workflow status endpoint
app.get('/workflows/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get job from queue
    const { Queue } = await import('bullmq');
    const queue = new Queue('workflow-execution', { connection: redis });
    const job = await queue.getJob(id);
    
    if (!job) {
      return res.status(404).json({ error: 'Workflow execution not found' });
    }
    
    const state = await job.getState();
    const status = {
      workflowId: id,
      jobId: job.id,
      state,
      progress: job.progress || 0,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    };
    
    res.json(status);
  } catch (error) {
    logger.error('Error getting workflow status', { error });
    res.status(500).json({ error: 'Failed to get workflow status' });
  }
});

const server = app.listen(port, () => {
  logger.info(`Workflow engine service running on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

