import express from 'express';
import { OAuthService, JWTService } from '@aura/auth';

interface OAuthRoutesDependencies {
  oauthService: OAuthService;
  jwtService: JWTService;
}

export function oauthRoutes(deps: OAuthRoutesDependencies) {
  const router = express.Router();
  const { oauthService, jwtService } = deps;

  // Google OAuth
  router.get('/google', oauthService.getAuthMiddleware('google'));
  router.get('/google/callback', 
    oauthService.getCallbackMiddleware('google'),
    async (req, res) => {
      try {
        const user = (req as any).user;
        
        // Generate JWT token
        const token = jwtService.sign({
          userId: user.id,
          email: user.email,
          roles: ['user'],
        });

        // In production, redirect to frontend with token
        res.json({
          message: 'Google OAuth successful',
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            picture: user.picture,
          },
        });
      } catch (error) {
        res.status(500).json({ 
          error: 'OAuth callback failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // GitHub OAuth
  router.get('/github', oauthService.getAuthMiddleware('github'));
  router.get('/github/callback',
    oauthService.getCallbackMiddleware('github'),
    async (req, res) => {
      try {
        const user = (req as any).user;
        
        const token = jwtService.sign({
          userId: user.id,
          email: user.email,
          roles: ['user'],
        });

        res.json({
          message: 'GitHub OAuth successful',
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            picture: user.picture,
          },
        });
      } catch (error) {
        res.status(500).json({ 
          error: 'OAuth callback failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // Microsoft OAuth
  router.get('/microsoft', oauthService.getAuthMiddleware('microsoft'));
  router.get('/microsoft/callback',
    oauthService.getCallbackMiddleware('microsoft'),
    async (req, res) => {
      try {
        const user = (req as any).user;
        
        const token = jwtService.sign({
          userId: user.id,
          email: user.email,
          roles: ['user'],
        });

        res.json({
          message: 'Microsoft OAuth successful',
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            picture: user.picture,
          },
        });
      } catch (error) {
        res.status(500).json({ 
          error: 'OAuth callback failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // Apple OAuth
  router.get('/apple', oauthService.getAuthMiddleware('apple'));
  router.get('/apple/callback',
    oauthService.getCallbackMiddleware('apple'),
    async (req, res) => {
      try {
        const user = (req as any).user;
        
        const token = jwtService.sign({
          userId: user.id,
          email: user.email,
          roles: ['user'],
        });

        res.json({
          message: 'Apple OAuth successful',
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
        });
      } catch (error) {
        res.status(500).json({ 
          error: 'OAuth callback failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  return router;
}
