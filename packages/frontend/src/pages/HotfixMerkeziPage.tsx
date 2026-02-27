import { useState } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableHead, TableBody, TableRow,
  TableCell, TableContainer, Chip, IconButton, Drawer, Divider, Alert,
  CircularProgress, TextField, MenuItem, Dialog, DialogTitle, DialogContent,
  DialogActions, Tab, Tabs,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import dayjs from 'dayjs';

interface Hotfix {
  id: string; title: string; description: string; severity: string;
  status: string; productVersionId: string; requestedBy: string;
  prUrl?: string; branchName?: string; customerImpact?: string; createdAt: string;
}
interface Version { id: string; version: string; productId: string }
interface Product { id: string; name: string }

const SEV_COLOR: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
  CRITICAL: 'error', HIGH: 'warning', MEDIUM: 'info', LOW: 'default',
};
const STATUS_COLOR: Record<string, 'warning' | 'info' | 'success' | 'error' | 'default'> = {
  PENDING: 'warning', APPROVED: 'info', IN_PROGRESS: 'info', DEPLOYED: 'success', REJECTED: 'error',
};
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Bekliyor', APPROVED: 'Onaylandı', IN_PROGRESS: 'Devam Ediyor', DEPLOYED: 'Deploy Edildi', REJECTED: 'Reddedildi',
};
const STATUS_TABS = ['PENDING', 'APPROVED', 'IN_PROGRESS', 'DEPLOYED', 'REJECTED'];
const TAB_LABELS = ['Bekleyen Onay', 'Onaylandı', 'Aktif', 'Tamamlanan', 'Reddedilen'];

