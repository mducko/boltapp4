import { createScopedLogger } from '~/utils/logger';
import { NativeModules } from 'react-native';
import RNFS from 'react-native-fs';
import { ImageOptimizer } from '../optimization/ImageOptimizer';

const logger = createScopedLogger('ImageGenerator');

interface GenerationConfig {
  width: number;
  height: number;
  quality: number;
  format: 'jpeg' | 'png';
  model: string;
  prompt: string;
  negativePrompt?: string;
  seed?: number;
  steps?: number;
}

interface GenerationResult {
  path: string;
  width: number;
  height: number;
  size: number;
  format: string;
  metadata: {
    prompt: string;
    model: string;
    seed: number;
    steps: number;
    timestamp: string;
  };
}

export class ImageGenerator {
  private static instance: ImageGenerator;
  private imageOptimizer: ImageOptimizer;
  private readonly outputDir = `${RNFS.DocumentDirectoryPath}/generated_images`;

  private constructor() {
    this.imageOptimizer = ImageOptimizer.getInstance();
  }

  static getInstance(): ImageGenerator {
    if (!ImageGenerator.instance) {
      ImageGenerator.instance = new ImageGenerator();
    }
    return ImageGenerator.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Create output directory if needed
      const exists = await RNFS.exists(this.outputDir);
      if (!exists) {
        await RNFS.mkdir(this.outputDir);
      }

      logger.info('Image generator initialized');
    } catch (error) {
      logger.error('Failed to initialize image generator:', error);
      throw error;
    }
  }

  async generateImage(config: GenerationConfig): Promise<GenerationResult> {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const filename = `${timestamp}_${Math.random().toString(36).substring(2)}.${config.format}`;
      const outputPath = `${this.outputDir}/${filename}`;

      // Generate image
      await NativeModules.ImageGeneratorModule.generate({
        ...config,
        outputPath
      });

      // Optimize generated image
      const optimizedPath = await this.imageOptimizer.optimizeImage(outputPath);

      // Get file stats
      const stats = await RNFS.stat(optimizedPath);

      const result: GenerationResult = {
        path: optimizedPath,
        width: config.width,
        height: config.height,
        size: stats.size,
        format: config.format,
        metadata: {
          prompt: config.prompt,
          model: config.model,
          seed: config.seed || Math.floor(Math.random() * 1000000),
          steps: config.steps || 20,
          timestamp: new Date().toISOString()
        }
      };

      logger.info('Image generated successfully');
      return result;
    } catch (error) {
      logger.error('Failed to generate image:', error);
      throw error;
    }
  }

  async generateVariations(
    imagePath: string,
    count: number,
    config: Partial<GenerationConfig>
  ): Promise<GenerationResult[]> {
    try {
      const results: GenerationResult[] = [];

      for (let i = 0; i < count; i++) {
        const result = await this.generateImage({
          ...config,
          seed: Math.floor(Math.random() * 1000000)
        } as GenerationConfig);
        results.push(result);
      }

      return results;
    } catch (error) {
      logger.error('Failed to generate variations:', error);
      throw error;
    }
  }

  async upscaleImage(
    imagePath: string,
    scale: number
  ): Promise<GenerationResult> {
    try {
      const stats = await RNFS.stat(imagePath);
      const ext = imagePath.split('.').pop() || 'png';
      const outputPath = `${this.outputDir}/upscaled_${Date.now()}.${ext}`;

      await NativeModules.ImageGeneratorModule.upscale({
        inputPath: imagePath,
        outputPath,
        scale
      });

      // Optimize upscaled image
      const optimizedPath = await this.imageOptimizer.optimizeImage(outputPath);

      const result: GenerationResult = {
        path: optimizedPath,
        width: 0, // Will be set by native module
        height: 0, // Will be set by native module
        size: stats.size,
        format: ext,
        metadata: {
          prompt: 'Upscaled image',
          model: 'upscaler',
          seed: 0,
          steps: 0,
          timestamp: new Date().toISOString()
        }
      };

      logger.info('Image upscaled successfully');
      return result;
    } catch (error) {
      logger.error('Failed to upscale image:', error);
      throw error;
    }
  }

  async cleanupOldImages(olderThan: number): Promise<void> {
    try {
      const files = await RNFS.readDir(this.outputDir);
      const now = Date.now();

      for (const file of files) {
        if (now - file.mtime.getTime() > olderThan) {
          await RNFS.unlink(file.path);
        }
      }

      logger.info('Old generated images cleaned up');
    } catch (error) {
      logger.error('Failed to cleanup old images:', error);
      throw error;
    }
  }
}