import AnthropicProvider from './providers/AnthropicProvider';
import GoogleProvider from './providers/GoogleProvider';
import GroqProvider from './providers/GroqProvider';
import OpenAIProvider from './providers/OpenAIProvider';
import { createScopedLogger } from '~/utils/logger';
import { AndroidLLMManager } from './LLMManager';

const logger = createScopedLogger('AndroidProviderRegistry');

export class AndroidProviderRegistry {
  private static instance: AndroidProviderRegistry;
  private llmManager: AndroidLLMManager;

  private constructor() {
    this.llmManager = AndroidLLMManager.getInstance();
  }

  static getInstance(): AndroidProviderRegistry {
    if (!AndroidProviderRegistry.instance) {
      AndroidProviderRegistry.instance = new AndroidProviderRegistry();
    }
    return AndroidProviderRegistry.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Register all providers
      this.registerProvider(new AnthropicProvider());
      this.registerProvider(new GoogleProvider());
      this.registerProvider(new GroqProvider());
      this.registerProvider(new OpenAIProvider());

      logger.info('Provider registry initialized');
    } catch (error) {
      logger.error('Failed to initialize provider registry:', error);
      throw error;
    }
  }

  private registerProvider(provider: any) {
    try {
      this.llmManager.registerProvider(provider);
      logger.debug(`Registered provider: ${provider.name}`);
    } catch (error) {
      logger.error(`Failed to register provider ${provider.name}:`, error);
      throw error;
    }
  }

  async getProviderApiKey(providerName: string): Promise<string | null> {
    try {
      const keys = await this.llmManager.getStoredApiKeys();
      return keys[providerName] || null;
    } catch (error) {
      logger.error(`Failed to get API key for provider ${providerName}:`, error);
      return null;
    }
  }

  async setProviderApiKey(providerName: string, apiKey: string): Promise<void> {
    try {
      await this.llmManager.setApiKey(providerName, apiKey);
      logger.debug(`API key set for provider: ${providerName}`);
    } catch (error) {
      logger.error(`Failed to set API key for provider ${providerName}:`, error);
      throw error;
    }
  }

  async removeProviderApiKey(providerName: string): Promise<void> {
    try {
      await this.llmManager.removeApiKey(providerName);
      logger.debug(`API key removed for provider: ${providerName}`);
    } catch (error) {
      logger.error(`Failed to remove API key for provider ${providerName}:`, error);
      throw error;
    }
  }

  getProviders() {
    return this.llmManager.getAllProviders();
  }

  getDefaultProvider() {
    return this.llmManager.getDefaultProvider();
  }
}