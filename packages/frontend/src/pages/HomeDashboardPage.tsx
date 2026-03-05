import { useState } from 'react';
import {
  Box, Grid, Paper, Typography, Chip, LinearProgress,
  Skeleton, List, ListItem, ListItemText, ListItemIcon,
  Button, Divider, Stack, Collapse, IconButton, Tooltip, Switch, FormControlLabel,
  CircularProgress, Select, MenuItem, FormControl, InputLabel, Drawer,
  ToggleButton, ToggleButtonGroup, Autocomplete, TextField as MuiTextField,
} from '@mui/material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip, Legend, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import BugReportIcon from '@mui/icons-material/BugReport';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import TuneIcon from '@mui/icons-material/Tune';
import EventIcon from '@mui/icons-material/Event';
import SpeedIcon from '@mui/icons-material/Speed';
import TimelineIcon from '@mui/icons-material/Timeline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import BuildIcon from '@mui/icons-material/Build';
import VisibilityIcon from '@mui/icons-material/Visibility';
import UpdateIcon from '@mui/icons-material/Update';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import apiClient from '@/api/client';

// ── Types ─────────────────────────────────────────────────────────────────────

type DashboardSummary = {
  criticalIssues: number;
  pendingHotfixes: number;
  completedThisMonth: number;
  activeVersions: number;
  openIssues: number;
};

type ActiveRelease = {
  id: string; version: string; phase: string;
  healthScore: number;
  product: { id: string; name: string };
  customerTransition?: { total: number; completed: number; ratio: number | null };
};

type PendingAction = {
  id: string; type: string; title: string; priority: string;
  productVersion?: { version: string; product: { name: string } } | null;
  customer?: { name: string } | null;
  createdAt: string;
};

type UpcomingRelease = {
  id: string; version: string; plannedDate: string; phase: string;
  product: { id: string; name: string };
};

type DoraRating = 'Elite' | 'High' | 'Medium' | 'Low';

type DoraMetrics = {
  period: { months: number; since: string };
  deployFrequency: { value: number; unit: string; rating: DoraRating; total: number };
  leadTime: { value: number; unit: string; rating: DoraRating };
  changeFailureRate: { value: number; unit: string; rating: DoraRating; failedReleases: number; totalReleases: number };
  mttr: { value: number; unit: string; rating: DoraRating; resolvedIssues: number };
};

type DoraTrendPoint = { period: string; value: number };
type DoraTrend = {
  periods: string[];
  series: Record<string, DoraTrendPoint[]>;
  periodChangePct: Record<string, number | null>;
};

type ReleaseOpsData = {
  cycleTimeDays: number;
  mrThroughput: number;
  pipelineSuccessRate: number | null;
  avgTodosPerVersion: number;
  releasedVersionCount: number;
  periodDays: number;
};

type TodoTrendPoint = {
  versionId: string; version: string; product: string;
  total: number; done: number; completionRate: number;
};

type TransitionDetail = {
  versionId: string; version: string; product: string;
  summary: { total: number; completed: number; planned: number; notPlanned: number; completionRate: number };
  customers: Array<{ customerId: string; customerName: string; customerCode: string; status: string; plannedDate: string | null; actualDate: string | null; environment: string | null; notes: string | null }>;
};

type Product = { id: string; name: string };

type AwarenessData = {
  overallAwarenessScore: number;
  byProduct: Array<{ productId: string; productName: string; latestVersion: string | null; customersOnLatest: number; totalCustomers: number; awarenessScore: number }>;
};

type AwarenessScores = {
  deploymentDiversity: { score: number; uniqueCombinations: number; totalMappings: number; distribution: Record<string, number> };
  configDrift: { score: number; avgOverrideKeys: number; totalWithOverrides: number };
  codebaseDivergence: { score: number; avgDaysSinceSync: number; totalBranches: number };
};

// ── LocalStorage helpers ──────────────────────────────────────────────────────

