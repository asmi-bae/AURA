/**
 * Token Counter
 * 
 * Utilities for counting tokens in text.
 * 
 * @module @aura/ai/utils/token-counter
 */

/**
 * Rough token count estimation (4 characters per token)
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Count tokens more accurately using word count
 */
export function countTokensByWords(text: string): number {
  const words = text.trim().split(/\s+/);
  return words.length * 1.3; // Average 1.3 tokens per word
}

/**
 * Count tokens in messages
 */
export function countTokensInMessages(messages: any[]): number {
  return messages.reduce((count, msg) => {
    const content = typeof msg.content === 'string' 
      ? msg.content 
      : JSON.stringify(msg.content);
    return count + estimateTokenCount(content);
  }, 0);
}

