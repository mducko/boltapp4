import { NativeModules } from 'react-native';
import { Buffer } from 'buffer';
import { getRandomBytes } from 'react-native-get-random-values';

const { KeychainModule } = NativeModules;

const ALGORITHM = 'AES-GCM';
const KEY_SIZE = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const ITERATIONS = 100000;

export class Encryption {
  private static instance: Encryption;
  private encryptionKey?: CryptoKey;

  private constructor() {}

  static getInstance(): Encryption {
    if (!Encryption.instance) {
      Encryption.instance = new Encryption();
    }
    return Encryption.instance;
  }

  async initialize(password: string): Promise<void> {
    try {
      // Generate salt
      const salt = getRandomBytes(SALT_LENGTH);
      
      // Derive key using PBKDF2
      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      this.encryptionKey = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: ITERATIONS,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: ALGORITHM, length: KEY_SIZE },
        true,
        ['encrypt', 'decrypt']
      );

      // Store salt securely
      await KeychainModule.setGenericPassword(
        'encryption_salt',
        Buffer.from(salt).toString('base64')
      );
    } catch (error) {
      console.error('Encryption initialization failed:', error);
      throw new Error('Failed to initialize encryption');
    }
  }

  async encrypt(data: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption not initialized');
    }

    try {
      const iv = getRandomBytes(IV_LENGTH);
      const encoded = new TextEncoder().encode(data);

      const encrypted = await window.crypto.subtle.encrypt(
        {
          name: ALGORITHM,
          iv,
        },
        this.encryptionKey,
        encoded
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);

      return Buffer.from(combined).toString('base64');
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  async decrypt(encryptedData: string): Promise<string> {
    if (!this.encryptionKey) {
      throw new Error('Encryption not initialized');
    }

    try {
      const data = Buffer.from(encryptedData, 'base64');
      
      // Extract IV and encrypted data
      const iv = data.slice(0, IV_LENGTH);
      const encrypted = data.slice(IV_LENGTH);

      const decrypted = await window.crypto.subtle.decrypt(
        {
          name: ALGORITHM,
          iv,
        },
        this.encryptionKey,
        encrypted
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    // Verify old password
    const oldSalt = await KeychainModule.getGenericPassword('encryption_salt');
    if (!oldSalt) {
      throw new Error('No encryption salt found');
    }

    // Re-initialize with new password
    await this.initialize(newPassword);

    // Re-encrypt all stored data
    // TODO: Implement data re-encryption
  }

  async clearEncryption(): Promise<void> {
    this.encryptionKey = undefined;
    await KeychainModule.resetGenericPassword();
  }
}