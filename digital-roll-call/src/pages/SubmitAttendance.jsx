import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField,
  Select, InputLabel, FormControl, Alert, Chip,
  Snackbar, CircularProgress, Divider, Stack, MenuItem
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import {
  collection, query, where, getDocs, getDoc, setDoc, serverTimestamp, onSnapshot, doc,
  Timestamp
} from 'firebase/firestore';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { normalizeClassOptions, getClassesCollectionRef } from '../constants/classes';

const FIELDS = [
  { key: 'girlsBoardersPresent', label: 'Girls Boarders Present', isAbsent: false },
  { key: 'girlsDayScholarsPresent', label: 'Girls Day Scholars Present', isAbsent: false },
  { key: 'boysBoardersPresent', label: 'Boys Boarders Present', isAbsent: false },
  { key: 'boysDayScholarsPresent', label: 'Boys Day Scholars Present', isAbsent: false },
  { key: 'girlsBoardersAbsent', label: 'Girls Boarders Absent', isAbsent: true },
  { key: 'girlsDayScholarsAbsent', label: 'Girls Day Scholars Absent', isAbsent: true },
  { key: 'boysBoardersAbsent', label: 'Boys Boarders Absent', isAbsent: true },
  { key: 'boysDayScholarsAbsent', label: 'Boys Day Scholars Absent', isAbsent: true },
];

const INITIAL_FORM = Object.fromEntries(FIELDS.map((f) => [f.key, '']));

