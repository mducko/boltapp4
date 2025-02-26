import { createScopedLogger } from '~/utils/logger';
import { TaskManager } from './TaskManager';
import type { TaskState } from './types';
import { map } from 'nanostores';

const logger = createScopedLogger('TaskMonitor');

export interface TaskMetrics {
  id: string;
  name: string;
  successCount: number;
  failureCount: number;
  lastSuccess?: number;
  lastFailure?: number;
  averageRuntime: number;
  totalRuns: number;
}

export const taskMetricsStore = map<Record<string, TaskMetrics>>({});

export class TaskMonitor {
  private static instance: TaskMonitor;
  private taskManager: TaskManager;

  private constructor() {
    this.taskManager = TaskManager.getInstance();
  }

  static getInstance(): TaskMonitor {
    if (!TaskMonitor.instance) {
      TaskMonitor.instance = new TaskMonitor();
    }
    return TaskMonitor.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Load saved metrics
      await this.loadMetrics();
      
      // Start monitoring tasks
      this.monitorTasks();
      
      logger.info('Task monitor initialized');
    } catch (error) {
      logger.error('Failed to initialize task monitor:', error);
      throw error;
    }
  }

  private monitorTasks() {
    // Monitor task status changes
    const tasks = this.taskManager.getAllTasks();
    
    tasks.forEach(task => {
      this.initializeMetrics(task);
      this.watchTaskStatus(task);
    });
  }

  private initializeMetrics(task: TaskState) {
    const existingMetrics = taskMetricsStore.get()[task.id];
    
    if (!existingMetrics) {
      taskMetricsStore.setKey(task.id, {
        id: task.id,
        name: task.name,
        successCount: 0,
        failureCount: 0,
        averageRuntime: 0,
        totalRuns: 0,
      });
    }
  }

  private watchTaskStatus(task: TaskState) {
    let startTime: number;

    // Watch for task start
    if (task.status === 'running') {
      startTime = Date.now();
    }

    // Watch for task completion
    if (task.status !== 'running' && startTime) {
      const runtime = Date.now() - startTime;
      this.updateMetrics(task.id, task.status === 'failed', runtime);
    }
  }

  private updateMetrics(taskId: string, failed: boolean, runtime: number) {
    const metrics = taskMetricsStore.get()[taskId];
    if (!metrics) return;

    const now = Date.now();
    const newTotalRuns = metrics.totalRuns + 1;
    const newAverageRuntime = 
      ((metrics.averageRuntime * metrics.totalRuns) + runtime) / newTotalRuns;

    taskMetricsStore.setKey(taskId, {
      ...metrics,
      successCount: failed ? metrics.successCount : metrics.successCount + 1,
      failureCount: failed ? metrics.failureCount + 1 : metrics.failureCount,
      lastSuccess: failed ? metrics.lastSuccess : now,
      lastFailure: failed ? now : metrics.lastFailure,
      averageRuntime: newAverageRuntime,
      totalRuns: newTotalRuns,
    });
  }

  private async loadMetrics() {
    // TODO: Implement persistence for task metrics
  }

  getTaskMetrics(taskId: string): TaskMetrics | undefined {
    return taskMetricsStore.get()[taskId];
  }

  getAllMetrics(): TaskMetrics[] {
    return Object.values(taskMetricsStore.get());
  }

  clearMetrics(taskId: string) {
    const metrics = taskMetricsStore.get()[taskId];
    if (metrics) {
      taskMetricsStore.setKey(taskId, {
        ...metrics,
        successCount: 0,
        failureCount: 0,
        lastSuccess: undefined,
        lastFailure: undefined,
        averageRuntime: 0,
        totalRuns: 0,
      });
    }
  }

  clearAllMetrics() {
    const tasks = this.taskManager.getAllTasks();
    tasks.forEach(task => this.clearMetrics(task.id));
  }
}