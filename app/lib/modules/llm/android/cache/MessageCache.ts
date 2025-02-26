import { createScopedLogger } from '~/utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { compress, decompress } from '~/utils/compression';

const logger = createScopedLogger('MessageCache');

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheConfig {
  maxEntries: number;
  defaultTTL: number; // Time to live in milliseconds
  compressionThreshold: number; // Size in bytes above which to compress
}

export class MessageCache {
  private static instance: MessageCache;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private config: CacheConfig = {
    maxEntries: 1000,
    defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
    compressionThreshold: 1024 * 10, // 10KB
  };

  private constructor() {}

  static getInstance(): MessageCache {
    if (!MessageCache.instance) {
      MessageCache.instance = new MessageCache();
    }
    return MessageCache.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Load cached data from persistent storage
      const cacheData = await AsyncStorage.getItem('message_cache');
      if (cacheData) {
        const entries = JSON.parse(cacheData);
        for (const [key, value] of Object.entries(entries)) {
          this.cache.set(key, value as CacheEntry<any>);
        }
      }
      logger.info('Message cache initialized');
    } catch (error) {
      logger.error('Failed to initialize message cache:', error);
      throw error;
    }
  }

  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    try {
      // Check cache size and evict if necessary
      if (this.cache.size >= this.config.maxEntries) {
        this.evictOldest();
      }

      // Prepare cache entry
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + (ttl || this.config.defaultTTL),
      };

      // Compress if data is large
      const dataSize = new TextEncoder().encode(JSON.stringify(data)).length;
      if (dataSize > this.config.compressionThreshold) {
        const compressed = await compress(JSON.stringify(data));
        (entry as any).compressed = true;
        (entry as any).data = compressed;
      }

      // Store in memory cache
      this.cache.set(key, entry);

      // Persist to storage
      await this.persistCache();
      
      logger.debug(`Cached item: ${key}`);
    } catch (error) {
      logger.error('Failed to cache item:', error);
      throw error;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const entry = this.cache.get(key) as CacheEntry<T>;
      
      if (!entry) {
        return null;
      }

      // Check if expired
      if (Date.now() > entry.expiresAt) {
        this.cache.delete(key);
        await this.persistCache();
        return null;
      }

      // Decompress if needed
      if ((entry as any).compressed) {
        const decompressed = await decompress((entry as any).data);
        return JSON.parse(decompressed);
      }

      return entry.data;
    } catch (error) {
      logger.error('Failed to retrieve cached item:', error);
      return null;
    }
  }

  async clear(): Promise<void> {
    try {
      this.cache.clear();
      await AsyncStorage.removeItem('message_cache');
      logger.info('Cache cleared');
    } catch (error) {
      logger.error('Failed to clear cache:', error);
      throw error;
    }
  }

  private evictOldest(): void {
    // Find and remove oldest entry
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      logger.debug(`Evicted oldest cache entry: ${oldestKey}`);
    }
  }

  private async persistCache(): Promise<void> {
    try {
      const cacheData = Object.fromEntries(this.cache.entries());
      await AsyncStorage.setItem('message_cache', JSON.stringify(cacheData));
    } catch (error) {
      logger.error('Failed to persist cache:', error);
      throw error;
    }
  }
}