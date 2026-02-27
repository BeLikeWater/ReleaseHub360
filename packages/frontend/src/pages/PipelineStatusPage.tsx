import { useState } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Chip, LinearProgress,
  FormControl, InputLabel, Select, MenuItem, Drawer, IconButton, Divider,
  Alert, Tooltip, Paper,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ArticleIcon from '@mui/icons-material/Article';
import CloseIcon from '@mui/icons-material/Close';
import { useQuery, useMutation } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import apiClient from '@/api/client';

type Pipeline = {
  id: number | string; name: string; folder?: string;
  latestRun?: {
    id: number; result?: string; state: string; createdDate: string;
    finishTime?: string; requestedBy?: { displayName: string };
    sourceBranch?: string;
  };
};

type PipelineLog = { id: string; name: string; log?: string };

function statusChip(state?: string, result?: string) {
  if (state === 'inProgress' || state === 'all') return <Chip label="🔄 Çalışıyor" color="info" size="small" />;
  if (result === 'succeeded') return <Chip label="✅ Başarılı" color="success" size="small" />;
  if (result === 'failed') return <Chip label="🔴 Başarısız" color="error" size="small" />;
  if (result === 'canceled') return <Chip label="⏸ İptal" color="default" size="small" />;
  return <Chip label="⏳ Bekliyor" color="warning" size="small" />;
}

export default function PipelineStatusPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [drawerItem, setDrawerItem] = useState<Pipeline | null>(null);
  const [autoRefresh, _setAutoRefresh] = useState(true);

  const { data, isLoading, error, refetch } = useQuery<{ count: number; value: Pipeline[] }>({
    queryKey: ['tfs-pipelines'],
    queryFn: () => apiClient.get('/tfs/pipelines').then(r => r.data.data ?? r.data),
    refetchInterval: autoRefresh ? 60_000 : false,
    retry: 1,
  });

  const { data: logData } = useQuery<PipelineLog[]>({
    queryKey: ['tfs-pipeline-logs', drawerItem?.id],
    queryFn: () => apiClient.get(`/tfs/pipelines/${drawerItem!.id}/logs`).then(r => r.data.data ?? r.data),
    enabled: !!drawerItem?.id,
  });

  const triggerMutation = useMutation({
    mutationFn: (id: string | number) => apiClient.post(`/tfs/pipelines/${id}/trigger`),
  });

  const pipelines = data?.value ?? [];

  const failed = pipelines.filter(p => p.latestRun?.result === 'failed');
  const running = pipelines.filter(p => p.latestRun?.state === 'inProgress');
  const waiting = pipelines.filter(p => !p.latestRun);
  const success = pipelines.filter(p => p.latestRun?.result === 'succeeded');

  const filtered = pipelines.filter(p => {
    if (statusFilter === 'failed') return p.latestRun?.result === 'failed';
    if (statusFilter === 'running') return p.latestRun?.state === 'inProgress';
    return true;
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Pipeline Durumu</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Durum</InputLabel>
            <Select value={statusFilter} label="Durum" onChange={e => setStatusFilter(e.target.value)}>
              <MenuItem value="">Tüm Servisler</MenuItem>
              <MenuItem value="failed">Sadece Hatalı ({failed.length})</MenuItem>
              <MenuItem value="running">Çalışıyor ({running.length})</MenuItem>
            </Select>
          </FormControl>
          <Button startIcon={<RefreshIcon />} onClick={() => refetch()}>Yenile</Button>
        </Box>
      </Box>

      {/* Summary */}
      {!error && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          {[
            { label: `✅ ${success.length} Başarılı`, color: 'success.main' },
            { label: `🔄 ${running.length} Çalışıyor`, color: 'info.main' },
            { label: `🔴 ${failed.length} Başarısız`, color: 'error.main' },
            { label: `⏳ ${waiting.length} Bekliyor`, color: 'text.secondary' },
          ].map(s => (
            <Typography key={s.label} variant="body2" sx={{ color: s.color, fontWeight: 600 }}>{s.label}</Typography>
          ))}
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>Otomatik yenileme: 1dk</Typography>
        </Box>
      )}

      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      {error && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          TFS bağlantısı kurulamadı. TFS PAT token'inı Ayarlar &gt; Entegrasyonlar bölümünde yapılandırın.
        </Alert>
      )}

      {/* Pipeline Cards */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filtered.length === 0 && !isLoading && !error && (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">Pipeline bulunamadı.</Typography>
          </Paper>
        )}
        {filtered.map(p => (
          <Card key={p.id} variant="outlined" sx={{
            borderColor: p.latestRun?.result === 'failed' ? 'error.main' : 'divider'
          }}>
            <CardContent sx={{ pb: '16px !important' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" fontWeight={700}>{p.name}</Typography>
                  {p.latestRun && (
                    <Typography variant="body2" color="text.secondary">
                      #{p.latestRun.id} · {p.latestRun.sourceBranch?.replace('refs/heads/', '') ?? 'main'} ·
                      {' '}{formatDistanceToNow(new Date(p.latestRun.createdDate), { addSuffix: true, locale: tr })}
                      {p.latestRun.requestedBy?.displayName && ` · ${p.latestRun.requestedBy.displayName}`}
                    </Typography>
                  )}
                  {p.latestRun?.state === 'inProgress' && (
                    <LinearProgress sx={{ mt: 1, maxWidth: 300 }} />
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  {statusChip(p.latestRun?.state, p.latestRun?.result)}
                  <Tooltip title="Log'u Gör">
                    <IconButton size="small" onClick={() => setDrawerItem(p)}><ArticleIcon fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title="Tekrar Tetikle">
                    <IconButton size="small" onClick={() => triggerMutation.mutate(p.id)}
                      disabled={triggerMutation.isPending}>
                      <PlayArrowIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Log Drawer */}
      <Drawer anchor="right" open={!!drawerItem} onClose={() => setDrawerItem(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, p: 3 } }}>
        {drawerItem && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight={700}>{drawerItem.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Build #{drawerItem.latestRun?.id ?? '—'} Logları
                </Typography>
              </Box>
              <IconButton onClick={() => setDrawerItem(null)}><CloseIcon /></IconButton>
            </Box>
            <Divider sx={{ mb: 2 }} />
            {logData ? (
              <Box component="pre" sx={{
                bgcolor: '#1e1e1e', color: '#d4d4d4', p: 2, borderRadius: 1,
                fontSize: 12, overflow: 'auto', fontFamily: 'monospace', maxHeight: '70vh',
              }}>
                {logData.map(l => l.name).join('\n') || 'Log bulunamadı.'}
              </Box>
            ) : (
              <Typography color="text.secondary">Log yükleniyor...</Typography>
            )}
            <Box sx={{ mt: 2 }}>
              <Button variant="contained" startIcon={<PlayArrowIcon />}
                onClick={() => triggerMutation.mutate(drawerItem.id)} disabled={triggerMutation.isPending}>
                Tekrar Tetikle
              </Button>
            </Box>
          </>
        )}
      </Drawer>
    </Box>
  );
}


