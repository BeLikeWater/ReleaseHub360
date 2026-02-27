import { useState } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, Drawer, Divider, IconButton, FormControl,
  InputLabel, Select, MenuItem, TablePagination, Tooltip, Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import ReplayIcon from '@mui/icons-material/Replay';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, format } from 'date-fns';
import { tr } from 'date-fns/locale';
import apiClient from '@/api/client';

type WorkflowItem = {
  id: string; workflowType: string; n8nWorkflowId?: string | null;
  triggeredBy?: string | null; status: string; payload?: Record<string, unknown> | null;
  errorMessage?: string | null; createdAt: string; completedAt?: string | null;
};
type Summary = { success: number; failed: number; pending: number };

const TYPE_LABELS: Record<string, string> = {
  'tfs-merge-start': 'TFS Merge Başlatma',
  'approval-response': 'Onay Yanıtı',
  'deployment-trigger': 'Deployment Tetikleme',
  'breaking-change-alert': 'Breaking Change Uyarısı',
  'hotfix-notify': 'Hotfix Bildirimi',
};

function statusChip(status: string) {
  if (status === 'SUCCESS') return <Chip label="✅ Başarılı" color="success" size="small" icon={<CheckCircleIcon />} />;
  if (status === 'FAILED') return <Chip label="🔴 Hata" color="error" size="small" icon={<ErrorIcon />} />;
  return <Chip label="⏳ Bekliyor" color="warning" size="small" icon={<HourglassTopIcon />} />;
}

