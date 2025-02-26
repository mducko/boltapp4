import { atom, map } from 'nanostores';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { workbenchStore } from '../stores/workbench';
import { logStore } from '../stores/logs';
import { extractRelativePath } from '../utils/diff';
import type { FileMap } from '../stores/files';

interface BackupMetadata {
  version: string;
  timestamp: string;
  description: string;
  fileCount: number;
  totalSize: number;
}

export const backupStore = map({
  isBackingUp: false,
  isRestoring: false,
  lastBackup: null as string | null,
  backupProgress: 0,
});

export const backupProgress = atom<number>(0);

export class BackupManager {
  private static instance: BackupManager;
  
  private constructor() {}

  static getInstance(): BackupManager {
    if (!BackupManager.instance) {
      BackupManager.instance = new BackupManager();
    }
    return BackupManager.instance;
  }

  async createBackup(description: string = 'Manual Backup'): Promise<void> {
    try {
      backupStore.setKey('isBackingUp', true);
      backupProgress.set(0);

      const zip = new JSZip();
      const files = workbenchStore.files.get();
      
      // Add metadata
      const metadata: BackupMetadata = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        description,
        fileCount: Object.keys(files).length,
        totalSize: this.calculateTotalSize(files),
      };
      
      zip.file('metadata.json', JSON.stringify(metadata, null, 2));

      // Add files with progress tracking
      let processedFiles = 0;
      for (const [filePath, dirent] of Object.entries(files)) {
        if (dirent?.type === 'file' && !dirent.isBinary) {
          const relativePath = extractRelativePath(filePath);
          zip.file(relativePath, dirent.content);
          
          processedFiles++;
          backupProgress.set((processedFiles / metadata.fileCount) * 100);
        }
      }

      // Add logs
      const logs = logStore.getLogs();
      zip.file('logs.json', JSON.stringify(logs, null, 2));

      // Generate backup file
      const content = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 }
      });

      // Save with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `bolt-backup-${timestamp}.zip`;
      saveAs(content, filename);

      backupStore.setKey('lastBackup', new Date().toISOString());
      logStore.logSystem('Backup created successfully', { 
        fileCount: metadata.fileCount,
        totalSize: metadata.totalSize 
      });

    } catch (error) {
      logStore.logError('Backup creation failed', error);
      throw error;
    } finally {
      backupStore.setKey('isBackingUp', false);
      backupProgress.set(0);
    }
  }

  async restoreBackup(file: File): Promise<void> {
    try {
      backupStore.setKey('isRestoring', true);
      backupProgress.set(0);

      const zip = await JSZip.loadAsync(file);
      
      // Validate metadata
      const metadataFile = zip.file('metadata.json');
      if (!metadataFile) {
        throw new Error('Invalid backup file: missing metadata');
      }

      const metadata: BackupMetadata = JSON.parse(
        await metadataFile.async('string')
      );

      // Validate version compatibility
      if (!this.isVersionCompatible(metadata.version)) {
        throw new Error(`Incompatible backup version: ${metadata.version}`);
      }

      // Clear existing files
      workbenchStore.files.set({});

      // Restore files with progress tracking
      const files = zip.filter((path) => path !== 'metadata.json' && path !== 'logs.json');
      let processedFiles = 0;

      for (const file of files) {
        const content = await file.async('string');
        const filePath = `/home/project/${file.name}`;
        
        workbenchStore.files.setKey(filePath, {
          type: 'file',
          content,
          isBinary: false
        });

        processedFiles++;
        backupProgress.set((processedFiles / metadata.fileCount) * 100);
      }

      // Restore logs if present
      const logsFile = zip.file('logs.json');
      if (logsFile) {
        const logs = JSON.parse(await logsFile.async('string'));
        logStore.logs.set(logs);
      }

      logStore.logSystem('Backup restored successfully', {
        fileCount: metadata.fileCount,
        timestamp: metadata.timestamp
      });

    } catch (error) {
      logStore.logError('Backup restoration failed', error);
      throw error;
    } finally {
      backupStore.setKey('isRestoring', false);
      backupProgress.set(0);
    }
  }

  private calculateTotalSize(files: FileMap): number {
    return Object.values(files).reduce((total, dirent) => {
      if (dirent?.type === 'file' && !dirent.isBinary) {
        return total + new TextEncoder().encode(dirent.content).length;
      }
      return total;
    }, 0);
  }

  private isVersionCompatible(version: string): boolean {
    // Simple version check - can be made more sophisticated
    const [major] = version.split('.');
    return major === '1';
  }
}