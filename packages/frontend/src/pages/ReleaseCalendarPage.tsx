import { useState, useMemo, useEffect } from 'react';
import {
  Box, Typography, Paper, Chip, Button, ButtonGroup, ToggleButtonGroup,
  ToggleButton, Divider, CircularProgress, Select, MenuItem, FormControl,
  InputLabel, Drawer, TextField, Alert, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, FormControlLabel, Checkbox, IconButton, Menu, Tooltip,
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
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
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
  devStartDate?: string | null;
  testStartDate?: string | null;
  preProdDate?: string | null;
  targetDate?: string | null;
  releaseDate?: string | null;
  product: { id: string; name: string };
};

type Product = { id: string; name: string };

// ---------- Constants ----------
const MILESTONE_CONFIG = [
  { key: 'devStartDate',  label: 'Geliştirme',      overdueLabel: 'Geliştirme başlamalıydı', color: 'info'    as const },
  { key: 'testStartDate', label: 'Test',             overdueLabel: 'Test gecikmesi',          color: 'warning' as const },
  { key: 'targetDate',    label: 'Yayınlama',        overdueLabel: 'Yayınlama gecikmiş',      color: 'error'   as const },
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

// ---------- Overdue Logic ----------
// A version is overdue when its target release date is in the past
// but the phase hasn't reached PRODUCTION yet
const PHASE_ORDER_INDEX: Record<string, number> = {
  PLANNED: 0, DEVELOPMENT: 1, RC: 2, STAGING: 3, PRODUCTION: 4, ARCHIVED: 5,
};

/** Check if the version's target date is past and it hasn't reached PRODUCTION */
function isOverdue(v: { phase: string; targetDate?: string | null }): boolean {
  if (!v.targetDate) return false;
  if (PHASE_ORDER_INDEX[v.phase] >= PHASE_ORDER_INDEX['PRODUCTION']) return false;
  return new Date(v.targetDate) < new Date(new Date().toDateString());
}

/** How many days overdue (0 if not overdue) */
function overdueDays(v: { phase: string; targetDate?: string | null }): number {
  if (!isOverdue(v)) return 0;
  const diff = Date.now() - new Date(v.targetDate!).getTime();
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

/** Check if a specific milestone date is past but the version hasn't reached that stage */
function isMilestoneOverdue(
  milestoneKey: string,
  dateVal: string | null | undefined,
  currentPhase: string,
): boolean {
  if (!dateVal) return false;
  const milestonePhaseMap: Record<string, string> = {
    devStartDate:  'DEVELOPMENT',
    testStartDate: 'RC',
    targetDate:    'PRODUCTION',
  };
  const requiredPhase = milestonePhaseMap[milestoneKey];
  if (!requiredPhase) return false;
  const currentIdx = PHASE_ORDER_INDEX[currentPhase] ?? 0;
  const requiredIdx = PHASE_ORDER_INDEX[requiredPhase] ?? 0;
  if (currentIdx >= requiredIdx) return false;
  return new Date(dateVal) < new Date(new Date().toDateString());
}

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
  const [versionError, setVersionError] = useState('');
  const [isHotfix, setIsHotfix] = useState(false);
  const [description, setDescription] = useState('');
  const [masterStartDate, setMasterStartDate] = useState('');
  const [testDate, setTestDate] = useState('');
  const [targetDate, setTargetDate] = useState('');

  const SEMVER_RE = /^v?\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/;

  const handleVersionChange = (val: string) => {
    setVersion(val);
    if (val && !SEMVER_RE.test(val)) {
      setVersionError('Geçerli bir semver formatı girin (örn: 1.2.3 veya v1.2.3-rc1)');
    } else {
      setVersionError('');
    }
  };

  const create = useMutation({
    mutationFn: () => apiClient.post('/product-versions', {
      productId, version, isHotfix,
      description: description || undefined,
      masterStartDate: parseNullable(masterStartDate),
      testDate: parseNullable(testDate),
      targetDate: parseNullable(targetDate),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['versions-calendar'] });
      onClose();
      setProductId(''); setVersion(''); setIsHotfix(false); setDescription('');
      setMasterStartDate(''); setTestDate(''); setTargetDate('');
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
        <TextField
          label="Versiyon" required placeholder="v3.3.0"
          value={version} onChange={(e) => handleVersionChange(e.target.value)}
          error={!!versionError} helperText={versionError}
        />
        <TextField label="Açıklama" multiline rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        <FormControlLabel control={<Checkbox checked={isHotfix} onChange={(e) => setIsHotfix(e.target.checked)} />} label="Hotfix" />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>Tarihler (opsiyonel)</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <TextField label="Geliştirme Başlangıcı" type="date" size="small" value={masterStartDate} onChange={(e) => setMasterStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField label="Teste Başlama" type="date" size="small" value={testDate} onChange={(e) => setTestDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField label="Yayınlama Tarihi" type="date" size="small" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} InputLabelProps={{ shrink: true }} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>İptal</Button>
        <Button variant="contained" disabled={!productId || !version || !!versionError || create.isPending} onClick={() => create.mutate()}>
          {create.isPending ? <CircularProgress size={18} /> : 'Oluştur'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ---------- Edit Drawer ----------
function EditDrawer({ version: v, onClose }: { version: Version | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [phase, setPhase] = useState('');
  const [masterStartDate, setMasterStartDate] = useState('');
  const [testDate, setTestDate] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [description, setDescription] = useState('');

  // sync when version changes
  useEffect(() => {
    if (v) {
      setPhase(v.phase);
      setMasterStartDate(toDateInput(v.devStartDate));
      setTestDate(toDateInput(v.testStartDate));
      setTargetDate(toDateInput(v.targetDate));
      setDescription(v.description ?? '');
    }
  }, [v?.id]);

  const save = useMutation({
    mutationFn: () => apiClient.put(`/product-versions/${v!.id}`, {
      productId: v!.product.id,
      version: v!.version,
      phase,
      description: description || undefined,
      masterStartDate: parseNullable(masterStartDate),
      testDate: parseNullable(testDate),
      targetDate: parseNullable(targetDate),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['versions-calendar'] }); onClose(); },
  });



  return (
    <Drawer anchor="right" open={Boolean(v)} onClose={onClose} PaperProps={{ sx: { width: 360, p: 3 } }}>
      {v && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>{v.product.name} — {v.version}</Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
              <Chip label={PHASE_META[v.phase]?.label ?? v.phase} color={PHASE_META[v.phase]?.color ?? 'default'} size="small" />
              {v.isHotfix && <Chip label="HOTFIX" color="error" size="small" />}
            </Box>
          </Box>

          <Divider />

          <FormControl size="small" fullWidth>
            <InputLabel>Durum</InputLabel>
            <Select label="Durum" value={phase} onChange={(e) => setPhase(e.target.value)}>
              <MenuItem value="PLANNED">Henüz Başlanmadı</MenuItem>
              <MenuItem value="DEVELOPMENT">Geliştirme</MenuItem>
              <MenuItem value="RC">Test</MenuItem>
              <MenuItem value="PRODUCTION">Yayında</MenuItem>
              <MenuItem value="ARCHIVED">Arşiv</MenuItem>
            </Select>
          </FormControl>

          <Divider />

          <Typography variant="subtitle2" fontWeight={700}>Tarihler</Typography>

          <TextField label="🟢 Geliştirme Başlangıcı" type="date" fullWidth size="small" value={masterStartDate} onChange={(e) => setMasterStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField label="🟡 Teste Başlama" type="date" fullWidth size="small" value={testDate} onChange={(e) => setTestDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField label="🔵 Yayınlama Tarihi" type="date" fullWidth size="small" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} InputLabelProps={{ shrink: true }} />

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

          <Divider />

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
  const [deprecateWarn, setDeprecateWarn] = useState<{ id: string; customers: Array<{ customerName: string }>; count: number } | null>(null);

  const deprecateMut = useMutation({
    mutationFn: ({ id, force }: { id: string; force: boolean }) =>
      apiClient.patch(`/product-versions/${id}/deprecate${force ? '?force=true' : ''}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['versions-calendar'] }); setDeprecateWarn(null); },
    onError: (err: unknown, { id }) => {
      const resp = (err as { response?: { status?: number; data?: { error?: string; activeCustomers?: Array<{ customerName: string }>; count?: number } } })?.response;
      if (resp?.status === 409 && resp.data?.error === 'ACTIVE_CUSTOMERS') {
        setDeprecateWarn({ id, customers: resp.data.activeCustomers ?? [], count: resp.data.count ?? 0 });
      }
    },
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
          const phase = v.phase;
          const meta = PHASE_META[phase] ?? PHASE_META['PLANNED'];
          const overdue = isOverdue(v);
          const daysOver = overdueDays(v);

          return (
            <Paper
              key={v.id} variant="outlined"
              sx={{
                px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' },
                ...(overdue && { borderColor: 'warning.main', borderWidth: 2 }),
              }}
              onClick={() => onEdit(v)}
            >
              {/* Phase */}
              <Box sx={{ minWidth: 80, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Chip label={meta.label} color={meta.color} size="small" sx={{ fontWeight: 700 }} />
                {v.isHotfix && <Chip label="FIX" color="error" size="small" sx={{ ml: 0.5, fontSize: 10 }} />}
                {overdue && (
                  <Tooltip title={`Hedef tarih ${daysOver} gün aşıldı`}>
                    <WarningAmberIcon fontSize="small" color="warning" />
                  </Tooltip>
                )}
              </Box>

              {/* Product + Version */}
              <Box sx={{ minWidth: 140, flex: 1 }}>
                <Typography variant="body2" fontWeight={700}>{v.product.name} — {v.version}</Typography>
                {v.description && (
                  <Typography variant="caption" color="text.secondary" noWrap>{v.description}</Typography>
                )}
              </Box>

              {/* Milestones — her alan için görünür etiket */}
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', flex: 2 }}>
                {MILESTONE_CONFIG.map(({ key, label, overdueLabel, color }) => {
                  const dateVal = v[key as keyof Version] as string | null;
                  const milestoneOver = isMilestoneOverdue(key, dateVal, v.phase);
                  return (
                    <Tooltip key={key} title={milestoneOver ? `${overdueLabel} — aşama henüz ilerlemedi` : ''}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 64 }}>
                        <Typography variant="caption" color={milestoneOver ? 'warning.main' : 'text.secondary'} sx={{ fontSize: 10, lineHeight: 1.3, fontWeight: milestoneOver ? 700 : 400 }}>
                          {milestoneOver ? `⚠️ ${overdueLabel}` : label}
                        </Typography>
                        <Chip
                          label={fmtDate(dateVal)}
                          color={milestoneOver ? (key === 'targetDate' ? 'error' : 'warning') : dateVal ? color : 'default'}
                          size="small"
                          variant={milestoneOver ? 'filled' : dateVal ? 'filled' : 'outlined'}
                          sx={{ fontSize: 11, opacity: dateVal ? 1 : 0.4, mt: 0.25 }}
                        />
                      </Box>
                    </Tooltip>
                  );
                })}
              </Box>

              {/* Actions */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                <RowMenu onEdit={() => onEdit(v)} onDelete={() => onDelete(v)} />
              </Box>
            </Paper>
          );
        })}
      </Box>

      {/* Deprecate Active Customers Warning */}
      <Dialog open={Boolean(deprecateWarn)} onClose={() => setDeprecateWarn(null)}>
        <DialogTitle>Aktif Müşteriler Var</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 1 }}>
            Bu versiyonda <strong>{deprecateWarn?.count ?? 0}</strong> aktif müşteri bulunuyor.
            Arşivlemeye devam ederseniz bu müşteriler bilgilendirilecektir.
          </DialogContentText>
          {deprecateWarn?.customers.map((c, i) => (
            <Chip key={i} label={c.customerName} size="small" sx={{ mr: 0.5, mb: 0.5 }} color="warning" />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeprecateWarn(null)}>İptal</Button>
          <Button color="warning" variant="contained" disabled={deprecateMut.isPending}
            onClick={() => deprecateMut.mutate({ id: deprecateWarn!.id, force: true })}>
            {deprecateMut.isPending ? <CircularProgress size={14} /> : 'Yine de Arşivle'}
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
  const [phaseFilter, setPhaseFilter] = useState('');
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

  const PHASE_SORT_ORDER = ['PLANNED', 'DEVELOPMENT', 'RC', 'PRODUCTION'];

  const filtered = useMemo(() => {
    return versions.filter((v) => {
      if (!productFilter || v.product.id !== productFilter) return false;
      if (v.phase === 'ARCHIVED') return false; // BUG-013: ARCHIVED her zaman gizli
      if (hideProd && v.phase === 'PRODUCTION') return false;
      if (phaseFilter && v.phase !== phaseFilter) return false;
      return true;
    }).sort((a, b) => {
      const phaseA = PHASE_SORT_ORDER.indexOf(a.phase);
      const phaseB = PHASE_SORT_ORDER.indexOf(b.phase);
      if (phaseA !== phaseB) return phaseA - phaseB;
      const dateA = a.targetDate ? new Date(a.targetDate).getTime() : Infinity;
      const dateB = b.targetDate ? new Date(b.targetDate).getTime() : Infinity;
      return dateA - dateB;
    });
  }, [versions, productFilter, hideProd, phaseFilter]);

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

        <TextField
          select size="small" label="Aşama" value={phaseFilter}
          onChange={(e) => setPhaseFilter(e.target.value)}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">Tümü</MenuItem>
          <MenuItem value="PLANNED">{PHASE_META['PLANNED'].label}</MenuItem>
          <MenuItem value="DEVELOPMENT">{PHASE_META['DEVELOPMENT'].label}</MenuItem>
          <MenuItem value="RC">{PHASE_META['RC'].label}</MenuItem>
          <MenuItem value="PRODUCTION">{PHASE_META['PRODUCTION'].label}</MenuItem>
        </TextField>

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

      {/* Overdue Banner */}
      {!isLoading && !isError && (() => {
        const overdueVersions = filtered.filter(v => isOverdue(v));
        if (overdueVersions.length === 0) return null;
        return (
          <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ '& .MuiAlert-message': { width: '100%' } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Typography variant="body2">
                <strong>{overdueVersions.length} versiyon</strong> hedef yayın tarihini aşmış durumda.
                {overdueVersions.slice(0, 3).map(v => (
                  <Chip key={v.id} label={`${v.product.name} ${v.version}`} size="small" color="warning" variant="outlined" sx={{ ml: 0.5, fontSize: 11 }} />
                ))}
                {overdueVersions.length > 3 && <Typography component="span" variant="body2" color="text.secondary"> +{overdueVersions.length - 3} daha</Typography>}
              </Typography>
            </Box>
          </Alert>
        );
      })()}

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


