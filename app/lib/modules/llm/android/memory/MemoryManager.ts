import { createScopedLogger } from '~/utils/logger';
import { NativeModules } from 'react-native';

const logger = createScopedLogger('MemoryManager');

interface MemoryInfo {
  totalMemory: number;
  availableMemory: number;
  threshold: number;
  lowMemory: boolean;
}

interface MemoryConfig {
  warningThreshold: number; // Percentage of memory usage that triggers warnings
  criticalThreshold: number; // Percentage of memory usage that triggers cleanup
  cleanupInterval: number; // Milliseconds between cleanup checks
}

export class MemoryManager {
  private static instance: MemoryManager;
  private config: MemoryConfig = {
    warningThreshold: 70, // Warn at 70% usage
    criticalThreshold: 85, // Critical at 85% usage
    cleanupInterval: 60000, // Check every minute
  };
  private cleanupTimer: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Start memory monitoring
      this.startMonitoring();
      logger.info('Memory manager initialized');
    } catch (error) {
      logger.error('Failed to initialize memory manager:', error);
      throw error;
    }
  }

  async getMemoryInfo(): Promise<MemoryInfo> {
    try {
      const memInfo = await NativeModules.MemoryModule.getMemoryInfo();
      return {
        totalMemory: memInfo.totalMemory,
        availableMemory: memInfo.availableMemory,
        threshold: memInfo.threshold,
        lowMemory: memInfo.lowMemory,
      };
    } catch (error) {
      logger.error('Failed to get memory info:', error);
      throw error;
    }
  }

  private startMonitoring(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(async () => {
      try {
        const memInfo = await this.getMemoryInfo();
        const usagePercent = ((memInfo.totalMemory - memInfo.availableMemory) / memInfo.totalMemory) * 100;

        if (usagePercent > this.config.criticalThreshold) {
          await this.performCriticalCleanup();
        } else if (usagePercent > this.config.warningThreshold) {
          await this.performWarningCleanup();
        }

        if (memInfo.lowMemory) {
          logger.warn('Low memory condition detected');
          await this.handleLowMemory();
        }
      } catch (error) {
        logger.error('Memory monitoring error:', error);
      }
    }, this.config.cleanupInterval);
  }

  private async performCriticalCleanup(): Promise<void> {
    logger.warn('Performing critical memory cleanup');
    try {
      // Clear image caches
      await NativeModules.MemoryModule.clearImageCache();
      
      // Clear non-essential caches
      global.gc?.(); // Trigger garbage collection if available
      
      logger.info('Critical cleanup completed');
    } catch (error) {
      logger.error('Critical cleanup failed:', error);
    }
  }

  private async performWarningCleanup(): Promise<void> {
    logger.info('Performing warning level memory cleanup');
    try {
      // Clear old caches
      await NativeModules.MemoryModule.clearOldCaches();
      
      logger.info('Warning cleanup completed');
    } catch (error) {
      logger.error('Warning cleanup failed:', error);
    }
  }

  private async handleLowMemory(): Promise<void> {
    try {
      // Notify the app to reduce memory usage
      await NativeModules.MemoryModule.reduceCacheSize();
      
      // Clear non-critical data
      await NativeModules.MemoryModule.clearNonCriticalData();
      
      logger.info('Low memory handling completed');
    } catch (error) {
      logger.error('Low memory handling failed:', error);
    }
  }

  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}