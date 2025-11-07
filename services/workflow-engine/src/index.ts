import express from 'express';
import { AuraWorkflowEngine, ServiceRegistration } from '@aura/core';
import { initializeDataSource } from '@aura/db';
import { createLogger } from '@aura/utils';
import Redis from 'ioredis';

const logger = createLogger();
const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

// Service registration
const serviceRegistration = new ServiceRegistration({
  id: 'workflow-engine-service',
  name: 'Workflow Engine Service',
  version: '1.0.0',
  url: `http://${process.env.SERVICE_HOST || 'localhost'}:${port}`,
  metadata: {
    description: 'Workflow execution engine service',
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
const pluginsDir = process.env.PLUGINS_DIR || '../packages/plugins/src';
await workflowEngine.init();
await workflowEngine.startWorker();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'workflow-engine' });
});

// Execute workflow endpoint
app.post('/workflows/execute', async (req, res) => {
  try {
    const { workflowId, workflowData, priority, delay } = req.body;
    
    if (!workflowId && !workflowData) {
      return res.status(400).json({ error: 'workflowId or workflowData is required' });
    }

    const jobId = await workflowEngine.executeWorkflow(
      workflowId || 'temp-workflow',
      workflowData,
      priority || 0,
      delay || 0
    );
    
    res.json({ 
      success: true, 
      message: 'Workflow queued for execution',
      jobId,
    });
  } catch (error) {
    logger.error('Error executing workflow', { error });
    res.status(500).json({ 
      error: 'Failed to execute workflow',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get workflow status endpoint
app.get('/workflows/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    
    const status = await workflowEngine.getExecutionStatus(id);
    
    if (!status) {
      return res.status(404).json({ error: 'Workflow execution not found' });
    }
    
    res.json(status);
  } catch (error) {
    logger.error('Error getting workflow status', { error });
    res.status(500).json({ error: 'Failed to get workflow status' });
  }
});

const server = app.listen(port, async () => {
  logger.info(`Workflow engine service running on port ${port}`);
  
  // Register with registry service
  await serviceRegistration.register();
  serviceRegistration.setupGracefulShutdown();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await serviceRegistration.unregister();
  await workflowEngine.stopWorker();
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await serviceRegistration.unregister();
  await workflowEngine.stopWorker();
  server.close(() => {
    process.exit(0);
  });
});

