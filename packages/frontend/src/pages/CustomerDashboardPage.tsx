import { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, CardActions,
  Chip, CircularProgress, Stack, Breadcrumbs, Link,
  Button, Alert, Divider, Tooltip, Paper,
  Snackbar, Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  WarningAmber as WarningIcon,
  ArrowBack as ArrowBackIcon,
  ChevronRight as ChevronRightIcon,
  Inventory2 as ProductIcon,
  Download as DownloadIcon,
  Cloud as SaasIcon,
  Code as CodeSyncIcon,
  CalendarMonth as CalendarIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import api from '@/api/client';
import { useAuthStore } from '@/store/authStore';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CustomerDashboardData {
  customer: {
    id: string; name: string; code: string; contactEmail: string | null;
    contactPhone: string | null; address: string | null; notes: string | null;
    isActive: boolean; environments: string[]; ticketPlatform: string | null;
  };
  summary: {
    totalProducts: number;
    onLatestCount: number;
    pendingUpdateCount: number;
    lastDeployDate: string | null;
    openIssueCount: number;
    incompleteTodoCount: number;
    pendingTransition: {
      id: string;
      status: string;
      toVersion: string;
      productName: string;
    } | null;
  };
  productMappings: EnrichedMapping[];
  serviceMappings: ServiceMapping[];
}

interface VersionPackage {
  id: string;
  productVersionId: string;
  packageType: string;
  name: string;
  version: string | null;
  description: string | null;
  artifactUrl: string | null;
  helmRepoUrl: string | null;
  helmChartName: string | null;
  sizeBytes: number | null;
  checksum: string | null;
  downloadCount: number;
  publishedAt: string | null;
}

interface EnrichedMapping {
  id: string;
  productVersionId: string;
  branch: string | null;
  environment: string | null;
  notes: string | null;
  isActive: boolean;
  subscriptionLevel: string | null;
  artifactType: string | null;
  deploymentModel: string | null;
  hostingType: string | null;
  productVersion: {
    id: string; version: string; phase: string;
    targetDate: string | null; releaseDate: string | null;
    product: { id: string; name: string };
  };
  latestProductionVersion: { id: string; version: string; releaseDate: string | null } | null;
  isOnLatest: boolean;
  todoProgress: { total: number; completed: number; p0Incomplete: number } | null;
  versionPackages: VersionPackage[];
}

interface ServiceMapping {
  id: string;
  customerId: string;
  serviceId: string;
  port: number | null;
  branch: string | null;
  environment: string | null;
}

interface Transition {
  id: string;
  customerId: string;
  fromVersionId: string | null;
  toVersionId: string;
  environment: string;
  status: string;
  plannedDate: string | null;
  actualDate: string | null;
  notes: string | null;
  createdAt: string;
  // BUG-020 FIX: Ürün adı ve hedef versiyon backend include ile geliyor
  toVersion?: {
    id: string;
    version: string;
    product: { id: string; name: string };
  };
}

// ── Plan Transition Modal (S-03) ──────────────────────────────────────────────

const PLAN_ENVIRONMENTS = [
  { key: 'TEST',     label: 'Test' },
  { key: 'PRE_PROD', label: 'Pre-Prod' },
  { key: 'PROD',     label: 'Production' },
] as const;

function PlanTransitionModal({
  open, onClose, customerId, toVersionId, productName, versionName, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  customerId: string;
  toVersionId: string;
  productName: string;
  versionName: string;
  onSuccess: () => void;
}) {
  const qc = useQueryClient();
  const [dates, setDates] = useState<Record<string, { planned: string; actual: string }>>(() => {
    const init: Record<string, { planned: string; actual: string }> = {};
    PLAN_ENVIRONMENTS.forEach(({ key }) => { init[key] = { planned: '', actual: '' }; });
    return init;
  });

  const { data: transitionsData } = useQuery<{ data: Transition[] }>({
    queryKey: ['transitions-modal', customerId, toVersionId],
    queryFn: () => api.get('/customer-version-transitions', { params: { customerId } }).then(r => r.data),
    enabled: open && !!toVersionId,
  });

  const existingTransitions = transitionsData?.data ?? [];

  useEffect(() => {
    const init: Record<string, { planned: string; actual: string }> = {};
    PLAN_ENVIRONMENTS.forEach(({ key }) => {
      const ex = existingTransitions.find(t => t.toVersionId === toVersionId && t.environment === key);
      init[key] = { planned: ex?.plannedDate?.slice(0, 10) ?? '', actual: ex?.actualDate?.slice(0, 10) ?? '' };
    });
    setDates(init);
  }, [existingTransitions, toVersionId]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const promises = PLAN_ENVIRONMENTS.map(async ({ key }) => {
        const ex = existingTransitions.find(t => t.toVersionId === toVersionId && t.environment === key);
        const payload = {
          customerId,
          toVersionId,
          environment: key,
          plannedDate: dates[key].planned ? new Date(dates[key].planned).toISOString() : null,
          actualDate: dates[key].actual ? new Date(dates[key].actual).toISOString() : null,
        };
        if (ex) return api.patch(`/customer-version-transitions/${ex.id}`, payload);
        if (dates[key].planned || dates[key].actual) return api.post('/customer-version-transitions', payload);
      });
      await Promise.all(promises);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transitions', customerId] });
      qc.invalidateQueries({ queryKey: ['transitions-modal', customerId, toVersionId] });
      qc.invalidateQueries({ queryKey: ['customer-dashboard', customerId] });
      onSuccess();
      onClose();
    },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>📅 Geçiş Planı — {productName} {versionName}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Her ortam için planlanan ve gerçekleşen tarihleri girin.
          Production gerçekleşen tarih kaydedildiğinde müşterinin mevcut versiyonu otomatik güncellenir.
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 700 }}>Ortam</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Planlanan Tarih</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Gerçekleşen Tarih</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {PLAN_ENVIRONMENTS.map(({ key, label }) => (
                <TableRow key={key}>
                  <TableCell><Chip label={label} size="small" /></TableCell>
                  <TableCell>
                    <TextField
                      type="date"
                      size="small"
                      value={dates[key].planned}
                      onChange={(e) => setDates(p => ({ ...p, [key]: { ...p[key], planned: e.target.value } }))}
                      slotProps={{ inputLabel: { shrink: true } }}
                      sx={{ width: 150 }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="date"
                      size="small"
                      value={dates[key].actual}
                      onChange={(e) => setDates(p => ({ ...p, [key]: { ...p[key], actual: e.target.value } }))}
                      slotProps={{ inputLabel: { shrink: true } }}
                      sx={{ width: 150 }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {saveMutation.isError && <Alert severity="error" sx={{ mt: 1.5 }}>Kayıt sırasında hata oluştu.</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saveMutation.isPending}>İptal</Button>
        <Button variant="contained" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
          {saveMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Transitions Section (S-04) ────────────────────────────────────────────────

function TransitionsSection({ customerId }: { customerId: string }) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<Dayjs | null>(null);

  const { data, isLoading } = useQuery<{ data: Transition[] }>({
    queryKey: ['transitions', customerId],
    queryFn: () => api.get('/customer-version-transitions', { params: { customerId } }).then(r => r.data),
    enabled: !!customerId,
  });

  const patchMutation = useMutation({
    mutationFn: ({ id, actualDate }: { id: string; actualDate: string }) =>
      api.patch(`/customer-version-transitions/${id}`, { actualDate, environment: 'PROD' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transitions', customerId] });
      setEditingId(null);
    },
  });

  const transitions = data?.data ?? [];
  if (isLoading) return <CircularProgress size={20} />;
  if (transitions.length === 0) return null;

  return (
    <Box mt={4}>
      <Typography
        variant="caption"
        fontWeight={700}
        color="text.secondary"
        sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 2 }}
      >
        Geçiş Planları
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 700 }}>Ürün</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Hedef Versiyon</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Ortam</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Durum</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Planlanan Tarih</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Gerçekleşen Tarih</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transitions.map(t => (
              <TableRow key={t.id}>
                <TableCell>
                  <Typography variant="caption" fontWeight={600}>
                    {t.toVersion?.product?.name ?? '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={t.toVersion?.version ?? t.toVersionId.slice(0, 8)}
                    variant="outlined"
                    sx={{ fontFamily: 'monospace', fontSize: 11 }}
                  />
                </TableCell>
                <TableCell><Chip size="small" label={t.environment} variant="outlined" /></TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={t.status}
                    color={t.status === 'PLANNED' ? 'info' : t.status === 'COMPLETED' ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="caption">
                    {t.plannedDate ? new Date(t.plannedDate).toLocaleDateString('tr-TR') : '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  {t.environment === 'PROD' && editingId === t.id ? (
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <DatePicker
                          value={editDate}
                          onChange={val => setEditDate(val)}
                          slotProps={{ textField: { size: 'small', sx: { width: 150 } } }}
                        />
                        <Button
                          size="small"
                          variant="contained"
                          disabled={!editDate || patchMutation.isPending}
                          onClick={() => editDate && patchMutation.mutate({ id: t.id, actualDate: editDate.toISOString() })}
                        >
                          Kaydet
                        </Button>
                        <Button size="small" onClick={() => setEditingId(null)}>İptal</Button>
                      </Stack>
                    </LocalizationProvider>
                  ) : (
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Typography variant="caption">
                        {t.actualDate ? new Date(t.actualDate).toLocaleDateString('tr-TR') : '—'}
                      </Typography>
                      {t.environment === 'PROD' && (
                        <Tooltip title="Gerçekleşen tarihi düzenle">
                          <Button
                            size="small"
                            startIcon={<EditIcon fontSize="inherit" />}
                            sx={{ minWidth: 0, p: 0.25, fontSize: 11 }}
                            onClick={() => { setEditingId(t.id); setEditDate(t.actualDate ? dayjs(t.actualDate) : null); }}
                          >
                            Düzenle
                          </Button>
                        </Tooltip>
                      )}
                    </Stack>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

// E1-02: CPM product card stats from new endpoint
interface CPMProductStat {
  mappingId: string;
  productId: string;
  productName: string;
  currentVersionId: string | null;
  currentVersion: string | null;
  versionPhase: string | null;
  lastReleaseDate: string | null;
  targetDate: string | null;
  totalTodos: number;
  completedTodos: number;
  todoCompletionPct: number;
  openIssueCount: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Product Card ──────────────────────────────────────────────────────────────

function ProductCard({ mapping, stat, onNavigate, onRequestUpdate, onPlanTransition }: {
  mapping: EnrichedMapping;
  stat?: CPMProductStat;
  onNavigate: (productId: string) => void;
  onRequestUpdate: (mappingId: string) => void;
  onPlanTransition: (productVersionId: string, productName: string, versionName: string) => void;
}) {
  const navigate = useNavigate();
  const current = mapping.productVersion;
  const latest = mapping.latestProductionVersion;
  const needsUpdate = !mapping.isOnLatest && !!latest;
  const deployDate = current.releaseDate ?? current.targetDate;
  const deployModel = mapping.deploymentModel;
  const artifactType = mapping.artifactType;

  // BUG-017 FIX: Use backend generator endpoints directly — don't depend on VersionPackage.artifactUrl
  const handleDownloadHelm = () => {
    window.open(`/api/customer-deployments/download/helm/${mapping.id}`, '_blank');
  };
  const handleDownloadBinary = () => {
    window.open(`/api/customer-deployments/download/binary/${mapping.id}`, '_blank');
  };

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '4px solid',
        borderLeftColor: needsUpdate ? 'warning.main' : 'success.main',
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 3 },
      }}
    >
      <CardContent sx={{ flex: 1, pb: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              {current.product.name}
            </Typography>
            {mapping.subscriptionLevel && (
              <Chip size="small" label={mapping.subscriptionLevel} variant="outlined" sx={{ fontSize: 11 }} />
            )}
          </Box>
          {needsUpdate ? (
            <Chip
              icon={<WarningIcon />}
              label="Güncelleme var"
              color="warning"
              size="small"
              sx={{ fontWeight: 600 }}
            />
          ) : (
            <Chip
              icon={<CheckCircleIcon />}
              label="Güncel"
              color="success"
              size="small"
              variant="outlined"
            />
          )}
        </Stack>

        <Stack spacing={0.75}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="text.secondary">Mevcut versiyon</Typography>
            <Chip
              label={current.version}
              color="primary"
              size="small"
              sx={{ fontFamily: 'monospace', fontWeight: 600 }}
            />
          </Stack>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="text.secondary">Son sürüm</Typography>
            {latest ? (
              <Chip
                label={latest.version}
                color={mapping.isOnLatest ? 'success' : 'warning'}
                variant={mapping.isOnLatest ? 'outlined' : 'filled'}
                size="small"
                sx={{ fontFamily: 'monospace', fontWeight: 600 }}
              />
            ) : (
              <Typography variant="caption" color="text.disabled">—</Typography>
            )}
          </Stack>
        </Stack>

        {deployDate && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="caption" color="text.secondary">
              📅 Son deploy: {fmtDate(deployDate)}
            </Typography>
          </>
        )}

        {/* E1-01: Enriched stats from CPM endpoint */}
        {stat && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Stack spacing={0.5}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">Görev tamamlama</Typography>
                <Typography variant="caption" fontWeight={600} color={stat.todoCompletionPct >= 100 ? 'success.main' : stat.todoCompletionPct >= 50 ? 'warning.main' : 'error.main'}>
                  {stat.completedTodos}/{stat.totalTodos} ({stat.todoCompletionPct}%)
                </Typography>
              </Stack>
              {stat.openIssueCount > 0 && (
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">Açık sorun</Typography>
                  <Chip label={stat.openIssueCount} size="small" color="error" sx={{ height: 18, fontSize: 11 }} />
                </Stack>
              )}
            </Stack>
          </>
        )}
      </CardContent>

      <CardActions sx={{ pt: 0, px: 2, pb: 2, flexDirection: 'column', gap: 0.75, alignItems: 'stretch' }}>
        {/* S-01: Artifact action buttons based on deployment model */}
        {deployModel === 'SAAS' && (
          <Button
            fullWidth
            variant="outlined"
            color="info"
            startIcon={<SaasIcon />}
            onClick={() => onRequestUpdate(mapping.id)}
            size="small"
          >
            Güncelleme Talep Et
          </Button>
        )}
        {(deployModel === 'ON_PREM') && artifactType === 'HELM' && (
          <Button
            fullWidth
            variant="outlined"
            color="secondary"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadHelm}
            size="small"
          >
            HelmChart İndir
          </Button>
        )}
        {(deployModel === 'ON_PREM') && artifactType === 'BINARY' && (
          <Button
            fullWidth
            variant="outlined"
            color="secondary"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadBinary}
            size="small"
          >
            Paketi İndir
          </Button>
        )}
        {(deployModel === 'ON_PREM') && artifactType === 'GIT_SYNC' && (
          <Button
            fullWidth
            variant="outlined"
            color="inherit"
            startIcon={<CodeSyncIcon />}
            onClick={() => navigate('/code-sync')}
            size="small"
          >
            Code Sync Başlat →
          </Button>
        )}

        <Button
          fullWidth
          variant={needsUpdate ? 'contained' : 'outlined'}
          color={needsUpdate ? 'warning' : 'primary'}
          startIcon={<ChevronRightIcon />}
          onClick={() => onNavigate(current.product.id)}
          size="small"
        >
          Versiyonları Gör
        </Button>

        {/* S-03: Plan transition button */}
        <Button
          fullWidth
          variant="outlined"
          color="inherit"
          startIcon={<CalendarIcon />}
          onClick={() => onPlanTransition(latest?.id ?? mapping.productVersionId, current.product.name, latest?.version ?? current.version)}
          size="small"
        >
          Geçiş Planla
        </Button>
      </CardActions>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CustomerDashboardPage() {
  const { id: paramId } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const id = paramId ?? user?.customerId;
  const navigate = useNavigate();
  const [toast, setToast] = useState<string | null>(null);
  const [planModal, setPlanModal] = useState<{ productVersionId: string; productName: string; versionName: string } | null>(null);

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data, isLoading, isError } = useQuery<CustomerDashboardData>({
    queryKey: ['customer-dashboard', id],
    queryFn: () => api.get(`/dashboard/customer/${id}`).then((r) => r.data.data),
    enabled: !!id,
  });

  const { data: issuesData } = useQuery<{ data: { id: string }[] }>({
    queryKey: ['my-issues', id],
    queryFn: () => api.get('/transition-issues/my').then((r) => r.data),
    enabled: !!id,
  });

  // E1-01: Enriched CPM product stats (todo counts, open issues)
  const { data: cpmStatsData } = useQuery<{ data: CPMProductStat[] }>({
    queryKey: ['customer-products-stats', id],
    queryFn: () => api.get(`/dashboard/customer-products?customerId=${id}`).then((r) => r.data),
    enabled: !!id,
    staleTime: 60_000,
  });

  // ── Derived ───────────────────────────────────────────────────────────────
  const customer = data?.customer;
  const productMappings = data?.productMappings ?? [];
  const updatesNeeded = productMappings.filter((m) => !m.isOnLatest).length;
  const openIssues = data?.summary?.openIssueCount ?? (issuesData?.data?.length ?? 0);
  const incompleteTodos = data?.summary?.incompleteTodoCount ?? 0;
  const pendingTransition = data?.summary?.pendingTransition ?? null;

  const handleViewVersions = (productId: string) => {
    navigate(`/customers/${id}/products/${productId}`);
  };

  const handleRequestUpdate = async (mappingId: string) => {
    try {
      await api.post('/customer-deployments/request-update', { customerProductMappingId: mappingId });
      setToast('Güncelleme talebi oluşturuldu.');
    } catch {
      setToast('Güncelleme talebi gönderilemedi.');
    }
  };

  const handlePlanTransition = (productVersionId: string, productName: string, versionName: string) => {
    setPlanModal({ productVersionId, productName, versionName });
  };

  // ── Loading / Error ───────────────────────────────────────────────────────
  if (isLoading) {
    return <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>;
  }

  if (isError || !data) {
    return (
      <Box p={3}>
        <Alert severity="error">Müşteri bilgileri yüklenemedi.</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/customer-management')} sx={{ mt: 2 }}>
          Müşteri Yönetimi'ne Dön
        </Button>
      </Box>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box p={3}>
      {/* Breadcrumb */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/customer-management" underline="hover" color="inherit">
          Müşteri Yönetimi
        </Link>
        <Typography color="text.primary">{customer?.name}</Typography>
      </Breadcrumbs>

      {/* Customer header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>{customer?.name}</Typography>
          <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
            <Chip
              size="small"
              label={customer?.isActive ? 'Aktif' : 'Pasif'}
              color={customer?.isActive ? 'success' : 'default'}
              variant="outlined"
            />
            {customer?.code && (
              <Typography variant="body2" color="text.secondary" fontFamily="monospace">
                #{customer.code}
              </Typography>
            )}
          </Stack>
        </Box>

      </Stack>

      {/* Summary stat chips */}
      <Stack direction="row" spacing={2} mb={3} flexWrap="wrap">
        <Paper variant="outlined" sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <ProductIcon fontSize="small" color="primary" />
          <Box>
            <Typography variant="h6" fontWeight={700} lineHeight={1}>{productMappings.length}</Typography>
            <Typography variant="caption" color="text.secondary">Aktif Ürün</Typography>
          </Box>
        </Paper>

        <Paper
          variant="outlined"
          sx={{
            px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', gap: 1,
            ...(updatesNeeded > 0 ? { borderColor: 'warning.main' } : {}),
          }}
        >
          <WarningIcon fontSize="small" color={updatesNeeded > 0 ? 'warning' : 'disabled'} />
          <Box>
            <Typography
              variant="h6"
              fontWeight={700}
              lineHeight={1}
              color={updatesNeeded > 0 ? 'warning.dark' : 'text.primary'}
            >
              {updatesNeeded}
            </Typography>
            <Typography variant="caption" color="text.secondary">Güncelleme Bekliyor</Typography>
          </Box>
        </Paper>

        {openIssues > 0 && (
          <Paper
            variant="outlined"
            sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', gap: 1, borderColor: 'error.main' }}
          >
            <Box>
              <Typography variant="h6" fontWeight={700} lineHeight={1} color="error.dark">{openIssues}</Typography>
              <Typography variant="caption" color="text.secondary">Açık Sorun</Typography>
            </Box>
          </Paper>
        )}

        {incompleteTodos > 0 && (
          <Paper
            variant="outlined"
            sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', gap: 1, borderColor: 'info.light' }}
          >
            <Box>
              <Typography variant="h6" fontWeight={700} lineHeight={1} color="info.dark">{incompleteTodos}</Typography>
              <Typography variant="caption" color="text.secondary">Bekleyen Görev</Typography>
            </Box>
          </Paper>
        )}
      </Stack>

      {/* U-01: Pending transition banner */}
      {pendingTransition && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>{pendingTransition.productName}</strong> için aktif geçiş planı var: v{pendingTransition.toVersion} — durum: <strong>{pendingTransition.status}</strong>
        </Alert>
      )}

      {/* Section label */}
      <Typography
        variant="caption"
        fontWeight={700}
        color="text.secondary"
        sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 2 }}
      >
        Ürünler
      </Typography>

      {/* Product cards */}
      {productMappings.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            Bu müşteriye henüz ürün atanmamış. Müşteri Yönetimi üzerinden ürün ekleyebilirsiniz.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {productMappings.map((mapping) => {
            const stat = cpmStatsData?.data?.find(
              s => s.mappingId === mapping.id, // BUG-019 FIX: mappingId ile eşleştir (productId değil)
            );
            return (
              <Grid key={mapping.id} size={{ xs: 12, sm: 6, lg: 4 }}>
                <ProductCard
                  mapping={mapping}
                  stat={stat}
                  onNavigate={handleViewVersions}
                  onRequestUpdate={handleRequestUpdate}
                  onPlanTransition={handlePlanTransition}
                />
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* S-04: Transitions table */}
      {id && <TransitionsSection customerId={id} />}

      {/* S-03: Plan Transition Modal */}
      {planModal && id && (
        <PlanTransitionModal
          open={!!planModal}
          onClose={() => setPlanModal(null)}
          customerId={id}
          toVersionId={planModal.productVersionId}
          productName={planModal.productName}
          versionName={planModal.versionName}
          onSuccess={() => setToast('Geçiş planları oluşturuldu.')}
        />
      )}

      {/* Toast */}
      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
