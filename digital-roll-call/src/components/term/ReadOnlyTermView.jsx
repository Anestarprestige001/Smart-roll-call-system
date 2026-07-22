import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, CircularProgress, Alert, List, ListItem, ListItemText, Stack, Chip } from '@mui/material';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../firebase';
import TermProgressBar from '../TermProgressBar';

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

    const qEvents = query(collection(db, 'terms', activeTerm.id, 'events'), orderBy('startDate', 'asc'));
    const unsubEvents = onSnapshot(qEvents, (snap) => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error("Error loading events:", err);
      setError('Could not load school events.');
      setLoading(false);
    });

    return () => unsubEvents();
  }, [activeTerm?.id]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!activeTerm) return <Alert severity="info">There is currently no active term configured by the administrator.</Alert>;

  return (
    <Stack spacing={4}>
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Active Term: {activeTerm.name}
          </Typography>
          <TermProgressBar activeTerm={activeTerm} />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            School Calendar & Upcoming Events
          </Typography>
          {events.length === 0 ? (
            <Typography color="text.secondary">No upcoming events scheduled for this term.</Typography>
          ) : (
            <List>
              {events.map(event => (
                <ListItem key={event.id} divider>
                  <ListItemText 
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography fontWeight="bold">{event.name}</Typography>
                        <Chip 
                          label={event.type} 
                          size="small" 
                          color={event.type === 'Holiday' ? 'error' : 'primary'} 
                          variant="outlined" 
                        />
                      </Stack>
                    }
                    secondary={
                      event.endDate && event.endDate !== event.startDate 
                        ? `Dates: ${event.startDate} to ${event.endDate}` 
                        : `Date: ${event.startDate}`
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}