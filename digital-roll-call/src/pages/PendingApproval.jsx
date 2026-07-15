import React, { useState } from 'react';
import { Box, Typography, Paper, Button, CircularProgress, Alert } from '@mui/material';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../firebase';

function PendingApproval() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const currentUser = auth.currentUser;

  const handleBootstrap = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const bootstrapFirstCoordinator = httpsCallable(functions, 'bootstrapFirstCoordinator');
      const result = await bootstrapFirstCoordinator();
      if (result.data.success) {
        setSuccess('Successfully promoted to ICT Coordinator. Please sign out and sign back in to access your new permissions.');
      }
    } catch (err) {
      console.error("Error bootstrapping coordinator:", err);
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', textAlign: 'center', mt: 5 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Pending Approval
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Your account has been created but is awaiting approval from an administrator.
          Please check back later. If you believe this is an error, please contact support.
        </Typography>

        {currentUser?.email === 'jeffjr2060@gmail.com' && (
          <Box sx={{ mt: 4, p: 2, border: '1px dashed grey', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>Initial Account Bootstrap</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              As the first administrator, you can self-approve your account to the ICT Coordinator role.
            </Typography>
            <Button
              variant="contained"
              color="secondary"
              onClick={handleBootstrap}
              disabled={loading || !!success}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Promote to ICT Coordinator'}
            </Button>
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
          </Box>
        )}
      </Paper>
    </Box>
  );
}

export default PendingApproval;