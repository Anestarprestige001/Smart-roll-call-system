import React, { useState } from 'react';
import { Card, CardContent, Typography, Button, Box, Alert, Avatar, Divider } from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const Login = () => {
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        await setDoc(userRef, {
          name: user.displayName || '',
          email: user.email || '',
          status: 'pending',
          role: null,
          classId: null,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      setError('Failed to sign in with Google: ' + err.message);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f7fa', p: 3 }}>
      <Card sx={{ maxWidth: 420, width: '100%', p: 4, borderRadius: 2, boxShadow: 3 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 64, height: 64, mb: 2 }}>
            <SchoolIcon fontSize="large" />
          </Avatar>

          <Typography variant="h5" component="h1" color="primary" fontWeight={700} gutterBottom sx={{ textAlign: 'center' }}>
            AGS - Prestige Campus
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ mb: 2, textAlign: 'center' }}>
            Digital Roll Call System
          </Typography>

          <Alert severity="info" sx={{ width: '100%', mb: 2 }}>
            Notifications are required for attendance and duty follow-up alerts.
          </Alert>
          <Divider sx={{ width: '100%', mb: 2 }} />

          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2, mt: 1 }}>
              {error}
            </Alert>
          )}

          <Button variant="contained" color="secondary" size="large" onClick={handleGoogleSignIn} sx={{ mt: 2, width: '100%', py: 1.5, textTransform: 'none', fontWeight: 600 }}>
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
