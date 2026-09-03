import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField,
  Select, InputLabel, FormControl, Alert, Chip,
  Snackbar, CircularProgress, Divider, Stack, MenuItem
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import {
  collection, query, where, getDocs, getDoc, setDoc, serverTimestamp, onSnapshot, doc
} from 'firebase/firestore';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { normalizeClassOptions, getClassesCollectionRef } from '../constants/classes';
import { getCurrentWeekKey } from '../components/dashboard/teacherDutyHelpers';
import { writeNotification } from '../utils/notifications';

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

const ROSTER_FIELDS = [
  { presentKey: 'girlsBoardersPresent', absentKey: 'girlsBoardersAbsent', rosterKey: 'totalGirlBoarders', label: 'Girls Boarders' },
  { presentKey: 'girlsDayScholarsPresent', absentKey: 'girlsDayScholarsAbsent', rosterKey: 'totalGirlDayScholars', label: 'Girls Day Scholars' },
  { presentKey: 'boysBoardersPresent', absentKey: 'boysBoardersAbsent', rosterKey: 'totalBoyBoarders', label: 'Boys Boarders' },
  { presentKey: 'boysDayScholarsPresent', absentKey: 'boysDayScholarsAbsent', rosterKey: 'totalBoyDayScholars', label: 'Boys Day Scholars' },
];

const EMPTY_ROSTER_TOTALS = {
  totalGirlBoarders: 0,
  totalGirlDayScholars: 0,
  totalBoyBoarders: 0,
  totalBoyDayScholars: 0,
};

const INITIAL_FORM = Object.fromEntries(FIELDS.map((f) => [f.key, '']));

