import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, CircularProgress, Alert, Stack } from '@mui/material';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../firebase';
import TermProgressBar from '../TermProgressBar';
import SchoolCalendar from './SchoolCalendar';

export default function ReadOnlyTermView() {
  const [activeTerm, setActiveTerm] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const qTerms = query(collection(db, 'terms'), where('isActive', '==', true));
    const unsubTerms = onSnapshot(qTerms, (snap) => {
      if (!snap.empty) {
        const term = { id: snap.docs[0].id, ...snap.docs[0].data() };
        setActiveTerm(term);
      } else {
        setActiveTerm(null);
        setLoading(false);
      }
    }, (err) => {
      console.error("Error loading active term:", err);
      setError('Could not load active term information.');
      setLoading(false);
    });

    return () => unsubTerms();
  }, []);

  useEffect(() => {
    if (!activeTerm) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const qEvents = query(collection(db, 'schoolEvents'));
    const unsubEvents = onSnapshot(qEvents, (snap) => {
      setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error('Error loading school events:', err);
      setError('Could not load school events.');
      setLoading(false);
    });

    return () => unsubEvents();
  }, [activeTerm?.id]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!activeTerm) return <Alert severity="info">There is currently no active term configured by the administrator.</Alert>;

  return (
    <Stack spacing={2.5}>
      <Card sx={{ boxShadow: 0, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Active Term: {activeTerm.name}
          </Typography>
          <TermProgressBar activeTerm={activeTerm} />
        </CardContent>
      </Card>

      <Card sx={{ boxShadow: 0, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            School Calendar & Upcoming Events
          </Typography>
          {events.length === 0 ? (
            <Typography color="text.secondary">No school events scheduled.</Typography>
          ) : (
            <SchoolCalendar events={events} readOnly />
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}