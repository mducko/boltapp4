import React from 'react';
import { Dialog, DialogTitle } from '~/components/ui/Dialog';
import { Button } from '~/components/ui/Button';
import { useStore } from '@nanostores/react';
import { backupStore, backupProgress, BackupManager } from '~/lib/backup/BackupManager';
import { Progress } from '~/components/ui/Progress';

interface BackupDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BackupDialog({ isOpen, onClose }: BackupDialogProps) {
  const { isBackingUp, isRestoring } = useStore(backupStore);
  const progress = useStore(backupProgress);

  const handleBackup = async () => {
    try {
      await BackupManager.getInstance().createBackup();
      onClose();
    } catch (error) {
      console.error('Backup failed:', error);
      // Show error toast
    }
  };

  const handleRestore = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.zip';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          await BackupManager.getInstance().restoreBackup(file);
          onClose();
        }
      };
      input.click();
    } catch (error) {
      console.error('Restore failed:', error);
      // Show error toast
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className="p-6">
        <DialogTitle>Backup & Restore</DialogTitle>

        {(isBackingUp || isRestoring) && (
          <div className="my-6">
            <Progress value={progress} className="mb-2" />
            <p className="text-sm text-bolt-elements-textSecondary">
              {isBackingUp ? 'Creating backup...' : 'Restoring backup...'}
              {progress.toFixed(1)}%
            </p>
          </div>
        )}

        <div className="mt-6 space-y-4">
          <Button
            className="w-full"
            onClick={handleBackup}
            disabled={isBackingUp || isRestoring}
          >
            Create Backup
          </Button>

          <Button
            className="w-full"
            variant="outline"
            onClick={handleRestore}
            disabled={isBackingUp || isRestoring}
          >
            Restore Backup
          </Button>
        </div>
      </div>
    </Dialog>
  );
}