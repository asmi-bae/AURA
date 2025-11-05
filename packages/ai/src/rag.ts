import OpenAI from 'openai';
import { createLogger } from '@aura/utils';

export interface EmbeddingOptions {
  model?: string;
  dimensions?: number;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata: Record<string, any>;
  text: string;
}

export interface VectorStore {
  addDocuments(documents: { id: string; text: string; metadata?: Record<string, any> }[]): Promise<void>;
  search(query: string, topK?: number): Promise<VectorSearchResult[]>;
  delete(ids: string[]): Promise<void>;
}

export class RAG {
  private openai: OpenAI;
  private logger = createLogger();
  private vectorStore?: VectorStore;

  constructor(apiKey: string, vectorStore?: VectorStore) {
    this.openai = new OpenAI({ apiKey });
    this.vectorStore = vectorStore;
  }

  async generateEmbedding(text: string, options: EmbeddingOptions = {}): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: options.model || 'text-embedding-3-small',
        input: text,
        dimensions: options.dimensions,
      });

      return response.data[0].embedding;
    } catch (error) {
      this.logger.error('Error generating embedding', { error, text });
      throw error;
    }
  }

  async generateEmbeddings(texts: string[], options: EmbeddingOptions = {}): Promise<number[][]> {
    try {
      const response = await this.openai.embeddings.create({
        model: options.model || 'text-embedding-3-small',
        input: texts,
        dimensions: options.dimensions,
      });

      return response.data.map(item => item.embedding);
    } catch (error) {
      this.logger.error('Error generating embeddings', { error });
      throw error;
    }
  }

  async addDocuments(documents: { id: string; text: string; metadata?: Record<string, any> }[]): Promise<void> {
    if (!this.vectorStore) {
      throw new Error('Vector store not configured');
    }

    await this.vectorStore.addDocuments(documents);
  }

  async search(query: string, topK: number = 5): Promise<VectorSearchResult[]> {
    if (!this.vectorStore) {
      throw new Error('Vector store not configured');
    }

    return this.vectorStore.search(query, topK);
  }

  async retrieveContext(query: string, topK: number = 5): Promise<string> {
    const results = await this.search(query, topK);
    return results.map(r => r.text).join('\n\n');
  }
}

