import React, { useEffect, useState } from 'react';
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions, Typography, Paper,
  CircularProgress, Alert, Button, IconButton, Grid, useTheme, Divider
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import CloseIcon from '@mui/icons-material/Close';
import PeopleIcon from '@mui/icons-material/People';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import { db } from '../../firebase';
import { useAttendanceStats } from '../../hooks/useAttendanceStats';
import StatCard from '../StatCard';

function BreakdownRow({ label, value }) {
  return (
    <Grid item xs={12} sm={6}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography variant="body2" fontWeight="bold">{value}</Typography>
      </Box>
    </Grid>
  );
}

export default function ClassStatsDetailModal({ open, onClose, classId, className, activeTerm, isTeacherView = false }) {
  const navigate = useNavigate();
  const theme = useTheme();
  const {
    loading, error, logs, todayLogs,
    todayStats = { totalPresent: 0, totalAbsent: 0, absentGirls: 0, absentBoys: 0, absentBoarders: 0, absentDayScholars: 0 },
    termStats = { totalPresent: 0, totalAbsent: 0, absentGirls: 0, absentBoys: 0, absentBoarders: 0, absentDayScholars: 0, attendanceRate: 0 }
  } = useAttendanceStats(classId, activeTerm);
  const [rosterTotals, setRosterTotals] = useState({ totalGirls: 0, totalBoys: 0, totalBoarders: 0, totalDayScholars: 0 });

  useEffect(() => {
    if (!classId) {
      setRosterTotals({ totalGirls: 0, totalBoys: 0, totalBoarders: 0, totalDayScholars: 0 });
      return undefined;
    }

    const unsubscribe = onSnapshot(doc(db, 'classes', classId), (snap) => {
      const data = snap.exists() ? snap.data() : {};
      const totalGirls = Number(data.totalGirls || 0);
      const totalBoys = Number(data.totalBoys || 0);
      setRosterTotals({
        total: totalGirls + totalBoys,
        totalGirls,
        totalBoys,
        totalBoarders: Number(data.totalBoarders || 0),
        totalDayScholars: Number(data.totalDayScholars || 0),
      });
    });

    return () => unsubscribe();
  }, [classId]);

  const hasSubmittedToday = todayLogs.length > 0;

  const formatRatio = (absent, total) => `${absent} / ${total}`;

  const totalDaysSubmitted = logs.length;
  const possibleStudentDays = rosterTotals.total * totalDaysSubmitted;

  const termPresentPercent = possibleStudentDays > 0 ? ((termStats.totalPresent / possibleStudentDays) * 100).toFixed(1) : "N/A";
  const termAbsentPercent = possibleStudentDays > 0 ? ((termStats.totalAbsent / possibleStudentDays) * 100).toFixed(1) : "N/A";

  const summaryStats = [
    { title: 'Present Today', value: todayStats.totalPresent, Icon: PeopleIcon, accentColor: theme.palette.success.main, subtitle: 'Students present' },
    { title: 'Absent Today', value: todayStats.totalAbsent, Icon: PersonOffIcon, accentColor: theme.palette.error.main, subtitle: 'Students absent' },
    {
      title: 'Term Present', value: `${termStats.totalPresent} (${termPresentPercent}%)`, Icon: CheckCircleOutlineIcon, accentColor: theme.palette.info.main, subtitle: `Across ${totalDaysSubmitted} days`
    },
    {
      title: 'Term Absent', value: `${termStats.totalAbsent} (${termAbsentPercent}%)`, Icon: ErrorOutlineIcon, accentColor: theme.palette.warning.main, subtitle: `Across ${totalDaysSubmitted} days`
    },
  ];

  const renderContent = () => {
    if (loading) return <CircularProgress sx={{ m: 4 }} />;
    if (error) return <Alert severity="error">{error}</Alert>;

    return (
      <>
        <Alert severity={hasSubmittedToday ? 'success' : 'warning'} sx={{ mb: 2 }} iconMapping={{ success: <CheckCircleOutlineIcon fontSize="inherit" /> }}>
          {hasSubmittedToday
            ? `Roll call has been submitted for today.`
            : `Still waiting for today's roll call submission.`}
        </Alert>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {summaryStats.map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <StatCard {...stat} />
            </Grid>
          ))}
        </Grid>

        <Typography variant="h6" gutterBottom>Demographic Breakdown</Typography>
        <Grid container spacing={1} sx={{ mb: 2 }}>
          <BreakdownRow label="Girls Absent Today" value={formatRatio(todayStats.absentGirls, rosterTotals.totalGirls)} />
          <BreakdownRow label="Boys Absent Today" value={formatRatio(todayStats.absentBoys, rosterTotals.totalBoys)} />
          <BreakdownRow label="Boarders Absent Today" value={formatRatio(todayStats.absentBoarders, rosterTotals.totalBoarders)} />
          <BreakdownRow label="Day Scholars Absent Today" value={formatRatio(todayStats.absentDayScholars, rosterTotals.totalDayScholars)} />
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" gutterBottom>Recent Records</Typography>
        {logs.length === 0 ? (
          <Typography color="text.secondary">No records for this class yet.</Typography>
        ) : (
          <Box>
            {logs.slice(0, 3).map((log) => (
              <Box
                key={log.id}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  p: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 1
                }}
              >
                <Typography variant="body2" fontWeight="bold">{log.date}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Present: {log.totalPresent} • Absent: {log.totalAbsent}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </>
    );
  };

  if (isTeacherView) {
    return (
      <Paper sx={{ p: { xs: 1.5, md: 3 } }}>
        <Typography variant="h5" component="h1" fontWeight="bold" sx={{ mb: 2 }}>
          My Class: <Typography component="span" variant="h5" color="primary.main">{className || classId}</Typography>
        </Typography>
        {renderContent()}
        {!hasSubmittedToday && (
          <Button
            variant="contained"
            sx={{ mt: 3 }}
            onClick={() => navigate('/submit-attendance')}
          >
            Submit Today's Roll Call
          </Button>
        )}
      </Paper>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" component="div">
          Class Stats: <strong>{className || classId}</strong>
        </Typography>
        <IconButton onClick={onClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {renderContent()}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {!hasSubmittedToday && (
          <Button
            variant="contained"
            onClick={() => {
              onClose();
              navigate('/submit-attendance');
            }}
          >
            Submit Today's Roll Call
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}