import { createScopedLogger } from '~/utils/logger';
import { NativeModules } from 'react-native';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import type { TensorflowModel } from '~/types/neuralNet';

const logger = createScopedLogger('ModelDownloadManager');

interface DownloadProgress {
  bytesWritten: number;
  contentLength: number;
  percent: number;
}

interface ModelMetadata {
  id: string;
  name: string;
  version: string;
  size: number;
  hash: string;
  downloadUrl: string;
  lastUpdated: string;
}

interface DownloadConfig {
  maxConcurrentDownloads: number;
  retryAttempts: number;
  retryDelay: number;
  wifiOnly: boolean;
  autoUpdate: boolean;
}

export class ModelDownloadManager {
  private static instance: ModelDownloadManager;
  private readonly modelDir = `${RNFS.DocumentDirectoryPath}/models`;
  private downloadQueue: ModelMetadata[] = [];
  private activeDownloads = 0;
  private modelVersions: Map<string, string> = new Map();

  private config: DownloadConfig = {
    maxConcurrentDownloads: 2,
    retryAttempts: 3,
    retryDelay: 5000,
    wifiOnly: true,
    autoUpdate: true
  };

  private constructor() {}

  static getInstance(): ModelDownloadManager {
    if (!ModelDownloadManager.instance) {
      ModelDownloadManager.instance = new ModelDownloadManager();
    }
    return ModelDownloadManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Create models directory if needed
      const exists = await RNFS.exists(this.modelDir);
      if (!exists) {
        await RNFS.mkdir(this.modelDir);
      }

      // Load saved configuration
      const savedConfig = await AsyncStorage.getItem('model_download_config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }

      // Load model versions
      const versions = await AsyncStorage.getItem('model_versions');
      if (versions) {
        this.modelVersions = new Map(Object.entries(JSON.parse(versions)));
      }

      logger.info('Model download manager initialized');
    } catch (error) {
      logger.error('Failed to initialize model download manager:', error);
      throw error;
    }
  }

  async downloadModel(metadata: ModelMetadata, onProgress?: (progress: DownloadProgress) => void): Promise<TensorflowModel> {
    try {
      // Check network conditions
      if (this.config.wifiOnly) {
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isWifi) {
          throw new Error('WiFi connection required for model download');
        }
      }

      // Check if already downloading
      if (this.downloadQueue.some(m => m.id === metadata.id)) {
        throw new Error('Model already queued for download');
      }

      // Add to queue
      this.downloadQueue.push(metadata);

      // Process queue
      while (this.activeDownloads >= this.config.maxConcurrentDownloads) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      this.activeDownloads++;

      try {
        // Download model file
        const modelPath = `${this.modelDir}/${metadata.id}.tflite`;
        let attempt = 0;

        while (attempt < this.config.retryAttempts) {
          try {
            await RNFS.downloadFile({
              fromUrl: metadata.downloadUrl,
              toFile: modelPath,
              background: true,
              progress: (progress) => {
                if (onProgress) {
                  onProgress({
                    bytesWritten: progress.bytesWritten,
                    contentLength: progress.contentLength,
                    percent: (progress.bytesWritten / progress.contentLength) * 100
                  });
                }
              }
            }).promise;

            // Verify download
            const stats = await RNFS.stat(modelPath);
            if (stats.size !== metadata.size) {
              throw new Error('Downloaded file size mismatch');
            }

            // Verify hash
            const fileHash = await NativeModules.HashModule.getFileHash(modelPath);
            if (fileHash !== metadata.hash) {
              throw new Error('Downloaded file hash mismatch');
            }

            break;
          } catch (error) {
            attempt++;
            if (attempt >= this.config.retryAttempts) {
              throw error;
            }
            await new Promise(resolve => 
              setTimeout(resolve, this.config.retryDelay * attempt)
            );
          }
        }

        // Update version tracking
        this.modelVersions.set(metadata.id, metadata.version);
        await this.saveModelVersions();

        // Create model config
        const model: TensorflowModel = {
          path: modelPath,
          inputShape: [], // TODO: Get from metadata
          outputShape: [], // TODO: Get from metadata
        };

        logger.info(`Model downloaded successfully: ${metadata.name}`);
        return model;
      } finally {
        this.activeDownloads--;
        this.downloadQueue = this.downloadQueue.filter(m => m.id !== metadata.id);
      }
    } catch (error) {
      logger.error(`Failed to download model ${metadata.name}:`, error);
      throw error;
    }
  }

  async checkForUpdates(): Promise<ModelMetadata[]> {
    try {
      // Get latest model metadata from server
      const response = await fetch('https://api.example.com/models/metadata');
      const latestMetadata = await response.json() as ModelMetadata[];

      // Find models that need updates
      const updatesNeeded = latestMetadata.filter(metadata => {
        const currentVersion = this.modelVersions.get(metadata.id);
        return !currentVersion || currentVersion !== metadata.version;
      });

      return updatesNeeded;
    } catch (error) {
      logger.error('Failed to check for updates:', error);
      throw error;
    }
  }

  async updateModels(): Promise<void> {
    try {
      const updates = await this.checkForUpdates();

      for (const metadata of updates) {
        try {
          await this.downloadModel(metadata);
          logger.info(`Model ${metadata.name} updated to version ${metadata.version}`);
        } catch (error) {
          logger.error(`Failed to update model ${metadata.name}:`, error);
        }
      }
    } catch (error) {
      logger.error('Failed to update models:', error);
      throw error;
    }
  }

  private async saveModelVersions(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        'model_versions',
        JSON.stringify(Object.fromEntries(this.modelVersions))
      );
    } catch (error) {
      logger.error('Failed to save model versions:', error);
    }
  }

  updateConfig(config: Partial<DownloadConfig>): void {
    this.config = { ...this.config, ...config };
    AsyncStorage.setItem('model_download_config', JSON.stringify(this.config))
      .catch(error => logger.error('Failed to save config:', error));
  }

  getModelVersion(modelId: string): string | undefined {
    return this.modelVersions.get(modelId);
  }

  isDownloading(modelId: string): boolean {
    return this.downloadQueue.some(m => m.id === modelId);
  }

  getDownloadQueue(): ModelMetadata[] {
    return [...this.downloadQueue];
  }
}