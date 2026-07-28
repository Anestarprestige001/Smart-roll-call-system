import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Stack,
  Typography,
} from '@mui/material';
import { collection, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { getCurrentWeekKey, getTeacherDisplayName } from './teacherDutyHelpers';

function formatWeekLabel(weekOf) {
  if (!weekOf) return 'this week';
  const [year, month, day] = weekOf.split('-').map((value) => Number(value));
  const value = new Date(Date.UTC(year, month - 1, day));
  return `Week of ${value.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

export default function TeachersOnDutyManager() {
  const [teachers, setTeachers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const weekOf = getCurrentWeekKey();

  useEffect(() => {
    const teachersQuery = query(collection(db, 'users'), where('status', '==', 'active'), where('role', '==', 'CLASS TEACHER'));
    const unsubscribeTeachers = onSnapshot(teachersQuery, (snap) => {
      setTeachers(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    }, (err) => {
      console.error('Error loading approved teachers:', err);
      setError('Unable to load approved teachers right now.');
      setLoading(false);
    });

    const unsubscribeRoster = onSnapshot(doc(db, 'dutyRoster', weekOf), (snap) => {
      if (snap.exists()) {
        setSelectedUserIds(snap.data().onDutyUserIds || []);
      } else {
        setSelectedUserIds([]);
      }
      setLoading(false);
      setError('');
    }, (err) => {
      console.error('Error loading duty roster:', err);
      setError('Unable to load the duty roster right now.');
      setLoading(false);
    });

    return () => {
      unsubscribeTeachers();
      unsubscribeRoster();
    };
  }, [weekOf]);

  const handleToggle = (uid) => {
    setSelectedUserIds((prev) => (prev.includes(uid) ? prev.filter((value) => value !== uid) : [...prev, uid]));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'dutyRoster', weekOf), { weekOf, onDutyUserIds: selectedUserIds }, { merge: true });
      setIsExpanded(false);
      navigate('/');
    } catch (err) {
      console.error('Error saving duty roster:', err);
      setError('Unable to save the duty roster right now.');
    } finally {
      setSaving(false);
    }
  };

  const sortedTeachers = useMemo(() => [...teachers].sort((left, right) => getTeacherDisplayName(left).localeCompare(getTeacherDisplayName(right))), [teachers]);
  const selectedTeachers = sortedTeachers.filter((teacher) => selectedUserIds.includes(teacher.id));

  if (loading) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <CircularProgress size={20} />
            <Typography color="text.secondary">Loading teachers on duty...</Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        {!isExpanded ? (
          <Box onClick={() => setIsExpanded(true)} sx={{ cursor: 'pointer' }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Teachers on duty this week
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              {selectedTeachers.length > 0 ? selectedTeachers.map((teacher) => getTeacherDisplayName(teacher)).join(', ') : 'No teachers assigned yet'}
            </Typography>
            <Button variant="outlined" onClick={(event) => { event.stopPropagation(); setIsExpanded(true); }}>
              {selectedTeachers.length > 0 ? 'Edit' : 'Assign teachers'}
            </Button>
          </Box>
        ) : (
          <Box>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Teachers on Duty
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Assign the approved teachers who are on duty for {formatWeekLabel(weekOf)}.
            </Typography>

            {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

            {sortedTeachers.length === 0 ? (
              <Alert severity="info">No approved teachers are available yet.</Alert>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
                {sortedTeachers.map((teacher) => (
                  <FormControlLabel
                    key={teacher.id}
                    control={
                      <Checkbox
                        checked={selectedUserIds.includes(teacher.id)}
                        onChange={() => handleToggle(teacher.id)}
                      />
                    }
                    label={`${getTeacherDisplayName(teacher)} ${teacher.classId ? `• ${teacher.classId}` : ''}`.trim()}
                  />
                ))}
              </Box>
            )}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
              <Button variant="contained" onClick={handleSave} disabled={saving}>
                {saving ? <CircularProgress size={20} color="inherit" /> : 'Save duty roster'}
              </Button>
              <Button variant="outlined" onClick={() => setIsExpanded(false)} disabled={saving}>
                Cancel
              </Button>
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
