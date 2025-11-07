/**
 * Vector Store
 * 
 * Manages vector storage and similarity search
 */

import { createLogger } from '@aura/utils';
import { EventEmitter } from 'events';

const logger = createLogger();

export interface VectorDocument {
  id: string;
  vector: number[];
  metadata?: Record<string, any>;
  text?: string;
}

export interface VectorSearchOptions {
  topK?: number;
  filter?: Record<string, any>;
  includeMetadata?: boolean;
  includeValues?: boolean;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata?: Record<string, any>;
  vector?: number[];
  text?: string;
}

export type VectorStoreType = 'memory' | 'pinecone' | 'weaviate' | 'sqlite';

/**
 * Vector Store Interface
 */
export interface IVectorStore {
  add(vectors: VectorDocument[]): Promise<void>;
  search(queryVector: number[], options?: VectorSearchOptions): Promise<VectorSearchResult[]>;
  delete(ids: string[]): Promise<void>;
  clear(): Promise<void>;
  getCount(): Promise<number>;
}

/**
 * Memory Vector Store
 * Simple in-memory vector store for development
 */
export class MemoryVectorStore extends EventEmitter implements IVectorStore {
  private vectors: Map<string, VectorDocument> = new Map();

  /**
   * Add vectors
   */
  async add(vectors: VectorDocument[]): Promise<void> {
    for (const vector of vectors) {
      this.vectors.set(vector.id, vector);
    }
    logger.info('Vectors added', { count: vectors.length });
    this.emit('vectorsAdded', vectors.length);
  }

  /**
   * Search vectors
   */
  async search(
    queryVector: number[],
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    const topK = options.topK || 10;
    const results: VectorSearchResult[] = [];

    for (const [id, doc] of this.vectors.entries()) {
      const score = this.cosineSimilarity(queryVector, doc.vector);
      results.push({
        id,
        score,
        metadata: options.includeMetadata ? doc.metadata : undefined,
        vector: options.includeValues ? doc.vector : undefined,
        text: doc.text,
      });
    }

    // Sort by score (descending) and return top K
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * Delete vectors
   */
  async delete(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.vectors.delete(id);
    }
    logger.info('Vectors deleted', { count: ids.length });
  }

  /**
   * Clear all vectors
   */
  async clear(): Promise<void> {
    this.vectors.clear();
    logger.info('Vector store cleared');
  }

  /**
   * Get count
   */
  async getCount(): Promise<number> {
    return this.vectors.size;
  }

  /**
   * Calculate cosine similarity
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

/**
 * Vector Store Factory
 */
export class VectorStoreFactory {
  /**
   * Create vector store
   */
  static create(
    type: VectorStoreType,
    config?: Record<string, any>
  ): IVectorStore {
    switch (type) {
      case 'memory':
        return new MemoryVectorStore();
      
      case 'pinecone':
        // Would initialize Pinecone store
        logger.warn('Pinecone store not yet implemented, using memory store');
        return new MemoryVectorStore();
      
      case 'weaviate':
        // Would initialize Weaviate store
        logger.warn('Weaviate store not yet implemented, using memory store');
        return new MemoryVectorStore();
      
      case 'sqlite':
        // Would initialize SQLite vector store
        logger.warn('SQLite vector store not yet implemented, using memory store');
        return new MemoryVectorStore();
      
      default:
        throw new Error(`Unknown vector store type: ${type}`);
    }
  }
}
