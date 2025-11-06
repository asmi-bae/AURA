/**
 * AI Model Types
 * 
 * Model-specific types and interfaces.
 * For shared types, see @aura/ai/types
 * 
 * @module @aura/ai/models/types
 */

// Re-export shared types from main types package
export type {
  AIMessage,
  ModelResponse,
  StreamChunk,
  BaseModelService,
} from '../types';

// Re-export ModelCapabilities from core/interfaces
export type { ModelCapabilities } from '../core/interfaces';

/**
 * Model-specific types that are not shared across the package
 * Add any model-specific interfaces here
 */

