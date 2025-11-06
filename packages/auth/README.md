# AURA Auth Service

A comprehensive, secure authentication service supporting multiple OAuth providers and credential-based authentication.

## Features

### OAuth Providers
- ✅ Google OAuth 2.0
- ✅ GitHub OAuth 2.0
- ✅ Microsoft OAuth 2.0
- ✅ Apple Sign In

### Credential-Based Authentication
- ✅ Secure password hashing (bcrypt)
- ✅ Password strength validation
- ✅ Account lockout after failed attempts
- ✅ Password reset tokens
- ✅ Password change functionality

### Security Features
- ✅ Rate limiting
- ✅ Slow down protection
- ✅ Helmet.js security headers
- ✅ Input sanitization
- ✅ Email validation
- ✅ Two-Factor Authentication (2FA/TOTP)
- ✅ QR code generation for 2FA
- ✅ Backup codes

### Role-Based Access Control (RBAC)
- ✅ Admin, Editor, Viewer, User roles
- ✅ Permission checking
- ✅ Role hierarchy

## Installation

```bash
pnpm install @aura/auth
```

## Usage

### OAuth Setup

```typescript
import { OAuthService } from '@aura/auth';

const oauthService = new OAuthService({
  google: {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback',
  },
  github: {
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: '/auth/github/callback',
  },
  microsoft: {
    clientID: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    callbackURL: '/auth/microsoft/callback',
    tenant: 'common', // or your tenant ID
  },
  apple: {
    clientID: process.env.APPLE_CLIENT_ID,
    teamID: process.env.APPLE_TEAM_ID,
    keyID: process.env.APPLE_KEY_ID,
    privateKey: process.env.APPLE_PRIVATE_KEY,
    callbackURL: '/auth/apple/callback',
  },
});

// Express routes
app.get('/auth/google', oauthService.getAuthMiddleware('google'));
app.get('/auth/google/callback', oauthService.getCallbackMiddleware('google'), (req, res) => {
  const user = req.user;
  const token = oauthService.generateToken(user);
  res.json({ token });
});
```

### Credential-Based Authentication

```typescript
import { CredentialsService } from '@aura/auth';

const credentialsService = new CredentialsService();

// Register
const result = await credentialsService.register({
  email: 'user@example.com',
  password: 'SecurePassword123!',
});

if (result.success) {
  console.log('Token:', result.token);
}

// Login
const loginResult = await credentialsService.login(
  { email: 'user@example.com', password: 'SecurePassword123!' },
  userFromDatabase
);

if (loginResult.success) {
  console.log('Token:', loginResult.token);
}
```

### Two-Factor Authentication

```typescript
import { TwoFactorService } from '@aura/auth';

const twoFactorService = new TwoFactorService('YourApp');

// Setup 2FA
const { secret, qrCode } = twoFactorService.generateSecret('user@example.com');
const qrCodeDataUrl = await twoFactorService.generateQRCode(qrCode);
const backupCodes = twoFactorService.generateBackupCodes();

// Verify token
const isValid = twoFactorService.verifyToken(token, secret);
```

### Security Middleware

```typescript
import { SecurityService } from '@aura/auth';

const securityService = new SecurityService();

app.use(securityService.getHelmetMiddleware());
app.use(securityService.getRateLimiter());
app.use(securityService.getSlowDown());
```

### RBAC

```typescript
import { RBACService } from '@aura/auth';

const rbacService = new RBACService();

if (rbacService.hasPermission(userRoles, 'workflow', 'delete')) {
  // Allow deletion
}

if (rbacService.hasRole(userRoles, 'admin')) {
  // Admin access
}
```

## Password Policy

Default password requirements:
- Minimum 12 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- Not a common password

## Security Best Practices

1. **Always use HTTPS** in production
2. **Set strong JWT secrets** (minimum 32 characters)
3. **Enable rate limiting** on all auth endpoints
4. **Use 2FA** for sensitive operations
5. **Implement account lockout** after failed attempts
6. **Sanitize all user inputs**
7. **Use secure password policies**
8. **Store passwords using bcrypt** (already implemented)

## Testing

```bash
pnpm test
pnpm test:watch
pnpm test:coverage
```

## Environment Variables

```env
# JWT
JWT_SECRET=your-secret-key-minimum-32-characters

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback

# Microsoft OAuth
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_CALLBACK_URL=http://localhost:3000/auth/microsoft/callback
MICROSOFT_TENANT=common

# Apple OAuth
APPLE_CLIENT_ID=your-apple-client-id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY=your-apple-private-key
APPLE_CALLBACK_URL=http://localhost:3000/auth/apple/callback
```

## License

MIT

