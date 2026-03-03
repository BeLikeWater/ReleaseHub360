import { useState, useMemo, useCallback } from 'react';
import {
  Box, Typography, Paper, Chip, Popover, Divider, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert,
  Stack, TextField, MenuItem, FormControlLabel, Checkbox, Button,
  ToggleButton, ToggleButtonGroup, LinearProgress, Tooltip,
} from '@mui/material';
import {
  OpenInNew as OpenInNewIcon,
  GridView as MatrixIcon,
  Category as ProductIcon,
  Business as CustomerIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type CustomerMapping = {
  id: string;
  customerId: string;
  productVersionId: string;
  updatedAt?: string;
  customer: { id: string; name: string };
  productVersion: {
    id: string; version: string; productId: string;
    product: { id: string; name: string };
  };
};

type Product = { id: string; name: string; currentVersion?: string };
type ViewMode = 'matrix' | 'product' | 'customer';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function versionStatus(customerVersion: string, latestVersion: string): 'current' | 'minor' | 'major' {
  const [cMaj, cMin = '0'] = customerVersion.split('.');
  const [lMaj, lMin = '0'] = latestVersion.split('.');
  if (cMaj !== lMaj) return 'major';
  if (cMin !== lMin) return 'minor';
  return 'current';
}

function staleDays(updatedAt?: string): number {
  if (!updatedAt) return 0;
  const diff = Date.now() - new Date(updatedAt).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

const STATUS_CONFIG: Record<string, { bg: string; label: string; emoji: string }> = {
  current: { bg: '#e8f5e9', label: 'Güncel', emoji: '✅' },
  minor:   { bg: '#fff8e1', label: 'Minor Geride', emoji: '🟡' },
  major:   { bg: '#ffebee', label: 'Major Geride', emoji: '🔴' },
};

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const bom = '\uFEFF';
  const content = bom + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

const ALL_PRODUCTS = '__ALL__';
const ALL_CUSTOMERS = '__ALL__';

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ServiceVersionMatrixPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('matrix');
  const [popover, setPopover] = useState<{ anchor: HTMLElement; mapping: CustomerMapping } | null>(null);
  const [productFilter, setProductFilter] = useState<string>(ALL_PRODUCTS);
  const [customerFilter, setCustomerFilter] = useState<string>(ALL_CUSTOMERS);
  const [search, setSearch] = useState('');
  const [showOutdatedOnly, setShowOutdatedOnly] = useState(false);

  const { data: mappings = [], isLoading: mLoading, error: mError } = useQuery<CustomerMapping[]>({
    queryKey: ['customer-product-mappings'],
    queryFn: () => apiClient.get('/customer-product-mappings').then(r => r.data.data ?? r.data),
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products-for-matrix'],
    queryFn: () => apiClient.get('/products').then(r => r.data.data ?? r.data),
  });

  // Derived data
  const allProducts: Product[] = useMemo(() => {
    if (products.length > 0) return products;
    return [...new Map(mappings.map(m => [m.productVersion.productId, {
      id: m.productVersion.productId, name: m.productVersion.product.name,
    }]))].map(([, v]) => v);
  }, [products, mappings]);

  const allCustomers = useMemo(() => {
    const m = new Map<string, string>();
    for (const mp of mappings) m.set(mp.customerId, mp.customer.name);
    return [...m.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [mappings]);

  const productLatest = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products) { if (p.currentVersion) m.set(p.id, p.currentVersion); }
    for (const mp of mappings) {
      const pid = mp.productVersion.productId;
      const cur = m.get(pid);
      if (!cur || mp.productVersion.version > cur) m.set(pid, mp.productVersion.version);
    }
    return m;
  }, [products, mappings]);

  const cols = useMemo(() =>
    productFilter === ALL_PRODUCTS ? allProducts : allProducts.filter(p => p.id === productFilter),
    [allProducts, productFilter]);

  // Customer row map for matrix view
  const customerMap = useMemo(() => {
    const m = new Map<string, { name: string; customerId: string; products: Record<string, CustomerMapping> }>();
    for (const mp of mappings) {
      if (!m.has(mp.customerId)) {
        m.set(mp.customerId, { name: mp.customer.name, customerId: mp.customerId, products: {} });
      }
      m.get(mp.customerId)!.products[mp.productVersion.productId] = mp;
    }
    return m;
  }, [mappings]);

  // Filtered rows (matrix/customer views)
  const rows = useMemo(() => {
    let entries = [...customerMap.entries()];
    if (search.trim()) {
      const q = search.toLowerCase();
      entries = entries.filter(([, c]) => c.name.toLowerCase().includes(q));
    }
    if (customerFilter !== ALL_CUSTOMERS) {
      entries = entries.filter(([id]) => id === customerFilter);
    }
    if (showOutdatedOnly) {
      entries = entries.filter(([, c]) =>
        cols.some(p => {
          const mp = c.products[p.id];
          if (!mp) return false;
          const latest = productLatest.get(p.id) ?? mp.productVersion.version;
          return versionStatus(mp.productVersion.version, latest) !== 'current';
        })
      );
    }
    return entries;
  }, [customerMap, search, customerFilter, showOutdatedOnly, cols, productLatest]);

  // Summary stats
  const stats = useMemo(() => {
    let total = 0, outdated = 0, critical = 0;
    for (const [, c] of rows) {
      for (const p of cols) {
        const mp = c.products[p.id];
        if (!mp) continue;
        total++;
        const s = versionStatus(mp.productVersion.version, productLatest.get(p.id) ?? mp.productVersion.version);
        if (s !== 'current') outdated++;
        if (s === 'major') critical++;
      }
    }
    return { total, outdated, critical, customers: rows.length };
  }, [rows, cols, productLatest]);

  // Product-focused data
  const productFocusedData = useMemo(() => {
    if (viewMode !== 'product' || productFilter === ALL_PRODUCTS) return [];
    const pid = productFilter;
    const latest = productLatest.get(pid) ?? '';
    return mappings
      .filter(m => m.productVersion.productId === pid)
      .map(m => ({
        ...m,
        status: versionStatus(m.productVersion.version, latest),
        stale: staleDays(m.updatedAt),
        latest,
      }))
      .sort((a, b) => {
        const order = { major: 0, minor: 1, current: 2 };
        return order[a.status] - order[b.status];
      });
  }, [viewMode, productFilter, mappings, productLatest]);

  // Customer-focused data
  const customerFocusedData = useMemo(() => {
    if (viewMode !== 'customer' || customerFilter === ALL_CUSTOMERS) return [];
    return mappings
      .filter(m => m.customerId === customerFilter)
      .map(m => {
        const latest = productLatest.get(m.productVersion.productId) ?? m.productVersion.version;
        return {
          ...m,
          status: versionStatus(m.productVersion.version, latest),
          stale: staleDays(m.updatedAt),
          latest,
        };
      })
      .sort((a, b) => {
        const order = { major: 0, minor: 1, current: 2 };
        return order[a.status] - order[b.status];
      });
  }, [viewMode, customerFilter, mappings, productLatest]);

  // Version distribution for product view
  const versionDistribution = useMemo(() => {
    const dist = new Map<string, number>();
    for (const m of productFocusedData) {
      dist.set(m.productVersion.version, (dist.get(m.productVersion.version) ?? 0) + 1);
    }
    return [...dist.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [productFocusedData]);

  // Export handler
  const handleExport = useCallback(() => {
    if (viewMode === 'matrix') {
      const headers = ['Müşteri', ...cols.map(p => p.name)];
      const csvRows = rows.map(([, c]) =>
        [c.name, ...cols.map(p => c.products[p.id]?.productVersion.version ?? '—')]
      );
      downloadCsv('versiyon-matrisi.csv', headers, csvRows);
    } else if (viewMode === 'product') {
      const headers = ['Müşteri', 'Versiyon', 'Durum', 'En Güncel', 'Eski (gün)'];
      const csvRows = productFocusedData.map(m => [
        m.customer.name, m.productVersion.version,
        STATUS_CONFIG[m.status].label, m.latest, String(m.stale),
      ]);
      downloadCsv('urun-odakli-rapor.csv', headers, csvRows);
    } else {
      const headers = ['Ürün', 'Versiyon', 'Durum', 'En Güncel', 'Eski (gün)'];
      const csvRows = customerFocusedData.map(m => [
        m.productVersion.product.name, m.productVersion.version,
        STATUS_CONFIG[m.status].label, m.latest, String(m.stale),
      ]);
      downloadCsv('musteri-odakli-rapor.csv', headers, csvRows);
    }
  }, [viewMode, cols, rows, productFocusedData, customerFocusedData]);

  return (
    <Box>
      {/* Header + View Toggle */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Typography variant="h5" fontWeight={700}>Servis Versiyon Matrisi</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, v) => { if (v) setViewMode(v as ViewMode); }}
            size="small"
          >
            <ToggleButton value="matrix"><Tooltip title="Matrix Görünüm"><MatrixIcon fontSize="small" /></Tooltip></ToggleButton>
            <ToggleButton value="product"><Tooltip title="Ürün Odaklı"><ProductIcon fontSize="small" /></Tooltip></ToggleButton>
            <ToggleButton value="customer"><Tooltip title="Müşteri Odaklı"><CustomerIcon fontSize="small" /></Tooltip></ToggleButton>
          </ToggleButtonGroup>
          <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport}>
            CSV İndir
          </Button>
        </Stack>
      </Stack>

      {/* Filters */}
      <Stack direction="row" spacing={2} mb={2} flexWrap="wrap" alignItems="center">
        <TextField
          size="small" label="Müşteri ara" value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ minWidth: 200 }}
        />
        {(viewMode === 'matrix' || viewMode === 'product') && (
          <TextField
            size="small" select label="Ürün filtrele"
            value={productFilter}
            onChange={e => setProductFilter(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            {viewMode === 'matrix' && <MenuItem value={ALL_PRODUCTS}>Tümü</MenuItem>}
            {allProducts.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </TextField>
        )}
        {viewMode === 'customer' && (
          <TextField
            size="small" select label="Müşteri seç"
            value={customerFilter}
            onChange={e => setCustomerFilter(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            {allCustomers.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>
        )}
        {viewMode === 'matrix' && (
          <FormControlLabel
            control={<Checkbox checked={showOutdatedOnly} onChange={e => setShowOutdatedOnly(e.target.checked)} size="small" />}
            label="Sadece güncel olmayanlar"
          />
        )}
      </Stack>

      {/* Summary bar */}
      <Paper variant="outlined" sx={{ px: 2, py: 1, mb: 2, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Typography variant="body2"><strong>{stats.customers}</strong> müşteri</Typography>
        <Typography variant="body2"><strong>{stats.total}</strong> eşleştirme</Typography>
        <Typography variant="body2" color={stats.outdated > 0 ? 'warning.main' : 'success.main'}>
          <strong>{stats.outdated}</strong> güncelleme gerekiyor
        </Typography>
        {stats.critical > 0 && (
          <Typography variant="body2" color="error.main">
            <strong>{stats.critical}</strong> major fark
          </Typography>
        )}
      </Paper>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
          <Box key={k} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: v.bg, border: '1px solid #ccc' }} />
            <Typography variant="caption">{v.emoji} {v.label}</Typography>
          </Box>
        ))}
      </Box>

      {mError && <Alert severity="warning" sx={{ mb: 2 }}>Veriler yüklenemedi.</Alert>}
      {mLoading && <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>}

      {/* ─── View: Matrix ─────────────────────────────────────────── */}
      {!mLoading && viewMode === 'matrix' && (
        <>
          {rows.length === 0 && !mError ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">Filtrelerle eşleşen müşteri bulunamadı.</Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '70vh' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, minWidth: 180, position: 'sticky', left: 0, zIndex: 3, bgcolor: 'background.paper' }}>
                      Müşteri
                    </TableCell>
                    {cols.map(p => (
                      <TableCell key={p.id} sx={{ fontWeight: 700, minWidth: 130 }}>
                        <Box>
                          {p.name}
                          <Typography variant="caption" display="block" color="text.secondary">
                            güncel: {productLatest.get(p.id) ?? '—'}
                          </Typography>
                        </Box>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map(([cId, cData]) => (
                    <TableRow key={cId} hover>
                      <TableCell sx={{ fontWeight: 600, position: 'sticky', left: 0, zIndex: 1, bgcolor: 'background.paper' }}>
                        {cData.name}
                      </TableCell>
                      {cols.map(p => {
                        const m = cData.products[p.id];
                        if (!m) return <TableCell key={p.id}><Typography variant="caption" color="text.disabled">—</Typography></TableCell>;
                        const latest = productLatest.get(p.id) ?? m.productVersion.version;
                        const status = versionStatus(m.productVersion.version, latest);
                        const days = staleDays(m.updatedAt);
                        return (
                          <TableCell key={p.id} sx={{ bgcolor: STATUS_CONFIG[status].bg, cursor: 'pointer' }}
                            onClick={(e) => setPopover({ anchor: e.currentTarget as HTMLElement, mapping: m })}>
                            <Chip label={m.productVersion.version} size="small"
                              color={status === 'current' ? 'success' : status === 'minor' ? 'warning' : 'error'}
                              variant={status === 'current' ? 'filled' : 'outlined'} />
                            {status !== 'current' && days > 0 && (
                              <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.25 }}>
                                {days} gün
                              </Typography>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* ─── View: Product-Focused ─────────────────────────────────── */}
      {!mLoading && viewMode === 'product' && (
        <>
          {productFilter === ALL_PRODUCTS ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">Lütfen sol üstten bir ürün seçin.</Typography>
            </Paper>
          ) : (
            <>
              {/* Version distribution */}
              {versionDistribution.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>Versiyon Dağılımı</Typography>
                  <Stack spacing={0.5}>
                    {versionDistribution.map(([ver, count]) => {
                      const pct = (count / productFocusedData.length) * 100;
                      const latest = productLatest.get(productFilter) ?? '';
                      const status = versionStatus(ver, latest);
                      return (
                        <Box key={ver} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ minWidth: 80, fontFamily: 'monospace' }}>{ver}</Typography>
                          <Box sx={{ flexGrow: 1 }}>
                            <LinearProgress
                              variant="determinate" value={pct}
                              color={status === 'current' ? 'success' : status === 'minor' ? 'warning' : 'error'}
                              sx={{ height: 12, borderRadius: 1 }}
                            />
                          </Box>
                          <Typography variant="caption" sx={{ minWidth: 80 }}>
                            {count} müşteri ({Math.round(pct)}%)
                          </Typography>
                        </Box>
                      );
                    })}
                  </Stack>
                </Paper>
              )}

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Müşteri</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Versiyon</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Durum</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>En Güncel</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Eski (gün)</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Aksiyon</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {productFocusedData
                      .filter(m => !search.trim() || m.customer.name.toLowerCase().includes(search.toLowerCase()))
                      .map(m => (
                        <TableRow key={m.id} hover sx={{ bgcolor: STATUS_CONFIG[m.status].bg + '60' }}>
                          <TableCell sx={{ fontWeight: 600 }}>{m.customer.name}</TableCell>
                          <TableCell>
                            <Chip label={m.productVersion.version} size="small"
                              color={m.status === 'current' ? 'success' : m.status === 'minor' ? 'warning' : 'error'}
                              variant="outlined" />
                          </TableCell>
                          <TableCell>{STATUS_CONFIG[m.status].emoji} {STATUS_CONFIG[m.status].label}</TableCell>
                          <TableCell>{m.latest}</TableCell>
                          <TableCell>{m.status !== 'current' ? m.stale : '—'}</TableCell>
                          <TableCell>
                            <Button size="small" variant="text" endIcon={<OpenInNewIcon fontSize="small" />}
                              onClick={() => navigate(`/customer-dashboard/${m.customerId}`)}>
                              Dashboard
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {productFocusedData.length > 0 && (
                <Paper variant="outlined" sx={{ p: 1.5, mt: 2 }}>
                  <Typography variant="body2">
                    ⚠️ <strong>{productFocusedData.filter(m => m.status !== 'current').length}</strong> müşteri güncel değil
                    {productFocusedData.filter(m => m.status === 'major').length > 0 &&
                      <> — <strong>{productFocusedData.filter(m => m.status === 'major').length}</strong> major farkta</>
                    }
                  </Typography>
                </Paper>
              )}
            </>
          )}
        </>
      )}

      {/* ─── View: Customer-Focused ─────────────────────────────────── */}
      {!mLoading && viewMode === 'customer' && (
        <>
          {customerFilter === ALL_CUSTOMERS ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">Lütfen sol üstten bir müşteri seçin.</Typography>
            </Paper>
          ) : (
            <>
              {/* Customer summary */}
              {customerFocusedData.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    🏢 {allCustomers.find(c => c.id === customerFilter)?.name} — Ürün Durumu
                  </Typography>
                  <Stack direction="row" spacing={3}>
                    <Typography variant="body2">
                      <strong>{customerFocusedData.length}</strong> ürün
                    </Typography>
                    <Typography variant="body2" color="success.main">
                      ✅ <strong>{customerFocusedData.filter(m => m.status === 'current').length}</strong> güncel
                    </Typography>
                    <Typography variant="body2" color="warning.main">
                      🟡 <strong>{customerFocusedData.filter(m => m.status === 'minor').length}</strong> minor geride
                    </Typography>
                    <Typography variant="body2" color="error.main">
                      🔴 <strong>{customerFocusedData.filter(m => m.status === 'major').length}</strong> major geride
                    </Typography>
                  </Stack>
                </Paper>
              )}

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Ürün</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Mevcut Versiyon</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>En Güncel</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Durum</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Eski (gün)</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Aksiyon</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {customerFocusedData.map(m => (
                      <TableRow key={m.id} hover sx={{ bgcolor: STATUS_CONFIG[m.status].bg + '60' }}>
                        <TableCell sx={{ fontWeight: 600 }}>{m.productVersion.product.name}</TableCell>
                        <TableCell>
                          <Chip label={m.productVersion.version} size="small"
                            color={m.status === 'current' ? 'success' : m.status === 'minor' ? 'warning' : 'error'}
                            variant="outlined" />
                        </TableCell>
                        <TableCell>{m.latest}</TableCell>
                        <TableCell>{STATUS_CONFIG[m.status].emoji} {STATUS_CONFIG[m.status].label}</TableCell>
                        <TableCell>{m.status !== 'current' ? m.stale : '—'}</TableCell>
                        <TableCell>
                          <Button size="small" variant="text" endIcon={<OpenInNewIcon fontSize="small" />}
                            onClick={() => navigate(`/customer-dashboard/${m.customerId}`)}>
                            Dashboard
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </>
      )}

      {/* ─── Cell Popover (Matrix view) ─────────────────────────────── */}
      <Popover
        open={!!popover}
        anchorEl={popover?.anchor}
        onClose={() => setPopover(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        {popover && (() => {
          const latest = productLatest.get(popover.mapping.productVersion.productId) ?? popover.mapping.productVersion.version;
          const status = versionStatus(popover.mapping.productVersion.version, latest);
          const days = staleDays(popover.mapping.updatedAt);
          return (
            <Box sx={{ p: 2, minWidth: 280 }}>
              <Typography variant="subtitle2" fontWeight={700}>{popover.mapping.customer.name}</Typography>
              <Typography variant="body2" color="text.secondary">{popover.mapping.productVersion.product.name}</Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2"><strong>Müşteri versiyonu:</strong> {popover.mapping.productVersion.version}</Typography>
              <Typography variant="body2"><strong>En güncel:</strong> {latest}</Typography>
              {status !== 'current' && days > 0 && (
                <Typography variant="body2" color="warning.main"><strong>Eski:</strong> {days} gündür güncellenmemiş</Typography>
              )}
              <Box mt={0.5}>
                <Chip size="small" label={STATUS_CONFIG[status].label}
                  color={status === 'current' ? 'success' : status === 'minor' ? 'warning' : 'error'}
                  variant="outlined" />
              </Box>
              <Divider sx={{ my: 1 }} />
              <Button
                size="small" variant="outlined"
                endIcon={<OpenInNewIcon fontSize="small" />}
                onClick={() => {
                  setPopover(null);
                  navigate(`/customer-dashboard/${popover.mapping.customerId}`);
                }}
              >
                Müşteri Dashboard
              </Button>
            </Box>
          );
        })()}
      </Popover>
    </Box>
  );
}
