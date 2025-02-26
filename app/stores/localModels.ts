import { map } from 'nanostores';
import { storage } from './storage';
import type { ModelInfo } from '../types/model';

interface LocalModelState {
  availableModels: ModelInfo[];
  selectedModel: string | null;
  isDownloading: boolean;
  downloadProgress: number;
}

export const localModelStore = map<LocalModelState>({
  availableModels: [],
  selectedModel: null,
  isDownloading: false,
  downloadProgress: 0,
});

export async function initializeLocalModels() {
  const savedModels = await storage.get('localModels');
  if (savedModels) {
    localModelStore.setKey('availableModels', savedModels);
  }
}

export async function downloadModel(modelInfo: ModelInfo) {
  try {
    localModelStore.setKey('isDownloading', true);
    
    // TODO: Implement actual model download logic
    // This would integrate with a local inference engine
    
    const currentModels = localModelStore.get().availableModels;
    localModelStore.setKey('availableModels', [...currentModels, modelInfo]);
    await storage.set('localModels', localModelStore.get().availableModels);
    
  } catch (error) {
    console.error('Failed to download model:', error);
    throw error;
  } finally {
    localModelStore.setKey('isDownloading', false);
    localModelStore.setKey('downloadProgress', 0);
  }
}

export async function deleteModel(modelName: string) {
  try {
    const currentModels = localModelStore.get().availableModels;
    const updatedModels = currentModels.filter(m => m.name !== modelName);
    
    localModelStore.setKey('availableModels', updatedModels);
    await storage.set('localModels', updatedModels);
    
    if (localModelStore.get().selectedModel === modelName) {
      localModelStore.setKey('selectedModel', null);
    }
  } catch (error) {
    console.error('Failed to delete model:', error);
    throw error;
  }
}