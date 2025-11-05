import { describe, it, expect, beforeEach } from '@jest/globals';
import { JWTService } from '../jwt';
import { CredentialsService } from '../credentials';
import { TwoFactorService } from '../two-factor';
import { SecurityService } from '../security';
import { RBACService } from '../rbac';
import speakeasy from 'speakeasy';

describe('Auth Service', () => {
  describe('JWTService', () => {
    let jwtService: JWTService;

    beforeEach(() => {
      jwtService = new JWTService('test-secret-key');
    });

    it('should sign and verify JWT tokens', () => {
      const payload = {
        userId: '123',
        email: 'test@example.com',
        roles: ['user'],
      };

      const token = jwtService.sign(payload);
      expect(token).toBeTruthy();

      const verified = jwtService.verify(token);
      expect(verified.userId).toBe(payload.userId);
      expect(verified.email).toBe(payload.email);
    });

    it('should reject invalid tokens', () => {
      expect(() => {
        jwtService.verify('invalid-token');
      }).toThrow();
    });
  });

  describe('CredentialsService', () => {
    let credentialsService: CredentialsService;

    beforeEach(() => {
      credentialsService = new CredentialsService();
    });

    it('should hash and verify passwords', async () => {
      const password = 'TestPassword123!';
      const hash = await credentialsService.hashPassword(password);
      expect(hash).toBeTruthy();

      const isValid = await credentialsService.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect passwords', async () => {
      const password = 'TestPassword123!';
      const hash = await credentialsService.hashPassword(password);

      const isValid = await credentialsService.verifyPassword('WrongPassword', hash);
      expect(isValid).toBe(false);
    });

    it('should validate password strength', () => {
      const weakPassword = 'weak';
      const validation = credentialsService.validatePassword(weakPassword);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);

      const strongPassword = 'StrongPassword123!';
      const strongValidation = credentialsService.validatePassword(strongPassword);
      expect(strongValidation.valid).toBe(true);
    });

    it('should register new users', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'TestPassword123!',
      };

      const result = await credentialsService.register(credentials);
      expect(result.success).toBe(true);
      expect(result.user).toBeTruthy();
      expect(result.token).toBeTruthy();
    });

    it('should reject weak passwords during registration', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'weak',
      };

      const result = await credentialsService.register(credentials);
      expect(result.success).toBe(false);
      expect(result.errors).toBeTruthy();
    });
  });

  describe('TwoFactorService', () => {
    let twoFactorService: TwoFactorService;

    beforeEach(() => {
      twoFactorService = new TwoFactorService('TestApp');
    });

    it('should generate secrets', () => {
      const { secret, qrCode } = twoFactorService.generateSecret('test@example.com');
      expect(secret).toBeTruthy();
      expect(qrCode).toBeTruthy();
    });

    it('should verify valid tokens', () => {
      const { secret } = twoFactorService.generateSecret('test@example.com');
      // Generate token using secret
      const token = speakeasy.totp({
        secret,
        encoding: 'base32',
      });

      const isValid = twoFactorService.verifyToken(token, secret);
      expect(isValid).toBe(true);
    });

    it('should reject invalid tokens', () => {
      const { secret } = twoFactorService.generateSecret('test@example.com');
      const isValid = twoFactorService.verifyToken('000000', secret);
      expect(isValid).toBe(false);
    });

    it('should generate backup codes', () => {
      const codes = twoFactorService.generateBackupCodes(10);
      expect(codes.length).toBe(10);
      expect(codes.every(code => code.length > 0)).toBe(true);
    });
  });

  describe('SecurityService', () => {
    let securityService: SecurityService;

    beforeEach(() => {
      securityService = new SecurityService();
    });

    it('should validate email addresses', () => {
      expect(securityService.validateEmail('test@example.com')).toBe(true);
      expect(securityService.validateEmail('invalid-email')).toBe(false);
      expect(securityService.validateEmail('test@')).toBe(false);
    });

    it('should sanitize input', () => {
      const dangerousInput = '<script>alert("xss")</script>';
      const sanitized = securityService.sanitizeInput(dangerousInput);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
    });

    it('should generate secure tokens', () => {
      const token1 = securityService.generateSecureToken(32);
      const token2 = securityService.generateSecureToken(32);
      expect(token1).toBeTruthy();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(64); // 32 bytes = 64 hex characters
    });

    it('should hash data', () => {
      const data = 'test-data';
      const hash1 = securityService.hashData(data);
      const hash2 = securityService.hashData(data);
      expect(hash1).toBeTruthy();
      expect(hash1).toBe(hash2); // Same input should produce same hash
    });
  });

  describe('RBACService', () => {
    let rbacService: RBACService;

    beforeEach(() => {
      rbacService = new RBACService();
    });

    it('should check permissions correctly', () => {
      expect(rbacService.hasPermission(['admin'], 'workflow', 'delete')).toBe(true);
      expect(rbacService.hasPermission(['editor'], 'workflow', 'delete')).toBe(true);
      expect(rbacService.hasPermission(['viewer'], 'workflow', 'delete')).toBe(false);
      expect(rbacService.hasPermission(['user'], 'workflow', 'read')).toBe(true);
    });

    it('should check role hierarchy', () => {
      expect(rbacService.hasRole(['admin'], 'admin')).toBe(true);
      expect(rbacService.hasRole(['admin'], 'editor')).toBe(true);
      expect(rbacService.hasRole(['editor'], 'admin')).toBe(false);
      expect(rbacService.hasRole(['viewer'], 'editor')).toBe(false);
    });

    it('should get all permissions for roles', () => {
      const permissions = rbacService.getPermissions(['admin', 'editor']);
      expect(permissions.length).toBeGreaterThan(0);
      expect(permissions.some(p => p.resource === '*')).toBe(true);
    });
  });
});

