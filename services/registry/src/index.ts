import express from 'express';
import { RegistryManager } from './registry-manager';
import { ServiceDiscovery } from './service-discovery';
import { createLogger } from '@aura/utils';
import { initConfig } from '@aura/config';

const logger = createLogger();
const app = express();
const port = process.env.PORT || 3008;

// Initialize configuration
initConfig();

app.use(express.json());

// Initialize registry and discovery
const registryManager = new RegistryManager(30000); // 30 second health checks
const serviceDiscovery = new ServiceDiscovery(registryManager);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'registry-service' });
});

// Register service
app.post('/services/register', (req, res) => {
  try {
    const { id, name, version, url, healthCheckUrl, metadata } = req.body;
    
    if (!id || !name || !version || !url) {
      return res.status(400).json({ 
        error: 'Service id, name, version, and url are required' 
      });
    }
    
    registryManager.register({
      id,
      name,
      version,
      url,
      healthCheckUrl,
      metadata,
    });
    
    res.status(201).json({ 
      message: 'Service registered successfully',
      serviceId: id,
    });
  } catch (error) {
    logger.error('Error registering service', { error });
    res.status(500).json({ 
      error: 'Failed to register service',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Unregister service
app.delete('/services/:id', (req, res) => {
  try {
    const { id } = req.params;
    registryManager.unregister(id);
    res.json({ message: 'Service unregistered successfully' });
  } catch (error) {
    logger.error('Error unregistering service', { error });
    res.status(500).json({ error: 'Failed to unregister service' });
  }
});

// Get service by ID
app.get('/services/:id', (req, res) => {
  try {
    const { id } = req.params;
    const service = registryManager.get(id);
    
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    res.json(service);
  } catch (error) {
    logger.error('Error getting service', { error });
    res.status(500).json({ error: 'Failed to get service' });
  }
});

// List all services
app.get('/services', (req, res) => {
  try {
    const { status, pattern } = req.query;
    
    let services = registryManager.list();
    
    if (status) {
      services = services.filter(s => s.status === status);
    }
    
    if (pattern) {
      const regex = new RegExp(pattern as string);
      services = services.filter(s => regex.test(s.name));
    }
    
    res.json({
      services,
      total: services.length,
    });
  } catch (error) {
    logger.error('Error listing services', { error });
    res.status(500).json({ error: 'Failed to list services' });
  }
});

// Discover service
app.post('/discover', (req, res) => {
  try {
    const { name, strategy } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Service name is required' });
    }
    
    const service = serviceDiscovery.discover(
      name,
      strategy || 'round-robin'
    );
    
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    res.json(service);
  } catch (error) {
    logger.error('Error discovering service', { error });
    res.status(500).json({ error: 'Failed to discover service' });
  }
});

// Health check for a service
app.post('/services/:id/health-check', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await registryManager.performHealthCheck(id);
    res.json(result);
  } catch (error) {
    logger.error('Error performing health check', { error });
    res.status(500).json({ 
      error: 'Failed to perform health check',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get statistics
app.get('/statistics', (req, res) => {
  try {
    const stats = registryManager.getStatistics();
    res.json(stats);
  } catch (error) {
    logger.error('Error getting statistics', { error });
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Start server
const server = app.listen(port, () => {
  logger.info(`Registry service running on port ${port}`);
  
  // Registry service registers itself (but doesn't need external registry)
  // Other services will register with this service
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  registryManager.stopHealthChecks();
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  registryManager.stopHealthChecks();
  server.close(() => {
    process.exit(0);
  });
});
