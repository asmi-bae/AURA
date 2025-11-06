/**
 * Message Formatter
 * 
 * Utilities for formatting messages for different AI providers.
 * 
 * @module @aura/ai/utils/message-formatter
 */

import { ChatMessage } from '../core/interfaces';

/**
 * Format messages for OpenAI API
 */
export function formatMessagesForOpenAI(messages: ChatMessage[]): any[] {
  return messages.map(msg => ({
    role: msg.role,
    content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
    ...(msg.name && { name: msg.name }),
    ...(msg.toolCalls && { tool_calls: msg.toolCalls }),
    ...(msg.toolCallId && { tool_call_id: msg.toolCallId }),
  }));
}

/**
 * Format messages for Anthropic API
 */
export function formatMessagesForAnthropic(messages: ChatMessage[]): any[] {
  return messages.map(msg => ({
    role: msg.role === 'tool' ? 'user' : msg.role,
    content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
  }));
}

/**
 * Format messages for Google API
 */
export function formatMessagesForGoogle(messages: ChatMessage[]): any[] {
  return messages.map(msg => ({
    role: msg.role === 'tool' ? 'user' : msg.role,
    parts: typeof msg.content === 'string' 
      ? [{ text: msg.content }]
      : msg.content,
  }));
}

/**
 * Format messages for generic API
 */
export function formatMessagesGeneric(messages: ChatMessage[]): any[] {
  return messages.map(msg => ({
    role: msg.role,
    content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
  }));
}

