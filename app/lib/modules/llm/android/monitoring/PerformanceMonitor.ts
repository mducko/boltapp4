import { createScopedLogger } from '~/utils/logger';
import { NativeModules } from 'react-native';

const logger = createScopedLogger('PerformanceMonitor');

interface PerformanceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  batteryLevel: number;
  fps: number;
  networkLatency: number;
  diskUsage: number;
  temperature: number;
}

interface PerformanceThresholds {
  cpu: { warning: number; critical: number };
  memory: { warning: number; critical: number };
  battery: { warning: number; critical: number };
  fps: { warning: number; critical: number };
  temperature: { warning: number; critical: number };
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private metricsHistory: PerformanceMetrics[] = [];
  private readonly maxHistoryLength = 100;

  private thresholds: PerformanceThresholds = {
    cpu: { warning: 70, critical: 90 },
    memory: { warning: 80, critical: 90 },
    battery: { warning: 20, critical: 10 },
    fps: { warning: 30, critical: 20 },
    temperature: { warning: 40, critical: 45 }
  };

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Start memory monitoring
      this.startMonitoring();
      logger.info('Performance monitor initialized');
    } catch (error) {
      logger.error('Failed to initialize performance monitor:', error);
      throw error;
    }
  }

  private async startMonitoring(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        const metrics = await this.gatherMetrics();
        this.analyzeMetrics(metrics);
        this.updateHistory(metrics);
      } catch (error) {
        logger.error('Performance monitoring error:', error);
      }
    }, 1000); // Monitor every second
  }

  private async gatherMetrics(): Promise<PerformanceMetrics> {
    try {
      const [
        cpuInfo,
        memoryInfo,
        batteryInfo,
        fpsInfo,
        networkInfo,
        diskInfo,
        tempInfo
      ] = await Promise.all([
        NativeModules.PerformanceModule.getCPUUsage(),
        NativeModules.PerformanceModule.getMemoryUsage(),
        NativeModules.PerformanceModule.getBatteryLevel(),
        NativeModules.PerformanceModule.getFPS(),
        NativeModules.PerformanceModule.getNetworkLatency(),
        NativeModules.PerformanceModule.getDiskUsage(),
        NativeModules.PerformanceModule.getTemperature()
      ]);

      return {
        cpuUsage: cpuInfo.usage,
        memoryUsage: memoryInfo.usage,
        batteryLevel: batteryInfo.level,
        fps: fpsInfo.current,
        networkLatency: networkInfo.latency,
        diskUsage: diskInfo.usage,
        temperature: tempInfo.celsius
      };
    } catch (error) {
      logger.error('Failed to gather metrics:', error);
      throw error;
    }
  }

  private analyzeMetrics(metrics: PerformanceMetrics): void {
    // Check CPU usage
    if (metrics.cpuUsage > this.thresholds.cpu.critical) {
      logger.error('Critical CPU usage detected:', metrics.cpuUsage);
      this.handleCriticalCPU();
    } else if (metrics.cpuUsage > this.thresholds.cpu.warning) {
      logger.warn('High CPU usage detected:', metrics.cpuUsage);
    }

    // Check memory usage
    if (metrics.memoryUsage > this.thresholds.memory.critical) {
      logger.error('Critical memory usage detected:', metrics.memoryUsage);
      this.handleCriticalMemory();
    } else if (metrics.memoryUsage > this.thresholds.memory.warning) {
      logger.warn('High memory usage detected:', metrics.memoryUsage);
    }

    // Check FPS
    if (metrics.fps < this.thresholds.fps.critical) {
      logger.error('Critical FPS drop detected:', metrics.fps);
      this.handleCriticalFPS();
    } else if (metrics.fps < this.thresholds.fps.warning) {
      logger.warn('Low FPS detected:', metrics.fps);
    }

    // Check temperature
    if (metrics.temperature > this.thresholds.temperature.critical) {
      logger.error('Critical temperature detected:', metrics.temperature);
      this.handleCriticalTemperature();
    } else if (metrics.temperature > this.thresholds.temperature.warning) {
      logger.warn('High temperature detected:', metrics.temperature);
    }
  }

  private async handleCriticalCPU(): Promise<void> {
    try {
      // Reduce background tasks
      await NativeModules.PerformanceModule.reduceBackgroundTasks();
      
      // Clear caches
      await NativeModules.PerformanceModule.clearNonEssentialCaches();
      
      logger.info('Critical CPU mitigation completed');
    } catch (error) {
      logger.error('Failed to handle critical CPU:', error);
    }
  }

  private async handleCriticalMemory(): Promise<void> {
    try {
      // Clear memory
      await NativeModules.PerformanceModule.clearMemory();
      
      // Reduce cache size
      await NativeModules.PerformanceModule.reduceCacheSize();
      
      logger.info('Critical memory mitigation completed');
    } catch (error) {
      logger.error('Failed to handle critical memory:', error);
    }
  }

  private async handleCriticalFPS(): Promise<void> {
    try {
      // Disable animations
      await NativeModules.PerformanceModule.disableAnimations();
      
      // Reduce rendering quality
      await NativeModules.PerformanceModule.reduceRenderQuality();
      
      logger.info('Critical FPS mitigation completed');
    } catch (error) {
      logger.error('Failed to handle critical FPS:', error);
    }
  }

  private async handleCriticalTemperature(): Promise<void> {
    try {
      // Reduce CPU usage
      await NativeModules.PerformanceModule.reduceCPUUsage();
      
      // Disable intensive features
      await NativeModules.PerformanceModule.disableIntensiveFeatures();
      
      logger.info('Critical temperature mitigation completed');
    } catch (error) {
      logger.error('Failed to handle critical temperature:', error);
    }
  }

  private updateHistory(metrics: PerformanceMetrics): void {
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > this.maxHistoryLength) {
      this.metricsHistory.shift();
    }
  }

  async getPerformanceReport(): Promise<{
    current: PerformanceMetrics;
    average: PerformanceMetrics;
    peaks: PerformanceMetrics;
  }> {
    try {
      const current = this.metricsHistory[this.metricsHistory.length - 1];
      
      // Calculate averages
      const average = {
        cpuUsage: this.calculateAverage(this.metricsHistory.map(m => m.cpuUsage)),
        memoryUsage: this.calculateAverage(this.metricsHistory.map(m => m.memoryUsage)),
        batteryLevel: this.calculateAverage(this.metricsHistory.map(m => m.batteryLevel)),
        fps: this.calculateAverage(this.metricsHistory.map(m => m.fps)),
        networkLatency: this.calculateAverage(this.metricsHistory.map(m => m.networkLatency)),
        diskUsage: this.calculateAverage(this.metricsHistory.map(m => m.diskUsage)),
        temperature: this.calculateAverage(this.metricsHistory.map(m => m.temperature))
      };

      // Calculate peaks
      const peaks = {
        cpuUsage: Math.max(...this.metricsHistory.map(m => m.cpuUsage)),
        memoryUsage: Math.max(...this.metricsHistory.map(m => m.memoryUsage)),
        batteryLevel: Math.max(...this.metricsHistory.map(m => m.batteryLevel)),
        fps: Math.min(...this.metricsHistory.map(m => m.fps)),
        networkLatency: Math.max(...this.metricsHistory.map(m => m.networkLatency)),
        diskUsage: Math.max(...this.metricsHistory.map(m => m.diskUsage)),
        temperature: Math.max(...this.metricsHistory.map(m => m.temperature))
      };

      return { current, average, peaks };
    } catch (error) {
      logger.error('Failed to generate performance report:', error);
      throw error;
    }
  }

  private calculateAverage(values: number[]): number {
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }

  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}