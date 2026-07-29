import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

function Welfare() {
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Paper sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Welfare
        </Typography>
        <Typography color="text.secondary">
          Coming soon.
        </Typography>
      </Paper>
    </Box>
  );
}

export default Welfare;
