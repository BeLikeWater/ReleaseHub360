import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Chip, FormControl, InputLabel,
  Select, MenuItem, CircularProgress, Alert, Table, TableBody, TableCell,
  TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions,
  Accordion, AccordionSummary, AccordionDetails, Paper, Skeleton,
  Tooltip, IconButton, Link, Snackbar, Divider, Popover,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CancelIcon from '@mui/icons-material/Cancel';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { PHASE_META } from '@/lib/versionPhase';

// ─── Types ───────────────────────────────────────────────────────────────────

type Product = {
  id: string; name: string;
  pmType?: string | null;
};

type Version = {
  id: string; version: string; phase: string;
  preProdDate?: string | null; testDate?: string | null;
  masterStartDate?: string | null; targetDate?: string | null;
  releaseDate?: string | null;
  product: { id: string; name: string };
};

type ServiceRow = {
  id: string; name: string; repoName?: string | null;
  lastProdReleaseName?: string | null; // Katalog Versiyonu — ana alan
  lastProdReleaseDate?: string | null;
  currentVersion?: string | null;      // @deprecated — fallback olarak korunuyor
  moduleId?: string | null;
  lastReleaseName?: string | null;     // Son Release (prep stage) — deprecated, initBaseline ile geliyordu
  lastPrepReleaseName?: string | null;
  lastPrepReleaseDate?: string | null;
};

type ModuleRow = { id: string; name: string; services: ServiceRow[] };
type ModuleGroupRow = { id: string; name: string; modules: ModuleRow[] };

type ProductDetail = {
  id: string; name: string;
  services: ServiceRow[];
  moduleGroups: ModuleGroupRow[];
};

type PR = {
  pullRequestId: number;
  title: string;
  status: string;
  sourceBranch?: string;
  targetRefName?: string;  // e.g. "refs/heads/master"
  creationDate?: string;
  closedDate?: string;
  repository?: { name?: string; webUrl?: string };
  workItemRefs?: { id: string | number }[];
  _links?: { web?: { href?: string } };
};

type WorkItem = {
  id: number;
  fields: {
    'System.Title'?: string;
    'System.WorkItemType'?: string;
    'System.State'?: string;
    'System.AssignedTo'?: { displayName?: string } | string;
  };
  url?: string;
};

type ReleaseNote = {
  id: string; title: string; description?: string | null;
  workitemId?: string | null; category: string; isBreaking: boolean;
};

type SystemChange = {
  id: string; title: string; description?: string | null;
  changeType: string; isBreaking: boolean; apiPath?: string | null;
  previousValue?: string | null; newValue?: string | null;
};

