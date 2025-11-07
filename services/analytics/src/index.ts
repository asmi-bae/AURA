import express from 'express';
import { AgentStatsCollector } from './collectors/AgentStatsCollector';
import { WorkflowStatsCollector } from './collectors/WorkflowStatsCollector';
import { createLogger } from '@aura/utils';
import { initConfig } from '@aura/config';
import { ServiceRegistration } from '@aura/core';

const logger = createLogger();
const app = express();
const port = process.env.PORT || 3010;

// Initialize configuration
initConfig();

// Service registration
const serviceRegistration = new ServiceRegistration({
  id: 'analytics-service',
  name: 'Analytics Service',
  version: '1.0.0',
  url: `http://${process.env.SERVICE_HOST || 'localhost'}:${port}`,
  metadata: {
    description: 'Analytics and statistics collection service',
  },
});

app.use(express.json());

// Initialize collectors
const agentStatsCollector = new AgentStatsCollector();
const workflowStatsCollector = new WorkflowStatsCollector();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'analytics' });
});

// Record agent task execution
app.post('/analytics/agent/task', (req, res) => {
  try {
    const { agentId, success, executionTime } = req.body;
    
    if (!agentId || typeof success !== 'boolean' || !executionTime) {
      return res.status(400).json({ error: 'agentId, success, and executionTime are required' });
    }

    agentStatsCollector.recordTaskExecution(agentId, success, executionTime);
    res.json({ message: 'Stats recorded' });
  } catch (error) {
    logger.error('Error recording agent stats', { error });
    res.status(500).json({ error: 'Failed to record stats' });
  }
});

// Get agent stats
app.get('/analytics/agent/:agentId', (req, res) => {
  try {
    const { agentId } = req.params;
    const stats = agentStatsCollector.getStats(agentId);
    
    if (!stats) {
      return res.status(404).json({ error: 'Stats not found' });
    }
    
    res.json(stats);
  } catch (error) {
    logger.error('Error getting agent stats', { error });
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Get all agent stats
app.get('/analytics/agent', (req, res) => {
  try {
    const stats = agentStatsCollector.getAllStats();
    res.json({ stats, total: stats.length });
  } catch (error) {
    logger.error('Error getting all agent stats', { error });
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Get aggregated agent stats
app.get('/analytics/agent/aggregated', (req, res) => {
  try {
    const stats = agentStatsCollector.getAggregatedStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error getting aggregated agent stats', { error });
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Record workflow execution
app.post('/analytics/workflow/execution', (req, res) => {
  try {
    const { workflowId, success, executionTime, nodesExecuted } = req.body;
    
    if (!workflowId || typeof success !== 'boolean' || !executionTime || !nodesExecuted) {
      return res.status(400).json({ 
        error: 'workflowId, success, executionTime, and nodesExecuted are required' 
      });
    }

    workflowStatsCollector.recordExecution(workflowId, success, executionTime, nodesExecuted);
    res.json({ message: 'Stats recorded' });
  } catch (error) {
    logger.error('Error recording workflow stats', { error });
    res.status(500).json({ error: 'Failed to record stats' });
  }
});

// Get workflow stats
app.get('/analytics/workflow/:workflowId', (req, res) => {
  try {
    const { workflowId } = req.params;
    const stats = workflowStatsCollector.getStats(workflowId);
    
    if (!stats) {
      return res.status(404).json({ error: 'Stats not found' });
    }
    
    res.json(stats);
  } catch (error) {
    logger.error('Error getting workflow stats', { error });
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Get all workflow stats
app.get('/analytics/workflow', (req, res) => {
  try {
    const stats = workflowStatsCollector.getAllStats();
    res.json({ stats, total: stats.length });
  } catch (error) {
    logger.error('Error getting all workflow stats', { error });
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Get aggregated workflow stats
app.get('/analytics/workflow/aggregated', (req, res) => {
  try {
    const stats = workflowStatsCollector.getAggregatedStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error getting aggregated workflow stats', { error });
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Get top workflows
app.get('/analytics/workflow/top', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const topWorkflows = workflowStatsCollector.getTopWorkflows(limit);
    res.json({ workflows: topWorkflows, limit });
  } catch (error) {
    logger.error('Error getting top workflows', { error });
    res.status(500).json({ error: 'Failed to get top workflows' });
  }
});

// Get dashboard data
app.get('/analytics/dashboard', (req, res) => {
  try {
    const agentStats = agentStatsCollector.getAggregatedStats();
    const workflowStats = workflowStatsCollector.getAggregatedStats();
    const topWorkflows = workflowStatsCollector.getTopWorkflows(5);

    res.json({
      agents: agentStats,
      workflows: workflowStats,
      topWorkflows,
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error('Error getting dashboard data', { error });
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

// Start server
const server = app.listen(port, async () => {
  logger.info(`Analytics service running on port ${port}`);
  
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
