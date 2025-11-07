/**
 * Signing Utilities
 * 
 * Provides digital signing and verification functionality
 */

import { createSign, createVerify, generateKeyPairSync, KeyObject } from 'crypto';
import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * Generate RSA key pair
 */
export function generateKeyPair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });
  
  return { publicKey, privateKey };
}

/**
 * Sign data
 */
export function sign(data: string, privateKey: string): string {
  try {
    const signer = createSign('RSA-SHA256');
    signer.update(data);
    signer.end();
    
    const signature = signer.sign(privateKey, 'base64');
    return signature;
  } catch (error) {
    logger.error('Signing failed', { error });
    throw new Error('Signing failed');
  }
}

/**
 * Verify signature
 */
export function verify(data: string, signature: string, publicKey: string): boolean {
  try {
    const verifier = createVerify('RSA-SHA256');
    verifier.update(data);
    verifier.end();
    
    return verifier.verify(publicKey, signature, 'base64');
  } catch (error) {
    logger.error('Verification failed', { error });
    return false;
  }
}

/**
 * Create HMAC signature
 */
export function createHMAC(data: string, secret: string): string {
  const { createHmac } = require('crypto');
  return createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Verify HMAC signature
 */
export function verifyHMAC(data: string, signature: string, secret: string): boolean {
  const expectedSignature = createHMAC(data, secret);
  return signature === expectedSignature;
}
