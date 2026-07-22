import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, Stack, Chip, CircularProgress, Alert, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { getRosterTotals } from '../constants/classes';
import { useAttendanceStats } from '../hooks/useAttendanceStats';

export default function ClassAttendanceStats({ classId, className, activeTerm }) {
  const navigate = useNavigate();
  const {
    loading, error, logs, todayLogs,
    todayStats = { totalPresent: 0, totalAbsent: 0 },
    termStats = { totalPresent: 0, totalAbsent: 0, absentGirls: 0, absentBoys: 0, absentBoarders: 0, absentDayScholars: 0 }
  } = useAttendanceStats(classId, activeTerm);
  const [rosterTotals, setRosterTotals] = useState(getRosterTotals({}));

  useEffect(() => {
    if (!classId) {
      setRosterTotals(getRosterTotals({}));
      return undefined;
    }

    const unsubscribe = onSnapshot(doc(db, 'classes', classId), (snap) => {
      const data = snap.exists() ? snap.data() : {};
      setRosterTotals(getRosterTotals(data));
    });

    return () => unsubscribe();
  }, [classId]);

  const hasSubmittedToday = todayLogs.length > 0;
  const formatRatio = (absent, total, label) => {
    if (total > 0) {
      return `${absent} of ${total} ${label} absent`;
    }
    return `${absent} ${label} absent (roster total not set)`;
  };

  const todayBreakdown = [
    formatRatio(todayStats.absentGirls || 0, rosterTotals.totalGirls, 'girls'),
    formatRatio(todayStats.absentBoys || 0, rosterTotals.totalBoys, 'boys'),
    formatRatio(todayStats.absentBoarders || 0, rosterTotals.totalBoarders, 'boarders'),
    formatRatio(todayStats.absentDayScholars || 0, rosterTotals.totalDayScholars, 'day scholars'),
  ].join(' · ');
  const termBreakdown = [
    formatRatio(termStats.absentGirls || 0, rosterTotals.totalGirls, 'girls'),
    formatRatio(termStats.absentBoys || 0, rosterTotals.totalBoys, 'boys'),
    formatRatio(termStats.absentBoarders || 0, rosterTotals.totalBoarders, 'boarders'),
    formatRatio(termStats.absentDayScholars || 0, rosterTotals.totalDayScholars, 'day scholars'),
  ].join(' · ');

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

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {todayBreakdown}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {termBreakdown}
          </Typography>

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