import { useState } from 'react';
import {
  Box, Typography, Chip, CircularProgress, Stack, Breadcrumbs, Link,
  Button, Alert, Paper, Divider, Drawer,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Select, MenuItem, FormControl, InputLabel,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
  Snackbar, Accordion, AccordionSummary, AccordionDetails, List, ListItem, ListItemText,
  IconButton, Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ArticleOutlined as ArticleIcon,
  CalendarMonth as CalendarIcon,
  ChecklistRtl as ChecklistIcon,
  BugReport as BugReportIcon,
  ExpandMore as ExpandMoreIcon,
  Inventory2Outlined as PackageIcon,
  Download as DownloadIcon,
  OpenInNew as OpenInNewIcon,
  ChangeHistory as ChangeHistoryIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import api from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import CustomerTodoList from '@/components/CustomerTodoList';
import CustomerReleaseNoteDrawer from '@/components/CustomerReleaseNoteDrawer';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProductVersion {
  id: string;
  version: string;
  phase: string;
  targetDate: string | null;
  releaseDate: string | null;
  changelog: string | null;
  isHotfix: boolean;
  product: { id: string; name: string };
}

interface CustomerVersionTransition {
  id: string;
  customerId: string;
  toVersionId: string;
  fromVersionId: string | null;
  environment: string;
  status: string;
  plannedDate: string | null;
  actualDate: string | null;
  notes: string | null;
  createdAt: string;
  toVersion: { id: string; version: string; phase: string; product: { id: string; name: string } };
}

interface CustomerIssue {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  module: string | null;
  createdAt: string;
  productVersion: { id: string; version: string; product: { id: string; name: string } } | null;
}

interface ServiceSnapshot {
  id: string;
  serviceId: string;
  productVersionId: string;
  releaseName: string | null;
  releasedAt: string;
  notes: string | null;
  service: { id: string; name: string; description: string | null; dockerImageName: string | null };
}

interface SystemChange {
  id: string;
  productVersionId: string | null;
  changeType: string;
  title: string;
  description: string | null;
  apiPath: string | null;
  isBreaking: boolean;
  createdAt: string;
}

interface VersionPackage {
  id: string;
  productVersionId: string;
  packageType: string;
  name: string;
  version: string;
  description: string | null;
  artifactUrl: string | null;
  helmRepoUrl: string | null;
  imageName: string | null;
  imageTag: string | null;
  sizeBytes: string | null;
  downloadCount: number;
}

const ISSUE_STATUS_META: Record<string, { label: string; color: 'default' | 'warning' | 'info' | 'success' | 'error' }> = {
  OPEN:         { label: 'Açık',         color: 'error'   },
  ACKNOWLEDGED: { label: 'İncelenİyor',  color: 'warning' },
  IN_PROGRESS:  { label: 'Devam Ediyor', color: 'info'    },
  RESOLVED:     { label: 'Çözüldü',      color: 'success' },
  CLOSED:       { label: 'Kapatıldı',    color: 'default' },
};

const ISSUE_PRIORITY_META: Record<string, { label: string; color: 'default' | 'warning' | 'error' | 'success' }> = {
  CRITICAL: { label: '🔴 Kritik', color: 'error'   },
  HIGH:     { label: '🟠 Yüksek', color: 'warning' },
  MEDIUM:   { label: '🟡 Orta',   color: 'default' },
  LOW:      { label: '🟢 Düşük',  color: 'success' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function versionDate(v: ProductVersion): string | null {
  return v.releaseDate ?? v.targetDate;
}

type VersionStatus = 'current' | 'newer' | 'older';

function getVersionStatus(
  version: ProductVersion,
  currentVersionId: string | null,
  sortedDesc: ProductVersion[],
): VersionStatus {
  if (version.id === currentVersionId) return 'current';
  if (!currentVersionId) return 'older';
  const currentIdx = sortedDesc.findIndex((v) => v.id === currentVersionId);
  const thisIdx = sortedDesc.findIndex((v) => v.id === version.id);
  if (currentIdx === -1) return 'older';
  return thisIdx < currentIdx ? 'newer' : 'older';
}

const STATUS_CONFIG: Record<VersionStatus, {
  label: string;
  chipColor: 'primary' | 'warning' | 'default';
  borderColor: string;
  bgSx: object;
}> = {
  current: { label: '📍 MEVCUT', chipColor: 'primary',  borderColor: 'primary.main', bgSx: { bgcolor: 'primary.50' } },
  newer:   { label: '🆕 YENİ',   chipColor: 'warning',  borderColor: 'warning.main', bgSx: { bgcolor: 'warning.50' } },
  older:   { label: 'GEÇMİŞ',    chipColor: 'default',  borderColor: 'divider',      bgSx: { opacity: 0.75 } },
};

// ── Environments for Transition Dialog ───────────────────────────────────────

const ENVIRONMENTS = [
  { key: 'TEST',     label: 'Test' },
  { key: 'PRE_PROD', label: 'Pre-Prod' },
  { key: 'PROD',     label: 'Production' },
] as const;

// ── Transition Plan Dialog ───────────────────────────────────────────────────

function TransitionPlanDialog({
  open, onClose, toVersionId, versionName, productName, customerId, existingTransitions,
}: {
  open: boolean;
  onClose: () => void;
  toVersionId: string;
  versionName: string;
  productName: string;
  customerId: string;
  existingTransitions: CustomerVersionTransition[];
}) {
  const queryClient = useQueryClient();
  const [dates, setDates] = useState<Record<string, { planned: string; actual: string }>>(() => {
    const init: Record<string, { planned: string; actual: string }> = {};
    ENVIRONMENTS.forEach(({ key }) => {
      const ex = existingTransitions.find((t) => t.toVersionId === toVersionId && t.environment === key);
      init[key] = { planned: ex?.plannedDate?.slice(0, 10) ?? '', actual: ex?.actualDate?.slice(0, 10) ?? '' };
    });
    return init;
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const promises = ENVIRONMENTS.map(async ({ key }) => {
        const ex = existingTransitions.find((t) => t.toVersionId === toVersionId && t.environment === key);
        const payload = {
          customerId,
          toVersionId,
          environment: key,
          plannedDate: dates[key].planned ? new Date(dates[key].planned).toISOString() : null,
          actualDate: dates[key].actual ? new Date(dates[key].actual).toISOString() : null,
        };
        if (ex) {
          return api.patch(`/customer-version-transitions/${ex.id}`, payload);
        } else if (dates[key].planned || dates[key].actual) {
          return api.post('/customer-version-transitions', payload);
        }
      });
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-transitions'] });
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
              {ENVIRONMENTS.map(({ key, label }) => (
                <TableRow key={key}>
                  <TableCell><Chip label={label} size="small" /></TableCell>
                  <TableCell>
                    <TextField
                      type="date"
                      size="small"
                      value={dates[key].planned}
                      onChange={(e) => setDates((p) => ({ ...p, [key]: { ...p[key], planned: e.target.value } }))}
                      slotProps={{ inputLabel: { shrink: true } }}
                      sx={{ width: 150 }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      type="date"
                      size="small"
                      value={dates[key].actual}
                      onChange={(e) => setDates((p) => ({ ...p, [key]: { ...p[key], actual: e.target.value } }))}
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

// ── Version Card ──────────────────────────────────────────────────────────────

// ── Version Services Section (lazy-loaded when accordion opens) ──────────────

function VersionServicesSection({ versionId }: { versionId: string }) {
  const { data, isLoading, isError } = useQuery<{ data: ServiceSnapshot[] }>({
    queryKey: ['version-snapshots', versionId],
    queryFn: () => api.get(`/service-release-snapshots?productVersionId=${versionId}`).then((r) => r.data),
  });

  const snapshots = data?.data ?? [];

  if (isLoading) return <CircularProgress size={20} sx={{ m: 2 }} />;
  if (isError) return <Typography variant="caption" color="error" sx={{ p: 2 }}>Yüklenemedi.</Typography>;
  if (snapshots.length === 0)
    return <Typography variant="body2" color="text.disabled" sx={{ p: 2, fontStyle: 'italic' }}>Bu versiyona ait servis kaydı bulunamadı.</Typography>;

  return (
    <Table size="small">
      <TableHead>
        <TableRow sx={{ bgcolor: 'action.hover' }}>
          <TableCell sx={{ fontWeight: 700 }}>Servis</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>Release Adı</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>Docker Image</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>Tarih</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {snapshots.map((snap) => (
          <TableRow key={snap.id}>
            <TableCell>
              <Typography variant="body2" fontWeight={600}>{snap.service.name}</Typography>
              {snap.service.description && (
                <Typography variant="caption" color="text.secondary">{snap.service.description}</Typography>
              )}
            </TableCell>
            <TableCell>
              <Typography variant="body2" fontFamily="monospace" fontSize={12}>
                {snap.releaseName ?? '—'}
              </Typography>
            </TableCell>
            <TableCell>
              <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                {snap.service.dockerImageName ?? '—'}
              </Typography>
            </TableCell>
            <TableCell>
              <Typography variant="caption" color="text.secondary">{fmtDate(snap.releasedAt)}</Typography>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ── Version Packages Section (lazy-loaded when accordion opens) ───────────────

const PACKAGE_TYPE_ICONS: Record<string, string> = {
  HELM_CHART:   '⛵',
  DOCKER_IMAGE: '🐳',
  BINARY:       '📦',
  GIT_ARCHIVE:  '📂',
};

function VersionPackagesSection({ versionId }: { versionId: string }) {
  const { data, isLoading, isError } = useQuery<{ data: VersionPackage[] }>({
    queryKey: ['version-packages', versionId],
    queryFn: () => api.get(`/version-packages?productVersionId=${versionId}`).then((r) => r.data),
  });

  const packages = data?.data ?? [];

  const handleDownload = async (pkg: VersionPackage) => {
    try {
      const res = await api.post<{ data: { artifactUrl: string } }>(`/version-packages/${pkg.id}/download`);
      const url = res.data.data.artifactUrl ?? pkg.artifactUrl ?? pkg.helmRepoUrl;
      if (url) window.open(url, '_blank', 'noopener');
    } catch {
      // silently ignore — user can still see the URL
      const fallback = pkg.artifactUrl ?? pkg.helmRepoUrl;
      if (fallback) window.open(fallback, '_blank', 'noopener');
    }
  };

  if (isLoading) return <CircularProgress size={20} sx={{ m: 2 }} />;
  if (isError) return <Typography variant="caption" color="error" sx={{ p: 2 }}>Yüklenemedi.</Typography>;
  if (packages.length === 0)
    return <Typography variant="body2" color="text.disabled" sx={{ p: 2, fontStyle: 'italic' }}>Bu versiyona ait paket tanımlanmamış.</Typography>;

  return (
    <Table size="small">
      <TableHead>
        <TableRow sx={{ bgcolor: 'action.hover' }}>
          <TableCell sx={{ fontWeight: 700 }}>Paket</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>Tür</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>Versiyon</TableCell>
          <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>İndir</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {packages.map((pkg) => (
          <TableRow key={pkg.id}>
            <TableCell>
              <Typography variant="body2" fontWeight={600}>{pkg.name}</Typography>
              {pkg.description && (
                <Typography variant="caption" color="text.secondary">{pkg.description}</Typography>
              )}
              {pkg.imageName && (
                <Typography variant="caption" fontFamily="monospace" color="text.secondary" display="block">
                  {pkg.imageName}{pkg.imageTag ? `:${pkg.imageTag}` : ''}
                </Typography>
              )}
            </TableCell>
            <TableCell>
              <Chip
                size="small"
                label={`${PACKAGE_TYPE_ICONS[pkg.packageType] ?? '📦'} ${pkg.packageType.replace('_', ' ')}`}
                variant="outlined"
                sx={{ fontSize: 10 }}
              />
            </TableCell>
            <TableCell>
              <Typography variant="body2" fontFamily="monospace">{pkg.version}</Typography>
            </TableCell>
            <TableCell sx={{ textAlign: 'center' }}>
              {(pkg.artifactUrl || pkg.helmRepoUrl) ? (
                <Tooltip title={`${pkg.downloadCount ?? 0} indirme`}>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => handleDownload(pkg)}
                  >
                    {pkg.packageType === 'HELM_CHART' ? <OpenInNewIcon fontSize="small" /> : <DownloadIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              ) : (
                <Typography variant="caption" color="text.disabled">—</Typography>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ── VersionChangesSection ─────────────────────────────────────────────────────

function VersionChangesSection({ versionId }: { versionId: string }) {
  const { data, isLoading, isError } = useQuery<{ data: SystemChange[] }>({
    queryKey: ['system-changes', versionId],
    queryFn: () => api.get('/system-changes', { params: { versionId } }).then((r) => r.data),
    enabled: !!versionId,
  });

  const changes = data?.data ?? [];

  if (isLoading) return <Box display="flex" justifyContent="center" py={2}><CircularProgress size={20} /></Box>;
  if (isError) return <Alert severity="error" sx={{ m: 2 }}>Değişiklikler yüklenemedi.</Alert>;
  if (changes.length === 0) {
    return (
      <Box p={2.5} textAlign="center">
        <Typography variant="body2" color="text.secondary">
          Bu versiyona ait değişiklik kaydı henüz girilmemiş.
        </Typography>
      </Box>
    );
  }

  return (
    <Table size="small">
      <TableHead>
        <TableRow sx={{ bgcolor: 'action.hover' }}>
          <TableCell sx={{ fontWeight: 700 }}>Başlık</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>Tür</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>API / Yol</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {changes.map((c) => (
          <TableRow key={c.id} sx={c.isBreaking ? { bgcolor: 'error.50' } : undefined}>
            <TableCell>
              <Typography variant="body2" fontWeight={c.isBreaking ? 700 : 400}>{c.title}</Typography>
              {c.description && (
                <Typography variant="caption" color="text.secondary" display="block">{c.description}</Typography>
              )}
            </TableCell>
            <TableCell>
              <Chip
                size="small"
                label={c.isBreaking ? '⚠️ BREAKING' : c.changeType.replace('_', ' ')}
                color={c.isBreaking ? 'error' : 'default'}
                sx={{ fontSize: 10 }}
              />
            </TableCell>
            <TableCell>
              <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                {c.apiPath ?? '—'}
              </Typography>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ── VersionCard ───────────────────────────────────────────────────────────────

function VersionCard({
  version,
  status,
  productName,
  transitions,
  onOpenReleaseNotes,
  onOpenTransitionPlan,
  onOpenTodos,
  onOpenIssue,
}: {
  version: ProductVersion;
  status: VersionStatus;
  productName: string;
  transitions: CustomerVersionTransition[];
  onOpenReleaseNotes: (versionId: string, versionName: string, productName: string) => void;
  onOpenTransitionPlan: (toVersionId: string, versionName: string, productName: string) => void;
  onOpenTodos: (versionId: string, versionName: string) => void;
  onOpenIssue: (productVersionId: string, versionName: string) => void;
}) {
  const [detailExpanded, setDetailExpanded] = useState(false);
  const [activeDetail, setActiveDetail] = useState<'services' | 'packages' | 'changes' | null>(null);

  const cfg = STATUS_CONFIG[status];
  const displayDate = versionDate(version);
  const plannedEnvs = transitions.filter((t) => t.toVersionId === version.id && t.plannedDate).map((t) => t.environment);

  const handleToggleDetail = (panel: 'services' | 'packages' | 'changes') => {
    if (detailExpanded && activeDetail === panel) {
      setDetailExpanded(false);
      setActiveDetail(null);
    } else {
      setDetailExpanded(true);
      setActiveDetail(panel);
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        borderLeft: '4px solid',
        borderLeftColor: cfg.borderColor,
        ...cfg.bgSx,
      }}
    >
      <Box p={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="subtitle1" fontWeight={700} fontFamily="monospace">
              {version.version}
            </Typography>
            <Chip
              size="small"
              label={version.phase.toUpperCase()}
              variant="outlined"
              sx={{ fontSize: 10, textTransform: 'uppercase' }}
            />
            <Chip size="small" label={cfg.label} color={cfg.chipColor} sx={{ fontWeight: 600 }} />
            {version.isHotfix && (
              <Chip size="small" label="HOTFIX" color="error" variant="outlined" sx={{ fontSize: 10 }} />
            )}
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', ml: 1 }}>
            {fmtDate(displayDate)}
          </Typography>
        </Stack>

        {version.changelog && (
          <Typography variant="body2" color="text.secondary" mb={1.5} sx={{ fontStyle: 'italic' }}>
            {version.changelog.length > 150 ? version.changelog.slice(0, 150) + '...' : version.changelog}
          </Typography>
        )}

        {plannedEnvs.length > 0 && (
          <Stack direction="row" spacing={0.5} mb={1.5} flexWrap="wrap">
            {plannedEnvs.map((env) => (
              <Chip key={env} size="small" label={`📅 ${env}`} color="info" variant="outlined" sx={{ fontSize: 10 }} />
            ))}
          </Stack>
        )}

        <Divider sx={{ my: 1.5 }} />

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            size="small"
            variant="outlined"
            startIcon={<ArticleIcon />}
            onClick={() => onOpenReleaseNotes(version.id, version.version, productName)}
          >
            Release Notları
          </Button>

          {status === 'newer' && (
            <Button
              size="small"
              variant="contained"
              color="warning"
              startIcon={<CalendarIcon />}
              onClick={() => onOpenTransitionPlan(version.id, version.version, productName)}
            >
              Geçiş Planı
            </Button>
          )}

          {status !== 'older' && (
            <Button
              size="small"
              variant="outlined"
              color="success"
              startIcon={<ChecklistIcon />}
              onClick={() => onOpenTodos(version.id, version.version)}
            >
              Yapılacaklar
            </Button>
          )}

          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<BugReportIcon />}
            onClick={() => onOpenIssue(version.id, version.version)}
          >
            Sorun Bildir
          </Button>

          {/* Servisler & Paketler toggle butonları */}
          <Button
            size="small"
            variant={detailExpanded && activeDetail === 'services' ? 'contained' : 'outlined'}
            color="info"
            startIcon={<ExpandMoreIcon
              sx={{
                transform: detailExpanded && activeDetail === 'services' ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}
            />}
            onClick={() => handleToggleDetail('services')}
          >
            Servisler
          </Button>

          <Button
            size="small"
            variant={detailExpanded && activeDetail === 'packages' ? 'contained' : 'outlined'}
            color="info"
            startIcon={<PackageIcon />}
            onClick={() => handleToggleDetail('packages')}
          >
            Paketler
          </Button>

          <Button
            size="small"
            variant={detailExpanded && activeDetail === 'changes' ? 'contained' : 'outlined'}
            color="secondary"
            startIcon={<ChangeHistoryIcon />}
            onClick={() => handleToggleDetail('changes')}
          >
            Değişiklikler
          </Button>
        </Stack>
      </Box>

      {/* Lazy-loaded detail sections */}
      {detailExpanded && activeDetail === 'services' && (
        <Box
          sx={{
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            overflow: 'auto',
          }}
        >
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ px: 2, pt: 1.5, display: 'block' }}>
            📋 Bu Versiyondaki Servisler
          </Typography>
          <VersionServicesSection versionId={version.id} />
        </Box>
      )}

      {detailExpanded && activeDetail === 'packages' && (
        <Box
          sx={{
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            overflow: 'auto',
          }}
        >
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ px: 2, pt: 1.5, display: 'block' }}>
            📦 İndirilebilir Paketler
          </Typography>
          <VersionPackagesSection versionId={version.id} />
        </Box>
      )}

      {detailExpanded && activeDetail === 'changes' && (
        <Box
          sx={{
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            overflow: 'auto',
          }}
        >
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ px: 2, pt: 1.5, display: 'block' }}>
            🔄 Değişiklik Listesi
          </Typography>
          <VersionChangesSection versionId={version.id} />
        </Box>
      )}
    </Paper>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CustomerProductVersionsPage() {
  const { id: paramId, productId } = useParams<{ id: string; productId: string }>();
  const user = useAuthStore((s) => s.user);
  const customerId = paramId ?? user?.customerId;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ── State ─────────────────────────────────────────────────────────────────
  const [releaseNoteDrawer, setReleaseNoteDrawer] = useState<{
    open: boolean; versionId: string; versionName: string; productName: string;
  }>({ open: false, versionId: '', versionName: '', productName: '' });

  const [transitionDlg, setTransitionDlg] = useState<{
    open: boolean; toVersionId: string; versionName: string; productName: string;
  }>({ open: false, toVersionId: '', versionName: '', productName: '' });

  const [todoDrawer, setTodoDrawer] = useState<{
    open: boolean; versionId: string; versionName: string;
  }>({ open: false, versionId: '', versionName: '' });

  const [issueDlg, setIssueDlg] = useState<{
    open: boolean; productVersionId: string; versionName: string;
    title: string; description: string; priority: string; module: string;
  }>({ open: false, productVersionId: '', versionName: '', title: '', description: '', priority: 'MEDIUM', module: '' });

  const [toast, setToast] = useState<string | null>(null);

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: versionsData, isLoading } = useQuery<{ data: ProductVersion[] }>({
    queryKey: ['product-versions', productId],
    queryFn: () => api.get('/product-versions', { params: { productId } }).then((r) => r.data),
    enabled: !!productId,
  });

  const { data: cpmData } = useQuery<{
    data: { id: string; productVersionId: string; productVersion: { id: string; version: string; product: { id: string; name: string } } }[];
  }>({
    queryKey: ['customer-product-mappings', customerId],
    queryFn: () => api.get('/customer-product-mappings', { params: { customerId } }).then((r) => r.data),
    enabled: !!customerId,
  });

  const { data: transitionsData } = useQuery<{ data: CustomerVersionTransition[] }>({
    queryKey: ['customer-transitions', customerId],
    queryFn: () => api.get('/customer-version-transitions', { params: { customerId } }).then((r) => r.data),
    enabled: !!customerId,
  });

  const { data: issuesData } = useQuery<{ data: CustomerIssue[] }>({
    queryKey: ['customer-issues', customerId],
    queryFn: () => api.get('/transition-issues/my').then((r) => r.data),
    enabled: !!customerId,
  });

  // ── Mutation ──────────────────────────────────────────────────────────────
  const createIssueMutation = useMutation({
    mutationFn: (payload: { title: string; description: string; priority: string; productVersionId: string; module?: string }) =>
      api.post('/transition-issues', { ...payload, customerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-issues', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customer-issues', customerId] });
      setIssueDlg((p) => ({ ...p, open: false, title: '', description: '', module: '' }));
      setToast('Sorun bildirimi alındı');
    },
  });

  // ── Derived ───────────────────────────────────────────────────────────────
  const sortedVersions: ProductVersion[] = (versionsData?.data ?? []).slice().sort((a, b) => {
    const da = versionDate(a) ?? '';
    const db = versionDate(b) ?? '';
    return db.localeCompare(da);
  });

  const mapping = cpmData?.data?.find((m) => m.productVersion.product.id === productId);
  const currentVersionId = mapping?.productVersionId ?? null;
  const productName = sortedVersions[0]?.product?.name ?? 'Ürün';
  const currentVersion = sortedVersions.find((v) => v.id === currentVersionId);
  const latestVersion = sortedVersions[0];
  const transitions = transitionsData?.data ?? [];
  const hasNewerVersions = !!currentVersionId && sortedVersions.some(
    (v) => getVersionStatus(v, currentVersionId, sortedVersions) === 'newer',
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleOpenReleaseNotes = (versionId: string, versionName: string, pName: string) =>
    setReleaseNoteDrawer({ open: true, versionId, versionName, productName: pName });

  const handleOpenTransitionPlan = (toVersionId: string, versionName: string, pName: string) =>
    setTransitionDlg({ open: true, toVersionId, versionName, productName: pName });

  const handleOpenTodos = (versionId: string, versionName: string) =>
    setTodoDrawer({ open: true, versionId, versionName });

  const handleOpenIssue = (productVersionId: string, versionName: string) =>
    setIssueDlg((p) => ({ ...p, open: true, productVersionId, versionName }));

  // ── Render ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>;
  }

  return (
    <Box p={3}>
      {/* Breadcrumb */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/customer-management" underline="hover" color="inherit">
          Müşteri Yönetimi
        </Link>
        <Link component={RouterLink} to={`/customers/${customerId}`} underline="hover" color="inherit">
          Dashboard
        </Link>
        <Typography color="text.primary">{productName}</Typography>
      </Breadcrumbs>

      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(`/customers/${customerId}`)}
        sx={{ mb: 2 }}
        size="small"
      >
        Dashboard'a Dön
      </Button>

      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            {productName} — Versiyon Geçmişi
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="body2" color="text.secondary">Mevcut:</Typography>
            {currentVersion ? (
              <Chip
                label={currentVersion.version}
                color="primary"
                size="small"
                sx={{ fontFamily: 'monospace', fontWeight: 600 }}
              />
            ) : (
              <Typography variant="body2" color="text.disabled">Belirsiz</Typography>
            )}
            {latestVersion && latestVersion.id !== currentVersionId && (
              <>
                <Typography variant="body2" color="text.secondary">→ Son sürüm:</Typography>
                <Chip
                  label={latestVersion.version}
                  color="warning"
                  size="small"
                  sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                />
              </>
            )}
          </Stack>
        </Box>
      </Stack>

      {/* Version legend */}
      <Stack direction="row" spacing={1.5} mb={2} flexWrap="wrap">
        <Chip size="small" label="📍 MEVCUT — Şu an kullandığınız" color="primary" variant="outlined" />
        <Chip size="small" label="🆕 YENİ — Güncel sürüme geçiş planlanabilir" color="warning" variant="outlined" />
        <Chip size="small" label="GEÇMİŞ — Eski sürümler" color="default" variant="outlined" />
      </Stack>

      {/* AC-4: En güncel sürüm uyarısı */}
      {currentVersionId && !hasNewerVersions && (
        <Alert severity="info" sx={{ mb: 2 }}>
          ✅ En güncel sürümdesiniz. Yeni bir sürüm yayınlandığında geçiş planı oluşturabilirsiniz.
        </Alert>
      )}

      {/* Version list */}
      {sortedVersions.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">Bu ürün için versiyon bulunamadı.</Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {sortedVersions.map((version) => {
            const status = getVersionStatus(version, currentVersionId, sortedVersions);
            return (
              <VersionCard
                key={version.id}
                version={version}
                status={status}
                productName={productName}
                transitions={transitions}
                onOpenReleaseNotes={handleOpenReleaseNotes}
                onOpenTransitionPlan={handleOpenTransitionPlan}
                onOpenTodos={handleOpenTodos}
                onOpenIssue={handleOpenIssue}
              />
            );
          })}
        </Stack>
      )}

      {/* ── Bildirilen Sorunlar ─────────────────────────────────────────────── */}
      {(() => {
        const productIssues = (issuesData?.data ?? []).filter(
          (iss) => iss.productVersion?.product?.id === productId,
        );
        if (productIssues.length === 0) return null;
        return (
          <Accordion disableGutters sx={{ mt: 3, border: '1px solid', borderColor: 'divider', borderRadius: 1, '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={1} alignItems="center">
                <BugReportIcon fontSize="small" color="error" />
                <Typography fontWeight={600}>Bildirilen Sorunlar</Typography>
                <Chip size="small" label={productIssues.length} color={productIssues.some(i => ['OPEN','IN_PROGRESS'].includes(i.status)) ? 'error' : 'default'} />
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <List disablePadding>
                {productIssues.map((iss, idx) => {
                  const statusMeta = ISSUE_STATUS_META[iss.status] ?? { label: iss.status, color: 'default' };
                  const priorityMeta = ISSUE_PRIORITY_META[iss.priority] ?? { label: iss.priority, color: 'default' };
                  return (
                    <ListItem
                      key={iss.id}
                      divider={idx < productIssues.length - 1}
                      sx={{ alignItems: 'flex-start', py: 1.5 }}
                    >
                      <ListItemText
                        primary={
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                            <Typography variant="body2" fontWeight={500}>{iss.title}</Typography>
                            {iss.module && (
                              <Chip size="small" label={iss.module} variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                            )}
                          </Stack>
                        }
                        secondary={
                          <Stack direction="row" spacing={1} mt={0.5} flexWrap="wrap">
                            <Chip size="small" label={statusMeta.label} color={statusMeta.color} sx={{ height: 20, fontSize: 11 }} />
                            <Chip size="small" label={priorityMeta.label} color={priorityMeta.color} variant="outlined" sx={{ height: 20, fontSize: 11 }} />
                            <Typography variant="caption" color="text.disabled">
                              v{iss.productVersion?.version} • {fmtDate(iss.createdAt)}
                            </Typography>
                          </Stack>
                        }
                      />
                    </ListItem>
                  );
                })}
              </List>
            </AccordionDetails>
          </Accordion>
        );
      })()}

      {/* ── Drawers & Dialogs ──────────────────────────────────────────────── */}

      {/* Release Notes Drawer */}
      <CustomerReleaseNoteDrawer
        open={releaseNoteDrawer.open}
        onClose={() => setReleaseNoteDrawer((p) => ({ ...p, open: false }))}
        versionId={releaseNoteDrawer.versionId || null}
        versionName={releaseNoteDrawer.versionName}
        productName={releaseNoteDrawer.productName}
      />

      {/* Todos Drawer */}
      <Drawer
        anchor="right"
        open={todoDrawer.open}
        onClose={() => setTodoDrawer((p) => ({ ...p, open: false }))}
        PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, p: 2 } }}
      >
        <Typography variant="h6" fontWeight={700} mb={1}>
          ✅ Yapılacaklar — {todoDrawer.versionName}
        </Typography>
        <Divider sx={{ mb: 2 }} />
        {todoDrawer.open && customerId && (
          <CustomerTodoList
            customerId={customerId}
            versionId={todoDrawer.versionId}
            versionName={todoDrawer.versionName}
          />
        )}
      </Drawer>

      {/* Transition Plan Dialog */}
      {transitionDlg.open && (
        <TransitionPlanDialog
          open={transitionDlg.open}
          onClose={() => setTransitionDlg((p) => ({ ...p, open: false }))}
          toVersionId={transitionDlg.toVersionId}
          versionName={transitionDlg.versionName}
          productName={transitionDlg.productName}
          customerId={customerId!}
          existingTransitions={transitions}
        />
      )}

      {/* Issue Report Dialog */}
      <Dialog
        open={issueDlg.open}
        onClose={() => setIssueDlg((p) => ({ ...p, open: false }))}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>🐛 Sorun Bildir — v{issueDlg.versionName}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Başlık *"
            value={issueDlg.title}
            onChange={(e) => setIssueDlg((p) => ({ ...p, title: e.target.value }))}
            sx={{ mt: 1 }}
            size="small"
            placeholder="Örn: Login ekranında hata"
          />
          <TextField
            fullWidth
            label="Etkilenen Servis / Modül"
            value={issueDlg.module}
            onChange={(e) => setIssueDlg((p) => ({ ...p, module: e.target.value }))}
            sx={{ mt: 2 }}
            size="small"
            placeholder="Örn: Auth Servisi, Raporlama Modülü"
            helperText="Opsiyonel — hangi servis veya modül etkileniyor?"
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Açıklama *"
            value={issueDlg.description}
            onChange={(e) => setIssueDlg((p) => ({ ...p, description: e.target.value }))}
            sx={{ mt: 2 }}
            size="small"
            placeholder="Adım adım nasıl oluşuyor? Beklenen davranış neydi?"
          />
          <FormControl fullWidth size="small" sx={{ mt: 2 }}>
            <InputLabel>Öncelik</InputLabel>
            <Select
              label="Öncelik"
              value={issueDlg.priority}
              onChange={(e) => setIssueDlg((p) => ({ ...p, priority: e.target.value }))}
            >
              <MenuItem value="CRITICAL">🔴 Kritik — Sistem kullanılamaz</MenuItem>
              <MenuItem value="HIGH">🟠 Yüksek — Önemli özellik çalışmıyor</MenuItem>
              <MenuItem value="MEDIUM">🟡 Orta — Geçici çözüm var</MenuItem>
              <MenuItem value="LOW">🟢 Düşük — Küçük sorun</MenuItem>
            </Select>
          </FormControl>
          {createIssueMutation.isError && (
            <Alert severity="error" sx={{ mt: 1.5 }}>Gönderim sırasında hata oluştu.</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setIssueDlg((p) => ({ ...p, open: false }))}
            disabled={createIssueMutation.isPending}
          >
            İptal
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={createIssueMutation.isPending || !issueDlg.title || !issueDlg.description}
            onClick={() =>
              createIssueMutation.mutate({
                title: issueDlg.title,
                description: issueDlg.description,
                priority: issueDlg.priority,
                productVersionId: issueDlg.productVersionId,
                module: issueDlg.module || undefined,
              })
            }
          >
            {createIssueMutation.isPending ? 'Gönderiliyor...' : 'Bildir'}
          </Button>
        </DialogActions>
      </Dialog>

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
