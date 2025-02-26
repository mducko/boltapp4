import { atom, map } from 'nanostores';
import { logStore } from '../stores/logs';
import BackgroundService from 'react-native-background-actions';

interface TaskState {
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

interface TaskManagerState {
  tasks: Record<string, TaskState>;
  isRunning: boolean;
}

export const taskStore = map<TaskManagerState>({
  tasks: {},
  isRunning: false,
});

export const taskProgress = atom<number>(0);

const backgroundOptions = {
  taskName: 'BoltTasks',
  taskTitle: 'Bolt.droid Background Tasks',
  taskDesc: 'Running background tasks',
  taskIcon: {
    name: 'ic_launcher',
    type: 'mipmap',
  },
  color: '#9C7DFF',
  linkingURI: 'boltapp://chat',
  parameters: {
    delay: 900000, // 15 minutes
  },
};

export class TaskManager {
  private static instance: TaskManager;
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  
  private constructor() {}

  static getInstance(): TaskManager {
    if (!TaskManager.instance) {
      TaskManager.instance = new TaskManager();
    }
    return TaskManager.instance;
  }

  async startAllTasks(): Promise<void> {
    if (taskStore.get().isRunning) {
      return;
    }

    try {
      // Start background service
      await BackgroundService.start(this.backgroundTaskHandler, backgroundOptions);
      taskStore.setKey('isRunning', true);
      logger.info('Task manager started');
    } catch (error) {
      logger.error('Failed to start task manager:', error);
      throw error;
    }
  }

  async stopAllTasks(): Promise<void> {
    try {
      // Stop background service
      await BackgroundService.stop();
      
      // Clear all intervals
      this.intervals.forEach(interval => clearInterval(interval));
      this.intervals.clear();
      
      taskStore.setKey('isRunning', false);
      logger.info('Task manager stopped');
    } catch (error) {
      logger.error('Failed to stop task manager:', error);
      throw error;
    }
  }

  registerTask(task: Omit<TaskState, 'status' | 'lastRun'>): void {
    const tasks = taskStore.get().tasks;
    taskStore.setKey('tasks', {
      ...tasks,
      [task.id]: {
        ...task,
        status: 'idle',
        lastRun: null,
      },
    });
    logger.debug(`Task registered: ${task.id}`);
  }

  async startTask(taskId: string): Promise<void> {
    const tasks = taskStore.get().tasks;
    const task = tasks[taskId];

    if (!task || task.status === 'running') {
      return;
    }

    try {
      // Update task status
      taskStore.setKey('tasks', {
        ...tasks,
        [taskId]: {
          ...task,
          status: 'running',
          error: undefined,
        },
      });

      // Execute task
      await task.handler();

      // Update task status on success
      taskStore.setKey('tasks', {
        ...tasks,
        [taskId]: {
          ...task,
          status: 'idle',
          lastRun: Date.now(),
          error: undefined,
        },
      });

      logger.info(`Task completed successfully: ${task.name}`);
    } catch (error) {
      // Update task status on failure
      taskStore.setKey('tasks', {
        ...tasks,
        [taskId]: {
          ...task,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      logger.error(`Task failed: ${task.name}`, error);
    }
  }

  enableTask(taskId: string, enabled: boolean): void {
    const tasks = taskStore.get().tasks;
    const task = tasks[taskId];

    if (!task) {
      return;
    }

    taskStore.setKey('tasks', {
      ...tasks,
      [taskId]: {
        ...task,
        enabled,
      },
    });

    if (enabled) {
      this.scheduleTask({ ...task, enabled });
    } else {
      const interval = this.intervals.get(taskId);
      if (interval) {
        clearInterval(interval);
        this.intervals.delete(taskId);
      }
    }

    logger.debug(`Task ${enabled ? 'enabled' : 'disabled'}: ${taskId}`);
  }

  private scheduleTask(task: TaskState): void {
    // Clear existing interval if any
    const existingInterval = this.intervals.get(task.id);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Schedule new interval
    const interval = setInterval(() => {
      this.startTask(task.id);
    }, task.interval);

    this.intervals.set(task.id, interval);

    // Run immediately if never run before
    if (task.lastRun === null) {
      this.startTask(task.id);
    }
  }

  private backgroundTaskHandler = async () => {
    while (BackgroundService.isRunning()) {
      try {
        const tasks = taskStore.get().tasks;
        
        // Run enabled tasks
        for (const task of Object.values(tasks)) {
          if (task.enabled) {
            const timeSinceLastRun = task.lastRun ? Date.now() - task.lastRun : Infinity;
            if (timeSinceLastRun >= task.interval) {
              await this.startTask(task.id);
            }
          }
        }

        // Sleep before next check
        await new Promise(resolve => setTimeout(resolve, backgroundOptions.parameters.delay));
      } catch (error) {
        logger.error('Background task error:', error);
        await new Promise(resolve => setTimeout(resolve, 60000)); // Sleep on error
      }
    }
  };

  getTaskStatus(taskId: string): TaskState | undefined {
    return taskStore.get().tasks[taskId];
  }

  getAllTasks(): TaskState[] {
    return Object.values(taskStore.get().tasks);
  }
}