export default function SubmitAttendance() {
  const [activeTerm, setActiveTerm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [teacherClassName, setTeacherClassName] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [isEditMode, setIsEditMode] = useState(false);
  const [canEdit, setCanEdit] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [errors, setErrors] = useState({});
  const [holidayEvent, setHolidayEvent] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [retryToken, setRetryToken] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (selectedClassId) {
      const today = new Date().toISOString().split('T')[0];
      const docId = `${selectedClassId}_${today}`;
      const docRef = doc(db, 'attendance_logs', docId);
      getDoc(docRef).then(docSnap => {
        if (docSnap.exists()) {
          const existingData = docSnap.data();
          const newFormData = {};
          const canPerformEdit = ['ADMIN', 'DIRECTOR', 'ICT COORDINATOR'].includes(userRole) || existingData.submittedByUid === auth.currentUser?.uid;
          setCanEdit(canPerformEdit);

          FIELDS.forEach(field => {
            newFormData[field.key] = existingData[field.key] || '';
          });
          setFormData(newFormData);
          setIsEditMode(true);
        } else {
          setCanEdit(true);
          setFormData(INITIAL_FORM);
          setIsEditMode(false);
        }
      }).catch((err) => {
        console.error('Error checking existing roll call:', err);
        setCanEdit(true);
        setFormData(INITIAL_FORM);
        setIsEditMode(false);
      });
    }
    setLoading(true);
    setLoadError('');


    const promises = [];
    const unsubscribes = [];

    // 1. Fetch Active Term
    const termPromise = getDocs(query(collection(db, 'terms'), where('isActive', '==', true))).then(snapshot => {
      if (!snapshot.empty) {
        setActiveTerm({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });

        // After getting active term, check for holidays
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayString = today.toISOString().split('T')[0];

        const eventsRef = collection(db, 'terms', snapshot.docs[0].id, 'events');
        const holidayQuery = query(eventsRef, where('type', 'in', ['Holiday', 'Midterm Break', 'Public Holiday']));
        
        return getDocs(holidayQuery).then(eventsSnapshot => {
          for (const eventDoc of eventsSnapshot.docs) {
            const event = eventDoc.data();
            const startDate = new Date(event.startDate + 'T00:00:00');
            const endDate = new Date(event.endDate + 'T23:59:59');

            if (today >= startDate && today <= endDate) {
              setHolidayEvent(event);
              break;
            }
          }
        });

      }
    }).catch(err => {
      console.error('Error fetching active term:', err);
      setLoadError(prev => prev + ' Failed to fetch active term.');
    });
    promises.push(termPromise);

    // 2. Subscribe to Classes
    const classesPromise = new Promise((resolve, reject) => {
      const unsubscribe = onSnapshot(getClassesCollectionRef(db), (snap) => {
        setClasses(normalizeClassOptions(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
        resolve();
      }, (error) => {
        console.error('Permission denied loading classes:', error);
        setLoadError(prev => prev + ' Unable to load class data.');
        reject(error);
      });
      unsubscribes.push(unsubscribe);
    });
    promises.push(classesPromise);

    // 3. Subscribe to User Profile
    if (auth.currentUser) {
      const userPromise = new Promise((resolve, reject) => {
        const unsubscribe = onSnapshot(doc(db, 'users', auth.currentUser.uid), (snap) => {
          const data = snap.data() || {};
          setUserRole(data.role || null);
          if (data.role === 'CLASS TEACHER' && data.classId) {
            setSelectedClassId(data.classId);
          }
          resolve();
        }, (error) => {
          console.error('Error loading teacher profile:', error);
          setLoadError(prev => prev + ' Unable to load your profile.');
          reject(error);
        });
        unsubscribes.push(unsubscribe);
      });
      promises.push(userPromise);
    }

    Promise.allSettled(promises).finally(() => {
      setLoading(false);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [retryToken, selectedClassId, userRole]);

  const isClassTeacher = userRole === 'CLASS TEACHER';

  useEffect(() => {
    if (isClassTeacher && selectedClassId && classes.length > 0) {
      const className = classes.find(c => c.id === selectedClassId)?.name || '';
      setTeacherClassName(className);
    }
  }, [isClassTeacher, selectedClassId, classes]);

  const handleChange = (key) => (e) => {
    const raw = e.target.value;
    setFormData((prev) => ({ ...prev, [key]: raw }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: false }));
  };

  const num = (v) => {
    const n = parseInt(v, 10);
    return isNaN(n) ? 0 : Math.max(0, n);
  };

  const totalPresent = num(formData.girlsBoardersPresent) + num(formData.girlsDayScholarsPresent) + num(formData.boysBoardersPresent) + num(formData.boysDayScholarsPresent);
  const totalAbsent = num(formData.girlsBoardersAbsent) + num(formData.girlsDayScholarsAbsent) + num(formData.boysBoardersAbsent) + num(formData.boysDayScholarsAbsent);
  const totalStudents = totalPresent + totalAbsent;

  const selectedClass = classes.find((item) => item.id === selectedClassId) || null;

  const validate = () => {
    const newErrors = {};
    FIELDS.forEach(({ key }) => {
      const v = formData[key];
      if (v === '' || v === null || v === undefined) newErrors[key] = true;
      else if (parseInt(v, 10) < 0) newErrors[key] = true;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeTerm) {
      setSnackbar({ open: true, message: 'Cannot submit without an active term.', severity: 'error' });
      return;
    }
    if (!selectedClassId) {
      setSnackbar({ open: true, message: 'Please select a class.', severity: 'warning' });
      return;
    }
    if (!validate()) {
      setSnackbar({ open: true, message: 'Please fill in all attendance fields.', severity: 'warning' });
      return;
    }

    setIsSubmitting(true);
    const today = new Date().toISOString().split('T')[0];
    const payload = {
      classId: selectedClass?.id || selectedClassId,
      className: selectedClass?.name || selectedClassId,
      house: selectedClass?.house || 'Unknown',
      level: selectedClass?.level || 'Unknown',
      submittedBy: auth.currentUser?.displayName ?? 'Unknown',
      submittedByEmail: auth.currentUser?.email ?? 'Unknown',
      submittedByUid: auth.currentUser?.uid ?? null,
      timestamp: serverTimestamp(),
      lastEditedBy: null,
      lastEditedAt: null,
      date: today,
      termId: activeTerm.id,
      girlsBoardersPresent: num(formData.girlsBoardersPresent),
      girlsDayScholarsPresent: num(formData.girlsDayScholarsPresent),
      boysBoardersPresent: num(formData.boysBoardersPresent),
      boysDayScholarsPresent: num(formData.boysDayScholarsPresent),
      girlsBoardersAbsent: num(formData.girlsBoardersAbsent),
      girlsDayScholarsAbsent: num(formData.girlsDayScholarsAbsent),
      boysBoardersAbsent: num(formData.boysBoardersAbsent),
      boysDayScholarsAbsent: num(formData.boysDayScholarsAbsent),
      totalPresent,
      totalAbsent,
      totalStudents,
    };

    try {
      const docId = `${selectedClassId}_${today}`;
      await setDoc(doc(db, 'attendance_logs', docId), payload, { merge: isEditMode });
      setSnackbar({ open: true, message: `Roll call for ${selectedClass?.name || selectedClassId} ${isEditMode ? 'updated' : 'submitted'} successfully!`, severity: 'success' });
      setTimeout(() => {
        navigate('/');
      }, 1200);
    } catch (err) {
      console.error('Submit error:', err);
      setSnackbar({ open: true, message: 'Failed to submit attendance. Try again.', severity: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 860, mx: 'auto', p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" color="primary.main" fontWeight="bold" gutterBottom>
        Submit Attendance
      </Typography>

      {loadError && (
        <Alert severity="warning" sx={{ mb: 3 }} action={
          <Button color="inherit" size="small" onClick={() => setRetryToken((value) => value + 1)}>
            Retry
          </Button>
        }>
          {loadError}
        </Alert>
      )}

      {activeTerm ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          Active Term: <strong>{activeTerm.name}</strong> &nbsp; ({activeTerm.startDate} → {activeTerm.endDate})
        </Alert>
      ) : (
        <Alert severity="error" sx={{ mb: 3 }}>
          No active term set. Contact the administrator before submitting.
        </Alert>
      )}

      {holidayEvent && (
        <Card sx={{ p: 2, mb: 3, borderLeft: '6px solid #e67c73', borderRadius: 2, boxShadow: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <EventIcon sx={{ fontSize: 36, color: 'primary.main' }} />
            <Box>
              <Chip label={holidayEvent.type} size="small" color="info" sx={{ mb: 0.5, fontWeight: 'bold' }} />
              <Typography variant="h6" fontWeight="bold">
                {holidayEvent.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {new Date(holidayEvent.startDate + 'T00:00:00').toLocaleDateString()} – {new Date(holidayEvent.endDate + 'T00:00:00').toLocaleDateString()}
              </Typography>
            </Box>
          </Box>
          <Typography variant="body1" color="text.primary" sx={{ mt: 2 }}>
            Today is marked as {holidayEvent.name}. No roll call needed today. Enjoy the time off!
          </Typography>
        </Card>
      )}

      {!holidayEvent && (
      <Card elevation={4} sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: { xs: 1.5, md: 3 } }}>
          <Box component="form" onSubmit={handleSubmit} noValidate>
            {isClassTeacher ? (
              <Box sx={{ mb: 4, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="h6">Class</Typography>
                <Typography color="text.secondary">{teacherClassName || (selectedClassId ? 'Loading class name...' : 'No class assigned')}</Typography>
              </Box>
            ) : (
              <FormControl fullWidth sx={{ mb: 4 }}>
                <InputLabel id="class-label">Select Class</InputLabel>
                <Select labelId="class-label" value={selectedClassId} label="Select Class" onChange={(event) => setSelectedClassId(event.target.value)}>
                  {classes.map((classItem) => (
                    <MenuItem key={classItem.id} value={classItem.id}>{classItem.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {selectedClass && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                <Typography variant="h6" color="secondary.main" gutterBottom sx={{ mb: 2 }}>
                  Attendance Breakdown — {selectedClass.name}
                </Typography>

                <Typography variant="overline" color="success.main" sx={{ display: 'block', mb: 1 }}>
                  Students Present
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: { xs: 1.5, md: 2 }, mb: 3 }}>
                  {FIELDS.filter((f) => !f.isAbsent).map(({ key, label }) => (
                    <TextField key={key} fullWidth label={label} type="number" value={formData[key]} onChange={handleChange(key)} error={!!errors[key]} helperText={errors[key] ? 'Required' : ''} color="success" slotProps={{ input: { inputProps: { min: 0 } } }} disabled={isEditMode && !canEdit} />
                  ))}
                </Box>

                <Typography variant="overline" color="error.main" sx={{ display: 'block', mb: 1 }}>
                  Students Absent
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: { xs: 1.5, md: 2 }, mb: 3 }}>
                  {FIELDS.filter((f) => f.isAbsent).map(({ key, label }) => (
                    <TextField key={key} fullWidth label={label} type="number" value={formData[key]} onChange={handleChange(key)} error={!!errors[key]} helperText={errors[key] ? 'Required' : ''} color="error" slotProps={{ input: { inputProps: { min: 0 } } }} disabled={isEditMode && !canEdit} />
                  ))}
                </Box>

                {isEditMode && !canEdit && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    This roll call was submitted by another user. Only administrators can edit it.
                  </Alert>
                )}

                <Divider sx={{ my: 3 }} />

                <Card variant="outlined" sx={{ mb: 3, borderRadius: 2, bgcolor: 'background.default' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Live Summary
                    </Typography>
                    <Stack direction="row" sx={{ justifyContent: 'space-around', alignItems: 'center', textAlign: 'center', py: 1 }}>
                      <Box>
                        <Typography variant="overline" color="text.secondary">Total Present</Typography>
                        <Typography sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, fontWeight: 'bold', color: 'success.main' }}>{totalPresent}</Typography>
                      </Box>
                      <Divider orientation="vertical" flexItem />
                      <Box>
                        <Typography variant="overline" color="text.secondary">Total Absent</Typography>
                        <Typography sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, fontWeight: 'bold', color: 'error.main' }}>{totalAbsent}</Typography>
                      </Box>
                      <Divider orientation="vertical" flexItem />
                      <Box>
                        <Typography variant="overline" color="text.secondary">Grand Total</Typography>
                        <Typography sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, fontWeight: 'bold', color: 'primary.main' }}>{totalStudents}</Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>

                <Button type="submit" variant="contained" color="primary" fullWidth size="large" disabled={isSubmitting || !activeTerm || (isEditMode && !canEdit)} sx={{ py: 1.5, borderRadius: 2, fontSize: '1rem' }}>
                  {isSubmitting ? <CircularProgress size={24} color="inherit" /> : isEditMode ? 'Update Roll Call' : 'Submit Roll Call'}
                </Button>
              </motion.div>
            )}
          </Box>
        </CardContent>
      </Card>
      )}

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))} variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}