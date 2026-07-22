import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Alert, Tabs, Tab } from '@mui/material';
import { onSnapshot, doc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import TermAdminView from '../components/term/TermAdminView';
import StaffManagementView from '../components/term/StaffManagementView';
import ReadOnlyTermView from '../components/term/ReadOnlyTermView';
import ClassRosterView from '../components/term/ClassRosterView';
import DirectorKitchenView from '../components/term/DirectorKitchenView';


function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function TermManagement() {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    if (!auth.currentUser) {
      setError('You must be logged in to view this page.');
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'users', auth.currentUser.uid),
      (snap) => {
        if (snap.exists()) {
          setUserRole(snap.data()?.role || null);
        } else {
          setError('User profile not found.');
        }
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load user role:", err);
        setError('Failed to load user permissions.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
  }

  const renderRoleView = () => {
    switch (userRole) {
      case 'ADMIN':
        // Admin: Term date editor + Progress Bar + Calendar Event Manager (Trips, Holidays, Breaks)
        return <TermAdminView />;

      case 'ICT COORDINATOR':
        // ICT Coordinator: Pending & Approved teacher list + roster oversight
        return <StaffManagementView />;

      case 'DIRECTOR':
     // Director: Read view into calendar events, class rosters, and kitchen records
     return (
       <Box>
         <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
           <Tab label="School Events & Calendar" />
           <Tab label="Class Rosters Overview" />
           <Tab label="Kitchen Inventory Records" />
         </Tabs>
         <TabPanel value={tabValue} index={0}>
           <ReadOnlyTermView />
         </TabPanel>
         <TabPanel value={tabValue} index={1}>
           <ClassRosterView />
         </TabPanel>
         <TabPanel value={tabValue} index={2}>
           <DirectorKitchenView />
         </TabPanel>
       </Box>
     );

      case 'CLASS TEACHER':
      case 'TEACHER':
      default:
        // Class Teacher: Sees Term Dates & Events + can manage their assigned class roster
        return (
          <Box>
            <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
              <Tab label="Term Info & School Calendar" />
              <Tab label="My Class Roster Baseline" />
            </Tabs>
            <TabPanel value={tabValue} index={0}>
              <ReadOnlyTermView />
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
              <ClassRosterView />
            </TabPanel>
          </Box>
        );
    }
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" color="primary.main" fontWeight="bold" gutterBottom>
        Term & Calendar Management
      </Typography>
      {renderRoleView()}
    </Box>
  );
}