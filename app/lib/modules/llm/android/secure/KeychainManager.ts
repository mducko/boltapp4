import { NativeModules } from 'react-native';
import { createScopedLogger } from '~/utils/logger';
import { EncryptionManager } from './EncryptionManager';

const { KeychainModule } = NativeModules;
const logger = createScopedLogger('KeychainManager');

export class KeychainManager {
  private static instance: KeychainManager;
  private encryptionManager: EncryptionManager;

  private constructor() {
    this.encryptionManager = EncryptionManager.getInstance();
  }

  static getInstance(): KeychainManager {
    if (!KeychainManager.instance) {
      KeychainManager.instance = new KeychainManager();
    }
    return KeychainManager.instance;
  }

  async setSecureItem(key: string, value: string): Promise<void> {
    try {
      if (!this.encryptionManager.isInitialized()) {
        throw new Error('Encryption not initialized');
      }

      // Encrypt the value
      const encryptedValue = await this.encryptionManager.encrypt(value);

      // Store in Keychain
      await KeychainModule.setGenericPassword(key, encryptedValue);
      logger.debug(`Secure item stored: ${key}`);
    } catch (error) {
      logger.error('Failed to store secure item:', error);
      throw error;
    }
  }

  async getSecureItem(key: string): Promise<string | null> {
    try {
      if (!this.encryptionManager.isInitialized()) {
        throw new Error('Encryption not initialized');
      }

      // Get from Keychain
      const encryptedValue = await KeychainModule.getGenericPassword(key);
      if (!encryptedValue) {
        return null;
      }

      // Decrypt the value
      return await this.encryptionManager.decrypt(encryptedValue);
    } catch (error) {
      logger.error('Failed to get secure item:', error);
      throw error;
    }
  }

  async removeSecureItem(key: string): Promise<void> {
    try {
      await KeychainModule.resetGenericPassword(key);
      logger.debug(`Secure item removed: ${key}`);
    } catch (error) {
      logger.error('Failed to remove secure item:', error);
      throw error;
    }
  }

  async clearAllSecureItems(): Promise<void> {
    try {
      await KeychainModule.resetGenericPassword();
      logger.info('All secure items cleared');
    } catch (error) {
      logger.error('Failed to clear secure items:', error);
      throw error;
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      return await KeychainModule.getAllKeys();
    } catch (error) {
      logger.error('Failed to get all keys:', error);
      throw error;
    }
  }

  async hasSecureItem(key: string): Promise<boolean> {
    try {
      const value = await KeychainModule.getGenericPassword(key);
      return value !== null;
    } catch (error) {
      logger.error('Failed to check secure item:', error);
      return false;
    }
  }
}