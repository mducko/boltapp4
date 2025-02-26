import { createScopedLogger } from '~/utils/logger';
import { Animated, Easing } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const logger = createScopedLogger('AnimationManager');

interface AnimationConfig {
  enabled: boolean;
  duration: number;
  easing: keyof typeof Easing;
  useNativeDriver: boolean;
}

interface AnimationPreset {
  id: string;
  name: string;
  config: Partial<AnimationConfig>;
  timings: Record<string, number>;
}

export class AnimationManager {
  private static instance: AnimationManager;
  private animations: Map<string, Animated.Value> = new Map();
  private presets: Map<string, AnimationPreset> = new Map();

  private config: AnimationConfig = {
    enabled: true,
    duration: 300,
    easing: 'easeInOut',
    useNativeDriver: true
  };

  private constructor() {}

  static getInstance(): AnimationManager {
    if (!AnimationManager.instance) {
      AnimationManager.instance = new AnimationManager();
    }
    return AnimationManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Load saved configuration
      const savedConfig = await AsyncStorage.getItem('animation_config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }

      // Load custom presets
      const savedPresets = await AsyncStorage.getItem('animation_presets');
      if (savedPresets) {
        const presets = JSON.parse(savedPresets);
        for (const preset of presets) {
          this.presets.set(preset.id, preset);
        }
      }

      logger.info('Animation manager initialized');
    } catch (error) {
      logger.error('Failed to initialize animation manager:', error);
      throw error;
    }
  }

  createAnimation(
    id: string,
    type: 'fade' | 'scale' | 'slide' | 'rotate',
    customConfig?: Partial<AnimationConfig>
  ): Animated.CompositeAnimation {
    try {
      const config = { ...this.config, ...customConfig };
      let value = this.animations.get(id);

      if (!value) {
        value = new Animated.Value(0);
        this.animations.set(id, value);
      }

      const animation = {
        fade: () => ({
          toValue: 1,
          duration: config.duration,
          easing: Easing[config.easing],
          useNativeDriver: config.useNativeDriver
        }),
        scale: () => ({
          toValue: 1,
          duration: config.duration,
          easing: Easing[config.easing],
          useNativeDriver: config.useNativeDriver
        }),
        slide: () => ({
          toValue: 1,
          duration: config.duration,
          easing: Easing[config.easing],
          useNativeDriver: config.useNativeDriver
        }),
        rotate: () => ({
          toValue: 1,
          duration: config.duration,
          easing: Easing[config.easing],
          useNativeDriver: config.useNativeDriver
        })
      }[type];

      return Animated.timing(value, animation());
    } catch (error) {
      logger.error('Failed to create animation:', error);
      throw error;
    }
  }

  createSequence(animations: Animated.CompositeAnimation[]): Animated.CompositeAnimation {
    return Animated.sequence(animations);
  }

  createParallel(animations: Animated.CompositeAnimation[]): Animated.CompositeAnimation {
    return Animated.parallel(animations);
  }

  createPreset(preset: AnimationPreset): void {
    try {
      this.presets.set(preset.id, preset);
      this.savePresets();
      logger.debug(`Animation preset created: ${preset.name}`);
    } catch (error) {
      logger.error('Failed to create preset:', error);
      throw error;
    }
  }

  getPreset(id: string): AnimationPreset | undefined {
    return this.presets.get(id);
  }

  getAllPresets(): AnimationPreset[] {
    return Array.from(this.presets.values());
  }

  deletePreset(id: string): void {
    try {
      this.presets.delete(id);
      this.savePresets();
      logger.debug(`Animation preset deleted: ${id}`);
    } catch (error) {
      logger.error('Failed to delete preset:', error);
      throw error;
    }
  }

  private async savePresets(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        'animation_presets',
        JSON.stringify(Array.from(this.presets.values()))
      );
    } catch (error) {
      logger.error('Failed to save presets:', error);
      throw error;
    }
  }

  updateConfig(config: Partial<AnimationConfig>): void {
    this.config = { ...this.config, ...config };
    AsyncStorage.setItem('animation_config', JSON.stringify(this.config))
      .catch(error => logger.error('Failed to save config:', error));
  }

  getAnimatedValue(id: string): Animated.Value | undefined {
    return this.animations.get(id);
  }

  reset(id: string): void {
    const value = this.animations.get(id);
    if (value) {
      value.setValue(0);
    }
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    this.updateConfig(this.config);
  }
}