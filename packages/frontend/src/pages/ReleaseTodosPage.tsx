import { useState } from 'react';
import {
  Box, Typography, Button, IconButton, Stack, Chip,
  Paper, Divider, CircularProgress, Alert, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';
import { queryKeys } from '@/api/queryKeys';

interface Product { id: string; name: string; }
interface ProductVersion { id: string; version: string; phase: string; }
interface ReleaseTodo {
  id: string;
  title: string;
  description?: string;
  category: string;
  priority: string;
  timing: string;
  sortOrder: number;
}

const CATEGORIES = [
  { value: 'TECHNICAL',     label: '🔧 Teknik' },
  { value: 'OPERATIONAL',   label: '⚙️ Operasyonel' },
  { value: 'COMMUNICATION', label: '📢 İletişim' },
  { value: 'APPROVAL',      label: '✅ Onay' },
];
const PRIORITIES = [
  { value: 'P0', label: '🔴 P0 — Blocker', color: 'error'   as const },
  { value: 'P1', label: '🟠 P1 — Yüksek',  color: 'warning' as const },
  { value: 'P2', label: '🔵 P2 — Orta',    color: 'info'    as const },
  { value: 'P3', label: '⚪ P3 — Düşük',   color: 'default' as const },
];
const TIMINGS = [
  { value: 'PRE',    label: 'Öncesi (PRE)' },
  { value: 'DURING', label: 'Süresince (DURING)' },
  { value: 'POST',   label: 'Sonrası (POST)' },
];
const CATEGORY_ORDER = ['TECHNICAL', 'OPERATIONAL', 'COMMUNICATION', 'APPROVAL'];

const priorityColor = (p: string) =>
  PRIORITIES.find((x) => x.value === p)?.color ?? 'default';

const emptyForm = { title: '', description: '', category: 'TECHNICAL', priority: 'P1', timing: 'PRE' };

export default function ReleaseTodosPage() {
  const qc = useQueryClient();

  const [productId,   setProductId]   = useState('');
  const [versionId,   setVersionId]   = useState('');
  const [todoDialog,  setTodoDialog]  = useState(false);
  const [editTodo,    setEditTodo]    = useState<ReleaseTodo | null>(null);
  const [deleteTodoId, setDeleteTodoId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  // ── Queries ──────────────────────────────────────────
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: queryKeys.products.all,
    queryFn: () => api.get('/products').then((r) => r.data.data),
  });

  const { data: versions = [] } = useQuery<ProductVersion[]>({
    queryKey: queryKeys.versions.byProduct(productId),
    queryFn: () => api.get(`/product-versions?productId=${productId}`).then((r) => r.data.data),
    enabled: !!productId,
  });

  const {
    data: todos = [],
    isLoading: loadingTodos,
    isError,
  } = useQuery<ReleaseTodo[]>({
    queryKey: queryKeys.releaseTodos.byVersion(versionId),
    queryFn: () => api.get(`/release-todos?versionId=${versionId}`).then((r) => r.data.data ?? r.data),
    enabled: !!versionId,
  });

  // ── Mutations ─────────────────────────────────────────
  const createTodo = useMutation({
    mutationFn: (body: object) => api.post('/release-todos', body).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.releaseTodos.byVersion(versionId) }); closeDialog(); },
  });

  const updateTodo = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) =>
      api.patch(`/release-todos/${id}`, body).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.releaseTodos.byVersion(versionId) }); closeDialog(); },
  });

  const deleteTodo = useMutation({
    mutationFn: (id: string) => api.delete(`/release-todos/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.releaseTodos.byVersion(versionId) }); setDeleteTodoId(null); },
  });

  // ── Helpers ───────────────────────────────────────────
  const closeDialog = () => { setTodoDialog(false); setEditTodo(null); setForm(emptyForm); };
  const openAdd = () => { setForm(emptyForm); setEditTodo(null); setTodoDialog(true); };
  const openEdit = (todo: ReleaseTodo) => {
    setEditTodo(todo);
    setForm({ title: todo.title, description: todo.description ?? '', category: todo.category, priority: todo.priority, timing: todo.timing });
    setTodoDialog(true);
  };
  const handleSave = () => {
    const body = { ...form, description: form.description || undefined, productVersionId: versionId };
    if (editTodo) updateTodo.mutate({ id: editTodo.id, body });
    else createTodo.mutate(body);
  };

  const grouped = CATEGORY_ORDER.reduce<Record<string, ReleaseTodo[]>>((acc, cat) => {
    const items = todos.filter((t) => t.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight={700} mb={3}>Release Todo Yönetimi</Typography>

      {/* ── Selector bar ── */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <TextField
            select label="Ürün" size="small" sx={{ width: 240 }}
            value={productId}
            onChange={(e) => { setProductId(e.target.value); setVersionId(''); }}
          >
            <MenuItem value="">Ürün Seç</MenuItem>
            {products.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </TextField>

          <TextField
            select label="Versiyon" size="small" sx={{ width: 200 }}
            value={versionId}
            onChange={(e) => setVersionId(e.target.value)}
            disabled={!productId}
          >
            <MenuItem value="">Versiyon Seç</MenuItem>
            {versions.map((v) => <MenuItem key={v.id} value={v.id}>{v.version} — {v.phase}</MenuItem>)}
          </TextField>

          <Box flex={1} />

          {versionId && (
            <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openAdd}>
              Todo Ekle
            </Button>
          )}
        </Stack>
      </Paper>

      {/* ── Empty state ── */}
      {!versionId && (
        <Box display="flex" alignItems="center" justifyContent="center" py={10}>
          <Typography color="text.secondary">Todoları görmek için ürün ve versiyon seçin</Typography>
        </Box>
      )}

      {/* ── Loading ── */}
      {versionId && loadingTodos && (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
      )}

      {/* ── Error ── */}
      {versionId && isError && (
        <Alert severity="error">Todolar yüklenirken hata oluştu.</Alert>
      )}

      {/* ── Content ── */}
      {versionId && !loadingTodos && !isError && (
        <>
          {todos.length === 0 && (
            <Box textAlign="center" py={6}>
              <Typography color="text.secondary" mb={1}>Bu versiyona ait todo bulunamadı</Typography>
              <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={openAdd}>İlk Todo'yu Ekle</Button>
            </Box>
          )}

          {CATEGORY_ORDER.filter((cat) => grouped[cat]).map((cat) => {
            const catLabel = CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
            return (
              <Paper key={cat} variant="outlined" sx={{ mb: 2 }}>
                <Box px={2} py={1} sx={{ bgcolor: 'action.hover' }}>
                  <Typography variant="subtitle2" fontWeight={700}>{catLabel}</Typography>
                </Box>
                <Divider />
                {grouped[cat].sort((a, b) => a.sortOrder - b.sortOrder).map((todo, idx) => (
                  <Box key={todo.id}>
                    {idx > 0 && <Divider />}
                    <Stack direction="row" alignItems="flex-start" px={2} py={1.5} spacing={1}>
                      <Box flex={1}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Typography variant="body2">
                            {todo.title}
                          </Typography>
                          <Chip size="small" label={todo.priority} color={priorityColor(todo.priority)} sx={{ height: 18, fontSize: 10 }} />
                          <Chip size="small" label={todo.timing} variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                        </Stack>
                        {todo.description && (
                          <Typography variant="caption" color="text.secondary" display="block" mt={0.25}>
                            {todo.description}
                          </Typography>
                        )}
                      </Box>
                      <Tooltip title="Düzenle">
                        <IconButton size="small" onClick={() => openEdit(todo)}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Sil">
                        <IconButton size="small" onClick={() => setDeleteTodoId(todo.id)}><DeleteIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </Stack>
                  </Box>
                ))}
              </Paper>
            );
          })}
        </>
      )}

      {/* ── Dialog: Add / Edit ── */}
      <Dialog open={todoDialog} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editTodo ? 'Todo Düzenle' : 'Todo Ekle'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Başlık" size="small" fullWidth autoFocus
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="PR'lar code review tamamlandı"
            />
            <TextField
              label="Açıklama (opsiyonel)" size="small" fullWidth multiline rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                select label="Kategori" size="small" fullWidth
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                {CATEGORIES.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
              </TextField>
              <TextField
                select label="Öncelik" size="small" fullWidth
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
              >
                {PRIORITIES.map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
              </TextField>
            </Stack>
            <TextField
              select label="Zamanlama" size="small"
              value={form.timing}
              onChange={(e) => setForm((f) => ({ ...f, timing: e.target.value }))}
            >
              {TIMINGS.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>İptal</Button>
          <Button
            variant="contained"
            disabled={!form.title.trim() || createTodo.isPending || updateTodo.isPending}
            onClick={handleSave}
          >
            {editTodo ? 'Güncelle' : 'Ekle'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Confirm: Delete ── */}
      <Dialog open={!!deleteTodoId} onClose={() => setDeleteTodoId(null)}>
        <DialogTitle>Todo'yu Sil</DialogTitle>
        <DialogContent>
          <Typography>Bu todo'yu silmek istediğinize emin misiniz?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTodoId(null)}>İptal</Button>
          <Button color="error" variant="contained" disabled={deleteTodo.isPending}
            onClick={() => deleteTodo.mutate(deleteTodoId!)}>
            Sil
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

