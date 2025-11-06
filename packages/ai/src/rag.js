"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RAG = void 0;
const openai_1 = __importDefault(require("openai"));
const utils_1 = require("@aura/utils");
class RAG {
    openai;
    logger = (0, utils_1.createLogger)();
    vectorStore;
    constructor(apiKey, vectorStore) {
        this.openai = new openai_1.default({ apiKey });
        this.vectorStore = vectorStore;
    }
    async generateEmbedding(text, options = {}) {
        try {
            const response = await this.openai.embeddings.create({
                model: options.model || 'text-embedding-3-small',
                input: text,
                dimensions: options.dimensions,
            });
            return response.data[0].embedding;
        }
        catch (error) {
            this.logger.error('Error generating embedding', { error, text });
            throw error;
        }
    }
    async generateEmbeddings(texts, options = {}) {
        try {
            const response = await this.openai.embeddings.create({
                model: options.model || 'text-embedding-3-small',
                input: texts,
                dimensions: options.dimensions,
            });
            return response.data.map(item => item.embedding);
        }
        catch (error) {
            this.logger.error('Error generating embeddings', { error });
            throw error;
        }
    }
    async addDocuments(documents) {
        if (!this.vectorStore) {
            throw new Error('Vector store not configured');
        }
        await this.vectorStore.addDocuments(documents);
    }
    async search(query, topK = 5) {
        if (!this.vectorStore) {
            throw new Error('Vector store not configured');
        }
        return this.vectorStore.search(query, topK);
    }
    async retrieveContext(query, topK = 5) {
        const results = await this.search(query, topK);
        return results.map(r => r.text).join('\n\n');
    }
}
exports.RAG = RAG;
