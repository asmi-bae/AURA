// @ts-ignore - passport-google-oauth20 doesn't have types
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import passport from 'passport';
import { JWTService } from './jwt';

export interface OAuthUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export class OAuthService {
  private jwtService: JWTService;

  constructor() {
    this.jwtService = new JWTService();
    this.setupGoogleStrategy();
  }

  private setupGoogleStrategy() {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID || '',
          clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
          callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
        },
        async (accessToken: string, refreshToken: string, profile: any, done: (error: any, user?: any) => void) => {
          const user: OAuthUser = {
            id: profile.id,
            email: profile.emails?.[0]?.value || '',
            name: profile.displayName || '',
            picture: profile.photos?.[0]?.value,
          };
          return done(null, user);
        }
      )
    );
  }

  generateToken(user: OAuthUser, roles: string[] = ['user']): string {
    return this.jwtService.sign({
      userId: user.id,
      email: user.email,
      roles,
    });
  }

  getGoogleAuthMiddleware() {
    return passport.authenticate('google', {
      scope: ['profile', 'email'],
    });
  }

  getGoogleCallbackMiddleware() {
    return passport.authenticate('google', { session: false });
  }
}

