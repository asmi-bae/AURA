/**
 * Example integration for AURA Auth Service
 * 
 * This file demonstrates how to use the enhanced auth service
 * with all OAuth providers and credential-based authentication.
 * 
 * NOTE: This is an example file. For actual usage, uncomment the Express code
 * and ensure Express is installed in your project.
 */

// Example Express setup (uncomment when using Express)
/*
import express from 'express';
const app = express();
app.use(express.json());
*/

import { OAuthService } from './oauth-complete';
import { CredentialsService } from './credentials';
import { TwoFactorService } from './two-factor';
import { SecurityService } from './security';
import { RBACService } from './rbac';

// Initialize services
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

const credentialsService = new CredentialsService();
const twoFactorService = new TwoFactorService('AURA');
const securityService = new SecurityService();
const rbacService = new RBACService();

// Example usage (uncomment when using Express):
/*
// Apply security middleware
app.use(securityService.getHelmetMiddleware());
app.use(securityService.getRateLimiter());
app.use(securityService.getSlowDown());

// OAuth Routes
app.get('/auth/google', oauthService.getAuthMiddleware('google'));
app.get('/auth/google/callback', oauthService.getCallbackMiddleware('google'), (req: any, res: any) => {
  const user = req.user as any;
  const token = oauthService.generateToken(user);
  res.json({ token, user });
});

app.get('/auth/github', oauthService.getAuthMiddleware('github'));
app.get('/auth/github/callback', oauthService.getCallbackMiddleware('github'), (req: any, res: any) => {
  const user = req.user as any;
  const token = oauthService.generateToken(user);
  res.json({ token, user });
});

app.get('/auth/microsoft', oauthService.getAuthMiddleware('microsoft'));
app.get('/auth/microsoft/callback', oauthService.getCallbackMiddleware('microsoft'), (req: any, res: any) => {
  const user = req.user as any;
  const token = oauthService.generateToken(user);
  res.json({ token, user });
});

app.get('/auth/apple', oauthService.getAuthMiddleware('apple'));
app.get('/auth/apple/callback', oauthService.getCallbackMiddleware('apple'), (req: any, res: any) => {
  const user = req.user as any;
  const token = oauthService.generateToken(user);
  res.json({ token, user });
});

// Credentials Routes
app.post('/auth/register', async (req: any, res: any) => {
  const { email, password } = req.body;

  if (!securityService.validateEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const result = await credentialsService.register({ email, password });
  
  if (result.success) {
    res.status(201).json({ token: result.token, userId: result.user?.userId });
  } else {
    res.status(400).json({ errors: result.errors });
  }
});

app.post('/auth/login', async (req: any, res: any) => {
  const { email, password } = req.body;

  // In production, fetch user from database
  // const user = await getUserByEmail(email);
  // For this example, we'll use a mock user
  const mockUser = {
    userId: '123',
    email,
    passwordHash: await credentialsService.hashPassword('TestPassword123!'),
    roles: ['user'],
    emailVerified: true,
    twoFactorEnabled: false,
    failedLoginAttempts: 0,
  };

  const result = await credentialsService.login({ email, password }, mockUser);

  if (result.success) {
    if (result.requires2FA) {
      return res.json({ requires2FA: true });
    }
    res.json({ token: result.token });
  } else {
    res.status(401).json({ errors: result.errors });
  }
});

// 2FA Routes
app.post('/auth/2fa/setup', async (req: any, res: any) => {
  const { email } = req.body;
  const { secret, qrCode } = twoFactorService.generateSecret(email);
  const qrCodeDataUrl = await twoFactorService.generateQRCode(qrCode);
  const backupCodes = twoFactorService.generateBackupCodes();

  res.json({ secret, qrCode: qrCodeDataUrl, backupCodes });
});

app.post('/auth/2fa/verify', async (req: any, res: any) => {
  const { token, secret } = req.body;
  const isValid = twoFactorService.verifyToken(token, secret);
  res.json({ valid: isValid });
});

// Protected route example with RBAC
app.get('/api/workflows', (req: any, res: any) => {
  // In production, extract user from JWT token
  const userRoles = ['user']; // Mock roles
  const hasPermission = rbacService.hasPermission(userRoles as any, 'workflow', 'read');

  if (hasPermission) {
    res.json({ workflows: [] });
  } else {
    res.status(403).json({ error: 'Insufficient permissions' });
  }
});

export default app;
*/
