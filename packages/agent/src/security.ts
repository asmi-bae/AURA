import * as crypto from 'crypto';
import { createLogger } from '@aura/utils';

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export class SecurityService {
  private logger = createLogger();
  private algorithm = 'aes-256-gcm';
  private keyLength = 32;
  private ivLength = 16;

  generateKeyPair(): KeyPair {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
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

  encrypt(data: string | Buffer, key: Buffer): { encrypted: Buffer; iv: Buffer; authTag: Buffer } {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
    const encrypted = Buffer.concat([cipher.update(dataBuffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return { encrypted, iv, authTag };
  }

  decrypt(
    encrypted: Buffer,
    key: Buffer,
    iv: Buffer,
    authTag: Buffer
  ): Buffer {
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  generateSharedSecret(): Buffer {
    return crypto.randomBytes(this.keyLength);
  }

  deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, 100000, this.keyLength, 'sha256');
  }

  hash(data: string | Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  sign(data: string | Buffer, privateKey: string): string {
    const sign = crypto.createSign('SHA256');
    sign.update(data);
    sign.end();
    return sign.sign(privateKey, 'base64');
  }

  verify(data: string | Buffer, signature: string, publicKey: string): boolean {
    const verify = crypto.createVerify('SHA256');
    verify.update(data);
    verify.end();
    return verify.verify(publicKey, signature, 'base64');
  }
}

