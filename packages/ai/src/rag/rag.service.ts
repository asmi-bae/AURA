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
import { DocumentChunker, ChunkingOptions } from './document-chunker';

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
  addDocuments(documents: { id: string; text: string; metadata?: Record<string, any>; embedding?: number[] }[]): Promise<void>;
  search(query: string, topK?: number, queryEmbedding?: number[]): Promise<VectorSearchResult[]>;
  delete(ids: string[]): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Query options for RAG
 */
export interface RAGQueryOptions {
  /** Number of documents to retrieve */
  topK?: number;
  /** Minimum similarity score threshold */
  minScore?: number;
  /** Whether to compress/summarize context */
  compressContext?: boolean;
  /** Maximum context length */
  maxContextLength?: number;
  /** Reasoning model to use for generation */
  reasoningModel?: any; // BaseModelService
}

/**
 * RAG query result
 */
export interface RAGQueryResult {
  /** Generated answer */
  answer: string;
  /** Retrieved context */
  context: string;
  /** Source documents */
  sources: VectorSearchResult[];
  /** Whether context was compressed */
  compressed: boolean;
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
  private chunker: DocumentChunker;

  constructor(apiKey: string, vectorStore?: VectorStore) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required for RAG');
    }

    this.openai = new OpenAI({ apiKey });
    this.vectorStore = vectorStore;
    this.defaultModel = 'text-embedding-3-small';
    this.chunker = new DocumentChunker();

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

      const embedding = response.data[0]?.embedding;
      if (!embedding) {
        throw new Error('No embedding returned from model');
      }
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
   * Add documents to vector store with automatic chunking and embedding
   * 
   * @param documents - Documents to add
   * @param chunkingOptions - Chunking options
   */
  async addDocuments(
    documents: { id: string; text: string; metadata?: Record<string, any> }[],
    chunkingOptions?: ChunkingOptions
  ): Promise<void> {
    if (!this.vectorStore) {
      throw new Error('Vector store not configured');
    }

    try {
      // Chunk documents
      const allChunks: Array<{ id: string; text: string; metadata?: Record<string, any> }> = [];

      for (const doc of documents) {
        const chunks = this.chunker.chunk(doc.id, doc.text, chunkingOptions);
        for (const chunk of chunks) {
          allChunks.push({
            id: chunk.id,
            text: chunk.text,
            metadata: {
              ...doc.metadata,
              ...chunk.metadata,
            },
          });
        }
      }

      // Generate embeddings for all chunks
      const texts = allChunks.map(chunk => chunk.text);
      const embeddings = await this.generateEmbeddings(texts);

      // Add documents with embeddings to vector store
      const documentsWithEmbeddings = allChunks.map((chunk, index) => ({
        ...chunk,
        embedding: embeddings[index],
      }));

      await this.vectorStore.addDocuments(documentsWithEmbeddings);
      logger.info('Documents added to vector store', {
        documentCount: documents.length,
        chunkCount: allChunks.length,
      });
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
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Search vector store with embedding
      const results = await this.vectorStore.search(query, topK, queryEmbedding);
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
   * @param options - Additional options
   * @returns Combined context string
   */
  async retrieveContext(
    query: string,
    topK: number = 5,
    options: { minScore?: number; compress?: boolean; maxLength?: number } = {}
  ): Promise<string> {
    try {
      const results = await this.search(query, topK);
      
      // Filter by minimum score if specified
      const filteredResults = options.minScore
        ? results.filter(r => r.score >= options.minScore!)
        : results;

      let context = filteredResults.map(r => r.text).join('\n\n');

      // Compress context if requested and too long
      if (options.compress && options.maxLength && context.length > options.maxLength) {
        context = await this.compressContext(context, options.maxLength);
      }

      logger.debug('Context retrieved', {
        query,
        contextLength: context.length,
        resultsCount: filteredResults.length,
        compressed: options.compress && context.length < filteredResults.map(r => r.text).join('\n\n').length,
      });
      return context;
    } catch (error) {
      logger.error('Error retrieving context', { error, query });
      throw error;
    }
  }

  /**
   * Compress/summarize context to fit within max length
   * 
   * @param context - Context to compress
   * @param maxLength - Maximum length
   * @returns Compressed context
   */
  async compressContext(context: string, maxLength: number): Promise<string> {
    try {
      // Use GPT to summarize if context is too long
      const summaryPrompt = `Summarize the following context while preserving key information. Keep it concise but comprehensive:\n\n${context}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that summarizes context while preserving key information.' },
          { role: 'user', content: summaryPrompt },
        ],
        max_tokens: Math.floor(maxLength / 4), // Rough estimate
      });

      const compressed = response.choices[0]?.message?.content || context.slice(0, maxLength);
      logger.debug('Context compressed', {
        originalLength: context.length,
        compressedLength: compressed.length,
      });
      return compressed;
    } catch (error) {
      logger.warn('Error compressing context, using truncation', { error });
      // Fallback to truncation
      return context.slice(0, maxLength) + '...';
    }
  }

  /**
   * Query RAG system: retrieve context and generate answer
   * 
   * @param query - User query
   * @param options - Query options
   * @returns Query result with answer and sources
   */
  async query(
    query: string,
    options: RAGQueryOptions = {}
  ): Promise<RAGQueryResult> {
    try {
      const topK = options.topK || 5;
      const compressContext = options.compressContext ?? true;
      const maxContextLength = options.maxContextLength || 4000;

      // Step 1: Retrieve context
      const context = await this.retrieveContext(query, topK, {
        minScore: options.minScore,
        compress: compressContext,
        maxLength: maxContextLength,
      });

      // Step 2: Get source documents
      const sources = await this.search(query, topK);

      // Step 3: Generate answer using reasoning model
      let answer: string;

      if (options.reasoningModel) {
        // Use provided reasoning model
        const messages = [
          {
            role: 'system' as const,
            content: 'You are a helpful assistant. Answer the question based on the provided context. If the context doesn\'t contain enough information, say so.',
          },
          {
            role: 'user' as const,
            content: `Context:\n${context}\n\nQuestion: ${query}\n\nAnswer:`,
          },
        ];

        answer = await options.reasoningModel.chatCompletion(messages);
      } else {
        // Use OpenAI directly
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant. Answer the question based on the provided context. If the context doesn\'t contain enough information, say so.',
            },
            {
              role: 'user',
              content: `Context:\n${context}\n\nQuestion: ${query}\n\nAnswer:`,
            },
          ],
        });

        answer = response.choices[0]?.message?.content || 'I could not generate an answer.';
      }

      logger.info('RAG query completed', {
        query,
        answerLength: answer.length,
        contextLength: context.length,
        sourcesCount: sources.length,
      });

      return {
        answer,
        context,
        sources,
        compressed: compressContext && context.length < sources.map(r => r.text).join('\n\n').length,
      };
    } catch (error) {
      logger.error('Error in RAG query', { error, query });
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

