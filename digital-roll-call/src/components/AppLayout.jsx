import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import {
  AppBar, Box, CssBaseline, Drawer, Toolbar, useMediaQuery, useTheme,
  List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  BottomNavigation, BottomNavigationAction, Typography, Avatar, Divider, Dialog, IconButton,
  Badge, Stack
} from '@mui/material';
import {
  Home as HomeIcon,
  Person as ProfileIcon,
  Book as TermsIcon,
  Add as AddIcon,
  Notifications as NotificationsIcon,
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  FavoriteBorder as WelfareIcon,
} from '@mui/icons-material';
import { auth, db } from '../firebase';
import { normalizeRole } from '../rolePermissions';

const drawerWidth = 240;

const NAV_ITEMS = {
  HOME: { text: 'Home', icon: <HomeIcon />, path: '/' },
  TERM_MANAGEMENT: { text: 'Term Management', icon: <TermsIcon />, path: '/term-management' },
  PLUS: { text: 'Submit Attendance', icon: <AddIcon />, path: '/submit-attendance' },
  PLUS_INVENTORY: { text: 'Add Inventory', icon: <AddIcon />, path: '/kitchen-records' },
  PROFILE: { text: 'Profile', icon: <ProfileIcon />, path: '/profile' },
  WELFARE: { text: 'Welfare', icon: <WelfareIcon />, path: '/welfare' },
};

function formatNotificationDate(value) {
  if (!value) {
    return '';
  }
  if (value.toDate) {
    return value.toDate().toLocaleString();
  }
  if (value.seconds) {
    return new Date(value.seconds * 1000).toLocaleString();
  }
  return '';
}

