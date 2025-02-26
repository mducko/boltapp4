import { atom, map } from 'nanostores';
import { logStore } from '../stores/logs';

export interface Task {
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
  tasks: Record<string, Task>;
  isRunning: boolean;
}

export const taskStore = map<TaskManagerState>({
  tasks: {},
  isRunning: false,
});

export const taskProgress = atom<number>(0);

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

  registerTask(task: Omit<Task, 'status' | 'lastRun'>): void {
    const tasks = taskStore.get().tasks;
    taskStore.setKey('tasks', {
      ...tasks,
      [task.id]: {
        ...task,
        status: 'idle',
        lastRun: null,
      },
    });
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

      logStore.logSystem(`Task ${task.name} completed successfully`);
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

      logStore.logError(`Task ${task.name} failed`, error);
    }
  }

  startAllTasks(): void {
    if (taskStore.get().isRunning) {
      return;
    }

    const tasks = taskStore.get().tasks;
    taskStore.setKey('isRunning', true);

    // Start interval for each enabled task
    Object.values(tasks).forEach(task => {
      if (task.enabled) {
        this.scheduleTask(task);
      }
    });

    logStore.logSystem('Task manager started');
  }

  stopAllTasks(): void {
    // Clear all intervals
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();

    taskStore.setKey('isRunning', false);
    logStore.logSystem('Task manager stopped');
  }

  private scheduleTask(task: Task): void {
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
  }

  getTaskStatus(taskId: string): Task | undefined {
    return taskStore.get().tasks[taskId];
  }

  getAllTasks(): Task[] {
    return Object.values(taskStore.get().tasks);
  }
}