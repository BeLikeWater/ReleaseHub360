import { useState } from 'react';
import {
  Box, Typography, Chip, CircularProgress, Stack, Breadcrumbs, Link,
  Button, Alert, Paper, Divider, Drawer,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Select, MenuItem, FormControl, InputLabel,
  Table, TableBody, TableCell, TableHead, TableRow,
  Snackbar, Accordion, AccordionSummary, AccordionDetails, List, ListItem, ListItemText,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ArticleOutlined as ArticleIcon,
  ChecklistRtl as ChecklistIcon,
  BugReport as BugReportIcon,
  ExpandMore as ExpandMoreIcon,
  Inventory2Outlined as PackageIcon,
  OpenInNew as OpenInNewIcon,
  ChangeHistory as ChangeHistoryIcon,
  VerifiedOutlined as VerifiedIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import api from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { CustomerProductMapping } from '@/types';
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

// E2-01: Artifact action button resolver based on CPM.artifactType, hostingType and package type
function ArtifactActionButton({ pkg, cpmArtifactType, deploymentModel, hostingType, mappingId, cpmEnvironment, customerId, productVersionId, productId, cpmCurrentVersionId, navigate }: {
  pkg: VersionPackage;
  cpmArtifactType?: string | null;
  deploymentModel?: string | null;
  hostingType?: string | null;
  mappingId?: string | null;
  cpmEnvironment?: string | null;
  customerId?: string;
  productVersionId?: string;
  productId?: string;
  cpmCurrentVersionId?: string | null;
  navigate: (path: string, opts?: { state?: unknown }) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalEnv, setApprovalEnv] = useState(cpmEnvironment ?? '');
  const [approvalComment, setApprovalComment] = useState('');
  const [approvalSuccess, setApprovalSuccess] = useState(false);
  // Fetch last approval for IAAS HELM_CHART
  const isIaasHelm = pkg.packageType === 'HELM_CHART' && hostingType === 'IAAS' && !!mappingId;
  const { data: approvalsData } = useQuery<{ data: Array<{ createdAt: string; approverRole: string }> }>({
    queryKey: ['helm-approvals', mappingId],
    queryFn: () =>
      api.get('/customer-deployments/approvals', { params: { customerProductMappingId: mappingId } }).then((r) => r.data),
    enabled: isIaasHelm,
  });
  const derivedLastApproval = approvalsData?.data?.[0]?.createdAt ?? null;
  // keep local state in sync so post-approve optimistic update works
  const [lastApprovedAt, setLastApprovedAt] = useState<string | null>(derivedLastApproval);

  const doApproveHelm = async () => {
    if (!mappingId || !approvalEnv.trim()) return;
    setLoading(true);
    try {
      await api.post('/customer-deployments/approve', {
        customerProductMappingId: mappingId,
        environment: approvalEnv.trim(),
        comment: approvalComment.trim() || undefined,
      });
      setApprovalDialogOpen(false);
      setApprovalComment('');
      setApprovalSuccess(true);
      setLastApprovedAt(new Date().toISOString());
    } catch {
      // error shown via global interceptor
    } finally {
      setLoading(false);
    }
  };

  const doDownload = async () => {
    setLoading(true);
    try {
      const res = await api.post<{ data: { artifactUrl: string } }>(`/version-packages/${pkg.id}/download`);
      const url = res.data.data.artifactUrl ?? pkg.artifactUrl ?? pkg.helmRepoUrl;
      if (url) window.open(url, '_blank', 'noopener');
    } catch {
      const fallback = pkg.artifactUrl ?? pkg.helmRepoUrl;
      if (fallback) window.open(fallback, '_blank', 'noopener');
    } finally {
      setLoading(false);
    }
  };

  const doTriggerDeploy = async () => {
    setLoading(true);
    try {
      await api.post('/customer-deployments/trigger', {
        customerId,
        productVersionId,
        environment: 'default',
        notes: `Triggered from Customer Portal for package: ${pkg.name}`,
      });
    } catch {
      // ignore — already logged server side
    } finally {
      setLoading(false);
    }
  };

  // SaaS → müşteri sadece talep eder, deploy edemez
  if (deploymentModel === 'SAAS') {
    return (
      <Button size="small" variant="outlined" color="info" disabled={loading}
        onClick={doTriggerDeploy}>
        {loading ? <CircularProgress size={14} sx={{ mr: 1 }} /> : null} Güncelleme Talep Et
      </Button>
    );
  }

  // IaaS Helm Chart → onay akışı
  if (isIaasHelm) {
    return (
      <>
        <Stack spacing={0.5}>
          <Button
            size="small"
            variant="contained"
            color="warning"
            startIcon={<VerifiedIcon fontSize="small" />}
            onClick={() => setApprovalDialogOpen(true)}
          >
            Helm Onayla
          </Button>
          {lastApprovedAt && (
            <Chip
              size="small"
              label={`✓ Onaylandı ${new Date(lastApprovedAt).toLocaleDateString('tr-TR')}`}
              color="success"
              variant="outlined"
              sx={{ fontSize: 10 }}
            />
          )}
        </Stack>

        {/* Onay Dialog */}
        <Dialog
          open={approvalDialogOpen}
          onClose={() => setApprovalDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          disableEscapeKeyDown
        >
          <DialogTitle>Helm Chart Onayı</DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              Bu onay kuruma gönderilecek ve IaaS Helm deposunun güncellenmesi için tetikleyici olarak kullanılacak.
            </Alert>
            <Stack spacing={2} mt={1}>
              <TextField
                label="Ortam"
                required
                fullWidth
                value={approvalEnv}
                onChange={(e) => setApprovalEnv(e.target.value)}
                placeholder="PROD / STAGE / DEV"
                error={!approvalEnv.trim()}
                helperText={!approvalEnv.trim() ? 'Ortam zorunludur' : ''}
              />
              <TextField
                label="Yorum (isteğe bağlı)"
                fullWidth
                multiline
                rows={2}
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setApprovalDialogOpen(false)} disabled={loading}>İptal</Button>
            <Button
              variant="contained"
              color="success"
              disabled={loading || !approvalEnv.trim()}
              onClick={doApproveHelm}
              startIcon={loading ? <CircularProgress size={14} /> : <VerifiedIcon />}
            >
              Onaylıyorum
            </Button>
          </DialogActions>
        </Dialog>

        {/* Başarı Snackbar */}
        <Snackbar
          open={approvalSuccess}
          autoHideDuration={5000}
          onClose={() => setApprovalSuccess(false)}
          message="Onay gönderildi. Kurum ekibi bilgilendirildi."
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        />
      </>
    );
  }

  if (pkg.packageType === 'HELM_CHART') {
    return (
      <Tooltip title={pkg.helmRepoUrl ?? pkg.artifactUrl ?? 'HelmChart'}>
        <Button size="small" variant="outlined" color="primary" startIcon={<OpenInNewIcon fontSize="small" />}
          onClick={() => { const u = pkg.helmRepoUrl ?? pkg.artifactUrl; if (u) window.open(u, '_blank', 'noopener'); }}>
          HelmChart İndir
        </Button>
      </Tooltip>
    );
  }

  if (pkg.packageType === 'BINARY') {
    return (
      <Button size="small" variant="outlined" color="primary" disabled={loading}
        onClick={doDownload}>
        {loading ? <CircularProgress size={14} sx={{ mr: 1 }} /> : null} Paket İndir
      </Button>
    );
  }

  if (cpmArtifactType === 'DOCKER') {
    return (
      <Button size="small" variant="contained" color="warning" disabled={loading}
        onClick={doTriggerDeploy}>
        {loading ? <CircularProgress size={14} sx={{ mr: 1 }} /> : null} Güncelleme Onayla
      </Button>
    );
  }

  if (cpmArtifactType === 'GIT_SYNC') {
    return (
      <Button size="small" variant="outlined" color="secondary"
        onClick={() => navigate('/code-sync', {
          state: {
            customerId,
            productId,
            targetVersionId: productVersionId,
            sourceVersionId: cpmCurrentVersionId ?? null,
          },
        })}>
        Code Sync&apos;e Git
      </Button>
    );
  }

  // SaaS or unknown → request update
  return (
    <Button size="small" variant="outlined" color="info"
      onClick={doTriggerDeploy} disabled={loading}>
      {loading ? <CircularProgress size={14} sx={{ mr: 1 }} /> : null} Güncelleme Talep Et
    </Button>
  );
}

// Helper: CPM artifact tipine göre paket filtresi
function filterPackagesByArtifactType(
  packages: VersionPackage[],
  cpmArtifactType?: string | null,
  deploymentModel?: string | null,
  hostingType?: string | null
): VersionPackage[] {
  if (!cpmArtifactType) return packages;
  const ARTIFACT_TO_PKG: Record<string, string> = {
    DOCKER: 'DOCKER_IMAGE',
    BINARY: 'BINARY',
    GIT_SYNC: 'GIT_ARCHIVE',
  };
  const allowed = new Set<string>();
  const pk = ARTIFACT_TO_PKG[cpmArtifactType];
  if (pk) allowed.add(pk);
  if (deploymentModel === 'ON_PREM' && hostingType === 'IAAS') allowed.add('HELM_CHART');
  if (allowed.size === 0) return packages;
  return packages.filter((p) => allowed.has(p.packageType));
}

function VersionPackagesSection({ versionId, cpmArtifactType, deploymentModel, hostingType, cpmId, cpmEnvironment, customerId, productId, cpmCurrentVersionId }: {
  versionId: string;
  cpmArtifactType?: string | null;
  deploymentModel?: string | null;
  hostingType?: string | null;
  cpmId?: string | null;
  cpmEnvironment?: string | null;
  customerId?: string;
  productId?: string;
  cpmCurrentVersionId?: string | null;
}) {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery<{ data: VersionPackage[] }>({
    queryKey: ['version-packages', versionId],
    queryFn: () => api.get(`/version-packages?productVersionId=${versionId}`).then((r) => r.data),
  });

  const packages = data?.data ?? [];
  const filteredPackages = filterPackagesByArtifactType(packages, cpmArtifactType, deploymentModel, hostingType);

  if (isLoading) return <CircularProgress size={20} sx={{ m: 2 }} />;
  if (isError) return <Typography variant="caption" color="error" sx={{ p: 2 }}>Yüklenemedi.</Typography>;
  if (filteredPackages.length === 0)
    return (
      <Typography variant="body2" color="text.disabled" sx={{ p: 2, fontStyle: 'italic' }}>
        {packages.length === 0 ? 'Bu versiyona ait paket tanımlanmamış.' : 'Bu versiyon için eşleşen paket yok.'}
      </Typography>
    );

  return (
    <Table size="small">
      <TableHead>
        <TableRow sx={{ bgcolor: 'action.hover' }}>
          <TableCell sx={{ fontWeight: 700 }}>Paket</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>Tür</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>Versiyon</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>Aksiyon</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {filteredPackages.map((pkg) => (
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
            <TableCell>
              {/* E2-01: Artifact-type-specific action button */}
              <ArtifactActionButton
                pkg={pkg}
                cpmArtifactType={cpmArtifactType}
                deploymentModel={deploymentModel}
                hostingType={hostingType}
                mappingId={cpmId}
                cpmEnvironment={cpmEnvironment}
                customerId={customerId}
                productVersionId={versionId}
                productId={productId}
                cpmCurrentVersionId={cpmCurrentVersionId}
                navigate={navigate}
              />
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
  cpmArtifactType,
  cpmDeploymentModel,
  cpmHostingType,
  cpmId,
  cpmEnvironment,
  customerId,
  productId,
  cpmCurrentVersionId,
  onOpenReleaseNotes,
  onOpenTodos,
  onOpenIssue,
}: {
  version: ProductVersion;
  status: VersionStatus;
  productName: string;
  transitions: CustomerVersionTransition[];
  cpmArtifactType?: string | null;
  cpmDeploymentModel?: string | null;
  cpmHostingType?: string | null;
  cpmId?: string | null;
  cpmEnvironment?: string | null;
  customerId?: string;
  productId?: string;
  cpmCurrentVersionId?: string | null;
  onOpenReleaseNotes: (versionId: string, versionName: string, productName: string) => void;
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
          <VersionPackagesSection
            versionId={version.id}
            cpmArtifactType={cpmArtifactType}
            deploymentModel={cpmDeploymentModel}
            hostingType={cpmHostingType}
            cpmId={cpmId}
            cpmEnvironment={cpmEnvironment}
            customerId={customerId}
            productId={productId}
            cpmCurrentVersionId={cpmCurrentVersionId}
          />
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

  const { data: cpmData } = useQuery<{ data: CustomerProductMapping[] }>({
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
  const sortedVersions: ProductVersion[] = (versionsData?.data ?? [])
    .filter((v) => v.phase === 'PRODUCTION')
    .slice()
    .sort((a, b) => {
    const da = versionDate(a) ?? '';
    const db = versionDate(b) ?? '';
    return db.localeCompare(da);
  });

  const mapping = cpmData?.data?.find((m) => m.productVersion?.product?.id === productId);
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
                cpmArtifactType={mapping?.artifactType}
                cpmDeploymentModel={mapping?.deploymentModel}
                cpmHostingType={mapping?.hostingType}
                cpmId={mapping?.id}
                cpmEnvironment={mapping?.environment}
                customerId={customerId}
                productId={productId}
                cpmCurrentVersionId={currentVersionId}
                onOpenReleaseNotes={handleOpenReleaseNotes}
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
