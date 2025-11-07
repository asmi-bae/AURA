import express from 'express';
import { CredentialsService, JWTService, TwoFactorService } from '@aura/auth';

interface AuthRoutesDependencies {
  credentialsService: CredentialsService;
  jwtService: JWTService;
  twoFactorService: TwoFactorService;
}

export function authRoutes(deps: AuthRoutesDependencies) {
  const router = express.Router();
  const { credentialsService, jwtService, twoFactorService } = deps;

  // Register
  router.post('/register', async (req, res) => {
    try {
      const { email, password, roles } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const result = await credentialsService.register(
        { email, password },
        roles || ['user']
      );

      if (!result.success) {
        return res.status(400).json({ 
          error: 'Registration failed',
          errors: result.errors,
        });
      }

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          userId: result.user?.userId,
          email: result.user?.email,
          roles: result.user?.roles,
        },
        token: result.token,
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Registration failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Login
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // TODO: Get user from database in production
      // For now, create a mock user object
      const mockUser = {
        userId: 'user-123',
        email: email.toLowerCase(),
        passwordHash: '', // Would be fetched from DB
        roles: ['user'],
        emailVerified: false,
        twoFactorEnabled: false,
        failedLoginAttempts: 0,
      } as any;
      
      const result = await credentialsService.login(
        { email, password },
        mockUser
      );

      if (!result.success) {
        return res.status(401).json({ 
          error: 'Login failed',
          errors: result.errors,
        });
      }

      if (result.requires2FA) {
        return res.json({
          requires2FA: true,
          message: '2FA verification required',
        });
      }

      res.json({
        message: 'Login successful',
        token: result.token,
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Login failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Verify 2FA
  router.post('/verify-2fa', async (req, res) => {
    try {
      const { userId, token } = req.body;

      if (!userId || !token) {
        return res.status(400).json({ error: 'userId and token are required' });
      }

      // TODO: Get user's 2FA secret from database
      // For now, this is a placeholder - in production, fetch secret from user record
      const userSecret = ''; // Would be fetched from database
      const isValid = userSecret ? await twoFactorService.verifyToken(token, userSecret) : false;

      if (!isValid) {
        return res.status(401).json({ error: 'Invalid 2FA token' });
      }

      // Generate JWT token
      const jwtToken = jwtService.sign({
        userId,
        email: '', // Would come from user object
        roles: [], // Would come from user object
      });

      res.json({
        message: '2FA verification successful',
        token: jwtToken,
      });
    } catch (error) {
      res.status(500).json({ 
        error: '2FA verification failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Setup 2FA
  router.post('/setup-2fa', async (req, res) => {
    try {
      const { userId, email } = req.body;

      if (!userId || !email) {
        return res.status(400).json({ error: 'userId and email are required' });
      }

      // Generate 2FA secret and QR code
      const secretResult = twoFactorService.generateSecret(email);
      const qrCode = await twoFactorService.generateQRCode(secretResult.qrCode);
      const backupCodes = twoFactorService.generateBackupCodes(10);
      
      // TODO: Save secret and backup codes to database for this user
      
      const result = {
        secret: secretResult.secret,
        qrCode,
        backupCodes,
      };

      res.json({
        message: '2FA setup successful',
        secret: result.secret,
        qrCode: result.qrCode,
        backupCodes: result.backupCodes,
      });
    } catch (error) {
      res.status(500).json({ 
        error: '2FA setup failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Verify JWT token
  router.post('/verify', async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: 'Token is required' });
      }

      const payload = jwtService.verify(token);

      res.json({
        valid: true,
        payload,
      });
    } catch (error) {
      res.status(401).json({ 
        valid: false,
        error: 'Invalid token',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Refresh token
  router.post('/refresh', async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: 'Token is required' });
      }

      // Verify current token
      const payload = jwtService.verify(token);

      // Generate new token
      const newToken = jwtService.sign({
        userId: payload.userId,
        email: payload.email,
        roles: payload.roles,
      });

      res.json({
        token: newToken,
      });
    } catch (error) {
      res.status(401).json({ 
        error: 'Token refresh failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Logout
  router.post('/logout', (req, res) => {
    // In production, invalidate token/session
    res.json({ message: 'Logged out successfully' });
  });

  return router;
}
