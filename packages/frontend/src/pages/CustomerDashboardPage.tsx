import { useState } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, CardActions,
  Chip, CircularProgress, Stack, Breadcrumbs, Link,
  Button, Alert, Divider, Tooltip, Paper,
  Snackbar,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  WarningAmber as WarningIcon,
  ArrowBack as ArrowBackIcon,
  ChevronRight as ChevronRightIcon,
  Inventory2 as ProductIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import api from '@/api/client';
import { useAuthStore } from '@/store/authStore';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CustomerDashboardData {
  customer: {
    id: string; name: string; code: string; contactEmail: string | null;
    contactPhone: string | null; address: string | null; notes: string | null;
    isActive: boolean; environments: string[]; ticketPlatform: string | null;
  };
  summary: {
    totalProducts: number;
    onLatestCount: number;
    pendingUpdateCount: number;
    lastDeployDate: string | null;
  };
  productMappings: EnrichedMapping[];
  serviceMappings: ServiceMapping[];
}

interface EnrichedMapping {
  id: string;
  productVersionId: string;
  branch: string | null;
  environment: string | null;
  notes: string | null;
  isActive: boolean;
  subscriptionLevel: string | null;
  productVersion: {
    id: string; version: string; phase: string;
    targetDate: string | null; releaseDate: string | null;
    product: { id: string; name: string };
  };
  latestProductionVersion: { version: string; releaseDate: string | null } | null;
  isOnLatest: boolean;
}

