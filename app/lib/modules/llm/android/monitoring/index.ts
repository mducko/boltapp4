import { PerformanceMonitor } from './PerformanceMonitor';
import { AnalyticsManager } from './AnalyticsManager';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('Monitoring');

export async function initializeMonitoring() {
  try {
    // Initialize performance monitoring
    const performanceMonitor = PerformanceMonitor.getInstance();
    await performanceMonitor.initialize();
    logger.info('Performance monitoring initialized');

    // Initialize analytics
    const analyticsManager = AnalyticsManager.getInstance();
    await analyticsManager.initialize();
    logger.info('Analytics initialized');
  } catch (error) {
    logger.error('Failed to initialize monitoring:', error);
    throw error;
  }
}

export { PerformanceMonitor, AnalyticsManager };