function NotificationPanel({ onClose, notifications, onSelectNotification }) {
  return (
    <Box sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h6" fontWeight="700">Notifications</Typography>
        {onClose && (
          <IconButton onClick={onClose} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
      <Divider sx={{ mb: 2 }} />
      {notifications.length === 0 ? (
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
          <NotificationsIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
          <Typography variant="body2">No new notifications</Typography>
        </Box>
      ) : (
        <List disablePadding sx={{ overflowY: 'auto' }}>
          {notifications.map((item) => (
            <ListItem key={item.id} disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                onClick={() => onSelectNotification(item.id)}
                sx={{ borderRadius: 2, bgcolor: item.read ? 'transparent' : 'action.hover' }}
              >
                <ListItemText
                  primary={item.payload?.title || 'Notification'}
                  secondary={item.payload?.message || formatNotificationDate(item.createdAt)}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}

function AppLayout({ userRole, children }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const normalizedRole = normalizeRole(userRole);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const currentUserUid = auth.currentUser?.uid || null;
    const activeRole = normalizeRole(userRole);

    if (!currentUserUid || !activeRole) {
      setNotifications([]);
      setUnreadCount(0);
      return undefined;
    }

    const recipientKeys = [activeRole, currentUserUid].filter(Boolean);
    const q = query(
      collection(db, 'notifications'),
      where('recipientKeys', 'array-contains-any', recipientKeys),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const nextNotifications = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      setNotifications(nextNotifications);
      setUnreadCount(nextNotifications.filter((item) => !item.read).length);
    }, (error) => {
      console.error('Error loading notifications:', error);
    });

    return () => unsubscribe();
  }, [userRole]);

  const getNavItems = () => {
    if (normalizedRole === 'CLASS TEACHER') {
      return [NAV_ITEMS.HOME, NAV_ITEMS.TERM_MANAGEMENT, NAV_ITEMS.PLUS, NAV_ITEMS.WELFARE, NAV_ITEMS.PROFILE];
    }

    const plusItem = normalizedRole === 'SCHOOL MANAGER' ? NAV_ITEMS.PLUS_INVENTORY : NAV_ITEMS.PLUS;
    return [NAV_ITEMS.HOME, NAV_ITEMS.TERM_MANAGEMENT, plusItem, NAV_ITEMS.WELFARE, NAV_ITEMS.PROFILE];
  };

  const navItems = getNavItems();

  const handleNavigation = (path) => {
    if (path === '/welfare') {
      navigate('/welfare');
      return;
    }
    if (path === '/notifications') {
      if (isDesktop) {
        setNotificationsOpen(true);
      } else {
        navigate('/notifications');
      }
      return;
    }
    navigate(path);
  };

  const handleBellClick = () => {
    if (isDesktop) {
      setNotificationsOpen(true);
      return;
    }
    navigate('/notifications');
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleBellClose = () => {
    setNotificationsOpen(false);
  };

  const handleNotificationSelect = async (notificationId) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { read: true });
      handleBellClose();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  if (isDesktop) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <CssBaseline />

        {/* TOP HEADER */}
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: 'background.paper', color: 'text.primary' }} elevation={1}>
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight="700" color="primary">Smart Roll Call</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton color="inherit" onClick={handleBellClick} aria-label="Open notifications">
                <Badge badgeContent={unreadCount} color="error" overlap="circular" invisible={unreadCount === 0}>
                  <NotificationsIcon />
                </Badge>
              </IconButton>
              <Avatar sx={{ bgcolor: 'primary.main', width: 34, height: 34, fontSize: '0.875rem' }}>
                {userRole ? userRole.charAt(0) : 'U'}
              </Avatar>
            </Stack>
          </Toolbar>
        </AppBar>

        {/* LEFT DRAWER */}
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
          }}
        >
          <Toolbar />
          <Box sx={{ overflow: 'auto' }}>
            <List>
              {navItems.map((item) => (
                <ListItem key={item.text} disablePadding>
                  <ListItemButton
                    selected={location.pathname === item.path}
                    onClick={() => handleNavigation(item.path)}
                  >
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.text} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        </Drawer>

        {/* MIDDLE CONTENT COLUMN */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            minWidth: 0,
            pt: 9,
            pb: 4,
            px: { xs: 1, sm: 1.5, md: 2 },
            width: '100%',
          }}
        >
          <Toolbar />
          {children}
        </Box>

        <Dialog open={notificationsOpen} onClose={handleBellClose} fullWidth maxWidth="sm">
          <NotificationPanel
            onClose={handleBellClose}
            notifications={notifications}
            onSelectNotification={handleNotificationSelect}
          />
        </Dialog>
      </Box>
    );
  }

  // Mobile Layout
  return (
    <Box sx={{ pb: '56px' }}>
      <CssBaseline />
      <AppBar position="fixed" color="inherit" elevation={1} sx={{ top: 0, zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          {location.pathname === '/notifications' ? (
            <>
              <IconButton color="inherit" onClick={handleBack} aria-label="Go back">
                <ArrowBackIcon />
              </IconButton>
              <Typography variant="subtitle1" fontWeight={700} color="text.primary">
                Notifications
              </Typography>
            </>
          ) : (
            <Typography variant="h6" fontWeight={700} color="primary">Smart Roll Call</Typography>
          )}
          <IconButton color="inherit" onClick={handleBellClick} aria-label="Open notifications">
            <Badge badgeContent={unreadCount} color="error" overlap="circular" invisible={unreadCount === 0}>
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 2, pt: 8 }}>
        {children}
      </Box>
      <AppBar position="fixed" color="primary" sx={{ top: 'auto', bottom: 0 }}>
        <Toolbar>
          <BottomNavigation
            showLabels
            value={location.pathname}
            onChange={(event, newValue) => handleNavigation(newValue)}
            sx={{ width: '100%', bgcolor: 'background.paper' }}
          >
            {navItems.map((item) => (
              <BottomNavigationAction key={item.path} label={item.text} value={item.path} icon={item.icon} />
            ))}
          </BottomNavigation>
        </Toolbar>
      </AppBar>

      <Dialog open={notificationsOpen} onClose={handleBellClose} fullWidth maxWidth="sm">
        <NotificationPanel
          onClose={handleBellClose}
          notifications={notifications}
          onSelectNotification={handleNotificationSelect}
        />
      </Dialog>
    </Box>
  );
}

export default AppLayout;