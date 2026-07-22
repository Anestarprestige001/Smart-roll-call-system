import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Stack, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Card, CardContent, CircularProgress, Alert,
  IconButton, Select, MenuItem, FormControl, InputLabel, Chip, FormControlLabel, Switch
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, writeBatch, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import TermProgressBar from '../TermProgressBar';
import SchoolCalendar from './SchoolCalendar';

const EMPTY_TERM = { name: '', startDate: '', endDate: '', midtermDate: '' };
const EMPTY_EVENT = { title: '', startDate: '', endDate: '', type: 'holiday' };
const EVENT_TYPES = [
  { value: 'holiday', label: 'Holiday' },
  { value: 'midterm', label: 'Midterm' },
  { value: 'trip', label: 'Trip' },
  { value: 'other', label: 'Other' },
];

export default function TermAdminView() {
  const [terms, setTerms] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState('');
  const [isRange, setIsRange] = useState(false);
  
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
    const qEvents = query(collection(db, 'schoolEvents'), orderBy('startDate', 'asc'));
    const unsubEvents = onSnapshot(qEvents,
      (snap) => setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (error) => console.error('Error loading events:', error)
    );

    return () => unsubEvents();
  }, []);

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

  const handleOpenAddEvent = (date) => {
    setEditingEvent(null);
    setIsRange(false);
    setNewEvent({
      ...EMPTY_EVENT,
      startDate: date ? date.toISOString().slice(0, 10) : '',
      endDate: date ? date.toISOString().slice(0, 10) : '',
    });
    setOpenEventDialog(true);
  };

  const handleOpenEditEvent = (event) => {
    setEditingEvent(event);
    setIsRange(Boolean(event.endDate && event.endDate !== event.startDate));
    setNewEvent({
      title: event.title || '',
      startDate: event.startDate || '',
      endDate: event.endDate || event.startDate || '',
      type: event.type || 'holiday',
    });
    setOpenEventDialog(true);
  };

  const handleCloseEventDialog = () => {
    setOpenEventDialog(false);
    setEditingEvent(null);
    setIsRange(false);
    setNewEvent(EMPTY_EVENT);
  };

  const handleAddOrUpdateEvent = async () => {
    if (!newEvent.title || !newEvent.startDate) return;
    try {
      const eventPayload = {
        title: newEvent.title,
        startDate: newEvent.startDate,
        endDate: newEvent.endDate || newEvent.startDate,
        type: newEvent.type,
        createdBy: auth.currentUser?.uid || 'admin',
        createdAt: serverTimestamp(),
      };
      if (editingEvent) {
        await updateDoc(doc(db, 'schoolEvents', editingEvent.id), eventPayload);
      } else {
        await addDoc(collection(db, 'schoolEvents'), eventPayload);
      }
      handleCloseEventDialog();
    } catch (err) {
      console.error('Error saving event:', err);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await deleteDoc(doc(db, 'schoolEvents', eventId));
      } catch (err) {
        console.error('Error deleting event:', err);
      }
    }
  };

  if (loading) return <CircularProgress />;
  if (dataError) return <Alert severity="error">{dataError}</Alert>;

  return (
    <Stack spacing={2.5}>
      <Card sx={{ boxShadow: 0, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
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
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenAddEvent(new Date())} disabled={!activeTerm}>
              Add Event
            </Button>
          </Stack>

          {!activeTerm ? (
            <Alert severity="info">Set an active term above to manage events and calendar schedules.</Alert>
          ) : (
            <Box sx={{ mt: 1 }}>
              <SchoolCalendar
                events={events}
                readOnly={false}
                onDateClick={(date) => handleOpenAddEvent(date)}
                onEventClick={(event) => handleOpenEditEvent(event)}
              />
            </Box>
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
            <TextField label="Event Title" fullWidth value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} />
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select value={newEvent.type} label="Type" onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}>
                {EVENT_TYPES.map((type) => <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControlLabel
              control={<Switch checked={isRange} onChange={(e) => setIsRange(e.target.checked)} />}
              label="Date range"
            />
            <TextField label="Start Date" type="date" fullWidth value={newEvent.startDate} onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })} InputLabelProps={{ shrink: true }} />
            {isRange && (
              <TextField label="End Date" type="date" fullWidth value={newEvent.endDate} onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })} InputLabelProps={{ shrink: true }} />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Stack direction="row" spacing={1} sx={{ flexGrow: 1, justifyContent: 'space-between' }}>
            {editingEvent ? (
              <Button color="error" onClick={() => handleDeleteEvent(editingEvent.id)}>Delete</Button>
            ) : <Box />}
            <Stack direction="row" spacing={1}>
              <Button onClick={handleCloseEventDialog}>Cancel</Button>
              <Button onClick={handleAddOrUpdateEvent} variant="contained">Save</Button>
            </Stack>
          </Stack>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}