import React from 'react';
import { Box, Card, CardContent, Typography, Alert, Button, Stack } from '@mui/material';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

export default function PendingApproval() {
  const handleSignOut = async () => {
    await signOut(auth);
  };

  return (
    <Box sx={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
      <Card sx={{ maxWidth: 520, width: '100%', p: 2, borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h5" color="primary.main" fontWeight="bold">
              Waiting for approval
            </Typography>
            <Alert severity="info">
              Your account has been created and is awaiting approval from the ICT Coordinator.
            </Alert>
            <Typography color="text.secondary">
              Once your role and class assignment are approved, you will be routed to the right dashboard automatically.
            </Typography>
            <Button variant="contained" onClick={handleSignOut}>
              Sign out
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