interface ServiceMapping {
  id: string;
  customerId: string;
  serviceId: string;
  port: number | null;
  branch: string | null;
  environment: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Product Card ──────────────────────────────────────────────────────────────

function ProductCard({ mapping, onNavigate }: {
  mapping: EnrichedMapping;
  onNavigate: (productId: string) => void;
}) {
  const current = mapping.productVersion;
  const latest = mapping.latestProductionVersion;
  const needsUpdate = !mapping.isOnLatest && !!latest;
  const deployDate = current.releaseDate ?? current.targetDate;

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '4px solid',
        borderLeftColor: needsUpdate ? 'warning.main' : 'success.main',
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 3 },
      }}
    >
      <CardContent sx={{ flex: 1, pb: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              {current.product.name}
            </Typography>
            {mapping.subscriptionLevel && (
              <Chip size="small" label={mapping.subscriptionLevel} variant="outlined" sx={{ fontSize: 11 }} />
            )}
          </Box>
          {needsUpdate ? (
            <Chip
              icon={<WarningIcon />}
              label="Güncelleme var"
              color="warning"
              size="small"
              sx={{ fontWeight: 600 }}
            />
          ) : (
            <Chip
              icon={<CheckCircleIcon />}
              label="Güncel"
              color="success"
              size="small"
              variant="outlined"
            />
          )}
        </Stack>

        <Stack spacing={0.75}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="text.secondary">Mevcut versiyon</Typography>
            <Chip
              label={current.version}
              color="primary"
              size="small"
              sx={{ fontFamily: 'monospace', fontWeight: 600 }}
            />
          </Stack>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="text.secondary">Son sürüm</Typography>
            {latest ? (
              <Chip
                label={latest.version}
                color={mapping.isOnLatest ? 'success' : 'warning'}
                variant={mapping.isOnLatest ? 'outlined' : 'filled'}
                size="small"
                sx={{ fontFamily: 'monospace', fontWeight: 600 }}
              />
            ) : (
              <Typography variant="caption" color="text.disabled">—</Typography>
            )}
          </Stack>
        </Stack>

        {deployDate && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="caption" color="text.secondary">
              📅 Son deploy: {fmtDate(deployDate)}
            </Typography>
          </>
        )}
      </CardContent>

      <CardActions sx={{ pt: 0, px: 2, pb: 2 }}>
        <Button
          fullWidth
          variant={needsUpdate ? 'contained' : 'outlined'}
          color={needsUpdate ? 'warning' : 'primary'}
          endIcon={<ChevronRightIcon />}
          onClick={() => onNavigate(current.product.id)}
          size="small"
        >
          Versiyonları Gör
        </Button>
      </CardActions>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CustomerDashboardPage() {
  const { id: paramId } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const id = paramId ?? user?.customerId;
  const navigate = useNavigate();
  const [toast, setToast] = useState<string | null>(null);

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data, isLoading, isError } = useQuery<CustomerDashboardData>({
    queryKey: ['customer-dashboard', id],
    queryFn: () => api.get(`/dashboard/customer/${id}`).then((r) => r.data.data),
    enabled: !!id,
  });

  const { data: issuesData } = useQuery<{ data: { id: string }[] }>({
    queryKey: ['my-issues', id],
    queryFn: () => api.get('/transition-issues/my').then((r) => r.data),
    enabled: !!id,
  });

  // ── Derived ───────────────────────────────────────────────────────────────
  const customer = data?.customer;
  const productMappings = data?.productMappings ?? [];
  const updatesNeeded = productMappings.filter((m) => !m.isOnLatest).length;
  const openIssues = issuesData?.data?.length ?? 0;

  const handleViewVersions = (productId: string) => {
    navigate(`/customers/${id}/products/${productId}`);
  };

  // ── Loading / Error ───────────────────────────────────────────────────────
  if (isLoading) {
    return <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>;
  }

  if (isError || !data) {
    return (
      <Box p={3}>
        <Alert severity="error">Müşteri bilgileri yüklenemedi.</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/customer-management')} sx={{ mt: 2 }}>
          Müşteri Yönetimi'ne Dön
        </Button>
      </Box>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box p={3}>
      {/* Breadcrumb */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/customer-management" underline="hover" color="inherit">
          Müşteri Yönetimi
        </Link>
        <Typography color="text.primary">{customer?.name}</Typography>
      </Breadcrumbs>

      {/* Customer header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>{customer?.name}</Typography>
          <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
            <Chip
              size="small"
              label={customer?.isActive ? 'Aktif' : 'Pasif'}
              color={customer?.isActive ? 'success' : 'default'}
              variant="outlined"
            />
            {customer?.code && (
              <Typography variant="body2" color="text.secondary" fontFamily="monospace">
                #{customer.code}
              </Typography>
            )}
          </Stack>
        </Box>
        <Tooltip title="Müşteri Listesine Dön">
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/customer-management')}
            size="small"
          >
            Müşteri Listesi
          </Button>
        </Tooltip>
      </Stack>

      {/* Summary stat chips */}
      <Stack direction="row" spacing={2} mb={3} flexWrap="wrap">
        <Paper variant="outlined" sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <ProductIcon fontSize="small" color="primary" />
          <Box>
            <Typography variant="h6" fontWeight={700} lineHeight={1}>{productMappings.length}</Typography>
            <Typography variant="caption" color="text.secondary">Aktif Ürün</Typography>
          </Box>
        </Paper>

        <Paper
          variant="outlined"
          sx={{
            px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', gap: 1,
            ...(updatesNeeded > 0 ? { borderColor: 'warning.main' } : {}),
          }}
        >
          <WarningIcon fontSize="small" color={updatesNeeded > 0 ? 'warning' : 'disabled'} />
          <Box>
            <Typography
              variant="h6"
              fontWeight={700}
              lineHeight={1}
              color={updatesNeeded > 0 ? 'warning.dark' : 'text.primary'}
            >
              {updatesNeeded}
            </Typography>
            <Typography variant="caption" color="text.secondary">Güncelleme Bekliyor</Typography>
          </Box>
        </Paper>

        {openIssues > 0 && (
          <Paper
            variant="outlined"
            sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', gap: 1, borderColor: 'error.main' }}
          >
            <Box>
              <Typography variant="h6" fontWeight={700} lineHeight={1} color="error.dark">{openIssues}</Typography>
              <Typography variant="caption" color="text.secondary">Açık Sorun</Typography>
            </Box>
          </Paper>
        )}
      </Stack>

      {/* Section label */}
      <Typography
        variant="caption"
        fontWeight={700}
        color="text.secondary"
        sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 2 }}
      >
        Ürünler
      </Typography>

      {/* Product cards */}
      {productMappings.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            Bu müşteriye henüz ürün atanmamış. Müşteri Yönetimi üzerinden ürün ekleyebilirsiniz.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {productMappings.map((mapping) => (
            <Grid key={mapping.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <ProductCard
                mapping={mapping}
                onNavigate={handleViewVersions}
              />
            </Grid>
          ))}
        </Grid>
      )}

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
