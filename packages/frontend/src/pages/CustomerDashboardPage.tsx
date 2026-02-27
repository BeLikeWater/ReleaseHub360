import React, { useState } from 'react';
import {
  Box, Typography, Tabs, Tab, Card, CardContent, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, CircularProgress, Stack, Breadcrumbs, Link,
  LinearProgress, Button,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  WarningAmber as WarningIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import api from '@/api/client';

interface Customer {
  id: string;
  name: string;
  code: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
}

interface CustomerProductMapping {
  id: string;
  customerId: string;
  productVersionId: string;
  branch?: string;
  environment?: string;
  notes?: string;
  productVersion: {
    id: string;
    version: string;
    phase: string;
    targetDate?: string;
    releaseDate?: string;
    product: { id: string; name: string };
  };
}

const PHASE_ORDER = ['PLANNED', 'DEVELOPMENT', 'RC', 'STAGING', 'PRODUCTION', 'ARCHIVED'];

const phaseColor = (phase: string) => {
  const map: Record<string, 'default' | 'info' | 'warning' | 'success' | 'error' | 'primary' | 'secondary'> = {
    PLANNED: 'default', DEVELOPMENT: 'info', RC: 'primary',
    STAGING: 'warning', PRODUCTION: 'success', ARCHIVED: 'default',
  };
  return map[phase] ?? 'default';
};

function StatCard({ title, value }: { title: string; value: React.ReactNode }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h4" fontWeight={700}>{value}</Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>{title}</Typography>
      </CardContent>
    </Card>
  );
}

export default function CustomerDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);

  const { data: customer, isLoading: loadingCustomer } = useQuery<Customer>({
    queryKey: ['customer', id],
    queryFn: () => api.get(`/customers/${id}`).then((r) => r.data.data ?? r.data),
    enabled: !!id,
  });

  const { data: mappings = [], isLoading: loadingMappings } = useQuery<CustomerProductMapping[]>({
    queryKey: ['customer-product-mappings', id],
    queryFn: () => api.get(`/customer-product-mappings?customerId=${id}`).then((r) => r.data.data ?? r.data),
    enabled: !!id,
  });

  if (loadingCustomer) {
    return <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>;
  }

  if (!customer) {
    return (
      <Box p={3}>
        <Typography color="error">Müşteri bulunamadı.</Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/customers')} sx={{ mt: 2 }}>
          Müşteri Yönetimi'ne Dön
        </Button>
      </Box>
    );
  }

  const productionPhaseIdx = PHASE_ORDER.indexOf('PRODUCTION');
  const pendingUpdates = mappings.filter((m) => {
    const idx = PHASE_ORDER.indexOf(m.productVersion.phase);
    return idx < productionPhaseIdx;
  });

  const latestVersion = mappings.length > 0
    ? mappings.sort((a, b) =>
        PHASE_ORDER.indexOf(b.productVersion.phase) - PHASE_ORDER.indexOf(a.productVersion.phase)
      )[0]?.productVersion.version
    : '-';

  const lastDeploy = mappings
    .filter((m) => m.productVersion.releaseDate)
    .sort((a, b) => new Date(b.productVersion.releaseDate!).getTime() - new Date(a.productVersion.releaseDate!).getTime())[0]
    ?.productVersion.releaseDate;

  return (
    <Box p={3}>
      {/* Breadcrumb */}
      <Breadcrumbs sx={{ mb: 1 }}>
        <Link component={RouterLink} to="/customers" color="inherit" underline="hover">
          Müşteri Yönetimi
        </Link>
        <Typography color="text.primary">{customer.name}</Typography>
      </Breadcrumbs>

      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight={700}>
          Müşteri Dashboard: {customer.name}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Chip label={customer.code} variant="outlined" size="small" />
          <Chip
            label={customer.isActive ? 'Aktif' : 'Pasif'}
            color={customer.isActive ? 'success' : 'default'}
            size="small"
          />
        </Stack>
      </Stack>

      {/* Stat Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="Aktif Ürün" value={mappings.length} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="Bekleyen Güncelleme" value={pendingUpdates.length} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="En Son Versiyon" value={latestVersion} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Son Deploy"
            value={lastDeploy ? new Date(lastDeploy).toLocaleDateString('tr-TR') : '-'}
          />
        </Grid>
      </Grid>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Özet" />
        <Tab label="Release Takibi" />
      </Tabs>

      {tab === 0 && (
        <SummaryTab mappings={mappings} loading={loadingMappings} />
      )}
      {tab === 1 && (
        <ReleaseTrackingTab mappings={mappings} loading={loadingMappings} />
      )}
    </Box>
  );
}

function SummaryTab({ mappings, loading }: { mappings: CustomerProductMapping[]; loading: boolean }) {
  if (loading) return <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>;

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell>Ürün</TableCell>
            <TableCell>Müşteri Versiyonu</TableCell>
            <TableCell>Aşama</TableCell>
            <TableCell>Branch</TableCell>
            <TableCell>Ortam</TableCell>
            <TableCell>Durum</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {mappings.map((m) => {
            const isProduction = m.productVersion.phase === 'PRODUCTION';
            return (
              <TableRow key={m.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {m.productVersion.product.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {m.productVersion.version}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip size="small" label={m.productVersion.phase} color={phaseColor(m.productVersion.phase)} />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">{m.branch ?? '-'}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">{m.environment ?? '-'}</Typography>
                </TableCell>
                <TableCell>
                  {isProduction ? (
                    <Chip
                      size="small"
                      icon={<CheckCircleIcon fontSize="small" />}
                      label="Güncel"
                      color="success"
                      variant="outlined"
                    />
                  ) : (
                    <Chip
                      size="small"
                      icon={<WarningIcon fontSize="small" />}
                      label="Güncelleme var"
                      color="warning"
                      variant="outlined"
                    />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
          {mappings.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                Ürün eşleştirmesi bulunamadı
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function ReleaseTrackingTab({ mappings, loading }: { mappings: CustomerProductMapping[]; loading: boolean }) {
  if (loading) return <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>;

  return (
    <Stack spacing={3}>
      {mappings.map((m) => {
        const phaseIdx = PHASE_ORDER.indexOf(m.productVersion.phase);
        const progress = Math.round((phaseIdx / (PHASE_ORDER.length - 1)) * 100);

        return (
          <Paper key={m.id} variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle1" fontWeight={600}>
                {m.productVersion.product.name}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" fontFamily="monospace" color="text.secondary">
                  {m.productVersion.version}
                </Typography>
                <Chip size="small" label={m.productVersion.phase} color={phaseColor(m.productVersion.phase)} />
              </Stack>
            </Stack>

            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ height: 8, borderRadius: 1, mb: 1 }}
              color={m.productVersion.phase === 'PRODUCTION' ? 'success' : 'primary'}
            />

            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">
                {PHASE_ORDER[0]}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {m.productVersion.phase} ({progress}%)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {m.productVersion.targetDate
                  ? `Hedef: ${new Date(m.productVersion.targetDate).toLocaleDateString('tr-TR')}`
                  : 'Hedef tarih yok'}
              </Typography>
            </Stack>
          </Paper>
        );
      })}

      {mappings.length === 0 && (
        <Typography color="text.secondary" align="center">
          Release takibi için ürün eşleştirmesi bulunamadı
        </Typography>
      )}
    </Stack>
  );
}
