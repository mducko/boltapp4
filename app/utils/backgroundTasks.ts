import BackgroundService from 'react-native-background-actions';
import { offlineStore } from '../stores/offline';
import { storage } from '../stores/storage';
import { checkStorageQuotas, cleanupStorage } from './storageQuotas';
import NetInfo from '@react-native-community/netinfo';

// Background task options
const options = {
  taskName: 'BoltBackgroundTasks',
  taskTitle: 'Bolt.droid Background Tasks',
  taskDesc: 'Syncing and maintenance',
  taskIcon: {
    name: 'ic_launcher',
    type: 'mipmap',
  },
  color: '#9C7DFF',
  linkingURI: 'boltapp://chat',
  parameters: {
    syncInterval: 15 * 60 * 1000, // 15 minutes
    quotaCheckInterval: 30 * 60 * 1000, // 30 minutes
    cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours
  },
};

class BackgroundTaskManager {
  private static instance: BackgroundTaskManager;
  private isRunning = false;

  private constructor() {}

  static getInstance(): BackgroundTaskManager {
    if (!BackgroundTaskManager.instance) {
      BackgroundTaskManager.instance = new BackgroundTaskManager();
    }
    return BackgroundTaskManager.instance;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    try {
      await BackgroundService.start(this.taskHandler, options);
      this.isRunning = true;
      console.log('Background tasks started');
    } catch (error) {
      console.error('Failed to start background tasks:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      await BackgroundService.stop();
      this.isRunning = false;
      console.log('Background tasks stopped');
    } catch (error) {
      console.error('Failed to stop background tasks:', error);
      throw error;
    }
  }

  private taskHandler = async () => {
    const { syncInterval, quotaCheckInterval, cleanupInterval } = options.parameters;
    let lastSync = Date.now();
    let lastQuotaCheck = Date.now();
    let lastCleanup = Date.now();

    while (BackgroundService.isRunning()) {
      try {
        const now = Date.now();

        // Check network and sync if needed
        if (now - lastSync >= syncInterval) {
          const netInfo = await NetInfo.fetch();
          if (netInfo.isConnected) {
            await this.syncMessages();
          }
          lastSync = now;
        }

        // Check storage quotas
        if (now - lastQuotaCheck >= quotaCheckInterval) {
          const { withinLimits, warnings } = await checkStorageQuotas();
          if (!withinLimits) {
            // Notify user about storage warnings
            this.notifyStorageWarnings(warnings);
          }
          lastQuotaCheck = now;
        }

        // Run cleanup if needed
        if (now - lastCleanup >= cleanupInterval) {
          await cleanupStorage();
          lastCleanup = now;
        }

        // Sleep for a minute before next check
        await this.sleep(60000);
      } catch (error) {
        console.error('Background task error:', error);
        await this.sleep(60000); // Sleep on error before retry
      }
    }
  };

  private async syncMessages(): Promise<void> {
    const { syncInProgress, pendingMessages } = offlineStore.get();
    
    if (syncInProgress || pendingMessages.length === 0) {
      return;
    }

    offlineStore.setKey('syncInProgress', true);
    
    try {
      // Sync logic here
      await storage.sync();
    } finally {
      offlineStore.setKey('syncInProgress', false);
    }
  }

  private notifyStorageWarnings(warnings: string[]): void {
    // TODO: Implement local notifications
    console.warn('Storage warnings:', warnings);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const backgroundTasks = BackgroundTaskManager.getInstance();