function buildFormData(existingData = null, rosterTotals = EMPTY_ROSTER_TOTALS) {
  const nextFormData = { ...INITIAL_FORM };

  FIELDS.forEach((field) => {
    if (existingData && existingData[field.key] !== undefined && existingData[field.key] !== null && existingData[field.key] !== '') {
      nextFormData[field.key] = existingData[field.key];
      return;
    }

    const rosterField = ROSTER_FIELDS.find((item) => item.presentKey === field.key);
    if (!field.isAbsent && rosterField) {
      nextFormData[field.key] = String(rosterTotals[rosterField.rosterKey] ?? 0);
    }
  });

  return nextFormData;
}

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
  const [rosterTotals, setRosterTotals] = useState(EMPTY_ROSTER_TOTALS);
  const [allPresentChecked, setAllPresentChecked] = useState(null);
  const [previousSubmission, setPreviousSubmission] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const navigate = useNavigate();

  // Check if class has valid roster totals
  const hasValidRoster = Object.values(rosterTotals).some(val => val > 0);

  useEffect(() => {
    setLoading(true);
    setLoadError('');

    const promises = [];
    const unsubscribes = [];

    // 1. Fetch Active Term
    const termPromise = getDocs(query(collection(db, 'terms'), where('isActive', '==', true))).then(snapshot => {
      if (!snapshot.empty) {
        setActiveTerm({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

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
  }, [retryToken]);

  useEffect(() => {
    if (!selectedClassId) {
      return;
    }

    setLoading(true);
    setLoadError('');

    const today = new Date().toISOString().split('T')[0];
    const docId = `${selectedClassId}_${today}`;
    const docRef = doc(db, 'attendance_logs', docId);
    const classRef = doc(db, 'classes', selectedClassId);

    getDoc(classRef).then((classSnap) => {
      const classData = classSnap.exists() ? classSnap.data() : {};
      const nextRosterTotals = {
        totalGirlBoarders: Number(classData.totalGirlBoarders ?? 0),
        totalGirlDayScholars: Number(classData.totalGirlDayScholars ?? 0),
        totalBoyBoarders: Number(classData.totalBoyBoarders ?? 0),
        totalBoyDayScholars: Number(classData.totalBoyDayScholars ?? 0),
      };
      setRosterTotals(nextRosterTotals);

      return getDoc(docRef).then((docSnap) => {
        if (docSnap.exists()) {
          const existingData = docSnap.data();
          const canPerformEdit = ['ADMIN', 'DIRECTOR', 'ICT COORDINATOR'].includes(userRole) || existingData.submittedByUid === auth.currentUser?.uid;
          setCanEdit(canPerformEdit);
          setFormData(buildFormData(existingData, nextRosterTotals));
          setIsEditMode(true);
          setShowEditForm(false);
          setPreviousSubmission({
            submittedBy: existingData.submittedBy || 'Unknown',
            timestamp: existingData.timestamp,
          });
          const hasAnyAbsences = ROSTER_FIELDS.some((field) => Number(existingData[field.absentKey] ?? 0) > 0);
          setAllPresentChecked(!hasAnyAbsences);
        } else {
          setCanEdit(true);
          setFormData(buildFormData(null, nextRosterTotals));
          setIsEditMode(false);
          setPreviousSubmission(null);
          setAllPresentChecked(null);
        }
      });
    }).catch((error) => {
      console.error('Error loading roster for selected class:', error);
      setLoadError(prev => prev + ' Unable to load class roster totals.');
    }).finally(() => {
      setLoading(false);
    });
  }, [selectedClassId, userRole]);

  const isClassTeacher = userRole === 'CLASS TEACHER';

  useEffect(() => {
    if (isClassTeacher && selectedClassId && classes.length > 0) {
      const className = classes.find(c => c.id === selectedClassId)?.name || '';
      setTeacherClassName(className);
    }
  }, [isClassTeacher, selectedClassId, classes]);

  const handleChange = (key) => (e) => {
    const raw = e.target.value;
    
    if (hasValidRoster && allPresentChecked === false) {
      // In roster-driven mode with "Some Students Are Absent" selected
      const absentField = ROSTER_FIELDS.find(f => f.absentKey === key);
      if (absentField) {
        // This is an absent field - validate and update
        const absentValue = parseInt(raw, 10);
        const rosterTotal = rosterTotals[absentField.rosterKey] ?? 0;
        
        // Clear error for this field if it was previously set
        if (errors[key]) setErrors((prev) => ({ ...prev, [key]: false }));
        
        // Validate absent doesn't exceed roster
        if (!isNaN(absentValue) && absentValue > rosterTotal) {
          setErrors((prev) => ({ ...prev, [key]: true }));
        }
        
        setFormData((prev) => ({ ...prev, [key]: raw }));
        return;
      }
    }
    
    setFormData((prev) => ({ ...prev, [key]: raw }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: false }));
  };

  const handleAttendanceOptionSelect = (option) => {
    setAllPresentChecked(option);

    if (hasValidRoster) {
      const newFormData = { ...formData };
      ROSTER_FIELDS.forEach((field) => {
        newFormData[field.absentKey] = option ? '0' : (newFormData[field.absentKey] === '' || newFormData[field.absentKey] === undefined ? '0' : newFormData[field.absentKey]);
      });
      setFormData(newFormData);
      setErrors({});
    }
  };

  const num = (v) => {
    const n = parseInt(v, 10);
    return isNaN(n) ? 0 : Math.max(0, n);
  };

  // Compute present values if in roster-driven mode with "Some Students Are Absent" selected
  const computedFormData = { ...formData };
  if (hasValidRoster && allPresentChecked === false) {
    ROSTER_FIELDS.forEach(field => {
      const rosterTotal = rosterTotals[field.rosterKey] ?? 0;
      const absentEntered = num(formData[field.absentKey]);
      const computed = Math.max(0, rosterTotal - absentEntered);
      computedFormData[field.presentKey] = String(computed);
    });
  } else if (hasValidRoster && allPresentChecked === true) {
    // When "All Present" is selected, set all present to roster totals and absent to 0
    ROSTER_FIELDS.forEach(field => {
      const rosterTotal = rosterTotals[field.rosterKey] ?? 0;
      computedFormData[field.presentKey] = String(rosterTotal);
      computedFormData[field.absentKey] = '0';
    });
  }

  const totalPresent = num(computedFormData.girlsBoardersPresent) + num(computedFormData.girlsDayScholarsPresent) + num(computedFormData.boysBoardersPresent) + num(computedFormData.boysDayScholarsPresent);
  const totalAbsent = num(computedFormData.girlsBoardersAbsent) + num(computedFormData.girlsDayScholarsAbsent) + num(computedFormData.boysBoardersAbsent) + num(computedFormData.boysDayScholarsAbsent);
  const totalStudents = totalPresent + totalAbsent;

  const selectedClass = classes.find((item) => item.id === selectedClassId) || null;

  const formatSubmittedAt = (value) => {
    if (!value) {
      return 'Unknown time';
    }

    if (typeof value.toDate === 'function') {
      return value.toDate().toLocaleString();
    }

    const parsedDate = new Date(value);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.toLocaleString();
    }

    return 'Unknown time';
  };

  const validate = () => {
    const newErrors = {};

    if (hasValidRoster && allPresentChecked === null) {
      return false;
    }
    
    if (hasValidRoster && allPresentChecked === false) {
      // In roster-driven mode: only validate absent fields are filled and don't exceed roster
      ROSTER_FIELDS.forEach(field => {
        const absentValue = num(formData[field.absentKey]);
        const rosterTotal = rosterTotals[field.rosterKey] ?? 0;
        
        if (formData[field.absentKey] === '' || formData[field.absentKey] === null || formData[field.absentKey] === undefined) {
          newErrors[field.absentKey] = true;
        } else if (absentValue < 0 || absentValue > rosterTotal) {
          newErrors[field.absentKey] = true;
        }
      });
    } else if (hasValidRoster && allPresentChecked === true) {
      // All present is selected - no validation errors needed, auto-fill will handle it
      // Just clear any previous errors
    } else {
      // No valid roster or legacy mode: validate all 8 fields
      FIELDS.forEach(({ key }) => {
        const v = formData[key];
        if (v === '' || v === null || v === undefined) newErrors[key] = true;
        else if (parseInt(v, 10) < 0) newErrors[key] = true;
      });
    }
    
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
    if (hasValidRoster && allPresentChecked === null) {
      setSnackbar({
        open: true,
        message: "Please confirm attendance for today — tap 'All Present' if everyone is here, or 'Some Students Are Absent' if not, before submitting.",
        severity: 'warning',
      });
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
      girlsBoardersPresent: num(computedFormData.girlsBoardersPresent),
      girlsDayScholarsPresent: num(computedFormData.girlsDayScholarsPresent),
      boysBoardersPresent: num(computedFormData.boysBoardersPresent),
      boysDayScholarsPresent: num(computedFormData.boysDayScholarsPresent),
      girlsBoardersAbsent: num(computedFormData.girlsBoardersAbsent),
      girlsDayScholarsAbsent: num(computedFormData.girlsDayScholarsAbsent),
      boysBoardersAbsent: num(computedFormData.boysBoardersAbsent),
      boysDayScholarsAbsent: num(computedFormData.boysDayScholarsAbsent),
      totalPresent,
      totalAbsent,
      totalStudents,
    };

    try {
      const docId = `${selectedClassId}_${today}`;
      await setDoc(doc(db, 'attendance_logs', docId), payload, { merge: isEditMode });

      if (!isEditMode) {
        try {
          const weekOf = getCurrentWeekKey();
          const dutyRosterRef = doc(db, 'dutyRoster', weekOf);
          const dutyRosterSnap = await getDoc(dutyRosterRef);
          const onDutyUserIds = dutyRosterSnap.exists() ? (dutyRosterSnap.data().onDutyUserIds || []) : [];
          await writeNotification({
            notificationId: `submitted_${selectedClassId}_${today}`,
            type: 'submitted',
            targetRoles: ['ADMIN'],
            targetUserIds: onDutyUserIds,
            payload: {
              title: 'Attendance submitted',
              message: `${selectedClass?.name || selectedClassId} attendance was submitted for ${today}.`,
            },
          });
        } catch (notificationErr) {
          console.error('Attendance submitted successfully, but notification step failed:', notificationErr);
        }
      }

      setSnackbar({
        open: true,
        message: `Roll call for ${selectedClass?.name || selectedClassId} ${isEditMode ? 'updated' : 'submitted'} successfully!`,
        severity: 'success',
      });
      // Keep isSubmitting true until redirect to prevent duplicate submits
      setTimeout(() => {
        navigate('/');
      }, 1200);
    } catch (err) {
      console.error('Submit error:', err);
      const message = err?.message || err?.code || 'Failed to submit attendance. Try again.';
      setSnackbar({ open: true, message, severity: 'error' });
      // allow retry
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

                  {isEditMode && previousSubmission && (
                    <Alert
                      severity="info"
                      sx={{ mb: 3 }}
                      action={
                        canEdit && !showEditForm ? (
                          <Button color="inherit" size="small" onClick={() => setShowEditForm(true)}>
                            Edit
                          </Button>
                        ) : null
                      }
                    >
                      Attendance for {selectedClass.name} was already submitted today by {previousSubmission.submittedBy} at {formatSubmittedAt(previousSubmission.timestamp)}.
                    </Alert>
                  )}

                  {(!isEditMode || showEditForm) && (
                    <div>
                      {/* ROSTER-DRIVEN MODE: Only show for classes with valid roster totals */}
                      {hasValidRoster ? (
                        <div>
                          <Box sx={{ mb: 3 }}>
                            <Typography variant="body1" fontWeight={700} color="text.primary" sx={{ mb: 1.5 }}>
                              Is everyone in {selectedClass.name} here today?
                            </Typography>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                              <Button
                                variant={allPresentChecked === true ? 'contained' : 'outlined'}
                                color="primary"
                                onClick={() => handleAttendanceOptionSelect(true)}
                                disabled={isEditMode && !canEdit}
                                sx={{ flex: 1, py: 1.25, borderRadius: 2, fontWeight: 700 }}
                              >
                                All Present
                              </Button>
                              <Button
                                variant={allPresentChecked === false ? 'contained' : 'outlined'}
                                color="secondary"
                                onClick={() => handleAttendanceOptionSelect(false)}
                                disabled={isEditMode && !canEdit}
                                sx={{ flex: 1, py: 1.25, borderRadius: 2, fontWeight: 700 }}
                              >
                                Some Students Are Absent
                              </Button>
                            </Stack>
                          </Box>

                          {hasValidRoster && allPresentChecked === null ? null : null}

                          {hasValidRoster && allPresentChecked === false ? (
                            <div>
                              <Typography variant="overline" color="error.main" sx={{ display: 'block', mb: 2, fontWeight: 'bold' }}>
                                Tell us who is away today
                              </Typography>
                              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: { xs: 1.5, md: 2 }, mb: 3 }}>
                                {ROSTER_FIELDS.filter((field) => (rosterTotals[field.rosterKey] ?? 0) > 0).map((field) => {
                                  const rosterTotal = rosterTotals[field.rosterKey] ?? 0;
                                  const absentEntered = num(formData[field.absentKey]);
                                  const computedPresent = Math.max(0, rosterTotal - absentEntered);
                                  const exceedsRoster = absentEntered > rosterTotal && formData[field.absentKey] !== '';
                                  
                                  return (
                                    <Box key={field.absentKey}>
                                      <TextField
                                        fullWidth
                                        label={`${field.label} — how many are away today?`}
                                        type="number"
                                        value={formData[field.absentKey]}
                                        onChange={handleChange(field.absentKey)}
                                        error={!!errors[field.absentKey] || exceedsRoster}
                                        helperText={
                                          exceedsRoster
                                            ? `Cannot exceed roster total of ${rosterTotal}`
                                            : errors[field.absentKey]
                                            ? 'Required'
                                            : `Roster: ${rosterTotal} | Present: ${computedPresent}`
                                        }
                                        color="error"
                                        slotProps={{ input: { inputProps: { min: 0, max: rosterTotal } } }}
                                        disabled={isEditMode && !canEdit}
                                      />
                                    </Box>
                                  );
                                })}
                              </Box>
                            </div>
                          ) : hasValidRoster && allPresentChecked === true ? (
                            <div>
                              <Typography variant="overline" color="success.main" sx={{ display: 'block', mb: 2, fontWeight: 'bold' }}>
                                Confirmed present counts
                              </Typography>
                              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: { xs: 1.5, md: 2 }, mb: 3 }}>
                                {ROSTER_FIELDS.filter((field) => (rosterTotals[field.rosterKey] ?? 0) > 0).map((field) => {
                                  const rosterTotal = rosterTotals[field.rosterKey] ?? 0;
                                  return (
                                    <Box key={field.rosterKey} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.default' }}>
                                      <Typography variant="body1" color="text.primary" sx={{ fontWeight: 600 }}>
                                        {`${field.label}: ${rosterTotal} present`}
                                      </Typography>
                                    </Box>
                                  );
                                })}
                              </Box>
                            </div>
                          ) : !hasValidRoster ? (
                            <div>
                              {/* LEGACY MODE: Show all 8 fields for classes without valid roster */}
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
                            </div>
                          ) : null}

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
                        </div>
                      ) : null}
                    </div>
                  )}
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