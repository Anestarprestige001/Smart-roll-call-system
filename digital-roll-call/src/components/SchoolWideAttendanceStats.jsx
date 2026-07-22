import React, { useEffect, useState } from 'react';
import { Box, Grid, Typography, useTheme } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { getClassesCollectionRef, getRosterTotals } from '../constants/classes';
import { useAttendanceStats } from '../hooks/useAttendanceStats';
import StatCard from '../components/StatCard';

export default function SchoolWideAttendanceStats({ activeTerm, totalClasses }) {
  const theme = useTheme();
  const {
    todayStats = { totalPresent: 0, totalAbsent: 0 },
    termStats = { totalStudents: 0, absentGirls: 0, absentBoys: 0, absentBoarders: 0, absentDayScholars: 0, attendanceRate: 0 },
    todayLogs = []
  } = useAttendanceStats(null, activeTerm);
  const [schoolRosterTotals, setSchoolRosterTotals] = useState(getRosterTotals({}));

  useEffect(() => {
    const unsubscribe = onSnapshot(getClassesCollectionRef(db), (snap) => {
      const totals = snap.docs.reduce((acc, docSnap) => {
        const data = docSnap.data() || {};
        const rosterTotals = getRosterTotals(data);
        acc.totalGirls += rosterTotals.totalGirls;
        acc.totalBoys += rosterTotals.totalBoys;
        acc.totalBoarders += rosterTotals.totalBoarders;
        acc.totalDayScholars += rosterTotals.totalDayScholars;
        return acc;
      }, getRosterTotals({}));
      setSchoolRosterTotals(totals);
    });

    return () => unsubscribe();
  }, []);

  const formatRatio = (absent, total, label) => {
    if (total > 0) {
      return `${absent} of ${total} ${label} absent`;
    }
    return `${absent} ${label} absent (roster total not set)`;
  };

  const todayBreakdown = [
    formatRatio(todayStats.absentGirls || 0, schoolRosterTotals.totalGirls, 'girls'),
    formatRatio(todayStats.absentBoys || 0, schoolRosterTotals.totalBoys, 'boys'),
    formatRatio(todayStats.absentBoarders || 0, schoolRosterTotals.totalBoarders, 'boarders'),
    formatRatio(todayStats.absentDayScholars || 0, schoolRosterTotals.totalDayScholars, 'day scholars'),
  ].join(' · ');

  const summaryStats = [
    {
      title: 'Today Present',
      value: todayStats.totalPresent.toString(),
      accentColor: theme.palette.success.main,
      Icon: PeopleIcon,
      subtitle: 'On campus today',
    },
    {
      title: 'Today Absent',
      value: todayStats.totalAbsent.toString(),
      accentColor: theme.palette.error.main,
      Icon: PersonOffIcon,
      subtitle: 'Away today',
    },
    {
      title: 'Classes Reported Today',
      value: `${todayLogs.length} / ${totalClasses}`,
      accentColor: theme.palette.info.main,
      Icon: AssignmentTurnedInIcon,
      subtitle: 'of expected classes',
    },
    {
      title: 'Term Attendance Rate',
      value: `${termStats.attendanceRate.toFixed(1)}%`,
      accentColor: theme.palette.secondary.main,
      Icon: TrendingUpIcon,
      subtitle: `Average Present Rate (${activeTerm?.name || '...'})`,
    },
  ];

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: { xs: 1.5, sm: 2 }, // Slightly tighter gap on mobile
        width: '100%',
        mb: 3
      }}
    >
      {summaryStats.map((stat, index) => (
        <Box 
          key={index} 
          sx={{ 
            // calc(50% - gap) forces 2 items per row on mobile
           width: {
                  xs: 'calc(50% - 6px)', // 2x2 grid on mobile
                  md: '100%',            // Let flex handle full width or wrapping smoothly on desktop
                },
                flex: {
                  xs: '1 1 calc(50% - 6px)',
                  md: '1 1 0px',         // Forces all 4 cards to share equal 25% space across 1 row on desktop
                },
            boxSizing: 'border-box',
          }}
        >
          <StatCard {...stat} />
        </Box>
      ))}
    </Box>
  );
}