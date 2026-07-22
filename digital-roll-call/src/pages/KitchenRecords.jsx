import React, { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, collection, query, where, orderBy, limit, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Box, Typography, Button, CircularProgress, Alert } from '@mui/material';
import DynamicDataTable from '../components/kitchen/DynamicDataTable';

const defaultColumns = [
  { id: 'col1', label: 'Item' },
  { id: 'col2', label: 'Quantity' },
  { id: 'col3', label: 'Notes' },
];

const defaultRows = [
  { col1: '', col2: '', col3: '' }
];

export default function KitchenRecords() {
  const [user] = useAuthState(auth);
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const getTodayDocId = useCallback(() => {
    if (!user) return null;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `${user.uid}_${today}`;
  }, [user]);

  useEffect(() => {
    const initializeRecord = async () => {
      if (!user) return;

      setLoading(true);
      setError('');
      const docId = getTodayDocId();
      const docRef = doc(db, 'kitchenRecords', docId);

      try {
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setColumns(data.columns);
          setRows(data.rows);
          setComment(data.comment || '');
        } else {
          // Fetch the most recent record for this manager
          const q = query(
            collection(db, 'kitchenRecords'),
            where('managerUid', '==', user.uid),
            orderBy('date', 'desc'),
            limit(1)
          );
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const lastRecord = querySnapshot.docs[0].data();
            setColumns(lastRecord.columns);
            // Clear row values but keep structure
            const clearedRows = lastRecord.rows.map(row => {
              const newRow = {};
              for (const key in row) {
                newRow[key] = '';
              }
              return newRow;
            });
            setRows(clearedRows);
            setComment('');
          } else {
            // Brand new manager, set defaults
            setColumns(defaultColumns);
            setRows(defaultRows);
            setComment('');
          }
        }
      } catch (e) {
        console.error("Error initializing record: ", e);
        setError('Failed to load kitchen records. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    initializeRecord();
  }, [user, getTodayDocId]);

  const handleSave = async () => {
    if (!user) {
      setError('You must be logged in to save.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    const docId = getTodayDocId();
    const docRef = doc(db, 'kitchenRecords', docId);
    const todayDate = new Date().toISOString().split('T')[0];

    const recordData = {
      date: todayDate,
      managerUid: user.uid,
      columns,
      rows,
      comment,
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(docRef, recordData);
      setSuccess('Record saved successfully!');
    } catch (e) {
      console.error("Error saving record: ", e);
      setError('Failed to save record. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Today's Kitchen Inventory</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <DynamicDataTable
        columns={columns}
        rows={rows}
        comment={comment}
        onColumnsChange={setColumns}
        onRowsChange={setRows}
        onCommentChange={setComment}
      />

      <Button variant="contained" color="primary" onClick={handleSave} disabled={saving} sx={{ mt: 3 }}>
        {saving ? <CircularProgress size={24} /> : "Save Today's Record"}
      </Button>
    </Box>
  );
}