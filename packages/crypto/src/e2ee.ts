/**
 * End-to-End Encryption (E2EE) Utilities
 * 
 * Provides E2EE functionality for secure communication
 */

import { encrypt, decrypt, generateRandomBytes } from './encryption';
import { sign, verify, generateKeyPair } from './signing';
import { createLogger } from '@aura/utils';

const logger = createLogger();

export interface E2EEKeyPair {
  publicKey: string;
  privateKey: string;
  keyId: string;
}

export interface E2EEMessage {
  encryptedData: string;
  signature: string;
  keyId: string;
  timestamp: number;
  nonce: string;
}

/**
 * E2EE Manager
 */
export class E2EEManager {
  private keyPair: E2EEKeyPair;
  private peerKeys: Map<string, string> = new Map(); // keyId -> publicKey

  constructor(keyPair?: E2EEKeyPair) {
    if (keyPair) {
      this.keyPair = keyPair;
    } else {
      const pair = generateKeyPair();
      this.keyPair = {
        ...pair,
        keyId: this.generateKeyId(),
      };
    }
  }

  /**
   * Generate key ID
   */
  private generateKeyId(): string {
    return generateRandomBytes(16).toString('hex');
  }

  /**
   * Get public key
   */
  getPublicKey(): string {
    return this.keyPair.publicKey;
  }

  /**
   * Get key ID
   */
  getKeyId(): string {
    return this.keyPair.keyId;
  }

  /**
   * Register peer public key
   */
  registerPeer(keyId: string, publicKey: string): void {
    this.peerKeys.set(keyId, publicKey);
    logger.info('Peer key registered', { keyId });
  }

  /**
   * Encrypt and sign message for a peer
   */
  encryptMessage(data: string, peerKeyId: string, password: string): E2EEMessage {
    const peerPublicKey = this.peerKeys.get(peerKeyId);
    if (!peerPublicKey) {
      throw new Error(`Peer key not found: ${peerKeyId}`);
    }

    // Encrypt data
    const encryptedData = encrypt(data, password);

    // Sign encrypted data
    const signature = sign(encryptedData, this.keyPair.privateKey);

    // Generate nonce
    const nonce = generateRandomBytes(16).toString('hex');

    return {
      encryptedData,
      signature,
      keyId: this.keyPair.keyId,
      timestamp: Date.now(),
      nonce,
    };
  }

  /**
   * Decrypt and verify message from a peer
   */
  decryptMessage(message: E2EEMessage, peerKeyId: string, password: string): string {
    // Verify signature
    const peerPublicKey = this.peerKeys.get(peerKeyId);
    if (!peerPublicKey) {
      throw new Error(`Peer key not found: ${peerKeyId}`);
    }

    const isValid = verify(message.encryptedData, message.signature, peerPublicKey);
    if (!isValid) {
      throw new Error('Message signature verification failed');
    }

    // Decrypt data
    const decrypted = decrypt(message.encryptedData, password);

    return decrypted;
  }

  /**
   * Export key pair (for backup)
   */
  exportKeyPair(): E2EEKeyPair {
    return { ...this.keyPair };
  }

  /**
   * Import key pair
   */
  importKeyPair(keyPair: E2EEKeyPair): void {
    this.keyPair = keyPair;
    logger.info('Key pair imported', { keyId: keyPair.keyId });
  }
}
