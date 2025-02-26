import { createScopedLogger } from '../../utils/logger';

const logger = createScopedLogger('CustomProvider');

export class CustomProvider {
  private static instance: CustomProvider;
  private endpoint: string | undefined;

  private constructor() {}

  static getInstance(): CustomProvider {
    if (!CustomProvider.instance) {
      CustomProvider.instance = new CustomProvider();
    }
    return CustomProvider.instance;
  }

  setEndpoint(endpoint: string): void {
    this.endpoint = endpoint;
  }

  async upload(data: string, filename: string): Promise<string> {
    if (!this.endpoint) {
      throw new Error('Custom endpoint not configured');
    }

    try {
      const response = await fetch(`${this.endpoint}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename,
          data,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      logger.info('File uploaded successfully to custom endpoint');

      return result.id;
    } catch (error) {
      logger.error('Failed to upload to custom endpoint:', error);
      throw error;
    }
  }

  async download(fileId: string): Promise<string> {
    if (!this.endpoint) {
      throw new Error('Custom endpoint not configured');
    }

    try {
      const response = await fetch(`${this.endpoint}/download/${fileId}`);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const data = await response.text();
      return data;
    } catch (error) {
      logger.error('Failed to download from custom endpoint:', error);
      throw error;
    }
  }

  async delete(fileId: string): Promise<void> {
    if (!this.endpoint) {
      throw new Error('Custom endpoint not configured');
    }

    try {
      const response = await fetch(`${this.endpoint}/delete/${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.statusText}`);
      }

      logger.info('File deleted successfully from custom endpoint');
    } catch (error) {
      logger.error('Failed to delete from custom endpoint:', error);
      throw error;
    }
  }

  async list(): Promise<string[]> {
    if (!this.endpoint) {
      throw new Error('Custom endpoint not configured');
    }

    try {
      const response = await fetch(`${this.endpoint}/list`);
      if (!response.ok) {
        throw new Error(`List failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.files;
    } catch (error) {
      logger.error('Failed to list files from custom endpoint:', error);
      throw error;
    }
  }
}