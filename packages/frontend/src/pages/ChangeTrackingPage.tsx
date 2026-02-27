import { useState } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, Drawer, Divider, IconButton, FormControl,
  InputLabel, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControlLabel, Switch, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

type SystemChange = {
  id: string; title: string; description: string; changeType: string;
  isBreaking: boolean; productVersionId?: string | null; affectedEndpoints?: string[];
  createdAt: string;
};
type ProductVersion = { id: string; version: string; productId: string };
type Product = { id: string; name: string };

const TYPE_LABELS: Record<string, { label: string; color: 'error' | 'warning' | 'success' | 'info' | 'default' }> = {
  BREAKING: { label: '⚠️ Breaking', color: 'error' },
  FEATURE: { label: '✨ Feature', color: 'success' },
  BUG_FIX: { label: '🐛 Bug Fix', color: 'warning' },
  PERFORMANCE: { label: '⚡ Perf', color: 'info' },
  SECURITY: { label: '🔒 Security', color: 'default' },
};

export default function ChangeTrackingPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'ALL' | 'BREAKING' | 'API' | 'SYSTEM'>('ALL');
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [drawerItem, setDrawerItem] = useState<SystemChange | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', changeType: 'FEATURE', isBreaking: false, affectedEndpoints: '' });

  const { data: products } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => apiClient.get('/products').then(r => r.data.data ?? r.data),
  });

  const { data: versions } = useQuery<ProductVersion[]>({
    queryKey: ['product-versions'],
    queryFn: () => apiClient.get('/product-versions').then(r => r.data.data ?? r.data),
  });

  const { data: changes = [], isLoading } = useQuery<SystemChange[]>({
    queryKey: ['system-changes', selectedVersionId],
    queryFn: () => apiClient.get('/system-changes', { params: selectedVersionId ? { versionId: selectedVersionId } : {} }).then(r => r.data.data ?? r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form & { productVersionId?: string }) => apiClient.post('/system-changes', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['system-changes'] }); setDialogOpen(false); setForm({ title: '', description: '', changeType: 'FEATURE', isBreaking: false, affectedEndpoints: '' }); },
  });

  const productName = (versionId?: string | null) => {
    const ver = versions?.find(v => v.id === versionId);
    if (!ver) return '';
    const prod = products?.find(p => p.id === ver.productId);
    return prod ? `${prod.name} ${ver.version}` : ver.version;
  };

  const filtered = changes.filter(c => {
    if (tab === 'BREAKING') return c.isBreaking;
    if (tab === 'API') return c.affectedEndpoints && c.affectedEndpoints.length > 0;
    if (tab === 'SYSTEM') return c.changeType === 'FEATURE' || c.changeType === 'PERFORMANCE';
    return true;
  });

  const breakingCount = changes.filter(c => c.isBreaking).length;

  const tabs = [
    { key: 'ALL', label: 'Tüm Değişiklikler' },
    { key: 'BREAKING', label: `Breaking (${breakingCount})` },
    { key: 'API', label: 'API Değişiklikleri' },
    { key: 'SYSTEM', label: 'Sistem Değişiklikleri' },
  ] as const;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Değişiklik Takibi</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Versiyon</InputLabel>
            <Select value={selectedVersionId} label="Versiyon" onChange={e => setSelectedVersionId(e.target.value)}>
              <MenuItem value="">Tümü</MenuItem>
              {versions?.map(v => (
                <MenuItem key={v.id} value={v.id}>{v.version}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            + Değişiklik
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        {tabs.map(t => (
          <Button key={t.key} variant={tab === t.key ? 'contained' : 'text'}
            size="small" onClick={() => setTab(t.key)} sx={{ borderRadius: '8px 8px 0 0' }}>
            {t.label}
          </Button>
        ))}
      </Box>

      {/* Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Tarih</TableCell>
              <TableCell>Versiyon</TableCell>
              <TableCell>Tip</TableCell>
              <TableCell>Açıklama</TableCell>
              <TableCell>Etki</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} align="center">Yükleniyor...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>Kayıt bulunamadı</TableCell></TableRow>
            ) : filtered.map(c => {
              const typeInfo = TYPE_LABELS[c.changeType] ?? { label: c.changeType, color: 'default' as const };
              return (
                <TableRow key={c.id} hover sx={{ cursor: 'pointer', bgcolor: c.isBreaking ? 'error.50' : undefined }}
                  onClick={() => setDrawerItem(c)}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {format(new Date(c.createdAt), 'dd MMM', { locale: tr })}
                  </TableCell>
                  <TableCell>{productName(c.productVersionId)}</TableCell>
                  <TableCell>
                    <Chip label={typeInfo.label} color={typeInfo.color} size="small" />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {c.isBreaking && <Tooltip title="Breaking Change"><WarningAmberIcon color="error" fontSize="small" /></Tooltip>}
                      {c.title}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {c.affectedEndpoints?.length ? `${c.affectedEndpoints.length} endpoint` : '—'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Detail Drawer */}
      <Drawer anchor="right" open={!!drawerItem} onClose={() => setDrawerItem(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, p: 3 } }}>
        {drawerItem && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box>
                {drawerItem.isBreaking && (
                  <Chip label="⚠️ Breaking Change" color="error" size="small" sx={{ mb: 1 }} />
                )}
                <Typography variant="h6" fontWeight={700}>{drawerItem.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {productName(drawerItem.productVersionId)} · {format(new Date(drawerItem.createdAt), 'dd MMMM yyyy', { locale: tr })}
                </Typography>
              </Box>
              <IconButton onClick={() => setDrawerItem(null)}><CloseIcon /></IconButton>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" fontWeight={600} mb={1}>Açıklama</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>{drawerItem.description}</Typography>
            {drawerItem.affectedEndpoints && drawerItem.affectedEndpoints.length > 0 && (
              <>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>Etkilenen Endpoint'ler</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                  {drawerItem.affectedEndpoints.map(ep => (
                    <Chip key={ep} label={ep} size="small" variant="outlined" />
                  ))}
                </Box>
              </>
            )}
            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Tip: {TYPE_LABELS[drawerItem.changeType]?.label ?? drawerItem.changeType}
              </Typography>
            </Box>
          </>
        )}
      </Drawer>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Yeni Değişiklik Kaydet</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Başlık *" fullWidth value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <TextField label="Açıklama *" fullWidth multiline rows={3} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <FormControl fullWidth>
              <InputLabel>Tip</InputLabel>
              <Select value={form.changeType} label="Tip" onChange={e => setForm(f => ({ ...f, changeType: e.target.value }))}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Versiyon</InputLabel>
              <Select value={selectedVersionId} label="Versiyon" onChange={e => setSelectedVersionId(e.target.value)}>
                <MenuItem value="">Seçilmedi</MenuItem>
                {versions?.map(v => <MenuItem key={v.id} value={v.id}>{v.version}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Etkilenen Endpoint'ler (virgülle ayırın)" fullWidth value={form.affectedEndpoints}
              onChange={e => setForm(f => ({ ...f, affectedEndpoints: e.target.value }))} />
            <FormControlLabel control={<Switch checked={form.isBreaking} onChange={e => setForm(f => ({ ...f, isBreaking: e.target.checked }))} />}
              label="Breaking Change" />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>İptal</Button>
          <Button variant="contained" disabled={!form.title || !form.description}
            onClick={() => createMutation.mutate({
              ...form,
              productVersionId: selectedVersionId || undefined,
              affectedEndpoints: form.affectedEndpoints,
            })}>
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
