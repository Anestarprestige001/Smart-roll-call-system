import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, MenuItem,
  Select, InputLabel, FormControl, ListSubheader, Alert,
  Snackbar, CircularProgress, Divider, Stack
} from '@mui/material';
import {
  collection, query, where, getDocs, addDoc, serverTimestamp
} from 'firebase/firestore';
import { motion } from 'framer-motion';
import { db, auth } from '../firebase';

const CLASS_GROUPS = [
  {
    groupName: 'PP (Venus & Jupiter)',
    classes: [
      'PP (Venus)', 'PP (Jupiter)',
      'PP1 (Venus)', 'PP1 (Jupiter)',
      'PP2 (Venus)', 'PP2 (Jupiter)',
    ],
  },
  {
    groupName: 'Lower Primary (Venus & Jupiter)',
    classes: [
      'Grade 1 (Venus)', 'Grade 1 (Jupiter)',
      'Grade 2 (Venus)', 'Grade 2 (Jupiter)',
      'Grade 3 (Venus)', 'Grade 3 (Jupiter)',
      'Grade 4 (Venus)', 'Grade 4 (Jupiter)',
      'Grade 5 (Venus)', 'Grade 5 (Jupiter)',
      'Grade 6 (Venus)', 'Grade 6 (Jupiter)',
    ],
  },
  {
    groupName: 'Junior School (Nelion, Batian, Lenana)',
    classes: [
      'Grade 7 (Nelion)', 'Grade 7 (Batian)', 'Grade 7 (Lenana)',
      'Grade 8 (Nelion)', 'Grade 8 (Batian)', 'Grade 8 (Lenana)',
      'Grade 9 (Nelion)', 'Grade 9 (Batian)', 'Grade 9 (Lenana)',
    ],
  },
];

const FIELDS = [
  { key: 'girlsBoardersPresent',     label: 'Girls Boarders Present',      isAbsent: false },
  { key: 'girlsDayScholarsPresent',  label: 'Girls Day Scholars Present',   isAbsent: false },
  { key: 'boysBoardersPresent',      label: 'Boys Boarders Present',        isAbsent: false },
  { key: 'boysDayScholarsPresent',   label: 'Boys Day Scholars Present',    isAbsent: false },
  { key: 'girlsBoardersAbsent',      label: 'Girls Boarders Absent',        isAbsent: true  },
  { key: 'girlsDayScholarsAbsent',   label: 'Girls Day Scholars Absent',    isAbsent: true  },
  { key: 'boysBoardersAbsent',       label: 'Boys Boarders Absent',         isAbsent: true  },
  { key: 'boysDayScholarsAbsent',    label: 'Boys Day Scholars Absent',     isAbsent: true  },
];

const INITIAL_FORM = Object.fromEntries(FIELDS.map(f => [f.key, '']));

