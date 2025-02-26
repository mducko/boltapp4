import { createScopedLogger } from '~/utils/logger';
import { BiometricAuth } from './BiometricAuth';
import { SecureStorage } from '../secure/SecureStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const logger = createScopedLogger('AuthManager');

export class AuthManager {
  private static instance: AuthManager;
  private biometricAuth: BiometricAuth;
  private secureStorage: SecureStorage;
  private isInitialized = false;

  private constructor() {
    this.biometricAuth = BiometricAuth.getInstance();
    this.secureStorage = SecureStorage.getInstance();
  }

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      await this.biometricAuth.initialize();
      this.isInitialized = true;
      logger.info('Auth manager initialized');
    } catch (error) {
      logger.error('Failed to initialize auth manager:', error);
      throw error;
    }
  }

  async authenticateUser(): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Auth manager not initialized');
    }

    try {
      // Check if biometrics is available
      if (this.biometricAuth.isSupported()) {
        const success = await this.biometricAuth.authenticate(
          this.biometricAuth.getAuthPrompt()
        );

        if (success) {
          // Generate and store biometric signature
          const { success: signSuccess, signature } = await this.biometricAuth.signData(
            'bolt.droid.auth'
          );

          if (signSuccess && signature) {
            await AsyncStorage.setItem('biometric_signature', signature);
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      logger.error('Authentication failed:', error);
      return false;
    }
  }

  async encryptApiKey(provider: string, apiKey: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Auth manager not initialized');
    }

    try {
      const encryptedKey = await this.biometricAuth.encryptWithBiometrics(apiKey);
      await AsyncStorage.setItem(`encrypted_api_key_${provider}`, encryptedKey);
    } catch (error) {
      logger.error('Failed to encrypt API key:', error);
      throw error;
    }
  }

  async decryptApiKey(provider: string): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Auth manager not initialized');
    }

    try {
      const encryptedKey = await AsyncStorage.getItem(`encrypted_api_key_${provider}`);
      if (!encryptedKey) {
        throw new Error('No encrypted API key found');
      }

      return await this.biometricAuth.decryptWithBiometrics(encryptedKey);
    } catch (error) {
      logger.error('Failed to decrypt API key:', error);
      throw error;
    }
  }

  async clearAuth(): Promise<void> {
    try {
      await this.biometricAuth.deleteKeys();
      await AsyncStorage.removeItem('biometric_signature');
      const keys = await AsyncStorage.getAllKeys();
      const apiKeys = keys.filter(key => key.startsWith('encrypted_api_key_'));
      await AsyncStorage.multiRemove(apiKeys);
    } catch (error) {
      logger.error('Failed to clear auth data:', error);
      throw error;
    }
  }

  isBiometricsAvailable(): boolean {
    return this.biometricAuth.isSupported();
  }

  getBiometryType(): string | undefined {
    return this.biometricAuth.getBiometryType();
  }
}