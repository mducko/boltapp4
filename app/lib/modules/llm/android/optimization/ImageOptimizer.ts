import { createScopedLogger } from '~/utils/logger';
import { NativeModules } from 'react-native';
import RNFS from 'react-native-fs';

const logger = createScopedLogger('ImageOptimizer');

interface ImageOptimizationConfig {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: 'jpeg' | 'png' | 'webp';
  compressionThreshold: number; // Size in bytes above which to compress
}

export class ImageOptimizer {
  private static instance: ImageOptimizer;
  private config: ImageOptimizationConfig = {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 85,
    format: 'webp',
    compressionThreshold: 1024 * 100, // 100KB
  };

  private constructor() {}

  static getInstance(): ImageOptimizer {
    if (!ImageOptimizer.instance) {
      ImageOptimizer.instance = new ImageOptimizer();
    }
    return ImageOptimizer.instance;
  }

  async optimizeImage(imagePath: string): Promise<string> {
    try {
      // Check if optimization is needed
      const stats = await RNFS.stat(imagePath);
      if (stats.size < this.config.compressionThreshold) {
        logger.debug('Image below compression threshold, skipping optimization');
        return imagePath;
      }

      // Get image dimensions
      const imageInfo = await NativeModules.ImageModule.getImageInfo(imagePath);
      
      // Calculate new dimensions while maintaining aspect ratio
      const { width, height } = this.calculateDimensions(
        imageInfo.width,
        imageInfo.height,
        this.config.maxWidth,
        this.config.maxHeight
      );

      // Generate optimized image path
      const optimizedPath = `${imagePath.replace(/\.[^.]+$/, '')}_optimized.${this.config.format}`;

      // Optimize image
      await NativeModules.ImageModule.optimizeImage({
        sourcePath: imagePath,
        targetPath: optimizedPath,
        width,
        height,
        quality: this.config.quality,
        format: this.config.format,
      });

      logger.info('Image optimized successfully');
      return optimizedPath;
    } catch (error) {
      logger.error('Failed to optimize image:', error);
      return imagePath; // Return original path on error
    }
  }

  async optimizeImages(imagePaths: string[]): Promise<string[]> {
    try {
      const optimizedPaths = await Promise.all(
        imagePaths.map(path => this.optimizeImage(path))
      );
      return optimizedPaths;
    } catch (error) {
      logger.error('Failed to optimize images:', error);
      return imagePaths;
    }
  }

  private calculateDimensions(
    width: number,
    height: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    let newWidth = width;
    let newHeight = height;

    if (width > maxWidth) {
      newWidth = maxWidth;
      newHeight = (height * maxWidth) / width;
    }

    if (newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = (width * maxHeight) / height;
    }

    return {
      width: Math.round(newWidth),
      height: Math.round(newHeight),
    };
  }

  updateConfig(config: Partial<ImageOptimizationConfig>): void {
    this.config = { ...this.config, ...config };
  }
}