export default function WorkflowHistoryPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;
  const [drawerItem, setDrawerItem] = useState<WorkflowItem | null>(null);
  const [retrySuccess, setRetrySuccess] = useState<string | null>(null);

  const { data: summary } = useQuery<Summary>({
    queryKey: ['workflow-history-summary'],
    queryFn: () => apiClient.get('/workflow-history/summary').then(r => r.data.data ?? r.data),
    refetchInterval: 30_000,
  });

  const { data: response, isLoading, refetch } = useQuery<{ data: WorkflowItem[]; total: number }>({
    queryKey: ['workflow-history', statusFilter, typeFilter, page],
    queryFn: () => apiClient.get('/workflow-history', {
      params: {
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(typeFilter ? { workflowType: typeFilter } : {}),
        limit: rowsPerPage,
        offset: page * rowsPerPage,
      }
    }).then(r => r.data),
    refetchInterval: 30_000,
  });

  const items = response?.data ?? [];
  const total = response?.total ?? 0;

  const retryMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/workflow-history/${id}/retry`),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['workflow-history'] });
      setRetrySuccess(id);
      setTimeout(() => setRetrySuccess(null), 3000);
    },
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Workflow Geçmişi</Typography>
        <Button startIcon={<RefreshIcon />} onClick={() => refetch()}>Yenile</Button>
      </Box>

      {retrySuccess && <Alert severity="success" sx={{ mb: 2 }}>İş akışı yeniden tetiklendi.</Alert>}

      {/* Summary */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 140, textAlign: 'center' }}>
          <Typography variant="h4" color="success.main" fontWeight={700}>{summary?.success ?? 0}</Typography>
          <Typography variant="caption" color="text.secondary">✅ Başarılı (7 gün)</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 140, textAlign: 'center' }}>
          <Typography variant="h4" color="error.main" fontWeight={700}>{summary?.failed ?? 0}</Typography>
          <Typography variant="caption" color="text.secondary">🔴 Başarısız (7 gün)</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 140, textAlign: 'center' }}>
          <Typography variant="h4" color="warning.main" fontWeight={700}>{summary?.pending ?? 0}</Typography>
          <Typography variant="caption" color="text.secondary">⏳ Bekliyor</Typography>
        </Paper>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Durum</InputLabel>
          <Select value={statusFilter} label="Durum" onChange={e => { setStatusFilter(e.target.value); setPage(0); }}>
            <MenuItem value="">Tümü</MenuItem>
            <MenuItem value="SUCCESS">Başarılı</MenuItem>
            <MenuItem value="FAILED">Hatalı</MenuItem>
            <MenuItem value="PENDING">Bekliyor</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Tip</InputLabel>
          <Select value={typeFilter} label="Tip" onChange={e => { setTypeFilter(e.target.value); setPage(0); }}>
            <MenuItem value="">Tümü</MenuItem>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Tarih</TableCell>
              <TableCell>Workflow Tipi</TableCell>
              <TableCell>Tetikleyen</TableCell>
              <TableCell>Durum</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} align="center">Yükleniyor...</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>Kayıt bulunamadı</TableCell></TableRow>
            ) : items.map(item => (
              <TableRow key={item.id} hover sx={{ cursor: 'pointer', bgcolor: item.status === 'FAILED' ? 'error.50' : undefined }}
                onClick={() => setDrawerItem(item)}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <Tooltip title={format(new Date(item.createdAt), 'dd MMM yyyy HH:mm', { locale: tr })}>
                    <span>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: tr })}</span>
                  </Tooltip>
                </TableCell>
                <TableCell>{TYPE_LABELS[item.workflowType] ?? item.workflowType}</TableCell>
                <TableCell>{item.triggeredBy ?? 'Sistem'}</TableCell>
                <TableCell>{statusChip(item.status)}</TableCell>
                <TableCell align="right">
                  {item.status === 'FAILED' && (
                    <IconButton size="small" onClick={e => { e.stopPropagation(); retryMutation.mutate(item.id); }}
                      disabled={retryMutation.isPending}>
                      <ReplayIcon fontSize="small" />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div" count={total} page={page} rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)} rowsPerPageOptions={[]}
        />
      </TableContainer>

      {/* Detail Drawer */}
      <Drawer anchor="right" open={!!drawerItem} onClose={() => setDrawerItem(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, p: 3 } }}>
        {drawerItem && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box>
                {statusChip(drawerItem.status)}
                <Typography variant="h6" fontWeight={700} mt={1}>
                  {TYPE_LABELS[drawerItem.workflowType] ?? drawerItem.workflowType}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {format(new Date(drawerItem.createdAt), 'dd MMMM yyyy HH:mm', { locale: tr })}
                </Typography>
              </Box>
              <IconButton onClick={() => setDrawerItem(null)}><CloseIcon /></IconButton>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {drawerItem.n8nWorkflowId && (
                <Box>
                  <Typography variant="caption" color="text.secondary">n8n Workflow ID</Typography>
                  <Typography variant="body2">{drawerItem.n8nWorkflowId}</Typography>
                </Box>
              )}
              <Box>
                <Typography variant="caption" color="text.secondary">Tetikleyen</Typography>
                <Typography variant="body2">{drawerItem.triggeredBy ?? 'Sistem'}</Typography>
              </Box>
              {drawerItem.errorMessage && (
                <Alert severity="error"><Typography variant="body2"><strong>Hata:</strong> {drawerItem.errorMessage}</Typography></Alert>
              )}
              {drawerItem.payload && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Payload</Typography>
                  <Box component="pre" sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1, fontSize: 12, overflow: 'auto', maxHeight: 200 }}>
                    {JSON.stringify(drawerItem.payload, null, 2)}
                  </Box>
                </Box>
              )}
            </Box>
            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              {drawerItem.n8nWorkflowId && (
                <Button startIcon={<OpenInNewIcon />} href={`${import.meta.env.VITE_N8N_URL ?? 'http://localhost:5678'}/workflow/${drawerItem.n8nWorkflowId}`} target="_blank">
                  n8n'de Gör
                </Button>
              )}
              {drawerItem.status === 'FAILED' && (
                <Button variant="contained" startIcon={<ReplayIcon />}
                  onClick={() => retryMutation.mutate(drawerItem.id)} disabled={retryMutation.isPending}>
                  Tekrar Dene
                </Button>
              )}
            </Box>
          </>
        )}
      </Drawer>
    </Box>
  );
}
