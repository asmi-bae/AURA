/**
 * Document Chunker
 * 
 * Splits documents into chunks for embedding and retrieval.
 * Supports multiple chunking strategies.
 * 
 * @module @aura/ai/rag
 */

import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * Chunking strategy
 */
export type ChunkingStrategy = 'fixed-size' | 'sentence' | 'paragraph' | 'semantic';

/**
 * Document chunk
 */
export interface DocumentChunk {
  id: string;
  text: string;
  metadata: {
    documentId: string;
    chunkIndex: number;
    startOffset: number;
    endOffset: number;
    [key: string]: any;
  };
}

/**
 * Chunking options
 */
export interface ChunkingOptions {
  /** Chunking strategy */
  strategy?: ChunkingStrategy;
  /** Maximum chunk size (characters) */
  maxChunkSize?: number;
  /** Overlap between chunks (characters) */
  overlap?: number;
  /** Minimum chunk size */
  minChunkSize?: number;
}

/**
 * Document Chunker
 * 
 * Splits documents into chunks for embedding.
 */
export class DocumentChunker {
  private defaultMaxChunkSize: number = 1000;
  private defaultOverlap: number = 200;
  private defaultMinChunkSize: number = 100;

  /**
   * Chunk a document
   * 
   * @param documentId - Document ID
   * @param text - Document text
   * @param options - Chunking options
   * @returns Array of document chunks
   */
  chunk(
    documentId: string,
    text: string,
    options: ChunkingOptions = {}
  ): DocumentChunk[] {
    const strategy = options.strategy || 'fixed-size';
    const maxChunkSize = options.maxChunkSize || this.defaultMaxChunkSize;
    const overlap = options.overlap || this.defaultOverlap;
    const minChunkSize = options.minChunkSize || this.defaultMinChunkSize;

    logger.debug('Chunking document', {
      documentId,
      strategy,
      textLength: text.length,
      maxChunkSize,
    });

    switch (strategy) {
      case 'fixed-size':
        return this.fixedSizeChunk(documentId, text, maxChunkSize, overlap, minChunkSize);
      case 'sentence':
        return this.sentenceChunk(documentId, text, maxChunkSize, overlap);
      case 'paragraph':
        return this.paragraphChunk(documentId, text, maxChunkSize, overlap);
      case 'semantic':
        return this.semanticChunk(documentId, text, maxChunkSize, overlap);
      default:
        return this.fixedSizeChunk(documentId, text, maxChunkSize, overlap, minChunkSize);
    }
  }

  /**
   * Fixed-size chunking
   */
  private fixedSizeChunk(
    documentId: string,
    text: string,
    maxChunkSize: number,
    overlap: number,
    minChunkSize: number
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    let offset = 0;
    let chunkIndex = 0;

    while (offset < text.length) {
      const chunkEnd = Math.min(offset + maxChunkSize, text.length);
      let chunkText = text.slice(offset, chunkEnd);

      // Try to break at word boundary if not at end
      if (chunkEnd < text.length) {
        const lastSpace = chunkText.lastIndexOf(' ');
        if (lastSpace > minChunkSize) {
          chunkText = chunkText.slice(0, lastSpace);
          offset += lastSpace + 1;
        } else {
          offset = chunkEnd;
        }
      } else {
        offset = chunkEnd;
      }

      if (chunkText.trim().length >= minChunkSize) {
        chunks.push({
          id: `${documentId}-chunk-${chunkIndex}`,
          text: chunkText.trim(),
          metadata: {
            documentId,
            chunkIndex,
            startOffset: offset - chunkText.length,
            endOffset: offset,
          },
        });
        chunkIndex++;

        // Move offset back by overlap for next chunk
        offset -= overlap;
        if (offset < 0) offset = 0;
      } else {
        offset = chunkEnd;
      }
    }

    return chunks;
  }

