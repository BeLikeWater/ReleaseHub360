import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  Container,
  ListItemButton,
  Collapse,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  Dashboard as DashboardIcon,
  RocketLaunch as ReleasesIcon,
  Assignment as TodoIcon,
  History as ChangeTrackingIcon,
  BugReport as BugReportIcon,
  Description as ReleaseNotesIcon,
  CalendarMonth as CalendarIcon,
  ExpandLess,
  ExpandMore,
  AccountTree as ReleaseManagementIcon,
  Favorite as HealthIcon,
  Timeline as PipelineIcon,
  Code as DeveloperIcon,
  Send as BetaTagIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [releaseManagementOpen, setReleaseManagementOpen] = useState(false);
  const [developerDashboardOpen, setDeveloperDashboardOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { text: 'Ana Sayfa', icon: <HomeIcon />, path: '/' },
    { text: 'Müşteri Dashboard', icon: <DashboardIcon />, path: '/customer-dashboard' },
    // { text: 'Releases', icon: <ReleasesIcon />, path: '/releases' },
    // { text: 'ToDo Listesi', icon: <TodoIcon />, path: '/todo-list' },
    // { text: 'Değişiklik Takibi', icon: <ChangeTrackingIcon />, path: '/change-tracking' },
    // { text: 'Hata Bildir', icon: <BugReportIcon />, path: '/report-issue' },
    // { text: 'Release Notları', icon: <ReleaseNotesIcon />, path: '/release-notes' },
  ];

  const releaseManagementItems = [
    { text: 'Release Takvimi', icon: <CalendarIcon />, path: '/release-calendar' },
    { text: 'Release Health Check', icon: <HealthIcon />, path: '/release-health-check' },
    { text: 'Pipeline Status', icon: <PipelineIcon />, path: '/pipeline-status' },
    { text: 'Versiyon Yaşam Döngüsü', icon: <PipelineIcon />, path: '/version-lifecycle' },
    { text: 'Hotfix Request Approval', icon: <BugReportIcon />, path: '/hotfix-request-approval' },
  ];

  const developerDashboardItems = [
    { text: 'Beta Tag İsteği', icon: <BetaTagIcon />, path: '/beta-tag-request' },
    { text: 'Hotfix Request', icon: <BugReportIcon />, path: '/hotfix-request' },
  ];

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleReleaseManagementClick = () => {
    setReleaseManagementOpen(!releaseManagementOpen);
  };

  const handleDeveloperDashboardClick = () => {
    setDeveloperDashboardOpen(!developerDashboardOpen);
  };

  const handleMenuClick = (path) => {
    navigate(path);
    setDrawerOpen(false);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={toggleDrawer}
            edge="start"
            sx={{ marginRight: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            Release Hub 360
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer}
        sx={{
          width: 240,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 240,
            boxSizing: 'border-box',
            marginTop: '64px',
          },
        }}
      >
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => handleMenuClick(item.path)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
          
          <Divider sx={{ my: 1 }} />
          
          {/* Release Yönetimi Ana Menü */}
          <ListItem disablePadding>
            <ListItemButton onClick={handleReleaseManagementClick}>
              <ListItemIcon>
                <ReleaseManagementIcon />
              </ListItemIcon>
              <ListItemText primary="Release Yönetimi" />
              {releaseManagementOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
          </ListItem>
          
          {/* Release Yönetimi Alt Menü */}
          <Collapse in={releaseManagementOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {releaseManagementItems.map((item) => (
                <ListItem key={item.text} disablePadding>
                  <ListItemButton
                    sx={{ pl: 4 }}
                    selected={location.pathname === item.path}
                    onClick={() => handleMenuClick(item.path)}
                  >
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.text} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Collapse>

          <Divider sx={{ my: 1 }} />

          {/* Geliştirici Dashboard Ana Menü */}
          <ListItem disablePadding>
            <ListItemButton onClick={handleDeveloperDashboardClick}>
              <ListItemIcon>
                <DeveloperIcon />
              </ListItemIcon>
              <ListItemText primary="Geliştirici Dashboard" />
              {developerDashboardOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
          </ListItem>

          {/* Geliştirici Dashboard Alt Menü */}
          <Collapse in={developerDashboardOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {developerDashboardItems.map((item) => (
                <ListItem key={item.text} disablePadding>
                  <ListItemButton
                    sx={{ pl: 4 }}
                    selected={location.pathname === item.path}
                    onClick={() => handleMenuClick(item.path)}
                  >
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.text} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Collapse>
        </List>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          marginTop: '64px',
          minHeight: 'calc(100vh - 64px)',
          overflowY: 'auto',
          overflowX: 'hidden',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#f1f1f1',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#c1c1c1',
            borderRadius: '4px',
            '&:hover': {
              background: '#a8a8a8',
            },
          },
        }}
      >
        <Container maxWidth="xl" sx={{ p: 3 }}>
          {children}
        </Container>
      </Box>
    </Box>
  );
};

export default Layout;