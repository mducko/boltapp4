import { storage } from '../stores/storage';
import { exportData } from '../utils/dataTransfer';
import { createScopedLogger } from '../utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'react-native-fs';

const logger = createScopedLogger('AutoBackupManager');

interface BackupConfig {
  enabled: boolean;
  interval: number; // In hours
  lastBackup: string | null;
  retainCount: number;
  wifiOnly: boolean;
}

const DEFAULT_CONFIG: BackupConfig = {
  enabled: true,
  interval: 24, // Daily backups by default
  lastBackup: null,
  retainCount: 5, // Keep last 5 backups
  wifiOnly: true,
};

export class AutoBackupManager {
  private static instance: AutoBackupManager;
  private config: BackupConfig = DEFAULT_CONFIG;
  private backupTimer: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): AutoBackupManager {
    if (!AutoBackupManager.instance) {
      AutoBackupManager.instance = new AutoBackupManager();
    }
    return AutoBackupManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Load saved config
      const savedConfig = await AsyncStorage.getItem('auto_backup_config');
      if (savedConfig) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(savedConfig) };
      }

      // Start backup scheduler if enabled
      if (this.config.enabled) {
        this.startBackupScheduler();
      }

      logger.info('Auto backup manager initialized');
    } catch (error) {
      logger.error('Failed to initialize auto backup:', error);
      throw error;
    }
  }

  async updateConfig(newConfig: Partial<BackupConfig>): Promise<void> {
    try {
      // Update config
      this.config = { ...this.config, ...newConfig };
      
      // Save to storage
      await AsyncStorage.setItem('auto_backup_config', JSON.stringify(this.config));

      // Restart scheduler with new config
      if (this.backupTimer) {
        clearInterval(this.backupTimer);
        this.backupTimer = null;
      }

      if (this.config.enabled) {
        this.startBackupScheduler();
      }

      logger.info('Backup config updated:', this.config);
    } catch (error) {
      logger.error('Failed to update backup config:', error);
      throw error;
    }
  }

  private startBackupScheduler(): void {
    // Convert hours to milliseconds
    const interval = this.config.interval * 60 * 60 * 1000;

    this.backupTimer = setInterval(async () => {
      try {
        await this.performBackup();
      } catch (error) {
        logger.error('Scheduled backup failed:', error);
      }
    }, interval);

    // Perform initial backup if never done before
    if (!this.config.lastBackup) {
      this.performBackup().catch(error => {
        logger.error('Initial backup failed:', error);
      });
    }
  }

  private async performBackup(): Promise<void> {
    try {
      // Check if we should run backup
      if (!await this.shouldRunBackup()) {
        return;
      }

      // Perform backup
      await exportData();

      // Update last backup time
      this.config.lastBackup = new Date().toISOString();
      await AsyncStorage.setItem('auto_backup_config', JSON.stringify(this.config));

      // Clean up old backups
      await this.cleanupOldBackups();

      logger.info('Auto backup completed successfully');
    } catch (error) {
      logger.error('Auto backup failed:', error);
      throw error;
    }
  }

  private async shouldRunBackup(): Promise<boolean> {
    // Check if enough time has passed since last backup
    if (this.config.lastBackup) {
      const lastBackupTime = new Date(this.config.lastBackup).getTime();
      const nextBackupTime = lastBackupTime + (this.config.interval * 60 * 60 * 1000);
      if (Date.now() < nextBackupTime) {
        return false;
      }
    }

    // Check if we have enough storage space
    const stats = await storage.getStorageStats();
    const MIN_FREE_SPACE = 100 * 1024 * 1024; // 100MB
    if (stats.totalSize > MIN_FREE_SPACE) {
      logger.warn('Insufficient storage space for backup');
      return false;
    }

    // Check wifi-only setting
    if (this.config.wifiOnly) {
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isWifi) {
        logger.info('Skipping backup - Wifi only mode enabled');
        return false;
      }
    }

    return true;
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      // Get list of backup files
      const backupDir = FileSystem.DownloadDirectoryPath;
      const files = await FileSystem.readDir(backupDir);
      
      // Filter and sort backup files
      const backupFiles = files
        .filter(file => file.name.endsWith('.boltbackup'))
        .sort((a, b) => b.mtime - a.mtime);

      // Remove excess backups
      if (backupFiles.length > this.config.retainCount) {
        const filesToDelete = backupFiles.slice(this.config.retainCount);
        await Promise.all(
          filesToDelete.map(file => 
            FileSystem.unlink(`${backupDir}/${file.name}`)
          )
        );
        logger.info(`Cleaned up ${filesToDelete.length} old backups`);
      }
    } catch (error) {
      logger.error('Failed to cleanup old backups:', error);
    }
  }

  getConfig(): BackupConfig {
    return { ...this.config };
  }

  stop(): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = null;
    }
  }
}