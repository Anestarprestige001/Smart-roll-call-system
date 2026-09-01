import React, { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CloseIcon from '@mui/icons-material/Close';

function NotificationPermissionGate({ children }) {
  const [permissionState, setPermissionState] = useState('checking');
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Notification API is not supported in this browser; continuing without notification prompts.');
      setPermissionState('unsupported');
      return;
    }

    const currentPermission = Notification.permission;
    if (currentPermission === 'granted') {
      setPermissionState('granted');
      setOpen(false);
      return;
    }

    if (currentPermission === 'denied') {
      setPermissionState('denied');
      return;
    }

    setPermissionState('default');
  }, []);

  const handleRequestPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Notification API is not supported in this browser; continuing without notification prompts.');
      setPermissionState('unsupported');
      return;
    }

    const result = await Notification.requestPermission();
    if (result === 'granted') {
      setPermissionState('granted');
      setOpen(false);
      return;
    }

    setPermissionState(result === 'denied' ? 'denied' : 'default');
  };

  if (permissionState === 'granted' || permissionState === 'unsupported' || permissionState === 'checking') {
    return children;
  }

  return (
    <>
      {children}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <NotificationsActiveIcon color="primary" />
            <Typography variant="h6">Optional notifications</Typography>
          </Stack>
          <Button onClick={() => setOpen(false)} size="small" aria-label="Dismiss notification prompt">
            <CloseIcon fontSize="small" />
          </Button>
        </DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Browser notifications are optional. You can continue using the app without them, and you can enable them later from your browser settings if you want alerts.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 0, gap: 1, justifyContent: 'flex-end' }}>
          <Button onClick={() => setOpen(false)} variant="text">
            Continue without notifications
          </Button>
          <Button onClick={handleRequestPermission} variant="contained">
            Allow notifications
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default NotificationPermissionGate;
