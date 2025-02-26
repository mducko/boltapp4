
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import Voice, { SpeechResultsEvent } from '@react-native-voice/voice';
import * as Speech from 'expo-speech';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('VoiceManager');

export class VoiceManager {
  private static instance: VoiceManager;
  private isListening: boolean = false;

  private constructor() {
    Voice.onSpeechResults = this.onSpeechResults.bind(this);
  }

  static getInstance(): VoiceManager {
    if (!VoiceManager.instance) {
      VoiceManager.instance = new VoiceManager();
    }
    return VoiceManager.instance;
  }

  async startListening(): Promise<void> {
    try {
      this.isListening = true;
      await Voice.start('en-US');
    } catch (error) {
      logger.error('Error starting voice recognition:', error);
      throw error;
    }
  }

  async stopListening(): Promise<void> {
    try {
      this.isListening = false;
      await Voice.stop();
    } catch (error) {
      logger.error('Error stopping voice recognition:', error);
      throw error;
    }
  }

  async speak(text: string): Promise<void> {
    try {
      await Speech.speak(text, {
        language: 'en',
        pitch: 1,
        rate: 0.9,
      });
    } catch (error) {
      logger.error('Error during speech synthesis:', error);
      throw error;
    }
  }

  private onSpeechResults(event: SpeechResultsEvent) {
    if (event.value) {
      logger.debug('Speech recognition results:', event.value);
    }
  }

  cleanup() {
    Voice.destroy().then(Voice.removeAllListeners);
  }
}
