import React from 'react';
import { useStore } from '@nanostores/react';
import { taskStore, TaskManager } from '~/lib/tasks/TaskManager';
import { Switch } from '~/components/ui/Switch';
import { Progress } from '~/components/ui/Progress';
import { classNames } from '~/utils/classNames';

export default function TaskManagerTab() {
  const { tasks, isRunning } = useStore(taskStore);
  const taskManager = TaskManager.getInstance();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-bolt-elements-textPrimary">
          Background Tasks
        </h2>
        <Switch
          checked={isRunning}
          onCheckedChange={(checked) => {
            if (checked) {
              taskManager.startAllTasks();
            } else {
              taskManager.stopAllTasks();
            }
          }}
        />
      </div>

      <div className="grid gap-4">
        {Object.values(tasks).map((task) => (
          <div
            key={task.id}
            className={classNames(
              'p-4 rounded-lg border',
              'bg-bolt-elements-background-depth-2',
              'border-bolt-elements-borderColor'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-medium text-bolt-elements-textPrimary">
                  {task.name}
                </h3>
                <p className="text-sm text-bolt-elements-textSecondary">
                  {task.description}
                </p>
              </div>
              <Switch
                checked={task.enabled}
                onCheckedChange={(checked) => {
                  taskManager.enableTask(task.id, checked);
                }}
                disabled={!isRunning}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={classNames(
                  'w-2 h-2 rounded-full',
                  {
                    'bg-green-500': task.status === 'idle',
                    'bg-blue-500 animate-pulse': task.status === 'running',
                    'bg-red-500': task.status === 'failed',
                  }
                )} />
                <span className="text-sm text-bolt-elements-textSecondary">
                  {task.status === 'running' ? 'Running' : 
                   task.status === 'failed' ? 'Failed' : 'Idle'}
                </span>
              </div>

              {task.lastRun && (
                <p className="text-xs text-bolt-elements-textTertiary">
                  Last run: {new Date(task.lastRun).toLocaleString()}
                </p>
              )}

              {task.error && (
                <p className="text-xs text-red-500">
                  Error: {task.error}
                </p>
              )}

              {task.status === 'running' && (
                <Progress value={Math.random() * 100} className="h-1" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}