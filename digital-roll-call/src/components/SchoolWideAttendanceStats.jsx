import React from 'react';
import { Box, Card, CardContent, Typography, Stack, Avatar, useTheme } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import BarChartIcon from '@mui/icons-material/BarChart';
import { motion } from 'framer-motion';
import { useAttendanceStats } from '../hooks/useAttendanceStats';

export default function SchoolWideAttendanceStats({ activeTerm, totalClasses }) {
  const theme = useTheme();
  const {
    todayStats = { totalPresent: 0, totalAbsent: 0 },
    termStats = { totalStudents: 0 },
    todayLogs = []
  } = useAttendanceStats(null, activeTerm);

  const summaryStats = [
    {
      title: 'Today Present',
      value: todayStats.totalPresent,
      color: theme.palette.success.main,
      Icon: PeopleIcon,
      subtitle: 'On campus today',
    },
    {
      title: 'Today Absent',
      value: todayStats.totalAbsent,
      color: theme.palette.error.main,
      Icon: PersonOffIcon,
      subtitle: 'Away today',
    },
    {
      title: 'Classes Reported Today',
      value: `${todayLogs.length} / ${totalClasses}`,
      color: theme.palette.primary.main,
      Icon: AssignmentTurnedInIcon,
      subtitle: 'of expected classes',
    },
    {
      title: 'Term Total Records',
      value: termStats.totalStudents,
      color: theme.palette.secondary.main,
      Icon: BarChartIcon,
      subtitle: activeTerm?.name || 'No active term',
    },
  ];

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: { xs: 1.5, md: 2 }, mb: 4 }}>
      {summaryStats.map((stat, index) => (
        <motion.div key={stat.title} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: index * 0.1 }}>
          <Card elevation={2} sx={{ borderRadius: 3, p: { xs: 1.5, md: 2 }, borderLeft: `4px solid ${stat.color}`, height: '100%' }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 1.2 }}>{stat.title}</Typography>
                <Typography variant="h4" fontWeight="bold" color={stat.color} sx={{ lineHeight: 1.1, mt: 0.5 }}>{stat.value}</Typography>
                <Typography variant="caption" color="text.secondary">{stat.subtitle}</Typography>
              </Box>
              <Avatar sx={{ bgcolor: stat.color + '18', width: { xs: 40, md: 48 }, height: { xs: 40, md: 48 } }}>
                <stat.Icon sx={{ color: stat.color, fontSize: { xs: 20, md: 24 } }} />
              </Avatar>
            </Stack>
          </Card>
        </motion.div>
      ))}
    </Box>
  );
}