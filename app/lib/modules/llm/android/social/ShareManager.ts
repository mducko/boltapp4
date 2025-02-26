import { createScopedLogger } from '~/utils/logger';
import { Share, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { storage } from '../../../stores/storage';
import { Encryption } from '../../../utils/encryption';
import { compress } from '../../../stores/compression';

const logger = createScopedLogger('ShareManager');

interface ShareConfig {
  includeMetadata: boolean;
  encryptShared: boolean;
  allowPublic: boolean;
  defaultFormat: 'json' | 'pdf' | 'html';
}

export class ShareManager {
  private static instance: ShareManager;
  private encryption: Encryption;
  private config: ShareConfig = {
    includeMetadata: true,
    encryptShared: true,
    allowPublic: false,
    defaultFormat: 'json'
  };

  private constructor() {
    this.encryption = Encryption.getInstance();
  }

  static getInstance(): ShareManager {
    if (!ShareManager.instance) {
      ShareManager.instance = new ShareManager();
    }
    return ShareManager.instance;
  }

  async shareConversation(conversationId: string, format?: 'json' | 'pdf' | 'html'): Promise<void> {
    try {
      // Get conversation data
      const conversation = await storage.get(`conversation_${conversationId}`);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const outputFormat = format || this.config.defaultFormat;
      let content: string;
      let mimeType: string;
      let fileExtension: string;

      switch (outputFormat) {
        case 'pdf':
          content = await this.generatePDF(conversation);
          mimeType = 'application/pdf';
          fileExtension = 'pdf';
          break;
        case 'html':
          content = await this.generateHTML(conversation);
          mimeType = 'text/html';
          fileExtension = 'html';
          break;
        default:
          content = await this.generateJSON(conversation);
          mimeType = 'application/json';
          fileExtension = 'json';
      }

      // Encrypt if enabled
      if (this.config.encryptShared) {
        content = await this.encryption.encrypt(content);
      }

      // Compress content
      const compressed = await compress(content);

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `bolt-conversation-${timestamp}.${fileExtension}`;

      if (Platform.OS === 'ios') {
        // Use Share API for iOS
        const path = `${RNFS.TemporaryDirectoryPath}/${filename}`;
        await RNFS.writeFile(path, compressed, 'base64');
        await Share.share({
          url: path,
          title: 'Bolt.droid Conversation',
          message: 'Check out this conversation from Bolt.droid!',
        });
      } else {
        // Use direct file save for Android
        const path = `${RNFS.DownloadDirectoryPath}/${filename}`;
        await RNFS.writeFile(path, compressed, 'base64');
        logger.info(`Conversation exported to: ${path}`);
      }
    } catch (error) {
      logger.error('Failed to share conversation:', error);
      throw error;
    }
  }

  private async generateJSON(conversation: any): Promise<string> {
    const data = {
      conversation,
      metadata: this.config.includeMetadata ? {
        exportDate: new Date().toISOString(),
        appVersion: '1.0.0', // TODO: Get from app config
        platform: Platform.OS,
      } : undefined
    };
    return JSON.stringify(data, null, 2);
  }

  private async generatePDF(conversation: any): Promise<string> {
    // TODO: Implement PDF generation
    throw new Error('PDF generation not implemented yet');
  }

  private async generateHTML(conversation: any): Promise<string> {
    // TODO: Implement HTML generation
    throw new Error('HTML generation not implemented yet');
  }

  updateConfig(config: Partial<ShareConfig>): void {
    this.config = { ...this.config, ...config };
  }
}