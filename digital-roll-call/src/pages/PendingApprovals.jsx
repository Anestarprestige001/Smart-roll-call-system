import React, { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Stack, Alert, FormControl, InputLabel, Select, MenuItem,
  Button, CircularProgress, Chip
} from '@mui/material';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { getAssignableRoles } from '../rolePermissions';
import { getClassesCollectionRef, normalizeClassOptions } from '../constants/classes';

const ROLE_OPTIONS = ['ADMIN', 'CLASS TEACHER', 'SCHOOL MANAGER'];

export default function PendingApprovals() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState({});
  const [selectedClasses, setSelectedClasses] = useState({});
  const [classes, setClasses] = useState([]);
  const [approvingId, setApprovingId] = useState(null);
  const [approvalError, setApprovalError] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'users'), where('status', '==', 'pending'));
    const unsubscribeUsers = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
      setLoading(false);
    });

    const unsubscribeClasses = onSnapshot(getClassesCollectionRef(db), (snap) => {
      setClasses(normalizeClassOptions(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))));
    });

    return () => {
      unsubscribeUsers();
      unsubscribeClasses();
    };
  }, []);

  const handleRoleChange = (userId, role) => {
    setSelectedRoles((prev) => ({ ...prev, [userId]: role }));
    if (role !== 'CLASS TEACHER') {
      setSelectedClasses((prev) => ({ ...prev, [userId]: '' }));
    }
  };

  const handleClassChange = (userId, classId) => {
    setSelectedClasses((prev) => ({ ...prev, [userId]: classId }));
  };

  const handleApprove = async (user) => {
    const role = selectedRoles[user.id] || 'ADMIN';
    const classId = role === 'CLASS TEACHER' ? (selectedClasses[user.id] || '') : null;
    if (role === 'CLASS TEACHER' && !classId) {
      return;
    }

    const assignable = getAssignableRoles('ICT COORDINATOR');
    if (!assignable.includes(role)) {
      setSelectedRoles((prev) => ({ ...prev, [user.id]: '' }));
      return;
    }

    setApprovingId(user.id);
    setApprovalError('');
    try {
      await updateDoc(doc(db, 'users', user.id), {
        role,
        classId: role === 'CLASS TEACHER' ? (classId || null) : null,
        status: 'active',
      });
    } catch (error) {
      console.error('Approve error:', error);
      const friendlyMessage = error?.code === 'permission-denied'
        ? 'You lack clearance for this role.'
        : error?.message || 'Unable to approve this user right now.';
      setApprovalError(friendlyMessage);
    } finally {
      setApprovingId(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 980, mx: 'auto', p: { xs: 2, md: 4 } }}>
      <Typography variant="h4" color="primary.main" fontWeight="bold" gutterBottom>
        Pending approvals
      </Typography>
      {approvalError && (
        <Alert severity="error" sx={{ mb: 2 }}>{approvalError}</Alert>
      )}
      {users.length === 0 ? (
        <Alert severity="info">No pending users right now.</Alert>
      ) : (
        <Stack spacing={2}>
          {users.map((user) => (
            <Card key={user.id}>
              <CardContent>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' } }}>
                  <Box>
                    <Typography variant="h6">{user.name || user.email}</Typography>
                    <Typography color="text.secondary">{user.email}</Typography>
                    <Chip label="Pending" color="warning" size="small" sx={{ mt: 1 }} />
                  </Box>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ minWidth: { md: 360 } }}>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                      <InputLabel>Role</InputLabel>
                      <Select
                        value={selectedRoles[user.id] || ''}
                        label="Role"
                        onChange={(event) => handleRoleChange(user.id, event.target.value)}
                      >
                        {ROLE_OPTIONS.filter((option) => getAssignableRoles('ICT COORDINATOR').includes(option)).map((option) => (
                          <MenuItem key={option} value={option}>{option}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {(selectedRoles[user.id] || '') === 'CLASS TEACHER' && (
                      <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Class</InputLabel>
                        <Select
                          value={selectedClasses[user.id] || ''}
                          label="Class"
                          onChange={(event) => handleClassChange(user.id, event.target.value)}
                        >
                          <MenuItem value="">Select class</MenuItem>
                          {classes.map((classItem) => (
                            <MenuItem key={classItem.id} value={classItem.id}>{classItem.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                    <Button variant="contained" onClick={() => handleApprove(user)} disabled={approvingId === user.id}>
                      {approvingId === user.id ? <CircularProgress size={20} /> : 'Approve'}
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
