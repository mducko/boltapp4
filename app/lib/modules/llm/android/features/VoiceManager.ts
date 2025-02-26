import { createScopedLogger } from '~/utils/logger';
import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const logger = createScopedLogger('VoiceManager');

interface VoiceConfig {
  enabled: boolean;
  language: string;
  pitch: number;
  rate: number;
  volume: number;
  recognitionTimeout: number;
}

interface VoiceAnnouncement {
  message: string;
  priority: 'low' | 'medium' | 'high';
  delay?: number;
}

export class VoiceManager {
  private static instance: VoiceManager;
  private config: VoiceConfig = {
    enabled: true,
    language: 'en-US',
    pitch: 1.0,
    rate: 1.0,
    volume: 1.0,
    recognitionTimeout: 5000
  };

  private constructor() {}

  static getInstance(): VoiceManager {
    if (!VoiceManager.instance) {
      VoiceManager.instance = new VoiceManager();
    }
    return VoiceManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Load saved configuration
      const savedConfig = await AsyncStorage.getItem('voice_config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }

      // Initialize native modules
      await NativeModules.VoiceModule.initialize(this.config);
      logger.info('Voice manager initialized');
    } catch (error) {
      logger.error('Failed to initialize voice manager:', error);
      throw error;
    }
  }

  async startListening(onResult: (text: string) => void): Promise<void> {
    try {
      if (!this.config.enabled) {
        return;
      }

      await NativeModules.VoiceModule.startRecognition(
        this.config.language,
        this.config.recognitionTimeout,
        (text: string) => {
          onResult(text);
        }
      );

      logger.debug('Voice recognition started');
    } catch (error) {
      logger.error('Failed to start voice recognition:', error);
      throw error;
    }
  }

  async stopListening(): Promise<void> {
    try {
      await NativeModules.VoiceModule.stopRecognition();
      logger.debug('Voice recognition stopped');
    } catch (error) {
      logger.error('Failed to stop voice recognition:', error);
      throw error;
    }
  }

  async speak(text: string): Promise<void> {
    try {
      if (!this.config.enabled) {
        return;
      }

      await NativeModules.VoiceModule.speak(text, {
        language: this.config.language,
        pitch: this.config.pitch,
        rate: this.config.rate,
        volume: this.config.volume
      });

      logger.debug('Text-to-speech completed');
    } catch (error) {
      logger.error('Failed to speak text:', error);
      throw error;
    }
  }

  updateConfig(config: Partial<VoiceConfig>): void {
    this.config = { ...this.config, ...config };
    AsyncStorage.setItem('voice_config', JSON.stringify(this.config))
      .catch(error => logger.error('Failed to save config:', error));
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    this.updateConfig(this.config);
  }

  getConfig(): VoiceConfig {
    return { ...this.config };
  }
}