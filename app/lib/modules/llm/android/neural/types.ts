export interface TensorflowModel {
  path: string;
  inputShape: number[];
  outputShape: number[];
  accelerator?: 'default' | 'cpu' | 'gpu' | 'npu';
}

export interface TrainingConfig {
  batchSize: number;
  epochs: number;
  learningRate: number;
  validationSplit: number;
  customParams?: Record<string, any>;
}

export interface InferenceResult {
  output: number[];
  latencyMs: number;
  confidenceScore?: number;
}

export interface ModelProgress {
  stage: 'download' | 'load' | 'train' | 'inference';
  progress: number;
  message?: string;
  error?: string;
}