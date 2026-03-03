import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Tabs, Tab, Button, List, ListItem, ListItemText,
  ListItemIcon, Chip, CircularProgress, Stack, Paper, Divider,
  Badge,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  DoneAll as DoneAllIcon,
  Notifications as BellIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';

interface Notification {
  id: string;
  type: 'ACTION_REQUIRED' | 'WARNING' | 'INFO' | 'SUCCESS';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  linkUrl?: string | null;
}

const typeIcon = (type: Notification['type']) => {
  const map = {
    ACTION_REQUIRED: <ErrorIcon color="error" />,
    WARNING: <WarningIcon color="warning" />,
    INFO: <InfoIcon color="info" />,
    SUCCESS: <SuccessIcon color="success" />,
  };
  return map[type] ?? <InfoIcon />;
};

const typeColor = (type: Notification['type']) => {
  const map: Record<string, 'error' | 'warning' | 'info' | 'success'> = {
    ACTION_REQUIRED: 'error', WARNING: 'warning', INFO: 'info', SUCCESS: 'success',
  };
  return map[type] ?? 'info';
};

const typeLabel = (type: Notification['type']) => {
  const map = {
    ACTION_REQUIRED: 'Aksiyon Gerekli', WARNING: 'Uyarı', INFO: 'Bilgi', SUCCESS: 'Başarı',
  };
  return map[type] ?? type;
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} dk önce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} sa önce`;
  return `${Math.floor(hrs / 24)} gün önce`;
}

function groupByDate(notifications: Notification[]) {
  const groups: Record<string, Notification[]> = {};
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  for (const n of notifications) {
    const d = new Date(n.createdAt).toDateString();
    const label = d === today ? 'Bugün' : d === yesterday ? 'Dün' : 'Daha Eski';
    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  }
  return groups;
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((r) => r.data.data ?? r.data),
  });

  const readMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const readAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const actionCount = notifications.filter((n) => n.type === 'ACTION_REQUIRED').length;

  const filtered = useMemo(() => {
    if (tab === 1) return notifications.filter((n) => !n.isRead);
    if (tab === 2) return notifications.filter((n) => n.type === 'ACTION_REQUIRED');
    if (tab === 3) return notifications.filter((n) => n.type !== 'ACTION_REQUIRED');
    return notifications;
  }, [notifications, tab]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);
  const groupOrder = ['Bugün', 'Dün', 'Daha Eski'];

  return (
    <Box p={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={700}>Bildirimler</Typography>
        <Button
          variant="outlined"
          startIcon={<DoneAllIcon />}
          disabled={unreadCount === 0 || readAllMutation.isPending}
          onClick={() => readAllMutation.mutate()}
        >
          Tümünü Okundu İşaretle
        </Button>
      </Stack>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label={`Tümü (${notifications.length})`} />
        <Tab
          label={
            <Badge badgeContent={unreadCount} color="error" sx={{ pr: 1 }}>
              Okunmamış
            </Badge>
          }
        />
        <Tab
          label={
            <Badge badgeContent={actionCount} color="error" sx={{ pr: 1 }}>
              Aksiyon Gerekli
            </Badge>
          }
        />
        <Tab label="Sistem" />
      </Tabs>

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
      ) : filtered.length === 0 ? (
        <Box display="flex" flexDirection="column" alignItems="center" py={8} gap={2}>
          <BellIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
          <Typography color="text.secondary">Bildirim bulunamadı</Typography>
        </Box>
      ) : (
        <Paper variant="outlined">
          {groupOrder
            .filter((g) => grouped[g]?.length)
            .map((groupLabel, groupIdx) => (
              <Box key={groupLabel}>
                {groupIdx > 0 && <Divider />}
                <Box px={2} py={1} sx={{ bgcolor: 'action.hover' }}>
                  <Typography variant="caption" fontWeight={600} color="text.secondary">
                    ── {groupLabel} ──
                  </Typography>
                </Box>
                <List disablePadding>
                  {grouped[groupLabel].map((n, idx) => (
                    <Box key={n.id}>
                      {idx > 0 && <Divider />}
                      <ListItem
                        alignItems="flex-start"
                        sx={{
                          bgcolor: n.isRead ? 'transparent' : 'action.selected',
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'action.hover' },
                          transition: 'background-color 0.15s',
                        }}
                        onClick={() => {
                          if (!n.isRead) readMutation.mutate(n.id);
                          if (n.linkUrl) navigate(n.linkUrl);
                        }}
                      >
                        <ListItemIcon sx={{ mt: 0.5, minWidth: 40 }}>
                          {typeIcon(n.type)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="body2" fontWeight={n.isRead ? 400 : 600}>
                                {n.title}
                              </Typography>
                              <Chip
                                size="small"
                                label={typeLabel(n.type)}
                                color={typeColor(n.type)}
                                variant="outlined"
                                sx={{ height: 18, fontSize: 10 }}
                              />
                              {!n.isRead && (
                                <Box
                                  sx={{
                                    width: 8, height: 8, borderRadius: '50%',
                                    bgcolor: 'primary.main', ml: 0.5,
                                  }}
                                />
                              )}
                            </Stack>
                          }
                          secondary={
                            <Stack spacing={0.5} mt={0.5}>
                              <Typography variant="body2" color="text.secondary">
                                {n.message}
                              </Typography>
                              <Typography variant="caption" color="text.disabled">
                                {timeAgo(n.createdAt)}
                              </Typography>
                            </Stack>
                          }
                        />
                      </ListItem>
                    </Box>
                  ))}
                </List>
              </Box>
            ))}
        </Paper>
      )}
    </Box>
  );
}
