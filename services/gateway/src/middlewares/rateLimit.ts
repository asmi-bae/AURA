/**
 * Rate Limit Middleware
 * 
 * Rate limiting middleware for Fastify
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import Redis from 'ioredis';

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Create rate limit middleware
 */
export function createRateLimitMiddleware(redis: Redis, options: RateLimitOptions) {
  const {
    windowMs = 60000, // 1 minute
    max = 100,
    message = 'Too many requests, please try again later',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options;

  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const key = getRateLimitKey(request);
      const count = await redis.incr(key);

      if (count === 1) {
        await redis.pexpire(key, windowMs);
      }

      const ttl = await redis.pttl(key);
      reply.header('X-RateLimit-Limit', max.toString());
      reply.header('X-RateLimit-Remaining', Math.max(0, max - count).toString());
      reply.header('X-RateLimit-Reset', new Date(Date.now() + ttl).toISOString());

      if (count > max) {
        return reply.code(429).send({ error: message });
      }
    } catch (error) {
      // If Redis fails, allow the request (fail open)
      console.error('Rate limit error:', error);
    }
  };
}

/**
 * Get rate limit key for request
 */
function getRateLimitKey(request: FastifyRequest): string {
  const ip = request.ip || request.socket.remoteAddress || 'unknown';
  const path = request.url.split('?')[0];
  return `rate_limit:${ip}:${path}`;
}
