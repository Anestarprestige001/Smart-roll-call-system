import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { getClassesCollectionRef, normalizeClassOptions } from '../constants/classes';

export default function ApprovedTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingTeacher, setPendingTeacher] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('status', '==', 'active'), where('role', '==', 'CLASS TEACHER'));
    const unsubscribeTeachers = onSnapshot(q, (snap) => {
      setTeachers(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
      setLoading(false);
    });

    const unsubscribeClasses = onSnapshot(getClassesCollectionRef(db), (snap) => {
      setClasses(normalizeClassOptions(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))));
    });

    return () => {
      unsubscribeTeachers();
      unsubscribeClasses();
    };
  }, []);

  const handleEditClass = (teacher) => {
    setPendingTeacher(teacher);
    setSelectedClassId(teacher.classId || '');
  };

  const handleSaveClass = async () => {
    if (!pendingTeacher) return;
    setBusyId(pendingTeacher.id);
    try {
      await updateDoc(doc(db, 'users', pendingTeacher.id), {
        classId: selectedClassId || null,
      });
      setPendingTeacher(null);
      setSelectedClassId('');
    } finally {
      setBusyId(null);
    }
  };

  const handleRemoveTeacher = async (teacher) => {
    const confirmed = window.confirm(`Remove ${teacher.name || teacher.email} from approved teachers? They will return to the pending-approval flow.`);
    if (!confirmed) {
      return;
    }

    setBusyId(teacher.id);
    try {
      await updateDoc(doc(db, 'users', teacher.id), {
        role: null,
        classId: null,
        status: 'pending',
      });
    } finally {
      setBusyId(null);
    }
  };

  const sortedTeachers = useMemo(() => [...teachers].sort((left, right) => (left.name || left.email || '').localeCompare(right.name || right.email || '')), [teachers]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 980, mx: 'auto', p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" color="primary.main" fontWeight="bold" gutterBottom>
        Approved Teachers
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Manage active teachers, reassign classes, or remove access so they return to the pending-approval flow.
      </Typography>

      {sortedTeachers.length === 0 ? (
        <Alert severity="info">No active teachers found.</Alert>
      ) : (
        <Stack spacing={2}>
          {sortedTeachers.map((teacher) => (
            <Card key={teacher.id}>
              <CardContent>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' } }}>
                  <Box>
                    <Typography variant="h6">{teacher.name || teacher.email}</Typography>
                    <Typography color="text.secondary">{teacher.email}</Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                      Assigned class: {teacher.classId || 'None'}
                    </Typography>
                  </Box>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <Button variant="outlined" onClick={() => handleEditClass(teacher)} disabled={busyId === teacher.id}>
                      Edit class
                    </Button>
                    <Button color="error" variant="contained" onClick={() => handleRemoveTeacher(teacher)} disabled={busyId === teacher.id}>
                      {busyId === teacher.id ? <CircularProgress size={20} /> : 'Remove'}
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog open={Boolean(pendingTeacher)} onClose={() => setPendingTeacher(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Reassign class</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Class</InputLabel>
            <Select value={selectedClassId} label="Class" onChange={(event) => setSelectedClassId(event.target.value)}>
              <MenuItem value="">No class</MenuItem>
              {classes.map((classItem) => (
                <MenuItem key={classItem.id} value={classItem.id}>{classItem.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingTeacher(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveClass} disabled={busyId === pendingTeacher?.id}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
