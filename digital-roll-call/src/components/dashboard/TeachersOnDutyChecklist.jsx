import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { getClassesCollectionRef, normalizeClassOptions } from '../../constants/classes';
import { useTodaysAttendanceStatus } from '../../hooks/useTodaysAttendanceStatus';

export default function TeachersOnDutyChecklist({ open, onClose }) {
  const [classes, setClasses] = useState([]);
  const [classLoadError, setClassLoadError] = useState('');
  const { attendanceStatus, loading, error } = useTodaysAttendanceStatus(classes, open);

  useEffect(() => {
    if (!open) {
      return;
    }

    let isMounted = true;
    setClassLoadError('');

    const unsubscribeClasses = onSnapshot(getClassesCollectionRef(db), (snap) => {
      const nextClasses = normalizeClassOptions(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
      if (!isMounted) {
        return;
      }

      setClasses(nextClasses);
    }, (err) => {
      console.error('Error loading classes for duty checklist:', err);
      if (isMounted) {
        setClassLoadError('Unable to load classes.');
      }
    });

    return () => {
      isMounted = false;
      unsubscribeClasses();
    };
  }, [open]);

  const rows = useMemo(() => {
    return classes.map((classItem) => {
      const status = attendanceStatus.find((item) => item.classId === classItem.id);
      return {
        classId: classItem.id,
        className: classItem.name,
        exists: Boolean(status?.exists),
      };
    });
  }, [classes, attendanceStatus]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Duty Checklist</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Stack direction="row" spacing={2} alignItems="center" sx={{ py: 2 }}>
            <CircularProgress size={20} />
            <Typography color="text.secondary">Loading class attendance status...</Typography>
          </Stack>
        ) : (
          <Box>
            {(classLoadError || error) && <Alert severity="warning" sx={{ mb: 2 }}>{classLoadError || error}</Alert>}
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Every class is listed below with whether today&apos;s attendance submission already exists.
            </Typography>
            <List dense>
              {rows.map((row) => (
                <ListItem key={row.classId} divider>
                  <ListItemText
                    primary={row.className}
                    secondary={row.exists ? 'Attendance log exists for today' : 'No attendance log for today yet'}
                  />
                  <Typography color={row.exists ? 'success.main' : 'warning.main'} sx={{ fontWeight: 'bold', fontSize: '1.25rem' }}>
                    {row.exists ? '✓' : '✗'}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
