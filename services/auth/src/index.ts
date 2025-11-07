import express from 'express';
import session from 'express-session';
import { 
  JWTService, 
  CredentialsService, 
  OAuthService,
  TwoFactorService,
  RBACService,
  SecurityService,
} from '@aura/auth';
import { initializeDataSource, AppDataSource } from '@aura/db';
import { createLogger } from '@aura/utils';
import { initConfig } from '@aura/config';
import { ServiceRegistration } from '@aura/core';
import Redis from 'ioredis';
import { authRoutes } from './routes/auth.routes';
import { userRoutes } from './routes/user.routes';
import { oauthRoutes } from './routes/oauth.routes';

const logger = createLogger();
const app = express();
const port = process.env.PORT || 3013;

// Initialize configuration
initConfig();

// Initialize Redis for session store
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD,
});

// Initialize database
await initializeDataSource();

// Service registration
const serviceRegistration = new ServiceRegistration({
  id: 'auth-service',
  name: 'Auth Service',
  version: '1.0.0',
  url: `http://${process.env.SERVICE_HOST || 'localhost'}:${port}`,
  metadata: {
    description: 'Authentication and authorization service',
  },
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'aura-session-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Initialize auth services
const jwtService = new JWTService(
  process.env.JWT_SECRET || 'aura-jwt-secret-change-in-production-32-characters-minimum'
);

const credentialsService = new CredentialsService();

const oauthService = new OAuthService({
  google: {
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
  },
  github: {
    clientID: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    callbackURL: process.env.GITHUB_CALLBACK_URL || '/auth/github/callback',
  },
  microsoft: {
    clientID: process.env.MICROSOFT_CLIENT_ID || '',
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
    callbackURL: process.env.MICROSOFT_CALLBACK_URL || '/auth/microsoft/callback',
    tenant: process.env.MICROSOFT_TENANT || 'common',
  },
  apple: {
    clientID: process.env.APPLE_CLIENT_ID || '',
    teamID: process.env.APPLE_TEAM_ID || '',
    keyID: process.env.APPLE_KEY_ID || '',
    privateKey: process.env.APPLE_PRIVATE_KEY || '',
    callbackURL: process.env.APPLE_CALLBACK_URL || '/auth/apple/callback',
  },
});

const twoFactorService = new TwoFactorService();
const rbacService = new RBACService();
const securityService = new SecurityService();

// Apply security middleware
// Apply security middleware (skip if causing type issues in development)
// app.use(securityService.getRateLimiter() as any);
// app.use(securityService.getSlowDown());
app.use(securityService.getHelmetMiddleware());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'auth-service',
    timestamp: new Date().toISOString(),
  });
});

// Register routes
app.use('/api/v1/auth', authRoutes({
  credentialsService,
  jwtService,
  twoFactorService,
}));

app.use('/api/v1/users', userRoutes({
  credentialsService,
  rbacService,
  jwtService,
}));

app.use('/api/v1/oauth', oauthRoutes({
  oauthService,
  jwtService,
}));

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Error in auth service', { error: err });
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Start server
const server = app.listen(port, async () => {
  logger.info(`Auth service running on port ${port}`);
  
  // Register with registry service
  await serviceRegistration.register();
  serviceRegistration.setupGracefulShutdown();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await serviceRegistration.unregister();
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await serviceRegistration.unregister();
  server.close(() => {
    process.exit(0);
  });
});