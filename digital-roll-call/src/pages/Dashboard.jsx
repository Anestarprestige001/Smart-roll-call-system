import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Grid, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const Dashboard = () => {
  const [logs, setLogs] = useState([]);
  const [totalPresent, setTotalPresent] = useState(0);
  const [totalAbsent, setTotalAbsent] = useState(0);
  
  const [openDialog, setOpenDialog] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [editPresent, setEditPresent] = useState('');
  const [editAbsent, setEditAbsent] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'attendance_logs'), orderBy('timestamp', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsData = [];
      let presentCount = 0;
      let absentCount = 0;
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        logsData.push({ id: doc.id, ...data });
        presentCount += (data.present || 0);
        absentCount += (data.absent || 0);
      });
      
      setLogs(logsData);
      setTotalPresent(presentCount);
      setTotalAbsent(absentCount);
    });

    return () => unsubscribe();
  }, []);

  const handleEditClick = (log) => {
    setEditingLog(log);
    setEditPresent(log.present);
    setEditAbsent(log.absent);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingLog(null);
  };

  const handleUpdate = async () => {
    if (editingLog) {
      try {
        const logRef = doc(db, 'attendance_logs', editingLog.id);
        await updateDoc(logRef, {
          present: Number(editPresent),
          absent: Number(editAbsent)
        });
        handleCloseDialog();
      } catch (error) {
        console.error("Error updating document: ", error);
      }
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Pending...';
    return timestamp.toDate().toLocaleString();
  };

  return (
    <Box mt={2}>
      <Typography variant="h4" color="primary" fontWeight="bold" gutterBottom>
        Campus Overview
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4, mt: 1 }}>
        <Grid item xs={12} sm={6}>
          <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'primary.main', color: 'white', borderRadius: 2 }}>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>Total Present</Typography>
            <Typography variant="h3" fontWeight="bold">{totalPresent}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'secondary.main', color: 'white', borderRadius: 2 }}>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>Total Absent</Typography>
            <Typography variant="h3" fontWeight="bold">{totalAbsent}</Typography>
          </Paper>
        </Grid>
      </Grid>

      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f5f5f5' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Class</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Submitted By</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">Present</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">Absent</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Time</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id} hover>
                <TableCell>{log.class}</TableCell>
                <TableCell>{log.submittedByName}</TableCell>
                <TableCell align="right">{log.present}</TableCell>
                <TableCell align="right">{log.absent}</TableCell>
                <TableCell>{formatTime(log.timestamp)}</TableCell>
                <TableCell align="center">
                  <Button variant="outlined" size="small" color="primary" onClick={() => handleEditClick(log)}>
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>No attendance logs found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Update {editingLog?.class}</DialogTitle>
        <DialogContent>
          <TextField margin="dense" label="Present" type="number" fullWidth value={editPresent} onChange={(e) => setEditPresent(e.target.value)} InputProps={{ inputProps: { min: 0 } }} sx={{ mb: 2, mt: 1 }} />
          <TextField margin="dense" label="Absent" type="number" fullWidth value={editAbsent} onChange={(e) => setEditAbsent(e.target.value)} InputProps={{ inputProps: { min: 0 } }} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDialog} color="inherit">Cancel</Button>
          <Button onClick={handleUpdate} variant="contained" color="primary">Update</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;
