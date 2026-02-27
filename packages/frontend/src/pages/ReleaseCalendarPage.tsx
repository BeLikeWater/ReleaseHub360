import { useState, useMemo, useEffect } from 'react';
import {
  Box, Typography, Paper, Chip, Button, ButtonGroup, ToggleButtonGroup,
  ToggleButton, Divider, CircularProgress, Select, MenuItem, FormControl,
  InputLabel, Drawer, TextField, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, FormControlLabel, Checkbox, IconButton, Menu,
  ListItemIcon, ListItemText, MenuItem as MuiMenuItem,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ListIcon from '@mui/icons-material/List';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth,
  isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday,
} from 'date-fns';
import { tr } from 'date-fns/locale';
import apiClient from '@/api/client';
import { PHASE_META, computePhase } from '@/lib/versionPhase';

// ---------- Types ----------
type Version = {
  id: string;
  version: string;
  phase: string;
  isHotfix: boolean;
  description?: string | null;
  createdBy?: string | null;
  masterStartDate?: string | null;
  testDate?: string | null;
  preProdDate?: string | null;
  targetDate?: string | null;
  releaseDate?: string | null;
  product: { id: string; name: string };
};

type Product = { id: string; name: string };

// ---------- Constants ----------
const MILESTONE_CONFIG = [
  { key: 'masterStartDate', label: 'Dev',          color: 'info'    as const },
  { key: 'testDate',        label: 'Test',         color: 'warning' as const },
  { key: 'preProdDate',     label: 'Prep',         color: 'warning' as const },
  { key: 'targetDate',      label: 'Hedef Yayın',  color: 'error'   as const },
];

// ---------- Helpers ----------
function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return format(new Date(d), 'd MMM', { locale: tr });
}

function parseNullable(d: string): string | null {
  return d ? new Date(d + 'T12:00:00Z').toISOString() : null;
}

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

// Tarihe göre aşamayı otomatik hesapla → shared lib'den import edildi
// computePhase bkz: src/lib/versionPhase.ts

// ---------- Row Menu ----------
function RowMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  return (
    <>
      <IconButton size="small" onClick={(e) => { e.stopPropagation(); setAnchor(e.currentTarget); }}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MuiMenuItem onClick={() => { setAnchor(null); onEdit(); }}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Düzenle</ListItemText>
        </MuiMenuItem>
        <MuiMenuItem onClick={() => { setAnchor(null); onDelete(); }} sx={{ color: 'error.main' }}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Sil</ListItemText>
        </MuiMenuItem>
      </Menu>
    </>
  );
}

// ---------- Delete Dialog ----------
function DeleteDialog({ open, onClose, onConfirm, label }: { open: boolean; onClose: () => void; onConfirm: () => void; label: string }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Silme Onayı</DialogTitle>
      <DialogContent>
        <Typography><strong>{label}</strong> versiyonu kalıcı olarak silinecek. Emin misiniz?</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>İptal</Button>
        <Button color="error" variant="contained" onClick={onConfirm}>Sil</Button>
      </DialogActions>
    </Dialog>
  );
}

