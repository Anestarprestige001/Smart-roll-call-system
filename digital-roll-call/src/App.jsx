import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SubmitAttendance from './pages/SubmitAttendance';
import Profile from './pages/Profile';
import PendingApproval from './pages/PendingApproval';
import ClassRosterManagement from './pages/ClassRosterManagement';
import TermManagement from './pages/TermManagement';
import KitchenRecords from './pages/KitchenRecords';
import AppLayout from './components/AppLayout';
import { Box, CircularProgress, Typography } from '@mui/material';

// Placeholder for Stats Page
function StatsPlaceholder() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5">Stats Dashboard</Typography>
      <Typography>Coming Soon</Typography>
    </Box>
  );
}

function ProtectedRoute({ user, userStatus, userRole }) {
  if (user === null) {
    return <Navigate to="/login" replace />;
  }

  if (userStatus === 'pending') {
    return <PendingApproval />;
  }

  if (userStatus === 'active' && userRole) {
    return (
      <AppLayout userRole={userRole}>
        <Outlet />
      </AppLayout>
    );
  }

  // Loading state while user data is being fetched
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <CircularProgress />
    </Box>
  );
}

export default function App() {
  const [user, setUser] = useState(undefined);
  const [userStatus, setUserStatus] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const unsubSnapshot = onSnapshot(userDocRef, (snapshot) => {
          const data = snapshot.data();
          setUserStatus(data?.status || null);
          setUserRole(data?.role || null);
        });
        return () => unsubSnapshot();
      } else {
        setUserStatus(null);
        setUserRole(null);
      }
    });
    return () => unsubscribe();
  }, []);

  if (user === undefined) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute user={user} userStatus={userStatus} userRole={userRole} />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/submit-attendance" element={<SubmitAttendance />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/term-management" element={<TermManagement />} />
          <Route path="/stats" element={<StatsPlaceholder />} />
          <Route path="/kitchen-records" element={<KitchenRecords />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
