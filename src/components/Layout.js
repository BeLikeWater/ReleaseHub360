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
  GridOn as MatrixIcon,
  TrackChanges as TrackIcon,
  Link as LinkIcon,
  Business as BusinessIcon,
  Inventory as ProductIcon,
  Settings as SettingsIcon,
  ChecklistRtl as TodoCheckIcon,
  Warning as UrgentIcon,
  AutoAwesome as V2Icon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [customerDashboardOpen, setCustomerDashboardOpen] = useState(false);
  const [customerDashboardV2Open, setCustomerDashboardV2Open] = useState(false);
  const [releaseManagementOpen, setReleaseManagementOpen] = useState(false);
  const [releaseManagementV2Open, setReleaseManagementV2Open] = useState(false);
  const [definitionsOpen, setDefinitionsOpen] = useState(false);
  const [definitionsV2Open, setDefinitionsV2Open] = useState(false);
  const [developerDashboardOpen, setDeveloperDashboardOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { text: 'Ana Sayfa', icon: <HomeIcon />, path: '/' },
  ];

  const customerDashboardItems = [
    { text: 'Dashboard Özet', icon: <DashboardIcon />, path: '/customer-dashboard' },
    { text: 'Release\'ler', icon: <ReleasesIcon />, path: '/releases_old' },
    { text: 'Todo Listesi', icon: <TodoIcon />, path: '/todo-list' },
    { text: 'Değişiklik Takibi', icon: <ChangeTrackingIcon />, path: '/change-tracking' },
    { text: 'Sorun Bildir', icon: <BugReportIcon />, path: '/report-issue' },
    { text: 'Release Notları', icon: <ReleaseNotesIcon />, path: '/release-notes' },
    { text: 'Hotfix Yönetimi', icon: <BugReportIcon />, path: '/hotfix-management' },
    { text: 'Urgent Changes', icon: <UrgentIcon />, path: '/urgent-changes' },
  ];

  const customerDashboardV2Items = [
    { text: 'Müşteri Yönetimi V2', icon: <BusinessIcon />, path: '/customer-management-v2' },
    { text: 'Dashboard Özet V2', icon: <DashboardIcon />, path: '/customer-dashboard-v2' },
  ];

  const definitionsItems = [
    { text: 'Müşteri Yönetimi', icon: <BusinessIcon />, path: '/customer-management' },
    { text: 'Ürün Yönetimi', icon: <ProductIcon />, path: '/product-management' },
    { text: 'Release Takvimi', icon: <CalendarIcon />, path: '/release-calendar' },
    { text: 'Release ToDo Yönetimi', icon: <TodoCheckIcon />, path: '/release-todo-management' },
    { text: 'Urgent Changes Yönetimi', icon: <UrgentIcon />, path: '/urgent-changes-management' },
  ];

  const releaseManagementItems = [
    { text: 'Release Health Check', icon: <HealthIcon />, path: '/release-health-check' },
    { text: 'Release Health Check (Basit)', icon: <HealthIcon />, path: '/release-health-check-simplified' },
    { text: 'Release Health Check v2', icon: <HealthIcon />, path: '/release-health-check-v2' },
    { text: 'Versiyon Yaşam Döngüsü', icon: <PipelineIcon />, path: '/pipeline-status' },
    { text: 'Hotfix Request Approval', icon: <BugReportIcon />, path: '/hotfix-request-approval' },
    { text: 'Müşteri - Servis İlişkilendirme', icon: <LinkIcon />, path: '/customer-service-mapping' },
  ];

  const developerDashboardItems = [
    { text: 'Beta Tag İsteği', icon: <BetaTagIcon />, path: '/beta-tag-request' },
    { text: 'Hotfix Request', icon: <BugReportIcon />, path: '/hotfix-request' },
    { text: 'Servis Versiyon Matrisi', icon: <MatrixIcon />, path: '/service-version-matrix' },
    { text: 'Müşteri Release Takibi', icon: <TrackIcon />, path: '/customer-release-track' },
  ];

  const definitionsV2Items = [
    { text: 'Müşteri Yönetimi', icon: <BusinessIcon />, path: '/customer-management-v2' },
    { text: 'Müşteri - Ürün İlişkilendirme', icon: <LinkIcon />, path: '/customer-product-mapping-v2' },
    { text: 'Ürün Kataloğu', icon: <ProductIcon />, path: '/product-catalog' },
    { text: 'Modül Grubu Yönetimi', icon: <SettingsIcon />, path: '/module-group-management' },
    { text: 'Modül Yönetimi', icon: <SettingsIcon />, path: '/module-management' },
    { text: 'API Yönetimi', icon: <SettingsIcon />, path: '/api-management' },
  ];

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleCustomerDashboardClick = () => {
    setCustomerDashboardOpen(!customerDashboardOpen);
  };

  const handleCustomerDashboardV2Click = () => {
    setCustomerDashboardV2Open(!customerDashboardV2Open);
  };

  const handleReleaseManagementClick = () => {
    setReleaseManagementOpen(!releaseManagementOpen);
  };

  const handleReleaseManagementV2Click = () => {
    setReleaseManagementV2Open(!releaseManagementV2Open);
  };

  const handleDefinitionsClick = () => {
    setDefinitionsOpen(!definitionsOpen);
  };

  const handleDefinitionsV2Click = () => {
    setDefinitionsV2Open(!definitionsV2Open);
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
          width: 280,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 280,
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
                sx={{ py: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText 
                  primary={item.text}
                  primaryTypographyProps={{ fontSize: '0.875rem' }}
                />
              </ListItemButton>
            </ListItem>
          ))}
          
          <Divider sx={{ my: 1 }} />
          
          {/* Müşteri Dashboard Ana Menü */}
          <ListItem disablePadding>
            <ListItemButton onClick={handleCustomerDashboardClick} sx={{ py: 1 }}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <DashboardIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Müşteri Dashboard" 
                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 600 }}
              />
              {customerDashboardOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
          </ListItem>
          
          {/* Müşteri Dashboard Alt Menü */}
          <Collapse in={customerDashboardOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {customerDashboardItems.map((item) => (
                <ListItem key={item.text} disablePadding>
                  <ListItemButton
                    sx={{ pl: 3, py: 0.75 }}
                    selected={location.pathname === item.path}
                    onClick={() => handleMenuClick(item.path)}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                    <ListItemText 
                      primary={item.text}
                      primaryTypographyProps={{ fontSize: '0.8125rem' }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Collapse>
          
          <Divider sx={{ my: 1 }} />
          
          {/* Release Yönetimi Ana Menü */}
          <ListItem disablePadding>
            <ListItemButton onClick={handleReleaseManagementClick} sx={{ py: 1 }}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <ReleaseManagementIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Release Yönetimi" 
                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 600 }}
              />
              {releaseManagementOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
          </ListItem>
          
          {/* Release Yönetimi Alt Menü */}
          <Collapse in={releaseManagementOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {/* Tanımlar Alt Menüsü */}
              <ListItem disablePadding>
                <ListItemButton onClick={handleDefinitionsClick} sx={{ pl: 3, py: 0.75 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <SettingsIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Tanımlar" 
                    primaryTypographyProps={{ fontSize: '0.8125rem', fontWeight: 500 }}
                  />
                  {definitionsOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                </ListItemButton>
              </ListItem>
              
              {/* Tanımlar İçeriği */}
              <Collapse in={definitionsOpen} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {definitionsItems.map((item) => (
                    <ListItem key={item.text} disablePadding>
                      <ListItemButton
                        sx={{ pl: 6, py: 0.5 }}
                        selected={location.pathname === item.path}
                        onClick={() => handleMenuClick(item.path)}
                      >
                        <ListItemIcon sx={{ minWidth: 32 }}>{item.icon}</ListItemIcon>
                        <ListItemText 
                          primary={item.text}
                          primaryTypographyProps={{ fontSize: '0.8125rem' }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Collapse>
              
              {/* Diğer Release Yönetimi Öğeleri */}
              {releaseManagementItems.map((item) => (
                <ListItem key={item.text} disablePadding>
                  <ListItemButton
                    sx={{ pl: 3, py: 0.75 }}
                    selected={location.pathname === item.path}
                    onClick={() => handleMenuClick(item.path)}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                    <ListItemText 
                      primary={item.text}
                      primaryTypographyProps={{ fontSize: '0.8125rem' }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Collapse>

          <Divider sx={{ my: 1 }} />

          {/* Release Yönetimi V2 Ana Menü */}
          <ListItem disablePadding>
            <ListItemButton onClick={handleReleaseManagementV2Click} sx={{ py: 1 }}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <V2Icon />
              </ListItemIcon>
              <ListItemText 
                primary="Release Yönetimi V2" 
                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 600 }}
              />
              {releaseManagementV2Open ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
          </ListItem>

          {/* Release Yönetimi V2 Alt Menü */}
          <Collapse in={releaseManagementV2Open} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {/* Release Health Check V2 - Doğrudan Release Yönetimi V2 altında */}
              <ListItem disablePadding>
                <ListItemButton
                  sx={{ pl: 3, py: 0.75 }}
                  selected={location.pathname === '/release-health-check-v2'}
                  onClick={() => handleMenuClick('/release-health-check-v2')}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <HealthIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Release Health Check V2"
                    primaryTypographyProps={{ fontSize: '0.8125rem' }}
                  />
                </ListItemButton>
              </ListItem>

              {/* Tanımlar Alt Menüsü */}
              <ListItem disablePadding>
                <ListItemButton onClick={handleDefinitionsV2Click} sx={{ pl: 3, py: 0.75 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <SettingsIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Tanımlar" 
                    primaryTypographyProps={{ fontSize: '0.8125rem', fontWeight: 500 }}
                  />
                  {definitionsV2Open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                </ListItemButton>
              </ListItem>
              
              {/* Tanımlar İçeriği */}
              <Collapse in={definitionsV2Open} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {/* Release Calendar V3 */}
                  <ListItem disablePadding>
                    <ListItemButton
                      sx={{ pl: 6, py: 0.5 }}
                      selected={location.pathname === '/release-calendar-v3'}
                      onClick={() => handleMenuClick('/release-calendar-v3')}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CalendarIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Release Calendar V3"
                        primaryTypographyProps={{ fontSize: '0.8125rem' }}
                      />
                    </ListItemButton>
                  </ListItem>
                  
                  {definitionsV2Items.map((item) => (
                    <ListItem key={item.text} disablePadding>
                      <ListItemButton
                        sx={{ pl: 6, py: 0.5 }}
                        selected={location.pathname === item.path}
                        onClick={() => handleMenuClick(item.path)}
                      >
                        <ListItemIcon sx={{ minWidth: 32 }}>{item.icon}</ListItemIcon>
                        <ListItemText 
                          primary={item.text}
                          primaryTypographyProps={{ fontSize: '0.8125rem' }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            </List>
          </Collapse>

          <Divider sx={{ my: 1 }} />

          {/* Müşteri Dashboard V2 Ana Menü */}
          <ListItem disablePadding>
            <ListItemButton onClick={handleCustomerDashboardV2Click} sx={{ py: 1 }}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <V2Icon />
              </ListItemIcon>
              <ListItemText 
                primary="Müşteri Dashboard V2" 
                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 600 }}
              />
              {customerDashboardV2Open ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
          </ListItem>

          {/* Müşteri Dashboard V2 Alt Menü */}
          <Collapse in={customerDashboardV2Open} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {customerDashboardV2Items.map((item) => (
                <ListItem key={item.text} disablePadding>
                  <ListItemButton
                    sx={{ pl: 3, py: 0.75 }}
                    selected={location.pathname === item.path}
                    onClick={() => handleMenuClick(item.path)}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                    <ListItemText 
                      primary={item.text}
                      primaryTypographyProps={{ fontSize: '0.8125rem' }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Collapse>

          <Divider sx={{ my: 1 }} />

          {/* Geliştirici Dashboard Ana Menü */}
          <ListItem disablePadding>
            <ListItemButton onClick={handleDeveloperDashboardClick} sx={{ py: 1 }}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <DeveloperIcon />
              </ListItemIcon>
              <ListItemText 
                primary="Geliştirici Dashboard" 
                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 600 }}
              />
              {developerDashboardOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItemButton>
          </ListItem>

          {/* Geliştirici Dashboard Alt Menü */}
          <Collapse in={developerDashboardOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {developerDashboardItems.map((item) => (
                <ListItem key={item.text} disablePadding>
                  <ListItemButton
                    sx={{ pl: 3, py: 0.75 }}
                    selected={location.pathname === item.path}
                    onClick={() => handleMenuClick(item.path)}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                    <ListItemText 
                      primary={item.text}
                      primaryTypographyProps={{ fontSize: '0.8125rem' }}
                    />
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