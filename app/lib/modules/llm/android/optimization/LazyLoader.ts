import { createScopedLogger } from '~/utils/logger';
import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const logger = createScopedLogger('LazyLoader');

interface LazyLoadConfig {
  preloadThreshold: number; // Distance threshold for preloading (in pixels)
  maxConcurrentLoads: number; // Maximum number of concurrent loading operations
  retryAttempts: number; // Number of retry attempts for failed loads
  retryDelay: number; // Delay between retries in milliseconds
}

interface LoadOperation {
  id: string;
  priority: number;
  load: () => Promise<void>;
  retryCount: number;
}

export class LazyLoader {
  private static instance: LazyLoader;
  private loadQueue: LoadOperation[] = [];
  private activeLoads = 0;
  private config: LazyLoadConfig = {
    preloadThreshold: 1000,
    maxConcurrentLoads: 3,
    retryAttempts: 3,
    retryDelay: 1000,
  };

  private constructor() {}

  static getInstance(): LazyLoader {
    if (!LazyLoader.instance) {
      LazyLoader.instance = new LazyLoader();
    }
    return LazyLoader.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Load saved configuration
      const savedConfig = await AsyncStorage.getItem('lazy_loader_config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }

      // Start queue processor
      this.processQueue();
      logger.info('Lazy loader initialized');
    } catch (error) {
      logger.error('Failed to initialize lazy loader:', error);
      throw error;
    }
  }

  async queueLoad(
    id: string,
    loadFn: () => Promise<void>,
    priority: number = 0
  ): Promise<void> {
    try {
      // Check if already queued
      if (this.loadQueue.some(op => op.id === id)) {
        return;
      }

      // Add to queue
      this.loadQueue.push({
        id,
        priority,
        load: loadFn,
        retryCount: 0,
      });

      // Sort queue by priority
      this.loadQueue.sort((a, b) => b.priority - a.priority);

      logger.debug(`Queued load operation: ${id}`);
    } catch (error) {
      logger.error('Failed to queue load operation:', error);
      throw error;
    }
  }

  private async processQueue(): Promise<void> {
    while (true) {
      try {
        // Check if we can process more loads
        if (this.activeLoads >= this.config.maxConcurrentLoads || this.loadQueue.length === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }

        // Get next operation
        const operation = this.loadQueue.shift();
        if (!operation) continue;

        this.activeLoads++;

        // Process operation
        try {
          await operation.load();
          logger.debug(`Load operation completed: ${operation.id}`);
        } catch (error) {
          logger.error(`Load operation failed: ${operation.id}`, error);

          // Retry if attempts remaining
          if (operation.retryCount < this.config.retryAttempts) {
            operation.retryCount++;
            await new Promise(resolve => 
              setTimeout(resolve, this.config.retryDelay * operation.retryCount)
            );
            this.loadQueue.push(operation);
          }
        } finally {
          this.activeLoads--;
        }
      } catch (error) {
        logger.error('Queue processing error:', error);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  async preloadComponent(componentId: string): Promise<void> {
    try {
      await NativeModules.LazyLoadModule.preloadComponent(componentId);
      logger.debug(`Component preloaded: ${componentId}`);
    } catch (error) {
      logger.error('Failed to preload component:', error);
      throw error;
    }
  }

  async preloadImage(imageUrl: string): Promise<void> {
    try {
      await NativeModules.LazyLoadModule.preloadImage(imageUrl);
      logger.debug(`Image preloaded: ${imageUrl}`);
    } catch (error) {
      logger.error('Failed to preload image:', error);
      throw error;
    }
  }

  updateConfig(config: Partial<LazyLoadConfig>): void {
    this.config = { ...this.config, ...config };
    AsyncStorage.setItem('lazy_loader_config', JSON.stringify(this.config))
      .catch(error => logger.error('Failed to save config:', error));
  }

  clearQueue(): void {
    this.loadQueue = [];
    logger.info('Load queue cleared');
  }
}