type ReleaseTodo = {
  id: string; title: string; description?: string | null;
  priority: string; timing: string; isCompleted: boolean; category?: string | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreColor(score: number): 'success' | 'warning' | 'error' {
  if (score >= 80) return 'success';
  if (score >= 60) return 'warning';
  return 'error';
}

type StatusKind = 'ok' | 'warn' | 'error' | 'empty';

function StatusIcon({ kind }: { kind: StatusKind }) {
  if (kind === 'ok') return <CheckCircleIcon color="success" fontSize="small" />;
  if (kind === 'warn') return <WarningAmberIcon color="warning" fontSize="small" />;
  if (kind === 'error') return <CancelIcon color="error" fontSize="small" />;
  return <RadioButtonUncheckedIcon color="disabled" fontSize="small" />;
}

function fmtDate(d?: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
}

function fmtDatetime(d?: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('tr-TR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function prStatusColor(status: string): 'warning' | 'success' | 'error' | 'default' {
  if (status === 'active') return 'warning';
  if (status === 'completed') return 'success';
  if (status === 'abandoned') return 'error';
  return 'default';
}

function wiTypeColor(type?: string): 'error' | 'primary' | 'default' {
  if (!type) return 'default';
  const t = type.toLowerCase();
  if (t.includes('bug')) return 'error';
  if (t.includes('feature') || t.includes('user story')) return 'primary';
  return 'default';
}

function wiStateColor(state?: string): 'success' | 'warning' | 'default' {
  if (!state) return 'default';
  if (['Done', 'Closed', 'Resolved'].includes(state)) return 'success';
  if (['In Progress', 'Active'].includes(state)) return 'warning';
  return 'default';
}

function priorityColor(p: string): 'error' | 'warning' | 'default' {
  if (p === 'P0') return 'error';
  if (p === 'P1') return 'warning';
  return 'default';
}

function assignedName(a?: { displayName?: string } | string): string {
  if (!a) return '—';
  if (typeof a === 'string') return a || '—';
  return a.displayName ?? '—';
}

// ─── ScoreGauge ──────────────────────────────────────────────────────────────

function ScoreGauge({ score, loading }: { score: number; loading: boolean }) {
  const color = scoreColor(score);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        {loading
          ? <CircularProgress size={80} thickness={6} />
          : <CircularProgress variant="determinate" value={score} size={80} color={color} thickness={6} />}
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="h6" fontWeight={800} color={loading ? 'text.secondary' : `${color}.main`}>
            {loading ? '—' : score}
          </Typography>
        </Box>
      </Box>
      <Typography variant="caption" color="text.secondary">Sağlık Skoru</Typography>
    </Box>
  );
}

// ─── SectionShell ─────────────────────────────────────────────────────────────

const STATUS_TOOLTIP: Record<StatusKind, string> = {
  ok: 'Sorun yok', warn: 'Uyarı var', error: 'Bloker var', empty: 'Veri yok',
};

function SectionShell({ icon, title, status, statusNote, collapsed, onToggle, headerAction, children }: {
  icon: string; title: string; status: StatusKind; statusNote?: string;
  collapsed: boolean; onToggle: () => void;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Paper variant="outlined" sx={{ mb: 2, overflow: 'hidden' }}>
      <Box onClick={onToggle} sx={{
        display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5,
        cursor: 'pointer', userSelect: 'none', bgcolor: 'grey.50',
        borderBottom: collapsed ? 'none' : '1px solid', borderColor: 'divider',
        '&:hover': { bgcolor: 'grey.100' },
      }}>
        <Typography fontSize={18}>{icon}</Typography>
        <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>{title}</Typography>
        {statusNote && <Typography variant="caption" color="text.secondary">{statusNote}</Typography>}
        {headerAction && <Box onClick={e => e.stopPropagation()}>{headerAction}</Box>}
        <Tooltip title={STATUS_TOOLTIP[status]}>
          <span><StatusIcon kind={status} /></span>
        </Tooltip>
        <ExpandMoreIcon sx={{ transform: collapsed ? 'rotate(-90deg)' : 'none', transition: '0.2s' }} />
      </Box>
      {!collapsed && <Box sx={{ p: 2 }}>{children}</Box>}
    </Paper>
  );
}

// ─── SECTION 1 — BoM ──────────────────────────────────────────────────────────

function ServiceTable({ services, deltaMap, isDeltaLoading, productId }: {
  services: ServiceRow[];
  deltaMap: Map<string, PR[]>;
  isDeltaLoading: boolean;
  productId: string;
}) {
  const queryClient = useQueryClient();
  const [popover, setPopover] = useState<{ el: HTMLElement | null; items: { prId: number; title: string; mergeDate: string }[] }>({
    el: null, items: [],
  });
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const refreshMut = useMutation({
    mutationFn: (serviceId: string) =>
      apiClient.post(`/tfs/refresh-prep-release?productId=${productId}&serviceId=${serviceId}`).then(r => r.data),
    onMutate: (serviceId) => setRefreshingId(serviceId),
    onSettled: () => setRefreshingId(null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['product-detail', productId] }),
  });

  return (
    <>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.50' }}>
            <TableCell sx={{ fontWeight: 600 }}>Servis</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Katalog Versiyonu</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Son Prep Release</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Son Prep Tarihi</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Yeni PR'lar</TableCell>
            <TableCell sx={{ fontWeight: 600, width: 48 }} />
          </TableRow>
        </TableHead>
        <TableBody>
          {services.map(svc => {
            const deltaItems = deltaMap.get(svc.id) ?? [];
            const deltaCount = deltaItems.length;
            const katalogVer = svc.lastProdReleaseName ?? svc.currentVersion;
            const lastPrepRelease = svc.lastPrepReleaseName ?? null;
            const isRefreshing = refreshingId === svc.id;
            return (
              <TableRow key={svc.id} hover>
                <TableCell>
                  <Chip label={svc.repoName || svc.name} size="small" color="primary" variant="outlined" />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {katalogVer || '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color={lastPrepRelease ? 'text.secondary' : 'text.disabled'} fontFamily="monospace">
                    {lastPrepRelease ?? '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {fmtDatetime(svc.lastPrepReleaseDate)}
                  </Typography>
                </TableCell>
                <TableCell>
                  {isDeltaLoading ? (
                    <Chip label="Yükleniyor..." size="small" color="default" />
                  ) : !svc.repoName ? (
                    <Chip label="Repo tanımsız" size="small" color="default" />
                  ) : !svc.lastProdReleaseDate ? (
                    <Chip label="Baseline yok" size="small" color="default" />
                  ) : deltaCount === 0 ? (
                    <Chip label="Değişiklik yok" size="small" color="success" />
                  ) : (
                    <Chip
                      label={`${deltaCount} yeni PR`} size="small" color="primary"
                      onClick={e => setPopover({
                        el: e.currentTarget as HTMLElement,
                        items: deltaItems.map(pr => ({
                          prId: pr.pullRequestId,
                          title: pr.title,
                          mergeDate: pr.closedDate ?? pr.creationDate ?? '',
                        })),
                      })}
                      sx={{ cursor: 'pointer' }}
                    />
                  )}
                </TableCell>
                <TableCell sx={{ p: 0.5 }}>
                  <Tooltip title="Prep release'i Azure'dan güncelle">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => refreshMut.mutate(svc.id)}
                        disabled={isRefreshing || refreshMut.isPending}
                      >
                        {isRefreshing
                          ? <CircularProgress size={14} />
                          : <RefreshIcon fontSize="small" />}
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <Popover
        open={Boolean(popover.el)}
        anchorEl={popover.el}
        onClose={() => setPopover({ el: null, items: [] })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 1.5, minWidth: 300, maxWidth: 440 }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Son release'den bu yana PR'lar
          </Typography>
          {popover.items.map(pr => (
            <Box key={pr.prId} sx={{ display: 'flex', gap: 1, py: 0.5, alignItems: 'center' }}>
              <Chip label="MERGED" size="small" color="success" sx={{ fontSize: 10, height: 18 }} />
              <Typography variant="body2" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {pr.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">{fmtDate(pr.mergeDate)}</Typography>
            </Box>
          ))}
        </Box>
      </Popover>
    </>
  );
}

function BomSection({ productId, collapsed, onToggle, onWorkItemsCollected, onDeltaPrsCollected }: {
  productId: string; collapsed: boolean; onToggle: () => void;
  onWorkItemsCollected?: (ids: number[]) => void;
  onDeltaPrsCollected?: (prs: PR[]) => void;
}) {
  const { data: product, isLoading } = useQuery<ProductDetail>({
    queryKey: ['product-detail', productId],
    queryFn: () => apiClient.get(`/products/${productId}`).then(r => r.data.data),
    enabled: !!productId,
    staleTime: 60_000,
  });

  // PR'lar: prs-v3 (PrSection ile aynı cache key — Azure'a ekstra istek gitmez)
  const { data: prsRaw = [], isLoading: isDeltaLoading } = useQuery<PR[]>({
    queryKey: ['prs-v3', productId],
    queryFn: () =>
      apiClient.get(`/tfs/pull-requests?productId=${productId}`)
        .then(r => { const d = r.data.data ?? r.data; return d.value ?? (Array.isArray(d) ? d : []); }),
    enabled: !!productId,
    staleTime: 60_000,
  });

  const queryClient = useQueryClient();
  const batchRefreshMut = useMutation({
    mutationFn: () => apiClient.post(`/tfs/refresh-prep-release?productId=${productId}`).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['product-detail', productId] }),
  });

  // Tüm servisleri düz liste olarak topla (deltaMap hesabı için)
  const allServices = useMemo(() => {
    if (!product) return [] as ServiceRow[];
    const fromMods = (product.moduleGroups ?? []).flatMap(g => g.modules.flatMap(m => m.services));
    const modSvcIds = new Set(fromMods.map(s => s.id));
    return [...fromMods, ...(product.services ?? []).filter(s => !modSvcIds.has(s.id))];
  }, [product]);

  // Delta: servis başına, repoName eşleşen + master'a merge edilmiş (completed) +
  //        closedDate ∈ (lastProdReleaseDate, lastPrepReleaseDate ?? now] olan PR'lar
  const deltaMap = useMemo(() => {
    const map = new Map<string, PR[]>();
    for (const svc of allServices) {
      // repoName tanımsızsa hangi PR'ın bu servise ait olduğu bilinemez
      if (!svc.repoName) { map.set(svc.id, []); continue; }
      // prod tarihi yoksa baseline yok
      if (!svc.lastProdReleaseDate) { map.set(svc.id, []); continue; }
      const from = new Date(svc.lastProdReleaseDate).getTime();
      const to = svc.lastPrepReleaseDate
        ? new Date(svc.lastPrepReleaseDate).getTime()
        : Date.now();
      const repoLower = svc.repoName.toLowerCase();
      const filtered = prsRaw.filter(pr =>
        pr.status === 'completed' &&
        (pr.repository?.name ?? '').toLowerCase() === repoLower &&
        // master / main branch hedef — targetRefName yoksa tüm branch'ler kabul
        (!pr.targetRefName ||
          pr.targetRefName === 'refs/heads/master' ||
          pr.targetRefName === 'refs/heads/main') &&
        !!pr.closedDate &&
        new Date(pr.closedDate).getTime() > from &&
        new Date(pr.closedDate).getTime() <= to,
      );
      map.set(svc.id, filtered);
    }
    return map;
  }, [prsRaw, allServices]);

  // deltaMap'teki PR'lardan work item ID'lerini toplaıp üst bileşene bildir
  useEffect(() => {
    const allPrs = [...deltaMap.values()].flat();
    const unique = [...new Map(allPrs.map(p => [p.pullRequestId, p])).values()];
    if (onDeltaPrsCollected) onDeltaPrsCollected(unique);
    if (!onWorkItemsCollected) return;
    const ids = unique
      .flatMap(pr => (pr.workItemRefs ?? []).map(r => Number(r.id)))
      .filter(n => !isNaN(n) && n > 0);
    onWorkItemsCollected([...new Set(ids)]);
  }, [deltaMap, onDeltaPrsCollected, onWorkItemsCollected]);

  const allSvcCount = useMemo(() => {
    if (!product) return 0;
    const fromMods = (product.moduleGroups ?? []).flatMap(g => g.modules.flatMap(m => m.services));
    const modSvcIds = new Set(fromMods.map(s => s.id));
    return fromMods.length + (product.services ?? []).filter(s => !modSvcIds.has(s.id)).length;
  }, [product]);

  const sectionStatus: StatusKind = !product ? 'empty' : allSvcCount === 0 ? 'empty' : 'ok';

  return (
    <SectionShell icon="📦" title="Servis Versiyonları (BoM)"
      status={sectionStatus}
      statusNote={allSvcCount > 0 ? `${allSvcCount} servis` : ''}
      collapsed={collapsed} onToggle={onToggle}
      headerAction={
        <Tooltip title="Tüm servislerin Prep release bilgisini Azure'dan güncelle">
          <span>
            <IconButton
              size="small"
              onClick={() => batchRefreshMut.mutate()}
              disabled={batchRefreshMut.isPending}
            >
              {batchRefreshMut.isPending ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>
      }>
      {isLoading && (
        <Box>
          <Skeleton variant="rectangular" height={40} sx={{ mb: 1 }} />
          <Skeleton variant="rectangular" height={40} sx={{ mb: 1 }} />
          <Skeleton variant="rectangular" height={40} />
        </Box>
      )}
      {!isLoading && allSvcCount === 0 && (
        <Alert severity="info">Bu ürün için modül veya servis tanımlı değil — Ürün Kataloğu'ndan ekleyin.</Alert>
      )}
      {!isLoading && product && allSvcCount > 0 && (
        <>
          {(product.moduleGroups ?? []).map(group => (
            <Accordion key={group.id} defaultExpanded sx={{ mb: 1, '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: 'primary.50', minHeight: 40 }}>
                <Typography variant="body2" fontWeight={700}>{group.name}</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                {group.modules.map(mod => (
                  <Box key={mod.id} sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary"
                      sx={{ px: 2, py: 0.5, display: 'block', bgcolor: 'grey.50', fontWeight: 600 }}>
                      {mod.name}
                    </Typography>
                    {mod.services.length === 0
                      ? <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 1, display: 'block' }}>Servis yok</Typography>
                      : <ServiceTable services={mod.services} deltaMap={deltaMap} isDeltaLoading={isDeltaLoading} productId={productId} />}
                  </Box>
                ))}
              </AccordionDetails>
            </Accordion>
          ))}
          {(() => {
            const grouped = new Set((product.moduleGroups ?? []).flatMap(g => g.modules.flatMap(m => m.services.map(s => s.id))));
            const ungrouped = (product.services ?? []).filter(s => !grouped.has(s.id));
            if (!ungrouped.length) return null;
            return (
              <Accordion defaultExpanded sx={{ '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: 'grey.100' }}>
                  <Typography variant="body2" fontWeight={700}>Gruplandırılmamış Servisler</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}><ServiceTable services={ungrouped} deltaMap={deltaMap} isDeltaLoading={isDeltaLoading} productId={productId} /></AccordionDetails>
              </Accordion>
            );
          })()}
        </>
      )}
    </SectionShell>
  );
}

// ─── SECTION 2 — Pull Requests ────────────────────────────────────────────────

function PrSection({ productId, pmType, deltaPRs, collapsed, onToggle, onWorkItemsCollected, onWiToRepoCollected }: {
  productId: string; pmType?: string | null;
  deltaPRs?: PR[];          // BoM'dan gelen filtreli PR listesi (master, prod–prep arası)
  collapsed: boolean; onToggle: () => void; onWorkItemsCollected: (ids: number[]) => void;
  onWiToRepoCollected?: (map: Map<number, string>) => void;
}) {
  const isAzure = pmType === 'AZURE';

  // Verinin kaynağı: deltaPRs varsa BoM'daki filtreden gelenler, yoksa raw (fallback)
  const { data: rawPRs = [], isLoading: isRawLoading, isError, refetch } = useQuery<PR[]>({
    queryKey: ['prs-v3', productId],
    queryFn: () => apiClient.get(`/tfs/pull-requests?productId=${productId}`)
      .then(r => { const d = r.data.data ?? r.data; return d.value ?? (Array.isArray(d) ? d : []); }),
    enabled: !!productId && isAzure && !deltaPRs,  // deltaPRs varsa Azure'a istek atmaz
    staleTime: 0, retry: 1,
  });

  // deltaPRs prop'u varsa onu kullan; yoksa raw listeden fallback
  const prs = deltaPRs ?? rawPRs;
  const isLoading = !deltaPRs && isRawLoading;

  useEffect(() => {
    const ids = prs.flatMap(pr => (pr.workItemRefs ?? []).map(r => Number(r.id)).filter(n => !isNaN(n)));
    onWorkItemsCollected([...new Set(ids)]);
    if (onWiToRepoCollected) {
      const map = new Map<number, string>();
      prs.forEach(pr => {
        const repo = pr.repository?.name ?? '';
        if (!repo) return;
        (pr.workItemRefs ?? []).forEach(r => {
          const id = Number(r.id);
          if (!isNaN(id)) map.set(id, repo);
        });
      });
      onWiToRepoCollected(map);
    }
  }, [prs, onWorkItemsCollected, onWiToRepoCollected]);

  const grouped = useMemo(() => {
    const map: Record<string, PR[]> = {};
    prs.forEach(pr => {
      const repo = pr.repository?.name ?? 'Bilinmeyen Repo';
      (map[repo] = map[repo] ?? []).push(pr);
    });
    return map;
  }, [prs]);

  const openCount = prs.filter(p => p.status === 'active').length;
  const mergedCount = prs.filter(p => p.status === 'completed').length;
  const abandonedCount = prs.filter(p => p.status === 'abandoned').length;
  const sectionStatus: StatusKind = !isAzure ? 'empty' : abandonedCount > 0 ? 'error' : openCount > 0 ? 'warn' : prs.length > 0 ? 'ok' : 'empty';

  return (
    <SectionShell icon="🔀" title="Pull Requests" status={sectionStatus}
      statusNote={isAzure && prs.length > 0 ? `Prod→Prep delta: ${prs.length} PR  Açık: ${openCount}  Merged: ${mergedCount}` : ''}
      collapsed={collapsed} onToggle={onToggle}>
      {!isAzure && (
        <Alert severity="info">Bu ürün için Azure DevOps yapılandırılmamış. Ürün Kataloğu'ndan yapılandırın.</Alert>
      )}
      {isAzure && isLoading && (
        <Box>
          <Skeleton variant="rectangular" height={40} sx={{ mb: 1 }} />
          <Skeleton variant="rectangular" height={40} sx={{ mb: 1 }} />
          <Skeleton variant="rectangular" height={40} />
        </Box>
      )}
      {isAzure && isError && !isLoading && (
        <Alert severity="error" action={<Button size="small" onClick={() => refetch()}>Yenile</Button>}>
          TFS API'ye ulaşılamadı.
        </Alert>
      )}
      {isAzure && !isLoading && !isError && prs.length === 0 && (
        <Typography color="text.secondary" variant="body2">
          {deltaPRs !== undefined
            ? 'Bu aralıkta (Prod → Prep) master’a merge edilmiş PR bulunamadı.'
            : 'PR bulunamadı.'}
        </Typography>
      )}
      {isAzure && !isLoading && !isError && Object.entries(grouped).map(([repo, repoPRs]) => {
        const repoOpen = repoPRs.filter(p => p.status === 'active').length;
        return (
          <Accordion key={repo} defaultExpanded sx={{ mb: 1, '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: 'grey.50' }}>
              <Typography variant="body2" fontWeight={600}>
                📁 {repo} &nbsp;
                <Typography component="span" variant="caption" color="text.secondary">
                  ({repoPRs.length} PR — {repoOpen} açık) {repoOpen > 0 ? '⚠️' : '✅'}
                </Typography>
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <Table size="small">
                <TableBody>
                  {repoPRs.map(pr => {
                    const prUrl = pr._links?.web?.href
                      ?? (pr.repository?.webUrl ? `${pr.repository.webUrl}/pullrequest/${pr.pullRequestId}` : undefined);
                    return (
                      <TableRow key={pr.pullRequestId} hover>
                        <TableCell sx={{ width: 90 }}>
                          <Chip
                            label={pr.status === 'active' ? 'OPEN' : pr.status === 'completed' ? 'MERGED' : 'ABANDON'}
                            size="small" color={prStatusColor(pr.status)} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {pr.title}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                            {pr.sourceBranch?.replace('refs/heads/', '') ?? '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">{fmtDate(pr.creationDate)}</Typography>
                        </TableCell>
                        <TableCell sx={{ width: 40 }}>
                          {prUrl && (
                            <Tooltip title="Azure DevOps'ta aç">
                              <IconButton size="small" href={prUrl} target="_blank" rel="noopener">
                                <OpenInNewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </SectionShell>
  );
}

// ─── SECTION 3 — Work Items ───────────────────────────────────────────────────

function WorkItemsSection({ productId, pmType, workItemIds, wiToRepo, collapsed, onToggle }: {
  productId: string; pmType?: string | null; workItemIds: number[];
  wiToRepo: Map<number, string>;
  collapsed: boolean; onToggle: () => void;
}) {
  const isAzure = pmType === 'AZURE';
  const hasIds = workItemIds.length > 0;

  const { data: items = [], isLoading, isError, refetch } = useQuery<WorkItem[]>({
    queryKey: ['work-items-v3', productId, workItemIds.join(',')],
    queryFn: () => apiClient.get(`/tfs/work-items?ids=${workItemIds.join(',')}&productId=${productId}`)
      .then(r => { const d = r.data.data ?? r.data; return d.value ?? (Array.isArray(d) ? d : []); }),
    enabled: !!productId && isAzure && hasIds,
    staleTime: 60_000, retry: 1,
  });

  const doneCount = items.filter(w => ['Done', 'Closed', 'Resolved'].includes(w.fields['System.State'] ?? '')).length;
  const inProgressCount = items.length - doneCount;
  const sectionStatus: StatusKind = !isAzure || !hasIds ? 'empty' : inProgressCount > 0 ? 'warn' : items.length > 0 ? 'ok' : 'empty';

  return (
    <SectionShell icon="📋" title="Work Items" status={sectionStatus}
      statusNote={hasIds && items.length > 0 ? `Toplam: ${items.length}  Done: ${doneCount}  In Progress: ${inProgressCount}` : ''}
      collapsed={collapsed} onToggle={onToggle}>
      {!isAzure && <Alert severity="info">Azure DevOps yapılandırılmamış.</Alert>}
      {isAzure && !hasIds && <Typography color="text.secondary" variant="body2">PR'lardan work item bulunamadı.</Typography>}
      {isAzure && hasIds && isLoading && (
        <Box>
          <Skeleton variant="rectangular" height={40} sx={{ mb: 1 }} />
          <Skeleton variant="rectangular" height={40} />
        </Box>
      )}
      {isAzure && hasIds && isError && !isLoading && (
        <Alert severity="error" action={<Button size="small" onClick={() => refetch()}>Yenile</Button>}>
          Work item'lar yüklenemedi.
        </Alert>
      )}
      {isAzure && hasIds && !isLoading && !isError && (
        items.length === 0
          ? <Typography color="text.secondary" variant="body2">Work item bulunamadı.</Typography>
          : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Başlık</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Tür</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Durum</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Kaynak Servis</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Atanan</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map(wi => {
                  const type = wi.fields['System.WorkItemType'];
                  const state = wi.fields['System.State'];
                  const wiUrl = wi.url?.replace('_apis/wit/workItems', '_workitems/edit').split('?')[0];
                  const sourceRepo = wiToRepo.get(wi.id);
                  return (
                    <TableRow key={wi.id} hover>
                      <TableCell>
                        <Link href={wiUrl ?? '#'} target="_blank" rel="noopener" variant="body2">#{wi.id}</Link>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {wi.fields['System.Title'] ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell><Chip label={type ?? '—'} size="small" color={wiTypeColor(type)} /></TableCell>
                      <TableCell><Chip label={state ?? '—'} size="small" color={wiStateColor(state)} /></TableCell>
                      <TableCell>
                        {sourceRepo
                          ? <Chip label={sourceRepo} size="small" variant="outlined" sx={{ maxWidth: 160, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }} />
                          : <Typography variant="caption" color="text.disabled">—</Typography>}
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {assignedName(wi.fields['System.AssignedTo'])}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )
      )}
    </SectionShell>
  );
}

// ─── SECTION 4 — Release Notes ────────────────────────────────────────────────

function ReleaseNotesSection({ versionId, productId, workItemIds, collapsed, onToggle }: {
  versionId: string; productId: string; workItemIds: number[];
  collapsed: boolean; onToggle: () => void;
}) {
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({
    open: false, msg: '', severity: 'success',
  });

  const { data: notes = [], isLoading, isError, refetch } = useQuery<ReleaseNote[]>({
    queryKey: ['release-notes-v3', versionId],
    queryFn: () => apiClient.get(`/release-notes?versionId=${versionId}`).then(r => r.data.data),
    enabled: !!versionId, staleTime: 60_000,
  });

  // work item ID'leri için zaten release note var mı?
  const coveredWorkItemIds = useMemo(
    () => new Set(notes.map(n => n.workitemId ? Number(n.workitemId) : null).filter((n): n is number => n !== null && !isNaN(n))),
    [notes],
  );
  const missingIds = useMemo(
    () => workItemIds.filter(id => !coveredWorkItemIds.has(id)),
    [workItemIds, coveredWorkItemIds],
  );

  const generateMutation = useMutation({
    mutationFn: () =>
      apiClient.post('/release-notes/trigger-generation', {
        versionId,
        productId,
        workItemIds: missingIds,
      }),
    onSuccess: (data) => {
      const msg = data.data?.data?.message ?? 'Release note üretimi başlatıldı.';
      setToast({ open: true, msg, severity: 'success' });
      // 5 saniye sonra yenile (n8n hızlıysa notlar gelmiş olabilir)
      setTimeout(() => qc.invalidateQueries({ queryKey: ['release-notes-v3', versionId] }), 5000);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Release note üretimi başlatılamadı.';
      setToast({ open: true, msg, severity: 'error' });
    },
  });

  const withNote = notes.filter(n => n.description?.trim());
  const sectionStatus: StatusKind = notes.length === 0 ? 'empty' : withNote.length < notes.length ? 'warn' : 'ok';
  const canGenerate = missingIds.length > 0 && !generateMutation.isPending;

  return (
    <>
    <SectionShell icon="📝" title="Release Notes" status={sectionStatus}
      statusNote={notes.length > 0 ? `Hazır: ${withNote.length}/${notes.length}  Eksik: ${notes.length - withNote.length}` : ''}
      collapsed={collapsed} onToggle={onToggle}
      headerAction={
        workItemIds.length > 0 && (
          <Tooltip title={missingIds.length === 0 ? 'Tüm work item\'lar için release note mevcut' : `${missingIds.length} work item için AI release note üret`}>
            <span>
              <Button
                size="small" variant="outlined" color="secondary"
                disabled={!canGenerate}
                onClick={(e) => { e.stopPropagation(); generateMutation.mutate(); }}
                startIcon={generateMutation.isPending ? <CircularProgress size={14} /> : undefined}
                sx={{ mr: 1, whiteSpace: 'nowrap' }}
              >
                {generateMutation.isPending
                  ? 'Üretiliyor…'
                  : missingIds.length > 0
                    ? `Release Notları Üret (${missingIds.length})`
                    : '✅ Release Notlar Tam'}
              </Button>
            </span>
          </Tooltip>
        )
      }>
      {isLoading && <Skeleton variant="rectangular" height={120} />}
      {isError && !isLoading && (
        <Alert severity="error" action={<Button size="small" onClick={() => refetch()}>Yenile</Button>}>Yüklenemedi.</Alert>
      )}
      {!isLoading && !isError && notes.length === 0 && (
        <Typography color="text.secondary" variant="body2">Bu versiyon için henüz release note girilmemiş.</Typography>
      )}
      {!isLoading && !isError && notes.length > 0 && (
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 600 }}>WI ID</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Kategori</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Başlık</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Durum</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Özet</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {notes.flatMap(note => {
              const hasContent = Boolean(note.description?.trim());
              const isExp = expandedId === note.id;
              const rows: React.ReactElement[] = [
                <TableRow key={note.id} hover
                  onClick={() => hasContent && setExpandedId(isExp ? null : note.id)}
                  sx={{ cursor: hasContent ? 'pointer' : 'default' }}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {note.workitemId
                      ? <Chip label={`#${note.workitemId}`} size="small" variant="outlined" />
                      : <Typography variant="caption" color="text.disabled">—</Typography>}
                  </TableCell>
                  <TableCell><Chip label={note.category} size="small" color={note.isBreaking ? 'error' : 'default'} /></TableCell>
                  <TableCell><Typography variant="body2">{note.title}</Typography></TableCell>
                  <TableCell>
                    <Chip label={hasContent ? '✅ Hazır' : '❌ Eksik'} size="small" color={hasContent ? 'success' : 'error'} />
                  </TableCell>
                  <TableCell>
                    {hasContent && !isExp && (
                      <Typography variant="caption" color="text.secondary">
                        {note.description!.slice(0, 80)}{note.description!.length > 80 ? '…' : ''}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>,
              ];
              if (isExp && hasContent) {
                rows.push(
                  <TableRow key={`${note.id}-exp`}>
                    <TableCell colSpan={5} sx={{ bgcolor: 'grey.50', pb: 2 }}>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{note.description}</Typography>
                    </TableCell>
                  </TableRow>
                );
              }
              return rows;
            })}
          </TableBody>
        </Table>
      )}
    </SectionShell>
    <Snackbar
      open={toast.open}
      autoHideDuration={8000}
      onClose={() => setToast(t => ({ ...t, open: false }))}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert severity={toast.severity} onClose={() => setToast(t => ({ ...t, open: false }))}>
        {toast.msg}
      </Alert>
    </Snackbar>
    </>
  );
}

// ─── SECTION 5 — Sistem Değişiklikleri ───────────────────────────────────────

function SystemChangesSection({ versionId, collapsed, onToggle }: {
  versionId: string; collapsed: boolean; onToggle: () => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: changes = [], isLoading, isError, refetch } = useQuery<SystemChange[]>({
    queryKey: ['system-changes-v3', versionId],
    queryFn: () => apiClient.get(`/system-changes?versionId=${versionId}`).then(r => r.data.data),
    enabled: !!versionId, staleTime: 60_000,
  });

  const breaking = changes.filter(c => c.isBreaking);
  const normal = changes.filter(c => !c.isBreaking);
  const sectionStatus: StatusKind = changes.length === 0 ? 'empty' : breaking.length > 0 ? 'error' : 'warn';

  function ChangeCard({ c }: { c: SystemChange }) {
    const isExp = expandedId === c.id;
    return (
      <Paper variant="outlined" onClick={() => setExpandedId(isExp ? null : c.id)}
        sx={{ mb: 1.5, p: 1.5, bgcolor: c.isBreaking ? 'error.50' : 'background.paper', cursor: 'pointer' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Chip label={c.isBreaking ? '⚡ BREAKING' : '✅ Normal'} size="small" color={c.isBreaking ? 'error' : 'success'} />
          <Typography variant="body2" fontWeight={600}>{c.title}</Typography>
          {c.apiPath && (
            <Typography variant="caption" fontFamily="monospace" color="text.secondary">{c.apiPath}</Typography>
          )}
          <Typography variant="caption" color="primary" sx={{ ml: 'auto' }}>{isExp ? '▲ Daralt' : '▼ Detay'}</Typography>
        </Box>
        {c.description && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>{c.description}</Typography>
        )}
        {isExp && (c.previousValue || c.newValue) && (
          <Box sx={{ mt: 1.5, fontFamily: 'monospace', fontSize: 12, bgcolor: 'grey.900', color: 'grey.100', borderRadius: 1, p: 1.5 }}>
            {c.previousValue?.split('\n').map((line, i) => (
              <Box key={`p${i}`} sx={{ color: 'error.light' }}>- {line}</Box>
            ))}
            {c.newValue?.split('\n').map((line, i) => (
              <Box key={`n${i}`} sx={{ color: 'success.light' }}>+ {line}</Box>
            ))}
          </Box>
        )}
      </Paper>
    );
  }

  return (
    <SectionShell icon="⚡" title="Sistem Değişiklikleri" status={sectionStatus}
      statusNote={changes.length > 0 ? `Breaking: ${breaking.length}  Normal: ${normal.length}` : ''}
      collapsed={collapsed} onToggle={onToggle}>
      {isLoading && <Skeleton variant="rectangular" height={100} />}
      {isError && !isLoading && (
        <Alert severity="error" action={<Button size="small" onClick={() => refetch()}>Yenile</Button>}>
          Sistem değişiklikleri yüklenemedi.
        </Alert>
      )}
      {!isLoading && !isError && changes.length === 0 && (
        <Typography color="text.secondary" variant="body2">Bu versiyon için kayıtlı sistem değişikliği yok.</Typography>
      )}
      {!isLoading && !isError && breaking.length > 0 && (
        <>
          <Typography variant="caption" color="error.main" fontWeight={700} sx={{ mb: 1, display: 'block' }}>
            ⚡ BREAKING CHANGES
          </Typography>
          {breaking.map(c => <ChangeCard key={c.id} c={c} />)}
          {normal.length > 0 && <Divider sx={{ my: 2 }} />}
        </>
      )}
      {!isLoading && !isError && normal.length > 0 && (
        <>
          {breaking.length > 0 && (
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ mb: 1, display: 'block' }}>
              Normal Değişiklikler
            </Typography>
          )}
          {normal.map(c => <ChangeCard key={c.id} c={c} />)}
        </>
      )}
    </SectionShell>
  );
}

// ─── SECTION 6 — Release Todos ────────────────────────────────────────────────

const TIMING_LABELS: Record<string, string> = {
  PRE: '── GEÇİŞ ÖNCESİ', DURING: '── GEÇİŞ ANINDA', POST: '── GEÇİŞ SONRASI',
};

function TodosSection({ versionId, collapsed, onToggle, onStatsChange }: {
  versionId: string; collapsed: boolean; onToggle: () => void; onStatsChange: (n: number) => void;
}) {
  const { data: todos = [], isLoading, isError, refetch } = useQuery<ReleaseTodo[]>({
    queryKey: ['todos-v3', versionId],
    queryFn: () => apiClient.get(`/release-todos?versionId=${versionId}`).then(r => r.data.data),
    enabled: !!versionId, staleTime: 0,
  });

  const incompleteP0 = useMemo(() => todos.filter(t => t.priority === 'P0' && !t.isCompleted), [todos]);

  useEffect(() => { onStatsChange(incompleteP0.length); }, [incompleteP0.length, onStatsChange]);

  const sectionStatus: StatusKind = todos.length === 0 ? 'empty' : incompleteP0.length > 0 ? 'error' : 'ok';
  const grouped: Record<string, ReleaseTodo[]> = {};
  todos.forEach(t => { (grouped[t.timing] = grouped[t.timing] ?? []).push(t); });

  return (
    <SectionShell icon="☑" title="Release Todos" status={sectionStatus}
      statusNote={todos.length > 0 ? `Toplam: ${todos.length}  P0 Eksik: ${incompleteP0.length}` : ''}
      collapsed={collapsed} onToggle={onToggle}>
      {isLoading && <Skeleton variant="rectangular" height={100} />}
      {isError && !isLoading && (
        <Alert severity="error" action={<Button size="small" onClick={() => refetch()}>Yenile</Button>}>
          Todo'lar yüklenemedi.
        </Alert>
      )}
      {!isLoading && !isError && todos.length === 0 && (
        <Typography color="text.secondary" variant="body2">
          Bu versiyon için todo tanımlı değil — Releases sayfasından ekleyin.
        </Typography>
      )}
      {!isLoading && !isError && todos.length > 0 && (
        <>
          {(['PRE', 'DURING', 'POST'] as const).map(timing => {
            const group = grouped[timing] ?? [];
            if (!group.length) return null;
            return (
              <Box key={timing} sx={{ mb: 2 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary"
                  sx={{ display: 'block', mb: 1, letterSpacing: 1 }}>
                  {TIMING_LABELS[timing]}
                </Typography>
                {group.map(todo => (
                  <Box key={todo.id} sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5, py: 0.75, px: 1, borderRadius: 1, mb: 0.5,
                    bgcolor: todo.priority === 'P0' ? 'error.50' : 'transparent',
                    '&:hover': { bgcolor: todo.priority === 'P0' ? 'error.100' : 'grey.50' },
                  }}>
                    <Chip label={todo.priority} size="small" color={priorityColor(todo.priority)} />
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {todo.title}
                    </Typography>
                    {todo.category && (
                      <Typography variant="caption" color="text.secondary">{todo.category}</Typography>
                    )}
                  </Box>
                ))}
              </Box>
            );
          })}

        </>
      )}
    </SectionShell>
  );
}

// ─── Approve Dialog (2-step: Health Summary → Package Options) ────────────────

const PACKAGE_TYPE_LABELS: Record<string, string> = {
  HELM_CHART: 'HelmChart (.tgz)',
  DOCKER_IMAGE: 'Docker Image',
  BINARY: 'Binary / DLL Paketi (.zip)',
  GIT_ARCHIVE: 'Git Archive',
};

function ApproveDialog({ open, onClose, versionLabel, healthScore, openPRCount, p0TodoCount, breakingCount, serviceCount, onConfirm, isPending, error }: {
  open: boolean; onClose: () => void; versionLabel: string; healthScore: number;
  openPRCount: number; p0TodoCount: number; breakingCount: number; serviceCount: number;
  onConfirm: (packageOptions?: { createPackage: boolean; packageType?: string; packageName?: string }) => void;
  isPending: boolean; error?: string | null;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [createPackage, setCreatePackage] = useState(false);
  const [packageType, setPackageType] = useState('HELM_CHART');
  const [packageName, setPackageName] = useState('');

  // Reset on open
  useEffect(() => {
    if (open) { setStep(1); setCreatePackage(false); setPackageType('HELM_CHART'); setPackageName(''); }
  }, [open]);

  const rows = [
    { icon: openPRCount === 0 ? '✅' : '⚠️', label: "PR'lar", value: openPRCount === 0 ? 'Tümü merged' : `${openPRCount} açık PR var` },
    { icon: p0TodoCount === 0 ? '✅' : '❌', label: "P0 Todo'lar", value: p0TodoCount === 0 ? 'Tümü tamamlandı' : `${p0TodoCount} eksik` },
    { icon: breakingCount === 0 ? '✅' : '⚠️', label: 'Breaking Change', value: breakingCount === 0 ? 'Yok' : `${breakingCount} adet` },
    { icon: healthScore >= 80 ? '✅' : '⚠️', label: 'Sağlık Skoru', value: `${healthScore} / 100` },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {step === 1 ? `🚀 Release Onayla — ${versionLabel}` : `📦 Paket Oluştur — ${versionLabel}`}
      </DialogTitle>
      <DialogContent>
        {step === 1 ? (
          <>
            <Typography variant="body2" color="text.secondary" gutterBottom>Son durum özeti:</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, my: 1.5 }}>
              {rows.map(row => (
                <Box key={row.label} sx={{ display: 'flex', gap: 1 }}>
                  <Typography>{row.icon}</Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ minWidth: 120 }}>{row.label}</Typography>
                  <Typography variant="body2" color="text.secondary">{row.value}</Typography>
                </Box>
              ))}
            </Box>
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ bgcolor: 'primary.50', borderRadius: 1, p: 1.5, mb: 1.5 }}>
              <Typography variant="body2" fontWeight={600} gutterBottom>📸 Servis Release Snapshot</Typography>
              <Typography variant="caption" color="text.secondary">
                Bu işlem aynı zamanda {serviceCount > 0 ? `${serviceCount} servisin` : 'ürünün tüm servislerinin'} mevcut
                PR listesini kaydeder. Bir sonraki versiyonda PR delta bu noktadan hesaplanacak.
              </Typography>
            </Box>
            {healthScore < 100 && (
              <Alert severity="warning" sx={{ mb: 1.5 }}>
                ⚠️ Sağlık skoru <strong>{healthScore}/100</strong> — ideal koşullar sağlanmamış. Yine de devam etmek sizin sorumluluğunuzdadır.
              </Alert>
            )}
            <Typography variant="caption" color="text.secondary">
              Bu işlem versiyonun fazını PROD'a taşır ve releaseDate'i bugünün tarihi olarak kaydeder.{' '}
              <strong>Geri alınamaz.</strong>
            </Typography>
          </>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Müşterilere dağıtılacak bir paket oluşturmak ister misiniz?
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 2 }}>
              <Button
                variant={createPackage ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setCreatePackage(true)}
              >
                Evet, Paket Oluştur
              </Button>
              <Button
                variant={!createPackage ? 'contained' : 'outlined'}
                size="small"
                color="inherit"
                onClick={() => setCreatePackage(false)}
              >
                Hayır, Sadece Yayınla
              </Button>
            </Box>
            {createPackage && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Paket Tipi</InputLabel>
                  <Select value={packageType} label="Paket Tipi" onChange={e => setPackageType(e.target.value)}>
                    {Object.entries(PACKAGE_TYPE_LABELS).map(([key, label]) => (
                      <MenuItem key={key} value={key}>{label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Paket adı boş bırakılırsa versiyon adından otomatik oluşturulur.
                  </Typography>
                  <input
                    type="text"
                    placeholder={`örn: ${versionLabel.replace(/\s/g, '-').toLowerCase()}`}
                    value={packageName}
                    onChange={e => setPackageName(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 12px', marginTop: 4,
                      border: '1px solid #ccc', borderRadius: 4, fontSize: 14,
                    }}
                  />
                </Box>
              </Box>
            )}
          </>
        )}
        {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        {step === 1 ? (
          <>
            <Button onClick={onClose} disabled={isPending}>İptal</Button>
            <Button variant="contained" color="success" onClick={() => setStep(2)}>
              Devam →
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => setStep(1)} disabled={isPending}>← Geri</Button>
            <Button onClick={onClose} disabled={isPending}>İptal</Button>
            <Button variant="contained" color="success" disabled={isPending}
              onClick={() => onConfirm(createPackage ? { createPackage: true, packageType, packageName: packageName || undefined } : undefined)}
            >
              {isPending ? 'Onaylanıyor...' : 'Evet, Yayınla →'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function ReleaseHealthCheckPage() {
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedVersion, setSelectedVersion] = useState('');
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    bom: false, prs: false, workItems: false, releaseNotes: false, systemChanges: false, todos: false,
  });
  const [bomWorkItemIds, setBomWorkItemIds] = useState<number[]>([]);
  const [prWorkItemIds, setPrWorkItemIds] = useState<number[]>([]);
  const [deltaPRs, setDeltaPRs] = useState<PR[]>([]);
  const [wiToRepo, setWiToRepo] = useState<Map<number, string>>(new Map());
  const collectedWorkItemIds = useMemo(
    () => [...new Set([...bomWorkItemIds, ...prWorkItemIds])],
    [bomWorkItemIds, prWorkItemIds],
  );
  const [incompleteP0Count, setIncompleteP0Count] = useState(0);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => apiClient.get('/products').then(r => r.data.data),
    staleTime: 60_000,
  });

  const selectedProductObj = products.find(p => p.id === selectedProduct);

  const { data: versions = [] } = useQuery<Version[]>({
    queryKey: ['product-versions', selectedProduct],
    queryFn: () => apiClient.get(`/product-versions?productId=${selectedProduct}`).then(r => r.data.data),
    enabled: !!selectedProduct, staleTime: 30_000,
  });

  const selectableVersions = useMemo(() =>
    versions.filter(v => v.phase !== 'PRODUCTION' && v.phase !== 'ARCHIVED'),
    [versions]
  );

  const selectedVerObj = versions.find(v => v.id === selectedVersion);
  const enabled = !!selectedVersion;

  const { data: prsForScore = [], isLoading: isPrsLoading } = useQuery<PR[]>({
    queryKey: ['prs-v3', selectedProduct],
    queryFn: () => apiClient.get(`/tfs/pull-requests?productId=${selectedProduct}`)
      .then(r => { const d = r.data.data ?? r.data; return d.value ?? (Array.isArray(d) ? d : []); }),
    enabled: !!selectedProduct && selectedProductObj?.pmType === 'AZURE',
    staleTime: 0, retry: 1,
  });

  const { data: changesForScore = [], isLoading: isChangesLoading } = useQuery<SystemChange[]>({
    queryKey: ['system-changes-v3', selectedVersion],
    queryFn: () => apiClient.get(`/system-changes?versionId=${selectedVersion}`).then(r => r.data.data),
    enabled, staleTime: 60_000,
  });

  const { data: productDetail } = useQuery<ProductDetail>({
    queryKey: ['product-detail', selectedProduct],
    queryFn: () => apiClient.get(`/products/${selectedProduct}`).then(r => r.data.data),
    enabled: !!selectedProduct,
    staleTime: 60_000,
  });

  const serviceCount = useMemo(() => {
    if (!productDetail) return 0;
    const fromMods = (productDetail.moduleGroups ?? []).flatMap(g => g.modules.flatMap(m => m.services));
    const modSvcIds = new Set(fromMods.map(s => s.id));
    return fromMods.length + (productDetail.services ?? []).filter(s => !modSvcIds.has(s.id)).length;
  }, [productDetail]);

  const openPRs = useMemo(() => {
    // Skor için: hem active hem preProdDate filtresini uygula
    const preProdDate = selectedVerObj?.preProdDate;
    const relevant = preProdDate
      ? prsForScore.filter(p => p.creationDate ? new Date(p.creationDate).getTime() > new Date(preProdDate).getTime() : true)
      : prsForScore;
    return relevant.filter(p => p.status === 'active');
  }, [prsForScore, selectedVerObj?.preProdDate]);
  const breakingChanges = useMemo(() => changesForScore.filter(c => c.isBreaking), [changesForScore]);

  const healthScore = useMemo(() => {
    if (!enabled) return 100;
    let score = 100;
    score -= openPRs.length * 3;
    score -= incompleteP0Count * 5;
    score -= breakingChanges.length * 10;
    return Math.max(0, score);
  }, [openPRs.length, incompleteP0Count, breakingChanges.length, enabled]);

  const canRelease = healthScore >= 80 && openPRs.length === 0 && incompleteP0Count === 0;

  const approveMutation = useMutation({
    mutationFn: (opts?: { createPackage: boolean; packageType?: string; packageName?: string }) =>
      apiClient.patch(`/product-versions/${selectedVersion}/release`).then(async (releaseRes) => {
        // Background: snapshot
        const capturedProductId = selectedProduct;
        const capturedVersionId = selectedVersion;
        apiClient
          .post('/service-release-snapshots', { productId: capturedProductId, productVersionId: capturedVersionId })
          .then(r => {
            const snap = r.data.data as { succeeded: string[]; failed: { serviceId: string }[] };
            queryClient.invalidateQueries({ queryKey: ['service-snapshots', capturedProductId] });
            if (snap.failed?.length > 0) {
              console.warn('[Snapshot] Kısmi hata:', snap.failed);
            }
          })
          .catch(err => console.warn('[Snapshot] Snapshot çağrısı başarısız:', err));

        // VersionPackage creation (if requested)
        if (opts?.createPackage && opts.packageType) {
          const verObj = versions.find(v => v.id === capturedVersionId);
          const prodObj = products.find(p => p.id === capturedProductId);
          const pkgName = opts.packageName || `${prodObj?.name ?? 'pkg'}-v${verObj?.version ?? '0'}`;
          await apiClient.post('/version-packages', {
            productVersionId: capturedVersionId,
            packageType: opts.packageType,
            name: pkgName,
            version: verObj?.version ?? '1.0.0',
            description: `Release package for ${prodObj?.name ?? ''} v${verObj?.version ?? ''}`,
            publishedBy: 'system',
          });
        }

        return releaseRes;
      }),
    onSuccess: () => {
      setApproveOpen(false);
      setApproveError(null);
      setToast('🎉 Versiyon başarıyla yayınlandı!');
      queryClient.invalidateQueries({ queryKey: ['product-versions', selectedProduct] });
      setSelectedVersion('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Bir hata oluştu.';
      setApproveError(msg);
    },
  });

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['prs-v3', selectedProduct] });
    queryClient.invalidateQueries({ queryKey: ['todos-v3', selectedVersion] });
    queryClient.invalidateQueries({ queryKey: ['system-changes-v3', selectedVersion] });
    queryClient.invalidateQueries({ queryKey: ['release-notes-v3', selectedVersion] });
    queryClient.invalidateQueries({ queryKey: ['product-detail', selectedProduct] });
    queryClient.invalidateQueries({ queryKey: ['work-items-v3', selectedProduct] });
    queryClient.invalidateQueries({ queryKey: ['service-snapshots', selectedProduct] });
    queryClient.invalidateQueries({ queryKey: ['release-delta', selectedProduct] });
  }, [queryClient, selectedProduct, selectedVersion]);

  const handleProductChange = (pid: string) => {
    setSelectedProduct(pid);
    setSelectedVersion('');
    setBomWorkItemIds([]);
    setPrWorkItemIds([]);
    setDeltaPRs([]);
    setWiToRepo(new Map());
  };

  const toggleSection = (key: string) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  const versionLabel = selectedVerObj
    ? `${selectedVerObj.product?.name ?? ''} v${selectedVerObj.version}`
    : '';

  return (
    <Box>
      {/* ── STICKY HEADER ── */}
      <Box sx={{
        position: 'sticky', top: 64, zIndex: 100,
        bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider',
        px: 3, py: 2, mb: 3,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="h5" fontWeight={700}>Release Health Check</Typography>
          <Tooltip title="Tüm verileri yenile">
            <span>
              <IconButton onClick={handleRefresh} disabled={!selectedProduct}><RefreshIcon /></IconButton>
            </span>
          </Tooltip>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: selectedVersion ? 2 : 0 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Ürün</InputLabel>
            <Select value={selectedProduct} label="Ürün" onChange={e => handleProductChange(e.target.value)}>
              {products.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 230 }} disabled={!selectedProduct}>
            <InputLabel>Versiyon</InputLabel>
            <Select value={selectedVersion} label="Versiyon"
              onChange={e => setSelectedVersion(e.target.value)}>
              {selectableVersions.length === 0 && (
                <MenuItem value="" disabled>Aktif versiyon yok (tümü PROD veya arşivde)</MenuItem>
              )}
              {selectableVersions.map(v => (
                <MenuItem key={v.id} value={v.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label={PHASE_META[v.phase]?.label ?? v.phase} size="small"
                      color={PHASE_META[v.phase]?.color ?? 'default'}
                      sx={{ height: 18, fontSize: 10 }} />
                    v{v.version}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {selectedVersion && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mt: 1 }}>
            <ScoreGauge score={healthScore} loading={enabled && (isPrsLoading || isChangesLoading)} />
            <Box sx={{ flexGrow: 1 }}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                {openPRs.length > 0 && (
                  <Chip icon={<WarningAmberIcon />} label={`${openPRs.length} açık PR`} color="warning" size="small" />
                )}
                {incompleteP0Count > 0 && (
                  <Chip icon={<CancelIcon />} label={`${incompleteP0Count} P0 todo`} color="error" size="small" />
                )}
                {breakingChanges.length > 0 && (
                  <Chip label={`${breakingChanges.length} breaking change`} color="error" variant="outlined" size="small" />
                )}
                {canRelease && <Chip label="✅ Yayına Hazır" color="success" size="small" />}
              </Box>
              <Typography variant="caption" color="text.secondary">
                Skor = 100 − ({openPRs.length}×3 PR) − ({incompleteP0Count}×5 P0 Todo) − ({breakingChanges.length}×10 Breaking)
                = <strong>{healthScore}</strong>
              </Typography>
            </Box>
            <Button variant="contained" color="success" size="large"
              onClick={() => { setApproveError(null); setApproveOpen(true); }}>
              Release Onayla ✅
            </Button>
          </Box>
        )}
      </Box>

      {/* ── Empty states ── */}
      {!selectedProduct && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">Bir ürün ve versiyon seçin</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Sağlık raporu görüntülemek için yukarıdan ürün seçin.
          </Typography>
        </Box>
      )}
      {selectedProduct && !selectedVersion && (
        <Alert severity="info" sx={{ mx: 3 }}>
          Sağlık raporunu görmek için PREP veya WAITING fazındaki bir versiyon seçin.
        </Alert>
      )}

      {/* ── 6 SECTIONS ── */}
      {selectedVersion && selectedProduct && (
        <Box>
          <BomSection
            productId={selectedProduct}
            collapsed={collapsed.bom}
            onToggle={() => toggleSection('bom')}
            onWorkItemsCollected={setBomWorkItemIds}
            onDeltaPrsCollected={setDeltaPRs}
          />
          <PrSection
            productId={selectedProduct}
            pmType={selectedProductObj?.pmType}
            deltaPRs={deltaPRs.length > 0 ? deltaPRs : undefined}
            collapsed={collapsed.prs}
            onToggle={() => toggleSection('prs')}
            onWorkItemsCollected={setPrWorkItemIds}
            onWiToRepoCollected={setWiToRepo}
          />
          <WorkItemsSection
            productId={selectedProduct}
            pmType={selectedProductObj?.pmType}
            workItemIds={collectedWorkItemIds}
            wiToRepo={wiToRepo}
            collapsed={collapsed.workItems}
            onToggle={() => toggleSection('workItems')}
          />
          <ReleaseNotesSection
            versionId={selectedVersion}
            productId={selectedProduct}
            workItemIds={collectedWorkItemIds}
            collapsed={collapsed.releaseNotes}
            onToggle={() => toggleSection('releaseNotes')}
          />
          <SystemChangesSection
            versionId={selectedVersion}
            collapsed={collapsed.systemChanges}
            onToggle={() => toggleSection('systemChanges')}
          />
          <TodosSection
            versionId={selectedVersion}
            collapsed={collapsed.todos}
            onToggle={() => toggleSection('todos')}
            onStatsChange={setIncompleteP0Count}
          />
        </Box>
      )}

      {/* ── Approve Dialog & Toast ── */}
      <ApproveDialog
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        versionLabel={versionLabel}
        healthScore={healthScore}
        openPRCount={openPRs.length}
        p0TodoCount={incompleteP0Count}
        breakingCount={breakingChanges.length}
        serviceCount={serviceCount}
        onConfirm={(packageOptions) => approveMutation.mutate(packageOptions)}
        isPending={approveMutation.isPending}
        error={approveError}
      />
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
