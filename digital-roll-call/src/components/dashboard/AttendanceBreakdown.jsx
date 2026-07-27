import React from 'react';
import { Box, Grid, Typography } from '@mui/material';

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

export default function AttendanceBreakdown({ todayStats = {}, rosterTotals = {}, title = 'Attendance Breakdown' }) {
  const formatValue = (value, total) => {
    if (total > 0) {
      return `${value} / ${total}`;
    }
    return `${value} / 0`;
  };

  const rows = [
    { label: 'Girls Boarders Present Today', value: formatValue(todayStats.girlsBoardersPresent ?? 0, rosterTotals.totalGirlBoarders ?? 0) },
    { label: 'Girls Day Scholars Present Today', value: formatValue(todayStats.girlsDayScholarsPresent ?? 0, rosterTotals.totalGirlDayScholars ?? 0) },
    { label: 'Boys Boarders Present Today', value: formatValue(todayStats.boysBoardersPresent ?? 0, rosterTotals.totalBoyBoarders ?? 0) },
    { label: 'Boys Day Scholars Present Today', value: formatValue(todayStats.boysDayScholarsPresent ?? 0, rosterTotals.totalBoyDayScholars ?? 0) },
    { label: 'Girls Boarders Absent Today', value: formatValue(todayStats.girlsBoardersAbsent ?? 0, rosterTotals.totalGirlBoarders ?? 0) },
    { label: 'Girls Day Scholars Absent Today', value: formatValue(todayStats.girlsDayScholarsAbsent ?? 0, rosterTotals.totalGirlDayScholars ?? 0) },
    { label: 'Boys Boarders Absent Today', value: formatValue(todayStats.boysBoardersAbsent ?? 0, rosterTotals.totalBoyBoarders ?? 0) },
    { label: 'Boys Day Scholars Absent Today', value: formatValue(todayStats.boysDayScholarsAbsent ?? 0, rosterTotals.totalBoyDayScholars ?? 0) },
  ];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>{title}</Typography>
      <Grid container spacing={1} sx={{ mb: 2 }}>
        {rows.map((row) => (
          <BreakdownRow key={row.label} label={row.label} value={row.value} />
        ))}
      </Grid>
    </Box>
  );
}
