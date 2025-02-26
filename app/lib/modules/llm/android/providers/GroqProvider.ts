import { BaseAndroidProvider } from './BaseProvider';
import type { ModelInfo } from '../types';
import type { IProviderSetting } from '~/types/model';
import type { LanguageModelV1 } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('GroqProvider');

export default class GroqProvider extends BaseAndroidProvider {
  name = 'Groq';
  getApiKeyLink = 'https://console.groq.com/keys';

  config = {
    apiTokenKey: 'GROQ_API_KEY',
  };

  staticModels: ModelInfo[] = [
    { name: 'llama-3.1-8b-instant', label: 'Llama 3.1 8b (Groq)', provider: 'Groq', maxTokenAllowed: 8000 },
    { name: 'llama-3.2-11b-vision-preview', label: 'Llama 3.2 11b (Groq)', provider: 'Groq', maxTokenAllowed: 8000 },
    { name: 'llama-3.2-90b-vision-preview', label: 'Llama 3.2 90b (Groq)', provider: 'Groq', maxTokenAllowed: 8000 },
    { name: 'llama-3.2-3b-preview', label: 'Llama 3.2 3b (Groq)', provider: 'Groq', maxTokenAllowed: 8000 },
    { name: 'llama-3.2-1b-preview', label: 'Llama 3.2 1b (Groq)', provider: 'Groq', maxTokenAllowed: 8000 },
    { name: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70b (Groq)', provider: 'Groq', maxTokenAllowed: 8000 },
    {
      name: 'deepseek-r1-distill-llama-70b',
      label: 'Deepseek R1 Distill Llama 70b (Groq)',
      provider: 'Groq',
      maxTokenAllowed: 131072,
    },
  ];

  async getDynamicModels(
    apiKeys?: Record<string, string>,
    settings?: IProviderSetting,
    serverEnv?: Record<string, string>,
  ): Promise<ModelInfo[]> {
    const { apiKey } = await this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: settings,
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: '',
      defaultApiTokenKey: 'GROQ_API_KEY',
    });

    if (!apiKey) {
      throw `Missing Api Key configuration for ${this.name} provider`;
    }

    try {
      const response = await fetch(`https://api.groq.com/openai/v1/models`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      const res = (await response.json()) as any;
      const data = res.data.filter(
        (model: any) => model.object === 'model' && model.active && model.context_window > 8000,
      );

      return data.map((m: any) => ({
        name: m.id,
        label: `${m.id} - context ${m.context_window ? Math.floor(m.context_window / 1000) + 'k' : 'N/A'} [ by ${m.owned_by}]`,
        provider: this.name,
        maxTokenAllowed: m.context_window || 8000,
      }));
    } catch (error) {
      logger.error('Failed to fetch Groq models:', error);
      return this.staticModels;
    }
  }

  async getModelInstance(options: {
    model: string;
    serverEnv: any;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }): Promise<LanguageModelV1> {
    const { model, serverEnv, apiKeys, providerSettings } = options;

    const { apiKey } = await this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: '',
      defaultApiTokenKey: 'GROQ_API_KEY',
    });

    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }

    try {
      const openai = createOpenAI({
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey,
      });

      return openai(model);
    } catch (error) {
      logger.error('Failed to create Groq instance:', error);
      throw error;
    }
  }
}