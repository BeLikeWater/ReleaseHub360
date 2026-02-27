import { Box, Grid, Paper, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';

export default function HomeDashboardPage() {
  const { data } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => (await apiClient.get('/dashboard/summary')).data.data,
  });

  const stats = [
    { label: 'Toplam Ürün', value: data?.totalProducts ?? '—' },
    { label: 'Toplam Müşteri', value: data?.totalCustomers ?? '—' },
    { label: 'Bekleyen Hotfix', value: data?.pendingHotfixes ?? '—' },
    { label: 'Aktif Sürüm', value: data?.activeVersions ?? '—' },
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>Dashboard</Typography>
      <Grid container spacing={2}>
        {stats.map((s) => (
          <Grid key={s.label} size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="h4" fontWeight={700}>{s.value}</Typography>
              <Typography variant="body2" color="text.secondary">{s.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
