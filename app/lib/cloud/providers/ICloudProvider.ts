import { createScopedLogger } from '../../utils/logger';
import RNICloudStorage from 'react-native-icloud-storage';

const logger = createScopedLogger('ICloudProvider');

export class ICloudProvider {
  private static instance: ICloudProvider;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): ICloudProvider {
    if (!ICloudProvider.instance) {
      ICloudProvider.instance = new ICloudProvider();
    }
    return ICloudProvider.instance;
  }

  async initialize(): Promise<void> {
    try {
      await RNICloudStorage.init();
      this.isInitialized = true;
      logger.info('iCloud provider initialized');
    } catch (error) {
      logger.error('Failed to initialize iCloud provider:', error);
      throw error;
    }
  }

  async upload(data: string, filename: string): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('iCloud provider not initialized');
    }

    try {
      // Check iCloud availability
      const isAvailable = await RNICloudStorage.isAvailable();
      if (!isAvailable) {
        throw new Error('iCloud is not available');
      }

      // Upload file
      await RNICloudStorage.setItem(filename, data);
      logger.info('File uploaded successfully to iCloud');

      return filename;
    } catch (error) {
      logger.error('Failed to upload to iCloud:', error);
      throw error;
    }
  }

  async download(filename: string): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('iCloud provider not initialized');
    }

    try {
      const data = await RNICloudStorage.getItem(filename);
      if (!data) {
        throw new Error('File not found in iCloud');
      }

      return data;
    } catch (error) {
      logger.error('Failed to download from iCloud:', error);
      throw error;
    }
  }

  async delete(filename: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('iCloud provider not initialized');
    }

    try {
      await RNICloudStorage.removeItem(filename);
      logger.info('File deleted successfully from iCloud');
    } catch (error) {
      logger.error('Failed to delete from iCloud:', error);
      throw error;
    }
  }

  async list(): Promise<string[]> {
    if (!this.isInitialized) {
      throw new Error('iCloud provider not initialized');
    }

    try {
      const files = await RNICloudStorage.getAll();
      return Object.keys(files);
    } catch (error) {
      logger.error('Failed to list iCloud files:', error);
      throw error;
    }
  }
}