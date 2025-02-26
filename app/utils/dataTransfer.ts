import { storage } from '../stores/storage';
import { Platform, Share } from 'react-native';
import * as FileSystem from 'react-native-fs';
import * as DocumentPicker from 'react-native-document-picker';
import { Buffer } from 'buffer';
import { compress, decompress } from '../stores/compression';

interface ExportData {
  version: string;
  timestamp: string;
  messages: any[];
  settings: any;
  models: any[];
  metadata: {
    deviceInfo: string;
    appVersion: string;
  };
}

export async function exportData(): Promise<void> {
  try {
    // Gather all data
    const data: ExportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      messages: await storage.get('messages') || [],
      settings: await storage.get('settings') || {},
      models: await storage.get('models') || [],
      metadata: {
        deviceInfo: Platform.OS + ' ' + Platform.Version,
        appVersion: '1.0.0', // TODO: Get from app config
      }
    };

    // Compress the data
    const jsonStr = JSON.stringify(data);
    const compressed = await compress(jsonStr);
    
    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `bolt-backup-${timestamp}.boltbackup`;

    if (Platform.OS === 'ios') {
      // Use Share API for iOS
      const path = `${FileSystem.TemporaryDirectoryPath}/${filename}`;
      await FileSystem.writeFile(path, compressed, 'base64');
      await Share.share({
        url: path,
        title: 'Bolt.droid Backup',
      });
    } else {
      // Use direct file save for Android
      const path = `${FileSystem.DownloadDirectoryPath}/${filename}`;
      await FileSystem.writeFile(path, compressed, 'base64');
      return path;
    }
  } catch (error) {
    console.error('Export failed:', error);
    throw new Error('Failed to export data');
  }
}

export async function importData(): Promise<void> {
  try {
    // Pick backup file
    const result = await DocumentPicker.pick({
      type: [DocumentPicker.types.allFiles],
    });

    const uri = result[0].uri;
    const content = await FileSystem.readFile(uri, 'base64');
    
    // Decompress and parse
    const decompressed = await decompress(content);
    const data: ExportData = JSON.parse(decompressed);

    // Validate backup format
    if (!data.version || !data.timestamp) {
      throw new Error('Invalid backup file format');
    }

    // Clear existing data
    await storage.clear();

    // Restore data
    await Promise.all([
      storage.set('messages', data.messages),
      storage.set('settings', data.settings),
      storage.set('models', data.models),
    ]);

    return;
  } catch (error) {
    console.error('Import failed:', error);
    throw new Error('Failed to import data');
  }
}