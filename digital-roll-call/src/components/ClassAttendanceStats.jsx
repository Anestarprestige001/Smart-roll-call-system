import React from 'react';
import { Box, Card, CardContent, Typography, Stack, Chip, CircularProgress, Alert, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAttendanceStats } from '../hooks/useAttendanceStats';

export default function ClassAttendanceStats({ classId, className, activeTerm }) {
  const navigate = useNavigate();
  const {
    loading, error, logs, todayLogs,
    todayStats = { totalPresent: 0, totalAbsent: 0 },
    termStats = { totalPresent: 0, totalAbsent: 0 }
  } = useAttendanceStats(classId, activeTerm);

  const hasSubmittedToday = todayLogs.length > 0;

  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      <Alert severity={hasSubmittedToday ? 'success' : 'warning'} sx={{ mb: 3 }}>
        {hasSubmittedToday
          ? `${className || classId} has submitted today's roll call.`
          : `${className || classId} is still waiting for today's roll call.`}
      </Alert>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Class Overview: {className || classId}
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2, mb: 2 }}>
            <Chip label={`Present Today: ${todayStats.totalPresent}`} color="success" />
            <Chip label={`Absent Today: ${todayStats.totalAbsent}`} color="error" />
            <Chip label={`Term Present: ${termStats.totalPresent}`} color="success" variant="outlined" />
            <Chip label={`Term Absent: ${termStats.totalAbsent}`} color="error" variant="outlined" />
          </Stack>

          {!hasSubmittedToday && (
            <Button
              variant="contained"
              sx={{ mt: 2 }}
              onClick={() => navigate('/submit-attendance')}
            >
              Submit Today's Roll Call
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Recent Class Records
          </Typography>
          {logs.length === 0 ? (
            <Typography color="text.secondary">No records for this class yet.</Typography>
          ) : (
            <Stack spacing={1}>
              {logs.slice(0, 5).map((log) => (
                <Box
                  key={log.id}
                  sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 1.5 }}
                >
                  <Typography variant="subtitle2">{log.date}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Present: {log.totalPresent} • Absent: {log.totalAbsent}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}