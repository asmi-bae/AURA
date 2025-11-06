/**
 * Retry Handler
 * 
 * Utilities for retrying API calls with exponential backoff.
 * 
 * @module @aura/ai/utils/retry-handler
 */

import { createLogger } from '@aura/utils';
import { isRetryableError } from './error-handler';

const logger = createLogger();

/**
 * Retry options
 */
export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryable?: (error: any) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryable: isRetryableError,
};

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if error is retryable
      if (!opts.retryable(error)) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === opts.maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt),
        opts.maxDelay
      );
      
      logger.warn(`Retry attempt ${attempt + 1}/${opts.maxRetries} after ${delay}ms`, {
        error: error instanceof Error ? error.message : String(error),
      });
      
      await sleep(delay);
    }
  }
  
  throw lastError;
}

