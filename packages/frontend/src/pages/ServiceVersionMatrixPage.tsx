import { useState, useMemo, useCallback, useRef } from 'react';
import {
  Box, Typography, Paper, Chip, Popover, Divider, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert,
  Stack, TextField, MenuItem, FormControlLabel, Checkbox, Button,
  ToggleButton, ToggleButtonGroup, LinearProgress, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import {
  OpenInNew as OpenInNewIcon,
  GridView as MatrixIcon,
  Category as ProductIcon,
  Business as CustomerIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/api/client';
import * as XLSX from 'xlsx';
import {
  fetchMatrix, MatrixCell,
} from '@/api/serviceVersionMatrixService';

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
  CURRENT:  { bg: '#e8f5e9', label: 'Güncel', emoji: '✅' },
  WARNING:  { bg: '#fff8e1', label: 'Uyarı', emoji: '🟡' },
  CRITICAL: { bg: '#ffebee', label: 'Kritik', emoji: '🔴' },
  UNKNOWN:  { bg: '#f5f5f5', label: 'Bilinmiyor', emoji: '❓' },
};

function downloadXlsx(filename: string, headers: string[], rows: string[][]) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  // Auto-width for columns
  ws['!cols'] = headers.map(() => ({ wch: 20 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rapor');
  XLSX.writeFile(wb, filename);
}

function downloadPdf(filename: string, headers: string[], rows: string[][]) {
  const tableHtml = `
    <html>
      <head><title>${filename}</title>
        <style>
          body { font-family: Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; font-size: 11px; }
          th, td { border: 1px solid #ccc; padding: 5px 8px; }
          th { background: #f0f0f0; font-weight: bold; }
          tr:nth-child(even) { background: #fafafa; }
        </style>
      </head>
      <body>
        <h3 style="margin-bottom:12px">${filename.replace('.pdf', '')}</h3>
        <table>
          <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
          <tbody>
            ${rows.map(row => `<tr>${row.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
        <script>window.onload = function() { window.print(); }<\/script>
      </body>
    </html>
  `;
  const blob = new Blob([tableHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

const ALL_PRODUCTS = '__ALL__';
const ALL_CUSTOMERS = '__ALL__';

// ─── Import Dialog ────────────────────────────────────────────────────────────

type ImportRecord = { serviceId: string; productVersionId: string; prodVersion?: string; prepVersion?: string };

function parseCsvToRecords(text: string): ImportRecord[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => { rec[h] = vals[i] ?? ''; });
    return {
      serviceId: rec['serviceId'] ?? rec['service_id'] ?? '',
      productVersionId: rec['productVersionId'] ?? rec['product_version_id'] ?? '',
      prodVersion: rec['prodVersion'] ?? rec['prod_version'] ?? undefined,
      prepVersion: rec['prepVersion'] ?? rec['prep_version'] ?? undefined,
    };
  }).filter(r => r.serviceId && r.productVersionId);
}

function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [records, setRecords] = useState<ImportRecord[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ created: number; updated: number; failed: number } | null>(null);

  const importMutation = useMutation({
    mutationFn: (recs: ImportRecord[]) =>
      apiClient.post('/service-versions/bootstrap', { records: recs }).then(r => r.data),
    onSuccess: (data) => {
      setImportResult(data.data);
      queryClient.invalidateQueries({ queryKey: ['service-versions'] });
    },
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          const arr = Array.isArray(parsed) ? parsed : parsed.records ?? [];
          setRecords(arr);
        } else {
          setRecords(parseCsvToRecords(text));
        }
      } catch {
        setParseError('Dosya parse edilemedi. JSON veya CSV formatı bekleniyor.');
      }
    };
    reader.readAsText(file);
  };

  const handleClose = () => {
    setRecords([]);
    setParseError(null);
    setImportResult(null);
    if (fileRef.current) fileRef.current.value = '';
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Servis Versiyon İçe Aktarma</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Alert severity="info" sx={{ fontSize: 12 }}>
            CSV formatı: <code>serviceId,productVersionId,prodVersion,prepVersion</code>
            <br />
            JSON formatı: <code>{'[{serviceId, productVersionId, prodVersion?, prepVersion?}]'}</code>
          </Alert>

          <Button
            variant="outlined"
            component="label"
            startIcon={<UploadIcon />}
          >
            Dosya Seç (.csv / .json)
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.json"
              hidden
              onChange={handleFile}
            />
          </Button>

          {parseError && <Alert severity="error">{parseError}</Alert>}

          {records.length > 0 && !importResult && (
            <Alert severity="success">
              <strong>{records.length}</strong> kayıt tespit edildi. İçe aktarmak için onaylayın.
            </Alert>
          )}

          {importResult && (
            <Alert severity="success">
              ✅ İçe aktarma tamamlandı — Oluşturulan: <strong>{importResult.created}</strong>,
              Güncellenen: <strong>{importResult.updated}</strong>,
              Başarısız: <strong>{importResult.failed}</strong>
            </Alert>
          )}

          {importMutation.isError && (
            <Alert severity="error">İçe aktarma başarısız. Kayıtların geçerli olduğundan emin olun.</Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Kapat</Button>
        <Button
          variant="contained"
          disabled={records.length === 0 || importMutation.isPending || !!importResult}
          onClick={() => importMutation.mutate(records)}
        >
          {importMutation.isPending ? 'İçe Aktarılıyor...' : `${records.length} Kaydı Aktar`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ServiceVersionMatrixPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('matrix');
  const [popover, setPopover] = useState<{ anchor: HTMLElement; mapping: CustomerMapping } | null>(null);
  const [productFilter, setProductFilter] = useState<string>(ALL_PRODUCTS);
  const [customerFilter, setCustomerFilter] = useState<string>(ALL_CUSTOMERS);
  const [search, setSearch] = useState('');
  const [showOutdatedOnly, setShowOutdatedOnly] = useState(false);
  const [importDlgOpen, setImportDlgOpen] = useState(false);

  const { data: mappings = [], isLoading: mLoading, error: mError } = useQuery<CustomerMapping[]>({
    queryKey: ['customer-product-mappings'],
    queryFn: () => apiClient.get('/customer-product-mappings').then(r => r.data.data ?? r.data),
  });

  // New service-level matrix data from CustomerServiceVersion API
  const { data: matrixCells = [], isLoading: matrixLoading } = useQuery<MatrixCell[]>({
    queryKey: ['service-version-matrix', productFilter === ALL_PRODUCTS ? undefined : productFilter],
    queryFn: () => fetchMatrix(productFilter !== ALL_PRODUCTS ? { productId: productFilter } : undefined),
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

  // ─── Service-Level Matrix (new CustomerServiceVersion API) ─────────────────
  const allServices = useMemo(() => {
    const m = new Map<string, { id: string; name: string; productId: string; productName: string }>();
    for (const c of matrixCells) {
      if (!m.has(c.serviceId)) {
        m.set(c.serviceId, { id: c.serviceId, name: c.serviceName, productId: c.productId, productName: c.productName });
      }
    }
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [matrixCells]);

  const serviceMatrixMap = useMemo(() => {
    const m = new Map<string, Map<string, MatrixCell>>();
    for (const c of matrixCells) {
      if (!m.has(c.customerId)) m.set(c.customerId, new Map());
      m.get(c.customerId)!.set(c.serviceId, c);
    }
    return m;
  }, [matrixCells]);

  const serviceCustomers = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of matrixCells) m.set(c.customerId, c.customerName);
    return [...m.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [matrixCells]);

  const serviceRows = useMemo(() => {
    let entries = serviceCustomers;
    if (search.trim()) {
      const q = search.toLowerCase();
      entries = entries.filter(c => c.name.toLowerCase().includes(q));
    }
    if (customerFilter !== ALL_CUSTOMERS) {
      entries = entries.filter(c => c.id === customerFilter);
    }
    if (showOutdatedOnly) {
      entries = entries.filter(c => {
        const svcMap = serviceMatrixMap.get(c.id);
        if (!svcMap) return false;
        return allServices.some(s => {
          const cell = svcMap.get(s.id);
          return cell && (cell.status === 'WARNING' || cell.status === 'CRITICAL');
        });
      });
    }
    return entries;
  }, [serviceCustomers, search, customerFilter, showOutdatedOnly, serviceMatrixMap, allServices]);

  const serviceStats = useMemo(() => {
    let total = 0, outdated = 0, critical = 0;
    for (const c of serviceCustomers) {
      const svcMap = serviceMatrixMap.get(c.id);
      if (!svcMap) continue;
      for (const s of allServices) {
        const cell = svcMap.get(s.id);
        if (!cell) continue;
        total++;
        if (cell.status === 'WARNING') outdated++;
        if (cell.status === 'CRITICAL') { outdated++; critical++; }
      }
    }
    return { total, outdated, critical, customers: serviceCustomers.length };
  }, [serviceCustomers, serviceMatrixMap, allServices]);

  // Use service-level data for matrix view when available, fall back to product-level
  const useServiceMatrix = viewMode === 'matrix' && matrixCells.length > 0;

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

  // Export handler (XLSX)
  const handleExportXlsx = useCallback(() => {
    if (viewMode === 'matrix') {
      const headers = ['Müşteri', ...cols.map(p => p.name)];
      const xlsxRows = rows.map(([, c]) =>
        [c.name, ...cols.map(p => c.products[p.id]?.productVersion.version ?? '—')]
      );
      downloadXlsx('versiyon-matrisi.xlsx', headers, xlsxRows);
    } else if (viewMode === 'product') {
      const headers = ['Müşteri', 'Versiyon', 'Durum', 'En Güncel', 'Eski (gün)'];
      const xlsxRows = productFocusedData.map(m => [
        m.customer.name, m.productVersion.version,
        STATUS_CONFIG[m.status].label, m.latest, String(m.stale),
      ]);
      downloadXlsx('urun-odakli-rapor.xlsx', headers, xlsxRows);
    } else {
      const headers = ['Ürün', 'Versiyon', 'Durum', 'En Güncel', 'Eski (gün)'];
      const xlsxRows = customerFocusedData.map(m => [
        m.productVersion.product.name, m.productVersion.version,
        STATUS_CONFIG[m.status].label, m.latest, String(m.stale),
      ]);
      downloadXlsx('musteri-odakli-rapor.xlsx', headers, xlsxRows);
    }
  }, [viewMode, cols, rows, productFocusedData, customerFocusedData]);

  // Export handler (PDF)
  const handleExportPdf = useCallback(() => {
    if (viewMode === 'matrix') {
      const headers = ['Müşteri', ...cols.map(p => p.name)];
      const pdfRows = rows.map(([, c]) =>
        [c.name, ...cols.map(p => c.products[p.id]?.productVersion.version ?? '—')]
      );
      downloadPdf('versiyon-matrisi.pdf', headers, pdfRows);
    } else if (viewMode === 'product') {
      const headers = ['Müşteri', 'Versiyon', 'Durum', 'En Güncel', 'Eski (gün)'];
      const pdfRows = productFocusedData.map(m => [
        m.customer.name, m.productVersion.version,
        STATUS_CONFIG[m.status].label, m.latest, String(m.stale),
      ]);
      downloadPdf('urun-odakli-rapor.pdf', headers, pdfRows);
    } else {
      const headers = ['Ürün', 'Versiyon', 'Durum', 'En Güncel', 'Eski (gün)'];
      const pdfRows = customerFocusedData.map(m => [
        m.productVersion.product.name, m.productVersion.version,
        STATUS_CONFIG[m.status].label, m.latest, String(m.stale),
      ]);
      downloadPdf('musteri-odakli-rapor.pdf', headers, pdfRows);
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
          <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportXlsx}>
            Excel İndir
          </Button>
          <Button size="small" variant="outlined" color="secondary" startIcon={<DownloadIcon />} onClick={handleExportPdf}>
            PDF İndir
          </Button>
          <Button size="small" variant="contained" color="info" startIcon={<UploadIcon />} onClick={() => setImportDlgOpen(true)}>
            İçe Aktar
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
      {(() => {
        const s = useServiceMatrix ? serviceStats : stats;
        return (
          <Paper variant="outlined" sx={{ px: 2, py: 1, mb: 2, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Typography variant="body2"><strong>{s.customers}</strong> müşteri</Typography>
            <Typography variant="body2"><strong>{s.total}</strong> {useServiceMatrix ? 'servis eşleşmesi' : 'eşleştirme'}</Typography>
            <Typography variant="body2" color={s.outdated > 0 ? 'warning.main' : 'success.main'}>
              <strong>{s.outdated}</strong> güncelleme gerekiyor
            </Typography>
            {s.critical > 0 && (
              <Typography variant="body2" color="error.main">
                <strong>{s.critical}</strong> kritik fark
              </Typography>
            )}
            {useServiceMatrix && (
              <Chip label="Servis Düzeyi Matris" size="small" color="info" variant="outlined" />
            )}
          </Paper>
        );
      })()}

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
      {(mLoading || matrixLoading) && <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>}

      {/* ─── View: Matrix ─────────────────────────────────────────── */}
      {!mLoading && !matrixLoading && viewMode === 'matrix' && (
        <>
          {/* Service-Level Matrix (new CustomerServiceVersion API) */}
          {useServiceMatrix ? (
            serviceRows.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">Servis versiyon verisi bulunamadı. Bootstrap yapın veya geçiş tamamlayın.</Typography>
              </Paper>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '70vh' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, minWidth: 180, position: 'sticky', left: 0, zIndex: 3, bgcolor: 'background.paper' }}>
                        Müşteri
                      </TableCell>
                      {allServices.map(s => (
                        <TableCell key={s.id} sx={{ fontWeight: 700, minWidth: 130 }}>
                          <Box>
                            {s.name}
                            <Typography variant="caption" display="block" color="text.secondary">
                              {s.productName}
                            </Typography>
                          </Box>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {serviceRows.map(c => (
                      <TableRow key={c.id} hover>
                        <TableCell sx={{ fontWeight: 600, position: 'sticky', left: 0, zIndex: 1, bgcolor: 'background.paper' }}>
                          {c.name}
                        </TableCell>
                        {allServices.map(s => {
                          const cell = serviceMatrixMap.get(c.id)?.get(s.id);
                          if (!cell) return <TableCell key={s.id}><Typography variant="caption" color="text.disabled">—</Typography></TableCell>;
                          const statusKey = cell.status as string;
                          const cfg = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.UNKNOWN;
                          return (
                            <TableCell key={s.id} sx={{ bgcolor: cfg.bg }}>
                              <Chip
                                label={cell.currentRelease ?? '—'} size="small"
                                color={cell.status === 'CURRENT' ? 'success' : cell.status === 'WARNING' ? 'warning' : cell.status === 'CRITICAL' ? 'error' : 'default'}
                                variant={cell.status === 'CURRENT' ? 'filled' : 'outlined'}
                              />
                              {cell.staleCount > 0 && (
                                <Tooltip title={`En güncel: ${cell.latestRelease ?? '—'}`}>
                                  <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.25 }}>
                                    {cell.staleCount} versiyon geride
                                  </Typography>
                                </Tooltip>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )
          ) : (
            /* Fallback: Product-Level Matrix (old CustomerProductMapping API) */
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

      <ImportDialog open={importDlgOpen} onClose={() => setImportDlgOpen(false)} />
    </Box>
  );
}