function loadSectionPrefs(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem('dashboard-section-prefs');
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveSectionPrefs(prefs: Record<string, boolean>) {
  try { localStorage.setItem('dashboard-section-prefs', JSON.stringify(prefs)); }
  catch { /* ignore */ }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function healthColor(score: number): 'success' | 'warning' | 'error' {
  if (score >= 80) return 'success';
  if (score >= 50) return 'warning';
  return 'error';
}

function phaseColor(phase: string): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' {
  if (phase === 'PRODUCTION') return 'success';
  if (phase === 'UAT' || phase === 'STAGING') return 'warning';
  if (phase === 'DEVELOPMENT') return 'info';
  if (phase === 'DEPRECATED') return 'error';
  return 'default';
}

function fmtDate(d: string) {
  try { return format(new Date(d), 'dd MMM HH:mm', { locale: tr }); }
  catch { return d; }
}

function priorityDot(p: string) {
  if (p === 'CRITICAL') return 'error';
  if (p === 'HIGH') return 'warning';
  return 'info';
}

const RATING_COLORS: Record<DoraRating, string> = {
  Elite: '#10b981', High: '#3b82f6', Medium: '#f59e0b', Low: '#ef4444',
};

const RATING_LABELS: Record<DoraRating, string> = {
  Elite: 'Elite', High: 'Yüksek', Medium: 'Orta', Low: 'Düşük',
};

function scoreColor(score: number): string {
  if (score >= 80) return '#10b981';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color, loading }: {
  label: string; value: number | string; icon: React.ReactNode; color: string; loading?: boolean;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%', borderLeft: `4px solid ${color}` }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          {loading
            ? <Skeleton width={60} height={44} />
            : <Typography variant="h3" fontWeight={800} lineHeight={1}>{value}</Typography>}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>{label}</Typography>
        </Box>
        <Box sx={{ color, opacity: 0.85, mt: 0.5 }}>{icon}</Box>
      </Box>
    </Paper>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function HomeDashboardPage() {
  const navigate = useNavigate();

  // ── Layout preferences (persisted) ─────────────────────────────────────────
  const [sectionPrefs, setSectionPrefs] = useState<Record<string, boolean>>(() => loadSectionPrefs());
  const [showSettings, setShowSettings] = useState(false);
  // H4-06: Period filter
  const [periodDays, setPeriodDays] = useState(30);
  // H4-07: Product filter
  const [selectedProductIds, setSelectedProductIds] = useState<Product[]>([]);
  // H4-08: Transition detail drawer
  const [transitionDetailVersionId, setTransitionDetailVersionId] = useState<string | null>(null);
  // H4-03: DORA metric toggle
  const [doraTrendMetric, setDoraTrendMetric] = useState<string>('DEPLOY_FREQ');

  const toggleSection = (key: string) => {
    const updated = { ...sectionPrefs, [key]: !((sectionPrefs[key] ?? true)) };
    setSectionPrefs(updated);
    saveSectionPrefs(updated);
  };
  const isSectionVisible = (key: string) => sectionPrefs[key] ?? true;

  // ── Queries (all with 30s polling) ──────────────────────────────────────────
  const { data: summary, isLoading: sumLoading } = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: () => apiClient.get('/dashboard/summary').then(r => r.data.data ?? r.data),
    refetchInterval: 30_000,
  });

  const { data: activeReleases = [], isLoading: relLoading } = useQuery<ActiveRelease[]>({
    queryKey: ['dashboard-active-releases'],
    queryFn: () => apiClient.get('/dashboard/active-releases').then(r => r.data.data ?? []),
    refetchInterval: 30_000,
  });

  const { data: pendingActions = [], isLoading: actLoading } = useQuery<PendingAction[]>({
    queryKey: ['dashboard-pending-actions'],
    queryFn: () => apiClient.get('/dashboard/pending-actions').then(r => r.data.data ?? []),
    refetchInterval: 30_000,
  });

  const { data: upcomingReleases = [], isLoading: upcomingLoading } = useQuery<UpcomingRelease[]>({
    queryKey: ['dashboard-upcoming-releases'],
    queryFn: () => apiClient.get('/dashboard/upcoming-releases').then(r => r.data.data ?? []),
    refetchInterval: 30_000,
  });

  const { data: doraMetrics, isLoading: doraLoading } = useQuery<DoraMetrics>({
    queryKey: ['metrics-dora'],
    queryFn: () => apiClient.get('/metrics/dora?months=3').then(r => r.data.data),
    refetchInterval: 60_000,
    enabled: isSectionVisible('dora'),
  });

  const productIdsParam = selectedProductIds.map(p => p.id).join(',');

  // H4-03: DORA trend
  const { data: doraTrend, isLoading: doraTrendLoading } = useQuery<DoraTrend>({
    queryKey: ['metrics-dora-trend', periodDays, productIdsParam],
    queryFn: () => apiClient.get(`/metrics/dora/trend?months=${Math.ceil(periodDays / 30)}&productIds=${productIdsParam}`).then(r => r.data.data),
    enabled: isSectionVisible('dora'),
  });

  // H4-04: Release Ops
  const { data: releaseOps, isLoading: releaseOpsLoading } = useQuery<ReleaseOpsData>({
    queryKey: ['metrics-release-ops', periodDays, productIdsParam],
    queryFn: () => apiClient.get(`/metrics/release-ops?days=${periodDays}&productIds=${productIdsParam}`).then(r => r.data.data),
    enabled: isSectionVisible('release-ops'),
  });

  const { data: todoTrend = [], isLoading: todoTrendLoading } = useQuery<TodoTrendPoint[]>({
    queryKey: ['metrics-todo-trend', periodDays, productIdsParam],
    queryFn: () => apiClient.get(`/metrics/release-ops/todo-trend?productIds=${productIdsParam}`).then(r => r.data.data),
    enabled: isSectionVisible('release-ops'),
  });

  // H4-07: Products list
  const { data: allProducts = [] } = useQuery<Product[]>({
    queryKey: ['products-list-filter'],
    queryFn: () => apiClient.get('/products').then(r => (r.data.data ?? r.data) as Product[]),
  });

  // H4-08: Transition detail
  const { data: transitionDetail, isLoading: transitionDetailLoading } = useQuery<TransitionDetail>({
    queryKey: ['version-transition-detail', transitionDetailVersionId],
    queryFn: () => apiClient.get(`/dashboard/version-transition/${transitionDetailVersionId}`).then(r => r.data.data),
    enabled: !!transitionDetailVersionId,
  });

  const { data: awareness, isLoading: awarenessLoading } = useQuery<AwarenessData>({
    queryKey: ['metrics-awareness'],
    queryFn: () => apiClient.get('/metrics/awareness').then(r => r.data.data),
    refetchInterval: 60_000,
    enabled: isSectionVisible('awareness'),
  });

  const { data: awarenessScores, isLoading: awarenessScoresLoading } = useQuery<AwarenessScores>({
    queryKey: ['metrics-awareness-scores'],
    queryFn: () => apiClient.get('/metrics/awareness-scores').then(r => r.data.data),
    refetchInterval: 60_000,
    enabled: isSectionVisible('awareness'),
  });

  const { data: cpmMappingsRaw } = useQuery<{ data: { id: string; customerId: string; updatedAt?: string; productVersion: { id: string; version: string; product: { id: string; name: string } } }[] }>({
    queryKey: ['cpm-stale-summary'],
    queryFn: () => apiClient.get('/customer-product-mappings').then(r => r.data),
    enabled: isSectionVisible('service-matrix'),
  });

  return (
    <Box>
      {/* ── Başlık + Layout Ayarları ──────────────────────────────────────── */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={1}>
        <Typography variant="h5" fontWeight={700}>Ana Dashboard</Typography>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          {/* H4-07: Product multi-select filter */}
          <Autocomplete
            multiple size="small"
            options={allProducts}
            getOptionLabel={(p: Product) => p.name}
            value={selectedProductIds}
            onChange={(_e, v) => setSelectedProductIds(v as Product[])}
            renderInput={params => <MuiTextField {...params} label="Ürün Filtresi" />}
            sx={{ minWidth: 180 }}
          />
          {/* H4-06: Period filter */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Dönem</InputLabel>
            <Select label="Dönem" value={periodDays} onChange={e => setPeriodDays(Number(e.target.value))}>
              <MenuItem value={7}>Son 7 gün</MenuItem>
              <MenuItem value={30}>Son 30 gün</MenuItem>
              <MenuItem value={90}>Son 90 gün</MenuItem>
              <MenuItem value={180}>Son 6 ay</MenuItem>
              <MenuItem value={365}>Son 1 yıl</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Widget görünürlüğünü düzenle">
            <IconButton size="small" onClick={() => setShowSettings(s => !s)}>
              <TuneIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* ── Layout Customization Panel ─────────────────────────────────────── */}
      <Collapse in={showSettings}>
        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={1}>
            WIDGET GÖRÜNÜRLÜĞÜ
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {[
              { key: 'stats', label: 'İstatistikler' },
              { key: 'dora', label: 'DORA Metrikleri' },
              { key: 'awareness', label: 'Awareness Skorları' },
              { key: 'release-ops', label: 'Release Ops' },
              { key: 'active', label: "Aktif Release'ler" },
              { key: 'upcoming', label: "Yaklaşan Release'ler" },
              { key: 'actions', label: 'Bekleyen Aksiyonlar' },
              { key: 'quickaccess', label: 'Hızlı Erişim' },
              { key: 'service-matrix', label: 'Stale Servisler' },
            ].map(({ key, label }) => (
              <FormControlLabel
                key={key}
                control={
                  <Switch
                    size="small"
                    checked={isSectionVisible(key)}
                    onChange={() => toggleSection(key)}
                  />
                }
                label={<Typography variant="caption">{label}</Typography>}
              />
            ))}
          </Stack>
        </Paper>
      </Collapse>

      {/* ── Bölüm A: 5 Stat Cards (H4-01) ────────────────────────────────── */}
      {isSectionVisible('stats') && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <StatCard label="Kritik Alert" value={summary?.criticalIssues ?? '—'}
              icon={<WarningIcon sx={{ fontSize: 40 }} />} color="#ef4444" loading={sumLoading} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <StatCard label="Bekleyen Onay" value={summary?.pendingHotfixes ?? '—'}
              icon={<HourglassTopIcon sx={{ fontSize: 40 }} />} color="#f59e0b" loading={sumLoading} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <StatCard label="Bu Ay Release" value={summary?.completedThisMonth ?? '—'}
              icon={<CheckCircleIcon sx={{ fontSize: 40 }} />} color="#10b981" loading={sumLoading} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <StatCard label="Devam Eden Versiyonlar" value={summary?.activeVersions ?? '—'}
              icon={<BuildIcon sx={{ fontSize: 40 }} />} color="#6366f1" loading={sumLoading} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <StatCard label="Açık Sorun" value={summary?.openIssues ?? '—'}
              icon={<ErrorOutlineIcon sx={{ fontSize: 40 }} />} color="#ec4899" loading={sumLoading} />
          </Grid>
        </Grid>
      )}

      {/* ── Bölüm A2: DORA Metrics ────────────────────────────────────────── */}
      {isSectionVisible('dora') && (
        <>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
            <SpeedIcon sx={{ fontSize: 18, mr: 0.5, mb: -0.3 }} />DORA Metrikleri
            {doraMetrics && (
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                Son {doraMetrics.period.months} ay
              </Typography>
            )}
          </Typography>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {doraLoading ? (
              [1, 2, 3, 4].map(i => (
                <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%' }}>
                    <Skeleton height={80} />
                  </Paper>
                </Grid>
              ))
            ) : doraMetrics ? (
              <>
                {/* Deploy Frequency */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%', borderLeft: `4px solid ${RATING_COLORS[doraMetrics.deployFrequency.rating]}` }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="h4" fontWeight={800} lineHeight={1}>{doraMetrics.deployFrequency.value}</Typography>
                        <Typography variant="caption" color="text.secondary">deploy/gün</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Dağıtım Sıklığı</Typography>
                      </Box>
                      <Box>
                        <TimelineIcon sx={{ fontSize: 28, color: RATING_COLORS[doraMetrics.deployFrequency.rating], mb: 0.5 }} />
                        <Chip size="small" label={RATING_LABELS[doraMetrics.deployFrequency.rating]}
                          sx={{ bgcolor: RATING_COLORS[doraMetrics.deployFrequency.rating], color: '#fff', fontWeight: 700, fontSize: 10 }} />
                      </Box>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Toplam {doraMetrics.deployFrequency.total} release
                    </Typography>
                  </Paper>
                </Grid>
                {/* Lead Time */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%', borderLeft: `4px solid ${RATING_COLORS[doraMetrics.leadTime.rating]}` }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="h4" fontWeight={800} lineHeight={1}>{doraMetrics.leadTime.value}</Typography>
                        <Typography variant="caption" color="text.secondary">gün</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Teslim Süresi</Typography>
                      </Box>
                      <Box>
                        <HourglassTopIcon sx={{ fontSize: 28, color: RATING_COLORS[doraMetrics.leadTime.rating], mb: 0.5 }} />
                        <Chip size="small" label={RATING_LABELS[doraMetrics.leadTime.rating]}
                          sx={{ bgcolor: RATING_COLORS[doraMetrics.leadTime.rating], color: '#fff', fontWeight: 700, fontSize: 10 }} />
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
                {/* Change Failure Rate */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%', borderLeft: `4px solid ${RATING_COLORS[doraMetrics.changeFailureRate.rating]}` }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="h4" fontWeight={800} lineHeight={1}>%{doraMetrics.changeFailureRate.value}</Typography>
                        <Typography variant="caption" color="text.secondary">hata oranı</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Değişiklik Hata Oranı</Typography>
                      </Box>
                      <Box>
                        <ErrorOutlineIcon sx={{ fontSize: 28, color: RATING_COLORS[doraMetrics.changeFailureRate.rating], mb: 0.5 }} />
                        <Chip size="small" label={RATING_LABELS[doraMetrics.changeFailureRate.rating]}
                          sx={{ bgcolor: RATING_COLORS[doraMetrics.changeFailureRate.rating], color: '#fff', fontWeight: 700, fontSize: 10 }} />
                      </Box>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      {doraMetrics.changeFailureRate.failedReleases}/{doraMetrics.changeFailureRate.totalReleases} release
                    </Typography>
                  </Paper>
                </Grid>
                {/* MTTR */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%', borderLeft: `4px solid ${RATING_COLORS[doraMetrics.mttr.rating]}` }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="h4" fontWeight={800} lineHeight={1}>{doraMetrics.mttr.value}</Typography>
                        <Typography variant="caption" color="text.secondary">saat</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Kurtarma Süresi (MTTR)</Typography>
                      </Box>
                      <Box>
                        <BuildIcon sx={{ fontSize: 28, color: RATING_COLORS[doraMetrics.mttr.rating], mb: 0.5 }} />
                        <Chip size="small" label={RATING_LABELS[doraMetrics.mttr.rating]}
                          sx={{ bgcolor: RATING_COLORS[doraMetrics.mttr.rating], color: '#fff', fontWeight: 700, fontSize: 10 }} />
                      </Box>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      {doraMetrics.mttr.resolvedIssues} çözülmüş issue
                    </Typography>
                  </Paper>
                </Grid>
              </>
            ) : (
              <Grid size={{ xs: 12 }}>
                <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', borderRadius: 2 }}>
                  <Typography color="text.secondary">DORA verileri yüklenemedi.</Typography>
                </Paper>
              </Grid>
            )}
          </Grid>

          {/* H4-03: DORA trend chart */}
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2" fontWeight={600}>Haftalık Trend</Typography>
              <ToggleButtonGroup
                size="small" value={doraTrendMetric} exclusive
                onChange={(_e, v) => v && setDoraTrendMetric(v)}>
                <ToggleButton value="DEPLOY_FREQ">DF</ToggleButton>
                <ToggleButton value="LEAD_TIME">LT</ToggleButton>
                <ToggleButton value="CHANGE_FAIL_RATE">CFR</ToggleButton>
                <ToggleButton value="MTTR">MTTR</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
            {doraTrendLoading ? (
              <Skeleton height={180} />
            ) : (doraTrend?.series?.[doraTrendMetric]?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={doraTrend!.series[doraTrendMetric]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <RechartTooltip />
                  <Line type="monotone" dataKey="value" stroke="#6366f1" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Trend verisi yok. DORA Calculator çalışmadan önce MetricSnapshot oluşturulmalı.
              </Typography>
            )}
          </Paper>
        </>
      )}

      {/* ── Bölüm A3: Awareness Scores ────────────────────────────────────── */}      {isSectionVisible('awareness') && (
        <>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
            <VisibilityIcon sx={{ fontSize: 18, mr: 0.5, mb: -0.3 }} />Farkındalık Skorları
          </Typography>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {(awarenessLoading || awarenessScoresLoading) ? (
              [1, 2, 3, 4].map(i => (
                <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%' }}>
                    <Skeleton height={80} />
                  </Paper>
                </Grid>
              ))
            ) : (
              <>
                {/* Version Awareness */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary" fontWeight={600}>Versiyon Güncelliği</Typography>
                        <Typography variant="caption" color="text.secondary">Müşterilerin güncel versiyonda olma oranı</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                      <CircularProgress variant="determinate" value={awareness?.overallAwarenessScore ?? 0}
                        size={72} thickness={5}
                        sx={{ color: scoreColor(awareness?.overallAwarenessScore ?? 0) }} />
                      <Box sx={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography variant="h6" fontWeight={800}>{awareness?.overallAwarenessScore ?? 0}</Typography>
                      </Box>
                    </Box>
                    {awareness?.byProduct && awareness.byProduct.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        {awareness.byProduct.slice(0, 3).map(p => (
                          <Stack key={p.productId} direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                            <Typography variant="caption" noWrap sx={{ maxWidth: 100 }}>{p.productName}</Typography>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <LinearProgress variant="determinate" value={p.awarenessScore}
                                sx={{ width: 50, height: 4, borderRadius: 2 }}
                                color={p.awarenessScore >= 80 ? 'success' : p.awarenessScore >= 50 ? 'warning' : 'error'} />
                              <Typography variant="caption" fontWeight={600}>{p.awarenessScore}%</Typography>
                            </Stack>
                          </Stack>
                        ))}
                      </Box>
                    )}
                  </Paper>
                </Grid>
                {/* Deployment Diversity */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%' }}>
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="body2" color="text.secondary" fontWeight={600}>Dağıtım Çeşitliliği</Typography>
                      <Typography variant="caption" color="text.secondary">Düşük = daha fazla standartlaşma gerekli</Typography>
                    </Box>
                    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                      <CircularProgress variant="determinate" value={awarenessScores?.deploymentDiversity.score ?? 0}
                        size={72} thickness={5}
                        sx={{ color: scoreColor(awarenessScores?.deploymentDiversity.score ?? 0) }} />
                      <Box sx={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography variant="h6" fontWeight={800}>{awarenessScores?.deploymentDiversity.score ?? 0}</Typography>
                      </Box>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      {awarenessScores?.deploymentDiversity.uniqueCombinations ?? 0} farklı kombinasyon / {awarenessScores?.deploymentDiversity.totalMappings ?? 0} eşleştirme
                    </Typography>
                  </Paper>
                </Grid>
                {/* Config Drift */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%' }}>
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="body2" color="text.secondary" fontWeight={600}>Konfigürasyon Tutarlılığı</Typography>
                      <Typography variant="caption" color="text.secondary">Yüksek = az override, tutarlı config</Typography>
                    </Box>
                    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                      <CircularProgress variant="determinate" value={awarenessScores?.configDrift.score ?? 0}
                        size={72} thickness={5}
                        sx={{ color: scoreColor(awarenessScores?.configDrift.score ?? 0) }} />
                      <Box sx={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography variant="h6" fontWeight={800}>{awarenessScores?.configDrift.score ?? 0}</Typography>
                      </Box>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Ort. {awarenessScores?.configDrift.avgOverrideKeys ?? 0} override key / {awarenessScores?.configDrift.totalWithOverrides ?? 0} CPM
                    </Typography>
                  </Paper>
                </Grid>
                {/* Codebase Divergence */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, height: '100%' }}>
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="body2" color="text.secondary" fontWeight={600}>Kod Ayrışması</Typography>
                      <Typography variant="caption" color="text.secondary">Düşük = branch'ler kaynak koddan uzak</Typography>
                    </Box>
                    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                      <CircularProgress variant="determinate" value={awarenessScores?.codebaseDivergence.score ?? 0}
                        size={72} thickness={5}
                        sx={{ color: scoreColor(awarenessScores?.codebaseDivergence.score ?? 0) }} />
                      <Box sx={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography variant="h6" fontWeight={800}>{awarenessScores?.codebaseDivergence.score ?? 0}</Typography>
                      </Box>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Ort. {awarenessScores?.codebaseDivergence.avgDaysSinceSync ?? 0} gün / {awarenessScores?.codebaseDivergence.totalBranches ?? 0} branch
                    </Typography>
                  </Paper>
                </Grid>
              </>
            )}
          </Grid>
        </>
      )}

      {/* ── H4-04: Release Ops Section ────────────────────────────────────── */}
      {isSectionVisible('release-ops') && (
        <>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
            <BuildIcon sx={{ fontSize: 18, mr: 0.5, mb: -0.3 }} />Release Ops Metrikleri
          </Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {releaseOpsLoading ? (
              [1, 2, 3, 4].map(i => (
                <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}><Skeleton height={60} /></Paper>
                </Grid>
              ))
            ) : releaseOps ? (
              <>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary">Cycle Time</Typography>
                    <Typography variant="h5" fontWeight={700}>{releaseOps.cycleTimeDays} gün</Typography>
                    <Typography variant="caption" color="text.secondary">Geliştirme → Yayın</Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary">MR Throughput</Typography>
                    <Typography variant="h5" fontWeight={700}>{releaseOps.mrThroughput}</Typography>
                    <Typography variant="caption" color="text.secondary">Ort. commit/versiyon</Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary">Pipeline Başarı</Typography>
                    <Typography variant="h5" fontWeight={700}>
                      {releaseOps.pipelineSuccessRate !== null ? `%${releaseOps.pipelineSuccessRate}` : '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">MetricSnapshot'tan</Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary">Ort. Todo / Versiyon</Typography>
                    <Typography variant="h5" fontWeight={700}>{releaseOps.avgTodosPerVersion}</Typography>
                    <Typography variant="caption" color="text.secondary">{releaseOps.releasedVersionCount} versiyon baz alındı</Typography>
                  </Paper>
                </Grid>
              </>
            ) : null}
          </Grid>
          {/* Todo trend bar chart */}
          {todoTrendLoading ? (
            <Skeleton height={200} sx={{ mb: 4 }} />
          ) : todoTrend.length > 0 ? (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 4 }}>
              <Typography variant="body2" fontWeight={600} mb={1}>Todo Tamamlanma Trendi (Son {todoTrend.length} Versiyon)</Typography>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={todoTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="version" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <RechartTooltip />
                  <Legend />
                  <Bar dataKey="total" name="Toplam" fill="#94a3b8" />
                  <Bar dataKey="done" name="Tamamlanan" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          ) : (
            <Box sx={{ mb: 4 }} />
          )}
        </>
      )}

      {/* ── Bölüm B: Aktif Release'ler ─────────────────────────────────────── */}
      {isSectionVisible('active') && (
        <>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>Aktif Release&apos;ler</Typography>
          <Paper variant="outlined" sx={{ borderRadius: 2, mb: 4, overflow: 'hidden' }}>
            {relLoading ? (
              <Box sx={{ p: 2 }}><Skeleton height={200} /></Box>
            ) : activeReleases.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">Aktif release bulunamadı.</Typography>
              </Box>
            ) : (
              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
                <Box component="thead" sx={{ bgcolor: 'action.hover' }}>
                  <Box component="tr">
                    {['Ürün', 'Versiyon', 'Faz', 'Sağlık', 'Müşteri Geçişi', 'Detay'].map(h => (
                      <Box component="th" key={h} sx={{ px: 2, py: 1.5, textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>
                        {h}
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Box component="tbody">
                  {activeReleases.map(rel => (
                    <Box component="tr" key={rel.id} sx={{ borderTop: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'action.hover' } }}>
                      <Box component="td" sx={{ px: 2, py: 1.5 }}>
                        <Typography variant="body2" fontWeight={500}>{rel.product.name}</Typography>
                      </Box>
                      <Box component="td" sx={{ px: 2, py: 1.5 }}>
                        <Typography variant="body2">{rel.version}</Typography>
                      </Box>
                      <Box component="td" sx={{ px: 2, py: 1.5 }}>
                        <Chip size="small" label={rel.phase} color={phaseColor(rel.phase)} />
                      </Box>
                      <Box component="td" sx={{ px: 2, py: 1.5, minWidth: 160 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <LinearProgress
                            variant="determinate"
                            value={rel.healthScore}
                            color={healthColor(rel.healthScore)}
                            sx={{ flex: 1, height: 8, borderRadius: 4 }}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                            %{rel.healthScore}
                          </Typography>
                        </Stack>
                      </Box>
                      {/* H4-02: Müşteri Geçişi */}
                      <Box component="td" sx={{ px: 2, py: 1.5 }}>
                        {rel.customerTransition && rel.customerTransition.total > 0 ? (
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <Typography variant="caption">
                              {rel.customerTransition.completed}/{rel.customerTransition.total}
                            </Typography>
                            {rel.customerTransition.ratio !== null && (
                              <Typography variant="caption" color="text.secondary">
                                (%{rel.customerTransition.ratio})
                              </Typography>
                            )}
                            <Button size="small" variant="text" sx={{ minWidth: 0, px: 0.5, fontSize: 10 }}
                              onClick={() => setTransitionDetailVersionId(rel.id)}>
                              Detay
                            </Button>
                          </Stack>
                        ) : (
                          <Typography variant="caption" color="text.secondary">—</Typography>
                        )}
                      </Box>
                      <Box component="td" sx={{ px: 2, py: 1.5 }}>
                        <Button size="small" endIcon={<ArrowForwardIcon />}
                          onClick={() => navigate('/release-health-check')}>
                          Görüntüle
                        </Button>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Paper>
        </>
      )}

      {/* ── Bölüm B2: Yaklaşan Release'ler ───────────────────────────────── */}
      {isSectionVisible('upcoming') && (
        <>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
            <EventIcon sx={{ fontSize: 18, mr: 0.5, mb: -0.3 }} />Yaklaşan Release&apos;ler
          </Typography>
          <Paper variant="outlined" sx={{ borderRadius: 2, mb: 4, overflow: 'hidden' }}>
            {upcomingLoading ? (
              <Box sx={{ p: 2 }}><Skeleton height={100} /></Box>
            ) : upcomingReleases.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">Yaklaşan release bulunamadı.</Typography>
              </Box>
            ) : (
              <List dense disablePadding>
                {upcomingReleases.slice(0, 5).map((rel, idx) => (
                  <Box key={rel.id}>
                    {idx > 0 && <Divider />}
                    <ListItem sx={{ px: 2, py: 1 }}
                      secondaryAction={
                        <Chip size="small" label={rel.phase} color={phaseColor(rel.phase)} />
                      }
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <EventIcon fontSize="small" color="action" />
                      </ListItemIcon>
                      <ListItemText
                        primary={`${rel.product.name} — v${rel.version}`}
                        secondary={rel.plannedDate ? fmtDate(rel.plannedDate) : 'Tarih belirsiz'}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  </Box>
                ))}
              </List>
            )}
          </Paper>
        </>
      )}

      {/* ── Bölüm C: Bekleyen Aksiyonlar + Hızlı Erişim ───────────────────── */}
      <Grid container spacing={2}>
        {/* Pending Actions */}
        {isSectionVisible('actions') && (
          <Grid size={{ xs: 12, md: isSectionVisible('quickaccess') ? 8 : 12 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>Bekleyen Aksiyonlar</Typography>
          <Paper variant="outlined" sx={{ borderRadius: 2 }}>
            {actLoading ? (
              <Box sx={{ p: 2 }}><Skeleton height={160} /></Box>
            ) : pendingActions.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">Bekleyen aksiyon yok.</Typography>
              </Box>
            ) : (
              <List dense disablePadding>
                {pendingActions.slice(0, 8).map((action, idx) => (
                  <Box key={action.id}>
                    {idx > 0 && <Divider />}
                    <ListItem
                      sx={{ px: 2, py: 1.5 }}
                      secondaryAction={
                        <Typography variant="caption" color="text.secondary">{fmtDate(action.createdAt)}</Typography>
                      }
                    >
                      <ListItemIcon sx={{ minWidth: 28 }}>
                        <FiberManualRecordIcon fontSize="small" color={priorityDot(action.priority)} />
                      </ListItemIcon>
                      <ListItemText
                        primary={action.title}
                        secondary={[
                          action.productVersion?.product?.name,
                          action.productVersion?.version,
                          action.customer?.name,
                        ].filter(Boolean).join(' · ') || action.type}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  </Box>
                ))}
              </List>
            )}
            </Paper>
          </Grid>
        )}

        {/* Quick Access */}
        {isSectionVisible('quickaccess') && (
          <Grid size={{ xs: 12, md: isSectionVisible('actions') ? 4 : 12 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>Hızlı Erişim</Typography>
          <Paper variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
            <Stack spacing={1.5}>
              <Button fullWidth variant="outlined" startIcon={<HealthAndSafetyIcon />}
                onClick={() => navigate('/release-health-check')}>
                Release Health Check
              </Button>
              <Button fullWidth variant="outlined" startIcon={<BugReportIcon />} color="warning"
                onClick={() => navigate('/hotfix-merkezi')}>
                Hotfix Oluştur
              </Button>
              <Button fullWidth variant="outlined" startIcon={<AddCircleOutlineIcon />}
                onClick={() => navigate('/releases')}>
                Yeni Versiyon
              </Button>
              <Button fullWidth variant="outlined" startIcon={<SyncAltIcon />}
                onClick={() => navigate('/code-sync')}>
                Code Sync
              </Button>
            </Stack>
          </Paper>
          </Grid>
        )}
      </Grid>

      {/* ── Bölüm F-05: Stale Servisler Widget ───────────────────────────────── */}
      {isSectionVisible('service-matrix') && (() => {
        const STALE_DAYS = 90;
        const allMappings = cpmMappingsRaw?.data ?? [];
        const now = Date.now();
        const staleMappings = allMappings.filter(m => {
          if (!m.updatedAt) return false;
          const days = (now - new Date(m.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
          return days > STALE_DAYS;
        });

        // Group by product
        const byProduct = new Map<string, { name: string; count: number }>();
        for (const m of staleMappings) {
          const pid = m.productVersion.product.id;
          const existing = byProduct.get(pid);
          if (existing) {
            existing.count++;
          } else {
            byProduct.set(pid, { name: m.productVersion.product.name, count: 1 });
          }
        }
        const breakdown = [...byProduct.values()].sort((a, b) => b.count - a.count);

        return (
          <Paper variant="outlined" sx={{ borderRadius: 2, p: 2, mb: 3, border: staleMappings.length > 0 ? '1px solid' : undefined, borderColor: staleMappings.length > 0 ? 'warning.main' : undefined }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
              <UpdateIcon color={staleMappings.length > 0 ? 'warning' : 'disabled'} />
              <Typography variant="subtitle1" fontWeight={700}>
                Güncel Olmayan Servisler
              </Typography>
              <Chip
                size="small"
                label={staleMappings.length}
                color={staleMappings.length > 0 ? 'warning' : 'default'}
              />
              <Typography variant="caption" color="text.secondary">
                (+{STALE_DAYS} gün güncellenmemiş müşteri-ürün eşleşmeleri)
              </Typography>
            </Stack>

            {staleMappings.length === 0 ? (
              <Typography variant="body2" color="text.secondary">Tüm müşteri-ürün eşleşmeleri güncel. ✅</Typography>
            ) : (
              <Stack spacing={0.75}>
                {breakdown.map(b => (
                  <Stack key={b.name} direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">{b.name}</Typography>
                    <Chip size="small" label={`${b.count} müşteri`} color="warning" variant="outlined" />
                  </Stack>
                ))}
              </Stack>
            )}
          </Paper>
        );
      })()}

      {/* ── H4-08: Version Transition Detail Drawer ─────────────────────── */}
      <Drawer anchor="right" open={!!transitionDetailVersionId}
        onClose={() => setTransitionDetailVersionId(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, p: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight={700}>Müşteri Geçiş Durumu</Typography>
          <IconButton onClick={() => setTransitionDetailVersionId(null)}><SpeedIcon /></IconButton>
        </Stack>
        {transitionDetailLoading ? (
          <Skeleton height={200} />
        ) : transitionDetail ? (
          <>
            <Typography variant="body2" color="text.secondary" mb={1}>
              {transitionDetail.product} — v{transitionDetail.version}
            </Typography>
            <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
              <Chip label={`${transitionDetail.summary.completed} Geçti`} color="success" size="small" />
              <Chip label={`${transitionDetail.summary.planned} Planlandı`} color="info" size="small" />
              <Chip label={`${transitionDetail.summary.notPlanned} Planlamadı`} color="default" size="small" />
            </Stack>
            <LinearProgress variant="determinate" value={transitionDetail.summary.completionRate}
              color="success" sx={{ height: 8, borderRadius: 4, mb: 2 }} />
            <Typography variant="caption" color="text.secondary" mb={2} display="block">
              %{transitionDetail.summary.completionRate} tamamlandı ({transitionDetail.summary.total} müşteri toplam)
            </Typography>
            <Divider sx={{ mb: 1 }} />
            <List dense disablePadding>
              {transitionDetail.customers.map(c => (
                <ListItem key={c.customerId} disableGutters
                  secondaryAction={
                    <Chip size="small"
                      label={c.status === 'COMPLETED' ? 'Geçti' : c.status === 'PLANNED' ? 'Planlandı' : 'Planlamadı'}
                      color={c.status === 'COMPLETED' ? 'success' : c.status === 'PLANNED' ? 'info' : 'default'} />
                  }>
                  <ListItemText
                    primary={c.customerName}
                    secondary={c.actualDate ? `Geçiş: ${fmtDate(c.actualDate)}` : c.plannedDate ? `Planlanan: ${fmtDate(c.plannedDate)}` : null}
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
              ))}
            </List>
          </>
        ) : null}
      </Drawer>
    </Box>
  );
}

