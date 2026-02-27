import { useState } from 'react';
import {
  Box, Typography, TextField, MenuItem, CircularProgress,
  Stack, Paper, Checkbox, Chip, Alert,
  LinearProgress, Divider,
} from '@mui/material';
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
}

interface ReleaseTodo {
  id: string;
  title: string;
  description?: string;
  category: string;
  priority: string;
  isCompleted: boolean;
  completedBy?: string;
  completedAt?: string;
  sortOrder: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  TECHNICAL: '🔧 Teknik',
  OPERATIONAL: '⚙️ Operasyonel',
  COMMUNICATION: '📢 İletişim',
  APPROVAL: '✅ Onay',
};

const CATEGORY_ORDER = ['TECHNICAL', 'OPERATIONAL', 'COMMUNICATION', 'APPROVAL'];

const priorityColor = (p: string) => {
  const map: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
    P0: 'error', P1: 'warning', P2: 'info', P3: 'default',
  };
  return map[p] ?? 'default';
};

export default function ReleaseTodosPage() {
  const qc = useQueryClient();
  const [productId, setProductId] = useState('');
  const [versionId, setVersionId] = useState('');

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => api.get('/products').then((r) => r.data.data),
  });

  const { data: versions = [] } = useQuery<ProductVersion[]>({
    queryKey: ['product-versions', productId],
    queryFn: () => api.get(`/product-versions?productId=${productId}`).then((r) => r.data.data),
    enabled: !!productId,
  });

  const { data: todos = [], isLoading: loadingTodos } = useQuery<ReleaseTodo[]>({
    queryKey: ['release-todos', versionId],
    queryFn: () => api.get(`/release-todos?versionId=${versionId}`).then((r) => r.data.data ?? r.data),
    enabled: !!versionId,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isCompleted }: { id: string; isCompleted: boolean }) =>
      api.patch(`/release-todos/${id}`, { isCompleted }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['release-todos', versionId] }),
  });

  const completed = todos.filter((t) => t.isCompleted).length;
  const total = todos.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const hasBlockers = todos.some((t) => t.priority === 'P0' && !t.isCompleted);

  const grouped = CATEGORY_ORDER.reduce<Record<string, ReleaseTodo[]>>((acc, cat) => {
    const items = todos.filter((t) => t.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight={700} mb={3}>
        Release Todo Yönetimi
      </Typography>

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
            sx={{ width: 200 }}
            disabled={!productId}
          >
            <MenuItem value="">Versiyon Seç</MenuItem>
            {versions.map((v) => (
              <MenuItem key={v.id} value={v.id}>
                {v.version} — {v.phase}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Paper>

      {/* Empty state */}
      {!versionId && (
        <Box display="flex" flexDirection="column" alignItems="center" py={8} gap={1}>
          <Typography color="text.secondary">
            Todoları görmek için ürün ve versiyon seçin
          </Typography>
        </Box>
      )}

      {/* Loading */}
      {versionId && loadingTodos && (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      )}

      {/* Todos */}
      {versionId && !loadingTodos && (
        <>
          {/* Progress */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" color="text.secondary">
              Tamamlanan: {completed} / {total}
            </Typography>
            <Typography variant="body2" fontWeight={600} color={progress === 100 ? 'success.main' : 'text.primary'}>
              %{progress}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={progress}
            color={progress === 100 ? 'success' : 'primary'}
            sx={{ height: 8, borderRadius: 1, mb: 2 }}
          />

          {hasBlockers && (
            <Alert severity="error" sx={{ mb: 2 }}>
              🔴 Blocker (P0) todo'lar tamamlanmadan deployment aktive edilemez!
            </Alert>
          )}

          {total === 0 && (
            <Typography color="text.secondary" align="center" py={4}>
              Bu versiyona ait todo bulunamadı
            </Typography>
          )}

          {/* Grouped by category */}
          {CATEGORY_ORDER.filter((cat) => grouped[cat]).map((cat, _groupIdx) => (
            <Paper key={cat} variant="outlined" sx={{ mb: 2 }}>
              <Box px={2} py={1.5} sx={{ bgcolor: 'action.hover' }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {CATEGORY_LABELS[cat] ?? cat}
                </Typography>
              </Box>
              <Divider />
              <Box px={2} py={1}>
                {grouped[cat].sort((a, b) => a.sortOrder - b.sortOrder).map((todo, _idx) => (
                  <Box key={todo.id} py={0.5}>
                    <Stack direction="row" alignItems="flex-start" spacing={1}>
                      <Checkbox
                        checked={todo.isCompleted}
                        onChange={(e) => toggleMutation.mutate({ id: todo.id, isCompleted: e.target.checked })}
                        size="small"
                        sx={{ mt: -0.5 }}
                      />
                      <Box flex={1}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography
                            variant="body2"
                            sx={todo.isCompleted ? { textDecoration: 'line-through', color: 'text.disabled' } : {}}
                          >
                            {todo.title}
                          </Typography>
                          <Chip
                            size="small"
                            label={todo.priority}
                            color={priorityColor(todo.priority)}
                            sx={{ height: 18, fontSize: 10 }}
                          />
                        </Stack>
                        {todo.description && (
                          <Typography variant="caption" color="text.secondary">
                            {todo.description}
                          </Typography>
                        )}
                        {todo.isCompleted && todo.completedBy && (
                          <Typography variant="caption" color="success.main">
                            ✓ {todo.completedBy}
                            {todo.completedAt
                              ? ` — ${new Date(todo.completedAt).toLocaleDateString('tr-TR')}`
                              : ''}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  </Box>
                ))}
              </Box>
            </Paper>
          ))}
        </>
      )}
    </Box>
  );
}
