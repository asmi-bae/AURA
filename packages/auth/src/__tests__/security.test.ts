import { describe, it, expect, beforeEach } from '@jest/globals';
import { SecurityService } from '../security';

describe('Security Service', () => {
  describe('SecurityService', () => {
    let securityService: SecurityService;

    beforeEach(() => {
      securityService = new SecurityService();
    });

    it('should validate email addresses', () => {
      expect(securityService.validateEmail('test@example.com')).toBe(true);
      expect(securityService.validateEmail('user.name@example.co.uk')).toBe(true);
      expect(securityService.validateEmail('invalid-email')).toBe(false);
      expect(securityService.validateEmail('test@')).toBe(false);
      expect(securityService.validateEmail('@example.com')).toBe(false);
    });

    it('should sanitize input', () => {
      const dangerousInput = '<script>alert("xss")</script>';
      const sanitized = securityService.sanitizeInput(dangerousInput);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
      expect(sanitized).not.toContain('"');
    });

    it('should generate secure tokens', () => {
      const token1 = securityService.generateSecureToken(32);
      const token2 = securityService.generateSecureToken(32);
      
      expect(token1).toBeTruthy();
      expect(token1.length).toBe(64); // 32 bytes = 64 hex characters
      expect(token1).not.toBe(token2); // Tokens should be unique
    });

    it('should hash data consistently', () => {
      const data = 'test-data';
      const hash1 = securityService.hashData(data);
      const hash2 = securityService.hashData(data);
      
      expect(hash1).toBeTruthy();
      expect(hash1).toBe(hash2); // Same input should produce same hash
      expect(hash1.length).toBe(64); // SHA256 produces 64 hex characters
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = securityService.hashData('data1');
      const hash2 = securityService.hashData('data2');
      
      expect(hash1).not.toBe(hash2);
    });
  });
});

