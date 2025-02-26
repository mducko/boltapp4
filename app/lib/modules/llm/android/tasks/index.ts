import { initializeNeuralNetTasks } from './NeuralNetTasks';
import { initializeSystemTasks } from './systemTasks';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('TaskInitializer');

export async function initializeAllTasks() {
  try {
    // Initialize system tasks first
    await initializeSystemTasks();
    logger.info('System tasks initialized');

    // Initialize neural network tasks
    await initializeNeuralNetTasks();
    logger.info('Neural network tasks initialized');
  } catch (error) {
    logger.error('Failed to initialize tasks:', error);
    throw error;
  }
}