import { useState, useCallback } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Chip, LinearProgress,
  Tab, Tabs, Alert, Select, MenuItem, FormControl, InputLabel,
  Accordion, AccordionSummary, AccordionDetails, Checkbox,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  CircularProgress, Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SyncIcon from '@mui/icons-material/Sync';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import apiClient from '@/api/client';

// ─── Types ───────────────────────────────────────────────────────────────────

type Product = { id: string; name: string };
type Service = { id: string; name: string; repoName?: string };
type ProductVersion = { id: string; version: string; phase: string };
type CustomerBranch = {
  id: string; branchName: string; repoName?: string; customerName: string;
  lastSync?: { createdAt: string } | null;
};
type PR = { prId: number; title: string; mergeDate: string; author: string; repoName: string; commitIds: string[] };
type WorkItem = { id: number; title: string; type: string; state: string; prs: PR[] };
type DeltaData = {
  workitems: WorkItem[]; unclassified: PR[]; total_pr_count: number; alreadySyncedPrIds: number[];
};
type CustomerPR = {
  prId: number; title: string; mergeDate: string; author: string;
  sourceBranch: string; syncSource: 'RELEASEHUB' | 'MANUAL'; url: string;
};
type SyncStatus = {
  status: 'RUNNING' | 'SUCCESS' | 'CONFLICT' | 'FAILED';
  syncBranchName?: string;
  progress?: { total: number; done: number; current?: string | number | null };
  result?: { prUrl?: string; prId?: number } | null;
  conflict?: { prId?: number; files?: string[] } | null;
  error?: string | null;
};
type SyncRecord = {
  id: string; status: string; syncBranchName?: string; sourceBranch: string; targetBranch: string;
  createdAt: string; completedAt?: string;
  payload?: { prIds?: number[]; prUrl?: string; targetVersionId?: string; sourceVersionId?: string } | null;
  conflictDetails?: { prId?: number; files?: string[] } | null;
  customerBranch: { branchName: string; repoName?: string | null };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WI_ICONS: Record<string, string> = { Feature: '✨', Bug: '🐛', 'User Story': '📋', PBI: '📋', Task: '📋' };
const wiIcon = (type: string) => WI_ICONS[type] ?? '📋';

function StatusChip({ status }: { status: string }) {
  const cfg: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
    SUCCESS: { label: '✅ Başarılı', color: 'success' },
    CONFLICT: { label: '⚠️ Çakışma', color: 'warning' },
    FAILED: { label: '🔴 Hata', color: 'error' },
    RUNNING: { label: '🔄 Çalışıyor', color: 'info' },
  };
  const { label, color } = cfg[status] ?? { label: status, color: 'default' };
  return <Chip label={label} color={color} size="small" />;
}

