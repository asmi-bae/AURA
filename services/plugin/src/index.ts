import express from 'express';
import { PluginRegistry } from './plugin-registry';
import { PluginSandbox } from './plugin-sandbox';
import { createLogger } from '@aura/utils';
// Config initialization - optional
// import { initConfig } from '@aura/config';
import { ServiceRegistration } from '@aura/core';

const logger = createLogger();
const app = express();
const port = process.env.PORT || 3007;

// Initialize configuration (optional)
// initConfig();

app.use(express.json());

// Service registration
const serviceRegistration = new ServiceRegistration({
  id: 'plugin-service',
  name: 'Plugin Service',
  version: '1.0.0',
  url: `http://${process.env.SERVICE_HOST || 'localhost'}:${port}`,
  metadata: {
    description: 'Plugin management and execution service',
  },
});

// Initialize plugin registry and sandbox
const pluginRegistry = new PluginRegistry();
const pluginSandbox = new PluginSandbox({
  timeout: 5000,
  memoryLimit: 128,
  allowAsync: true,
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'plugin-service' });
});

// List plugins
app.get('/plugins', (req, res) => {
  try {
    const plugins = pluginRegistry.list();
    res.json({
      plugins,
      total: plugins.length,
    });
  } catch (error) {
    logger.error('Error listing plugins', { error });
    res.status(500).json({ error: 'Failed to list plugins' });
  }
});

// Get plugin by ID
app.get('/plugins/:id', (req, res) => {
  try {
    const { id } = req.params;
    const pluginInfo = pluginRegistry.getInfo(id);
    
    if (!pluginInfo) {
      return res.status(404).json({ error: 'Plugin not found' });
    }
    
    res.json(pluginInfo);
  } catch (error) {
    logger.error('Error getting plugin', { error });
    res.status(500).json({ error: 'Failed to get plugin' });
  }
});

// Load plugin from path
app.post('/plugins/load', async (req, res) => {
  try {
    const { id, path, metadata } = req.body;
    
    if (!id || !path) {
      return res.status(400).json({ error: 'Plugin ID and path are required' });
    }
    
    await pluginRegistry.loadPlugin(id, path, metadata);
    res.status(201).json({
      id,
      message: 'Plugin loaded successfully',
    });
  } catch (error) {
    logger.error('Error loading plugin', { error });
    res.status(500).json({ 
      error: 'Failed to load plugin',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Load plugin from npm
app.post('/plugins/load/npm', async (req, res) => {
  try {
    const { id, packageName, version } = req.body;
    
    if (!id || !packageName) {
      return res.status(400).json({ error: 'Plugin ID and package name are required' });
    }
    
    await pluginRegistry.loadFromNPM(id, packageName, version);
    res.status(201).json({
      id,
      message: 'Plugin registered from npm',
    });
  } catch (error) {
    logger.error('Error loading plugin from npm', { error });
    res.status(500).json({ 
      error: 'Failed to load plugin from npm',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Load plugin from URL
app.post('/plugins/load/url', async (req, res) => {
  try {
    const { id, url, metadata } = req.body;
    
    if (!id || !url) {
      return res.status(400).json({ error: 'Plugin ID and URL are required' });
    }
    
    await pluginRegistry.loadFromURL(id, url, metadata);
    res.status(201).json({
      id,
      message: 'Plugin registered from URL',
    });
  } catch (error) {
    logger.error('Error loading plugin from URL', { error });
    res.status(500).json({ 
      error: 'Failed to load plugin from URL',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Enable plugin
app.post('/plugins/:id/enable', (req, res) => {
  try {
    const { id } = req.params;
    pluginRegistry.enable(id);
    res.json({ message: 'Plugin enabled successfully' });
  } catch (error) {
    logger.error('Error enabling plugin', { error });
    res.status(500).json({ 
      error: 'Failed to enable plugin',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Disable plugin
app.post('/plugins/:id/disable', (req, res) => {
  try {
    const { id } = req.params;
    pluginRegistry.disable(id);
    res.json({ message: 'Plugin disabled successfully' });
  } catch (error) {
    logger.error('Error disabling plugin', { error });
    res.status(500).json({ 
      error: 'Failed to disable plugin',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Unload plugin
app.delete('/plugins/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pluginRegistry.unload(id);
    res.json({ message: 'Plugin unloaded successfully' });
  } catch (error) {
    logger.error('Error unloading plugin', { error });
    res.status(500).json({ 
      error: 'Failed to unload plugin',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Execute plugin
app.post('/plugins/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const { functionName, args, code } = req.body;
    
    const plugin = pluginRegistry.get(id);
    if (!plugin) {
      return res.status(404).json({ error: 'Plugin not found' });
    }
    
    let result;
    if (code) {
      // Execute code in sandbox
      result = pluginSandbox.execute(code, { plugin });
    } else if (functionName) {
      // Execute plugin function
      result = pluginSandbox.executeFunction(plugin, functionName, args || []);
    } else {
      return res.status(400).json({ error: 'Either code or functionName is required' });
    }
    
    res.json({ result });
  } catch (error) {
    logger.error('Error executing plugin', { error });
    res.status(500).json({ 
      error: 'Failed to execute plugin',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Validate plugin code
app.post('/plugins/validate', (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }
    
    const validation = pluginSandbox.validate(code);
    res.json(validation);
  } catch (error) {
    logger.error('Error validating plugin', { error });
    res.status(500).json({ error: 'Failed to validate plugin' });
  }
});

// Start server
const server = app.listen(port, async () => {
  logger.info(`Plugin service running on port ${port}`);
  
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
