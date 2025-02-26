import { TaskManager } from './TaskManager';
import { NeuralNetManager } from '../neural/NeuralNetManager';
import { ModelManager } from '../neural/ModelManager';
import { createScopedLogger } from '~/utils/logger';
import NetInfo from '@react-native-community/netinfo';

const logger = createScopedLogger('NeuralNetTasks');

export function initializeNeuralNetTasks() {
  const taskManager = TaskManager.getInstance();
  const neuralNetManager = NeuralNetManager.getInstance();
  const modelManager = ModelManager.getInstance();

  // Register model update check task
  taskManager.registerTask({
    id: 'model-update-check',
    name: 'Model Update Check',
    description: 'Checks for model updates when online',
    interval: 12 * 60 * 60 * 1000, // Every 12 hours
    enabled: true,
    handler: async () => {
      try {
        // Check network connectivity
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) {
          logger.info('Skipping model update check - no network connection');
          return;
        }

        // Get list of installed models
        const installedModels = await modelManager.listModels();
        
        for (const model of installedModels) {
          try {
            // Check for model updates
            // TODO: Implement model version checking against remote repository
            logger.debug(`Checking updates for model: ${model.path}`);
          } catch (error) {
            logger.error(`Failed to check updates for model ${model.path}:`, error);
          }
        }

        logger.info('Model update check completed');
      } catch (error) {
        logger.error('Model update check failed:', error);
        throw error;
      }
    },
  });

  taskManager.registerTask({
    id: 'model-optimization',
    name: 'Model Optimization',
    description: 'Optimizes loaded models for better performance',
    interval: 24 * 60 * 60 * 1000,
    enabled: true,
    handler: async () => {
      const deviceInfo = await neuralNetManager.getDeviceInfo();
      const models = await modelManager.listModels();
      
      await Promise.all(models.map(async model => {
        if (deviceInfo.hasNNAPI && model.accelerator === 'default') {
          try {
            await neuralNetManager.optimizeModel(model.path, 'nnapi');
            logger.info(`Optimized model ${model.path} for NNAPI`);
          } catch (error) {
            logger.error(`Failed to optimize model ${model.path}:`, error);
          }
        }
      }));
    },
});

  // Register model cleanup task
  taskManager.registerTask({
    id: 'model-cleanup',
    name: 'Model Cleanup',
    description: 'Removes unused models to free up storage',
    interval: 7 * 24 * 60 * 60 * 1000, // Weekly
    enabled: true,
    handler: async () => {
      try {
        // Get list of installed models
        const models = await modelManager.listModels();
        
        // TODO: Implement usage tracking and cleanup logic
        // For now, just log the number of installed models
        logger.info(`Found ${models.length} installed models`);
        
        logger.info('Model cleanup completed');
      } catch (error) {
        logger.error('Model cleanup failed:', error);
        throw error;
      }
    },
  });

  // Register model performance monitoring task
  taskManager.registerTask({
    id: 'model-performance-monitor',
    name: 'Model Performance Monitor',
    description: 'Monitors and logs model performance metrics',
    interval: 60 * 60 * 1000, // Hourly
    enabled: true,
    handler: async () => {
      try {
        // Get device info
        const deviceInfo = await neuralNetManager.getDeviceInfo();
        
        // Log device capabilities
        logger.info('Device capabilities:', {
          hasNNAPI: deviceInfo.hasNNAPI,
          accelerators: deviceInfo.accelerators,
          supportedOperations: deviceInfo.supportedOperations,
        });

        // TODO: Implement performance metrics collection
        logger.info('Performance monitoring completed');
      } catch (error) {
        logger.error('Performance monitoring failed:', error);
        throw error;
      }
    },
  });
}