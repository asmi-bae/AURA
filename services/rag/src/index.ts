import express from 'express';
import { RAGService } from '@aura/ai';
import { DocumentIngestion } from './document-ingestion';
import { createLogger } from '@aura/utils';
// Config initialization - optional
// import { initConfig } from '@aura/config';
import { ServiceRegistration } from '@aura/core';

const logger = createLogger();
const app = express();
const port = process.env.PORT || 3011;

// Initialize configuration (optional)
// initConfig();

// Service registration
const serviceRegistration = new ServiceRegistration({
  id: 'rag-service',
  name: 'RAG Service',
  version: '1.0.0',
  url: `http://${process.env.SERVICE_HOST || 'localhost'}:${port}`,
  metadata: {
    description: 'RAG (Retrieval-Augmented Generation) service',
  },
});

app.use(express.json({ limit: '10mb' }));

// Initialize RAG service
// Note: Vector store would be initialized here if available
const ragService = new RAGService(
  process.env.OPENAI_API_KEY || 'dummy-key', // Will error if not provided
  undefined // Vector store optional
);

const documentIngestion = new DocumentIngestion(ragService);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'rag-service' });
});

// Generate embedding
app.post('/embeddings/generate', async (req, res) => {
  try {
    const { text, model, dimensions } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }

    const embedding = await ragService.generateEmbedding(text, {
      model,
      dimensions,
    });

    res.json({ embedding, dimensions: embedding.length });
  } catch (error) {
    logger.error('Error generating embedding', { error });
    res.status(500).json({ 
      error: 'Failed to generate embedding',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Generate embeddings for multiple texts
app.post('/embeddings/batch', async (req, res) => {
  try {
    const { texts, model, dimensions } = req.body;
    
    if (!Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({ error: 'texts array is required' });
    }

    const embeddings = await ragService.generateEmbeddings(texts, {
      model,
      dimensions,
    });

    res.json({ embeddings, count: embeddings.length });
  } catch (error) {
    logger.error('Error generating embeddings', { error });
    res.status(500).json({ 
      error: 'Failed to generate embeddings',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Ingest text document
app.post('/documents/ingest/text', async (req, res) => {
  try {
    const { text, metadata } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }

    const documentIds = await documentIngestion.ingestText(text, metadata);
    res.json({ 
      message: 'Document ingested successfully',
      documentIds,
    });
  } catch (error) {
    logger.error('Error ingesting text document', { error });
    res.status(500).json({ 
      error: 'Failed to ingest document',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Ingest file
app.post('/documents/ingest/file', async (req, res) => {
  try {
    const { filePath, options } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'filePath is required' });
    }

    const documentIds = await documentIngestion.ingestFile(filePath, options);
    res.json({ 
      message: 'File ingested successfully',
      documentIds,
    });
  } catch (error) {
    logger.error('Error ingesting file', { error });
    res.status(500).json({ 
      error: 'Failed to ingest file',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Ingest from URL
app.post('/documents/ingest/url', async (req, res) => {
  try {
    const { url, options } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'url is required' });
    }

    const documentIds = await documentIngestion.ingestFromURL(url, options);
    res.json({ 
      message: 'URL ingested successfully',
      documentIds,
    });
  } catch (error) {
    logger.error('Error ingesting from URL', { error });
    res.status(500).json({ 
      error: 'Failed to ingest from URL',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Search documents
app.post('/documents/search', async (req, res) => {
  try {
    const { query, topK } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    const results = await (ragService as any).search(query, topK || 5);
    res.json({ results, count: results.length });
  } catch (error) {
    logger.error('Error searching documents', { error });
    res.status(500).json({ 
      error: 'Failed to search documents',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Retrieve context
app.post('/context/retrieve', async (req, res) => {
  try {
    const { query, topK, compressContext } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    const result = await (ragService as any).query(query, {
      topK: topK || 5,
      compressContext: compressContext ?? false,
    });

    res.json(result);
  } catch (error) {
    logger.error('Error retrieving context', { error });
    res.status(500).json({ 
      error: 'Failed to retrieve context',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Start server
const server = app.listen(port, async () => {
  logger.info(`RAG service running on port ${port}`);
  
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
