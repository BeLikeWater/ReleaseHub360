import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Chip, FormControl, InputLabel,
  Select, MenuItem, CircularProgress, Alert, Table, TableBody, TableCell,
  TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions,
  Accordion, AccordionSummary, AccordionDetails, Paper, Checkbox, Skeleton,
  Tooltip, IconButton, Link, Snackbar, Divider, Popover,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CancelIcon from '@mui/icons-material/Cancel';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { computePhase, phaseLabel } from '@/lib/versionPhase';

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
  currentVersion?: string | null; moduleId?: string | null;
  lastReleaseName?: string | null;
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

function ServiceTable({ services, deltaMap, isDeltaLoading }: {
  services: ServiceRow[];
  deltaMap: Map<string, PR[]>;
  isDeltaLoading: boolean;
}) {
  const [popover, setPopover] = useState<{ el: HTMLElement | null; items: { prId: number; title: string; mergeDate: string }[] }>({
    el: null, items: [],
  });

  return (
    <>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.50' }}>
            <TableCell sx={{ fontWeight: 600 }}>Servis</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Katalog Versiyonu</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Son Release</TableCell>
            <TableCell sx={{ fontWeight: 600 }}>Yeni PR'lar</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {services.map(svc => {
            const deltaItems = deltaMap.get(svc.id) ?? [];
            const deltaCount = deltaItems.length;
            return (
              <TableRow key={svc.id} hover>
                <TableCell>
                  <Chip label={svc.repoName || svc.name} size="small" color="primary" variant="outlined" />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">{svc.currentVersion || '—'}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color={svc.lastReleaseName ? 'text.secondary' : 'text.disabled'}>
                    {svc.lastReleaseName ?? '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  {isDeltaLoading ? (
                    <Chip label="Yükleniyor..." size="small" color="default" />
                  ) : !svc.currentVersion || !svc.lastReleaseName ? (
                    <Chip label="Baseline yok" size="small" color="default" />
                  ) : svc.currentVersion === svc.lastReleaseName ? (
                    <Chip label="Değişiklik yok" size="small" color="success" />
                  ) : deltaCount === 0 ? (
                    <Chip label="Delta yok" size="small" color="success" />
                  ) : (
                    <Chip
                      label={`${deltaCount} yeni PR`} size="small" color="primary"
                      onClick={e => setPopover({
                        el: e.currentTarget as HTMLElement,
                        items: deltaItems.map(pr => ({
                          prId: pr.pullRequestId,
                          title: pr.title,
                          mergeDate: pr.creationDate ?? '',
                        })),
                      })}
                      sx={{ cursor: 'pointer' }}
                    />
                  )}
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

function BomSection({ productId, collapsed, onToggle, onWorkItemsCollected }: {
  productId: string; collapsed: boolean; onToggle: () => void;
  onWorkItemsCollected?: (ids: number[]) => void;
}) {
  const { data: product, isLoading } = useQuery<ProductDetail>({
    queryKey: ['product-detail', productId],
    queryFn: () => apiClient.get(`/products/${productId}`).then(r => r.data.data),
    enabled: !!productId,
    staleTime: 60_000,
  });

  const { data: deltaResult, isLoading: isDeltaLoading } = useQuery<{ data: { serviceId: string; prs: PR[] }[]; authError?: string }>({
    queryKey: ['release-delta', productId],
    queryFn: () => apiClient.get(`/tfs/release-delta?productId=${productId}`).then(r => ({ data: r.data.data, authError: r.data.authError })),
    enabled: !!productId,
    staleTime: 60_000,
  });

  const deltaRaw = deltaResult?.data ?? [];
  const deltaAuthError = deltaResult?.authError;

  const deltaMap = useMemo(
    () => new Map(deltaRaw.map(d => [d.serviceId, d.prs])),
    [deltaRaw],
  );

  // Delta PR'lardan tüm benzersiz work item ID'lerini toplayıp üst bileşene bildir
  useEffect(() => {
    if (!onWorkItemsCollected) return;
    const ids = deltaRaw
      .flatMap(d => d.prs.flatMap(pr => (pr.workItemRefs ?? []).map(r => Number(r.id))))
      .filter(n => !isNaN(n) && n > 0);
    onWorkItemsCollected([...new Set(ids)]);
  }, [deltaRaw, onWorkItemsCollected]);

  const allSvcCount = useMemo(() => {
    if (!product) return 0;
    const fromMods = product.moduleGroups.flatMap(g => g.modules.flatMap(m => m.services));
    const modSvcIds = new Set(fromMods.map(s => s.id));
    return fromMods.length + product.services.filter(s => !modSvcIds.has(s.id)).length;
  }, [product]);

  const sectionStatus: StatusKind = !product ? 'empty' : allSvcCount === 0 ? 'empty' : 'ok';

  const qc = useQueryClient();
  const initBaseline = useMutation({
    mutationFn: () => apiClient.post('/service-release-snapshots/initialize', { productId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product-detail', productId] }),
  });

  return (
    <SectionShell icon="📦" title="Servis Versiyonları (BoM)"
      status={sectionStatus}
      statusNote={allSvcCount > 0 ? `${allSvcCount} servis` : ''}
      collapsed={collapsed} onToggle={onToggle}>
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
      {deltaAuthError && (
        <Alert severity="warning" sx={{ mb: 1 }}>
          <strong>Azure VSRM erişimi engellendi:</strong> {deltaAuthError}
        </Alert>
      )}
      {!isLoading && product && allSvcCount > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={initBaseline.isPending ? <CircularProgress size={14} /> : <CloudDownloadIcon fontSize="small" />}
            disabled={initBaseline.isPending}
            onClick={() => initBaseline.mutate()}
            sx={{ fontWeight: 600 }}
          >
            {initBaseline.isPending ? 'Getiriliyor...' : 'Azure Baseline Al'}
          </Button>
        </Box>
      )}
      {!isLoading && product && allSvcCount > 0 && (
        <>
          {product.moduleGroups.map(group => (
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
                      : <ServiceTable services={mod.services} deltaMap={deltaMap} isDeltaLoading={isDeltaLoading} />}
                  </Box>
                ))}
              </AccordionDetails>
            </Accordion>
          ))}
          {(() => {
            const grouped = new Set(product.moduleGroups.flatMap(g => g.modules.flatMap(m => m.services.map(s => s.id))));
            const ungrouped = product.services.filter(s => !grouped.has(s.id));
            if (!ungrouped.length) return null;
            return (
              <Accordion defaultExpanded sx={{ '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: 'grey.100' }}>
                  <Typography variant="body2" fontWeight={700}>Gruplandırılmamış Servisler</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}><ServiceTable services={ungrouped} deltaMap={deltaMap} isDeltaLoading={isDeltaLoading} /></AccordionDetails>
              </Accordion>
            );
          })()}
        </>
      )}
    </SectionShell>
  );
}

