import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography,
  Chip
} from '@mui/material';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { getClassesCollectionRef, normalizeClassOptions } from '../../constants/classes';

const ROSTER_FIELDS = [
  { key: 'totalBoys', label: 'Total Boys' },
  { key: 'totalGirls', label: 'Total Girls' },
  { key: 'totalBoarders', label: 'Total Boarders' },
  { key: 'totalDayScholars', label: 'Total Day Scholars' },
];

export default function ClassRosterView() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [savingClassId, setSavingClassId] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const unsubscribeClasses = onSnapshot(
      getClassesCollectionRef(db),
      (snap) => {
        const nextClasses = normalizeClassOptions(
          snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        );
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
      },
      (err) => {
        console.error('Error loading classes for roster management:', err);
        setError('Unable to load class roster data.');
        setLoading(false);
      }
    );

    let unsubscribeUser = null;
    if (auth.currentUser) {
      unsubscribeUser = onSnapshot(doc(db, 'users', auth.currentUser.uid), (snap) => {
        setUserProfile(snap.data() || null);
      });
    }

    return () => {
      unsubscribeClasses();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  const role = userProfile?.role || null;
  const assignedClassId = userProfile?.assignedClassId || userProfile?.classId || null;

  // ICT Coordinator and Admin can manage all classes.
  // Class Teachers can only view/edit their specific assigned class.
  const filteredClasses = classes.filter((classItem) => {
    if (role === 'ADMIN' || role === 'ICT COORDINATOR' || role === 'DIRECTOR') {
      return true;
    }
    if (role === 'CLASS TEACHER' || role === 'TEACHER') {
      return classItem.id === assignedClassId;
    }
    return false;
  });

  const canEditRoster = (classId) => {
    if (role === 'ADMIN' || role === 'ICT COORDINATOR') return true;
    if ((role === 'CLASS TEACHER' || role === 'TEACHER') && classId === assignedClassId) return true;
    return false;
  };

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
    const totalBoys = Number.parseInt(values.totalBoys ?? classItem.totalBoys ?? 0, 10) || 0;
    const totalGirls = Number.parseInt(values.totalGirls ?? classItem.totalGirls ?? 0, 10) || 0;
    const totalBoarders = Number.parseInt(values.totalBoarders ?? classItem.totalBoarders ?? 0, 10) || 0;
    const totalDayScholars = Number.parseInt(values.totalDayScholars ?? classItem.totalDayScholars ?? 0, 10) || 0;

    const payload = {
      totalBoys,
      totalGirls,
      totalBoarders,
      totalDayScholars,
      totalStudents: totalBoys + totalGirls,
    };

    setSavingClassId(classItem.id);
    try {
      await updateDoc(doc(db, 'classes', classItem.id), payload);
      setSuccessMessage(`Saved roster totals for ${classItem.name}. Total students: ${payload.totalStudents}`);
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
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Class Roster Counts & Baseline Totals
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Update class counts at the beginning of the term or whenever a student transfers. These numbers act as the baseline for calculating attendance and absenteeism rates.
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {successMessage && <Alert severity="success">{successMessage}</Alert>}

      {filteredClasses.length === 0 ? (
        <Alert severity="info">
          {role === 'CLASS TEACHER' || role === 'TEACHER'
            ? 'No assigned class found for your profile. Please contact your ICT Coordinator.'
            : 'No classes found.'}
        </Alert>
      ) : (
        <Stack spacing={2}>
          {filteredClasses.map((classItem) => {
            const values = formValues[classItem.id] || {};
            const editable = canEditRoster(classItem.id);
            const totalBoys = Number.parseInt(values.totalBoys ?? 0, 10) || 0;
            const totalGirls = Number.parseInt(values.totalGirls ?? 0, 10) || 0;
            const totalStudents = totalBoys + totalGirls;

            return (
              <Card key={classItem.id} variant="outlined">
                <CardContent>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems="flex-start">
                    <Box sx={{ flexGrow: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                        <Typography variant="h6" fontWeight="bold">{classItem.name}</Typography>
                        <Chip label={`Total: ${totalStudents} Students`} color="primary" size="small" />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Boys: {classItem.totalBoys ?? 0} • Girls: {classItem.totalGirls ?? 0} • Boarders: {classItem.totalBoarders ?? 0} • Day Scholars: {classItem.totalDayScholars ?? 0}
                      </Typography>
                    </Box>

                    {editable ? (
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
                              sx={{ minWidth: 140, flex: 1 }}
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
                        Read-only access for this class.
                      </Alert>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}