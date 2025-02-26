import { map } from 'nanostores';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import type { Message } from 'ai';
import BackgroundService from 'react-native-background-actions';

interface PendingMessage {
  id: string;
  content: string;
  timestamp: number;
  retryCount: number;
  lastRetry: number | null;
}

interface OfflineState {
  isOnline: boolean;
  pendingMessages: PendingMessage[];
  lastSyncTimestamp: number | null;
  syncInProgress: boolean;
}

export const offlineStore = map<OfflineState>({
  isOnline: true,
  pendingMessages: [],
  lastSyncTimestamp: null,
  syncInProgress: false,
});

// Storage keys
const MESSAGES_KEY = '@bolt_messages';
const PENDING_MESSAGES_KEY = '@bolt_pending_messages';
const SETTINGS_KEY = '@bolt_settings';

// Retry configuration
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 60000; // 1 minute

// Background sync configuration
const backgroundOptions = {
  taskName: 'BoltSync',
  taskTitle: 'Syncing Messages',
  taskDesc: 'Syncing pending messages in background',
  taskIcon: {
    name: 'ic_launcher',
    type: 'mipmap',
  },
  linkingURI: 'boltapp://chat',
  parameters: {
    delay: 900000, // 15 minutes
  },
};

// Initialize network monitoring and background sync
export async function initializeOfflineSupport() {
  // Subscribe to network state changes
  NetInfo.addEventListener(state => {
    const isConnected = state.isConnected ?? false;
    offlineStore.setKey('isOnline', isConnected);
    
    if (isConnected && !offlineStore.get().syncInProgress) {
      syncPendingMessages();
    }
  });

  // Start background sync service
  try {
    await BackgroundService.start(backgroundSync, backgroundOptions);
  } catch (error) {
    console.error('Failed to start background sync:', error);
  }

  // Load cached data on startup
  await loadCachedData();
}

// Background sync task
async function backgroundSync() {
  while (BackgroundService.isRunning()) {
    const { isOnline } = offlineStore.get();
    
    if (isOnline) {
      await syncPendingMessages();
    }
    
    await sleep(backgroundOptions.parameters.delay);
  }
}

// Save messages to local storage with conflict resolution
export async function saveMessages(messages: Message[]) {
  try {
    const existingMessagesStr = await AsyncStorage.getItem(MESSAGES_KEY);
    const existingMessages = existingMessagesStr ? JSON.parse(existingMessagesStr) : [];
    
    // Merge messages, keeping the most recent version of each message
    const mergedMessages = mergeMessages(existingMessages, messages);
    
    await AsyncStorage.setItem(MESSAGES_KEY, JSON.stringify(mergedMessages));
    return mergedMessages;
  } catch (error) {
    console.error('Error saving messages:', error);
    return messages;
  }
}

// Merge messages with conflict resolution
function mergeMessages(existing: Message[], incoming: Message[]): Message[] {
  const messageMap = new Map<string, Message>();
  
  // Index existing messages
  existing.forEach(msg => messageMap.set(msg.id, msg));
  
  // Merge or update with incoming messages
  incoming.forEach(msg => {
    const existingMsg = messageMap.get(msg.id);
    if (!existingMsg || msg.timestamp > existingMsg.timestamp) {
      messageMap.set(msg.id, msg);
    }
  });
  
  return Array.from(messageMap.values())
    .sort((a, b) => a.timestamp - b.timestamp);
}

// Load messages from local storage
export async function loadCachedData() {
  try {
    const [messagesStr, pendingMessagesStr, settingsStr] = await Promise.all([
      AsyncStorage.getItem(MESSAGES_KEY),
      AsyncStorage.getItem(PENDING_MESSAGES_KEY),
      AsyncStorage.getItem(SETTINGS_KEY),
    ]);

    if (messagesStr) {
      const messages = JSON.parse(messagesStr);
      chatStore.setKey('messages', messages);
    }

    if (pendingMessagesStr) {
      const pendingMessages = JSON.parse(pendingMessagesStr);
      offlineStore.setKey('pendingMessages', pendingMessages);
    }

    if (settingsStr) {
      const settings = JSON.parse(settingsStr);
      settingsStore.set(settings);
    }
  } catch (error) {
    console.error('Error loading cached data:', error);
  }
}

// Add message to pending queue with retry metadata
export async function addPendingMessage(content: string) {
  const pendingMessage: PendingMessage = {
    id: Date.now().toString(),
    content,
    timestamp: Date.now(),
    retryCount: 0,
    lastRetry: null,
  };

  const currentPending = offlineStore.get().pendingMessages;
  const updatedPending = [...currentPending, pendingMessage];
  
  offlineStore.setKey('pendingMessages', updatedPending);
  
  try {
    await AsyncStorage.setItem(PENDING_MESSAGES_KEY, JSON.stringify(updatedPending));
  } catch (error) {
    console.error('Error saving pending message:', error);
  }

  return pendingMessage;
}

// Calculate retry delay with exponential backoff
function getRetryDelay(retryCount: number): number {
  const delay = Math.min(
    INITIAL_RETRY_DELAY * Math.pow(2, retryCount),
    MAX_RETRY_DELAY
  );
  return delay + (Math.random() * 1000); // Add jitter
}

// Sync pending messages with retry logic
async function syncPendingMessages() {
  const { pendingMessages, syncInProgress } = offlineStore.get();
  
  if (syncInProgress || pendingMessages.length === 0) {
    return;
  }

  offlineStore.setKey('syncInProgress', true);

  try {
    const sortedMessages = [...pendingMessages].sort((a, b) => a.timestamp - b.timestamp);

    for (const message of sortedMessages) {
      if (message.retryCount >= MAX_RETRIES) {
        // Move to failed messages or notify user
        continue;
      }

      try {
        await sendMessage(message.content);
        
        // Remove from pending queue on success
        const remaining = offlineStore.get().pendingMessages
          .filter(m => m.id !== message.id);
        offlineStore.setKey('pendingMessages', remaining);
        await AsyncStorage.setItem(PENDING_MESSAGES_KEY, JSON.stringify(remaining));
      } catch (error) {
        // Update retry metadata
        const updatedMessage = {
          ...message,
          retryCount: message.retryCount + 1,
          lastRetry: Date.now(),
        };

        const updatedPending = offlineStore.get().pendingMessages.map(m =>
          m.id === message.id ? updatedMessage : m
        );

        offlineStore.setKey('pendingMessages', updatedPending);
        await AsyncStorage.setItem(PENDING_MESSAGES_KEY, JSON.stringify(updatedPending));

        // Wait before next retry
        await sleep(getRetryDelay(updatedMessage.retryCount));
      }
    }
  } finally {
    offlineStore.setKey('syncInProgress', false);
    offlineStore.setKey('lastSyncTimestamp', Date.now());
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}