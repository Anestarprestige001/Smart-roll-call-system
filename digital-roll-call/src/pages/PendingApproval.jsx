import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

function PendingApproval() {
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

        <Box sx={{ mt: 4, p: 2, border: '1px dashed grey', borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>Initial Account Setup</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            If you are the first user setting up this school account, ask whoever manages the Firebase project to set your role to ICT COORDINATOR directly in the Firestore console in the users collection, or run the set-user-role.js admin script. After that, sign out and back in.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}

export default PendingApproval;