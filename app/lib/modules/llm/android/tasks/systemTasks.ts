import { TaskManager } from './TaskManager';
import { storage } from '../stores/storage';
import { logStore } from '../stores/logs';
import { workbenchStore } from '../stores/workbench';
import { checkStorageQuotas, cleanupStorage } from '../secure/StorageQuotas';
import NetInfo from '@react-native-community/netinfo';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('SystemTasks');

// Initialize system tasks
export function initializeSystemTasks() {
  const taskManager = TaskManager.getInstance();

  // Register data cleanup task
  taskManager.registerTask({
    id: 'data-cleanup',
    name: 'Data Cleanup',
    description: 'Removes old logs and temporary files',
    interval: 24 * 60 * 60 * 1000, // Daily
    enabled: true,
    handler: async () => {
      try {
        // Clean up old logs (keep last 1000)
        const logs = logStore.getLogs();
        if (logs.length > 1000) {
          const trimmedLogs = logs.slice(-1000);
          logStore.logs.set(trimmedLogs);
        }

        // Clean up temporary files
        await cleanupStorage();
        logger.info('Data cleanup completed successfully');
      } catch (error) {
        logger.error('Data cleanup failed:', error);
        throw error;
      }
    },
  });

  // Register storage optimization task
  taskManager.registerTask({
    id: 'storage-optimization',
    name: 'Storage Optimization',
    description: 'Optimizes storage usage and compresses data',
    interval: 12 * 60 * 60 * 1000, // Every 12 hours
    enabled: true,
    handler: async () => {
      try {
        // Check storage quotas
        const { withinLimits, warnings } = await checkStorageQuotas();
        if (!withinLimits) {
          logger.warn('Storage quota warnings:', warnings);
          // Notify user about storage warnings
          // TODO: Implement notification system
        }

        // Run storage cleanup
        await cleanupStorage();
        logger.info('Storage optimization completed');
      } catch (error) {
        logger.error('Storage optimization failed:', error);
        throw error;
      }
    },
  });

  // Register network sync task
  taskManager.registerTask({
    id: 'network-sync',
    name: 'Network Sync',
    description: 'Syncs data when network is available',
    interval: 15 * 60 * 1000, // Every 15 minutes
    enabled: true,
    handler: async () => {
      try {
        const netInfo = await NetInfo.fetch();
        if (netInfo.isConnected) {
          // Sync data with server
          await storage.sync();
          logger.info('Network sync completed');
        }
      } catch (error) {
        logger.error('Network sync failed:', error);
        throw error;
      }
    },
  });

  // Register backup reminder task
  taskManager.registerTask({
    id: 'backup-reminder',
    name: 'Backup Reminder',
    description: 'Reminds users to backup their data',
    interval: 7 * 24 * 60 * 60 * 1000, // Weekly
    enabled: true,
    handler: async () => {
      try {
        const lastBackup = await storage.get('lastBackupDate');
        if (!lastBackup || Date.now() - lastBackup > 7 * 24 * 60 * 60 * 1000) {
          // TODO: Show backup reminder notification
          logger.info('Backup reminder triggered');
        }
      } catch (error) {
        logger.error('Backup reminder failed:', error);
        throw error;
      }
    },
  });

  // Start all tasks
  taskManager.startAllTasks().catch(error => {
    logger.error('Failed to start system tasks:', error);
  });
}