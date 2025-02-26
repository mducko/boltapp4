import { createScopedLogger } from '~/utils/logger';
import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Octokit } from '@octokit/rest';
import { storage } from '../../../stores/storage';
import { Encryption } from '../../../utils/encryption';

const logger = createScopedLogger('GitHubManager');

interface GitHubConfig {
  enabled: boolean;
  autoSync: boolean;
  syncInterval: number;
  privateGistsOnly: boolean;
  encryptGists: boolean;
}

interface GitHubCredentials {
  token: string;
  username: string;
  email: string;
}

export class GitHubManager {
  private static instance: GitHubManager;
  private octokit: Octokit | null = null;
  private encryption: Encryption;
  private syncTimer: NodeJS.Timeout | null = null;

  private config: GitHubConfig = {
    enabled: false,
    autoSync: false,
    syncInterval: 30 * 60 * 1000, // 30 minutes
    privateGistsOnly: true,
    encryptGists: true
  };

  private constructor() {
    this.encryption = Encryption.getInstance();
  }

  static getInstance(): GitHubManager {
    if (!GitHubManager.instance) {
      GitHubManager.instance = new GitHubManager();
    }
    return GitHubManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Load saved configuration
      const savedConfig = await AsyncStorage.getItem('github_config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }

      // Load credentials
      const credentials = await this.loadCredentials();
      if (credentials) {
        await this.authenticate(credentials);
      }

      // Start auto-sync if enabled
      if (this.config.enabled && this.config.autoSync) {
        this.startAutoSync();
      }

      logger.info('GitHub manager initialized');
    } catch (error) {
      logger.error('Failed to initialize GitHub manager:', error);
      throw error;
    }
  }

  async authenticate(credentials: GitHubCredentials): Promise<void> {
    try {
      this.octokit = new Octokit({
        auth: credentials.token,
        userAgent: 'bolt-droid'
      });

      // Verify credentials
      const { data: user } = await this.octokit.users.getAuthenticated();
      if (user.login !== credentials.username) {
        throw new Error('GitHub authentication failed: username mismatch');
      }

      // Save credentials securely
      await this.saveCredentials(credentials);

      logger.info('GitHub authentication successful');
    } catch (error) {
      this.octokit = null;
      logger.error('GitHub authentication failed:', error);
      throw error;
    }
  }

  async shareConversation(conversationId: string, description: string): Promise<string> {
    if (!this.octokit) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      // Get conversation data
      const conversation = await storage.get(`conversation_${conversationId}`);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Prepare content
      let content = JSON.stringify(conversation, null, 2);
      if (this.config.encryptGists) {
        content = await this.encryption.encrypt(content);
      }

      // Create gist
      const { data: gist } = await this.octokit.gists.create({
        description,
        public: !this.config.privateGistsOnly,
        files: {
          'conversation.json': {
            content
          }
        }
      });

      logger.info('Conversation shared as gist:', gist.html_url);
      return gist.html_url;
    } catch (error) {
      logger.error('Failed to share conversation:', error);
      throw error;
    }
  }

  private async loadCredentials(): Promise<GitHubCredentials | null> {
    try {
      const credentials = await AsyncStorage.getItem('github_credentials');
      if (!credentials) {
        return null;
      }

      const decrypted = await this.encryption.decrypt(credentials);
      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Failed to load GitHub credentials:', error);
      return null;
    }
  }

  private async saveCredentials(credentials: GitHubCredentials): Promise<void> {
    try {
      const encrypted = await this.encryption.encrypt(JSON.stringify(credentials));
      await AsyncStorage.setItem('github_credentials', encrypted);
    } catch (error) {
      logger.error('Failed to save GitHub credentials:', error);
      throw error;
    }
  }

  private startAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(async () => {
      try {
        // TODO: Implement sync logic
        logger.debug('Auto-sync running...');
      } catch (error) {
        logger.error('Auto-sync failed:', error);
      }
    }, this.config.syncInterval);
  }

  updateConfig(config: Partial<GitHubConfig>): void {
    this.config = { ...this.config, ...config };
    AsyncStorage.setItem('github_config', JSON.stringify(this.config))
      .catch(error => logger.error('Failed to save config:', error));

    if (this.config.enabled && this.config.autoSync) {
      this.startAutoSync();
    } else if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  isAuthenticated(): boolean {
    return this.octokit !== null;
  }

  getConfig(): GitHubConfig {
    return { ...this.config };
  }
}