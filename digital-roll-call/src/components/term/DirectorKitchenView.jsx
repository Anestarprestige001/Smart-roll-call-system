import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { Box, Typography, CircularProgress, Paper } from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import DynamicDataTable from '../kitchen/DynamicDataTable';

export default function DirectorKitchenView() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      setError('');
      setRecord(null);

      const dateString = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD

      try {
        const q = query(collection(db, 'kitchenRecords'), where('date', '==', dateString));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          // In a real scenario with multiple managers, you might need to select one.
          // For now, we'll just take the first one found.
          const docData = querySnapshot.docs[0].data();
          setRecord(docData);
        } else {
          setRecord(null); // Explicitly set to null if no record found
        }
      } catch (e) {
        console.error("Error fetching kitchen records: ", e);
        setError('Failed to fetch kitchen records.');
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [selectedDate]);

  return (
    <Paper sx={{ p: 3, mt: 2 }}>
      <Typography variant="h5" gutterBottom>View Kitchen Records</Typography>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <DatePicker
          label="Select Date"
          value={selectedDate}
          onChange={(newValue) => setSelectedDate(newValue)}
          renderInput={(params) => <TextField {...params} />}
        />
      </LocalizationProvider>

      <Box sx={{ mt: 3 }}>
        {loading && <CircularProgress />}
        {error && <Typography color="error">{error}</Typography>}
        {!loading && !error && (
          record ? (
            <DynamicDataTable
              columns={record.columns}
              rows={record.rows}
              comment={record.comment}
              readOnly={true}
            />
          ) : (
            <Typography>
              No kitchen record was logged for the selected date.
            </Typography>
          )
        )}
      </Box>
    </Paper>
  );
}