// ─── SECTION 2 — Pull Requests ────────────────────────────────────────────────

function PrSection({ productId, pmType, preProdDate, collapsed, onToggle, onWorkItemsCollected }: {
  productId: string; pmType?: string | null; preProdDate?: string | null;
  collapsed: boolean; onToggle: () => void; onWorkItemsCollected: (ids: number[]) => void;
}) {
  const isAzure = pmType === 'AZURE';

  const { data: rawPRs = [], isLoading, isError, refetch } = useQuery<PR[]>({
    queryKey: ['prs-v3', productId],
    queryFn: () => apiClient.get(`/tfs/pull-requests?productId=${productId}`)
      .then(r => { const d = r.data.data ?? r.data; return d.value ?? (Array.isArray(d) ? d : []); }),
    enabled: !!productId && isAzure,
    staleTime: 0, retry: 1,
  });

  const prs = useMemo(() => {
    if (!preProdDate) return rawPRs;
    const cutoff = new Date(preProdDate).getTime();
    return rawPRs.filter(pr => pr.creationDate ? new Date(pr.creationDate).getTime() > cutoff : true);
  }, [rawPRs, preProdDate]);

  useEffect(() => {
    const ids = prs.flatMap(pr => (pr.workItemRefs ?? []).map(r => Number(r.id)).filter(n => !isNaN(n)));
    onWorkItemsCollected([...new Set(ids)]);
  }, [prs, onWorkItemsCollected]);

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
      statusNote={isAzure && prs.length > 0 ? `Toplam: ${prs.length}  Açık: ${openCount}  Merged: ${mergedCount}` : ''}
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
          {preProdDate ? `${fmtDate(preProdDate)} tarihinden sonra PR bulunamadı.` : 'PR bulunamadı.'}
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

function WorkItemsSection({ productId, pmType, workItemIds, collapsed, onToggle }: {
  productId: string; pmType?: string | null; workItemIds: number[];
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
                  <TableCell sx={{ fontWeight: 600 }}>Atanan</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map(wi => {
                  const type = wi.fields['System.WorkItemType'];
                  const state = wi.fields['System.State'];
                  const wiUrl = wi.url?.replace('_apis/wit/workItems', '_workitems/edit').split('?')[0];
                  return (
                    <TableRow key={wi.id} hover>
                      <TableCell>
                        <Link href={wiUrl ?? '#'} target="_blank" rel="noopener" variant="body2">#{wi.id}</Link>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {wi.fields['System.Title'] ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell><Chip label={type ?? '—'} size="small" color={wiTypeColor(type)} /></TableCell>
                      <TableCell><Chip label={state ?? '—'} size="small" color={wiStateColor(state)} /></TableCell>
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
                    <TableCell colSpan={4} sx={{ bgcolor: 'grey.50', pb: 2 }}>
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
  const qc = useQueryClient();

  const { data: todos = [], isLoading, isError, refetch } = useQuery<ReleaseTodo[]>({
    queryKey: ['todos-v3', versionId],
    queryFn: () => apiClient.get(`/release-todos?versionId=${versionId}`).then(r => r.data.data),
    enabled: !!versionId, staleTime: 0,
  });

  type TodoToggleVars = { id: string; isCompleted: boolean };
  type TodoToggleCtx = { prev?: ReleaseTodo[] };

  const toggleMutation = useMutation<unknown, unknown, TodoToggleVars, TodoToggleCtx>({
    mutationFn: ({ id, isCompleted }: TodoToggleVars) =>
      apiClient.patch(`/release-todos/${id}`, { isCompleted }),
    onMutate: async ({ id, isCompleted }: TodoToggleVars) => {
      await qc.cancelQueries({ queryKey: ['todos-v3', versionId] });
      const prev = qc.getQueryData<ReleaseTodo[]>(['todos-v3', versionId]);
      qc.setQueryData<ReleaseTodo[]>(['todos-v3', versionId],
        old => old?.map(t => t.id === id ? { ...t, isCompleted } : t) ?? []);
      return { prev };
    },
    onError: (_e: unknown, _v: TodoToggleVars, ctx: TodoToggleCtx | undefined) => {
      if (ctx?.prev) qc.setQueryData(['todos-v3', versionId], ctx.prev);
    },
  });

  const incompleteP0 = useMemo(() => todos.filter(t => t.priority === 'P0' && !t.isCompleted), [todos]);
  const completedCount = todos.filter(t => t.isCompleted).length;

  useEffect(() => { onStatsChange(incompleteP0.length); }, [incompleteP0.length, onStatsChange]);

  const sectionStatus: StatusKind = todos.length === 0 ? 'empty' : incompleteP0.length > 0 ? 'error' : 'ok';
  const grouped: Record<string, ReleaseTodo[]> = {};
  todos.forEach(t => { (grouped[t.timing] = grouped[t.timing] ?? []).push(t); });

  return (
    <SectionShell icon="☑" title="Release Todos" status={sectionStatus}
      statusNote={todos.length > 0 ? `Tamamlanan: ${completedCount}/${todos.length}  P0 Eksik: ${incompleteP0.length}` : ''}
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
                    bgcolor: todo.priority === 'P0' && !todo.isCompleted ? 'error.50' : 'transparent',
                    '&:hover': { bgcolor: todo.priority === 'P0' && !todo.isCompleted ? 'error.100' : 'grey.50' },
                  }}>
                    <Checkbox size="small" checked={todo.isCompleted}
                      onChange={e => toggleMutation.mutate({ id: todo.id, isCompleted: e.target.checked })}
                      disabled={toggleMutation.isPending} />
                    <Chip label={todo.priority} size="small" color={priorityColor(todo.priority)} />
                    <Typography variant="body2" sx={{
                      flex: 1,
                      textDecoration: todo.isCompleted ? 'line-through' : 'none',
                      color: todo.isCompleted ? 'text.disabled' : 'text.primary',
                    }}>
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
          {todos.every(t => t.isCompleted) && (
            <Alert severity="success">🎉 Tüm todo'lar tamamlandı!</Alert>
          )}
        </>
      )}
    </SectionShell>
  );
}

// ─── Approve Dialog ───────────────────────────────────────────────────────────

function ApproveDialog({ open, onClose, versionLabel, healthScore, openPRCount, p0TodoCount, breakingCount, serviceCount, onConfirm, isPending, error }: {
  open: boolean; onClose: () => void; versionLabel: string; healthScore: number;
  openPRCount: number; p0TodoCount: number; breakingCount: number; serviceCount: number;
  onConfirm: () => void; isPending: boolean; error?: string | null;
}) {
  const rows = [
    { icon: openPRCount === 0 ? '✅' : '⚠️', label: "PR'lar", value: openPRCount === 0 ? 'Tümü merged' : `${openPRCount} açık PR var` },
    { icon: p0TodoCount === 0 ? '✅' : '❌', label: "P0 Todo'lar", value: p0TodoCount === 0 ? 'Tümü tamamlandı' : `${p0TodoCount} eksik` },
    { icon: breakingCount === 0 ? '✅' : '⚠️', label: 'Breaking Change', value: breakingCount === 0 ? 'Yok' : `${breakingCount} adet` },
    { icon: healthScore >= 80 ? '✅' : '⚠️', label: 'Sağlık Skoru', value: `${healthScore} / 100` },
  ];
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>🚀 Release Onayla — {versionLabel}</DialogTitle>
      <DialogContent>
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
        <Typography variant="caption" color="text.secondary">
          Bu işlem versiyonun fazını PROD'a taşır ve releaseDate'i bugünün tarihi olarak kaydeder.{' '}
          <strong>Geri alınamaz.</strong>
        </Typography>
        {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isPending}>İptal</Button>
        <Button variant="contained" color="success" onClick={onConfirm} disabled={isPending}>
          {isPending ? 'Onaylanıyor...' : 'Evet, Yayınla →'}
        </Button>
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
    versions.filter(v => { const ph = computePhase(v); return ph === 'PREP' || ph === 'WAITING'; }),
    [versions]
  );

  const selectedVerObj = versions.find(v => v.id === selectedVersion);
  const enabled = !!selectedVersion;

  const { data: prsForScore = [] } = useQuery<PR[]>({
    queryKey: ['prs-v3', selectedProduct],
    queryFn: () => apiClient.get(`/tfs/pull-requests?productId=${selectedProduct}`)
      .then(r => { const d = r.data.data ?? r.data; return d.value ?? (Array.isArray(d) ? d : []); }),
    enabled: !!selectedProduct && selectedProductObj?.pmType === 'AZURE',
    staleTime: 0, retry: 1,
  });

  const { data: changesForScore = [] } = useQuery<SystemChange[]>({
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
    const fromMods = productDetail.moduleGroups.flatMap(g => g.modules.flatMap(m => m.services));
    const modSvcIds = new Set(fromMods.map(s => s.id));
    return fromMods.length + productDetail.services.filter(s => !modSvcIds.has(s.id)).length;
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
    mutationFn: () => apiClient.patch(`/product-versions/${selectedVersion}/release`),
    onSuccess: () => {
      setApproveOpen(false);
      setApproveError(null);
      setToast('🎉 Versiyon başarıyla yayınlandı!');
      queryClient.invalidateQueries({ queryKey: ['product-versions', selectedProduct] });
      // Background: tüm servislerin release snapshot'ını kaydet (başarısız olsa bile versiyon yayınlanmış sayılır)
      const capturedProductId = selectedProduct;
      const capturedVersionId = selectedVersion;
      setSelectedVersion('');
      apiClient
        .post('/service-release-snapshots', { productId: capturedProductId, productVersionId: capturedVersionId })
        .then(r => {
          const snap = r.data.data as { succeeded: string[]; failed: { serviceId: string }[] };
          queryClient.invalidateQueries({ queryKey: ['service-snapshots', capturedProductId] });
          if (snap.failed?.length > 0) {
            console.warn('[Snapshot] Kısmi hata — bazı servisler snapshot alınamadı:', snap.failed);
          }
        })
        .catch(err => console.warn('[Snapshot] Snapshot çağrısı başarısız:', err));
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
            <InputLabel>Versiyon (PREP / WAITING)</InputLabel>
            <Select value={selectedVersion} label="Versiyon (PREP / WAITING)"
              onChange={e => setSelectedVersion(e.target.value)}>
              {selectableVersions.length === 0 && (
                <MenuItem value="" disabled>PREP/WAITING fazında versiyon yok</MenuItem>
              )}
              {selectableVersions.map(v => (
                <MenuItem key={v.id} value={v.id}>v{v.version} — {phaseLabel(v)}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {selectedVersion && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mt: 1 }}>
            <ScoreGauge score={healthScore} loading={false} />
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
            <Button variant="contained" color="success" size="large" disabled={!canRelease}
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
          />
          <PrSection
            productId={selectedProduct}
            pmType={selectedProductObj?.pmType}
            preProdDate={selectedVerObj?.preProdDate}
            collapsed={collapsed.prs}
            onToggle={() => toggleSection('prs')}
            onWorkItemsCollected={setPrWorkItemIds}
          />
          <WorkItemsSection
            productId={selectedProduct}
            pmType={selectedProductObj?.pmType}
            workItemIds={collectedWorkItemIds}
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
        onConfirm={() => approveMutation.mutate()}
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
