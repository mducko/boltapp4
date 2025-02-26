import { createScopedLogger } from '~/utils/logger';
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { storage } from '../../../stores/storage';
import { Encryption } from '../../../utils/encryption';
import { compress } from '../../../stores/compression';

const logger = createScopedLogger('ExportManager');

interface ExportConfig {
  format: 'pdf' | 'html' | 'json';
  includeMetadata: boolean;
  encrypt: boolean;
  compress: boolean;
}

interface ExportResult {
  path: string;
  size: number;
  format: string;
  encrypted: boolean;
  compressed: boolean;
  timestamp: string;
}

export class ExportManager {
  private static instance: ExportManager;
  private encryption: Encryption;
  private readonly exportDir = `${RNFS.DocumentDirectoryPath}/exports`;

  private config: ExportConfig = {
    format: 'json',
    includeMetadata: true,
    encrypt: true,
    compress: true
  };

  private constructor() {
    this.encryption = Encryption.getInstance();
  }

  static getInstance(): ExportManager {
    if (!ExportManager.instance) {
      ExportManager.instance = new ExportManager();
    }
    return ExportManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Create export directory
      const exists = await RNFS.exists(this.exportDir);
      if (!exists) {
        await RNFS.mkdir(this.exportDir);
      }

      logger.info('Export manager initialized');
    } catch (error) {
      logger.error('Failed to initialize export manager:', error);
      throw error;
    }
  }

  async exportConversation(conversationId: string, config?: Partial<ExportConfig>): Promise<ExportResult> {
    try {
      const exportConfig = { ...this.config, ...config };
      
      // Get conversation data
      const conversation = await storage.get(`conversation_${conversationId}`);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Prepare export data
      const exportData = {
        conversation,
        metadata: exportConfig.includeMetadata ? {
          timestamp: new Date().toISOString(),
          platform: Platform.OS,
          appVersion: '1.0.0', // TODO: Get from app config
          exportFormat: exportConfig.format
        } : undefined
      };

      // Generate content based on format
      let content: string;
      let mimeType: string;
      
      switch (exportConfig.format) {
        case 'pdf':
          content = await this.generatePDF(exportData);
          mimeType = 'application/pdf';
          break;
        case 'html':
          content = await this.generateHTML(exportData);
          mimeType = 'text/html';
          break;
        default:
          content = JSON.stringify(exportData, null, 2);
          mimeType = 'application/json';
      }

      // Encrypt if enabled
      if (exportConfig.encrypt) {
        content = await this.encryption.encrypt(content);
      }

      // Compress if enabled
      if (exportConfig.compress) {
        content = await compress(content);
      }

      // Generate filename and save
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const extension = exportConfig.format;
      const filename = `bolt-conversation-${timestamp}.${extension}`;
      const path = `${this.exportDir}/${filename}`;

      await RNFS.writeFile(path, content, 'utf8');
      const stats = await RNFS.stat(path);

      const result: ExportResult = {
        path,
        size: stats.size,
        format: exportConfig.format,
        encrypted: exportConfig.encrypt,
        compressed: exportConfig.compress,
        timestamp: new Date().toISOString()
      };

      logger.info('Conversation exported successfully:', result);
      return result;
    } catch (error) {
      logger.error('Failed to export conversation:', error);
      throw error;
    }
  }

  private async generatePDF(data: any): Promise<string> {
    // TODO: Implement PDF generation
    throw new Error('PDF export not implemented yet');
  }

  private async generateHTML(data: any): Promise<string> {
    // TODO: Implement HTML generation
    throw new Error('HTML export not implemented yet');
  }

  async cleanupExports(olderThan: number): Promise<void> {
    try {
      const files = await RNFS.readDir(this.exportDir);
      const now = Date.now();

      for (const file of files) {
        if (now - file.mtime.getTime() > olderThan) {
          await RNFS.unlink(file.path);
        }
      }

      logger.info('Old exports cleaned up');
    } catch (error) {
      logger.error('Failed to cleanup exports:', error);
      throw error;
    }
  }

  updateConfig(config: Partial<ExportConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): ExportConfig {
    return { ...this.config };
  }
}