import AsyncStorage from '@react-native-async-storage/async-storage';
import { compress, decompress } from '../utils/compression';
import { Encryption } from '../utils/encryption';
import { createScopedLogger } from '../utils/logger';

const logger = createScopedLogger('StorageManager');

interface StorageOptions {
  encrypt?: boolean;
  compress?: boolean;
  ttl?: number;
}

const COMPRESSION_THRESHOLD = 1024 * 10; // 10KB
const CHUNK_SIZE = 1024 * 1024; // 1MB

export class StorageManager {
  private static instance: StorageManager;
  private encryption: Encryption;

  private constructor() {
    this.encryption = Encryption.getInstance();
  }

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  async get<T>(key: string, options: StorageOptions = {}): Promise<T | null> {
    try {
      let data = await AsyncStorage.getItem(key);

      if (!data) {
        return null;
      }

      // Handle chunked data
      if (data.startsWith('chunked:')) {
        data = await this.getChunked(key);
      }

      // Handle TTL
      if (data.includes('"expires":')) {
        const { value, expires } = JSON.parse(data);
        if (Date.now() > expires) {
          await this.remove(key);
          return null;
        }
        data = value;
      }

      // Handle encrypted data first
      if (options.encrypt) {
        data = await this.encryption.decrypt(data);
      }

      // Handle compressed data
      if (options.compress) {
        data = await decompress(data);
      }

      return JSON.parse(data);
    } catch (error) {
      logger.error(`Error reading from storage (${key}):`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, options: StorageOptions = {}): Promise<void> {
    try {
      let data = JSON.stringify(value);

      // Handle compression for large data
      if (options.compress || Buffer.byteLength(data, 'utf8') > COMPRESSION_THRESHOLD) {
        data = await compress(data);
      }

      // Handle encryption
      if (options.encrypt) {
        data = await this.encryption.encrypt(data);
      }

      // Handle TTL
      if (options.ttl) {
        const ttlData = {
          value: data,
          expires: Date.now() + options.ttl,
        };
        data = JSON.stringify(ttlData);
      }

      // Split large data into chunks if needed
      if (Buffer.byteLength(data, 'utf8') > CHUNK_SIZE) {
        await this.setChunked(key, data);
      } else {
        await AsyncStorage.setItem(key, data);
      }

      await this.updateStorageStats();
    } catch (error) {
      logger.error(`Error writing to storage (${key}):`, error);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      // Check if data is chunked
      const data = await AsyncStorage.getItem(key);
      if (data?.startsWith('chunked:')) {
        const chunkCount = parseInt(data.split(':')[1]);
        const chunkKeys = Array.from({ length: chunkCount }, (_, i) => `${key}_chunk_${i}`);
        await AsyncStorage.multiRemove([key, ...chunkKeys]);
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      logger.error(`Error removing from storage (${key}):`, error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
      logger.info('Storage cleared');
    } catch (error) {
      logger.error('Error clearing storage:', error);
      throw error;
    }
  }

  private async setChunked(key: string, data: string): Promise<void> {
    const chunks = [];
    const totalLength = data.length;
    let offset = 0;

    while (offset < totalLength) {
      chunks.push(data.slice(offset, offset + CHUNK_SIZE));
      offset += CHUNK_SIZE;
    }

    // Store chunks
    await Promise.all(
      chunks.map((chunk, index) =>
        AsyncStorage.setItem(`${key}_chunk_${index}`, chunk)
      )
    );

    // Store chunk metadata
    await AsyncStorage.setItem(key, `chunked:${chunks.length}`);
  }

  private async getChunked(key: string): Promise<string> {
    const metadata = await AsyncStorage.getItem(key);
    if (!metadata?.startsWith('chunked:')) {
      throw new Error('Invalid chunked data');
    }

    const chunkCount = parseInt(metadata.split(':')[1]);
    const chunks = await Promise.all(
      Array.from({ length: chunkCount }, (_, i) =>
        AsyncStorage.getItem(`${key}_chunk_${i}`)
      )
    );

    return chunks.join('');
  }

  private async updateStorageStats(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      let totalSize = 0;
      let messageCount = 0;
      let attachmentSize = 0;

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

      await AsyncStorage.setItem('storage_stats', JSON.stringify({
        totalSize,
        messageCount,
        attachmentSize,
        lastChecked: new Date().toISOString()
      }));
    } catch (error) {
      logger.error('Failed to update storage stats:', error);
    }
  }
}