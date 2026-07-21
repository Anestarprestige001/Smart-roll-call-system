import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Chip,
  Stack, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  CircularProgress, Alert, Grid
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import {
  collection, query, orderBy, onSnapshot,
  addDoc, serverTimestamp, writeBatch, doc
} from 'firebase/firestore';
import { onIdTokenChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { getClassesCollectionRef, normalizeClassOptions } from '../constants/classes';
import ClassAttendanceStats from '../components/ClassAttendanceStats';
import SchoolWideAttendanceStats from '../components/SchoolWideAttendanceStats';

const EMPTY_TERM = { name: '', startDate: '', endDate: '', midtermDate: '' };

export default function Dashboard() {
  const [terms, setTerms] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [teacherClassId, setTeacherClassId] = useState('');
  const [teacherClassName, setTeacherClassName] = useState('');

  const [filterDate, setFilterDate] = useState('');
  const [filterClass, setFilterClass] = useState('');

  const [openAddTerm, setOpenAddTerm] = useState(false);
  const [newTerm, setNewTerm] = useState(EMPTY_TERM);
  const [termErrors, setTermErrors] = useState({});
  const [dataError, setDataError] = useState('');
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    setLoading(true);
    const qTerms = query(collection(db, 'terms'), orderBy('createdAt', 'desc'));
    const unsubTerms = onSnapshot(qTerms, (snap) => {
      setTerms(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setDataError('');
      setLoading(false);
    }, (error) => {
      console.error('Error loading terms:', error);
      setDataError('Unable to load dashboard data right now.');
      setLoading(false);
    });

    const unsubClasses = onSnapshot(getClassesCollectionRef(db), (snap) => {
      setClasses(normalizeClassOptions(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    }, (error) => {
      console.error('Error loading classes:', error);
      setDataError('Unable to load dashboard data right now.');
      setLoading(false);
    });

    if (auth.currentUser) {
      // Force a token refresh to get the latest custom claims.
      auth.currentUser.getIdToken(true).then(() => {
        auth.currentUser.getIdTokenResult().then(idTokenResult => {
          // Diagnostic log to confirm claims.
          console.log('User claims:', idTokenResult.claims);
        });
      });

      // Also listen for token changes while the app is open.
      const unsubscribeIdToken = onIdTokenChanged(auth, async (user) => {
        if (user) {
          console.log('ID token changed, refreshing claims...');
          await user.getIdToken(true);
        }
      });

      const unsubscribeUser = onSnapshot(doc(db, 'users', auth.currentUser.uid), (snap) => {
        const data = snap.data() || {};
        const nextRole = data.role || null;
        const nextTeacherClassId = data.classId || '';
        setRole(nextRole);
        setTeacherClassId(nextTeacherClassId);
        setTeacherClassName(data.className || nextTeacherClassId || '');
      }, (error) => {
        console.error('Error loading user profile for dashboard:', error);
        setDataError('Unable to load your account context right now.');
        setLoading(false);
      });

      return () => {
        unsubTerms();
        unsubClasses();
        unsubscribeIdToken();
        unsubscribeUser();
      };
    }

    return () => {
      unsubTerms();
      unsubClasses();
    };
  }, [retryToken]);

  const activeTerm = terms.find((t) => t.isActive);
  const canManageTerms = ['DIRECTOR', 'ADMIN', 'ICT COORDINATOR'].includes(role);
  const isTeacher = role === 'CLASS TEACHER';

  const validateTerm = () => {
    const e = {};
    if (!newTerm.name.trim()) e.name = true;
    if (!newTerm.startDate) e.startDate = true;
    if (!newTerm.endDate) e.endDate = true;
    if (newTerm.startDate && newTerm.endDate && newTerm.endDate < newTerm.startDate) e.endDate = true;
    setTermErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAddTerm = async () => {
    if (!validateTerm()) return;
    await addDoc(collection(db, 'terms'), {
      ...newTerm,
      isActive: false,
      createdAt: serverTimestamp(),
    });
    setNewTerm(EMPTY_TERM);
    setTermErrors({});
    setOpenAddTerm(false);
  };

  const handleSetActiveTerm = async (termId) => {
    const batch = writeBatch(db);
    terms.forEach((t) => {
      const ref = doc(db, 'terms', t.id);
      batch.update(ref, { isActive: t.id === termId });
    });
    await batch.commit();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
      <Typography variant="h4" color="primary.main" fontWeight="bold" gutterBottom>
        Dashboard
      </Typography>

      {dataError && (
        <Alert severity="warning" sx={{ mb: 3 }} action={
          <Button color="inherit" size="small" onClick={() => setRetryToken((value) => value + 1)}>
            Retry
          </Button>
        }>
          {dataError}
        </Alert>
      )}

      {!isTeacher && <SchoolWideAttendanceStats activeTerm={activeTerm} totalClasses={classes.length} />}

      {canManageTerms && (
        <Box sx={{ mb: 4 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">Term Management</Typography>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setOpenAddTerm(true)}>
              Add Term
            </Button>
          </Stack>

          {terms.length === 0 ? (
            <Alert severity="warning">No terms created yet. Add a term to start recording attendance.</Alert>
          ) : (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ overflowX: 'auto', pb: 1, flexWrap: 'wrap' }} useFlexGap>
              {terms.map((term) => (
                <Card key={term.id} sx={{ minWidth: 260, flex: '1 1 260px', borderColor: term.isActive ? 'primary.main' : 'divider', borderWidth: term.isActive ? 2 : 1, borderRadius: 2 }}>
                  <CardContent>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="h6" color={term.isActive ? 'primary.main' : 'text.primary'} fontWeight="bold">
                        {term.name}
                      </Typography>
                      {term.isActive ? (
                        <Chip label="Active" color="success" size="small" />
                      ) : (
                        <Button size="small" variant="outlined" onClick={() => handleSetActiveTerm(term.id)}>
                          Set Active
                        </Button>
                      )}
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {term.startDate} → {term.endDate}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Box>
      )}

      {isTeacher ? (
        <ClassAttendanceStats classId={teacherClassId} className={teacherClassName} activeTerm={activeTerm} />
      ) : (
        <Box>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>View Class Stats</Typography>
          <Grid container spacing={2}>
            {classes.map(c => (
              <Grid item key={c.id} xs={12} sm={6} md={4}>
                <Button
                  fullWidth
                  variant={selectedClassId === c.id ? 'contained' : 'outlined'}
                  onClick={() => setSelectedClassId(c.id)}
                  sx={{ justifyContent: 'flex-start', p: 2 }}
                >
                  {c.name}
                </Button>
              </Grid>
            ))}
          </Grid>

          {selectedClassId && (
            <Box sx={{ mt: 4 }}>
              <ClassAttendanceStats
                classId={selectedClassId}
                className={classes.find(c => c.id === selectedClassId)?.name}
                activeTerm={activeTerm}
              />
            </Box>
          )}
        </Box>
      )}

      <Dialog open={openAddTerm} onClose={() => { setOpenAddTerm(false); setTermErrors({}); }} maxWidth="xs" fullWidth>
        <DialogTitle>Add New Term</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField label="Term Name" placeholder="e.g. Term 1 2025" fullWidth value={newTerm.name} onChange={(e) => setNewTerm({ ...newTerm, name: e.target.value })} error={!!termErrors.name} helperText={termErrors.name ? 'Term name is required' : ''} />
            <TextField label="Start Date" type="date" fullWidth value={newTerm.startDate} onChange={(e) => setNewTerm({ ...newTerm, startDate: e.target.value })} error={!!termErrors.startDate} helperText={termErrors.startDate ? 'Start date is required' : ''} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label="End Date" type="date" fullWidth value={newTerm.endDate} onChange={(e) => setNewTerm({ ...newTerm, endDate: e.target.value })} error={!!termErrors.endDate} helperText={termErrors.endDate ? 'End date required and must be after start date' : ''} slotProps={{ inputLabel: { shrink: true } }} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setOpenAddTerm(false); setTermErrors({}); setNewTerm(EMPTY_TERM); }}>Cancel</Button>
          <Button variant="contained" onClick={handleAddTerm}>Create Term</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}