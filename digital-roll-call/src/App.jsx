import React, { useState, useEffect, Suspense } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { ThemeProvider, createTheme, useTheme } from '@mui/material/styles';
import {
  CssBaseline, AppBar, Toolbar, Typography, Button,
  Box, CircularProgress, useMediaQuery, IconButton,
  BottomNavigation, BottomNavigationAction, Paper, Badge, Fab,
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { auth, db } from './firebase';

const Login = React.lazy(() => import('./pages/Login'));
const SubmitAttendance = React.lazy(() => import('./pages/SubmitAttendance'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const PendingApproval = React.lazy(() => import('./pages/PendingApproval'));
const PendingApprovals = React.lazy(() => import('./pages/PendingApprovals'));
const ApprovedTeachers = React.lazy(() => import('./pages/ApprovedTeachers'));
const Profile = React.lazy(() => import('./pages/Profile'));

const theme = createTheme({
  palette: {
    primary: { main: '#000080' },
    secondary: { main: '#800000' },
    error: { main: '#c62828' },
    success: { main: '#2e7d32' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
    h3: { fontWeight: 800 },
    h4: { fontWeight: 700 },
    h6: { fontWeight: 600 },
  },
  components: {
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { border: '1px solid #e0e0e0', borderRadius: 16 },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', borderRadius: 8, fontWeight: 600 },
      },
    },
  },
});

function NavBar({ user, onLogout, role, showRollCallReminder }) {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (location.pathname === '/login') return null;
  if (!user) return null;

  const navValue = location.pathname === '/dashboard'
    ? 0
    : location.pathname === '/submit-attendance'
      ? 1
      : location.pathname === '/profile'
        ? 2
        : -1;

  return (
    <>
      <AppBar position="fixed" color="primary" elevation={2}>
        <Toolbar>
          <Typography
            variant="h6"
            component={Link}
            to="/dashboard"
            sx={{ flexGrow: 1, color: 'inherit', textDecoration: 'none', whiteSpace: 'nowrap', fontWeight: 'bold' }}
          >
            AGS - Prestige Campus
          </Typography>

          {isMobile ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton color="inherit" aria-label="profile" onClick={() => navigate('/profile')}>
                <AccountCircleIcon />
              </IconButton>
              <IconButton color="inherit" aria-label="logout" onClick={onLogout}>
                <LogoutIcon />
              </IconButton>
            </Box>
          ) : (
            <Box>
              <Button color="inherit" component={Link} to="/submit-attendance">
                Submit Roll Call
              </Button>
              <Button color="inherit" component={Link} to="/dashboard" sx={{ ml: 1 }}>
                Dashboard
              </Button>
              {(role === 'ICT COORDINATOR' || role === 'DIRECTOR' || role === 'ADMIN') && (
                <>
                  <Button color="inherit" component={Link} to="/pending-approvals" sx={{ ml: 1 }}>
                    Pending Approvals
                  </Button>
                  <Button color="inherit" component={Link} to="/approved-teachers" sx={{ ml: 1 }}>
                    Approved Teachers
                  </Button>
                </>
              )}
              <Button color="inherit" component={Link} to="/profile" sx={{ ml: 1 }}>
                Profile
              </Button>
              <Button color="inherit" variant="outlined" onClick={onLogout} sx={{ ml: 2, borderColor: 'rgba(255,255,255,0.6)' }}>
                Logout
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {isMobile && (
        <>
          <Paper elevation={8} sx={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1300, borderTop: '1px solid #e0e0e0' }}>
            <BottomNavigation
              showLabels
              value={navValue}
              onChange={(_, value) => {
                if (value === 0) navigate('/dashboard');
                if (value === 1) navigate('/submit-attendance');
                if (value === 2) navigate('/profile');
              }}
              sx={{ height: 72 }}
            >
              <BottomNavigationAction label="Home" icon={<DashboardIcon />} />
              <BottomNavigationAction label="New Roll Call" icon={<AssignmentIcon />} />
              <BottomNavigationAction label="Profile" icon={<AccountCircleIcon />} />
            </BottomNavigation>
          </Paper>
          <Fab
            color="secondary"
            aria-label="new roll call"
            sx={{ position: 'fixed', bottom: 40, left: '50%', transform: 'translateX(-50%)', zIndex: 1400 }}
            onClick={() => navigate('/submit-attendance')}
          >
            {showRollCallReminder ? (
              <Badge color="error" variant="dot">
                <AssignmentIcon />
              </Badge>
            ) : (
              <AssignmentIcon />
            )}
          </Fab>
        </>
      )}
    </>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [status, setStatus] = useState('pending');
  const [classId, setClassId] = useState('');
  const [showRollCallReminder, setShowRollCallReminder] = useState(false);
  const [accountSyncState, setAccountSyncState] = useState('ready');

  useEffect(() => {
    let unsubscribeUserDoc = null;

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      // Clean up any listener from a previous user before proceeding
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = null;
      }

      if (!currentUser) {
        setRole(null);
        setStatus('pending');
        setClassId('');
        setShowRollCallReminder(false);
        setAccountSyncState('ready');
        return;
      }

      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        let userDoc = await getDoc(userDocRef);

        // Create the pending doc on first-ever sign-in only
        if (!userDoc.exists()) {
          await setDoc(userDocRef, {
            name: currentUser.displayName || '',
            email: currentUser.email || '',
            status: 'pending',
            role: null,
            classId: null,
            createdAt: serverTimestamp(),
          });
        }

        let lastClaimsUpdatedAt = null;

        unsubscribeUserDoc = onSnapshot(userDocRef, async (snap) => {
          const data = snap.data() || {};
          const claimsUpdatedAt = data.claimsUpdatedAt || null;
          const firestoreRole = data.role || null;
          const isActiveDoc = data.status === 'active';

          if (claimsUpdatedAt && claimsUpdatedAt !== lastClaimsUpdatedAt) {
            lastClaimsUpdatedAt = claimsUpdatedAt;
            try {
              await currentUser.getIdToken(true);
            } catch (err) {
              console.error('Error refreshing ID token after role change:', err);
            }
          }

          let tokenRole = null;
          let tokenResolved = false;

          if (isActiveDoc && firestoreRole) {
            setAccountSyncState('syncing');
            for (let attempt = 0; attempt < 3; attempt += 1) {
              try {
                await currentUser.getIdToken(true);
                const tokenResult = await currentUser.getIdTokenResult(false);
                tokenRole = tokenResult.claims?.role || null;
                tokenResolved = true;
                if (tokenRole === firestoreRole) {
                  break;
                }
              } catch (err) {
                console.error('Error refreshing ID token for role sync:', err);
              }

              if (attempt < 2) {
                await sleep(1000);
              }
            }

            if (tokenResolved && tokenRole === firestoreRole) {
              setRole(tokenRole);
              setAccountSyncState('ready');
            } else {
              setRole(null);
              setAccountSyncState('syncing');
            }
          } else {
            try {
              const tokenResult = await currentUser.getIdTokenResult(false);
              tokenRole = tokenResult.claims?.role || null;
            } catch (err) {
              console.error('Error reading ID token role:', err);
            }

            setRole(tokenRole);
            setAccountSyncState('ready');
          }

          setStatus(data.status || 'pending');
          setClassId(data.classId || '');
        }, (error) => {
          console.error('Error listening to user doc:', error);
          setAccountSyncState('error');
        });
      } catch (error) {
        console.error('Error loading user profile:', error);
        setAccountSyncState('error');
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, []);

  useEffect(() => {
    if (!user || role !== 'CLASS TEACHER' || !classId) {
      setShowRollCallReminder(false);
      return;
    }

    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setHours(9, 0, 0, 0);
    const shouldRemind = now >= cutoff;

    if (!shouldRemind) {
      setShowRollCallReminder(false);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const q = query(collection(db, 'attendance_logs'), where('date', '==', today), where('classId', '==', classId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setShowRollCallReminder(snapshot.empty);
    });

    return () => unsubscribe();
  }, [user, role, classId]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const isPending = status === 'pending' || !role || accountSyncState === 'syncing' || accountSyncState === 'error';

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <CircularProgress color="primary" />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <NavBar user={user} onLogout={handleLogout} role={role} showRollCallReminder={showRollCallReminder} />

        <Box sx={{ mt: user ? 8 : 0, p: user ? { xs: 2, md: 3 } : 0, pb: user ? { xs: 10, md: 3 } : 0 }}>
          <Suspense fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
              <CircularProgress />
            </Box>
          }>
            <Routes>
              <Route
                path="/login"
                element={!user ? <Login /> : <Navigate to={isPending ? '/pending-approval' : '/dashboard'} />}
              />
              <Route
                path="/pending-approval"
                element={user ? (
                  isPending ? (
                    accountSyncState === 'syncing' ? (
                      <Box sx={{ maxWidth: 640, mx: 'auto', mt: 8, p: 3, textAlign: 'center' }}>
                        <Typography variant="h5" color="primary.main" gutterBottom>
                          Syncing your account permissions
                        </Typography>
                        <Typography color="text.secondary">
                          Your role change is still being applied to your authentication token. This usually takes a few seconds.
                        </Typography>
                      </Box>
                    ) : accountSyncState === 'error' ? (
                      <Box sx={{ maxWidth: 640, mx: 'auto', mt: 8, p: 3, textAlign: 'center' }}>
                        <Typography variant="h5" color="error.main" gutterBottom>
                          We could not sync your account yet
                        </Typography>
                        <Typography color="text.secondary">
                          Your role may still be propagating. Please wait a moment and try again, or contact support if the issue persists.
                        </Typography>
                      </Box>
                    ) : (
                      <PendingApproval />
                    )
                  ) : <Navigate to="/dashboard" />
                ) : <Navigate to="/login" />}
              />
              <Route
                path="/dashboard"
                element={user ? (isPending ? <Navigate to="/pending-approval" /> : <Dashboard />) : <Navigate to="/login" />}
              />
              <Route
                path="/submit-attendance"
                element={user ? (isPending ? <Navigate to="/pending-approval" /> : <SubmitAttendance />) : <Navigate to="/login" />}
              />
              <Route
                path="/profile"
                element={user ? (isPending ? <Navigate to="/pending-approval" /> : <Profile />) : <Navigate to="/login" />}
              />
              <Route
                path="/pending-approvals"
                element={user ? (isPending || !['ICT COORDINATOR', 'DIRECTOR', 'ADMIN'].includes(role) ? <Navigate to="/dashboard" /> : <PendingApprovals />) : <Navigate to="/login" />}
              />
              <Route
                path="/approved-teachers"
                element={user ? (isPending || !['ICT COORDINATOR', 'DIRECTOR', 'ADMIN'].includes(role) ? <Navigate to="/dashboard" /> : <ApprovedTeachers />) : <Navigate to="/login" />}
              />
              <Route
                path="*"
                element={<Navigate to={user ? (isPending ? '/pending-approval' : '/dashboard') : '/login'} />}
              />
            </Routes>
          </Suspense>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;