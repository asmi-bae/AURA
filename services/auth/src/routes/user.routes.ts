import express from 'express';
import { CredentialsService, RBACService, JWTService } from '@aura/auth';

interface UserRoutesDependencies {
  credentialsService: CredentialsService;
  rbacService: RBACService;
  jwtService: JWTService;
}

// Middleware to extract and verify JWT token
function authMiddleware(jwtService: JWTService) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization header required' });
      }

      const token = authHeader.substring(7);
      const payload = jwtService.verify(token);

      (req as any).user = payload;
      next();
    } catch (error) {
      res.status(401).json({ 
        error: 'Invalid or expired token',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

export function userRoutes(deps: UserRoutesDependencies) {
  const router = express.Router();
  const { credentialsService, rbacService, jwtService } = deps;
  const authenticate = authMiddleware(jwtService);

  // Get current user
  router.get('/me', authenticate, (req, res) => {
    const user = (req as any).user;
    res.json({
      userId: user.userId,
      email: user.email,
      roles: user.roles,
    });
  });

  // Change password
  router.post('/change-password', authenticate, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = (req as any).user;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
      }

      // TODO: Get user from database in production
      const mockUser = {
        userId: user.userId,
        email: user.email,
        passwordHash: '', // Would be fetched from DB
        roles: user.roles,
        emailVerified: false,
        twoFactorEnabled: false,
        failedLoginAttempts: 0,
      } as any;
      
      const result = await credentialsService.changePassword(
        user.userId,
        currentPassword,
        newPassword,
        mockUser
      );

      if (!result.success) {
        return res.status(400).json({ 
          error: 'Password change failed',
          errors: result.errors,
        });
      }

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      res.status(500).json({ 
        error: 'Password change failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Request password reset
  router.post('/request-password-reset', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // TODO: Get user from database and generate reset token
      // For now, just generate a token (in production, save to user record and send email)
      const resetToken = await credentialsService.generatePasswordResetToken(email);
      
      // TODO: In production, save reset token to user record and send email
      // For now, return success
      res.json({ 
        message: 'Password reset email sent (in production, token sent via email)',
        // resetToken, // In production, don't return token - send via email
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Password reset request failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Reset password
  router.post('/reset-password', async (req, res) => {
    try {
      const { email, resetToken, newPassword } = req.body;

      if (!email || !resetToken || !newPassword) {
        return res.status(400).json({ 
          error: 'Email, reset token, and new password are required' 
        });
      }

      // TODO: Get user from database using email and reset token
      const mockUser = {
        userId: 'user-123',
        email: email.toLowerCase(),
        passwordHash: '', // Would be fetched from DB
        passwordResetToken: resetToken, // Would be fetched from DB
        passwordResetExpires: new Date(Date.now() + 3600000), // Would be fetched from DB
        roles: ['user'],
        emailVerified: false,
        twoFactorEnabled: false,
        failedLoginAttempts: 0,
      } as any;
      
      const result = await credentialsService.resetPassword(
        resetToken,
        newPassword,
        mockUser
      );

      if (!result.success) {
        return res.status(400).json({ 
          error: 'Password reset failed',
          errors: result.errors,
        });
      }

      res.json({ message: 'Password reset successful' });
    } catch (error) {
      res.status(500).json({ 
        error: 'Password reset failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Check permissions
  router.post('/check-permission', authenticate, (req, res) => {
    try {
      const { resource, action } = req.body;
      const user = (req as any).user;

      if (!resource || !action) {
        return res.status(400).json({ error: 'Resource and action are required' });
      }

      const hasPermission = rbacService.hasPermission(
        user.roles,
        resource,
        action
      );

      res.json({
        hasPermission,
        userId: user.userId,
        roles: user.roles,
        resource,
        action,
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Permission check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}
