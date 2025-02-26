import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import type { TensorflowModel, TrainingConfig, InferenceResult } from '../types/neuralNet';

const { NeuralNetModule } = NativeModules;
const neuralNetEvents = new NativeEventEmitter(NeuralNetModule);

export class NeuralNetManager {
  private static instance: NeuralNetManager;
  private isInitialized = false;

  private constructor() {
    // Subscribe to training progress events
    neuralNetEvents.addListener('trainingProgress', (progress) => {
      console.log('Training progress:', progress);
    });
  }

  static getInstance(): NeuralNetManager {
    if (!NeuralNetManager.instance) {
      NeuralNetManager.instance = new NeuralNetManager();
    }
    return NeuralNetManager.instance;
  }

  async initialize(): Promise<void> {
    if (Platform.OS !== 'android') {
      throw new Error('Neural network features are only available on Android');
    }

    try {
      const result = await NeuralNetModule.initialize();
      this.isInitialized = result.success;
      console.log('Neural network initialized:', result);
    } catch (error) {
      console.error('Failed to initialize neural network:', error);
      throw new Error('Neural network initialization failed');
    }
  }

  async loadModel(modelConfig: TensorflowModel): Promise<boolean> {
    this.checkInitialized();

    try {
      const result = await NeuralNetModule.loadModel({
        modelPath: modelConfig.path,
        inputShape: modelConfig.inputShape,
        outputShape: modelConfig.outputShape,
        accelerator: modelConfig.accelerator || 'default',
      });
      return result.success;
    } catch (error) {
      console.error('Failed to load model:', error);
      return false;
    }
  }

  async train(config: TrainingConfig): Promise<boolean> {
    this.checkInitialized();

    try {
      return await NeuralNetModule.startTraining({
        batchSize: config.batchSize,
        epochs: config.epochs,
        learningRate: config.learningRate,
        validationSplit: config.validationSplit,
        ...config.customParams,
      });
    } catch (error) {
      console.error('Training failed:', error);
      return false;
    }
  }

  async stopTraining(): Promise<void> {
    this.checkInitialized();
    await NeuralNetModule.stopTraining();
  }

  async inference(input: number[]): Promise<InferenceResult> {
    this.checkInitialized();

    try {
      return await NeuralNetModule.runInference(input);
    } catch (error) {
      console.error('Inference failed:', error);
      throw error;
    }
  }

  async getDeviceInfo(): Promise<{
    hasNNAPI: boolean;
    accelerators: string[];
    supportedOperations: string[];
  }> {
    return await NeuralNetModule.getDeviceInfo();
  }

  private checkInitialized() {
    if (!this.isInitialized) {
      throw new Error('Neural network not initialized. Call initialize() first.');
    }
  }
}