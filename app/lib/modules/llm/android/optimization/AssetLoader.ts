import { createScopedLogger } from '~/utils/logger';
import { LazyLoader } from './LazyLoader';
import { ImageOptimizer } from './ImageOptimizer';
import RNFS from 'react-native-fs';

const logger = createScopedLogger('AssetLoader');

interface AssetMetadata {
  id: string;
  url: string;
  type: 'image' | 'font' | 'audio' | 'video';
  priority: number;
  size?: number;
}

interface AssetCacheEntry {
  localPath: string;
  timestamp: number;
  size: number;
}

export class AssetLoader {
  private static instance: AssetLoader;
  private lazyLoader: LazyLoader;
  private imageOptimizer: ImageOptimizer;
  private assetCache: Map<string, AssetCacheEntry> = new Map();
  private readonly cacheDir = `${RNFS.CacheDirectoryPath}/assets`;

  private constructor() {
    this.lazyLoader = LazyLoader.getInstance();
    this.imageOptimizer = ImageOptimizer.getInstance();
  }

  static getInstance(): AssetLoader {
    if (!AssetLoader.instance) {
      AssetLoader.instance = new AssetLoader();
    }
    return AssetLoader.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Create cache directory if needed
      const exists = await RNFS.exists(this.cacheDir);
      if (!exists) {
        await RNFS.mkdir(this.cacheDir);
      }

      // Load cache metadata
      const cacheData = await RNFS.readFile(`${this.cacheDir}/metadata.json`, 'utf8')
        .catch(() => '{}');
      const metadata = JSON.parse(cacheData);
      
      for (const [id, entry] of Object.entries(metadata)) {
        this.assetCache.set(id, entry as AssetCacheEntry);
      }

      logger.info('Asset loader initialized');
    } catch (error) {
      logger.error('Failed to initialize asset loader:', error);
      throw error;
    }
  }

  async loadAsset(metadata: AssetMetadata): Promise<string> {
    try {
      // Check cache first
      const cached = this.assetCache.get(metadata.id);
      if (cached && await RNFS.exists(cached.localPath)) {
        logger.debug(`Asset found in cache: ${metadata.id}`);
        return cached.localPath;
      }

      // Generate local path
      const ext = metadata.url.split('.').pop() || '';
      const localPath = `${this.cacheDir}/${metadata.id}.${ext}`;

      // Queue asset download
      await this.lazyLoader.queueLoad(
        metadata.id,
        async () => {
          // Download asset
          await RNFS.downloadFile({
            fromUrl: metadata.url,
            toFile: localPath,
            background: true,
          }).promise;

          // Optimize if it's an image
          let finalPath = localPath;
          if (metadata.type === 'image') {
            finalPath = await this.imageOptimizer.optimizeImage(localPath);
          }

          // Update cache
          const stats = await RNFS.stat(finalPath);
          this.assetCache.set(metadata.id, {
            localPath: finalPath,
            timestamp: Date.now(),
            size: stats.size,
          });

          // Save cache metadata
          await this.persistCacheMetadata();
        },
        metadata.priority
      );

      // Wait for asset to be available
      while (!this.assetCache.has(metadata.id)) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      return this.assetCache.get(metadata.id)!.localPath;
    } catch (error) {
      logger.error(`Failed to load asset ${metadata.id}:`, error);
      throw error;
    }
  }

  async preloadAsset(metadata: AssetMetadata): Promise<void> {
    try {
      if (this.assetCache.has(metadata.id)) {
        return;
      }

      if (metadata.type === 'image') {
        await this.lazyLoader.preloadImage(metadata.url);
      }

      logger.debug(`Asset preloaded: ${metadata.id}`);
    } catch (error) {
      logger.error(`Failed to preload asset ${metadata.id}:`, error);
      throw error;
    }
  }

  private async persistCacheMetadata(): Promise<void> {
    try {
      const metadata = Object.fromEntries(this.assetCache.entries());
      await RNFS.writeFile(
        `${this.cacheDir}/metadata.json`,
        JSON.stringify(metadata),
        'utf8'
      );
    } catch (error) {
      logger.error('Failed to persist cache metadata:', error);
      throw error;
    }
  }

  async clearCache(): Promise<void> {
    try {
      await RNFS.unlink(this.cacheDir);
      await RNFS.mkdir(this.cacheDir);
      this.assetCache.clear();
      logger.info('Asset cache cleared');
    } catch (error) {
      logger.error('Failed to clear asset cache:', error);
      throw error;
    }
  }

  async getCacheStats(): Promise<{
    totalSize: number;
    itemCount: number;
  }> {
    let totalSize = 0;
    for (const entry of this.assetCache.values()) {
      totalSize += entry.size;
    }

    return {
      totalSize,
      itemCount: this.assetCache.size,
    };
  }
}