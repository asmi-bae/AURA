import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { createLogger } from '@aura/utils';
import { JWTService } from '@aura/auth';
import Redis from 'ioredis';
import { authRoutes } from './routes/auth.routes';
import { userRoutes } from './routes/user.routes';
import { agentRoutes } from './routes/agent.routes';
import { pluginRoutes } from './routes/plugin.routes';
import { createAuthMiddleware } from './middlewares/auth';
import { createRateLimitMiddleware } from './middlewares/rateLimit';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

const logger = createLogger();
const app = Fastify({ logger: false });

const port = Number(process.env.PORT || 3000);
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD,
});

const jwtService = new JWTService(process.env.JWT_SECRET || 'aura-secret-key');

// Subscribe to Redis channel and forward to WebSocket
async function subscribeToChannel(channel: string, socket: any) {
  const subscriber = redis.duplicate();
  await subscriber.subscribe(channel);

  subscriber.on('message', (ch, message) => {
    if (ch === channel && socket.readyState === 1) {
      socket.send(JSON.stringify({
        type: 'message',
        channel: ch,
        data: JSON.parse(message),
      }));
    }
  });
}

// Initialize and start server
async function startServer() {
  try {
    // Register plugins
    await app.register(cors, {
      origin: process.env.CORS_ORIGIN?.split(',') || '*',
      credentials: true,
    });

    await app.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
    });

    await app.register(websocket);

    // Register error handlers
    app.setErrorHandler(errorHandler);
    app.setNotFoundHandler(notFoundHandler);

    // Register routes
    await app.register(authRoutes, { prefix: '/api/v1' });
    await app.register(userRoutes, { prefix: '/api/v1' });
    await app.register(agentRoutes, { prefix: '/api/v1' });
    await app.register(pluginRoutes, { prefix: '/api/v1' });

    // Protected routes (require authentication)
    app.addHook('onRequest', async (request, reply) => {
      // Skip auth for public routes
      const publicRoutes = ['/health', '/api/v1/auth/login', '/api/v1/auth/google', '/api/v1/auth/github'];
      if (publicRoutes.some(route => request.url.startsWith(route))) {
        return;
        }

      // Apply authentication middleware
      await createAuthMiddleware(jwtService)(request as any, reply);
    });

    // Apply rate limiting to all routes
    app.addHook('onRequest', createRateLimitMiddleware(redis, {
      windowMs: 60000,
      max: 100,
    }));

    // Health check
    app.get('/health', async (request, reply) => {
      return { status: 'ok', service: 'gateway', timestamp: new Date().toISOString() };
    });

    // REST API routes
    app.get('/api/v1/status', async (request, reply) => {
      return { status: 'ok', version: '1.0.0' };
    });

    // WebSocket routes
    app.register(async (fastify) => {
      fastify.get('/ws', { websocket: true }, (connection: any, req: any) => {
        const socket = connection;
        let user: any = null;

        // Authenticate WebSocket connection
        const token = req.url?.split('token=')[1];
        if (!token) {
          socket.close(1008, 'Unauthorized');
          return;
        }

        try {
          const payload = jwtService.verify(token);
          user = payload;
          (socket as any).user = payload;
        } catch (error) {
          socket.close(1008, 'Invalid token');
          return;
        }

        logger.info('WebSocket connection established', { userId: user?.userId });

        socket.on('message', async (message: Buffer) => {
          try {
            const data = JSON.parse(message.toString());
            
            // Handle different message types
            switch (data.type) {
              case 'ping':
                socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                break;

              case 'subscribe':
                // Subscribe to Redis pub/sub channel
                const channel = data.channel || `user:${user?.userId}`;
                await subscribeToChannel(channel, socket);
                socket.send(JSON.stringify({ type: 'subscribed', channel }));
                break;

              case 'publish':
                // Publish message to Redis
                await redis.publish(data.channel, JSON.stringify(data.message));
                socket.send(JSON.stringify({ type: 'published', channel: data.channel }));
                break;

              default:
                logger.warn('Unknown message type', { type: data.type });
            }
          } catch (error) {
            logger.error('Error handling WebSocket message', { error });
            socket.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
          }
        });

        socket.on('close', () => {
          logger.info('WebSocket connection closed', { userId: user?.userId });
        });

        socket.on('error', (error: any) => {
          logger.error('WebSocket error', { error });
        });
      });
    });

    // Start server
    await app.listen({ port, host: '0.0.0.0' });
    logger.info(`Gateway service running on ${app.server.address()}`);
  } catch (error) {
    logger.error('Error starting gateway', { error });
    process.exit(1);
  }
}

// Start the server
startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await app.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await app.close();
  process.exit(0);
});
