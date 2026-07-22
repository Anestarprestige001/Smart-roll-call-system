import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
  getClassesCollectionRef,
  getRosterTotals,
  normalizeClassOptions,
  ROSTER_FIELD_DEFINITIONS,
} from '../constants/classes';

export default function ClassRosterManagement() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
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
          const rosterTotals = getRosterTotals(classItem);
          nextValues[classItem.id] = {
            ...(prev[classItem.id] || {}),
            totalGirlBoarders: prev[classItem.id]?.totalGirlBoarders ?? rosterTotals.totalGirlBoarders ?? 0,
            totalGirlDayScholars: prev[classItem.id]?.totalGirlDayScholars ?? rosterTotals.totalGirlDayScholars ?? 0,
            totalBoyBoarders: prev[classItem.id]?.totalBoyBoarders ?? rosterTotals.totalBoyBoarders ?? 0,
            totalBoyDayScholars: prev[classItem.id]?.totalBoyDayScholars ?? rosterTotals.totalBoyDayScholars ?? 0,
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
    if (role === 'ADMIN' || role === 'ICT COORDINATOR' || role === 'DIRECTOR') return true;
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
    const totalGirlBoarders = Number.parseInt(values.totalGirlBoarders ?? classItem.totalGirlBoarders ?? 0, 10) || 0;
    const totalGirlDayScholars = Number.parseInt(values.totalGirlDayScholars ?? classItem.totalGirlDayScholars ?? 0, 10) || 0;
    const totalBoyBoarders = Number.parseInt(values.totalBoyBoarders ?? classItem.totalBoyBoarders ?? 0, 10) || 0;
    const totalBoyDayScholars = Number.parseInt(values.totalBoyDayScholars ?? classItem.totalBoyDayScholars ?? 0, 10) || 0;

    const totalGirls = totalGirlBoarders + totalGirlDayScholars;
    const totalBoys = totalBoyBoarders + totalBoyDayScholars;
    const payload = {
      totalGirlBoarders,
      totalGirlDayScholars,
      totalBoyBoarders,
      totalBoyDayScholars,
      totalGirls,
      totalBoys,
      totalBoarders: totalGirlBoarders + totalBoyBoarders,
      totalDayScholars: totalGirlDayScholars + totalBoyDayScholars,
      totalStudents: totalGirls + totalBoys,
    };

    setSavingClassId(classItem.id);
    try {
      await setDoc(doc(db, 'classes', classItem.id), payload, { merge: true });
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
        Update each class roster total for girls and boys by boarding and day scholar status.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}

      {filteredClasses.length === 0 ? (
        <Alert severity="info">No classes found yet.</Alert>
      ) : (
        <Stack spacing={2}>
          {filteredClasses.map((classItem) => {
            const values = formValues[classItem.id] || {};
            const editable = canEditRoster(classItem.id);
            const rosterTotals = getRosterTotals({ ...classItem, ...values });
            return (
              <Card key={classItem.id} elevation={1}>
                <CardContent>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'flex-start' } }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" fontWeight="bold">{classItem.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Girls {rosterTotals.totalGirls} • Boys {rosterTotals.totalBoys} • Boarders {rosterTotals.totalBoarders} • Day scholars {rosterTotals.totalDayScholars}
                      </Typography>
                    </Box>

                    {editable ? (
                      <Box sx={{ flexGrow: 2, width: '100%' }}>
                        <Grid container spacing={1.5}>
                          {ROSTER_FIELD_DEFINITIONS.map((field) => (
                            <Grid item xs={12} sm={6} key={`${classItem.id}-${field.key}`}>
                              <TextField
                                fullWidth
                                label={field.label}
                                type="number"
                                size="small"
                                value={values[field.key] ?? ''}
                                onChange={handleFieldChange(classItem.id, field.key)}
                                inputProps={{ min: 0, step: 1 }}
                              />
                            </Grid>
                          ))}
                        </Grid>

                        <Button
                          variant="contained"
                          sx={{ mt: 2, width: { xs: '100%', sm: 'auto' } }}
                          onClick={() => handleSave(classItem)}
                          disabled={savingClassId === classItem.id}
                        >
                          {savingClassId === classItem.id ? 'Saving...' : 'Save Roster Totals'}
                        </Button>
                      </Box>
                    ) : (
                      <Alert severity="info" sx={{ width: '100%' }}>
                        You do not have permission to edit roster totals for this class.
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
