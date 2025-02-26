import { createScopedLogger } from '~/utils/logger';
import { NeuralNetManager } from './neural/NeuralNetManager';
import type { TensorflowModel } from '~/types/neuralNet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';

const logger = createScopedLogger('ModelManager');

export class ModelManager {
  private static instance: ModelManager;
  private neuralNetManager: NeuralNetManager;
  private readonly modelDir = `${RNFS.DocumentDirectoryPath}/models`;

  private constructor() {
    this.neuralNetManager = NeuralNetManager.getInstance();
  }

  static getInstance(): ModelManager {
    if (!ModelManager.instance) {
      ModelManager.instance = new ModelManager();
    }
    return ModelManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Create models directory if it doesn't exist
      const exists = await RNFS.exists(this.modelDir);
      if (!exists) {
        await RNFS.mkdir(this.modelDir);
      }

      // Initialize neural network
      await this.neuralNetManager.initialize();
      logger.info('Model manager initialized');
    } catch (error) {
      logger.error('Failed to initialize model manager:', error);
      throw error;
    }
  }

  async downloadModel(modelUrl: string, modelConfig: Omit<TensorflowModel, 'path'>): Promise<TensorflowModel> {
    try {
      const modelName = modelUrl.split('/').pop() || 'model.tflite';
      const modelPath = `${this.modelDir}/${modelName}`;

      // Download model file
      await RNFS.downloadFile({
        fromUrl: modelUrl,
        toFile: modelPath,
        background: true,
        progress: (progress) => {
          const percent = (progress.bytesWritten / progress.contentLength) * 100;
          logger.debug(`Download progress: ${percent.toFixed(2)}%`);
        },
      }).promise;

      // Create model config
      const model: TensorflowModel = {
        ...modelConfig,
        path: modelPath,
      };

      // Save model info
      await this.saveModelInfo(modelName, model);
      logger.info('Model downloaded successfully:', modelName);

      return model;
    } catch (error) {
      logger.error('Failed to download model:', error);
      throw error;
    }
  }

  async loadModel(modelName: string): Promise<TensorflowModel> {
    try {
      // Get model info
      const model = await this.getModelInfo(modelName);
      if (!model) {
        throw new Error(`Model ${modelName} not found`);
      }

      // Load model into neural network
      const success = await this.neuralNetManager.loadModel(model);
      if (!success) {
        throw new Error(`Failed to load model ${modelName}`);
      }

      logger.info('Model loaded successfully:', modelName);
      return model;
    } catch (error) {
      logger.error('Failed to load model:', error);
      throw error;
    }
  }

  async deleteModel(modelName: string): Promise<void> {
    try {
      // Get model info
      const model = await this.getModelInfo(modelName);
      if (!model) {
        throw new Error(`Model ${modelName} not found`);
      }

      // Delete model file
      await RNFS.unlink(model.path);

      // Remove model info
      await this.removeModelInfo(modelName);
      logger.info('Model deleted successfully:', modelName);
    } catch (error) {
      logger.error('Failed to delete model:', error);
      throw error;
    }
  }

  async listModels(): Promise<TensorflowModel[]> {
    try {
      const modelsJson = await AsyncStorage.getItem('models');
      return modelsJson ? JSON.parse(modelsJson) : [];
    } catch (error) {
      logger.error('Failed to list models:', error);
      return [];
    }
  }

  private async saveModelInfo(modelName: string, model: TensorflowModel): Promise<void> {
    try {
      const models = await this.listModels();
      const modelIndex = models.findIndex(m => m.path.includes(modelName));
      
      if (modelIndex >= 0) {
        models[modelIndex] = model;
      } else {
        models.push(model);
      }

      await AsyncStorage.setItem('models', JSON.stringify(models));
    } catch (error) {
      logger.error('Failed to save model info:', error);
      throw error;
    }
  }

  private async getModelInfo(modelName: string): Promise<TensorflowModel | null> {
    try {
      const models = await this.listModels();
      return models.find(m => m.path.includes(modelName)) || null;
    } catch (error) {
      logger.error('Failed to get model info:', error);
      return null;
    }
  }

  private async removeModelInfo(modelName: string): Promise<void> {
    try {
      const models = await this.listModels();
      const filteredModels = models.filter(m => !m.path.includes(modelName));
      await AsyncStorage.setItem('models', JSON.stringify(filteredModels));
    } catch (error) {
      logger.error('Failed to remove model info:', error);
      throw error;
    }
  }
}