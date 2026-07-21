import React from 'react';
import { Box, Typography, LinearProgress, Tooltip } from '@mui/material';

export default function TermProgressBar({ activeTerm, size = 'medium' }) {
  if (!activeTerm || !activeTerm.startDate || !activeTerm.endDate) {
    return (
      <Box sx={{ my: size === 'small' ? 1 : 2 }}>
        <Typography variant="caption" color="text.secondary">
          No active term dates set.
        </Typography>
      </Box>
    );
  }

  const today = new Date();
  const startDate = new Date(activeTerm.startDate);
  const endDate = new Date(activeTerm.endDate);
  const midtermDate = activeTerm.midtermDate ? new Date(activeTerm.midtermDate) : null;

  // Add 1 day to endDate to make the range inclusive
  endDate.setDate(endDate.getDate() + 1);

  const totalDays = Math.max(1, endDate - startDate) / (1000 * 60 * 60 * 24);
  const elapsedDays = Math.max(0, today - startDate) / (1000 * 60 * 60 * 24);

  const percentageElapsed = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));

  let midtermPercentage = null;
  if (midtermDate && midtermDate >= startDate && midtermDate <= endDate) {
    const midtermElapsed = (midtermDate - startDate) / (1000 * 60 * 60 * 24);
    midtermPercentage = (midtermElapsed / totalDays) * 100;
  }

  const height = size === 'small' ? 6 : 10;

  return (
    <Box sx={{ my: size === 'small' ? 1 : 2, width: '100%' }}>
      <Box sx={{ position: 'relative', width: '100%' }}>
        <LinearProgress
          variant="determinate"
          value={percentageElapsed}
          sx={{ height, borderRadius: height / 2 }}
        />
        {midtermPercentage !== null && (
          <Tooltip title={`Midterm: ${activeTerm.midtermDate}`}>
            <Box
              sx={{
                position: 'absolute',
                left: `${midtermPercentage}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: size === 'small' ? '3px' : '4px',
                height: size === 'small' ? '10px' : '16px',
                bgcolor: 'secondary.main',
                zIndex: 1,
              }}
            />
          </Tooltip>
        )}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          {activeTerm.startDate}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {activeTerm.endDate}
        </Typography>
      </Box>
    </Box>
  );
}