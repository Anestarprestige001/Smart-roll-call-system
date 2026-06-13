import React, { useState, useEffect, Suspense } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
} from 'react-router-dom';
import { ThemeProvider, createTheme, useTheme } from '@mui/material/styles';
import {
  CssBaseline, AppBar, Toolbar, Typography, Button,
  Box, CircularProgress, useMediaQuery, IconButton, Drawer,
  List, ListItem, ListItemButton, ListItemIcon, ListItemText,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LogoutIcon from '@mui/icons-material/Logout';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
const Login = React.lazy(() => import('./pages/Login'));
const SubmitAttendance = React.lazy(() => import('./pages/SubmitAttendance'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const theme = createTheme({
  palette: {
    primary:   { main: '#000080' }, // Navy
    secondary: { main: '#800000' }, // Maroon
    error:     { main: '#c62828' }, // Darker Red
    success:   { main: '#2e7d32' }, // Darker Green
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
        root: { border: '1px solid #e0e0e0', borderRadius: 16 }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', borderRadius: 8, fontWeight: 600 }
      }
    }
  }
});

// ── NavBar is inside Router so useLocation works ──────────────────────────────
function NavBar({ user, onLogout }) {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

  // Hide the bar entirely on the login page
  if (location.pathname === '/login') return null;

  // Also hide if not logged in (safety net)
  if (!user) return null;

  const drawerItems = (
    <Box sx={{ width: 250 }} role="presentation" onClick={handleDrawerClose} onKeyDown={handleDrawerClose}>
      <Typography variant="h6" sx={{ p: 2, fontWeight: 'bold', color: 'primary.main' }}>
        AGS - Prestige Campus
      </Typography>
      <List>
        <ListItem disablePadding>
          <ListItemButton component={Link} to="/submit-attendance">
            <ListItemIcon><AssignmentIcon /></ListItemIcon>
            <ListItemText primary="Submit Roll Call" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={Link} to="/dashboard">
            <ListItemIcon><DashboardIcon /></ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={onLogout}>
            <ListItemIcon><LogoutIcon /></ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

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
            <IconButton color="inherit" aria-label="open drawer" edge="end" onClick={handleDrawerToggle}>
              <MenuIcon />
            </IconButton>
          ) : (
            <Box>
              <Button color="inherit" component={Link} to="/submit-attendance">
                Submit Roll Call
              </Button>
              <Button color="inherit" component={Link} to="/dashboard" sx={{ ml: 1 }}>
                Dashboard
              </Button>
              <Button color="inherit" variant="outlined" onClick={onLogout} sx={{ ml: 2, borderColor: 'rgba(255,255,255,0.6)' }}>
                Logout
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      <Drawer anchor="left" open={drawerOpen} onClose={handleDrawerClose}>
        {drawerItems}
      </Drawer>
    </>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
function App() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

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
        {/* NavBar lives inside Router so useLocation works */}
        <NavBar user={user} onLogout={handleLogout} />

        {/* mt: 8 pushes content below the fixed AppBar (64px height) */}
        <Box sx={{ mt: user ? 8 : 0, p: user ? 3 : 0 }}>
          <Suspense fallback={
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
              <CircularProgress />
            </Box>
          }>
            <Routes>
              <Route
                path="/login"
                element={!user ? <Login /> : <Navigate to="/dashboard" />}
              />
              <Route
                path="/dashboard"
                element={user ? <Dashboard /> : <Navigate to="/login" />}
              />
              <Route
                path="/submit-attendance"
                element={user ? <SubmitAttendance /> : <Navigate to="/login" />}
              />
              <Route
                path="*"
                element={<Navigate to={user ? '/dashboard' : '/login'} />}
              />
            </Routes>
          </Suspense>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;