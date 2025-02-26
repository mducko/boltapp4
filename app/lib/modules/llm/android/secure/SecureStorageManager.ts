import { createScopedLogger } from '~/utils/logger';
import { EncryptionManager } from './EncryptionManager';
import { KeychainManager } from './KeychainManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

const logger = createScopedLogger('SecureStorageManager');

export class SecureStorageManager {
  private static instance: SecureStorageManager;
  private encryptionManager: EncryptionManager;
  private keychainManager: KeychainManager;

  private constructor() {
    this.encryptionManager = EncryptionManager.getInstance();
    this.keychainManager = KeychainManager.getInstance();
  }

  static getInstance(): SecureStorageManager {
    if (!SecureStorageManager.instance) {
      SecureStorageManager.instance = new SecureStorageManager();
    }
    return SecureStorageManager.instance;
  }

  async initialize(password: string): Promise<void> {
    try {
      await this.encryptionManager.initialize(password);
      logger.info('Secure storage initialized');
    } catch (error) {
      logger.error('Failed to initialize secure storage:', error);
      throw error;
    }
  }

  async storeApiKey(provider: string, apiKey: string): Promise<void> {
    try {
      // First encrypt with encryption manager
      const encryptedKey = await this.encryptionManager.encrypt(apiKey);

      // Then store in keychain
      await this.keychainManager.setSecureItem(`api_key_${provider}`, encryptedKey);

      // Store provider in AsyncStorage for key management
      const providers = await this.getStoredProviders();
      if (!providers.includes(provider)) {
        providers.push(provider);
        await AsyncStorage.setItem('stored_providers', JSON.stringify(providers));
      }

      logger.debug(`API key stored for provider: ${provider}`);
    } catch (error) {
      logger.error('Failed to store API key:', error);
      throw error;
    }
  }

  async getApiKey(provider: string): Promise<string | null> {
    try {
      // Get encrypted key from keychain
      const encryptedKey = await this.keychainManager.getSecureItem(`api_key_${provider}`);
      if (!encryptedKey) {
        return null;
      }

      // Decrypt key
      return await this.encryptionManager.decrypt(encryptedKey);
    } catch (error) {
      logger.error('Failed to get API key:', error);
      throw error;
    }
  }

  async removeApiKey(provider: string): Promise<void> {
    try {
      // Remove from keychain
      await this.keychainManager.removeSecureItem(`api_key_${provider}`);

      // Remove from stored providers list
      const providers = await this.getStoredProviders();
      const updatedProviders = providers.filter(p => p !== provider);
      await AsyncStorage.setItem('stored_providers', JSON.stringify(updatedProviders));

      logger.debug(`API key removed for provider: ${provider}`);
    } catch (error) {
      logger.error('Failed to remove API key:', error);
      throw error;
    }
  }

  async getAllApiKeys(): Promise<Record<string, string>> {
    try {
      const providers = await this.getStoredProviders();
      const apiKeys: Record<string, string> = {};

      for (const provider of providers) {
        const apiKey = await this.getApiKey(provider);
        if (apiKey) {
          apiKeys[provider] = apiKey;
        }
      }

      return apiKeys;
    } catch (error) {
      logger.error('Failed to get all API keys:', error);
      throw error;
    }
  }

  private async getStoredProviders(): Promise<string[]> {
    try {
      const providers = await AsyncStorage.getItem('stored_providers');
      return providers ? JSON.parse(providers) : [];
    } catch (error) {
      logger.error('Failed to get stored providers:', error);
      return [];
    }
  }

  async clearAllData(): Promise<void> {
    try {
      // Clear encryption
      await this.encryptionManager.clearEncryption();

      // Clear keychain
      await this.keychainManager.clearAllSecureItems();

      // Clear stored providers
      await AsyncStorage.removeItem('stored_providers');

      logger.info('All secure data cleared');
    } catch (error) {
      logger.error('Failed to clear all data:', error);
      throw error;
    }
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    try {
      // Get all current API keys
      const currentKeys = await this.getAllApiKeys();

      // Clear all data
      await this.clearAllData();

      // Initialize with new password
      await this.initialize(newPassword);

      // Re-store all API keys with new encryption
      for (const [provider, apiKey] of Object.entries(currentKeys)) {
        await this.storeApiKey(provider, apiKey);
      }

      logger.info('Password changed successfully');
    } catch (error) {
      logger.error('Failed to change password:', error);
      throw error;
    }
  }

  isInitialized(): boolean {
    return this.encryptionManager.isInitialized();
  }
}