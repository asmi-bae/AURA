/**
 * Error Handler
 * 
 * Utilities for handling AI provider errors.
 * 
 * @module @aura/ai/utils/error-handler
 */

import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * AI Provider Error
 */
export class AIProviderError extends Error {
  constructor(
    message: string,
    public provider: string,
    public statusCode?: number,
    public originalError?: any
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}

/**
 * Handle API errors
 */
export function handleAPIError(error: any, provider: string): never {
  if (error.response) {
    const statusCode = error.response.status;
    const message = error.response.data?.error?.message || error.message;
    
    logger.error('AI provider API error', {
      provider,
      statusCode,
      message,
      error: error.response.data,
    });
    
    throw new AIProviderError(message, provider, statusCode, error);
  }
  
  logger.error('AI provider error', {
    provider,
    error: error.message,
  });
  
  throw new AIProviderError(error.message, provider, undefined, error);
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  if (error instanceof AIProviderError) {
    // Retry on 5xx errors or rate limits
    return error.statusCode ? 
      (error.statusCode >= 500 || error.statusCode === 429) : 
      true;
  }
  
  // Network errors are retryable
  return error.code === 'ECONNRESET' || 
         error.code === 'ETIMEDOUT' ||
         error.code === 'ENOTFOUND';
}

