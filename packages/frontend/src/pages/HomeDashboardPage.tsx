import { useState } from 'react';
import {
  Box, Grid, Paper, Typography, Chip, LinearProgress,
  Skeleton, List, ListItem, ListItemText, ListItemIcon,
  Button, Divider, Stack, Collapse, IconButton, Tooltip, Switch, FormControlLabel,
  CircularProgress,
} from '@mui/material';
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
};

type ActiveRelease = {
  id: string; version: string; phase: string;
  healthScore: number;
  product: { id: string; name: string };
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

  return (
    <Box>
      {/* ── Başlık + Layout Ayarları ──────────────────────────────────────── */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={700}>Ana Dashboard</Typography>
        <Tooltip title="Widget görünürlüğünü düzenle">
          <IconButton size="small" onClick={() => setShowSettings(s => !s)}>
            <TuneIcon fontSize="small" />
          </IconButton>
        </Tooltip>
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
              { key: 'active', label: 'Aktif Release\'ler' },
              { key: 'upcoming', label: 'Yaklaşan Release\'ler' },
              { key: 'actions', label: 'Bekleyen Aksiyonlar' },
              { key: 'quickaccess', label: 'Hızlı Erişim' },
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

      {/* ── Bölüm A: 3 Stat Cards ─────────────────────────────────────────── */}
      {isSectionVisible('stats') && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <StatCard
              label="Kritik Alert"
              value={summary?.criticalIssues ?? '—'}
              icon={<WarningIcon sx={{ fontSize: 40 }} />}
              color="#ef4444"
              loading={sumLoading}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <StatCard
              label="Bekleyen Onay"
              value={summary?.pendingHotfixes ?? '—'}
              icon={<HourglassTopIcon sx={{ fontSize: 40 }} />}
              color="#f59e0b"
              loading={sumLoading}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <StatCard
              label="Bu Ay Tamamlanan"
              value={summary?.completedThisMonth ?? '—'}
              icon={<CheckCircleIcon sx={{ fontSize: 40 }} />}
              color="#10b981"
              loading={sumLoading}
            />
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
        </>
      )}

      {/* ── Bölüm A3: Awareness Scores ────────────────────────────────────── */}
      {isSectionVisible('awareness') && (
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
                    {['Ürün', 'Versiyon', 'Faz', 'Sağlık', 'Detay'].map(h => (
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
    </Box>
  );
}

