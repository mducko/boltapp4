import { createScopedLogger } from '~/utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';

const logger = createScopedLogger('StorageQuotas');

// Storage limits in bytes
const LIMITS = {
  TOTAL_STORAGE: 100 * 1024 * 1024, // 100MB
  MESSAGE_COUNT: 1000,
  ATTACHMENT_SIZE: 50 * 1024 * 1024, // 50MB
};

export interface StorageStats {
  totalSize: number;
  messageCount: number;
  attachmentSize: number;
  lastChecked: string;
}

export async function checkStorageQuotas(): Promise<{
  withinLimits: boolean;
  warnings: string[];
  stats: StorageStats;
}> {
  try {
    const stats = await getStorageStats();
    const warnings: string[] = [];

    if (stats.totalSize > LIMITS.TOTAL_STORAGE) {
      warnings.push(`Storage usage (${formatBytes(stats.totalSize)}) exceeds limit of ${formatBytes(LIMITS.TOTAL_STORAGE)}`);
    }

    if (stats.messageCount > LIMITS.MESSAGE_COUNT) {
      warnings.push(`Message count (${stats.messageCount}) exceeds limit of ${LIMITS.MESSAGE_COUNT}`);
    }

    if (stats.attachmentSize > LIMITS.ATTACHMENT_SIZE) {
      warnings.push(`Attachment size (${formatBytes(stats.attachmentSize)}) exceeds limit of ${formatBytes(LIMITS.ATTACHMENT_SIZE)}`);
    }

    return {
      withinLimits: warnings.length === 0,
      warnings,
      stats,
    };
  } catch (error) {
    logger.error('Failed to check storage quotas:', error);
    throw error;
  }
}

export async function getStorageStats(): Promise<StorageStats> {
  try {
    let totalSize = 0;
    let messageCount = 0;
    let attachmentSize = 0;

    // Get all keys
    const keys = await AsyncStorage.getAllKeys();

    // Calculate sizes for each key
    for (const key of keys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        const size = new TextEncoder().encode(value).length;
        totalSize += size;

        if (key.startsWith('message_')) {
          messageCount++;
        } else if (key.startsWith('attachment_')) {
          attachmentSize += size;
        }
      }
    }

    return {
      totalSize,
      messageCount,
      attachmentSize,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Failed to get storage stats:', error);
    throw error;
  }
}

export async function cleanupStorage(): Promise<void> {
  try {
    // Get all keys
    const keys = await AsyncStorage.getAllKeys();
    const now = Date.now();
    const MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days
    const keysToRemove: string[] = [];

    // Find old messages and attachments
    for (const key of keys) {
      if (key.startsWith('message_') || key.startsWith('attachment_')) {
        const item = await AsyncStorage.getItem(key);
        if (item) {
          const data = JSON.parse(item);
          if (now - new Date(data.timestamp).getTime() > MAX_AGE) {
            keysToRemove.push(key);
          }
        }
      }
    }

    // Remove old items
    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
      logger.info(`Cleaned up ${keysToRemove.length} old items`);
    }
  } catch (error) {
    logger.error('Failed to clean up storage:', error);
    throw error;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return '0 B';
  }
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}