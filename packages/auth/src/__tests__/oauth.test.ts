import { describe, it, expect, beforeEach } from '@jest/globals';
import { OAuthService } from '../oauth-complete';

describe('OAuth Service', () => {
  describe('OAuthService', () => {
    it('should initialize with all providers', () => {
      const oauthService = new OAuthService({
        google: {
          clientID: 'test-google-id',
          clientSecret: 'test-google-secret',
          callbackURL: '/auth/google/callback',
        },
        github: {
          clientID: 'test-github-id',
          clientSecret: 'test-github-secret',
          callbackURL: '/auth/github/callback',
        },
        microsoft: {
          clientID: 'test-microsoft-id',
          clientSecret: 'test-microsoft-secret',
          callbackURL: '/auth/microsoft/callback',
        },
        apple: {
          clientID: 'test-apple-id',
          teamID: 'test-team-id',
          keyID: 'test-key-id',
          privateKey: 'test-private-key',
          callbackURL: '/auth/apple/callback',
        },
      });

      expect(oauthService).toBeTruthy();
    });

    it('should generate tokens for OAuth users', () => {
      const oauthService = new OAuthService({});

      const user = {
        provider: 'google' as const,
        providerId: '123',
        email: 'test@example.com',
        name: 'Test User',
        verified: true,
      };

      const token = oauthService.generateToken(user, ['user']);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });
  });
});

