// @ts-ignore - passport-google-oauth20 doesn't have types
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
// @ts-ignore - passport-github2 doesn't have types
import { Strategy as GitHubStrategy } from 'passport-github2';
import passport from 'passport';
import { JWTService } from './jwt';
import { createLogger } from '@aura/utils';
import { OAuthUser } from './types';

const logger = createLogger();

export interface OAuthProviderConfig {
  google?: {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
  };
  github?: {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
  };
  microsoft?: {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    tenant?: string;
  };
  apple?: {
    clientID: string;
    teamID: string;
    keyID: string;
    privateKey: string;
    callbackURL: string;
  };
}

export class OAuthService {
  private jwtService: JWTService;

  constructor(private config: OAuthProviderConfig) {
    this.jwtService = new JWTService();
    this.setupStrategies();
  }

  private setupStrategies() {
    // Google OAuth
    if (this.config.google) {
      passport.use(
        new GoogleStrategy(
          {
            clientID: this.config.google.clientID,
            clientSecret: this.config.google.clientSecret,
            callbackURL: this.config.google.callbackURL,
          },
          async (accessToken: string, refreshToken: string, profile: any, done: (error: any, user?: any) => void) => {
            try {
              const user: OAuthUser = {
                provider: 'google',
                providerId: profile.id,
                email: profile.emails?.[0]?.value || '',
                name: profile.displayName || '',
                picture: profile.photos?.[0]?.value,
                verified: profile.emails?.[0]?.verified || false,
              };
              return done(null, user);
            } catch (error) {
              logger.error('Error in Google OAuth callback', { error });
              return done(error, null);
            }
          }
        )
      );
    }

    // GitHub OAuth
    if (this.config.github) {
      passport.use(
        new GitHubStrategy(
          {
            clientID: this.config.github.clientID,
            clientSecret: this.config.github.clientSecret,
            callbackURL: this.config.github.callbackURL,
            scope: ['user:email'],
          },
          async (accessToken: string, refreshToken: string, profile: any, done: (error: any, user?: any) => void) => {
            try {
              // Fetch email from GitHub API
              const emailResponse = await fetch('https://api.github.com/user/emails', {
                headers: {
                  Authorization: `token ${accessToken}`,
                },
              });
              const emails = await emailResponse.json();
              const primaryEmail = emails.find((e: any) => e.primary) || emails[0];

              const user: OAuthUser = {
                provider: 'github',
                providerId: profile.id,
                email: primaryEmail?.email || profile.emails?.[0]?.value || '',
                name: profile.displayName || profile.username || '',
                picture: profile.photos?.[0]?.value,
                verified: primaryEmail?.verified || false,
              };
              return done(null, user);
            } catch (error) {
              logger.error('Error in GitHub OAuth callback', { error });
              return done(error, null);
            }
          }
        )
      );
    }

    // Microsoft OAuth
    if (this.config.microsoft) {
      const MicrosoftStrategy = require('passport-microsoft').Strategy;
      passport.use(
        new MicrosoftStrategy(
          {
            clientID: this.config.microsoft.clientID,
            clientSecret: this.config.microsoft.clientSecret,
            callbackURL: this.config.microsoft.callbackURL,
            tenant: this.config.microsoft.tenant || 'common',
            scope: ['user.read'],
          },
          async (accessToken: string, refreshToken: string, profile: any, done: (error: any, user?: any) => void) => {
            try {
              const user: OAuthUser = {
                provider: 'microsoft',
                providerId: profile.id,
                email: profile.emails?.[0]?.value || profile._json.mail || '',
                name: profile.displayName || profile.name?.givenName || '',
                picture: profile.photos?.[0]?.value,
                verified: true,
              };
              return done(null, user);
            } catch (error) {
              logger.error('Error in Microsoft OAuth callback', { error });
              return done(error, null);
            }
          }
        )
      );
    }

    // Apple OAuth
    if (this.config.apple) {
      const AppleStrategy = require('passport-apple').Strategy;
      passport.use(
        new AppleStrategy(
          {
            clientID: this.config.apple.clientID,
            teamID: this.config.apple.teamID,
            keyID: this.config.apple.keyID,
            privateKeyString: this.config.apple.privateKey,
            callbackURL: this.config.apple.callbackURL,
            scope: ['name', 'email'],
          },
          async (accessToken: string, refreshToken: string, profile: any, done: (error: any, user?: any) => void) => {
            try {
              const user: OAuthUser = {
                provider: 'apple',
                providerId: profile.id,
                email: profile.email || '',
                name: profile.name?.firstName || profile.name?.lastName || '',
                picture: undefined,
                verified: true,
              };
              return done(null, user);
            } catch (error) {
              logger.error('Error in Apple OAuth callback', { error });
              return done(error, null);
            }
          }
        )
      );
    }
  }

  generateToken(user: OAuthUser, roles: string[] = ['user']): string {
    return this.jwtService.sign({
      userId: user.providerId,
      email: user.email,
      roles,
    } as any);
  }

  getAuthMiddleware(provider: 'google' | 'github' | 'microsoft' | 'apple') {
    return passport.authenticate(provider, {
      scope: provider === 'github' ? ['user:email'] : ['profile', 'email'],
      session: false,
    });
  }

  getCallbackMiddleware(provider: 'google' | 'github' | 'microsoft' | 'apple') {
    return passport.authenticate(provider, { session: false });
  }
}

