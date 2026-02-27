import { useState } from 'react';
import {
  Box, Typography, Button, TextField, MenuItem, Paper, Table, TableHead, TableBody,
  TableRow, TableCell, TableContainer, Chip, IconButton, Menu, Drawer, Divider,
  CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  Stepper, Step, StepLabel, Tabs, Tab,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CloseIcon from '@mui/icons-material/Close';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import dayjs from 'dayjs';

interface Version {
  id: string; productId: string; version: string; phase: string;
  targetDate?: string; releaseDate?: string; description?: string; notesPublished: boolean;
}
interface Product { id: string; name: string }
interface ReleaseNote { id: string; category: string; title: string; isBreaking: boolean }

const PHASES = ['PLANNED', 'DEVELOPMENT', 'RC', 'STAGING', 'PRODUCTION'];
const PHASE_LABELS: Record<string, string> = {
  PLANNED: 'Planlı', DEVELOPMENT: 'Geliştirme', RC: 'RC', STAGING: 'Staging', PRODUCTION: 'Yayında', ARCHIVED: 'Arşiv',
};
const PHASE_COLOR: Record<string, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  PLANNED: 'default', DEVELOPMENT: 'info', RC: 'warning', STAGING: 'warning', PRODUCTION: 'success', ARCHIVED: 'error',
};

function VersionDrawer({ version, products, onClose }: { version: Version | null; products: Product[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);
  const { data: notes } = useQuery({
    queryKey: ['release-notes', version?.id],
    queryFn: async () => (await apiClient.get(`/release-notes?versionId=${version!.id}`)).data.data as ReleaseNote[],
    enabled: Boolean(version),
  });
  const advanceMut = useMutation({
    mutationFn: (nextPhase: string) => apiClient.patch(`/product-versions/${version!.id}/phase`, { phase: nextPhase }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['versions'] }); onClose(); },
  });

  const product = products.find((p) => p.id === version?.productId);
  const phaseIndex = PHASES.indexOf(version?.phase ?? '');
  const nextPhase = phaseIndex >= 0 && phaseIndex < PHASES.length - 1 ? PHASES[phaseIndex + 1] : null;

  const NOTE_COLORS: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
    FEATURE: 'success', BUG: 'error', BREAKING: 'error', SECURITY: 'warning', PERFORMANCE: 'info', DEPRECATED: 'default',
  };

  return (
    <Drawer anchor="right" open={Boolean(version)} onClose={onClose} PaperProps={{ sx: { width: 560 } }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={700}>{product?.name ?? '—'} — {version?.version}</Typography>
          <Chip label={PHASE_LABELS[version?.phase ?? ''] ?? version?.phase} color={PHASE_COLOR[version?.phase ?? '']} size="small" sx={{ mt: 0.5 }} />
        </Box>
        {nextPhase && (
          <Button size="small" variant="outlined" onClick={() => advanceMut.mutate(nextPhase)} disabled={advanceMut.isPending}>
            → {PHASE_LABELS[nextPhase]}
          </Button>
        )}
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </Box>
      <Divider />
      {version?.phase !== 'ARCHIVED' && (
        <Box sx={{ px: 2, py: 1.5 }}>
          <Stepper activeStep={phaseIndex} alternativeLabel>
            {PHASES.map((p) => <Step key={p}><StepLabel>{PHASE_LABELS[p]}</StepLabel></Step>)}
          </Stepper>
        </Box>
      )}
      <Divider />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2 }}>
        <Tab label="Genel Bilgi" /><Tab label="Release Notes" />
      </Tabs>
      <Box sx={{ p: 2, overflow: 'auto' }}>
        {tab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {version?.targetDate && <Box><Typography variant="caption" color="text.secondary">Hedef Tarih</Typography><Typography>{dayjs(version.targetDate).format('DD MMM YYYY')}</Typography></Box>}
            {version?.releaseDate && <Box><Typography variant="caption" color="text.secondary">Yayın Tarihi</Typography><Typography>{dayjs(version.releaseDate).format('DD MMM YYYY')}</Typography></Box>}
            {version?.description && <Box><Typography variant="caption" color="text.secondary">Açıklama</Typography><Typography variant="body2">{version.description}</Typography></Box>}
            <Box><Typography variant="caption" color="text.secondary">Notlar Yayında</Typography><Chip label={version?.notesPublished ? 'Evet' : 'Hayır'} color={version?.notesPublished ? 'success' : 'default'} size="small" sx={{ ml: 1 }} /></Box>
          </Box>
        )}
        {tab === 1 && (
          <Box>
            {(notes ?? []).map((n) => (
              <Box key={n.id} sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Chip label={n.category} color={NOTE_COLORS[n.category] ?? 'default'} size="small" sx={{ mt: 0.25, minWidth: 80 }} />
                <Box>
                  <Typography variant="body2" fontWeight={500}>{n.title}</Typography>
                  {n.isBreaking && <Chip label="Breaking Change" color="error" size="small" sx={{ mt: 0.5 }} />}
                </Box>
              </Box>
            ))}
            {(notes ?? []).length === 0 && <Typography variant="body2" color="text.disabled">Release note bulunamadı.</Typography>}
          </Box>
        )}
      </Box>
    </Drawer>
  );
}

