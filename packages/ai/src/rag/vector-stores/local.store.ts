/**
 * Local SQLite Vector Store Implementation
 * 
 * Implementation of VectorStore interface using SQLite for local storage.
 * Provides vector similarity search using approximate nearest neighbor search.
 * 
 * @module @aura/ai/rag/vector-stores
 */

import { createLogger } from '@aura/utils';
import { VectorStore, VectorSearchResult } from '../rag.service';
import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';

const logger = createLogger();

/**
 * Local vector store configuration
 */
export interface LocalVectorStoreConfig {
  /** Database file path */
  dbPath?: string;
  /** Table name */
  tableName?: string;
  /** Embedding dimensions */
  dimensions?: number;
}

/**
 * Local SQLite Vector Store
 * 
 * Implements VectorStore interface using SQLite.
 */
export class LocalVectorStore implements VectorStore {
  private db: Database.Database;
  private tableName: string;
  private dimensions: number;

  constructor(config: LocalVectorStoreConfig = {}) {
    const dbPath = config.dbPath || path.join(process.cwd(), 'data', 'vectors.db');
    const dbDir = path.dirname(dbPath);

    // Ensure directory exists
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.tableName = config.tableName || 'vectors';
    this.dimensions = config.dimensions || 1536; // Default for text-embedding-3-small

    this.initializeTable();

    logger.info('Local vector store initialized', {
      dbPath,
      tableName: this.tableName,
      dimensions: this.dimensions,
    });
  }

  /**
   * Initialize database table
   */
  private initializeTable(): void {
    // Create table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        embedding BLOB NOT NULL,
        metadata TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_created_at ON ${this.tableName}(created_at);
    `);
  }

  /**
   * Add documents to vector store
   * 
   * Note: This requires embeddings to be generated first.
   * Use RAGService.addDocuments() which handles embedding generation.
   */
  async addDocuments(
    documents: { id: string; text: string; metadata?: Record<string, any>; embedding?: number[] }[]
  ): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO ${this.tableName} (id, text, embedding, metadata, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insert = this.db.transaction((docs: typeof documents) => {
      for (const doc of docs) {
        const embeddingBuffer = doc.embedding
          ? Buffer.from(new Float32Array(doc.embedding).buffer)
          : Buffer.alloc(0);

        stmt.run(
          doc.id,
          doc.text,
          embeddingBuffer,
          JSON.stringify(doc.metadata || {}),
          Date.now()
        );
      }
    });

    insert(documents);
    logger.info('Documents added to local vector store', { count: documents.length });
  }

  /**
   * Search for similar documents
   * 
   * @param query - Search query (will be embedded by RAGService)
   * @param queryEmbedding - Pre-computed query embedding
   * @param topK - Number of results to return
   * @returns Search results
   */
  async search(
    query: string,
    topK: number = 5,
    queryEmbedding?: number[]
  ): Promise<VectorSearchResult[]> {
    if (!queryEmbedding) {
      throw new Error('Query embedding required for local vector store search');
    }

    try {
      // Get all vectors
      const rows = this.db.prepare(`SELECT id, text, embedding, metadata FROM ${this.tableName}`).all() as Array<{
        id: string;
        text: string;
        embedding: Buffer;
        metadata: string;
      }>;

      // Calculate cosine similarity
      const results: Array<VectorSearchResult & { score: number }> = [];

      for (const row of rows) {
        const embedding = new Float32Array(row.embedding.buffer);
        const similarity = this.cosineSimilarity(queryEmbedding, Array.from(embedding));

        results.push({
          id: row.id,
          score: similarity,
          metadata: JSON.parse(row.metadata || '{}'),
          text: row.text,
        });
      }

      // Sort by similarity and return top K
      results.sort((a, b) => b.score - a.score);
      return results.slice(0, topK);
    } catch (error) {
      logger.error('Error searching local vector store', { error, query });
      throw error;
    }
  }

  /**
   * Calculate cosine similarity
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embedding dimensions must match');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Delete documents from vector store
   */
  async delete(ids: string[]): Promise<void> {
    const stmt = this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`);
    const deleteMany = this.db.transaction((idsToDelete: string[]) => {
      for (const id of idsToDelete) {
        stmt.run(id);
      }
    });

    deleteMany(ids);
    logger.info('Documents deleted from local vector store', { count: ids.length });
  }

  /**
   * Clear all documents from vector store
   */
  async clear(): Promise<void> {
    this.db.prepare(`DELETE FROM ${this.tableName}`).run();
    logger.info('Local vector store cleared');
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}





