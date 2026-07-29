import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  Stack,
  Typography,
} from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

function NotificationPermissionGate({ children }) {
  const [permissionState, setPermissionState] = useState('checking');

  const checkPermission = () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Notification API is not supported in this browser; proceeding without the permission gate.');
      setPermissionState('unsupported');
      return;
    }

    const currentPermission = Notification.permission;
    if (currentPermission === 'granted') {
      setPermissionState('granted');
    } else if (currentPermission === 'denied') {
      setPermissionState('denied');
    } else {
      setPermissionState('default');
    }
  };

  useEffect(() => {
    checkPermission();
  }, []);

  const handleRequestPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Notification API is not supported in this browser; proceeding without the permission gate.');
      setPermissionState('unsupported');
      return;
    }

    const result = await Notification.requestPermission();
    if (result === 'granted') {
      setPermissionState('granted');
    } else if (result === 'denied') {
      setPermissionState('denied');
    } else {
      setPermissionState('default');
    }
  };

  if (permissionState === 'granted' || permissionState === 'unsupported') {
    return children;
  }

  if (permissionState === 'checking') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Dialog open fullScreen disableEscapeKeyDown onClose={() => {}}>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          p: 3,
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 480,
            bgcolor: 'background.paper',
            borderRadius: 3,
            boxShadow: 4,
            p: { xs: 3, sm: 4 },
          }}
        >
          <Stack spacing={2} alignItems="center" textAlign="center">
            {permissionState === 'default' ? (
              <NotificationsActiveIcon color="primary" sx={{ fontSize: 48 }} />
            ) : (
              <LockOutlinedIcon color="warning" sx={{ fontSize: 48 }} />
            )}

            <Typography variant="h5" fontWeight={700}>
              {permissionState === 'default' ? 'Enable notifications' : 'Notifications are blocked'}
            </Typography>

            <Typography color="text.secondary">
              {permissionState === 'default'
                ? 'Notifications are required for attendance and duty follow-up alerts. Please allow them so the app can reach you when it matters.'
                : 'Notifications were blocked in your browser. Please re-enable them for this site in your browser settings, then try again.'}
            </Typography>

            {permissionState === 'default' ? (
              <Button variant="contained" onClick={handleRequestPermission} sx={{ width: '100%' }}>
                Allow Notifications
              </Button>
            ) : (
              <Button variant="contained" onClick={checkPermission} sx={{ width: '100%' }}>
                Check Again
              </Button>
            )}
          </Stack>
        </Box>
      </Box>
    </Dialog>
  );
}

export default NotificationPermissionGate;
