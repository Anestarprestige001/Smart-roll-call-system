import React, { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button, Stack, Alert, CircularProgress
} from '@mui/material';
import { updateProfile } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function Profile() {
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('');
  const [classId, setClassId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    setDisplayName(currentUser.displayName || '');

    const unsubscribeUser = onSnapshot(doc(db, 'users', currentUser.uid), (snap) => {
      const data = snap.data() || {};
      setRole(data.role || '');
      setClassId(data.classId || '');
      setLoading(false);
    });

    return () => {
      unsubscribeUser();
    };
  }, []);

  const handleSave = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    setSaving(true);
    setMessage('');
    try {
      await updateProfile(currentUser, { displayName });
      setMessage('Profile updated.');
    } catch (error) {
      setMessage(error.message || 'Unable to update profile.');
    } finally {
      setSaving(false);
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
    <Box sx={{ maxWidth: 680, mx: 'auto', p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" color="primary.main" fontWeight="bold" gutterBottom>
        Profile
      </Typography>
      <Card>
        <CardContent>
          <Stack spacing={2.5}>
            {message && <Alert severity="success">{message}</Alert>}
            <TextField
              label="Display name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              fullWidth
            />
            <TextField
              label="Assigned role"
              value={role || 'Pending'}
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Assigned class"
              value={classId || 'None'}
              fullWidth
              InputProps={{ readOnly: true }}
            />
            <Button variant="contained" onClick={handleSave} disabled={saving}>
              {saving ? <CircularProgress size={22} /> : 'Save profile'}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
