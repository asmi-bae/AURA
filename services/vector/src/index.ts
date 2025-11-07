import express from 'express';
import { EmbeddingGenerator } from './embedding-generator';
import { VectorStoreFactory, IVectorStore, VectorDocument, VectorSearchOptions } from './vector-store';
import { createLogger } from '@aura/utils';
// Config initialization - optional
// import { initConfig } from '@aura/config';
import { ServiceRegistration } from '@aura/core';

const logger = createLogger();
const app = express();
const port = process.env.PORT || 3012;

// Initialize configuration (optional)
// initConfig();

// Service registration
const serviceRegistration = new ServiceRegistration({
  id: 'vector-service',
  name: 'Vector Service',
  version: '1.0.0',
  url: `http://${process.env.SERVICE_HOST || 'localhost'}:${port}`,
  metadata: {
    description: 'Vector storage and similarity search service',
  },
});

app.use(express.json({ limit: '10mb' }));

// Initialize embedding generator
const embeddingGenerator = new EmbeddingGenerator(process.env.OPENAI_API_KEY);

// Initialize vector store
const vectorStoreType = (process.env.VECTOR_STORE_TYPE || 'memory') as any;
const vectorStore: IVectorStore = VectorStoreFactory.create(vectorStoreType, {
  // Store-specific configuration would go here
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'vector-service' });
});

// Generate embedding
app.post('/embeddings/generate', async (req, res) => {
  try {
    const { text, model, dimensions } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }

    const result = await embeddingGenerator.generate(text, { model, dimensions });
    res.json(result);
  } catch (error) {
    logger.error('Error generating embedding', { error });
    res.status(500).json({ 
      error: 'Failed to generate embedding',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Generate embeddings batch
app.post('/embeddings/batch', async (req, res) => {
  try {
    const { texts, model, dimensions } = req.body;
    
    if (!Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({ error: 'texts array is required' });
    }

    const results = await embeddingGenerator.generateBatch(texts, { model, dimensions });
    res.json({ embeddings: results, count: results.length });
  } catch (error) {
    logger.error('Error generating embeddings', { error });
    res.status(500).json({ 
      error: 'Failed to generate embeddings',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Add vectors to store
app.post('/vectors/add', async (req, res) => {
  try {
    const { vectors } = req.body;
    
    if (!Array.isArray(vectors) || vectors.length === 0) {
      return res.status(400).json({ error: 'vectors array is required' });
    }

    // Validate vectors
    for (const vector of vectors) {
      if (!vector.id || !Array.isArray(vector.vector)) {
        return res.status(400).json({ error: 'Each vector must have id and vector array' });
      }
    }

    await vectorStore.add(vectors as VectorDocument[]);
    res.json({ message: 'Vectors added successfully', count: vectors.length });
  } catch (error) {
    logger.error('Error adding vectors', { error });
    res.status(500).json({ 
      error: 'Failed to add vectors',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Search vectors
app.post('/vectors/search', async (req, res) => {
  try {
    const { queryVector, options } = req.body;
    
    if (!Array.isArray(queryVector)) {
      return res.status(400).json({ error: 'queryVector array is required' });
    }

    const results = await vectorStore.search(queryVector, options as VectorSearchOptions);
    res.json({ results, count: results.length });
  } catch (error) {
    logger.error('Error searching vectors', { error });
    res.status(500).json({ 
      error: 'Failed to search vectors',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Search by text (generates embedding first)
app.post('/vectors/search/text', async (req, res) => {
  try {
    const { text, options } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }

    // Generate embedding for text
    const embeddingResult = await embeddingGenerator.generate(text, {
      model: options?.model,
      dimensions: options?.dimensions,
    });

    // Search using embedding
    const results = await vectorStore.search(embeddingResult.embedding, options);
    res.json({ results, count: results.length, queryEmbedding: embeddingResult });
  } catch (error) {
    logger.error('Error searching by text', { error });
    res.status(500).json({ 
      error: 'Failed to search by text',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Delete vectors
app.delete('/vectors', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    await vectorStore.delete(ids);
    res.json({ message: 'Vectors deleted successfully', count: ids.length });
  } catch (error) {
    logger.error('Error deleting vectors', { error });
    res.status(500).json({ 
      error: 'Failed to delete vectors',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Clear vector store
app.delete('/vectors/clear', async (req, res) => {
  try {
    await vectorStore.clear();
    res.json({ message: 'Vector store cleared successfully' });
  } catch (error) {
    logger.error('Error clearing vector store', { error });
    res.status(500).json({ 
      error: 'Failed to clear vector store',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get vector count
app.get('/vectors/count', async (req, res) => {
  try {
    const count = await vectorStore.getCount();
    res.json({ count });
  } catch (error) {
    logger.error('Error getting vector count', { error });
    res.status(500).json({ error: 'Failed to get vector count' });
  }
});

// Start server
const server = app.listen(port, async () => {
  logger.info(`Vector service running on port ${port}`);
  
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
