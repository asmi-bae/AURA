"use strict";
/**
 * Response Cache
 *
 * Multi-level caching strategy for AI model responses.
 * Implements memory cache, disk cache, embedding cache, and RAG cache.
 *
 * Features:
 * - Memory cache for hot responses (< 1 minute)
 * - Disk cache for recent responses (< 1 hour)
 * - Embedding cache for vector embeddings (persistent)
 * - RAG cache for retrieved contexts (TTL-based)
 * - Cache invalidation and cleanup
 *
 * @module @aura/ai/registry
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseCache = void 0;
const utils_1 = require("@aura/utils");
const crypto = __importStar(require("crypto"));
const logger = (0, utils_1.createLogger)();
/**
 * Response Cache
 *
 * Manages multi-level caching for AI model responses.
 */
class ResponseCache {
    config;
    memoryCache = new Map();
    logger = (0, utils_1.createLogger)();
    constructor(config = {}) {
        this.config = {
            memoryCacheSize: config.memoryCacheSize || 1000,
            memoryCacheTTL: config.memoryCacheTTL || 60000, // 1 minute
            diskCacheEnabled: config.diskCacheEnabled ?? false,
            diskCachePath: config.diskCachePath || './.cache',
            embeddingCacheEnabled: config.embeddingCacheEnabled ?? true,
            ragCacheEnabled: config.ragCacheEnabled ?? true,
            ragCacheTTL: config.ragCacheTTL || 3600000, // 1 hour
        };
        // Cleanup expired entries periodically
        setInterval(() => {
            this.cleanup();
        }, 60000); // Every minute
        logger.info('Response cache initialized', {
            memoryCacheSize: this.config.memoryCacheSize,
            memoryCacheTTL: this.config.memoryCacheTTL,
        });
    }
    /**
     * Get value from cache
     */
    get(key) {
        const entry = this.memoryCache.get(key);
        if (!entry) {
            return null;
        }
        // Check expiration
        if (entry.expiresAt < new Date()) {
            this.memoryCache.delete(key);
            return null;
        }
        // Update access stats
        entry.accessCount++;
        entry.lastAccessed = new Date();
        logger.debug('Cache hit', { key });
        return entry.value;
    }
    /**
     * Set value in cache
     */
    set(key, value, ttl) {
        const ttlMs = ttl || this.config.memoryCacheTTL;
        const expiresAt = new Date(Date.now() + ttlMs);
        // Evict oldest entries if cache is full
        if (this.memoryCache.size >= this.config.memoryCacheSize) {
            this.evictOldest();
        }
        const entry = {
            key,
            value,
            timestamp: new Date(),
            expiresAt,
            accessCount: 0,
            lastAccessed: new Date(),
        };
        this.memoryCache.set(key, entry);
        logger.debug('Cache set', { key, ttl: ttlMs });
    }
    /**
     * Generate cache key
     */
    generateKey(params) {
        const hashInput = JSON.stringify({
            model: params.model,
            task: params.task,
            input: params.input,
            temperature: params.temperature,
            maxTokens: params.maxTokens,
        });
        const hash = crypto.createHash('sha256').update(hashInput).digest('hex');
        return `${params.model}:${params.task}:${hash}`;
    }
    /**
     * Cache embedding
     */
    cacheEmbedding(text, embedding) {
        if (!this.config.embeddingCacheEnabled) {
            return;
        }
        const key = `embedding:${this.hashText(text)}`;
        this.set(key, embedding, 86400000 * 7); // 7 days
    }
    /**
     * Get cached embedding
     */
    getCachedEmbedding(text) {
        if (!this.config.embeddingCacheEnabled) {
            return null;
        }
        const key = `embedding:${this.hashText(text)}`;
        return this.get(key);
    }
    /**
     * Cache RAG context
     */
    cacheRAGContext(query, context) {
        if (!this.config.ragCacheEnabled) {
            return;
        }
        const key = `rag:${this.hashText(query)}`;
        this.set(key, context, this.config.ragCacheTTL);
    }
    /**
     * Get cached RAG context
     */
    getCachedRAGContext(query) {
        if (!this.config.ragCacheEnabled) {
            return null;
        }
        const key = `rag:${this.hashText(query)}`;
        return this.get(key);
    }
    /**
     * Evict oldest entries
     */
    evictOldest() {
        const entries = Array.from(this.memoryCache.entries())
            .sort((a, b) => a[1].lastAccessed.getTime() - b[1].lastAccessed.getTime());
        // Evict 10% of cache
        const evictCount = Math.floor(this.config.memoryCacheSize * 0.1);
        for (let i = 0; i < evictCount && i < entries.length; i++) {
            this.memoryCache.delete(entries[i][0]);
        }
        logger.debug('Evicted oldest cache entries', { count: evictCount });
    }
    /**
     * Cleanup expired entries
     */
    cleanup() {
        const now = new Date();
        let cleaned = 0;
        for (const [key, entry] of this.memoryCache.entries()) {
            if (entry.expiresAt < now) {
                this.memoryCache.delete(key);
                cleaned++;
            }
        }
        if (cleaned > 0) {
            logger.debug('Cleaned up expired cache entries', { count: cleaned });
        }
    }
    /**
     * Hash text for cache key
     */
    hashText(text) {
        return crypto.createHash('sha256').update(text).digest('hex').substring(0, 16);
    }
    /**
     * Clear all cache
     */
    clear() {
        this.memoryCache.clear();
        logger.info('Cache cleared');
    }
    /**
     * Get cache statistics
     */
    getStats() {
        let totalAccesses = 0;
        let totalHits = 0;
        for (const entry of this.memoryCache.values()) {
            totalAccesses += entry.accessCount;
            if (entry.accessCount > 0) {
                totalHits++;
            }
        }
        const hitRate = totalAccesses > 0 ? totalHits / totalAccesses : 0;
        return {
            size: this.memoryCache.size,
            maxSize: this.config.memoryCacheSize,
            hitRate,
            entries: this.memoryCache.size,
        };
    }
}
exports.ResponseCache = ResponseCache;
