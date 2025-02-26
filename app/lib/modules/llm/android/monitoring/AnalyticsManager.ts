import { createScopedLogger } from '~/utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const logger = createScopedLogger('AnalyticsManager');

interface AnalyticsEvent {
  id: string;
  type: string;
  timestamp: number;
  data: Record<string, any>;
  sessionId: string;
}

interface AnalyticsConfig {
  batchSize: number;
  flushInterval: number;
  maxQueueSize: number;
  samplingRate: number;
}

export class AnalyticsManager {
  private static instance: AnalyticsManager;
  private eventQueue: AnalyticsEvent[] = [];
  private sessionId: string;
  private flushTimer: NodeJS.Timeout | null = null;
  
  private config: AnalyticsConfig = {
    batchSize: 50,
    flushInterval: 60000, // 1 minute
    maxQueueSize: 1000,
    samplingRate: 1.0 // 100%
  };

  private constructor() {
    this.sessionId = Math.random().toString(36).substring(2);
  }

  static getInstance(): AnalyticsManager {
    if (!AnalyticsManager.instance) {
      AnalyticsManager.instance = new AnalyticsManager();
    }
    return AnalyticsManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Load saved configuration
      const savedConfig = await AsyncStorage.getItem('analytics_config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }

      // Load queued events
      const queuedEvents = await AsyncStorage.getItem('queued_analytics');
      if (queuedEvents) {
        this.eventQueue = JSON.parse(queuedEvents);
      }

      // Start flush timer
      this.startFlushTimer();
      logger.info('Analytics manager initialized');
    } catch (error) {
      logger.error('Failed to initialize analytics manager:', error);
      throw error;
    }
  }

  trackEvent(type: string, data: Record<string, any>): void {
    try {
      // Apply sampling
      if (Math.random() > this.config.samplingRate) {
        return;
      }

      const event: AnalyticsEvent = {
        id: Math.random().toString(36).substring(2),
        type,
        timestamp: Date.now(),
        data,
        sessionId: this.sessionId
      };

      this.eventQueue.push(event);

      // Check queue size
      if (this.eventQueue.length >= this.config.maxQueueSize) {
        this.eventQueue = this.eventQueue.slice(-this.config.maxQueueSize);
      }

      // Persist queue
      this.persistQueue();

      // Flush if batch size reached
      if (this.eventQueue.length >= this.config.batchSize) {
        this.flush();
      }

      logger.debug(`Event tracked: ${type}`);
    } catch (error) {
      logger.error('Failed to track event:', error);
    }
  }

  private async persistQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        'queued_analytics',
        JSON.stringify(this.eventQueue)
      );
    } catch (error) {
      logger.error('Failed to persist event queue:', error);
    }
  }

  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  private async flush(): Promise<void> {
    try {
      if (this.eventQueue.length === 0) {
        return;
      }

      // Check network connectivity
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        logger.debug('Skipping flush - no network connection');
        return;
      }

      // Get events to send
      const events = this.eventQueue.splice(0, this.config.batchSize);

      // Send events to analytics service
      await this.sendEvents(events);

      // Update persisted queue
      await this.persistQueue();

      logger.debug(`Flushed ${events.length} events`);
    } catch (error) {
      logger.error('Failed to flush events:', error);
      
      // Put events back in queue
      this.eventQueue.unshift(...events);
      await this.persistQueue();
    }
  }

  private async sendEvents(events: AnalyticsEvent[]): Promise<void> {
    try {
      // TODO: Implement actual analytics service integration
      console.log('Sending events to analytics service:', events);
    } catch (error) {
      logger.error('Failed to send events:', error);
      throw error;
    }
  }

  updateConfig(config: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...config };
    AsyncStorage.setItem('analytics_config', JSON.stringify(this.config))
      .catch(error => logger.error('Failed to save config:', error));

    // Restart flush timer with new interval
    this.startFlushTimer();
  }

  clearQueue(): void {
    this.eventQueue = [];
    AsyncStorage.removeItem('queued_analytics')
      .catch(error => logger.error('Failed to clear queue:', error));
  }

  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}