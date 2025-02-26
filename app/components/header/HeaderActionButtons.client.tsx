import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { IconButton } from '~/components/ui/IconButton';
import { Button } from '~/components/ui/Button';
import { workbenchStore } from '~/lib/stores/workbench';
import { chatStore } from '~/lib/stores/chat';
import { PushToGitHubDialog } from '~/components/@settings/tabs/connections/components/PushToGitHubDialog';
import { BackupDialog } from '~/components/backup/BackupDialog';
import { toast } from 'react-toastify';
import { classNames } from '~/utils/classNames';

export function HeaderActionButtons() {
  const [isPushDialogOpen, setIsPushDialogOpen] = useState(false);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const { showChat } = useStore(chatStore);
  const isSmallViewport = useViewport(1024);
  const canHideChat = showWorkbench || !showChat;

  return (
    <div className="flex">
      <IconButton
        icon="i-ph:archive"
        title="Backup"
        onClick={() => setShowBackupDialog(true)}
      />
      <div className="relative">
        <div className="flex border border-bolt-elements-borderColor rounded-md overflow-hidden mr-2 text-sm">
          <Button
            active
            disabled={isSyncing}
            onClick={() => setIsPushDialogOpen(!isPushDialogOpen)}
            className="px-4 hover:bg-bolt-elements-item-backgroundActive flex items-center gap-2"
          >
            {isSyncing ? 'Syncing...' : 'Push to GitHub'}
            <div className={classNames('i-ph:caret-down w-4 h-4 transition-transform', isPushDialogOpen ? 'rotate-180' : '')} />
          </Button>
        </div>
      </div>

      <div className="flex border border-bolt-elements-borderColor rounded-md overflow-hidden">
        <Button
          active={showChat}
          disabled={!canHideChat || isSmallViewport}
          onClick={() => {
            if (canHideChat) {
              chatStore.setKey('showChat', !showChat);
            }
          }}
        >
          <div className="i-bolt:chat text-sm" />
        </Button>
        <div className="w-[1px] bg-bolt-elements-borderColor" />
        <Button
          active={showWorkbench}
          onClick={() => {
            if (showWorkbench && !showChat) {
              chatStore.setKey('showChat', true);
            }
            workbenchStore.showWorkbench.set(!showWorkbench);
          }}
        >
          <div className="i-ph:code-bold" />
        </Button>
      </div>

      <PushToGitHubDialog
        isOpen={isPushDialogOpen}
        onClose={() => setIsPushDialogOpen(false)}
        onPush={async (repoName, username, token, isPrivate) => {
          try {
            setIsSyncing(true);
            const repoUrl = await workbenchStore.pushToGitHub(repoName, undefined, username, token, isPrivate);
            toast.success('Successfully pushed to GitHub');
            return repoUrl;
          } catch (error) {
            console.error('Error pushing to GitHub:', error);
            toast.error('Failed to push to GitHub');
            throw error;
          } finally {
            setIsSyncing(false);
          }
        }}
      />

      <BackupDialog
        isOpen={showBackupDialog}
        onClose={() => setShowBackupDialog(false)}
      />
    </div>
  );
}