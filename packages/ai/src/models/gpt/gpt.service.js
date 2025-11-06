"use strict";
/**
 * OpenAI GPT Integration
 *
 * Service for interacting with OpenAI's GPT models (GPT-4, GPT-4 Turbo, GPT-3.5, etc.)
 * Supports chat completions, function calling, and streaming responses.
 *
 * Features:
 * - Chat completions with conversation history
 * - Function calling for tool integration
 * - Streaming responses for real-time updates
 * - Configurable models, temperature, and tokens
 *
 * @module @aura/ai/models/gpt
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GPTService = void 0;
const openai_1 = __importDefault(require("openai"));
const utils_1 = require("@aura/utils");
const logger = (0, utils_1.createLogger)();
/**
 * OpenAI GPT Integration Service
 *
 * Provides methods for interacting with OpenAI's GPT models.
 */
class GPTService {
    openai;
    defaultModel;
    defaultTemperature;
    defaultMaxTokens;
    constructor(config) {
        if (!config.apiKey) {
            throw new Error('OpenAI API key is required');
        }
        this.openai = new openai_1.default({
            apiKey: config.apiKey,
            baseURL: config.baseURL,
        });
        this.defaultModel = config.model || 'gpt-4-turbo-preview';
        this.defaultTemperature = config.temperature ?? 0.7;
        this.defaultMaxTokens = config.maxTokens ?? 2000;
        logger.info('GPT service initialized', {
            model: this.defaultModel,
            baseURL: config.baseURL,
        });
    }
    /**
     * Generate chat completion
     *
     * @param messages - Conversation messages
     * @param options - Optional configuration
     * @returns Generated text response
     */
    async chatCompletion(messages, options) {
        try {
            // Don't allow streaming in this method - use streamChatCompletion instead
            if (options?.stream) {
                throw new Error('Use streamChatCompletion for streaming responses');
            }
            const response = await this.openai.chat.completions.create({
                model: options?.model || this.defaultModel,
                messages,
                temperature: options?.temperature ?? this.defaultTemperature,
                max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
                stream: false,
            });
            const content = response.choices[0]?.message?.content;
            if (!content) {
                throw new Error('No content in response');
            }
            logger.debug('GPT chat completion successful', {
                model: options?.model || this.defaultModel,
                tokens: response.usage?.total_tokens,
            });
            return content;
        }
        catch (error) {
            logger.error('Error in GPT chat completion', {
                error: error instanceof Error ? error.message : 'Unknown error',
                model: options?.model || this.defaultModel,
            });
            throw error;
        }
    }
    /**
     * Function calling - GPT decides which functions to call
     *
     * @param messages - Conversation messages
     * @param functions - Available functions to call
     * @param options - Optional configuration
     * @returns Function calls or null if no functions called
     */
    async functionCalling(messages, functions, options) {
        try {
            const response = await this.openai.chat.completions.create({
                model: options?.model || this.defaultModel,
                messages,
                temperature: options?.temperature ?? this.defaultTemperature,
                max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
                tools: functions.map(fn => ({
                    type: 'function',
                    function: fn,
                })),
                tool_choice: 'auto',
            });
            const toolCalls = response.choices[0].message.tool_calls;
            if (!toolCalls || toolCalls.length === 0) {
                return null;
            }
            logger.debug('GPT function calling successful', {
                functionsCalled: toolCalls.length,
            });
            return toolCalls.map((toolCall) => ({
                name: toolCall.function.name,
                arguments: JSON.parse(toolCall.function.arguments),
            }));
        }
        catch (error) {
            logger.error('Error in GPT function calling', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    /**
     * Stream chat completion for real-time responses
     *
     * @param messages - Conversation messages
     * @param onChunk - Callback for each chunk
     * @param options - Optional configuration
     */
    async streamChatCompletion(messages, onChunk, options) {
        try {
            const stream = await this.openai.chat.completions.create({
                model: options?.model || this.defaultModel,
                messages,
                temperature: options?.temperature ?? this.defaultTemperature,
                max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
                stream: true,
            });
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                    onChunk(content);
                }
            }
            logger.debug('GPT stream completion finished');
        }
        catch (error) {
            logger.error('Error in GPT stream chat completion', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    /**
     * Generate embeddings for text
     *
     * @param text - Text to embed
     * @param model - Embedding model to use
     * @returns Embedding vector
     */
    async generateEmbedding(text, model = 'text-embedding-3-small') {
        try {
            const response = await this.openai.embeddings.create({
                model,
                input: text,
            });
            return response.data[0].embedding;
        }
        catch (error) {
            logger.error('Error generating GPT embedding', { error });
            throw error;
        }
    }
    /**
     * Generate embeddings for multiple texts
     *
     * @param texts - Array of texts to embed
     * @param model - Embedding model to use
     * @returns Array of embedding vectors
     */
    async generateEmbeddings(texts, model = 'text-embedding-3-small') {
        try {
            const response = await this.openai.embeddings.create({
                model,
                input: texts,
            });
            return response.data.map(item => item.embedding);
        }
        catch (error) {
            logger.error('Error generating GPT embeddings', { error });
            throw error;
        }
    }
}
exports.GPTService = GPTService;