function HotfixDrawer({
  hotfix, versions, products, onClose,
}: { hotfix: Hotfix | null; versions: Version[]; products: Product[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);

  const approveMut = useMutation({
    mutationFn: () => apiClient.patch(`/hotfix-requests/${hotfix!.id}/approve`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hotfixes'] }); onClose(); },
  });
  const rejectMut = useMutation({
    mutationFn: () => apiClient.patch(`/hotfix-requests/${hotfix!.id}/reject`, { reason: rejectReason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hotfixes'] }); onClose(); },
  });

  const version = versions.find((v) => v.id === hotfix?.productVersionId);
  const product = products.find((p) => p.id === version?.productId);

  return (
    <Drawer anchor="right" open={Boolean(hotfix)} onClose={onClose} PaperProps={{ sx: { width: 520 } }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={700}>{hotfix?.title}</Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
            <Chip label={hotfix?.severity} color={SEV_COLOR[hotfix?.severity ?? ''] ?? 'default'} size="small" />
            <Chip label={STATUS_LABELS[hotfix?.status ?? ''] ?? hotfix?.status} color={STATUS_COLOR[hotfix?.status ?? ''] ?? 'default'} size="small" />
          </Box>
        </Box>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </Box>
      <Divider />
      <Box sx={{ p: 2, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 3 }}>
          <Box><Typography variant="caption" color="text.secondary">Tarih</Typography><Typography variant="body2">{hotfix ? dayjs(hotfix.createdAt).format('DD MMM YYYY HH:mm') : '—'}</Typography></Box>
          <Box><Typography variant="caption" color="text.secondary">Ürün / Versiyon</Typography><Typography variant="body2">{product?.name ?? '—'} / {version?.version ?? '—'}</Typography></Box>
        </Box>
        <Box><Typography variant="caption" color="text.secondary">Açıklama</Typography><Typography variant="body2">{hotfix?.description}</Typography></Box>
        {hotfix?.customerImpact && <Box><Typography variant="caption" color="text.secondary">Müşteri Etkisi</Typography><Typography variant="body2">{hotfix.customerImpact}</Typography></Box>}
        {hotfix?.branchName && <Box><Typography variant="caption" color="text.secondary">Branch</Typography><Typography variant="body2" fontFamily="monospace">{hotfix.branchName}</Typography></Box>}
        {hotfix?.prUrl && (
          <Box><Typography variant="caption" color="text.secondary">Pull Request</Typography>
            <Typography variant="body2" component="a" href={hotfix.prUrl} target="_blank" rel="noreferrer" color="primary">{hotfix.prUrl}</Typography>
          </Box>
        )}

        {hotfix?.status === 'PENDING' && (
          <Box sx={{ display: 'flex', gap: 1, pt: 1 }}>
            <Button variant="contained" color="success" startIcon={<CheckIcon />} onClick={() => approveMut.mutate()} disabled={approveMut.isPending}>Onayla</Button>
            <Button variant="outlined" color="error" startIcon={<CloseOutlinedIcon />} onClick={() => setShowReject(true)}>Reddet</Button>
          </Box>
        )}
        {showReject && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <TextField label="Red Sebebi" multiline rows={2} fullWidth value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
            <Button variant="contained" color="error" onClick={() => rejectMut.mutate()} disabled={!rejectReason || rejectMut.isPending}>Reddetmeyi Onayla</Button>
          </Box>
        )}
      </Box>
    </Drawer>
  );
}

interface NewHotfixDialogProps { open: boolean; onClose: () => void; versions: Version[]; products: Product[] }
function NewHotfixDialog({ open, onClose, versions, products }: NewHotfixDialogProps) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('HIGH');
  const [productVersionId, setProductVersionId] = useState('');
  const [customerImpact, setCustomerImpact] = useState('');
  const save = useMutation({
    mutationFn: () => apiClient.post('/hotfix-requests', { title, description, severity, productVersionId, customerImpact }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hotfixes'] }); onClose(); },
  });
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Yeni Hotfix Talebi</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        <TextField label="Başlık" fullWidth required value={title} onChange={(e) => setTitle(e.target.value)} />
        <TextField label="Açıklama" fullWidth required multiline rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        <TextField select label="Kritiklik" fullWidth value={severity} onChange={(e) => setSeverity(e.target.value)}>
          {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
        <TextField select label="Hedef Versiyon" fullWidth required value={productVersionId} onChange={(e) => setProductVersionId(e.target.value)}>
          {versions.map((v) => (
            <MenuItem key={v.id} value={v.id}>
              {products.find((p) => p.id === v.productId)?.name ?? v.productId} — {v.version}
            </MenuItem>
          ))}
        </TextField>
        <TextField label="Müşteri Etkisi" fullWidth value={customerImpact} onChange={(e) => setCustomerImpact(e.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>İptal</Button>
        <Button variant="contained" onClick={() => save.mutate()} disabled={!title || !description || !productVersionId || save.isPending}>
          {save.isPending ? <CircularProgress size={18} /> : 'Oluştur'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function HotfixMerkeziPage() {
  const [tab, setTab] = useState(0);
  const [drawerHotfix, setDrawerHotfix] = useState<Hotfix | null>(null);
  const [newDialogOpen, setNewDialogOpen] = useState(false);

  const { data: hotfixes = [], isLoading, isError } = useQuery({
    queryKey: ['hotfixes'],
    queryFn: async () => (await apiClient.get('/hotfix-requests')).data.data as Hotfix[],
  });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: async () => (await apiClient.get('/products')).data.data as Product[] });
  const { data: versions = [] } = useQuery({ queryKey: ['versions-all'], queryFn: async () => (await apiClient.get('/product-versions')).data.data as Version[] });

  const filtered = hotfixes.filter((h) => h.status === STATUS_TABS[tab]);
  const pendingCount = hotfixes.filter((h) => h.status === 'PENDING').length;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>Hotfix Merkezi</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setNewDialogOpen(true)}>Yeni Hotfix Talebi</Button>
      </Box>
      {pendingCount > 0 && tab !== 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>⚠️ {pendingCount} hotfix talebi onayınızı bekliyor.</Alert>
      )}
      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          {TAB_LABELS.map((l, i) => (
            <Tab key={i} label={i === 0 && pendingCount > 0 ? `${l} (${pendingCount})` : l} />
          ))}
        </Tabs>
        <Box sx={{ p: 2 }}>
          {isLoading && <CircularProgress />}
          {isError && <Alert severity="error">Veriler yüklenemedi.</Alert>}
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700 } }}>
                  <TableCell>Başlık</TableCell><TableCell>Versiyon</TableCell>
                  <TableCell align="center">Kritiklik</TableCell><TableCell>Tarih</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((h) => (
                  <TableRow key={h.id} hover sx={{ cursor: 'pointer' }} onClick={() => setDrawerHotfix(h)}>
                    <TableCell><Typography variant="body2" fontWeight={500}>{h.title}</Typography></TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {products.find((p) => p.id === versions.find((v) => v.id === h.productVersionId)?.productId)?.name ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center"><Chip label={h.severity} color={SEV_COLOR[h.severity] ?? 'default'} size="small" /></TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{dayjs(h.createdAt).format('DD MMM HH:mm')}</Typography></TableCell>
                  </TableRow>
                ))}
                {!isLoading && filtered.length === 0 && (
                  <TableRow><TableCell colSpan={4} align="center"><Typography color="text.disabled" sx={{ py: 3 }}>Bu kategoride kayıt yok.</Typography></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Paper>
      <HotfixDrawer hotfix={drawerHotfix} versions={versions} products={products} onClose={() => setDrawerHotfix(null)} />
      <NewHotfixDialog open={newDialogOpen} onClose={() => setNewDialogOpen(false)} versions={versions} products={products} />
    </Box>
  );
}