// ---------- New Version Dialog ----------
function VersionDialog({
  open, onClose, products,
}: {
  open: boolean;
  onClose: () => void;
  products: Product[];
}) {
  const qc = useQueryClient();
  const [productId, setProductId] = useState('');
  const [version, setVersion] = useState('');
  const [isHotfix, setIsHotfix] = useState(false);
  const [description, setDescription] = useState('');
  const [masterStartDate, setMasterStartDate] = useState('');
  const [testDate, setTestDate] = useState('');
  const [preProdDate, setPreProdDate] = useState('');
  const [targetDate, setTargetDate] = useState('');

  const create = useMutation({
    mutationFn: () => apiClient.post('/product-versions', {
      productId, version, isHotfix,
      description: description || undefined,
      masterStartDate: parseNullable(masterStartDate),
      testDate: parseNullable(testDate),
      preProdDate: parseNullable(preProdDate),
      targetDate: parseNullable(targetDate),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['versions-calendar'] });
      onClose();
      setProductId(''); setVersion(''); setIsHotfix(false); setDescription('');
      setMasterStartDate(''); setTestDate(''); setPreProdDate(''); setTargetDate('');
    },
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Yeni Versiyon Oluştur</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        <FormControl fullWidth required>
          <InputLabel>Ürün</InputLabel>
          <Select label="Ürün" value={productId} onChange={(e) => setProductId(e.target.value)}>
            {products.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField label="Versiyon" required placeholder="v3.3.0" value={version} onChange={(e) => setVersion(e.target.value)} />
        <TextField label="Açıklama" multiline rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        <FormControlLabel control={<Checkbox checked={isHotfix} onChange={(e) => setIsHotfix(e.target.checked)} />} label="Hotfix" />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Milestone Planlama (opsiyonel)</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <TextField label="Dev Başlangıcı" type="date" size="small" value={masterStartDate} onChange={(e) => setMasterStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField label="Test Tarihi" type="date" size="small" value={testDate} onChange={(e) => setTestDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField label="Pre-Prod Tarihi" type="date" size="small" value={preProdDate} onChange={(e) => setPreProdDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField label="Hedef Yayın" type="date" size="small" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} InputLabelProps={{ shrink: true }} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>İptal</Button>
        <Button variant="contained" disabled={!productId || !version || create.isPending} onClick={() => create.mutate()}>
          {create.isPending ? <CircularProgress size={18} /> : 'Oluştur'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ---------- Edit Drawer ----------
function EditDrawer({ version: v, onClose }: { version: Version | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [masterStartDate, setMasterStartDate] = useState('');
  const [testDate, setTestDate] = useState('');
  const [preProdDate, setPreProdDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [description, setDescription] = useState('');

  // sync when version changes
  useEffect(() => {
    if (v) {
      setMasterStartDate(toDateInput(v.masterStartDate));
      setTestDate(toDateInput(v.testDate));
      setPreProdDate(toDateInput(v.preProdDate));
      setTargetDate(toDateInput(v.targetDate));
      setDescription(v.description ?? '');
    }
  }, [v?.id]);

  const save = useMutation({
    mutationFn: () => apiClient.put(`/product-versions/${v!.id}`, {
      productId: v!.product.id,
      version: v!.version,
      description: description || undefined,
      masterStartDate: parseNullable(masterStartDate),
      testDate: parseNullable(testDate),
      preProdDate: parseNullable(preProdDate),
      targetDate: parseNullable(targetDate),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['versions-calendar'] }); onClose(); },
  });

  const { label: phaseLabel, color: phaseColor } = (v ? PHASE_META[computePhase(v)] : null) ?? PHASE_META['DEV'];

  return (
    <Drawer anchor="right" open={Boolean(v)} onClose={onClose} PaperProps={{ sx: { width: 360, p: 3 } }}>
      {v && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>{v.product.name} — {v.version}</Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
              <Chip label={phaseLabel} color={phaseColor} size="small" />
              {v.isHotfix && <Chip label="HOTFIX" color="error" size="small" />}
            </Box>
          </Box>

          <Divider />

          <Typography variant="subtitle2" fontWeight={700}>Milestone Tarihleri</Typography>

          <TextField label="🟢 Dev Başlangıcı" type="date" fullWidth size="small" value={masterStartDate} onChange={(e) => setMasterStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField label="🟡 Test Tarihi" type="date" fullWidth size="small" value={testDate} onChange={(e) => setTestDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField label="🟠 Pre-Prod Tarihi" type="date" fullWidth size="small" value={preProdDate} onChange={(e) => setPreProdDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField label="🔵 Hedef Yayın Tarihi" type="date" fullWidth size="small" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} InputLabelProps={{ shrink: true }} />

          <Divider />

          <TextField
            label="Açıklama" multiline rows={3} fullWidth size="small"
            value={description} onChange={(e) => setDescription(e.target.value)}
          />

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary" display="block">Oluşturan: {v.createdBy ?? '—'}</Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              Yayın Tarihi: {v.releaseDate ? fmtDate(v.releaseDate) : '—'}
            </Typography>
          </Box>

          <Box sx={{ mt: 'auto', display: 'flex', gap: 1 }}>
            <Button fullWidth onClick={onClose}>İptal</Button>
            <Button fullWidth variant="contained" onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? <CircularProgress size={18} /> : 'Kaydet'}
            </Button>
          </Box>
        </Box>
      )}
    </Drawer>
  );
}

// ---------- List View ----------
function ListView({ versions, onEdit, onDelete }: {
  versions: Version[];
  onEdit: (v: Version) => void;
  onDelete: (v: Version) => void;
}) {
  const qc = useQueryClient();
  const [releaseConfirm, setReleaseConfirm] = useState<{ id: string; label: string } | null>(null);

  const releaseMut = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/product-versions/${id}/release`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['versions-calendar'] }); setReleaseConfirm(null); },
  });

  if (versions.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">Filtre kriterlerine uygun versiyon bulunamadı.</Typography>
      </Paper>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {versions.map((v) => {
          const phase = computePhase(v);
          const meta = PHASE_META[phase] ?? PHASE_META['DEV'];
          const isWaiting = phase === 'WAITING';

          return (
            <Paper
              key={v.id} variant="outlined"
              sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
              onClick={() => onEdit(v)}
            >
              {/* Phase */}
              <Box sx={{ minWidth: 80 }}>
                <Chip label={meta.label} color={meta.color} size="small" sx={{ fontWeight: 700 }} />
                {v.isHotfix && <Chip label="FIX" color="error" size="small" sx={{ ml: 0.5, fontSize: 10 }} />}
              </Box>

              {/* Version */}
              <Box sx={{ minWidth: 140, flex: 1 }}>
                <Typography variant="body2" fontWeight={700}>{v.version}</Typography>
                {v.description && (
                  <Typography variant="caption" color="text.secondary" noWrap>{v.description}</Typography>
                )}
              </Box>

              {/* Milestones — her alan için görünür etiket */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', flex: 2 }}>
                {MILESTONE_CONFIG.map(({ key, label, color }) => {
                  const dateVal = v[key as keyof Version] as string | null;
                  return (
                    <Box key={key} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 64 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, lineHeight: 1.3 }}>
                        {label}
                      </Typography>
                      <Chip
                        label={fmtDate(dateVal)}
                        color={dateVal ? color : 'default'}
                        size="small"
                        variant={dateVal ? 'filled' : 'outlined'}
                        sx={{ fontSize: 11, opacity: dateVal ? 1 : 0.4, mt: 0.25 }}
                      />
                    </Box>
                  );
                })}
              </Box>

              {/* Actions */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                {isWaiting && (
                  <Button
                    size="small" variant="contained" color="success"
                    disabled={releaseMut.isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      setReleaseConfirm({ id: v.id, label: `${v.product.name} ${v.version}` });
                    }}
                    sx={{ whiteSpace: 'nowrap', fontSize: 12 }}
                  >
                    Yayına Al
                  </Button>
                )}
                <RowMenu onEdit={() => onEdit(v)} onDelete={() => onDelete(v)} />
              </Box>
            </Paper>
          );
        })}
      </Box>

      {/* Release onay dialog */}
      <Dialog open={Boolean(releaseConfirm)} onClose={() => setReleaseConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Yayın Onayı</DialogTitle>
        <DialogContent>
          <Typography>
            <strong>{releaseConfirm?.label}</strong> versiyonunu yayına almak istediğinize emin misiniz?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Onaylandıktan sonra yayın tarihi otomatik olarak kaydedilecek.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReleaseConfirm(null)}>İptal</Button>
          <Button
            variant="contained" color="success"
            disabled={releaseMut.isPending}
            onClick={() => releaseMut.mutate(releaseConfirm!.id)}
          >
            {releaseMut.isPending ? <CircularProgress size={16} /> : 'Yayına Al'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ---------- Calendar View ----------
function CalendarView({ versions, current, setCurrent }: {
  versions: Version[];
  current: Date;
  setCurrent: (d: Date) => void;
}) {
  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const DAYS_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

  // Build events: each milestone = separate event
  const events: { day: Date; label: string; color: 'success' | 'warning' | 'info' | 'error' }[] = [];
  versions.forEach((v) => {
    MILESTONE_CONFIG.forEach(({ key, color }) => {
      const d = v[key as keyof Version] as string | null;
      if (d) events.push({ day: new Date(d), label: `${v.version} (${PHASE_META[computePhase(v)]?.label ?? computePhase(v)})`, color });
    });
  });

  const eventsOnDay = (day: Date) => events.filter((e) => isSameDay(e.day, day));

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <ButtonGroup size="small">
          <Button onClick={() => setCurrent(subMonths(current, 1))}><ChevronLeftIcon /></Button>
          <Button onClick={() => setCurrent(new Date())}>Bugün</Button>
          <Button onClick={() => setCurrent(addMonths(current, 1))}><ChevronRightIcon /></Button>
        </ButtonGroup>
        <Typography fontWeight={600} sx={{ textTransform: 'capitalize' }}>
          {format(current, 'MMMM yyyy', { locale: tr })}
        </Typography>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', bgcolor: 'action.hover' }}>
        {DAYS_TR.map((d) => (
          <Box key={d} sx={{ textAlign: 'center', py: 1 }}>
            <Typography variant="caption" fontWeight={700}>{d}</Typography>
          </Box>
        ))}
      </Box>
      <Divider />
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {days.map((day, i) => {
          const dayEvents = eventsOnDay(day);
          return (
            <Box key={i} sx={{
              minHeight: 90, p: 0.5, borderRight: '1px solid', borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: !isSameMonth(day, current) ? 'action.disabledBackground' : isToday(day) ? 'primary.50' : undefined,
            }}>
              <Typography variant="caption" sx={{
                display: 'block', textAlign: 'right', fontWeight: isToday(day) ? 700 : 400,
                color: !isSameMonth(day, current) ? 'text.disabled' : 'text.primary',
              }}>{format(day, 'd')}</Typography>
              {dayEvents.slice(0, 2).map((e, ei) => (
                <Chip key={ei} label={e.label} size="small" color={e.color}
                  sx={{ fontSize: 9, mb: 0.25, maxWidth: '100%', height: 18 }} />
              ))}
              {dayEvents.length > 2 && (
                <Typography variant="caption" color="text.secondary">+{dayEvents.length - 2} daha</Typography>
              )}
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}

// ---------- Main Page ----------
export default function ReleaseCalendarPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [current, setCurrent] = useState(new Date());
  const [productFilter, setProductFilter] = useState('');
  const [hideProd, setHideProd] = useState(false);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [editVersion, setEditVersion] = useState<Version | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Version | null>(null);

  const { data: versions = [], isLoading, isError } = useQuery<Version[]>({
    queryKey: ['versions-calendar'],
    queryFn: () => apiClient.get('/product-versions').then((r) => {
      const d = r.data.data ?? r.data;
      return Array.isArray(d) ? d : [];
    }),
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products-list'],
    queryFn: () => apiClient.get('/products').then((r) => r.data.data ?? []),
    // İlk ürünü otomatik seç
    staleTime: 0,
  });

  // Ürünler yüklenince otomatik olarak ilkini seç
  useEffect(() => {
    if (products.length > 0 && !productFilter) {
      setProductFilter(products[0].id);
    }
  }, [products]);

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/product-versions/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['versions-calendar'] }); setDeleteTarget(null); },
  });

  const PHASE_SORT_ORDER = ['DEV', 'TEST', 'PREP', 'WAITING', 'PROD'];

  const filtered = useMemo(() => {
    return versions.filter((v) => {
      if (!productFilter || v.product.id !== productFilter) return false;
      if (v.phase === 'ARCHIVED') return false; // BUG-013: ARCHIVED her zaman gizli
      const phase = computePhase(v);
      if (hideProd && phase === 'PROD') return false;
      return true;
    }).sort((a, b) => {
      const phaseA = PHASE_SORT_ORDER.indexOf(computePhase(a));
      const phaseB = PHASE_SORT_ORDER.indexOf(computePhase(b));
      if (phaseA !== phaseB) return phaseA - phaseB;
      const dateA = a.targetDate ? new Date(a.targetDate).getTime() : Infinity;
      const dateB = b.targetDate ? new Date(b.targetDate).getTime() : Infinity;
      return dateA - dateB;
    });
  }, [versions, productFilter, hideProd]);

  const selectedProduct = products.find((p) => p.id === productFilter);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Yayın Takvimi</Typography>
          {selectedProduct && (
            <Typography variant="body2" color="text.secondary">{selectedProduct.name}</Typography>
          )}
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setNewDialogOpen(true)} disabled={!productFilter}>
          Yeni Versiyon
        </Button>
      </Box>

      {/* Filter bar */}
      <Paper variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 220 }} required>
          <InputLabel>Ürün Seç</InputLabel>
          <Select label="Ürün Seç" value={productFilter} onChange={(e) => setProductFilter(e.target.value)}>
            {products.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControlLabel
          control={<Checkbox size="small" checked={hideProd} onChange={(e) => setHideProd(e.target.checked)} />}
          label={<Typography variant="body2">Yayınlananları gizle</Typography>}
        />

        <Box sx={{ ml: 'auto' }}>
          <ToggleButtonGroup value={view} exclusive onChange={(_, v) => v && setView(v)} size="small">
            <ToggleButton value="list"><ListIcon fontSize="small" /></ToggleButton>
            <ToggleButton value="calendar"><CalendarMonthIcon fontSize="small" /></ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Paper>

      {/* Loading / Error */}
      {isLoading && <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>}
      {isError && <Alert severity="error">Versiyonlar yüklenemedi.</Alert>}

      {/* Content */}
      {!isLoading && !isError && (
        <>
          {view === 'list' && (
            <ListView
              versions={filtered}
              onEdit={(v) => setEditVersion(v)}
              onDelete={(v) => setDeleteTarget(v)}
            />
          )}
          {view === 'calendar' && (
            <CalendarView versions={filtered} current={current} setCurrent={setCurrent} />
          )}
        </>
      )}

      {/* Dialogs / Drawers */}
      <VersionDialog open={newDialogOpen} onClose={() => setNewDialogOpen(false)} products={products} />
      <EditDrawer version={editVersion} onClose={() => setEditVersion(null)} />
      <DeleteDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate(deleteTarget!.id)}
        label={`${deleteTarget?.product.name} ${deleteTarget?.version ?? ''}`}
      />
    </Box>
  );
}


