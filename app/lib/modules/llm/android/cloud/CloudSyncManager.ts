import { createScopedLogger } from '~/utils/logger';
import { CloudManager } from './CloudManager';
import { MessageCache } from '../cache/MessageCache';
import { storage } from '../../../stores/storage';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

const logger = createScopedLogger('CloudSyncManager');

interface SyncConfig {
  enabled: boolean;
  syncInterval: number; // In milliseconds
  wifiOnly: boolean;
  conflictResolution: 'local' | 'remote' | 'newest';
  maxRetries: number;
  retryDelay: number; // In milliseconds
}

interface SyncStats {
  lastSync: number;
  successfulSyncs: number;
  failedSyncs: number;
  bytesUploaded: number;
  bytesDownloaded: number;
}

export class CloudSyncManager {
  private static instance: CloudSyncManager;
  private cloudManager: CloudManager;
  private messageCache: MessageCache;
  private syncTimer: NodeJS.Timeout | null = null;
  private syncInProgress = false;
  private stats: SyncStats = {
    lastSync: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    bytesUploaded: 0,
    bytesDownloaded: 0
  };

  private config: SyncConfig = {
    enabled: false,
    syncInterval: 15 * 60 * 1000, // 15 minutes
    wifiOnly: true,
    conflictResolution: 'newest',
    maxRetries: 3,
    retryDelay: 5000 // 5 seconds
  };

  private constructor() {
    this.cloudManager = CloudManager.getInstance();
    this.messageCache = MessageCache.getInstance();
  }

  static getInstance(): CloudSyncManager {
    if (!CloudSyncManager.instance) {
      CloudSyncManager.instance = new CloudSyncManager();
    }
    return CloudSyncManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Load saved configuration
      const savedConfig = await AsyncStorage.getItem('cloud_sync_config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }

      // Load sync stats
      const savedStats = await AsyncStorage.getItem('cloud_sync_stats');
      if (savedStats) {
        this.stats = { ...this.stats, ...JSON.parse(savedStats) };
      }

      // Start sync scheduler if enabled
      if (this.config.enabled) {
        this.startSyncScheduler();
      }

      logger.info('Cloud sync manager initialized');
    } catch (error) {
      logger.error('Failed to initialize cloud sync manager:', error);
      throw error;
    }
  }

  private async startSyncScheduler(): Promise<void> {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(async () => {
      await this.sync();
    }, this.config.syncInterval);

    // Perform initial sync
    await this.sync();
  }

  async sync(): Promise<void> {
    if (this.syncInProgress) {
      logger.debug('Sync already in progress');
      return;
    }

    try {
      this.syncInProgress = true;

      // Check network conditions
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected || (this.config.wifiOnly && !netInfo.isWifi)) {
        logger.debug('Network conditions not met for sync');
        return;
      }

      // Get local changes
      const localChanges = await storage.getChanges();
      
      // Get remote changes
      const remoteChanges = await this.cloudManager.getChanges(this.stats.lastSync);

      // Resolve conflicts
      const { toUpload, toDownload } = this.resolveConflicts(localChanges, remoteChanges);

      // Upload local changes
      if (toUpload.length > 0) {
        const uploadStats = await this.cloudManager.uploadChanges(toUpload);
        this.stats.bytesUploaded += uploadStats.bytes;
      }

      // Download remote changes
      if (toDownload.length > 0) {
        const downloadStats = await this.cloudManager.downloadChanges(toDownload);
        this.stats.bytesDownloaded += downloadStats.bytes;
        
        // Apply remote changes
        await storage.applyChanges(toDownload);
      }

      // Update sync stats
      this.stats.lastSync = Date.now();
      this.stats.successfulSyncs++;
      await this.saveStats();

      logger.info('Sync completed successfully');
    } catch (error) {
      logger.error('Sync failed:', error);
      this.stats.failedSyncs++;
      await this.saveStats();

      // Retry if attempts remaining
      if (this.stats.failedSyncs < this.config.maxRetries) {
        setTimeout(() => this.sync(), this.config.retryDelay);
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  private resolveConflicts(localChanges: any[], remoteChanges: any[]): {
    toUpload: any[];
    toDownload: any[];
  } {
    const toUpload: any[] = [];
    const toDownload: any[] = [];

    // Create maps for faster lookup
    const localMap = new Map(localChanges.map(c => [c.id, c]));
    const remoteMap = new Map(remoteChanges.map(c => [c.id, c]));

    // Process all changes
    const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);

    for (const id of allIds) {
      const local = localMap.get(id);
      const remote = remoteMap.get(id);

      if (!remote) {
        // Local only - upload
        toUpload.push(local);
      } else if (!local) {
        // Remote only - download
        toDownload.push(remote);
      } else {
        // Both exist - resolve conflict
        switch (this.config.conflictResolution) {
          case 'local':
            toUpload.push(local);
            break;
          case 'remote':
            toDownload.push(remote);
            break;
          case 'newest':
            if (local.timestamp > remote.timestamp) {
              toUpload.push(local);
            } else {
              toDownload.push(remote);
            }
            break;
        }
      }
    }

    return { toUpload, toDownload };
  }

  private async saveStats(): Promise<void> {
    try {
      await AsyncStorage.setItem('cloud_sync_stats', JSON.stringify(this.stats));
    } catch (error) {
      logger.error('Failed to save sync stats:', error);
    }
  }

  updateConfig(config: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Save new config
    AsyncStorage.setItem('cloud_sync_config', JSON.stringify(this.config))
      .catch(error => logger.error('Failed to save config:', error));

    // Restart sync scheduler if enabled
    if (this.config.enabled) {
      this.startSyncScheduler();
    } else {
      this.stop();
    }
  }

  getStats(): SyncStats {
    return { ...this.stats };
  }

  stop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }
}