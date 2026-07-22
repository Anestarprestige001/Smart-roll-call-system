import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Box, CssBaseline, Drawer, Toolbar, useMediaQuery, useTheme,
  List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  BottomNavigation, BottomNavigationAction, Typography, Avatar, Divider, Dialog, IconButton
} from '@mui/material';
import {
  Home as HomeIcon,
  Person as ProfileIcon,
  Book as TermsIcon,
  Add as AddIcon,
  Notifications as NotificationsIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { normalizeRole } from '../rolePermissions';

const drawerWidth = 240;
const rightDrawerWidth = 320;

const NAV_ITEMS = {
  HOME: { text: 'Home', icon: <HomeIcon />, path: '/' },
  TERM_MANAGEMENT: { text: 'Term Management', icon: <TermsIcon />, path: '/term-management' },
  PLUS: { text: 'Submit Attendance', icon: <AddIcon />, path: '/submit-attendance' },
  PLUS_INVENTORY: { text: 'Add Inventory', icon: <AddIcon />, path: '/kitchen-records' },
  PROFILE: { text: 'Profile', icon: <ProfileIcon />, path: '/profile' },
  NOTIFICATIONS: { text: 'Notifications', icon: <NotificationsIcon />, path: '/notifications' },
};

// Notifications Panel Component
function NotificationPanel({ onClose }) {
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
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
        <NotificationsIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
        <Typography variant="body2">No new notifications</Typography>
      </Box>
    </Box>
  );
}

function AppLayout({ userRole, children }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg'));
  const navigate = useNavigate();
  const location = useLocation();
  const normalizedRole = normalizeRole(userRole);

  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const getNavItems = () => {
    if (normalizedRole === 'CLASS TEACHER') {
      return [NAV_ITEMS.HOME, NAV_ITEMS.TERM_MANAGEMENT,  NAV_ITEMS.PLUS, NAV_ITEMS.NOTIFICATIONS, NAV_ITEMS.PROFILE];
    }

    const plusItem = normalizedRole === 'SCHOOL MANAGER' ? NAV_ITEMS.PLUS_INVENTORY : NAV_ITEMS.PLUS;
    return [NAV_ITEMS.HOME, NAV_ITEMS.TERM_MANAGEMENT, plusItem, NAV_ITEMS.NOTIFICATIONS, NAV_ITEMS.PROFILE];
  };

  const navItems = getNavItems();

  const handleNavigation = (path) => {
    if (path === '/notifications') {
      setNotificationsOpen(true);
      return;
    }
    navigate(path);
  };

  if (isDesktop) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <CssBaseline />

        {/* TOP HEADER */}
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: 'background.paper', color: 'text.primary' }} elevation={1}>
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight="700" color="primary">Smart Roll Call</Typography>
            <Avatar sx={{ bgcolor: 'primary.main', width: 34, height: 34, fontSize: '0.875rem' }}>
              {userRole ? userRole.charAt(0) : 'U'}
            </Avatar>
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
            px: { xs: 1.5, sm: 2 },
            width: '100%',
          }}
        >
          <Toolbar />
          {children}
        </Box>

        {/* RIGHT DRAWER (PERMANENT ON LARGE SCREENS) */}
        {isLargeScreen && (
          <Drawer
            variant="permanent"
            anchor="right"
            sx={{
              width: rightDrawerWidth,
              flexShrink: 0,
              [`& .MuiDrawer-paper`]: { width: rightDrawerWidth, boxSizing: 'border-box' },
            }}
          >
            <Toolbar />
            <NotificationPanel />
          </Drawer>
        )}
      </Box>
    );
  }

  // Mobile Layout
  return (
    <Box sx={{ pb: '56px' }}>
      <CssBaseline />
      <Box sx={{ p: 2 }}>
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

      <Dialog open={notificationsOpen} onClose={() => setNotificationsOpen(false)}>
        <NotificationPanel onClose={() => setNotificationsOpen(false)} />
      </Dialog>
    </Box>
  );
}

export default AppLayout;