  /**
   * Sentence-based chunking
   */
  private sentenceChunk(
    documentId: string,
    text: string,
    maxChunkSize: number,
    overlap: number
  ): DocumentChunk[] {
    // Split by sentence boundaries
    const sentences = text.split(/([.!?]\s+)/);
    const chunks: DocumentChunk[] = [];
    let currentChunk: string[] = [];
    let currentSize = 0;
    let chunkIndex = 0;
    let offset = 0;

    for (let i = 0; i < sentences.length; i += 2) {
      const sentence = (sentences[i] || '') + (sentences[i + 1] || '');
      const sentenceSize = sentence.length;

      if (currentSize + sentenceSize > maxChunkSize && currentChunk.length > 0) {
        // Create chunk
        const chunkText = currentChunk.join('');
        chunks.push({
          id: `${documentId}-chunk-${chunkIndex}`,
          text: chunkText.trim(),
          metadata: {
            documentId,
            chunkIndex,
            startOffset: offset - chunkText.length,
            endOffset: offset,
          },
        });
        chunkIndex++;

        // Keep overlap sentences
        const overlapSentences = this.getOverlapSentences(
          currentChunk,
          overlap
        );
        currentChunk = overlapSentences;
        currentSize = overlapSentences.join('').length;
      }

      currentChunk.push(sentence);
      currentSize += sentenceSize;
      offset += sentenceSize;
    }

    // Add remaining chunk
    if (currentChunk.length > 0) {
      const chunkText = currentChunk.join('');
      chunks.push({
        id: `${documentId}-chunk-${chunkIndex}`,
        text: chunkText.trim(),
        metadata: {
          documentId,
          chunkIndex,
          startOffset: offset - chunkText.length,
          endOffset: offset,
        },
      });
    }

    return chunks;
  }

  /**
   * Paragraph-based chunking
   */
  private paragraphChunk(
    documentId: string,
    text: string,
    maxChunkSize: number,
    overlap: number
  ): DocumentChunk[] {
    const paragraphs = text.split(/\n\s*\n/);
    const chunks: DocumentChunk[] = [];
    let currentChunk: string[] = [];
    let currentSize = 0;
    let chunkIndex = 0;
    let offset = 0;

    for (const paragraph of paragraphs) {
      const paragraphSize = paragraph.length;

      if (currentSize + paragraphSize > maxChunkSize && currentChunk.length > 0) {
        const chunkText = currentChunk.join('\n\n');
        chunks.push({
          id: `${documentId}-chunk-${chunkIndex}`,
          text: chunkText.trim(),
          metadata: {
            documentId,
            chunkIndex,
            startOffset: offset - chunkText.length,
            endOffset: offset,
          },
        });
        chunkIndex++;

        // Keep overlap
        currentChunk = [paragraph];
        currentSize = paragraphSize;
      } else {
        currentChunk.push(paragraph);
        currentSize += paragraphSize + 2; // +2 for \n\n
      }

      offset += paragraphSize + 2;
    }

    // Add remaining chunk
    if (currentChunk.length > 0) {
      const chunkText = currentChunk.join('\n\n');
      chunks.push({
        id: `${documentId}-chunk-${chunkIndex}`,
        text: chunkText.trim(),
        metadata: {
          documentId,
          chunkIndex,
          startOffset: offset - chunkText.length,
          endOffset: offset,
        },
      });
    }

    return chunks;
  }

  /**
   * Semantic chunking (simplified - uses sentence boundaries)
   */
  private semanticChunk(
    documentId: string,
    text: string,
    maxChunkSize: number,
    overlap: number
  ): DocumentChunk[] {
    // For now, use sentence-based chunking
    // In production, this could use embeddings to find semantic boundaries
    return this.sentenceChunk(documentId, text, maxChunkSize, overlap);
  }

  /**
   * Get overlap sentences for next chunk
   */
  private getOverlapSentences(sentences: string[], overlapSize: number): string[] {
    const overlap: string[] = [];
    let size = 0;

    for (let i = sentences.length - 1; i >= 0 && size < overlapSize; i--) {
      overlap.unshift(sentences[i]);
      size += sentences[i].length;
    }

    return overlap;
  }
}