function NewVersionDialog({ open, onClose, products }: { open: boolean; onClose: () => void; products: Product[] }) {
  const qc = useQueryClient();
  const [productId, setProductId] = useState('');
  const [version, setVersion] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [description, setDescription] = useState('');
  const save = useMutation({
    mutationFn: () => apiClient.post('/product-versions', { productId, version, targetDate: targetDate || undefined, description }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['versions'] }); onClose(); },
  });
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Yeni Versiyon</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        <TextField select label="Ürün" fullWidth required value={productId} onChange={(e) => setProductId(e.target.value)}>
          {products.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
        </TextField>
        <TextField label="Versiyon (ör: 2.5.0)" fullWidth required value={version} onChange={(e) => setVersion(e.target.value)} />
        <TextField label="Hedef Tarih" type="date" fullWidth InputLabelProps={{ shrink: true }} value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        <TextField label="Açıklama" fullWidth multiline rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>İptal</Button>
        <Button variant="contained" onClick={() => save.mutate()} disabled={!productId || !version || save.isPending}>
          {save.isPending ? <CircularProgress size={18} /> : 'Oluştur'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ReleasesPage() {
  const qc = useQueryClient();
  const [productFilter, setProductFilter] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('');
  const [search, setSearch] = useState('');
  const [drawerVersion, setDrawerVersion] = useState<Version | null>(null);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuVersion, setMenuVersion] = useState<Version | null>(null);

  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: async () => (await apiClient.get('/products')).data.data as Product[] });
  const { data: versions, isLoading, isError } = useQuery({
    queryKey: ['versions', productFilter, phaseFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (productFilter) params.set('productId', productFilter);
      if (phaseFilter) params.set('phase', phaseFilter);
      return (await apiClient.get(`/product-versions?${params}`)).data.data as Version[];
    },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/product-versions/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['versions'] }); setMenuVersion(null); },
  });

  const filtered = (versions ?? []).filter((v) => {
    const name = products.find((p) => p.id === v.productId)?.name ?? '';
    return (name + ' ' + v.version).toLowerCase().includes(search.toLowerCase());
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
        <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>Versiyon Listesi</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setNewDialogOpen(true)}>Yeni Versiyon</Button>
      </Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField select size="small" label="Ürün" value={productFilter} onChange={(e) => setProductFilter(e.target.value)} sx={{ width: 200 }}>
          <MenuItem value="">Tümü</MenuItem>
          {products.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Aşama" value={phaseFilter} onChange={(e) => setPhaseFilter(e.target.value)} sx={{ width: 160 }}>
          <MenuItem value="">Tümü</MenuItem>
          {[...PHASES, 'ARCHIVED'].map((ph) => <MenuItem key={ph} value={ph}>{PHASE_LABELS[ph]}</MenuItem>)}
        </TextField>
        <TextField size="small" placeholder="Ara..." value={search} onChange={(e) => setSearch(e.target.value)} sx={{ width: 220 }} />
      </Box>
      {isLoading && <CircularProgress />}
      {isError && <Alert severity="error">Veriler yüklenemedi.</Alert>}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700 } }}>
              <TableCell>Ürün</TableCell><TableCell>Versiyon</TableCell><TableCell>Aşama</TableCell>
              <TableCell>Hedef Tarih</TableCell><TableCell align="right">Aksiyon</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((v) => (
              <TableRow key={v.id} hover sx={{ cursor: 'pointer' }} onClick={() => setDrawerVersion(v)}>
                <TableCell><Typography variant="body2" fontWeight={500}>{products.find((p) => p.id === v.productId)?.name ?? v.productId}</Typography></TableCell>
                <TableCell><Typography variant="body2" fontFamily="monospace">{v.version}</Typography></TableCell>
                <TableCell><Chip label={PHASE_LABELS[v.phase] ?? v.phase} color={PHASE_COLOR[v.phase] ?? 'default'} size="small" /></TableCell>
                <TableCell><Typography variant="body2" color="text.secondary">{v.targetDate ? dayjs(v.targetDate).format('DD MMM YYYY') : '—'}</Typography></TableCell>
                <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                  <IconButton size="small" onClick={(e) => { setMenuAnchor(e.currentTarget); setMenuVersion(v); }}>
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={5} align="center"><Typography color="text.disabled" sx={{ py: 3 }}>Sonuç bulunamadı</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => { setDrawerVersion(menuVersion); setMenuAnchor(null); }}>Detay / Düzenle</MenuItem>
        <MenuItem sx={{ color: 'error.main' }} onClick={() => { deleteMut.mutate(menuVersion!.id); setMenuAnchor(null); }}>Sil</MenuItem>
      </Menu>
      <VersionDrawer version={drawerVersion} products={products} onClose={() => setDrawerVersion(null)} />
      <NewVersionDialog open={newDialogOpen} onClose={() => setNewDialogOpen(false)} products={products} />
    </Box>
  );
}
