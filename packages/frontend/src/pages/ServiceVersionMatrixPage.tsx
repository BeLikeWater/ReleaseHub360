import { useState } from 'react';
import {
  Box, Typography, Paper, Chip, Popover, Divider, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';

type CustomerMapping = {
  id: string;
  customerId: string;
  productVersionId: string;
  customer: { id: string; name: string };
  productVersion: {
    id: string; version: string; productId: string;
    product: { id: string; name: string };
  };
};

type Product = { id: string; name: string; currentVersion?: string };

function versionStatus(customerVersion: string, latestVersion: string): 'current' | 'minor' | 'major' {
  const [cMaj, cMin = '0'] = customerVersion.split('.');
  const [lMaj, lMin = '0'] = latestVersion.split('.');
  if (cMaj !== lMaj) return 'major';
  if (cMin !== lMin) return 'minor';
  return 'current';
}

const STATUS_COLORS: Record<string, { bg: string; label: string }> = {
  current: { bg: '#e8f5e9', label: 'Güncel' },
  minor: { bg: '#fff8e1', label: 'Minor Güncelleme Var' },
  major: { bg: '#ffebee', label: 'Major Güncelleme Gerekli' },
};

export default function ServiceVersionMatrixPage() {
  const [popover, setPopover] = useState<{ anchor: HTMLElement; mapping: CustomerMapping } | null>(null);

  const { data: mappings = [], isLoading: mLoading, error: mError } = useQuery<CustomerMapping[]>({
    queryKey: ['customer-product-mappings'],
    queryFn: () => apiClient.get('/customer-product-mappings').then(r => r.data.data ?? r.data),
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products-for-matrix'],
    queryFn: () => apiClient.get('/products').then(r => r.data.data ?? r.data),
  });

  // Build matrix: customers (rows) x products (cols)
  const customerMap = new Map<string, { name: string; products: Record<string, CustomerMapping> }>();
  for (const m of mappings) {
    if (!customerMap.has(m.customerId)) {
      customerMap.set(m.customerId, { name: m.customer.name, products: {} });
    }
    customerMap.get(m.customerId)!.products[m.productVersion.productId] = m;
  }

  const productLatest = new Map<string, string>();
  for (const p of products) { if (p.currentVersion) productLatest.set(p.id, p.currentVersion); }
  // fallback: max version per product from mappings
  for (const m of mappings) {
    const pid = m.productVersion.productId;
    const cur = productLatest.get(pid);
    if (!cur || m.productVersion.version > cur) productLatest.set(pid, m.productVersion.version);
  }

  const cols = products.length > 0
    ? products
    : [...new Map(mappings.map(m => [m.productVersion.productId, { id: m.productVersion.productId, name: m.productVersion.product.name }]))].map(([, v]) => v);

  const rows = [...customerMap.entries()];

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>Servis Versiyon Matrisi</Typography>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_COLORS).map(([k, v]) => (
          <Box key={k} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: v.bg, border: '1px solid #ccc' }} />
            <Typography variant="caption">{v.label}</Typography>
          </Box>
        ))}
      </Box>

      {mError && <Alert severity="warning" sx={{ mb: 2 }}>Veriler yüklenemedi.</Alert>}
      {mLoading && <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>}

      {!mLoading && rows.length === 0 && !mError && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">Müşteri-ürün eşleştirmesi bulunamadı.</Typography>
        </Paper>
      )}

      {rows.length > 0 && (
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '70vh' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, minWidth: 180, position: 'sticky', left: 0, zIndex: 3, bgcolor: 'background.paper' }}>
                  Müşteri
                </TableCell>
                {cols.map(p => (
                  <TableCell key={p.id} sx={{ fontWeight: 700, minWidth: 130 }}>{p.name}</TableCell>
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
                    return (
                      <TableCell key={p.id} sx={{ bgcolor: STATUS_COLORS[status].bg, cursor: 'pointer' }}
                        onClick={(e) => setPopover({ anchor: e.currentTarget as HTMLElement, mapping: m })}>
                        <Chip label={m.productVersion.version} size="small"
                          color={status === 'current' ? 'success' : status === 'minor' ? 'warning' : 'error'}
                          variant={status === 'current' ? 'filled' : 'outlined'} />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Cell Popover */}
      <Popover
        open={!!popover}
        anchorEl={popover?.anchor}
        onClose={() => setPopover(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        {popover && (
          <Box sx={{ p: 2, minWidth: 220 }}>
            <Typography variant="subtitle2" fontWeight={700}>{popover.mapping.customer.name}</Typography>
            <Typography variant="body2" color="text.secondary">{popover.mapping.productVersion.product.name}</Typography>
            <Divider sx={{ my: 1 }} />
            <Typography variant="body2"><strong>Versiyon:</strong> {popover.mapping.productVersion.version}</Typography>
            <Typography variant="body2"><strong>En Güncel:</strong> {productLatest.get(popover.mapping.productVersion.productId) ?? '—'}</Typography>
          </Box>
        )}
      </Popover>
    </Box>
  );
}
