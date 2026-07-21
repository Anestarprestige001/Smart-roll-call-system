import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { getClassesCollectionRef, normalizeClassOptions } from '../constants/classes';

const ROSTER_FIELDS = [
  { key: 'totalBoys', label: 'Total Boys' },
  { key: 'totalGirls', label: 'Total Girls' },
  { key: 'totalBoarders', label: 'Total Boarders' },
  { key: 'totalDayScholars', label: 'Total Day Scholars' },
];

export default function ClassRosterManagement() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [savingClassId, setSavingClassId] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const unsubscribeClasses = onSnapshot(getClassesCollectionRef(db), (snap) => {
      const nextClasses = normalizeClassOptions(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
      setClasses(nextClasses);
      setFormValues((prev) => {
        const nextValues = {};
        nextClasses.forEach((classItem) => {
          nextValues[classItem.id] = {
            ...(prev[classItem.id] || {}),
            totalBoys: prev[classItem.id]?.totalBoys ?? classItem.totalBoys ?? 0,
            totalGirls: prev[classItem.id]?.totalGirls ?? classItem.totalGirls ?? 0,
            totalBoarders: prev[classItem.id]?.totalBoarders ?? classItem.totalBoarders ?? 0,
            totalDayScholars: prev[classItem.id]?.totalDayScholars ?? classItem.totalDayScholars ?? 0,
          };
        });
        return nextValues;
      });
      setLoading(false);
      setError('');
    }, (err) => {
      console.error('Error loading classes for roster management:', err);
      setError('Unable to load class roster data.');
      setLoading(false);
    });

    let unsubscribeUser = null;
    if (auth.currentUser) {
      unsubscribeUser = onSnapshot(doc(db, 'users', auth.currentUser.uid), (snap) => {
        setRole(snap.data()?.role || null);
      });
    }

    return () => {
      unsubscribeClasses();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  const canEditRoster = role === 'ADMIN' || role === 'ICT COORDINATOR';

  const handleFieldChange = (classId, key) => (event) => {
    const rawValue = event.target.value;
    setFormValues((prev) => ({
      ...prev,
      [classId]: {
        ...(prev[classId] || {}),
        [key]: rawValue,
      },
    }));
  };

  const handleSave = async (classItem) => {
    const values = formValues[classItem.id] || {};
    const payload = {
      totalBoys: Number.parseInt(values.totalBoys ?? classItem.totalBoys ?? 0, 10) || 0,
      totalGirls: Number.parseInt(values.totalGirls ?? classItem.totalGirls ?? 0, 10) || 0,
      totalBoarders: Number.parseInt(values.totalBoarders ?? classItem.totalBoarders ?? 0, 10) || 0,
      totalDayScholars: Number.parseInt(values.totalDayScholars ?? classItem.totalDayScholars ?? 0, 10) || 0,
    };

    setSavingClassId(classItem.id);
    try {
      await updateDoc(doc(db, 'classes', classItem.id), payload);
      setSuccessMessage(`Saved roster totals for ${classItem.name}.`);
      setError('');
    } catch (err) {
      console.error('Error saving roster totals:', err);
      setError('Could not save roster totals.');
    } finally {
      setSavingClassId(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" color="primary.main" fontWeight="bold" gutterBottom>
        Class Roster Management
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Update each class roster total for boys, girls, boarders, and day scholars.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}

      {classes.length === 0 ? (
        <Alert severity="info">No classes found yet.</Alert>
      ) : (
        <Stack spacing={2}>
          {classes.map((classItem) => {
            const values = formValues[classItem.id] || {};
            return (
              <Card key={classItem.id} elevation={1}>
                <CardContent>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'flex-start' } }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" fontWeight="bold">{classItem.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Current totals: Boys {classItem.totalBoys ?? 0} • Girls {classItem.totalGirls ?? 0} • Boarders {classItem.totalBoarders ?? 0} • Day scholars {classItem.totalDayScholars ?? 0}
                      </Typography>
                    </Box>

                    {canEditRoster ? (
                      <Box sx={{ flexGrow: 2, width: '100%' }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ flexWrap: 'wrap' }}>
                          {ROSTER_FIELDS.map((field) => (
                            <TextField
                              key={`${classItem.id}-${field.key}`}
                              label={field.label}
                              type="number"
                              size="small"
                              value={values[field.key] ?? ''}
                              onChange={handleFieldChange(classItem.id, field.key)}
                              inputProps={{ min: 0, step: 1 }}
                              sx={{ minWidth: 180 }}
                            />
                          ))}
                        </Stack>

                        <Button
                          variant="contained"
                          sx={{ mt: 2 }}
                          onClick={() => handleSave(classItem)}
                          disabled={savingClassId === classItem.id}
                        >
                          {savingClassId === classItem.id ? 'Saving...' : 'Save Roster Totals'}
                        </Button>
                      </Box>
                    ) : (
                      <Alert severity="info" sx={{ width: '100%' }}>
                        You do not have permission to edit roster totals.
                      </Alert>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
