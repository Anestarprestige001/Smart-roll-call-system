import React from 'react';
import { Snackbar, Button } from '@mui/material';
import { useRegisterSW } from 'virtual:pwa-register/react';

function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r);
    },
    onRegisterError(error) {
      console.log('SW registration error:', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <div>
      {(offlineReady || needRefresh) && (
        <Snackbar
          open={true}
          message={offlineReady ? 'App ready to work offline' : 'A new version is available, click to update'}
          action={
            needRefresh && <Button color="secondary" size="small" onClick={() => updateServiceWorker(true)}>Refresh</Button>
          }
          onClose={close}
        />
      )}
    </div>
  );
}

export default ReloadPrompt;