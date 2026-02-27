import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography, IconButton, Badge, Avatar } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import Sidebar from './Sidebar';
import { useAuthStore } from '@/store/authStore';

const DRAWER_WIDTH = 260;

export default function Layout() {
  const user = useAuthStore((s) => s.user);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{ zIndex: (t) => t.zIndex.drawer + 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', color: 'text.primary' }}
      >
        <Toolbar>
          <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1 }}>
            ReleaseHub<span style={{ color: '#1976d2' }}>360</span>
          </Typography>
          <IconButton>
            <Badge badgeContent={4} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          <Avatar sx={{ ml: 1, bgcolor: 'primary.main', width: 34, height: 34, fontSize: 14 }}>
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </Avatar>
        </Toolbar>
      </AppBar>

      <Sidebar
        drawerWidth={DRAWER_WIDTH}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <Box component="main" sx={{ flexGrow: 1, ml: `${DRAWER_WIDTH}px`, mt: '64px', p: 3 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
