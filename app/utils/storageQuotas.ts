import { storage, storageStats } from '../stores/storage';

// Storage limits in bytes
const LIMITS = {
  TOTAL_STORAGE: 100 * 1024 * 1024, // 100MB
  MESSAGE_COUNT: 1000,
  ATTACHMENT_SIZE: 50 * 1024 * 1024, // 50MB
};

export async function checkStorageQuotas(): Promise<{
  withinLimits: boolean;
  warnings: string[];
}> {
  const stats = storageStats.get();
  const warnings: string[] = [];

  if (stats.totalSize > LIMITS.TOTAL_STORAGE) {
    warnings.push(`Storage usage (${formatBytes(stats.totalSize)}) exceeds limit of ${formatBytes(LIMITS.TOTAL_STORAGE)}`);
  }

  if (stats.messageCount > LIMITS.MESSAGE_COUNT) {
    warnings.push(`Message count (${stats.messageCount}) exceeds limit of ${LIMITS.MESSAGE_COUNT}`);
  }

  if (stats.attachmentSize > LIMITS.ATTACHMENT_SIZE) {
    warnings.push(`Attachment size (${formatBytes(stats.attachmentSize)}) exceeds limit of ${formatBytes(LIMITS.ATTACHMENT_SIZE)}`);
  }

  return {
    withinLimits: warnings.length === 0,
    warnings,
  };
}

export async function cleanupStorage(): Promise<void> {
  const messages = await storage.get('messages') || [];
  const attachments = await storage.get('attachments') || {};

  // Keep last 500 messages
  if (messages.length > 500) {
    const trimmedMessages = messages.slice(-500);
    await storage.set('messages', trimmedMessages);
  }

  // Remove old attachments
  const now = Date.now();
  const MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days
  const validAttachments = Object.entries(attachments)
    .filter(([, attachment]: [string, any]) => {
      return (now - attachment.timestamp) < MAX_AGE;
    })
    .reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});

  await storage.set('attachments', validAttachments);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export { formatBytes }