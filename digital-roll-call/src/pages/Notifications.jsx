import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, Stack, List, ListItem, ListItemButton, ListItemText, Divider } from '@mui/material';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { normalizeRole } from '../rolePermissions';

function formatNotificationDate(value) {
  if (!value) {
    return '';
  }
  if (value.toDate) {
    return value.toDate().toLocaleString();
  }
  return '';
}

function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return undefined;
    }

    const recipientKeys = [normalizeRole(userRole), currentUser.uid].filter(Boolean);
    const q = query(
      collection(db, 'notifications'),
      where('recipientKeys', 'array-contains-any', recipientKeys),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    });

    return () => unsubscribe();
  }, [userRole]);

  useEffect(() => {
    if (!auth.currentUser) {
      return undefined;
    }

    const unsubscribe = onSnapshot(doc(db, 'users', auth.currentUser.uid), (snap) => {
      setUserRole(snap.data()?.role || null);
    });

    return () => unsubscribe();
  }, []);

  const handleSelect = async (notificationId) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Paper sx={{ p: 4, borderRadius: 3 }}>
        <Stack spacing={1.5} alignItems="flex-start">
          <NotificationsOutlinedIcon color="primary" sx={{ fontSize: 40 }} />
          <Typography variant="h5" fontWeight={700}>
            Notifications
          </Typography>
          <Typography color="text.secondary">
            Your latest alerts and follow-ups appear here.
          </Typography>
        </Stack>
        <Divider sx={{ my: 2 }} />
        {notifications.length === 0 ? (
          <Typography color="text.secondary">No notifications yet.</Typography>
        ) : (
          <List disablePadding>
            {notifications.map((item) => (
              <ListItem key={item.id} disablePadding sx={{ mb: 1 }}>
                <ListItemButton onClick={() => handleSelect(item.id)} sx={{ borderRadius: 2, bgcolor: item.read ? 'transparent' : 'action.hover' }}>
                  <ListItemText
                    primary={item.payload?.title || 'Notification'}
                    secondary={item.payload?.message || formatNotificationDate(item.createdAt)}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
}

export default NotificationsPage;
