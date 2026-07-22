import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Box, CssBaseline, Drawer, Fab, Toolbar, useMediaQuery, useTheme,
  List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  BottomNavigation, BottomNavigationAction
} from '@mui/material';
import {
  Home as HomeIcon,
  Person as ProfileIcon,
  BarChart as StatsIcon,
  Book as TermsIcon,
  Add as AddIcon,
  Restaurant as KitchenIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const drawerWidth = 240;

const NAV_ITEMS = {
  HOME: { text: 'Home', icon: <HomeIcon />, path: '/' },
  TERM_MANAGEMENT: { text: 'Terms', icon: <TermsIcon />, path: '/term-management' },
  STATS: { text: 'Stats', icon: <StatsIcon />, path: '/stats' },
  PROFILE: { text: 'Profile', icon: <ProfileIcon />, path: '/profile' },
};

const StyledFab = styled(Fab)({
  position: 'absolute',
  zIndex: 1,
  top: -30,
  left: 0,
  right: 0,
  margin: '0 auto',
});

function AppLayout({ userRole, children }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const navigate = useNavigate();
  const location = useLocation();

 const getNavItems = () => {
  // Always include Terms for everyone (Class Teacher, ICT, Admin, Director, school manager.)
  return [
    NAV_ITEMS.HOME,
    NAV_ITEMS.TERM_MANAGEMENT,
    NAV_ITEMS.STATS,
    NAV_ITEMS.PROFILE,
  ];
};

  const navItems = getNavItems();

  const handleNavigation = (path) => {
    navigate(path);
  };

  const fabAction = userRole === 'SCHOOL MANAGER'
    ? { path: '/kitchen-records', icon: <KitchenIcon /> }
    : { path: '/submit-attendance', icon: <AddIcon /> };

  if (isDesktop) {
    return (
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
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
        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          <Toolbar />
          {children}
        </Box>
      </Box>
    );
  }

  // Mobile Layout
  return (
    <Box sx={{ pb: '56px' }}>
      <CssBaseline />
      {children}
      <AppBar position="fixed" color="primary" sx={{ top: 'auto', bottom: 0 }}>
        <Toolbar>
          <BottomNavigation
            showLabels
            value={location.pathname}
            onChange={(event, newValue) => {
              handleNavigation(newValue);
            }}
            sx={{ width: '100%', bgcolor: 'background.paper' }}
          >
            {navItems.map((item) => (
              <BottomNavigationAction key={item.path} label={item.text} value={item.path} icon={item.icon} />
            ))}
          </BottomNavigation>
          <StyledFab color="secondary" aria-label="add" onClick={() => handleNavigation(fabAction.path)}>
            {fabAction.icon}
          </StyledFab>
        </Toolbar>
      </AppBar>
    </Box>
  );
}

export default AppLayout;
