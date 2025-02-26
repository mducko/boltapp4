import type { LanguageModelV1 } from 'ai';
import type { IProviderSetting, ProviderInfo } from '~/types/model';
import { createScopedLogger } from '~/utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';

const logger = createScopedLogger('AndroidLLMManager');

export class AndroidLLMManager {
  private static instance: AndroidLLMManager;
  private _providers: Map<string, ProviderInfo> = new Map();
  private readonly _env: any = {};

  private constructor(_env: Record<string, string>) {
    this._env = _env;
  }

  static getInstance(env: Record<string, string> = {}): AndroidLLMManager {
    if (!AndroidLLMManager.instance) {
      AndroidLLMManager.instance = new AndroidLLMManager(env);
    }
    return AndroidLLMManager.instance;
  }

  get env() {
    return this._env;
  }

  async getStoredApiKeys(): Promise<Record<string, string>> {
    try {
      const keys = await AsyncStorage.getItem('llm_api_keys');
      return keys ? JSON.parse(keys) : {};
    } catch (error) {
      logger.error('Failed to get stored API keys:', error);
      return {};
    }
  }

  async setApiKey(provider: string, key: string): Promise<void> {
    try {
      const keys = await this.getStoredApiKeys();
      keys[provider] = key;
      await AsyncStorage.setItem('llm_api_keys', JSON.stringify(keys));
    } catch (error) {
      logger.error('Failed to store API key:', error);
      throw error;
    }
  }

  async removeApiKey(provider: string): Promise<void> {
    try {
      const keys = await this.getStoredApiKeys();
      delete keys[provider];
      await AsyncStorage.setItem('llm_api_keys', JSON.stringify(keys));
    } catch (error) {
      logger.error('Failed to remove API key:', error);
      throw error;
    }
  }

  registerProvider(provider: ProviderInfo) {
    if (this._providers.has(provider.name)) {
      logger.warn(`Provider ${provider.name} is already registered. Skipping.`);
      return;
    }

    logger.info('Registering Provider: ', provider.name);
    this._providers.set(provider.name, provider);
  }

  getProvider(name: string): ProviderInfo | undefined {
    return this._providers.get(name);
  }

  getAllProviders(): ProviderInfo[] {
    return Array.from(this._providers.values());
  }

  getDefaultProvider(): ProviderInfo {
    const firstProvider = this._providers.values().next().value;
    if (!firstProvider) {
      throw new Error('No providers registered');
    }
    return firstProvider;
  }
}