import express from 'express';
import { AgentManager } from './agent-manager';
import { createLogger } from '@aura/utils';
import { initConfig } from '@aura/config';
import { ServiceRegistration } from '@aura/core';

const logger = createLogger();
const app = express();
const port = process.env.PORT || 3006;

// Initialize configuration
initConfig();

app.use(express.json());

// Service registration
const serviceRegistration = new ServiceRegistration({
  id: 'agent-service',
  name: 'Agent Service',
  version: '1.0.0',
  url: `http://${process.env.SERVICE_HOST || 'localhost'}:${port}`,
  metadata: {
    description: 'Agent management and execution service',
  },
});

// Initialize agent manager
const agentManager = new AgentManager({
  maxAgents: 100,
  autoStart: false,
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'agent-service' });
});

// List agents
app.get('/agents', (req, res) => {
  try {
    const agents = agentManager.listAgents();
    res.json({
      agents,
      total: agents.length,
    });
  } catch (error) {
    logger.error('Error listing agents', { error });
    res.status(500).json({ error: 'Failed to list agents' });
  }
});

// Get agent by ID
app.get('/agents/:id', (req, res) => {
  try {
    const { id } = req.params;
    const agentInfo = agentManager.getAgentInfo(id);
    
    if (!agentInfo) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    res.json(agentInfo);
  } catch (error) {
    logger.error('Error getting agent', { error });
    res.status(500).json({ error: 'Failed to get agent' });
  }
});

// Create agent
app.post('/agents', async (req, res) => {
  try {
    const { name, type, config, userId } = req.body;
    
    if (!type) {
      return res.status(400).json({ error: 'Agent type is required' });
    }
    
    const agentId = await agentManager.createAgent({
      name,
      type,
      config,
      userId,
    });
    
    res.status(201).json({
      id: agentId,
      message: 'Agent created successfully',
    });
  } catch (error) {
    logger.error('Error creating agent', { error });
    res.status(500).json({ 
      error: 'Failed to create agent',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Delete agent
app.delete('/agents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await agentManager.deleteAgent(id);
    res.json({ message: 'Agent deleted successfully' });
  } catch (error) {
    logger.error('Error deleting agent', { error });
    res.status(500).json({ 
      error: 'Failed to delete agent',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Start agent
app.post('/agents/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    await agentManager.startAgent(id);
    res.json({ message: 'Agent started successfully' });
  } catch (error) {
    logger.error('Error starting agent', { error });
    res.status(500).json({ 
      error: 'Failed to start agent',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Stop agent
app.post('/agents/:id/stop', async (req, res) => {
  try {
    const { id } = req.params;
    await agentManager.stopAgent(id);
    res.json({ message: 'Agent stopped successfully' });
  } catch (error) {
    logger.error('Error stopping agent', { error });
    res.status(500).json({ 
      error: 'Failed to stop agent',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Execute task on agent
app.post('/agents/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const { task, input } = req.body;
    
    if (!task) {
      return res.status(400).json({ error: 'Task is required' });
    }
    
    const result = await agentManager.executeTask(id, task, input);
    res.json({ result });
  } catch (error) {
    logger.error('Error executing task', { error });
    res.status(500).json({ 
      error: 'Failed to execute task',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get agent statistics
app.get('/agents/statistics', (req, res) => {
  try {
    const stats = agentManager.getStatistics();
    res.json(stats);
  } catch (error) {
    logger.error('Error getting statistics', { error });
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Start server
const server = app.listen(port, async () => {
  logger.info(`Agent service running on port ${port}`);
  
  // Register with registry service
  await serviceRegistration.register();
  serviceRegistration.setupGracefulShutdown();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await serviceRegistration.unregister();
  // Stop all agents
  const agents = agentManager.listAgents();
  for (const agent of agents) {
    try {
      await agentManager.stopAgent(agent.id);
    } catch (error) {
      logger.error('Error stopping agent during shutdown', { agentId: agent.id, error });
    }
  }
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await serviceRegistration.unregister();
  // Stop all agents
  const agents = agentManager.listAgents();
  for (const agent of agents) {
    try {
      await agentManager.stopAgent(agent.id);
    } catch (error) {
      logger.error('Error stopping agent during shutdown', { agentId: agent.id, error });
    }
  }
  server.close(() => {
    process.exit(0);
  });
});
