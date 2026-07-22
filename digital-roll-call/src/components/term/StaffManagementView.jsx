import React, { useState } from 'react';
import { Box, Typography, Stack, Tabs, Tab } from '@mui/material';
import PendingApprovals from '../../pages/PendingApprovals';
import ApprovedTeachers from '../../pages/ApprovedTeachers';
import ClassRosterView from './ClassRosterView';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function StaffManagementView() {
  const [tabValue, setTabValue] = useState(0);

  return (
    <Stack spacing={3}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(e, val) => setTabValue(val)} aria-label="ICT Coordinator Management Tabs">
          <Tab label="School Class Rosters" />
          <Tab label="Pending User Approvals" />
          <Tab label="Staff & Teacher Directory" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <ClassRosterView />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <PendingApprovals />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <ApprovedTeachers />
      </TabPanel>
    </Stack>
  );
}