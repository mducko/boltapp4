import { NativeModules, Platform } from 'react-native';
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import { createScopedLogger } from '~/utils/logger';
import { SecureStorage } from '../secure/SecureStorage';

const logger = createScopedLogger('BiometricAuth');
const rnBiometrics = new ReactNativeBiometrics({
  allowDeviceCredentials: true
});

export class BiometricAuth {
  private static instance: BiometricAuth;
  private isAvailable = false;
  private biometryType: BiometryTypes | undefined;
  private secureStorage: SecureStorage;

  private constructor() {
    this.secureStorage = SecureStorage.getInstance();
  }

  static getInstance(): BiometricAuth {
    if (!BiometricAuth.instance) {
      BiometricAuth.instance = new BiometricAuth();
    }
    return BiometricAuth.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Check if biometrics is available
      const { available, biometryType } = await rnBiometrics.isSensorAvailable();
      this.isAvailable = available;
      this.biometryType = biometryType;

      if (!available) {
        logger.warn('Biometric authentication not available');
        return;
      }

      logger.info(`Biometric authentication available: ${biometryType}`);
    } catch (error) {
      logger.error('Failed to initialize biometrics:', error);
      throw new Error('Biometric initialization failed');
    }
  }

  async authenticate(promptMessage: string = 'Verify your identity'): Promise<boolean> {
    if (!this.isAvailable) {
      throw new Error('Biometric authentication not available');
    }

    try {
      const { success } = await rnBiometrics.simplePrompt({ promptMessage });
      return success;
    } catch (error) {
      logger.error('Biometric authentication failed:', error);
      return false;
    }
  }

  async createKeys(keyName: string = 'bolt.droid.biometric'): Promise<{
    publicKey: string;
    success: boolean;
  }> {
    if (!this.isAvailable) {
      throw new Error('Biometric authentication not available');
    }

    try {
      return await rnBiometrics.createKeys(keyName);
    } catch (error) {
      logger.error('Failed to create biometric keys:', error);
      throw new Error('Key creation failed');
    }
  }

  async deleteKeys(keyName: string = 'bolt.droid.biometric'): Promise<boolean> {
    try {
      return await rnBiometrics.deleteKeys(keyName);
    } catch (error) {
      logger.error('Failed to delete biometric keys:', error);
      return false;
    }
  }

  async signData(payload: string): Promise<{
    success: boolean;
    signature?: string;
  }> {
    if (!this.isAvailable) {
      throw new Error('Biometric authentication not available');
    }

    try {
      return await rnBiometrics.createSignature({
        promptMessage: 'Sign in with biometrics',
        payload,
      });
    } catch (error) {
      logger.error('Biometric signing failed:', error);
      return { success: false };
    }
  }

  async encryptWithBiometrics(data: string): Promise<string> {
    if (!this.isAvailable) {
      throw new Error('Biometric authentication not available');
    }

    try {
      // First authenticate
      const authSuccess = await this.authenticate('Authenticate to encrypt data');
      if (!authSuccess) {
        throw new Error('Biometric authentication failed');
      }

      // Generate a signature as an encryption key
      const { success, signature } = await this.signData(data);
      if (!success || !signature) {
        throw new Error('Failed to generate encryption key');
      }

      // Use the signature as a key for encryption
      return await this.secureStorage.encrypt(data);
    } catch (error) {
      logger.error('Biometric encryption failed:', error);
      throw error;
    }
  }

  async decryptWithBiometrics(encryptedData: string): Promise<string> {
    if (!this.isAvailable) {
      throw new Error('Biometric authentication not available');
    }

    try {
      // First authenticate
      const authSuccess = await this.authenticate('Authenticate to decrypt data');
      if (!authSuccess) {
        throw new Error('Biometric authentication failed');
      }

      // Decrypt the data
      return await this.secureStorage.decrypt(encryptedData);
    } catch (error) {
      logger.error('Biometric decryption failed:', error);
      throw error;
    }
  }

  getBiometryType(): BiometryTypes | undefined {
    return this.biometryType;
  }

  isSupported(): boolean {
    return this.isAvailable;
  }

  getAuthPrompt(): string {
    switch (this.biometryType) {
      case BiometryTypes.FaceID:
        return 'Authenticate with Face ID';
      case BiometryTypes.TouchID:
        return 'Authenticate with Touch ID';
      case BiometryTypes.Biometrics:
        return Platform.OS === 'android' ? 'Authenticate with fingerprint' : 'Authenticate with biometrics';
      default:
        return 'Authenticate to continue';
    }
  }
}