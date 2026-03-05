import { NavLink, useNavigate } from 'react-router-dom';
import {
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Divider, Typography, Box, Tooltip, Chip,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import InventoryIcon from '@mui/icons-material/Inventory';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import ArticleIcon from '@mui/icons-material/Article';
import BugReportIcon from '@mui/icons-material/BugReport';
import PeopleIcon from '@mui/icons-material/People';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import TableChartIcon from '@mui/icons-material/TableChart';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import WarningIcon from '@mui/icons-material/Warning';
import ChecklistIcon from '@mui/icons-material/Checklist';
import FlagIcon from '@mui/icons-material/Flag';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SettingsIcon from '@mui/icons-material/Settings';
import HistoryIcon from '@mui/icons-material/History';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuthStore } from '@/store/authStore';

// roles: which ORG roles can see this item. undefined = all ORG roles.
// CUSTOMER users see a separate minimal set.
interface NavItem { label: string; to: string; icon: React.ReactNode; roles?: string[] }
interface NavGroup { title: string; items: NavItem[]; roles?: string[] }

const navGroups: NavGroup[] = [
  {
    title: 'Genel Bakış',
    items: [
      { label: 'Dashboard', to: '/', icon: <DashboardIcon /> },
      { label: 'Release Health Check', to: '/release-health-check', icon: <HealthAndSafetyIcon /> },
      { label: 'Release Calendar', to: '/release-calendar', icon: <CalendarMonthIcon /> },
      { label: 'Notifications', to: '/notifications', icon: <NotificationsIcon /> },
    ],
  },
  {
    title: 'Ürün & Sürüm',
    items: [
      { label: 'Product Catalog', to: '/product-catalog', icon: <InventoryIcon /> },
      { label: 'Releases', to: '/releases', icon: <RocketLaunchIcon /> },
      { label: 'Release Notes', to: '/release-notes', icon: <ArticleIcon /> },
      { label: 'Release Todos', to: '/release-todos', icon: <ChecklistIcon /> },
    ],
  },
  {
    title: 'Değişiklik & Takip',
    roles: ['ADMIN', 'RELEASE_MANAGER', 'PRODUCT_OWNER', 'DEVELOPER', 'DEVOPS_ENGINEER', 'QA_ENGINEER'],
    items: [
      { label: 'Hotfix Merkezi', to: '/hotfix-merkezi', icon: <BugReportIcon /> },
      { label: 'Urgent Changes', to: '/urgent-changes', icon: <WarningIcon />, roles: ['ADMIN', 'RELEASE_MANAGER'] },
      { label: 'Change Tracking', to: '/change-tracking', icon: <TrackChangesIcon /> },
      { label: 'Pipeline Status', to: '/pipeline-status', icon: <AccountTreeIcon />, roles: ['ADMIN', 'RELEASE_MANAGER', 'DEVOPS_ENGINEER'] },
      { label: 'Code Sync', to: '/code-sync', icon: <SyncAltIcon />, roles: ['ADMIN', 'RELEASE_MANAGER', 'DEVOPS_ENGINEER'] },
      { label: 'Workflow History', to: '/workflow-history', icon: <HistoryIcon /> },
    ],
  },
  {
    title: 'Müşteri',
    roles: ['ADMIN', 'RELEASE_MANAGER', 'PRODUCT_OWNER'],
    items: [
      { label: 'Customer Management', to: '/customer-management', icon: <PeopleIcon /> },
      { label: 'Customer Dashboard', to: '/customer-dashboard', icon: <AccountCircleIcon /> },
      { label: 'Service Version Matrix', to: '/service-version-matrix', icon: <TableChartIcon /> },
    ],
  },
  {
    title: 'Yönetim',
    items: [
      { label: 'Report Issue', to: '/report-issue', icon: <FlagIcon /> },
      { label: 'Users & Roles', to: '/users-roles', icon: <AdminPanelSettingsIcon />, roles: ['ADMIN'] },
      { label: 'Settings', to: '/settings', icon: <SettingsIcon />, roles: ['ADMIN'] },
    ],
  },
];

// Minimal nav for CUSTOMER users
const customerNavGroups: NavGroup[] = [
  {
    title: 'Genel',
    items: [
      { label: 'Customer Dashboard', to: '/customer-dashboard', icon: <AccountCircleIcon /> },
    ],
  },
];

interface Props { drawerWidth: number; mobileOpen: boolean; onMobileClose: () => void }

export default function Sidebar({ drawerWidth, mobileOpen, onMobileClose }: Props) {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const isCustomer = user?.userType === 'CUSTOMER';
  const userRole = user?.role ?? '';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const groups = isCustomer ? customerNavGroups : navGroups;

  const visibleGroups = groups
    .filter(g => !g.roles || g.roles.includes(userRole))
    .map(g => ({
      ...g,
      items: g.items.filter(item => !item.roles || item.roles.includes(userRole)),
    }))
    .filter(g => g.items.length > 0);

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ px: 2, py: 2.5 }}>
        <Typography variant="subtitle2" color="text.secondary">ReleaseHub360</Typography>
        {isCustomer && user?.customerName && (
          <Chip label={user.customerName} size="small" color="primary" variant="outlined" sx={{ mt: 0.5, fontSize: 10 }} />
        )}
      </Box>
      <Divider />
      <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
        {visibleGroups.map((group) => (
          <Box key={group.title} sx={{ mb: 1 }}>
            <Typography variant="caption" sx={{ px: 2, color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {group.title}
            </Typography>
            <List dense disablePadding>
              {group.items.map((item) => (
                <Tooltip key={item.to} title="" placement="right">
                  <ListItem disablePadding>
                    <ListItemButton
                      component={NavLink}
                      to={item.to}
                      end={item.to === '/'}
                      sx={{
                        mx: 1, borderRadius: 1, mb: 0.25,
                        '&.active': { bgcolor: 'primary.main', color: 'white', '& .MuiListItemIcon-root': { color: 'white' } },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                      <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 13 }} />
                    </ListItemButton>
                  </ListItem>
                </Tooltip>
              ))}
            </List>
          </Box>
        ))}
      </Box>
      <Divider />
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="caption" color="text.secondary" noWrap>
          {user?.name}
          {isCustomer ? ` · Müşteri` : ` · ${userRole}`}
        </Typography>
      </Box>
      <List dense>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout} sx={{ mx: 1, borderRadius: 1 }}>
            <ListItemIcon sx={{ minWidth: 36 }}><LogoutIcon /></ListItemIcon>
            <ListItemText primary="Çıkış Yap" primaryTypographyProps={{ fontSize: 13 }} />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <>
      <Drawer
        variant="permanent"
        sx={{ width: drawerWidth, flexShrink: 0, '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', borderRight: '1px solid', borderColor: 'divider' } }}
        open
      >
        <Box sx={{ mt: '64px' }}>{drawerContent}</Box>
      </Drawer>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: drawerWidth } }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
}

