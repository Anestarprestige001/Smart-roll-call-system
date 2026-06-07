import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, FormControl, InputLabel, Select, MenuItem, TextField, Button, Alert } from '@mui/material';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

const SubmitAttendance = () => {
  const [className, setClassName] = useState('');
  const [present, setPresent] = useState('');
  const [absent, setAbsent] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const classes = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!className || present === '' || absent === '') {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      await addDoc(collection(db, 'attendance_logs'), {
        class: className,
        present: Number(present),
        absent: Number(absent),
        submittedByUid: user.uid,
        submittedByName: user.displayName || 'Teacher',
        timestamp: serverTimestamp(),
      });
      setSuccess('Attendance successfully submitted!');
      setClassName('');
      setPresent('');
      setAbsent('');
    } catch (err) {
      setError('Error submitting attendance: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <Box display="flex" justifyContent="center" mt={4}>
      <Card sx={{ maxWidth: 500, width: '100%', boxShadow: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h5" color="primary" fontWeight="bold" gutterBottom>
            Submit Roll Call
          </Typography>
          
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
          
          <form onSubmit={handleSubmit}>
            <FormControl fullWidth sx={{ mb: 3, mt: 1 }}>
              <InputLabel id="class-select-label">Class</InputLabel>
              <Select
                labelId="class-select-label"
                value={className}
                label="Class"
                onChange={(e) => setClassName(e.target.value)}
              >
                {classes.map((c) => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField fullWidth label="Students Present" type="number" value={present} onChange={(e) => setPresent(e.target.value)} sx={{ mb: 3 }} InputProps={{ inputProps: { min: 0 } }} required />
            <TextField fullWidth label="Students Absent" type="number" value={absent} onChange={(e) => setAbsent(e.target.value)} sx={{ mb: 4 }} InputProps={{ inputProps: { min: 0 } }} required />
            <Button type="submit" variant="contained" color="primary" fullWidth size="large" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SubmitAttendance;
