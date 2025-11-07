/**
 * Error Handler Middleware
 * 
 * Global error handling middleware for Fastify
 */

import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * Error handler
 */
export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  logger.error('Request error', {
    method: request.method,
    url: request.url,
    error: error.message,
    stack: error.stack,
  });

  // Determine status code
  const statusCode = error.statusCode || 500;

  // Determine error message
  let message = error.message || 'Internal Server Error';
  
  if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    message = 'Internal Server Error';
  }

  // Send error response
  reply.code(statusCode).send({
    error: {
      message,
      statusCode,
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack,
      }),
    },
  });
}

/**
 * 404 handler
 */
export async function notFoundHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  reply.code(404).send({
    error: {
      message: `Route ${request.method} ${request.url} not found`,
      statusCode: 404,
    },
  });
}
