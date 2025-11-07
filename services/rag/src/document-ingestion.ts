/**
 * Document Ingestion
 * 
 * Handles ingestion of documents from various sources
 */

import { createLogger } from '@aura/utils';
import { RAGService } from '@aura/ai';
import * as fs from 'fs/promises';
import * as path from 'path';

const logger = createLogger();

export interface Document {
  id: string;
  content: string;
  metadata: {
    source: string;
    type: string;
    title?: string;
    author?: string;
    createdAt?: Date;
    [key: string]: any;
  };
}

export interface IngestionOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  metadata?: Record<string, any>;
}

/**
 * Document Ingestion Service
 */
export class DocumentIngestion {
  private ragService: RAGService;

  constructor(ragService: RAGService) {
    this.ragService = ragService;
  }

  /**
   * Ingest text document
   */
  async ingestText(text: string, metadata: Record<string, any> = {}): Promise<string[]> {
    try {
      const document: Document = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        content: text,
        metadata: {
          source: metadata.source || 'text',
          type: 'text',
          ...metadata,
        },
      };

      // Add document using RAG service
      // RAGService expects documents with id, text, metadata, and optionally embedding
      await (this.ragService as any).addDocuments([{
        id: document.id,
        text: document.content,
        metadata: document.metadata,
      }]);
      logger.info('Text document ingested', { documentId: document.id });
      return [document.id];
    } catch (error) {
      logger.error('Error ingesting text document', { error });
      throw error;
    }
  }

  /**
   * Ingest file
   */
  async ingestFile(filePath: string, options: IngestionOptions = {}): Promise<string[]> {
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const fileExt = path.extname(filePath).toLowerCase();
      
      let content = fileContent;
      const metadata: Record<string, any> = {
        source: filePath,
        type: fileExt.substring(1),
        ...options.metadata,
      };

      // Handle different file types
      if (fileExt === '.pdf') {
        // PDF parsing would be done here
        // For now, we'll use text content
        content = fileContent;
      } else if (fileExt === '.md' || fileExt === '.markdown') {
        content = fileContent;
      } else if (fileExt === '.txt') {
        content = fileContent;
      }

      return await this.ingestText(content, metadata);
    } catch (error) {
      logger.error('Error ingesting file', { filePath, error });
      throw error;
    }
  }

  /**
   * Ingest multiple documents
   */
  async ingestDocuments(documents: Document[]): Promise<string[]> {
    try {
      // Convert to RAG service format
      const ragDocuments = documents.map(doc => ({
        id: doc.id,
        text: doc.content,
        metadata: doc.metadata,
      }));
      
      await (this.ragService as any).addDocuments(ragDocuments);
      const ids = documents.map(doc => doc.id);
      logger.info('Documents ingested', { count: documents.length });
      return ids;
    } catch (error) {
      logger.error('Error ingesting documents', { error });
      throw error;
    }
  }

  /**
   * Ingest from URL
   */
  async ingestFromURL(url: string, options: IngestionOptions = {}): Promise<string[]> {
    try {
      const response = await fetch(url);
      const content = await response.text();
      
      const metadata: Record<string, any> = {
        source: url,
        type: 'url',
        ...options.metadata,
      };

      return await this.ingestText(content, metadata);
    } catch (error) {
      logger.error('Error ingesting from URL', { url, error });
      throw error;
    }
  }
}
