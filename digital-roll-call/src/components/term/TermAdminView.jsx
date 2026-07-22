import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Stack, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Card, CardContent, CircularProgress, Alert,
  IconButton, List, ListItem, ListItemText, Select, MenuItem, FormControl, InputLabel, Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, writeBatch, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import TermProgressBar from '../TermProgressBar';

const EMPTY_TERM = { name: '', startDate: '', endDate: '', midtermDate: '' };
const EMPTY_EVENT = { name: '', startDate: '', endDate: '', type: 'Holiday' };
const EVENT_TYPES = ["Trip", "Holiday", "Midterm Break", "Public Holiday", "Exams"];

export default function TermAdminView() {
  const [terms, setTerms] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState('');
  
  const [openTermDialog, setOpenTermDialog] = useState(false);
  const [newTerm, setNewTerm] = useState(EMPTY_TERM);
  const [editingTerm, setEditingTerm] = useState(null);
  const [termErrors, setTermErrors] = useState({});

  const [openEventDialog, setOpenEventDialog] = useState(false);
  const [newEvent, setNewEvent] = useState(EMPTY_EVENT);
  const [editingEvent, setEditingEvent] = useState(null);

  const activeTerm = terms.find((t) => t.isActive);

  useEffect(() => {
    const qTerms = query(collection(db, 'terms'), orderBy('createdAt', 'desc'));
    const unsubTerms = onSnapshot(qTerms, 
      (snap) => {
        setTerms(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (error) => {
        console.error('Error loading terms:', error);
        setDataError('Unable to load term data.');
        setLoading(false);
      }
    );

    return () => unsubTerms();
  }, []);

  useEffect(() => {
    if (!activeTerm) {
      setEvents([]);
      return;
    }

    const qEvents = query(collection(db, 'terms', activeTerm.id, 'events'), orderBy('startDate', 'asc'));
    const unsubEvents = onSnapshot(qEvents, 
      (snap) => setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (error) => console.error('Error loading events:', error)
    );

    return () => unsubEvents();
  }, [activeTerm?.id]);

  const validateTerm = () => {
    const e = {};
    if (!newTerm.name.trim()) e.name = true;
    if (!newTerm.startDate) e.startDate = true;
    if (!newTerm.endDate) e.endDate = true;
    if (newTerm.startDate && newTerm.endDate && newTerm.endDate < newTerm.startDate) e.endDate = true;
    setTermErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleOpenAddTerm = () => { setEditingTerm(null); setNewTerm(EMPTY_TERM); setOpenTermDialog(true); };
  const handleOpenEditTerm = (term) => { setEditingTerm(term); setNewTerm(term); setOpenTermDialog(true); };
  const handleCloseTermDialog = () => { setOpenTermDialog(false); setTermErrors({}); setEditingTerm(null); };

  const handleAddOrUpdateTerm = async () => {
    if (!validateTerm()) return;
    try {
      if (editingTerm) {
        await updateDoc(doc(db, 'terms', editingTerm.id), {
          name: newTerm.name,
          startDate: newTerm.startDate,
          endDate: newTerm.endDate,
          midtermDate: newTerm.midtermDate || ''
        });
      } else {
        await addDoc(collection(db, 'terms'), {
          ...newTerm,
          isActive: false,
          createdAt: serverTimestamp()
        });
      }
      handleCloseTermDialog();
    } catch (err) {
      console.error("Error saving term:", err);
    }
  };

  const handleSetActiveTerm = async (termId) => {
    try {
      const batch = writeBatch(db);
      terms.forEach((t) => {
        const ref = doc(db, 'terms', t.id);
        batch.update(ref, { isActive: t.id === termId });
      });
      await batch.commit();
    } catch (err) {
      console.error("Error setting active term:", err);
    }
  };

  const handleOpenAddEvent = () => { setEditingEvent(null); setNewEvent(EMPTY_EVENT); setOpenEventDialog(true); };
  const handleOpenEditEvent = (event) => { setEditingEvent(event); setNewEvent(event); setOpenEventDialog(true); };
  const handleCloseEventDialog = () => { setOpenEventDialog(false); setEditingEvent(null); };

  const handleAddOrUpdateEvent = async () => {
    if (!newEvent.name || !newEvent.startDate || !activeTerm) return;
    try {
      const eventCollectionRef = collection(db, 'terms', activeTerm.id, 'events');
      if (editingEvent) {
        await updateDoc(doc(eventCollectionRef, editingEvent.id), newEvent);
      } else {
        await addDoc(eventCollectionRef, { ...newEvent, createdAt: serverTimestamp() });
      }
      handleCloseEventDialog();
    } catch (err) {
      console.error("Error saving event:", err);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await deleteDoc(doc(db, 'terms', activeTerm.id, 'events', eventId));
      } catch (err) {
        console.error("Error deleting event:", err);
      }
    }
  };

  if (loading) return <CircularProgress />;
  if (dataError) return <Alert severity="error">{dataError}</Alert>;

  return (
    <Stack spacing={4}>
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight="bold">Term Schedules</Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAddTerm}>
              Add Term
            </Button>
          </Stack>
          
          {terms.length === 0 ? (
            <Typography color="text.secondary">No terms created yet.</Typography>
          ) : (
            terms.map(term => (
              <Box key={term.id} sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center" mb={1}>
                  <Typography variant="subtitle1" fontWeight={term.isActive ? 'bold' : 'normal'}>
                    {term.name}
                  </Typography>
                  {term.isActive ? (
                    <Chip label="Active Term" color="success" size="small" />
                  ) : (
                    <Button size="small" variant="outlined" onClick={() => handleSetActiveTerm(term.id)}>
                      Set Active
                    </Button>
                  )}
                  <IconButton size="small" onClick={() => handleOpenEditTerm(term)}>
                    <EditIcon />
                  </IconButton>
                </Stack>
                <TermProgressBar activeTerm={term} />
              </Box>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight="bold">
              School Events Calendar {activeTerm ? `(${activeTerm.name})` : ''}
            </Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAddEvent} disabled={!activeTerm}>
              Add Event
            </Button>
          </Stack>

          {!activeTerm ? (
            <Alert severity="info">Set an active term above to manage events and calendar schedules.</Alert>
          ) : events.length === 0 ? (
            <Typography color="text.secondary">No events scheduled for this term.</Typography>
          ) : (
            <List>
              {events.map(event => (
                <ListItem 
                  key={event.id}
                  divider
                  secondaryAction={
                    <Stack direction="row" spacing={1}>
                      <IconButton edge="end" onClick={() => handleOpenEditEvent(event)}><EditIcon /></IconButton>
                      <IconButton edge="end" color="error" onClick={() => handleDeleteEvent(event.id)}><DeleteIcon /></IconButton>
                    </Stack>
                  }
                >
                  <ListItemText 
                    primary={
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography fontWeight="bold">{event.name}</Typography>
                        <Chip label={event.type} size="small" color={event.type === 'Holiday' ? 'error' : 'primary'} variant="outlined" />
                      </Stack>
                    }
                    secondary={event.endDate && event.endDate !== event.startDate 
                      ? `Dates: ${event.startDate} to ${event.endDate}` 
                      : `Date: ${event.startDate}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Term Dialog */}
      <Dialog open={openTermDialog} onClose={handleCloseTermDialog} fullWidth maxWidth="xs">
        <DialogTitle>{editingTerm ? 'Edit Term' : 'Add New Term'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Term Name" fullWidth value={newTerm.name} onChange={(e) => setNewTerm({ ...newTerm, name: e.target.value })} error={!!termErrors.name} />
            <TextField label="Start Date" type="date" fullWidth value={newTerm.startDate} onChange={(e) => setNewTerm({ ...newTerm, startDate: e.target.value })} error={!!termErrors.startDate} InputLabelProps={{ shrink: true }} />
            <TextField label="End Date" type="date" fullWidth value={newTerm.endDate} onChange={(e) => setNewTerm({ ...newTerm, endDate: e.target.value })} error={!!termErrors.endDate} InputLabelProps={{ shrink: true }} />
            <TextField label="Midterm Date (Optional)" type="date" fullWidth value={newTerm.midtermDate} onChange={(e) => setNewTerm({ ...newTerm, midtermDate: e.target.value })} InputLabelProps={{ shrink: true }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTermDialog}>Cancel</Button>
          <Button onClick={handleAddOrUpdateTerm} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Event Dialog */}
      <Dialog open={openEventDialog} onClose={handleCloseEventDialog} fullWidth maxWidth="xs">
        <DialogTitle>{editingEvent ? 'Edit Event' : 'Add New Event'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Event Name" fullWidth value={newEvent.name} onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })} />
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select value={newEvent.type} label="Type" onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}>
                {EVENT_TYPES.map(type => <MenuItem key={type} value={type}>{type}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Start Date" type="date" fullWidth value={newEvent.startDate} onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })} InputLabelProps={{ shrink: true }} />
            <TextField label="End Date (Optional)" type="date" fullWidth value={newEvent.endDate} onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })} InputLabelProps={{ shrink: true }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEventDialog}>Cancel</Button>
          <Button onClick={handleAddOrUpdateEvent} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}