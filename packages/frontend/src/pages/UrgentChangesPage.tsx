import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip, IconButton,
  Menu, MenuItem, Drawer, Stack, CircularProgress, Alert,
  Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControlLabel, Radio, RadioGroup, FormControl, FormLabel,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';

interface UrgentChange {
  id: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED';
  affectedProducts?: string[];
  workaroundExists: boolean;
  customerImpact?: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_TABS = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED'] as const;
const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aktif', IN_PROGRESS: 'İşlemde', RESOLVED: 'Tamamlanan', CANCELLED: 'İptal Edilen',
};

const PRIORITY_COLOR = (p: string) => {
  const map: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
    CRITICAL: 'error', HIGH: 'warning', MEDIUM: 'info', LOW: 'default',
  };
  return map[p] ?? 'default';
};

const PRIORITY_LABEL: Record<string, string> = {
  CRITICAL: '🔴 Kritik', HIGH: '🟡 Yüksek', MEDIUM: '🔵 Orta', LOW: '⚪ Düşük',
};

const blankForm = (): Partial<UrgentChange> => ({
  title: '', description: '', priority: 'HIGH', workaroundExists: false, customerImpact: '',
});

export default function UrgentChangesPage() {
  const qc = useQueryClient();
  const [tabIdx, setTabIdx] = useState(0);
  const activeStatus = STATUS_TABS[tabIdx];

  // Drawer
  const [drawerItem, setDrawerItem] = useState<UrgentChange | null>(null);

  // Menu
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuItem, setMenuItem] = useState<UrgentChange | null>(null);

  // New dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Partial<UrgentChange>>(blankForm());

  const { data: changes = [], isLoading } = useQuery<UrgentChange[]>({
    queryKey: ['urgent-changes'],
    queryFn: () => api.get('/urgent-changes').then((r) => r.data.data ?? r.data),
  });

  const createMutation = useMutation({
    mutationFn: (body: Partial<UrgentChange>) => api.post('/urgent-changes', body).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['urgent-changes'] }); setDialogOpen(false); },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/urgent-changes/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['urgent-changes'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/urgent-changes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['urgent-changes'] }),
  });

  const filtered = useMemo(
    () => changes.filter((c) => c.status === activeStatus),
    [changes, activeStatus],
  );

  const openCount = changes.filter((c) => c.status === 'OPEN' || c.status === 'IN_PROGRESS').length;

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>, item: UrgentChange) => {
    setMenuAnchor(e.currentTarget);
    setMenuItem(item);
  };
  const handleMenuClose = () => { setMenuAnchor(null); setMenuItem(null); };

  const isSaving = createMutation.isPending;

  return (
    <Box p={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={700}>Acil Değişiklik Yönetimi</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setForm(blankForm()); setDialogOpen(true); }}>
          Acil Değişiklik
        </Button>
      </Stack>

      {openCount > 0 && (
        <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
          {openCount} aktif acil değişiklik işlemde
        </Alert>
      )}

      <Tabs value={tabIdx} onChange={(_, v) => setTabIdx(v)} sx={{ mb: 2 }}>
        {STATUS_TABS.map((status) => {
          const count = changes.filter((c) => c.status === status).length;
          return (
            <Tab
              key={status}
              label={`${STATUS_LABELS[status]} (${count})`}
            />
          );
        })}
      </Tabs>

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell>Başlık</TableCell>
                <TableCell>Öncelik</TableCell>
                <TableCell>Workaround</TableCell>
                <TableCell>Müşteri Etkisi</TableCell>
                <TableCell>Tarih</TableCell>
                <TableCell align="center" width={48}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((c) => (
                <TableRow
                  key={c.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => setDrawerItem(c)}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{c.title}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={PRIORITY_LABEL[c.priority] ?? c.priority}
                      color={PRIORITY_COLOR(c.priority)}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={c.workaroundExists ? 'Var' : 'Yok'}
                      color={c.workaroundExists ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.customerImpact ?? '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(c.createdAt).toLocaleDateString('tr-TR')}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); handleMenuOpen(e, c); }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    Kayıt bulunamadı
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Row Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        {menuItem?.status !== 'RESOLVED' && (
          <MenuItem onClick={() => {
            statusMutation.mutate({ id: menuItem!.id, status: 'RESOLVED' });
            handleMenuClose();
          }}>
            Tamamlandı İşaretle
          </MenuItem>
        )}
        {menuItem?.status === 'OPEN' && (
          <MenuItem onClick={() => {
            statusMutation.mutate({ id: menuItem!.id, status: 'IN_PROGRESS' });
            handleMenuClose();
          }}>
            İşleme Al
          </MenuItem>
        )}
        <MenuItem
          sx={{ color: 'error.main' }}
          onClick={() => {
            deleteMutation.mutate(menuItem!.id);
            handleMenuClose();
          }}
        >
          Sil
        </MenuItem>
      </Menu>

      {/* Detail Drawer */}
      <Drawer
        anchor="right"
        open={Boolean(drawerItem)}
        onClose={() => setDrawerItem(null)}
        PaperProps={{ sx: { width: 520, p: 3 } }}
      >
        {drawerItem && (
          <>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">{drawerItem.title}</Typography>
              <Stack direction="row" spacing={1}>
                <Chip size="small" label={PRIORITY_LABEL[drawerItem.priority]} color={PRIORITY_COLOR(drawerItem.priority)} />
                <Chip size="small" label={STATUS_LABELS[drawerItem.status]} />
              </Stack>
            </Stack>
            <Divider sx={{ mb: 2 }} />

            <Typography variant="body2" color="text.secondary" mb={2}>
              {drawerItem.description}
            </Typography>

            <Stack spacing={1} mb={3}>
              <Stack direction="row" spacing={1}>
                <Typography variant="caption" color="text.secondary" sx={{ width: 140 }}>Workaround:</Typography>
                <Chip size="small" label={drawerItem.workaroundExists ? 'Var' : 'Yok'} color={drawerItem.workaroundExists ? 'success' : 'default'} />
              </Stack>
              {drawerItem.customerImpact && (
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <Typography variant="caption" color="text.secondary" sx={{ width: 140 }}>Müşteri Etkisi:</Typography>
                  <Typography variant="body2">{drawerItem.customerImpact}</Typography>
                </Stack>
              )}
              <Stack direction="row" spacing={1}>
                <Typography variant="caption" color="text.secondary" sx={{ width: 140 }}>Oluşturma:</Typography>
                <Typography variant="body2">{new Date(drawerItem.createdAt).toLocaleString('tr-TR')}</Typography>
              </Stack>
            </Stack>

            <Divider sx={{ mb: 2 }} />
            <Stack direction="row" spacing={1}>
              {drawerItem.status === 'OPEN' && (
                <Button
                  variant="contained" size="small"
                  onClick={() => statusMutation.mutate({ id: drawerItem.id, status: 'IN_PROGRESS' })}
                >
                  İşleme Al
                </Button>
              )}
              {(drawerItem.status === 'OPEN' || drawerItem.status === 'IN_PROGRESS') && (
                <Button
                  variant="outlined" color="success" size="small"
                  onClick={() => { statusMutation.mutate({ id: drawerItem.id, status: 'RESOLVED' }); setDrawerItem(null); }}
                >
                  Tamamlandı
                </Button>
              )}
              {drawerItem.status !== 'CANCELLED' && drawerItem.status !== 'RESOLVED' && (
                <Button
                  variant="outlined" color="error" size="small"
                  onClick={() => { statusMutation.mutate({ id: drawerItem.id, status: 'CANCELLED' }); setDrawerItem(null); }}
                >
                  İptal Et
                </Button>
              )}
            </Stack>
          </>
        )}
      </Drawer>

      {/* New Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Yeni Acil Değişiklik</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} mt={1}>
            <TextField
              label="Başlık" fullWidth required
              value={form.title ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <TextField
              label="Açıklama" fullWidth multiline rows={3} required
              value={form.description ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            <TextField
              label="Müşteri Etkisi" fullWidth
              value={form.customerImpact ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, customerImpact: e.target.value }))}
            />
            <FormControl component="fieldset">
              <FormLabel component="legend">Öncelik</FormLabel>
              <RadioGroup
                row
                value={form.priority ?? 'HIGH'}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as UrgentChange['priority'] }))}
              >
                <FormControlLabel value="CRITICAL" control={<Radio size="small" />} label="Kritik" />
                <FormControlLabel value="HIGH" control={<Radio size="small" />} label="Yüksek" />
                <FormControlLabel value="MEDIUM" control={<Radio size="small" />} label="Orta" />
                <FormControlLabel value="LOW" control={<Radio size="small" />} label="Düşük" />
              </RadioGroup>
            </FormControl>
            <FormControl component="fieldset">
              <FormLabel component="legend">Workaround mevcut mu?</FormLabel>
              <RadioGroup
                row
                value={form.workaroundExists ? 'yes' : 'no'}
                onChange={(e) => setForm((f) => ({ ...f, workaroundExists: e.target.value === 'yes' }))}
              >
                <FormControlLabel value="yes" control={<Radio size="small" />} label="Evet" />
                <FormControlLabel value="no" control={<Radio size="small" />} label="Hayır" />
              </RadioGroup>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>İptal</Button>
          <Button variant="contained" onClick={() => createMutation.mutate(form)} disabled={isSaving}>
            {isSaving ? <CircularProgress size={18} /> : 'Değişikliği Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
