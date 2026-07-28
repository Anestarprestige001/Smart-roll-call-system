import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { getCurrentWeekKey, getTeacherDisplayName } from './teacherDutyHelpers';

export default function TeachersOnDutyList({ onOpenChecklist }) {
  const [teachers, setTeachers] = useState([]);
  const weekOf = getCurrentWeekKey();

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'dutyRoster', weekOf), (snap) => {
      const ids = snap.exists() ? (snap.data().onDutyUserIds || []) : [];
      if (ids.length === 0) {
        setTeachers([]);
        return;
      }

      const teacherPromises = ids.map(async (uid) => {
        const userSnap = await getDoc(doc(db, 'users', uid));
        if (!userSnap.exists()) {
          return null;
        }
        return { id: userSnap.id, ...userSnap.data() };
      });

      Promise.all(teacherPromises).then((results) => {
        setTeachers(results.filter(Boolean));
      });
    });

    return () => unsubscribe();
  }, [weekOf]);

  const summary = useMemo(() => {
    if (teachers.length === 0) {
      return 'No teachers assigned yet';
    }
    return teachers.map((teacher) => getTeacherDisplayName(teacher)).join(', ');
  }, [teachers]);

  return (
    <Card sx={{ mb: 3, cursor: 'pointer' }} onClick={onOpenChecklist}>
      <CardContent>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          On duty this week
        </Typography>
        <Typography color="text.secondary">{summary}</Typography>
      </CardContent>
    </Card>
  );
}
