import type { LanguageModelV1 } from 'ai';
import type { ModelInfo, IProviderSetting, AndroidProviderInfo } from '../types';
import { createScopedLogger } from '~/utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AndroidLLMManager } from '../LLMManager';

const logger = createScopedLogger('AndroidBaseProvider');

export abstract class BaseAndroidProvider implements AndroidProviderInfo {
  abstract name: string;
  abstract staticModels: ModelInfo[];
  abstract config: {
    baseUrlKey?: string;
    apiTokenKey?: string;
    baseUrl?: string;
  };

  getApiKeyLink?: string;
  labelForGetApiKey?: string;
  icon?: string;

  protected async getProviderBaseUrlAndKey(options: {
    apiKeys?: Record<string, string>;
    providerSettings?: IProviderSetting;
    serverEnv?: Record<string, string>;
    defaultBaseUrlKey: string;
    defaultApiTokenKey: string;
  }) {
    const { apiKeys, providerSettings, serverEnv, defaultBaseUrlKey, defaultApiTokenKey } = options;
    let settingsBaseUrl = providerSettings?.baseUrl;
    const manager = AndroidLLMManager.getInstance();

    if (settingsBaseUrl && settingsBaseUrl.length == 0) {
      settingsBaseUrl = undefined;
    }

    const baseUrlKey = this.config.baseUrlKey || defaultBaseUrlKey;
    let baseUrl =
      settingsBaseUrl ||
      serverEnv?.[baseUrlKey] ||
      process?.env?.[baseUrlKey] ||
      manager.env?.[baseUrlKey] ||
      this.config.baseUrl;

    if (baseUrl && baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }

    // Get API key from secure storage
    let apiKey: string | null = null;
    try {
      const storedKeys = await AsyncStorage.getItem('llm_api_keys');
      if (storedKeys) {
        const keys = JSON.parse(storedKeys);
        apiKey = keys[this.name];
      }
    } catch (error) {
      logger.error(`Failed to get API key for ${this.name}:`, error);
    }

    // Fallback to other sources if needed
    apiKey = apiKey || 
      apiKeys?.[this.name] || 
      serverEnv?.[defaultApiTokenKey] || 
      process?.env?.[defaultApiTokenKey] || 
      manager.env?.[defaultApiTokenKey];

    return {
      baseUrl,
      apiKey,
    };
  }

  protected async storeApiKey(key: string): Promise<void> {
    try {
      const storedKeys = await AsyncStorage.getItem('llm_api_keys');
      const keys = storedKeys ? JSON.parse(storedKeys) : {};
      keys[this.name] = key;
      await AsyncStorage.setItem('llm_api_keys', JSON.stringify(keys));
    } catch (error) {
      logger.error(`Failed to store API key for ${this.name}:`, error);
      throw error;
    }
  }

  protected async removeApiKey(): Promise<void> {
    try {
      const storedKeys = await AsyncStorage.getItem('llm_api_keys');
      if (storedKeys) {
        const keys = JSON.parse(storedKeys);
        delete keys[this.name];
        await AsyncStorage.setItem('llm_api_keys', JSON.stringify(keys));
      }
    } catch (error) {
      logger.error(`Failed to remove API key for ${this.name}:`, error);
      throw error;
    }
  }

  abstract getModelInstance(options: {
    model: string;
    serverEnv?: any;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }): LanguageModelV1;
}

export { BaseAndroidProvider }