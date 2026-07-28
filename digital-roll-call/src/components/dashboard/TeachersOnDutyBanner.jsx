import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Typography } from '@mui/material';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../firebase';

function getCurrentWeekKey(date = new Date()) {
  const current = new Date(date);
  const day = current.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  current.setDate(current.getDate() + diff);
  current.setHours(0, 0, 0, 0);
  return current.toISOString().split('T')[0];
}

export default function TeachersOnDutyBanner({ onOpenDetails }) {
  const [isOnDuty, setIsOnDuty] = useState(false);

  useEffect(() => {
    const weekOf = getCurrentWeekKey();
    const unsubscribe = onSnapshot(doc(db, 'dutyRoster', weekOf), (snap) => {
      const ids = snap.exists() ? (snap.data().onDutyUserIds || []) : [];
      setIsOnDuty(Boolean(auth.currentUser?.uid && ids.includes(auth.currentUser.uid)));
    });

    return () => unsubscribe();
  }, []);

  if (!isOnDuty) {
    return null;
  }

  return (
    <Card sx={{ mb: 3, borderLeft: '6px solid #2e7d32' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="h6" fontWeight="bold">You&apos;re on duty this week</Typography>
            <Typography color="text.secondary">Review the class attendance status for today from the roster view below.</Typography>
          </Box>
          <Button variant="contained" color="success" onClick={onOpenDetails}>
            View duty checklist
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
