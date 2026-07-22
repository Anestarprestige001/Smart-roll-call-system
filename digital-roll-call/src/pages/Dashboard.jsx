import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, CircularProgress, Alert, Grid } from '@mui/material';
import { collection, query, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { onIdTokenChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { getClassesCollectionRef, normalizeClassOptions } from '../constants/classes';
import SchoolWideAttendanceStats from '../components/SchoolWideAttendanceStats';
import ClassStatsDetailModal from '../components/dashboard/ClassStatsDetailModal';

const EMPTY_TERM = { name: '', startDate: '', endDate: '', midtermDate: '' };

export default function Dashboard() {
  const [terms, setTerms] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [teacherClassId, setTeacherClassId] = useState('');
  const [teacherClassName, setTeacherClassName] = useState('');

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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 0 }, maxWidth: 1400, mx: 'auto' }}>
      {/* <Typography variant="h4" color="primary.main" fontWeight="bold" gutterBottom>
        Dashboard
      </Typography> */}

      {dataError && (
        <Alert severity="warning" sx={{ mb: 3 }} action={
          <Button color="inherit" size="small" onClick={() => setRetryToken((value) => value + 1)}>
            Retry
          </Button>
        }>
          {dataError}
        </Alert>
      )}

      {!isTeacher && activeTerm && <SchoolWideAttendanceStats activeTerm={activeTerm} totalClasses={classes.length} />}

      {isTeacher ? (
        (teacherClassId && activeTerm) ? (
          <ClassStatsDetailModal
            classId={teacherClassId}
            className={teacherClassName}
            activeTerm={activeTerm}
            isTeacherView={true}
          />
        ) : (
          <Alert severity="info">Loading your class information...</Alert>
        )
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
            <ClassStatsDetailModal
              open={!!selectedClassId}
              onClose={() => setSelectedClassId(null)}
              classId={selectedClassId}
              className={classes.find(c => c.id === selectedClassId)?.name}
              activeTerm={activeTerm}
            />
          )}
        </Box>
      )}
    </Box>
  );
}