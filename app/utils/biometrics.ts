import { NativeModules, Platform } from 'react-native';
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';

const rnBiometrics = new ReactNativeBiometrics({
  allowDeviceCredentials: true
});

export class BiometricAuth {
  private static instance: BiometricAuth;
  private isAvailable = false;
  private biometryType: BiometryTypes | undefined;

  private constructor() {}

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
        console.log('Biometric authentication not available');
        return;
      }

      console.log(`Biometric authentication available: ${biometryType}`);
    } catch (error) {
      console.error('Failed to initialize biometrics:', error);
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
      console.error('Biometric authentication failed:', error);
      return false;
    }
  }

  async createKeys(keyName: string = 'bolt.diy.biometric'): Promise<{
    publicKey: string;
    success: boolean;
  }> {
    if (!this.isAvailable) {
      throw new Error('Biometric authentication not available');
    }

    try {
      return await rnBiometrics.createKeys(keyName);
    } catch (error) {
      console.error('Failed to create biometric keys:', error);
      throw new Error('Key creation failed');
    }
  }

  async deleteKeys(keyName: string = 'bolt.diy.biometric'): Promise<boolean> {
    try {
      return await rnBiometrics.deleteKeys(keyName);
    } catch (error) {
      console.error('Failed to delete biometric keys:', error);
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
      console.error('Biometric signing failed:', error);
      return { success: false };
    }
  }

  getBiometryType(): BiometryTypes | undefined {
    return this.biometryType;
  }

  isSupported(): boolean {
    return this.isAvailable;
  }
}