type DeltaParams = { sourceVersionId: string; targetVersionId: string; serviceId: string; customerBranchId: string };

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CodeSyncPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);

  // Context selectors
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedCustomerBranchId, setSelectedCustomerBranchId] = useState('');
  const [sourceVersionId, setSourceVersionId] = useState('');
  const [targetVersionId, setTargetVersionId] = useState('');

  // Delta trigger: null = not loaded yet
  const [deltaParams, setDeltaParams] = useState<DeltaParams | null>(null);

  // PR selection
  const [selectedPrIds, setSelectedPrIds] = useState<Set<number>>(new Set());

  // Dialogs / workflow state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activeSyncId, setActiveSyncId] = useState<string | null>(null);
  const [conflictResult, setConflictResult] = useState<{ can_merge?: boolean; potential_conflicts?: unknown[] } | null>(null);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);

  // ── Context data ──
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products-for-sync'],
    queryFn: () => apiClient.get('/products').then(r => r.data.data ?? r.data),
  });
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['services-for-sync', selectedProductId],
    queryFn: () => apiClient.get('/services', { params: { productId: selectedProductId } }).then(r => r.data.data ?? r.data),
    enabled: !!selectedProductId,
  });
  const { data: versions = [] } = useQuery<ProductVersion[]>({
    queryKey: ['product-versions-for-sync', selectedProductId],
    queryFn: () => apiClient.get('/product-versions', { params: { productId: selectedProductId } }).then(r => r.data.data ?? r.data),
    enabled: !!selectedProductId,
  });
  const { data: customerBranches = [] } = useQuery<CustomerBranch[]>({
    queryKey: ['customer-branches-for-sync', selectedServiceId],
    queryFn: () => apiClient.get('/code-sync/customer-branches', { params: { serviceId: selectedServiceId } }).then(r => r.data.data ?? r.data),
    enabled: !!selectedServiceId,
  });

  // ── Delta (manual trigger) ──
  const { data: deltaData, isLoading: deltaLoading, error: deltaError } = useQuery<DeltaData>({
    queryKey: ['delta', deltaParams],
    queryFn: () => apiClient.get('/code-sync/delta', { params: deltaParams! }).then(r => r.data.data),
    enabled: !!deltaParams,
  });

  // ── Customer branch PRs (loaded alongside delta) ──
  const { data: customerPRsData } = useQuery<{ prs: CustomerPR[] }>({
    queryKey: ['customer-prs-for-sync', selectedCustomerBranchId, selectedServiceId],
    queryFn: () => apiClient.get('/code-sync/customer-prs', { params: { customerBranchId: selectedCustomerBranchId, serviceId: selectedServiceId } }).then(r => r.data.data),
    enabled: !!deltaParams,
  });
  const customerPRs = customerPRsData?.prs ?? [];

  // ── Sync status polling ──
  const { data: syncStatus } = useQuery<SyncStatus>({
    queryKey: ['sync-status', activeSyncId],
    queryFn: () => apiClient.get(`/code-sync/${activeSyncId}/status`).then(r => r.data.data),
    enabled: !!activeSyncId,
    refetchInterval: (q) => q.state.data?.status === 'RUNNING' ? 5000 : false,
  });

  // ── History ──
  const { data: historyRecords = [] } = useQuery<SyncRecord[]>({
    queryKey: ['sync-history-tab', selectedCustomerBranchId],
    queryFn: () => apiClient.get('/code-sync/history', { params: { customerBranchId: selectedCustomerBranchId, limit: 30 } }).then(r => r.data.data ?? []),
    enabled: tab === 1 && !!selectedCustomerBranchId,
  });

  // ── Mutations ──
  const conflictCheckMutation = useMutation({
    mutationFn: () => apiClient.post('/code-sync/conflict-check', {
      serviceId: selectedServiceId, customerBranchId: selectedCustomerBranchId, prIds: [...selectedPrIds],
    }).then(r => r.data.data),
    onSuccess: (data) => { setConflictResult(data); setConflictDialogOpen(true); },
  });

  const startSyncMutation = useMutation({
    mutationFn: () => {
      const summary = (deltaData?.workitems ?? [])
        .filter(wi => wi.prs.some(pr => selectedPrIds.has(pr.prId)))
        .map(wi => `• ${wi.title} (#${wi.id})`).join('\n');
      return apiClient.post('/code-sync/start', {
        serviceId: selectedServiceId, customerBranchId: selectedCustomerBranchId,
        sourceVersionId, targetVersionId, prIds: [...selectedPrIds], workitemSummary: summary,
      }).then(r => r.data.data);
    },
    onSuccess: (data: { syncId: string }) => { setConfirmOpen(false); setActiveSyncId(data.syncId); },
  });

  const skipAndContinueMutation = useMutation({
    mutationFn: (skipPrId: number) =>
      apiClient.post(`/code-sync/${activeSyncId}/skip-and-continue`, { skipPrId }).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sync-status', activeSyncId] }),
  });

  // ── Handlers ──
  const isAlreadySynced = useCallback((prId: number) => (deltaData?.alreadySyncedPrIds ?? []).includes(prId), [deltaData]);

  const handleLoadDelta = () => {
    if (!sourceVersionId || !targetVersionId || !selectedServiceId || !selectedCustomerBranchId) return;
    setSelectedPrIds(new Set());
    setActiveSyncId(null);
    setDeltaParams({ sourceVersionId, targetVersionId, serviceId: selectedServiceId, customerBranchId: selectedCustomerBranchId });
  };

  const toggleWorkitem = (wi: WorkItem) => {
    setSelectedPrIds(prev => {
      const next = new Set(prev);
      const syncable = wi.prs.filter(pr => !isAlreadySynced(pr.prId)).map(pr => pr.prId);
      const allSel = syncable.every(id => prev.has(id)) && syncable.length > 0;
      if (allSel) syncable.forEach(id => next.delete(id));
      else syncable.forEach(id => next.add(id));
      return next;
    });
  };

  const togglePr = (prId: number) => {
    setSelectedPrIds(prev => { const n = new Set(prev); n.has(prId) ? n.delete(prId) : n.add(prId); return n; });
  };

  const selectAll = () => {
    const ids = (deltaData?.workitems ?? []).flatMap(wi => wi.prs.map(pr => pr.prId)).filter(id => !isAlreadySynced(id));
    setSelectedPrIds(new Set([...ids, ...(deltaData?.unclassified ?? []).map(pr => pr.prId)]));
  };

  const clearAll = () => setSelectedPrIds(new Set());

  // ── Computed ──
  const selCount = selectedPrIds.size;
  const selWiCount = (deltaData?.workitems ?? []).filter(wi => wi.prs.some(pr => selectedPrIds.has(pr.prId))).length;
  const srcVer = versions.find(v => v.id === sourceVersionId);
  const tgtVer = versions.find(v => v.id === targetVersionId);
  const selBranch = customerBranches.find(b => b.id === selectedCustomerBranchId);
  const canLoadDelta = !!(sourceVersionId && targetVersionId && selectedServiceId && selectedCustomerBranchId);

  // ── Active sync progress rendering ──
  if (activeSyncId && syncStatus) {
    return (
      <SyncProgressView
        status={syncStatus}
        onSkip={(prId) => skipAndContinueMutation.mutate(prId)}
        onClose={() => {
          setActiveSyncId(null);
          qc.invalidateQueries({ queryKey: ['sync-history-tab', selectedCustomerBranchId] });
        }}
      />
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header */}
      <Box>
        <Typography variant="h5" fontWeight={700}>Versiyon Senkronizasyonu</Typography>
        <Typography variant="body2" color="text.secondary">
          Ürün versiyonundaki değişiklikleri müşteri branch'ine workitem bazlı aktar
        </Typography>
      </Box>

      {/* Context Bar */}
      <Card variant="outlined">
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'flex-end' }}>
            {/* Product */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Ürün</InputLabel>
              <Select value={selectedProductId} label="Ürün" onChange={e => {
                setSelectedProductId(e.target.value); setSelectedServiceId('');
                setSelectedCustomerBranchId(''); setSourceVersionId(''); setTargetVersionId(''); setDeltaParams(null);
              }}>
                {products.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
              </Select>
            </FormControl>

            {/* Service */}
            <FormControl size="small" sx={{ minWidth: 175 }} disabled={!selectedProductId}>
              <InputLabel>Servis</InputLabel>
              <Select value={selectedServiceId} label="Servis" onChange={e => {
                setSelectedServiceId(e.target.value); setSelectedCustomerBranchId(''); setDeltaParams(null);
              }}>
                {services.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
              </Select>
            </FormControl>

            {/* Customer Branch */}
            <FormControl size="small" sx={{ minWidth: 200 }} disabled={!selectedServiceId}>
              <InputLabel>Müşteri Branch</InputLabel>
              <Select value={selectedCustomerBranchId} label="Müşteri Branch" onChange={e => {
                setSelectedCustomerBranchId(e.target.value); setDeltaParams(null);
              }}>
                {customerBranches.map(b => <MenuItem key={b.id} value={b.id}>{b.branchName} ({b.customerName})</MenuItem>)}
              </Select>
            </FormControl>

            <Divider orientation="vertical" flexItem />

            {/* Source version */}
            <FormControl size="small" sx={{ minWidth: 140 }} disabled={!selectedProductId}>
              <InputLabel>Kaynak Versiyon</InputLabel>
              <Select value={sourceVersionId} label="Kaynak Versiyon" onChange={e => { setSourceVersionId(e.target.value); setDeltaParams(null); }}>
                {versions.map(v => <MenuItem key={v.id} value={v.id}>{v.version}</MenuItem>)}
              </Select>
            </FormControl>

            <Typography color="text.secondary" sx={{ alignSelf: 'center', fontWeight: 700 }}>→</Typography>

            {/* Target version */}
            <FormControl size="small" sx={{ minWidth: 140 }} disabled={!selectedProductId}>
              <InputLabel>Hedef Versiyon</InputLabel>
              <Select value={targetVersionId} label="Hedef Versiyon" onChange={e => { setTargetVersionId(e.target.value); setDeltaParams(null); }}>
                {versions.filter(v => v.id !== sourceVersionId).map(v => <MenuItem key={v.id} value={v.id}>{v.version}</MenuItem>)}
              </Select>
            </FormControl>

            <Button
              variant="contained" size="medium"
              disabled={!canLoadDelta || deltaLoading}
              onClick={handleLoadDelta}
              startIcon={deltaLoading ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
            >
              {deltaLoading ? 'Yükleniyor…' : 'Delta Yükle'}
            </Button>

            {selBranch?.lastSync && (
              <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                💡 Son sync:{' '}
                {formatDistanceToNow(new Date(selBranch.lastSync.createdAt), { locale: tr, addSuffix: true })}
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      {deltaError instanceof Error && (
        <Alert severity="error">
          Delta yüklenirken hata oluştu: {deltaError.message}. Azure DevOps bağlantısını ve credentials'ları kontrol edin.
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Senkronizasyon" />
        <Tab label="Geçmiş" disabled={!selectedCustomerBranchId} />
      </Tabs>

      {/* ── Sync Tab ── */}
      {tab === 0 && (
        <>
          {!deltaParams && (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box sx={{ textAlign: 'center', maxWidth: 380 }}>
                <SyncIcon sx={{ fontSize: 72, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>Versiyon Seçin</Typography>
                <Typography color="text.secondary" variant="body2">
                  Ürün, servis, müşteri branch ve versiyon aralığını seçip <strong>Delta Yükle</strong>'ye tıklayın.
                </Typography>
              </Box>
            </Box>
          )}

          {deltaParams && !deltaLoading && deltaData && (
            <Box sx={{ flex: 1, display: 'flex', gap: 2, minHeight: 0, overflow: 'hidden' }}>
              {/* LEFT — Product changes */}
              <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {/* Panel header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="overline" color="text.secondary" fontWeight={700}>
                    ÜRÜN DEĞİŞİKLİKLERİ ({srcVer?.version ?? '?'} → {tgtVer?.version ?? '?'}) · {deltaData.total_pr_count} PR
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Button size="small" onClick={selectAll}>Hepsini Seç</Button>
                    <Button size="small" color="inherit" onClick={clearAll}>Temizle</Button>
                  </Box>
                </Box>

                {deltaData.total_pr_count === 0 && (
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 5 }}>
                      <CheckCircleIcon color="success" sx={{ fontSize: 56, mb: 1 }} />
                      <Typography fontWeight={600}>Bu versiyon zaten senkronize!</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {srcVer?.version} → {tgtVer?.version} arasındaki tüm değişiklikler müşteri branch'inde mevcut.
                      </Typography>
                    </CardContent>
                  </Card>
                )}

                {deltaData.workitems.map(wi => {
                  const syncable = wi.prs.filter(pr => !isAlreadySynced(pr.prId));
                  const selInWi = syncable.filter(pr => selectedPrIds.has(pr.prId));
                  const allSel = syncable.length > 0 && selInWi.length === syncable.length;
                  const indeterminate = selInWi.length > 0 && !allSel;

                  return (
                    <Accordion key={wi.id} disableGutters variant="outlined">
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, mr: 1, overflow: 'hidden' }}>
                          <Checkbox size="small" checked={allSel} indeterminate={indeterminate}
                            disabled={syncable.length === 0}
                            onClick={e => { e.stopPropagation(); toggleWorkitem(wi); }}
                          />
                          <Chip label={`${wiIcon(wi.type)} ${wi.type}`} size="small" variant="outlined" sx={{ flexShrink: 0 }} />
                          <Typography variant="body2" fontWeight={600} noWrap sx={{ flex: 1 }}>
                            #{wi.id} · {wi.title}
                          </Typography>
                          <Chip label={`${wi.prs.length} PR`} size="small" sx={{ flexShrink: 0 }} />
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails sx={{ pt: 0, pb: 1 }}>
                        {wi.prs.map(pr => {
                          const synced = isAlreadySynced(pr.prId);
                          const sel = selectedPrIds.has(pr.prId);
                          return (
                            <Box key={pr.prId} sx={{
                              display: 'flex', alignItems: 'flex-start', gap: 1, py: 0.5, px: 1, borderRadius: 1,
                              bgcolor: synced ? 'success.50' : sel ? 'primary.50' : 'transparent',
                              '&:hover': { bgcolor: synced ? 'success.50' : 'action.hover' },
                            }}>
                              <Checkbox size="small" checked={sel} disabled={synced} sx={{ mt: -0.25 }}
                                onChange={() => togglePr(pr.prId)} />
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="body2" noWrap>
                                  #{pr.prId} · {pr.title}
                                  {synced && <Chip label="MEVCUT" color="success" size="small" sx={{ ml: 0.5 }} />}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {pr.repoName} · {new Date(pr.mergeDate).toLocaleDateString('tr-TR')} · {pr.author}
                                </Typography>
                              </Box>
                            </Box>
                          );
                        })}
                      </AccordionDetails>
                    </Accordion>
                  );
                })}

                {deltaData.unclassified.length > 0 && (
                  <Accordion disableGutters variant="outlined">
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="body2" color="text.secondary" fontWeight={600}>
                        📌 Sınıflandırılmamış · {deltaData.unclassified.length} PR
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0 }}>
                      {deltaData.unclassified.map(pr => (
                        <Box key={pr.prId} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, py: 0.5, px: 1, borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}>
                          <Checkbox size="small" checked={selectedPrIds.has(pr.prId)} sx={{ mt: -0.25 }} onChange={() => togglePr(pr.prId)} />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" noWrap>#{pr.prId} · {pr.title}</Typography>
                            <Typography variant="caption" color="text.secondary">{pr.repoName} · {new Date(pr.mergeDate).toLocaleDateString('tr-TR')} · {pr.author}</Typography>
                          </Box>
                        </Box>
                      ))}
                    </AccordionDetails>
                  </Accordion>
                )}
              </Box>

              {/* RIGHT — Customer branch PRs */}
              <Box sx={{ width: 300, flexShrink: 0, overflow: 'auto', borderLeft: 1, borderColor: 'divider', pl: 2 }}>
                <Typography variant="overline" color="text.secondary" fontWeight={700}>
                  MÜŞTERİ BRANCH — {selBranch?.branchName}
                </Typography>
                {customerPRs.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>PR bulunamadı.</Typography>
                )}
                {customerPRs.slice(0, 60).map(pr => (
                  <Box key={pr.prId} sx={{ py: 0.75, borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="body2" fontWeight={500} noWrap>
                      #{pr.prId} · {pr.title}
                      {pr.syncSource === 'RELEASEHUB' && (
                        <Chip label="RH" color="primary" size="small" sx={{ ml: 0.5, height: 16, fontSize: 10 }} />
                      )}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(pr.mergeDate).toLocaleDateString('tr-TR')} · {pr.author}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Action Bar */}
          {deltaParams && !deltaLoading && deltaData && deltaData.total_pr_count > 0 && (
            <Box sx={{ pt: 2, borderTop: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
              <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                Seçilen: <strong>{selWiCount} workitem</strong>, <strong>{selCount} PR</strong>
              </Typography>
              <Button
                variant="outlined" startIcon={<WarningAmberIcon />}
                disabled={selCount === 0 || conflictCheckMutation.isPending}
                onClick={() => conflictCheckMutation.mutate()}
              >
                {conflictCheckMutation.isPending ? 'Analiz ediliyor…' : 'Çakışma Analizi'}
              </Button>
              <Button
                variant="contained" color="primary" endIcon={<SyncIcon />}
                disabled={selCount === 0}
                onClick={() => setConfirmOpen(true)}
              >
                Sync Başlat
              </Button>
            </Box>
          )}
        </>
      )}

      {/* ── History Tab ── */}
      {tab === 1 && (
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <HistoryTab records={historyRecords} />
        </Box>
      )}

      {/* ── Confirm Dialog ── */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Sync Başlat</DialogTitle>
        <DialogContent>
          <DialogContentText gutterBottom>
            Seçilen <strong>{selWiCount} workitem</strong> ve <strong>{selCount} PR</strong>, müşteri branch'ine cherry-pick edilecektir.
          </DialogContentText>
          <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1, '& p': { mb: 0.5 } }}>
            <Typography variant="body2"><strong>Branch:</strong> {selBranch?.branchName}</Typography>
            <Typography variant="body2"><strong>Repo:</strong> {selBranch?.repoName}</Typography>
            <Typography variant="body2"><strong>Versiyon:</strong> {srcVer?.version} → {tgtVer?.version}</Typography>
          </Box>
          {startSyncMutation.isError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {startSyncMutation.error instanceof Error ? startSyncMutation.error.message : 'Bilinmeyen hata'}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={startSyncMutation.isPending}>İptal</Button>
          <Button variant="contained" onClick={() => startSyncMutation.mutate()} disabled={startSyncMutation.isPending}>
            {startSyncMutation.isPending ? <CircularProgress size={18} color="inherit" /> : 'Sync Başlat'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Conflict Check Result Dialog ── */}
      <Dialog open={conflictDialogOpen} onClose={() => setConflictDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Çakışma Analizi Sonucu</DialogTitle>
        <DialogContent>
          {conflictResult?.can_merge === true ? (
            <Alert severity="success" sx={{ mb: 1 }}>
              ✅ Seçilen PR'larda çakışma riski tespit edilmedi.
            </Alert>
          ) : (
            <Alert severity="warning" sx={{ mb: 1 }}>
              ⚠️ Bazı dosyalarda çakışma riski var. Sync sırasında manuel çözüm gerekebilir.
            </Alert>
          )}
          {Array.isArray(conflictResult?.potential_conflicts) && conflictResult.potential_conflicts.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">Riskli dosyalar:</Typography>
              {(conflictResult.potential_conflicts as string[]).map((f, i) => (
                <Typography key={i} variant="body2" sx={{ fontFamily: 'monospace', pl: 1 }}>• {f}</Typography>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConflictDialogOpen(false)}>Kapat</Button>
          <Button variant="contained" onClick={() => { setConflictDialogOpen(false); setConfirmOpen(true); }}>
            Yine de Sync Başlat
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ─── Sync Progress View ───────────────────────────────────────────────────────

function SyncProgressView({
  status, onSkip, onClose,
}: {
  status: SyncStatus;
  onSkip: (prId: number) => void;
  onClose: () => void;
}) {
  const progress = status.progress;
  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  if (status.status === 'SUCCESS') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, textAlign: 'center', gap: 2, p: 6 }}>
        <CheckCircleIcon color="success" sx={{ fontSize: 80 }} />
        <Typography variant="h5" fontWeight={700}>Sync Tamamlandı!</Typography>
        <Typography color="text.secondary">
          {progress?.total ?? '?'} PR başarıyla cherry-pick edildi.
        </Typography>
        {status.result?.prUrl && (
          <Button variant="outlined" href={status.result.prUrl} target="_blank" rel="noreferrer">
            🔗 Azure DevOps PR #{status.result.prId} →
          </Button>
        )}
        {status.syncBranchName && (
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            Branch: {status.syncBranchName}
          </Typography>
        )}
        <Button variant="contained" onClick={onClose} sx={{ mt: 2 }}>Yeni Senkronizasyon</Button>
      </Box>
    );
  }

  if (status.status === 'CONFLICT') {
    return (
      <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 640, mx: 'auto', width: '100%' }}>
        <Alert severity="warning" icon={<WarningAmberIcon />}>
          <Typography fontWeight={700} gutterBottom>Çakışma Tespit Edildi</Typography>
          Cherry-pick işlemi PR #{status.conflict?.prId}'de durdu. Çakışmanın manuel olarak çözülmesi gerekiyor.
        </Alert>

        {status.conflict?.files && status.conflict.files.length > 0 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>Çakışan dosyalar:</Typography>
            {status.conflict.files.map(f => (
              <Typography key={f} variant="body2" sx={{ fontFamily: 'monospace', pl: 2 }}>• {f}</Typography>
            ))}
          </Box>
        )}

        {status.syncBranchName && (
          <Typography variant="body2" color="text.secondary">
            Oluşturulan branch silinmedi: <code>{status.syncBranchName}</code>
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
          {status.conflict?.prId && (
            <Button variant="contained" color="warning" onClick={() => onSkip(status.conflict!.prId!)}>
              Bu PR'ı çıkar, kalan commit'lerle devam et
            </Button>
          )}
          <Button variant="outlined" onClick={onClose}>Kapat</Button>
        </Box>
      </Box>
    );
  }

  if (status.status === 'FAILED') {
    return (
      <Box sx={{ p: 4, maxWidth: 560, mx: 'auto', width: '100%' }}>
        <Alert severity="error" icon={<ErrorOutlineIcon />}>
          <Typography fontWeight={700} gutterBottom>Sync Başarısız</Typography>
          {status.error ?? 'Bilinmeyen bir hata oluştu.'}
        </Alert>
        <Button onClick={onClose} sx={{ mt: 2 }}>Kapat</Button>
      </Box>
    );
  }

  // RUNNING
  return (
    <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 560, mx: 'auto', width: '100%' }}>
      <Typography variant="h6" fontWeight={700}>Sync Devam Ediyor…</Typography>
      <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 4 }} />
      <Typography variant="body2" color="text.secondary">
        {progress?.done ?? 0} / {progress?.total ?? '?'} PR işlendi
        {progress?.current ? ` — şu an: PR #${progress.current}` : ''}
      </Typography>
      {status.syncBranchName && (
        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
          Branch: {status.syncBranchName}
        </Typography>
      )}
    </Box>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────

function HistoryTab({ records }: { records: SyncRecord[] }) {
  if (records.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography color="text.secondary">Henüz senkronizasyon geçmişi bulunmuyor.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {records.map(r => (
        <Card key={r.id} variant="outlined">
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {r.payload?.sourceVersionId ?? r.sourceBranch} → {r.payload?.targetVersionId ?? r.targetBranch}
                  {'  '}· {(r.payload?.prIds)?.length ?? '?'} PR
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {r.customerBranch.branchName} · {new Date(r.createdAt).toLocaleDateString('tr-TR')}
                  {r.completedAt
                    ? ` · ${formatDistanceToNow(new Date(r.completedAt), { locale: tr, addSuffix: true })}`
                    : ''}
                </Typography>
                {r.syncBranchName && (
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ fontFamily: 'monospace' }} noWrap>
                    {r.syncBranchName}
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                <StatusChip status={r.status} />
                {r.payload?.prUrl && (
                  <Button size="small" variant="outlined" href={r.payload.prUrl} target="_blank" rel="noreferrer">
                    PR →
                  </Button>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
