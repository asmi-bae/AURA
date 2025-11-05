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
    // TODO: Implement status retrieval from Redis/DB
    res.json({ workflowId: id, status: 'running' });
  } catch (error) {
    logger.error('Error getting workflow status', { error });
    res.status(500).json({ error: 'Failed to get workflow status' });
  }
});

app.listen(port, () => {
  logger.info(`Workflow engine service running on port ${port}`);
});