export default function SubmitAttendance() {
  const [activeTerm, setActiveTerm]     = useState(null);
  const [loading, setLoading]           = useState(true);
  const [selectedClass, setSelectedClass] = useState('');
  const [formData, setFormData]         = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar]         = useState({ open: false, message: '', severity: 'success' });
  const [errors, setErrors]             = useState({});

  useEffect(() => {
    const fetchActiveTerm = async () => {
      try {
        const q = query(collection(db, 'terms'), where('isActive', '==', true));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setActiveTerm({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
        }
      } catch (err) {
        console.error('Error fetching active term:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchActiveTerm();
  }, []);

  const handleChange = (key) => (e) => {
    const raw = e.target.value;
    setFormData(prev => ({ ...prev, [key]: raw }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: false }));
  };

  const num = (v) => {
    const n = parseInt(v, 10);
    return isNaN(n) ? 0 : Math.max(0, n);
  };

  const totalPresent =
    num(formData.girlsBoardersPresent) +
    num(formData.girlsDayScholarsPresent) +
    num(formData.boysBoardersPresent) +
    num(formData.boysDayScholarsPresent);

  const totalAbsent =
    num(formData.girlsBoardersAbsent) +
    num(formData.girlsDayScholarsAbsent) +
    num(formData.boysBoardersAbsent) +
    num(formData.boysDayScholarsAbsent);

  const totalStudents = totalPresent + totalAbsent;

  const getHouseAndLevel = (className) => {
    const match = className.match(/\(([^)]+)\)/);
    const house = match ? match[1] : 'Unknown';
    let level = 'PP';
    if (/Grade [1-6]/.test(className)) level = 'Lower Primary';
    if (/Grade [7-9]/.test(className)) level = 'Junior School';
    return { house, level };
  };

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
    if (!selectedClass) {
      setSnackbar({ open: true, message: 'Please select a class.', severity: 'warning' });
      return;
    }
    if (!validate()) {
      setSnackbar({ open: true, message: 'Please fill in all attendance fields.', severity: 'warning' });
      return;
    }

    setIsSubmitting(true);
    const { house, level } = getHouseAndLevel(selectedClass);
    const today = new Date().toISOString().split('T')[0];

    const payload = {
      classId: selectedClass,
      house,
      level,
      submittedBy: auth.currentUser?.displayName || 'Unknown',
      submittedByEmail: auth.currentUser?.email || 'Unknown',
      timestamp: serverTimestamp(),
      date: today,
      termId: activeTerm.id,
      girlsBoardersPresent:    num(formData.girlsBoardersPresent),
      girlsDayScholarsPresent: num(formData.girlsDayScholarsPresent),
      boysBoardersPresent:     num(formData.boysBoardersPresent),
      boysDayScholarsPresent:  num(formData.boysDayScholarsPresent),
      girlsBoardersAbsent:     num(formData.girlsBoardersAbsent),
      girlsDayScholarsAbsent:  num(formData.girlsDayScholarsAbsent),
      boysBoardersAbsent:      num(formData.boysBoardersAbsent),
      boysDayScholarsAbsent:   num(formData.boysDayScholarsAbsent),
      totalPresent,
      totalAbsent,
      totalStudents,
    };

    try {
      await addDoc(collection(db, 'attendance_logs'), payload);
      setSnackbar({
        open: true,
        message: `Roll call for ${selectedClass} submitted successfully!`,
        severity: 'success',
      });
      setFormData(INITIAL_FORM);
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

      {activeTerm ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          Active Term: <strong>{activeTerm.name}</strong> &nbsp;
          ({activeTerm.startDate} → {activeTerm.endDate})
        </Alert>
      ) : (
        <Alert severity="error" sx={{ mb: 3 }}>
          No active term set. Contact the administrator before submitting.
        </Alert>
      )}

      <Card elevation={4} sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: { xs: 1.5, md: 3 } }}>
          <Box component="form" onSubmit={handleSubmit} noValidate>

            {/* ── Class selector ── */}
            <FormControl fullWidth sx={{ mb: 4 }}>
              <InputLabel id="class-label">Select Class</InputLabel>
              <Select
                labelId="class-label"
                value={selectedClass}
                label="Select Class"
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                {CLASS_GROUPS.flatMap((group) => [
                  <ListSubheader
                    key={group.groupName}
                    sx={{ fontWeight: 'bold', color: 'primary.main', bgcolor: 'background.paper' }}
                  >
                    {group.groupName}
                  </ListSubheader>,
                  ...group.classes.map((cls) => (
                    <MenuItem key={cls} value={cls}>{cls}</MenuItem>
                  )),
                ])}
              </Select>
            </FormControl>

            {/* ── Attendance fields (only shown after class is chosen) ── */}
            {selectedClass && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                <Typography variant="h6" color="secondary.main" gutterBottom sx={{ mb: 2 }}>
                  Attendance Breakdown — {selectedClass}
                </Typography>

                {/* Present fields */}
                <Typography variant="overline" color="success.main" sx={{ display: 'block', mb: 1 }}>
                  Students Present
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: { xs: 1.5, md: 2 }, mb: 3 }}>
                  {FIELDS.filter(f => !f.isAbsent).map(({ key, label }) => (
                    <TextField
                      key={key}
                      fullWidth
                      label={label}
                      type="number"
                      value={formData[key]}
                      onChange={handleChange(key)}
                      error={!!errors[key]}
                      helperText={errors[key] ? 'Required' : ''}
                      color="success"
                      slotProps={{ input: { inputProps: { min: 0 } } }}
                    />
                  ))}
                </Box>

                {/* Absent fields */}
                <Typography variant="overline" color="error.main" sx={{ display: 'block', mb: 1 }}>
                  Students Absent
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: { xs: 1.5, md: 2 }, mb: 3 }}>
                  {FIELDS.filter(f => f.isAbsent).map(({ key, label }) => (
                    <TextField
                      key={key}
                      fullWidth
                      label={label}
                      type="number"
                      value={formData[key]}
                      onChange={handleChange(key)}
                      error={!!errors[key]}
                      helperText={errors[key] ? 'Required' : ''}
                      color="error"
                      slotProps={{ input: { inputProps: { min: 0 } } }}
                    />
                  ))}
                </Box>

                <Divider sx={{ my: 3 }} />

                {/* Live summary */}
                <Card
                  variant="outlined"
                  sx={{ mb: 3, borderRadius: 2, bgcolor: 'background.default' }}
                >
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Live Summary
                    </Typography>
                    <Stack
                      direction="row"
                      justifyContent="space-around"
                      alignItems="center"
                      sx={{ textAlign: 'center', py: 1 }}
                    >
                      <Box>
                        <Typography variant="overline" color="text.secondary">
                          Total Present
                        </Typography>
                        <Typography sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, fontWeight: 'bold', color: 'success.main' }}>
                          {totalPresent}
                        </Typography>
                      </Box>
                      <Divider orientation="vertical" flexItem />
                      <Box>
                        <Typography variant="overline" color="text.secondary">
                          Total Absent
                        </Typography>
                        <Typography sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, fontWeight: 'bold', color: 'error.main' }}>
                          {totalAbsent}
                        </Typography>
                      </Box>
                      <Divider orientation="vertical" flexItem />
                      <Box>
                        <Typography variant="overline" color="text.secondary">
                          Grand Total
                        </Typography>
                        <Typography sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, fontWeight: 'bold', color: 'primary.main' }}>
                          {totalStudents}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>

                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  size="large"
                  disabled={isSubmitting || !activeTerm}
                  sx={{ py: 1.5, borderRadius: 2, fontSize: '1rem' }}
                >
                  {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Submit Roll Call'}
                </Button>
              </motion.div>
            )}
          </Box>
        </CardContent>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}