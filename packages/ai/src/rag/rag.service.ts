/**
 * RAG (Retrieval-Augmented Generation) Service
 * 
 * Service for implementing Retrieval-Augmented Generation using embeddings and vector stores.
 * Combines information retrieval with language generation for context-aware responses.
 * 
 * Features:
 * - Text embedding generation
 * - Vector store integration (Pinecone, Weaviate)
 * - Semantic search
 * - Context retrieval
 * 
 * @module @aura/ai/rag
 */

import OpenAI from 'openai';
import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * Embedding generation options
 */
export interface EmbeddingOptions {
  /** Embedding model to use */
  model?: string;
  /** Number of dimensions */
  dimensions?: number;
}

/**
 * Vector search result
 */
export interface VectorSearchResult {
  id: string;
  score: number;
  metadata: Record<string, any>;
  text: string;
}

/**
 * Vector store interface
 */
export interface VectorStore {
  addDocuments(documents: { id: string; text: string; metadata?: Record<string, any> }[]): Promise<void>;
  search(query: string, topK?: number): Promise<VectorSearchResult[]>;
  delete(ids: string[]): Promise<void>;
  clear(): Promise<void>;
}

/**
 * RAG Service
 * 
 * Provides RAG functionality using embeddings and vector stores.
 */
export class RAGService {
  private openai: OpenAI;
  private vectorStore?: VectorStore;
  private defaultModel: string;

  constructor(apiKey: string, vectorStore?: VectorStore) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required for RAG');
    }

    this.openai = new OpenAI({ apiKey });
    this.vectorStore = vectorStore;
    this.defaultModel = 'text-embedding-3-small';

    logger.info('RAG service initialized', {
      hasVectorStore: !!vectorStore,
      model: this.defaultModel,
    });
  }

  /**
   * Generate embedding for a single text
   * 
   * @param text - Text to embed
   * @param options - Embedding options
   * @returns Embedding vector
   */
  async generateEmbedding(text: string, options: EmbeddingOptions = {}): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: options.model || this.defaultModel,
        input: text,
        dimensions: options.dimensions,
      });

      const embedding = response.data[0].embedding;
      logger.debug('Embedding generated', { textLength: text.length, dimensions: embedding.length });

      return embedding;
    } catch (error) {
      logger.error('Error generating embedding', {
        error: error instanceof Error ? error.message : 'Unknown error',
        text: text.substring(0, 100),
      });
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts
   * 
   * @param texts - Array of texts to embed
   * @param options - Embedding options
   * @returns Array of embedding vectors
   */
  async generateEmbeddings(texts: string[], options: EmbeddingOptions = {}): Promise<number[][]> {
    try {
      const response = await this.openai.embeddings.create({
        model: options.model || this.defaultModel,
        input: texts,
        dimensions: options.dimensions,
      });

      const embeddings = response.data.map(item => item.embedding);
      logger.debug('Embeddings generated', { count: texts.length, dimensions: embeddings[0]?.length });

      return embeddings;
    } catch (error) {
      logger.error('Error generating embeddings', {
        error: error instanceof Error ? error.message : 'Unknown error',
        count: texts.length,
      });
      throw error;
    }
  }

  /**
   * Add documents to vector store
   * 
   * @param documents - Documents to add
   */
  async addDocuments(
    documents: { id: string; text: string; metadata?: Record<string, any> }[]
  ): Promise<void> {
    if (!this.vectorStore) {
      throw new Error('Vector store not configured');
    }

    try {
      await this.vectorStore.addDocuments(documents);
      logger.info('Documents added to vector store', { count: documents.length });
    } catch (error) {
      logger.error('Error adding documents to vector store', { error });
      throw error;
    }
  }

  /**
   * Search for similar documents
   * 
   * @param query - Search query
   * @param topK - Number of results to return
   * @returns Search results
   */
  async search(query: string, topK: number = 5): Promise<VectorSearchResult[]> {
    if (!this.vectorStore) {
      throw new Error('Vector store not configured');
    }

    try {
      const results = await this.vectorStore.search(query, topK);
      logger.debug('Vector search completed', { query, resultsCount: results.length });
      return results;
    } catch (error) {
      logger.error('Error searching vector store', { error, query });
      throw error;
    }
  }

  /**
   * Retrieve context for a query
   * 
   * @param query - Query to retrieve context for
   * @param topK - Number of documents to retrieve
   * @returns Combined context string
   */
  async retrieveContext(query: string, topK: number = 5): Promise<string> {
    try {
      const results = await this.search(query, topK);
      const context = results.map(r => r.text).join('\n\n');
      logger.debug('Context retrieved', { query, contextLength: context.length });
      return context;
    } catch (error) {
      logger.error('Error retrieving context', { error, query });
      throw error;
    }
  }

  /**
   * Delete documents from vector store
   * 
   * @param ids - Document IDs to delete
   */
  async deleteDocuments(ids: string[]): Promise<void> {
    if (!this.vectorStore) {
      throw new Error('Vector store not configured');
    }

    try {
      await this.vectorStore.delete(ids);
      logger.info('Documents deleted from vector store', { count: ids.length });
    } catch (error) {
      logger.error('Error deleting documents from vector store', { error });
      throw error;
    }
  }

  /**
   * Clear all documents from vector store
   */
  async clearVectorStore(): Promise<void> {
    if (!this.vectorStore) {
      throw new Error('Vector store not configured');
    }

    try {
      await this.vectorStore.clear();
      logger.info('Vector store cleared');
    } catch (error) {
      logger.error('Error clearing vector store', { error });
      throw error;
    }
  }
}

