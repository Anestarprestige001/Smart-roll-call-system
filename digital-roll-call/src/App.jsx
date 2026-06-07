import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, AppBar, Toolbar, Typography, Button, Box, CircularProgress } from '@mui/material';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase'; // We removed db here because we no longer need to fetch user roles!

// Import the new pages you just generated with Gemini
import Login from './pages/Login';
import SubmitAttendance from './pages/SubmitAttendance';
import Dashboard from './pages/Dashboard'; // Renamed from AdminDashboard

const theme = createTheme({
  palette: {
    primary: {
      main: '#000080', // Navy Blue
    },
    secondary: {
      main: '#800000', // Maroon
    },
    error: {
      main: '#FF0000', // Red
    },
  },
});

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Simplified Authentication: Just check if they are logged in with Google
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
          <CircularProgress color="primary" />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AppBar position="static" color="primary">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              AGS - Prestige Campus Digital Roll Call
            </Typography>
            
            {/* If the user is logged in, show them the navigation menu */}
            {user && (
              <>
                <Button color="inherit" component={Link} to="/submit-attendance">
                  Submit Roll Call
                </Button>
                <Button color="inherit" component={Link} to="/dashboard">
                  Dashboard
                </Button>
                <Button 
                  color="inherit" 
                  onClick={handleLogout} 
                  sx={{ ml: 2, border: '1px solid rgba(255,255,255,0.5)' }}
                >
                  Logout
                </Button>
              </>
            )}
          </Toolbar>
        </AppBar>

        <Box sx={{ p: 3 }}>
          <Routes>
            {/* Login Route */}
            <Route 
              path="/login" 
              element={!user ? <Login /> : <Navigate to="/dashboard" />} 
            />
            
            {/* Protected Dashboard Route */}
            <Route 
              path="/dashboard" 
              element={user ? <Dashboard /> : <Navigate to="/login" />} 
            />
            
            {/* Protected Submit Attendance Route */}
            <Route 
              path="/submit-attendance" 
              element={user ? <SubmitAttendance /> : <Navigate to="/login" />} 
            />
            
            {/* Catch-all: Redirect unknown URLs to dashboard or login */}
            <Route 
              path="*" 
              element={<Navigate to={user ? "/dashboard" : "/login"} />} 
            />
          </Routes>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;