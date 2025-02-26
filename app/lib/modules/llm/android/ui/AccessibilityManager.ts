import { createScopedLogger } from '~/utils/logger';
import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const logger = createScopedLogger('AccessibilityManager');

interface AccessibilityConfig {
  enabled: boolean;
  fontSize: number;
  fontScale: number;
  highContrast: boolean;
  reduceMotion: boolean;
  screenReader: boolean;
}

interface AccessibilityAnnouncement {
  message: string;
  priority: 'low' | 'medium' | 'high';
  delay?: number;
}

export class AccessibilityManager {
  private static instance: AccessibilityManager;
  private config: AccessibilityConfig = {
    enabled: true,
    fontSize: 16,
    fontScale: 1,
    highContrast: false,
    reduceMotion: false,
    screenReader: false
  };

  private constructor() {}

  static getInstance(): AccessibilityManager {
    if (!AccessibilityManager.instance) {
      AccessibilityManager.instance = new AccessibilityManager();
    }
    return AccessibilityManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Load saved configuration
      const savedConfig = await AsyncStorage.getItem('accessibility_config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }

      // Check system accessibility settings
      const systemSettings = await NativeModules.AccessibilityModule.getSystemSettings();
      this.updateConfig({
        screenReader: systemSettings.screenReaderEnabled,
        reduceMotion: systemSettings.reduceMotionEnabled,
        fontScale: systemSettings.fontScale
      });

      logger.info('Accessibility manager initialized');
    } catch (error) {
      logger.error('Failed to initialize accessibility manager:', error);
      throw error;
    }
  }

  async announce(announcement: AccessibilityAnnouncement): Promise<void> {
    try {
      if (!this.config.enabled || !this.config.screenReader) {
        return;
      }

      await NativeModules.AccessibilityModule.announce(
        announcement.message,
        announcement.priority,
        announcement.delay || 0
      );

      logger.debug(`Announcement made: ${announcement.message}`);
    } catch (error) {
      logger.error('Failed to make announcement:', error);
      throw error;
    }
  }

  getAccessibleProps(elementType: string): Record<string, any> {
    const props: Record<string, any> = {
      accessible: this.config.enabled,
      accessibilityRole: elementType
    };

    if (this.config.screenReader) {
      props.accessibilityLiveRegion = 'polite';
    }

    return props;
  }

  getFontSize(baseSize: number): number {
    return baseSize * this.config.fontScale;
  }

  shouldReduceMotion(): boolean {
    return this.config.reduceMotion;
  }

  isHighContrastEnabled(): boolean {
    return this.config.highContrast;
  }

  updateConfig(config: Partial<AccessibilityConfig>): void {
    this.config = { ...this.config, ...config };
    AsyncStorage.setItem('accessibility_config', JSON.stringify(this.config))
      .catch(error => logger.error('Failed to save config:', error));
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    this.updateConfig(this.config);
  }

  getConfig(): AccessibilityConfig {
    return { ...this.config };
  }
}