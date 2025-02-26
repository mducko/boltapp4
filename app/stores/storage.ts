import { atom } from 'nanostores';
import { StorageManager } from '../lib/storage/StorageManager';

export interface StorageStats {
  totalSize: number;
  messageCount: number;
  attachmentSize: number;
  lastChecked: string;
}

export const storageStats = atom<StorageStats>({
  totalSize: 0,
  messageCount: 0,
  attachmentSize: 0,
  lastChecked: new Date().toISOString()
});

export const storage = StorageManager.getInstance();