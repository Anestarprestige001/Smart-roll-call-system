import React, { useEffect, useState } from 'react';
import { Box, useTheme } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { getClassesCollectionRef, getRosterTotals } from '../constants/classes';
import { useAttendanceStats } from '../hooks/useAttendanceStats';
import StatCard from '../components/StatCard';
import AttendanceBreakdown from './dashboard/AttendanceBreakdown';

export default function SchoolWideAttendanceStats({ activeTerm, totalClasses }) {
  const theme = useTheme();
  const {
    todayStats = {
      totalPresent: 0,
      totalAbsent: 0,
      girlsBoardersPresent: 0,
      girlsDayScholarsPresent: 0,
      boysBoardersPresent: 0,
      boysDayScholarsPresent: 0,
      girlsBoardersAbsent: 0,
      girlsDayScholarsAbsent: 0,
      boysBoardersAbsent: 0,
      boysDayScholarsAbsent: 0,
    },
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
    <Box sx={{ width: '100%', mb: 3 }}>
      <Box 
        sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: { xs: 1.5, sm: 2 },
          width: '100%',
          mb: 3
        }}
      >
        {summaryStats.map((stat, index) => (
          <Box 
            key={index} 
            sx={{ 
              width: {
                xs: 'calc(50% - 6px)',
                md: '100%',
              },
              flex: {
                xs: '1 1 calc(50% - 6px)',
                md: '1 1 0px',
              },
              boxSizing: 'border-box',
            }}
          >
            <StatCard {...stat} />
          </Box>
        ))}
      </Box>

      <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, p: { xs: 2, md: 3 }, boxShadow: 1 }}>
        <AttendanceBreakdown
          todayStats={todayStats}
          rosterTotals={schoolRosterTotals}
          title="Today's Attendance Breakdown"
        />
      </Box>
    </Box>
  );
}