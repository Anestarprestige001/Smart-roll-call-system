import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField, Chip,
  Stack, Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, TablePagination, useMediaQuery, useTheme, CircularProgress, Divider,
  Alert, Avatar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PeopleIcon from '@mui/icons-material/People';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import BarChartIcon from '@mui/icons-material/BarChart';
import {
  collection, query, orderBy, onSnapshot, where,
  addDoc, serverTimestamp, writeBatch, doc
} from 'firebase/firestore';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';

const EMPTY_TERM = { name: '', startDate: '', endDate: '' };

export default function Dashboard() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  const [terms, setTerms] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [teacherClassId, setTeacherClassId] = useState('');
  const [teacherClassName, setTeacherClassName] = useState('');

  const [filterDate, setFilterDate] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterHouse, setFilterHouse] = useState('');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [openAddTerm, setOpenAddTerm] = useState(false);
  const [newTerm, setNewTerm] = useState(EMPTY_TERM);
  const [termErrors, setTermErrors] = useState({});

  useEffect(() => {
    const qTerms = query(collection(db, 'terms'), orderBy('createdAt', 'desc'));
    const unsubTerms = onSnapshot(qTerms, (snap) => {
      setTerms(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    if (auth.currentUser) {
      const unsubscribeUser = onSnapshot(doc(db, 'users', auth.currentUser.uid), (snap) => {
        const data = snap.data() || {};
        const nextRole = data.role || null;
        const nextTeacherClassId = data.classId || '';
        setRole(nextRole);
        setTeacherClassId(nextTeacherClassId);
        setTeacherClassName(data.className || nextTeacherClassId || '');
      });

      return () => {
        unsubTerms();
        unsubscribeUser();
      };
    }

    return () => { unsubTerms(); };
  }, []);

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    const qLogs = role === 'CLASS TEACHER' && teacherClassId
      ? query(collection(db, 'attendance_logs'), where('classId', '==', teacherClassId), orderBy('date', 'desc'))
      : query(collection(db, 'attendance_logs'), orderBy('date', 'desc'));

    const unsubLogs = onSnapshot(qLogs, (snap) => {
      setAttendanceLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => { unsubLogs(); };
  }, [role, teacherClassId]);

  const activeTerm = terms.find((t) => t.isActive);
  const todayStr = new Date().toISOString().split('T')[0];
  const termLogs = attendanceLogs.filter((l) => activeTerm && l.termId === activeTerm.id);
  const todayLogs = termLogs.filter((l) => l.date === todayStr);

  const canManageTerms = ['DIRECTOR', 'ADMIN', 'ICT COORDINATOR'].includes(role);
  const isTeacher = role === 'CLASS TEACHER';
  const reminderActive = new Date() >= new Date(new Date().setHours(9, 0, 0, 0));

  const summaryStats = [
    {
      title: 'Today Present',
      value: todayLogs.reduce((s, l) => s + (l.totalPresent || 0), 0),
      color: theme.palette.success.main,
      Icon: PeopleIcon,
      subtitle: 'On campus today',
    },
    {
      title: 'Today Absent',
      value: todayLogs.reduce((s, l) => s + (l.totalAbsent || 0), 0),
      color: theme.palette.error.main,
      Icon: PersonOffIcon,
      subtitle: 'Away today',
    },
    {
      title: 'Classes Reported Today',
      value: todayLogs.length,
      color: theme.palette.primary.main,
      Icon: AssignmentTurnedInIcon,
      subtitle: 'of expected classes',
    },
    {
      title: 'Term Total Records',
      value: termLogs.length,
      color: theme.palette.secondary.main,
      Icon: BarChartIcon,
      subtitle: activeTerm?.name || 'No active term',
    },
  ];

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

  const filteredLogs = attendanceLogs.filter((log) => {
    if (activeTerm && log.termId !== activeTerm.id) return false;
    if (filterDate && log.date !== filterDate) return false;
    if (filterClass && !String(log.classId || '').toLowerCase().includes(filterClass.toLowerCase())) return false;
    if (filterHouse && !String(log.house || '').toLowerCase().includes(filterHouse.toLowerCase())) return false;
    return true;
  });

  const teacherLogs = attendanceLogs.filter((log) => {
    const classMatches = String(log.classId || '') === teacherClassId || String(log.classId || '') === teacherClassName;
    return classMatches && (!activeTerm || log.termId === activeTerm.id);
  });

  const teacherTodayLog = teacherLogs.find((log) => log.date === todayStr);
  const teacherSummary = teacherLogs.reduce((acc, log) => {
    acc.totP += log.totalPresent || 0;
    acc.totA += log.totalAbsent || 0;
    return acc;
  }, { totP: 0, totA: 0 });

  const summary = filteredLogs.reduce((acc, log) => {
    acc.gbP += log.girlsBoardersPresent || 0;
    acc.gdP += log.girlsDayScholarsPresent || 0;
    acc.bbP += log.boysBoardersPresent || 0;
    acc.bdP += log.boysDayScholarsPresent || 0;
    acc.gbA += log.girlsBoardersAbsent || 0;
    acc.gdA += log.girlsDayScholarsAbsent || 0;
    acc.bbA += log.boysBoardersAbsent || 0;
    acc.bdA += log.boysDayScholarsAbsent || 0;
    acc.totP += log.totalPresent || 0;
    acc.totA += log.totalAbsent || 0;
    acc.totS += log.totalStudents || 0;
    return acc;
  }, { gbP: 0, gdP: 0, bbP: 0, bdP: 0, gbA: 0, gdA: 0, bbA: 0, bdA: 0, totP: 0, totA: 0, totS: 0 });

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

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
        gap: { xs: 1.5, md: 2 },
        mb: 4,
      }}>
        {summaryStats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <Card elevation={2} sx={{ borderRadius: 3, p: { xs: 1.5, md: 2 }, borderLeft: `4px solid ${stat.color}`, height: '100%' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, lineHeight: 1.2 }}>
                    {stat.title}
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color={stat.color} sx={{ lineHeight: 1.1, mt: 0.5 }}>
                    {stat.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {stat.subtitle}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: stat.color + '18', width: { xs: 40, md: 48 }, height: { xs: 40, md: 48 } }}>
                  <stat.Icon sx={{ color: stat.color, fontSize: { xs: 20, md: 24 } }} />
                </Avatar>
              </Stack>
            </Card>
          </motion.div>
        ))}
      </Box>

      {canManageTerms && (
        <Box sx={{ mb: 4 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">Term Management</Typography>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setOpenAddTerm(true)}>
              Add Term
            </Button>
          </Stack>

          {terms.length === 0 ? (
            <Alert severity="warning">No terms created yet. Add a term to start recording attendance.</Alert>
          ) : (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ overflowX: 'auto', pb: 1 }} flexWrap="wrap" useFlexGap>
              {terms.map((term) => (
                <Card key={term.id} sx={{ minWidth: 260, flex: '1 1 260px', borderColor: term.isActive ? 'primary.main' : 'divider', borderWidth: term.isActive ? 2 : 1, borderRadius: 2 }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
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
        <Box>
          <Alert severity={teacherTodayLog ? 'success' : 'warning'} sx={{ mb: 3 }}>
            {teacherTodayLog
              ? `${teacherClassName || teacherClassId} has submitted today's roll call.`
              : reminderActive
                ? `${teacherClassName || teacherClassId} is still waiting for today's roll call after the 9:00 AM cutoff.`
                : `${teacherClassName || teacherClassId} will be reminded after the 9:00 AM cutoff if today's roll call is still missing.`}
          </Alert>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Your class overview
              </Typography>
              <Typography color="text.secondary" gutterBottom>
                Class: {teacherClassName || teacherClassId || 'Pending assignment'}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                <Chip label={`Present today: ${teacherSummary.totP}`} color="success" />
                <Chip label={`Absent today: ${teacherSummary.totA}`} color="error" />
              </Stack>
              {!teacherTodayLog && (
                <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate('/submit-attendance')}>
                  Submit today's roll call
                </Button>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Your class records
              </Typography>
              {teacherLogs.length === 0 ? (
                <Typography color="text.secondary">No records for this class yet.</Typography>
              ) : (
                <Stack spacing={1}>
                  {teacherLogs.slice(0, 5).map((log) => (
                    <Box key={log.id} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 1.5 }}>
                      <Typography variant="subtitle2">{log.date}</Typography>
                      <Typography variant="body2" color="text.secondary">Present: {log.totalPresent} • Absent: {log.totalAbsent}</Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Box>
      ) : (
        <>
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Records Browser
                {activeTerm ? ` — ${activeTerm.name} (${activeTerm.startDate} to ${activeTerm.endDate})` : ' — No active term'}
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr auto' }, gap: 2, alignItems: 'start', mt: 1 }}>
                <TextField fullWidth type="date" label="Jump to Date" value={filterDate} onChange={(e) => { setFilterDate(e.target.value); setPage(0); }} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField fullWidth label="Filter by Class" placeholder="e.g. Grade 7" value={filterClass} onChange={(e) => { setFilterClass(e.target.value); setPage(0); }} />
                <TextField fullWidth label="Filter by House" placeholder="e.g. Venus" value={filterHouse} onChange={(e) => { setFilterHouse(e.target.value); setPage(0); }} />
                {(filterDate || filterClass || filterHouse) && (
                  <Button variant="text" onClick={() => { setFilterDate(''); setFilterClass(''); setFilterHouse(''); setPage(0); }} sx={{ height: '56px' }}>
                    Clear Filters
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>

          {filteredLogs.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <AssignmentIcon sx={{ fontSize: 72, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No attendance records found for the current filters.
              </Typography>
            </Box>
          ) : (
            <>
              {isMobile ? (
                <Stack spacing={1.5}>
                  {filteredLogs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((log) => (
                    <Card key={log.id}>
                      <CardContent>
                        <Typography variant="subtitle2" color="primary.main" fontWeight="bold">
                          {log.date} — {log.classId}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          House: {log.house} &nbsp;|&nbsp; By: {log.submittedBy}
                        </Typography>
                        <Divider sx={{ my: 1 }} />
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, my: 1 }}>
                          {[
                            ['Girls Boarders', log.girlsBoardersPresent, log.girlsBoardersAbsent],
                            ['Girls Day', log.girlsDayScholarsPresent, log.girlsDayScholarsAbsent],
                            ['Boys Boarders', log.boysBoardersPresent, log.boysBoardersAbsent],
                            ['Boys Day', log.boysDayScholarsPresent, log.boysDayScholarsAbsent],
                          ].map(([label, present, absent]) => (
                            <Box key={label} sx={{ bgcolor: 'background.default', borderRadius: 1.5, p: 1 }}>
                              <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
                              <Typography variant="body2" fontWeight="bold">
                                <Box component="span" sx={{ color: 'success.main' }}>{present}</Box>
                                {' / '}
                                <Box component="span" sx={{ color: 'error.main' }}>{absent}</Box>
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="body2" fontWeight="bold">
                          Present: {log.totalPresent} &nbsp;|&nbsp; Absent: {log.totalAbsent} &nbsp;|&nbsp; Total: {log.totalStudents}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'primary.main' }}>
                        {['Date', 'Class', 'House', 'Submitted By', 'GB (P/A)', 'GD (P/A)', 'BB (P/A)', 'BD (P/A)', 'Total P', 'Total A', 'Total'].map((h) => (
                          <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold' }} align={h.includes('/') || h.startsWith('Total') ? 'center' : 'left'}>
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredLogs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((log) => (
                        <TableRow key={log.id} hover>
                          <TableCell>{log.date}</TableCell>
                          <TableCell>{log.classId}</TableCell>
                          <TableCell>{log.house}</TableCell>
                          <TableCell>{log.submittedBy}</TableCell>
                          <TableCell align="center">{log.girlsBoardersPresent} / {log.girlsBoardersAbsent}</TableCell>
                          <TableCell align="center">{log.girlsDayScholarsPresent} / {log.girlsDayScholarsAbsent}</TableCell>
                          <TableCell align="center">{log.boysBoardersPresent} / {log.boysBoardersAbsent}</TableCell>
                          <TableCell align="center">{log.boysDayScholarsPresent} / {log.boysDayScholarsAbsent}</TableCell>
                          <TableCell align="center" sx={{ color: 'success.main', fontWeight: 'bold' }}>{log.totalPresent}</TableCell>
                          <TableCell align="center" sx={{ color: 'error.main', fontWeight: 'bold' }}>{log.totalAbsent}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>{log.totalStudents}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell colSpan={4} align="right">
                          <Typography variant="body2" fontWeight="bold">Filtered Totals:</Typography>
                        </TableCell>
                        <TableCell align="center"><strong>{summary.gbP} / {summary.gbA}</strong></TableCell>
                        <TableCell align="center"><strong>{summary.gdP} / {summary.gdA}</strong></TableCell>
                        <TableCell align="center"><strong>{summary.bbP} / {summary.bbA}</strong></TableCell>
                        <TableCell align="center"><strong>{summary.bdP} / {summary.bdA}</strong></TableCell>
                        <TableCell align="center" sx={{ color: 'success.main' }}><strong>{summary.totP}</strong></TableCell>
                        <TableCell align="center" sx={{ color: 'error.main' }}><strong>{summary.totA}</strong></TableCell>
                        <TableCell align="center"><strong>{summary.totS}</strong></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              <TablePagination
                component="div"
                count={filteredLogs.length}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                rowsPerPageOptions={[10, 25, 50]}
              />
            </>
          )}
        </>
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