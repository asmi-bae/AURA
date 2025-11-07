/**
 * Authentication Middleware
 * 
 * JWT authentication middleware for Fastify
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { JWTService } from '@aura/auth';

export interface AuthRequest extends FastifyRequest {
  user?: {
    userId: string;
    email?: string;
    roles?: string[];
  };
}

/**
 * Create authentication middleware
 */
export function createAuthMiddleware(jwtService: JWTService) {
  return async (request: AuthRequest, reply: FastifyReply) => {
    try {
      const token = extractToken(request);
      
      if (!token) {
        return reply.code(401).send({ error: 'Unauthorized: No token provided' });
      }

      const payload = jwtService.verify(token);
      request.user = payload as any;
    } catch (error) {
      return reply.code(401).send({ error: 'Unauthorized: Invalid token' });
    }
  };
}

/**
 * Extract token from request
 */
function extractToken(request: FastifyRequest): string | null {
  // Try Authorization header
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try query parameter
  const query = request.query as { token?: string };
  if (query?.token) {
    return query.token;
  }

  // Try cookie (requires @fastify/cookie plugin)
  // Note: Cookies not currently supported without @fastify/cookie plugin
  // const cookies = (request as any).cookies as { token?: string } | undefined;
  // if (cookies?.token) {
  //   return cookies.token;
  // }

  return null;
}
