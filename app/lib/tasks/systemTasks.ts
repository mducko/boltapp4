import { TaskManager } from './TaskManager';
import { storage } from '../stores/storage';
import { logStore } from '../stores/logs';
import { workbenchStore } from '../stores/workbench';

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
      // Clean up old logs (keep last 1000)
      const logs = logStore.getLogs();
      if (logs.length > 1000) {
        const trimmedLogs = logs.slice(-1000);
        logStore.logs.set(trimmedLogs);
      }

      // Clean up temporary files
      const files = workbenchStore.files.get();
      const tempFiles = Object.entries(files).filter(([path]) => path.includes('/tmp/'));
      for (const [path] of tempFiles) {
        workbenchStore.files.setKey(path, undefined);
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
      await storage.optimize();
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
      const lastBackup = await storage.get('lastBackupDate');
      if (!lastBackup || Date.now() - lastBackup > 7 * 24 * 60 * 60 * 1000) {
        logStore.logSystem('Backup reminder: Please backup your data', {
          type: 'reminder',
          priority: 'medium',
        });
      }
    },
  });

  // Start all tasks
  taskManager.startAllTasks();
}