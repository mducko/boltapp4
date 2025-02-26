import { createScopedLogger } from '~/utils/logger';
import RNFS from 'react-native-fs';
import { compress, decompress } from '../../../utils/compression';

const logger = createScopedLogger('FileManager');

interface FileMetadata {
  name: string;
  path: string;
  size: number;
  type: string;
  created: string;
  modified: string;
  hash: string;
}

interface FileStats {
  totalFiles: number;
  totalSize: number;
  byType: Record<string, number>;
}

export class FileManager {
  private static instance: FileManager;
  private readonly baseDir = RNFS.DocumentDirectoryPath;
  private readonly maxFileSize = 100 * 1024 * 1024; // 100MB

  private constructor() {}

  static getInstance(): FileManager {
    if (!FileManager.instance) {
      FileManager.instance = new FileManager();
    }
    return FileManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Create necessary directories
      const dirs = ['attachments', 'exports', 'temp'];
      for (const dir of dirs) {
        const path = `${this.baseDir}/${dir}`;
        const exists = await RNFS.exists(path);
        if (!exists) {
          await RNFS.mkdir(path);
        }
      }

      logger.info('File manager initialized');
    } catch (error) {
      logger.error('Failed to initialize file manager:', error);
      throw error;
    }
  }

  async saveFile(
    data: string | Buffer,
    filename: string,
    compress = false
  ): Promise<FileMetadata> {
    try {
      const path = `${this.baseDir}/attachments/${filename}`;
      
      // Check file size
      const size = Buffer.byteLength(data);
      if (size > this.maxFileSize) {
        throw new Error('File size exceeds maximum limit');
      }

      // Compress if needed
      let finalData = data;
      if (compress) {
        finalData = await this.compressData(data);
      }

      // Save file
      await RNFS.writeFile(path, finalData.toString(), 'utf8');

      // Get file metadata
      const stats = await RNFS.stat(path);
      const hash = await this.calculateHash(path);

      const metadata: FileMetadata = {
        name: filename,
        path,
        size: stats.size,
        type: this.getFileType(filename),
        created: stats.ctime.toISOString(),
        modified: stats.mtime.toISOString(),
        hash
      };

      logger.info(`File saved: ${filename}`);
      return metadata;
    } catch (error) {
      logger.error('Failed to save file:', error);
      throw error;
    }
  }

  async readFile(path: string, decompress = false): Promise<string> {
    try {
      let data = await RNFS.readFile(path, 'utf8');

      if (decompress) {
        data = await this.decompressData(data);
      }

      return data;
    } catch (error) {
      logger.error('Failed to read file:', error);
      throw error;
    }
  }

  async deleteFile(path: string): Promise<void> {
    try {
      await RNFS.unlink(path);
      logger.info(`File deleted: ${path}`);
    } catch (error) {
      logger.error('Failed to delete file:', error);
      throw error;
    }
  }

  async getFileStats(): Promise<FileStats> {
    try {
      const stats: FileStats = {
        totalFiles: 0,
        totalSize: 0,
        byType: {}
      };

      const processDir = async (dirPath: string) => {
        const files = await RNFS.readDir(dirPath);
        
        for (const file of files) {
          if (file.isFile()) {
            stats.totalFiles++;
            stats.totalSize += file.size;
            
            const type = this.getFileType(file.name);
            stats.byType[type] = (stats.byType[type] || 0) + 1;
          } else if (file.isDirectory()) {
            await processDir(file.path);
          }
        }
      };

      await processDir(`${this.baseDir}/attachments`);
      return stats;
    } catch (error) {
      logger.error('Failed to get file stats:', error);
      throw error;
    }
  }

  async cleanupTempFiles(): Promise<void> {
    try {
      const tempDir = `${this.baseDir}/temp`;
      await RNFS.unlink(tempDir);
      await RNFS.mkdir(tempDir);
      logger.info('Temp files cleaned up');
    } catch (error) {
      logger.error('Failed to cleanup temp files:', error);
      throw error;
    }
  }

  private async compressData(data: string | Buffer): Promise<string> {
    return await compress(data.toString());
  }

  private async decompressData(data: string): Promise<string> {
    return await decompress(data);
  }

  private async calculateHash(path: string): Promise<string> {
    return await RNFS.hash(path, 'sha256');
  }

  private getFileType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || 'unknown';
    return ext;
  }

  getBasePath(): string {
    return this.baseDir;
  }
}