export interface TaskState {
  id: string;
  name: string;
  description: string;
  interval: number;
  lastRun: number | null;
  status: 'idle' | 'running' | 'failed';
  error?: string;
  enabled: boolean;
  handler: () => Promise<void>;
}