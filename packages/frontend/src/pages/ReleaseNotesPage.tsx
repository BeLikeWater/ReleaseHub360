import { useState } from 'react';
import {
  Box, Typography, TextField, MenuItem, CircularProgress, Stack,
  Paper, Chip, Alert, Button, Divider, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, FormControlLabel,
  Checkbox, List, ListItemButton, ListItemIcon, ListItemText,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';

interface Product {
  id: string;
  name: string;
}

interface ProductVersion {
  id: string;
  version: string;
  phase: string;
  notesPublished: boolean;
}

interface ReleaseNote {
  id: string;
  productVersionId: string;
  category: string;
  title: string;
  description?: string;
  isBreaking: boolean;
  sortOrder: number;
}

interface TfsWorkItem {
  id: number;
  title: string;
  type: string;
  state: string;
}

const CATEGORIES = [
  { value: 'FEATURE', label: '✨ Yeni Özellik', color: 'info' as const },
  { value: 'BUG', label: '🐛 Hata Düzeltme', color: 'error' as const },
  { value: 'SECURITY', label: '🔒 Güvenlik', color: 'warning' as const },
  { value: 'BREAKING', label: '⚠️ Kırıcı Değişiklik', color: 'error' as const },
  { value: 'PERFORMANCE', label: '⚡ Performans', color: 'success' as const },
  { value: 'DEPRECATED', label: '🚫 Kullanımdan Kalktı', color: 'default' as const },
];

const blankNote = (versionId: string, item?: TfsWorkItem): Partial<ReleaseNote> => ({
  productVersionId: versionId,
  category: item?.type === 'Bug' ? 'BUG' : 'FEATURE',
  title: item ? `[#${item.id}] ${item.title}` : '',
  description: '',
  isBreaking: false,
});

export default function ReleaseNotesPage() {
  const qc = useQueryClient();
  const [productId, setProductId] = useState('');
  const [versionId, setVersionId] = useState('');
  const [preview, setPreview] = useState(false);

  // TFS Work Items sol panel
  const [tfsSearch, setTfsSearch] = useState('');
  const [selectedWorkItems, setSelectedWorkItems] = useState<Set<number>>(new Set());

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ReleaseNote | null>(null);
  const [form, setForm] = useState<Partial<ReleaseNote>>(blankNote(''));

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => api.get('/products').then((r) => r.data.data),
  });

  const { data: versions = [] } = useQuery<ProductVersion[]>({
    queryKey: ['product-versions', productId],
    queryFn: () => api.get(`/product-versions?productId=${productId}`).then((r) => r.data.data),
    enabled: !!productId,
  });

  const selectedVersion = versions.find((v) => v.id === versionId);

  const { data: notes = [], isLoading } = useQuery<ReleaseNote[]>({
    queryKey: ['release-notes', versionId],
    queryFn: () => api.get(`/release-notes?versionId=${versionId}`).then((r) => r.data.data ?? r.data),
    enabled: !!versionId,
  });

  const { data: tfsWorkItems = [] } = useQuery<TfsWorkItem[]>({
    queryKey: ['tfs-work-items', versionId],
    queryFn: () => api.get(`/tfs/work-items?versionId=${versionId}`).then((r) => r.data.data ?? r.data),
    enabled: !!versionId,
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: (body: Partial<ReleaseNote>) => api.post('/release-notes', body).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['release-notes', versionId] }); closeDialog(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: Partial<ReleaseNote> & { id: string }) =>
      api.put(`/release-notes/${id}`, body).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['release-notes', versionId] }); closeDialog(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/release-notes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['release-notes', versionId] }),
  });

  const publishMutation = useMutation({
    mutationFn: () => api.patch(`/product-versions/${versionId}`, { notesPublished: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product-versions', productId] }),
  });

  const openFromWorkItem = (item: TfsWorkItem) => {
    const checked = new Set(selectedWorkItems);
    if (checked.has(item.id)) { checked.delete(item.id); } else { checked.add(item.id); }
    setSelectedWorkItems(checked);
    setEditing(null);
    setForm(blankNote(versionId, item));
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm(blankNote(versionId));
    setDialogOpen(true);
  };

  const openEdit = (n: ReleaseNote) => {
    setEditing(n);
    setForm({ ...n });
    setDialogOpen(true);
  };

  const closeDialog = () => setDialogOpen(false);

  const handleSave = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const hasBreaking = notes.some((n) => n.isBreaking);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <Box p={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={700}>Release Notları</Typography>
        {versionId && (
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              onClick={() => setPreview((p) => !p)}
            >
              {preview ? 'Düzenleme Moduna Dön' : 'Önizleme'}
            </Button>
            <Button
              variant="contained"
              disabled={!selectedVersion || selectedVersion.notesPublished}
              onClick={() => publishMutation.mutate()}
            >
              {selectedVersion?.notesPublished ? '✅ Yayında' : 'Yayınla'}
            </Button>
          </Stack>
        )}
      </Stack>

      {/* Version Selector */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            select label="Ürün" size="small"
            value={productId}
            onChange={(e) => { setProductId(e.target.value); setVersionId(''); }}
            sx={{ width: 240 }}
          >
            <MenuItem value="">Ürün Seç</MenuItem>
            {products.map((p) => (
              <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            select label="Versiyon" size="small"
            value={versionId}
            onChange={(e) => setVersionId(e.target.value)}
            sx={{ width: 220 }}
            disabled={!productId}
          >
            <MenuItem value="">Versiyon Seç</MenuItem>
            {versions.map((v) => (
              <MenuItem key={v.id} value={v.id}>
                {v.version} — {v.phase}
                {v.notesPublished ? ' ✅' : ''}
              </MenuItem>
            ))}
          </TextField>
          {selectedVersion && (
            <Chip
              label={selectedVersion.notesPublished ? 'Yayında' : 'Taslak'}
              color={selectedVersion.notesPublished ? 'success' : 'default'}
              size="small"
            />
          )}
        </Stack>
      </Paper>

      {!versionId && (
        <Box display="flex" justifyContent="center" py={8}>
          <Typography color="text.secondary">Release notlarını görmek için versiyon seçin</Typography>
        </Box>
      )}

      {versionId && isLoading && (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      )}

      {versionId && !isLoading && !preview && (
        <>
          {hasBreaking && (
            <Alert severity="error" sx={{ mb: 2 }}>
              ⚠️ Bu versiyonda kırıcı değişiklik mevcut — müşterilere önceden bildirim gönderilmeli!
            </Alert>
          )}
          <Stack direction="row" justifyContent="flex-end" mb={2}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
              Not Ekle
            </Button>
          </Stack>

          <Box display="flex" gap={2} alignItems="flex-start">
            {/* TFS Work Items Sol Panel */}
            <Paper variant="outlined" sx={{ width: 280, flexShrink: 0, p: 1.5, maxHeight: 600, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>Work Items (TFS)</Typography>
              <TextField
                size="small" fullWidth placeholder="Ara..."
                value={tfsSearch}
                onChange={(e) => setTfsSearch(e.target.value)}
                InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 0.5, color: 'text.disabled' }} /> }}
                sx={{ mb: 1 }}
              />
              <List dense disablePadding sx={{ flex: 1, overflowY: 'auto' }}>
                {tfsWorkItems
                  .filter((wi) => {
                    const q = tfsSearch.toLowerCase();
                    return !q || wi.title.toLowerCase().includes(q) || String(wi.id).includes(q);
                  })
                  .map((wi) => (
                    <ListItemButton
                      key={wi.id}
                      dense
                      onClick={() => openFromWorkItem(wi)}
                      sx={{ borderRadius: 1, mb: 0.25 }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <Checkbox
                          edge="start" size="small" disableRipple tabIndex={-1}
                          checked={selectedWorkItems.has(wi.id)}
                          onChange={() => {
                            const s = new Set(selectedWorkItems);
                            s.has(wi.id) ? s.delete(wi.id) : s.add(wi.id);
                            setSelectedWorkItems(s);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={`#${wi.id} ${wi.title}`}
                        secondary={wi.type}
                        primaryTypographyProps={{ variant: 'caption', noWrap: true }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItemButton>
                  ))}
                {tfsWorkItems.length === 0 && (
                  <Typography variant="caption" color="text.disabled" sx={{ px: 1, display: 'block' }}>
                    TFS entegrasyonu yapılandırıldıktan sonra iş öğeleri burada görünür.
                  </Typography>
                )}
              </List>
              <Divider sx={{ mt: 1, mb: 0.5 }} />
              <Typography variant="caption" color="text.secondary">
                Toplam: {tfsWorkItems.length} · Seçili: {selectedWorkItems.size}
              </Typography>
            </Paper>

            {/* Notes List - sağ taraf */}
            <Box flex={1}>
              {CATEGORIES.map(({ value, label }) => {
                const categoryNotes = notes
                  .filter((n) => n.category === value)
                  .sort((a, b) => a.sortOrder - b.sortOrder);
                if (categoryNotes.length === 0) return null;
                return (
                  <Paper key={value} variant="outlined" sx={{ mb: 2 }}>
                    <Box px={2} py={1.5} sx={{ bgcolor: value === 'BREAKING' ? 'error.light' : 'action.hover' }}>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {label} ({categoryNotes.length})
                      </Typography>
                    </Box>
                    <Divider />
                    {categoryNotes.map((n, idx) => (
                      <Box key={n.id}>
                        {idx > 0 && <Divider />}
                        <Stack direction="row" alignItems="flex-start" px={2} py={1.5} spacing={2}>
                          <Box flex={1}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="body2" fontWeight={500}>{n.title}</Typography>
                              {n.isBreaking && (
                                <Chip size="small" label="Kırıcı" color="error" sx={{ height: 18, fontSize: 10 }} />
                              )}
                            </Stack>
                            {n.description && (
                              <Typography variant="caption" color="text.secondary">{n.description}</Typography>
                            )}
                          </Box>
                          <Stack direction="row" spacing={0.5}>
                            <IconButton size="small" onClick={() => openEdit(n)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small" color="error"
                              onClick={() => deleteMutation.mutate(n.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        </Stack>
                      </Box>
                    ))}
                  </Paper>
                );
              })}

              {notes.length === 0 && (
                <Typography color="text.secondary" align="center" py={4}>
                  Henüz release notu eklenmemiş
                </Typography>
              )}
            </Box>
          </Box>
        </>
      )}

      {versionId && !isLoading && preview && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {selectedVersion?.version} — Sürüm Notları
          </Typography>
          {hasBreaking && (
            <Alert severity="error" sx={{ mb: 2 }}>
              ⚠️ Bu sürüm kırıcı değişiklikler içeriyor
            </Alert>
          )}
          {CATEGORIES.map(({ value, label }) => {
            const categoryNotes = notes
              .filter((n) => n.category === value)
              .sort((a, b) => a.sortOrder - b.sortOrder);
            if (categoryNotes.length === 0) return null;
            return (
              <Box key={value} mb={2}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>{label}</Typography>
                {categoryNotes.map((n) => (
                  <Box key={n.id} pl={2} mb={0.5}>
                    <Typography variant="body2">
                      • {n.title}
                      {n.description && ` — ${n.description}`}
                    </Typography>
                  </Box>
                ))}
              </Box>
            );
          })}
        </Paper>
      )}

      {/* Note Dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Notu Düzenle' : 'Yeni Release Notu'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} mt={1}>
            <TextField
              select label="Kategori" fullWidth
              value={form.category ?? 'FEATURE'}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              {CATEGORIES.map((c) => (
                <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Başlık" fullWidth required
              value={form.title ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <TextField
              label="Açıklama" fullWidth multiline rows={3}
              value={form.description ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.isBreaking ?? false}
                  onChange={(e) => setForm((f) => ({ ...f, isBreaking: e.target.checked }))}
                />
              }
              label="Bu kırıcı değişiklik içeriyor"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeDialog}>İptal</Button>
          <Button variant="contained" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <CircularProgress size={18} /> : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
