import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Collapse,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  TextField,
  MenuItem,
  Tooltip,
  Card,
  CardContent,
  Grid,
  CircularProgress,
} from '@mui/material';
import { db } from '../firebase';
import { collection, getDocs, query } from 'firebase/firestore';
import {
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowUp as ExpandLessIcon,
  Visibility as ViewIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  HourglassEmpty as PendingIcon,
  Build as ManualIcon,
  BugReport as HotfixIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';

const CustomerReleaseTrackV2 = () => {
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [filterCustomer, setFilterCustomer] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Firebase'den müşterileri çek
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      console.log('🔍 Müşteriler Firebase\'den çekiliyor...');

      const collectionNames = ['Customers', 'customers', 'Customer', 'customer'];
      let foundCollection = null;
      let customersSnapshot = null;

      for (const collectionName of collectionNames) {
        try {
          const testRef = collection(db, collectionName);
          const testSnapshot = await getDocs(query(testRef));

          if (testSnapshot.size > 0) {
            console.log(`✅ Collection bulundu: "${collectionName}" - ${testSnapshot.size} müşteri`);
            foundCollection = collectionName;
            customersSnapshot = testSnapshot;
            break;
          }
        } catch (error) {
          console.log(`❌ "${collectionName}" bulunamadı`);
        }
      }

      if (!foundCollection || !customersSnapshot) {
        console.log('⚠️ Customers collection bulunamadı');
        setCustomers([]);
        setLoading(false);
        return;
      }

      const fetchedCustomers = [];
      customersSnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedCustomers.push({
          id: doc.id,
          name: data.name || 'İsimsiz Müşteri',
          environments: data.environments || ['Dev', 'Test', 'Prod']
        });
      });

      console.log('✅ Müşteriler yüklendi:', fetchedCustomers.length);
      setCustomers(fetchedCustomers);
    } catch (error) {
      console.error('❌ Müşteriler yüklenirken hata:', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  // Component mount olduğunda müşterileri çek
  useEffect(() => {
    fetchCustomers();
  }, []);

  // Mock Data - Release geçişleri
  const releases = [
    {
      id: 3,
      customer: 'KT Bank AG',
      environment: 'Prod',
      version: 'v1.2.0',
      description: 'HIPAA compliance güncellemeleri',
      startTime: new Date('2025-10-19T10:00:00'),
      endTime: null, // Devam ediyor
      status: 'in-progress',
      issues: [
        {
          id: 301,
          service: 'Dosya yönetimi servisi',
          version: '1.0.20251009.4',
          summary: 'S3 bucket access denied hatası',
          status: 'pending',
          assignedTo: 'Fatma Şahin',
          reportedAt: new Date('2025-10-19T10:25:00'),
          resolvedAt: null,
          resolutionType: null,
          resolutionDetails: null,
          podLog: `[2025-10-19 10:25:18] ERROR: Access Denied - S3 bucket: healthcare-prod-files
[2025-10-19 10:25:18] Action: PutObject
[2025-10-19 10:25:18] ERROR: User does not have permission
[2025-10-19 10:25:19] WARN: File upload failed for patient-records/2025/file.pdf
[2025-10-19 10:26:00] INFO: Investigating IAM role permissions...`,
        },
      ],
    },
    {
      id: 2,
      customer: 'KT Bank AG',
      environment: 'Prod',
      version: 'v1.1.0',
      description: 'Kritik güvenlik yaması ve performans iyileştirmeleri',
      startTime: new Date('2025-10-19T14:00:00'),
      endTime: new Date('2025-10-19T15:30:00'),
      status: 'completed',
      issues: [
        {
          id: 201,
          service: 'Worker servis API',
          version: '1.0.20251027.2',
          summary: 'Database migration hatası - foreign key constraint',
          status: 'resolved',
          assignedTo: 'Ayşe Demir',
          reportedAt: new Date('2025-10-19T14:20:00'),
          resolvedAt: new Date('2025-10-19T14:55:00'),
          resolutionType: 'hotfix',
          resolutionDetails: 'v1.24.0-prod.23 hotfix ile migration script düzeltildi',
          podLog: `[2025-10-19 14:20:15] ERROR: Migration failed: foreign key constraint violation
[2025-10-19 14:20:15] Details: ALTER TABLE payments ADD CONSTRAINT fk_user_id 
[2025-10-19 14:20:15] ERROR: Cannot add foreign key constraint
[2025-10-19 14:20:16] Rolling back migration...
[2025-10-19 14:54:30] INFO: Applying hotfix v1.24.0-prod.23
[2025-10-19 14:55:12] INFO: Migration completed successfully`,
        }
      ],
    },
    {
      id: 5,
      customer: 'KT Bank AG',
      environment: 'Prod',
      version: 'v1.0.0',
      description: 'ERP entegrasyon güncellemesi',
      startTime: new Date('2025-10-19T07:00:00'),
      endTime: new Date('2025-10-19T07:20:00'),
      status: 'completed',
      issues: [],
    },
  ];

  // Müşteri listesi (Firebase'den gelen)
  const uniqueCustomers = customers.map(c => c.name);

  // Durum renkleri
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in-progress':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getIssueStatusColor = (status) => {
    switch (status) {
      case 'resolved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'in-progress':
        return 'info';
      default:
        return 'default';
    }
  };

  const getResolutionIcon = (type) => {
    switch (type) {
      case 'manual':
        return <ManualIcon fontSize="small" />;
      case 'hotfix':
        return <HotfixIcon fontSize="small" />;
      default:
        return null;
    }
  };

  // Süre hesaplama
  const calculateDuration = (start, end) => {
    if (!end) return 'Devam ediyor...';
    const diff = end - start;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}s ${mins}dk` : `${mins}dk`;
  };

  // Log dialog
  const handleOpenLog = (log) => {
    setSelectedLog(log);
    setLogDialogOpen(true);
  };

  const handleCloseLog = () => {
    setLogDialogOpen(false);
    setSelectedLog(null);
  };

  // Filtreleme
  const filteredReleases = releases.filter((release) => {
    if (filterCustomer !== 'all' && release.customer !== filterCustomer) return false;
    if (filterStatus !== 'all' && release.status !== filterStatus) return false;
    return true;
  });

  // Loading durumu
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Başlık */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Müşteri Release Takibi
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Müşteri release geçişlerini ve karşılaşılan sorunları izleyin
        </Typography>

        {/* Filtreler */}
        <Stack direction="row" spacing={2} mt={3}>
          <TextField
            select
            label="Müşteri"
            value={filterCustomer}
            onChange={(e) => setFilterCustomer(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="all">Tüm Müşteriler</MenuItem>
            {uniqueCustomers.map((customer) => (
              <MenuItem key={customer} value={customer}>
                {customer}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Durum"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            size="small"
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="all">Tüm Durumlar</MenuItem>
            <MenuItem value="completed">Tamamlandı</MenuItem>
            <MenuItem value="in-progress">Devam Ediyor</MenuItem>
            <MenuItem value="failed">Başarısız</MenuItem>
          </TextField>
        </Stack>

        {/* İstatistikler */}
        <Grid container spacing={2} mt={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography color="text.secondary" variant="caption">
                  Toplam Geçiş
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {releases.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography color="text.secondary" variant="caption">
                  Tamamlanan
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {releases.filter(r => r.status === 'completed').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography color="text.secondary" variant="caption">
                  Devam Eden
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="warning.main">
                  {releases.filter(r => r.status === 'in-progress').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card variant="outlined">
              <CardContent>
                <Typography color="text.secondary" variant="caption">
                  Toplam Sorun
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="error.main">
                  {releases.reduce((sum, r) => sum + r.issues.length, 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Ana Tablo - Release Geçişleri */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#1976d2' }}>
              <TableCell sx={{ color: 'white', width: 50 }} />
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Müşteri</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Ortam</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Versiyon</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Açıklama</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Başlama</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Bitiş</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Süre</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Durum</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Sorunlar</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredReleases.map((release) => (
              <React.Fragment key={release.id}>
                <TableRow
                  sx={{
                    '&:hover': { bgcolor: 'action.hover' },
                    bgcolor: selectedRelease === release.id ? 'action.selected' : 'inherit',
                  }}
                >
                  <TableCell>
                    {release.issues.length > 0 && (
                      <IconButton
                        size="small"
                        onClick={() => setSelectedRelease(selectedRelease === release.id ? null : release.id)}
                      >
                        {selectedRelease === release.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="600">
                      {release.customer}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={release.environment} size="small" color="primary" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="500" fontFamily="monospace">
                      {release.version}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 300 }}>
                      {release.description}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Typography variant="caption">
                        {release.startTime.toLocaleDateString('tr-TR')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {release.startTime.toLocaleTimeString('tr-TR')}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    {release.endTime ? (
                      <Stack spacing={0.5}>
                        <Typography variant="caption">
                          {release.endTime.toLocaleDateString('tr-TR')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {release.endTime.toLocaleTimeString('tr-TR')}
                        </Typography>
                      </Stack>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        -
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={calculateDuration(release.startTime, release.endTime)}
                      size="small"
                      icon={<TimeIcon />}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={
                        release.status === 'completed' ? 'Tamamlandı' :
                          release.status === 'in-progress' ? 'Devam Ediyor' : 'Başarısız'
                      }
                      color={getStatusColor(release.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={release.issues.length}
                      color={release.issues.length > 0 ? 'error' : 'default'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>

                {/* Alt Tablo - Sorunlar */}
                {release.issues.length > 0 && (
                  <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={10}>
                      <Collapse in={selectedRelease === release.id} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 2 }}>
                          <Typography variant="h6" gutterBottom component="div" sx={{ mb: 2 }}>
                            Sorun Detayları
                          </Typography>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                                <TableCell sx={{ fontWeight: 'bold' }}>Servis</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Version</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Özet</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Durum</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Atanan</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Bildirim</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Çözüm</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Çözüm Tipi</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Log</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {release.issues.map((issue) => (
                                <TableRow key={issue.id}>
                                  <TableCell>
                                    <Typography variant="body2" fontWeight="500">
                                      {issue.service}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="caption" fontFamily="monospace">
                                      {issue.version}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" sx={{ maxWidth: 250 }}>
                                      {issue.summary}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      label={
                                        issue.status === 'resolved' ? 'Çözüldü' :
                                          issue.status === 'pending' ? 'Bekliyor' : 'İşlemde'
                                      }
                                      color={getIssueStatusColor(issue.status)}
                                      size="small"
                                      icon={
                                        issue.status === 'resolved' ? <CheckCircleIcon /> :
                                          issue.status === 'pending' ? <PendingIcon /> : null
                                      }
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2">
                                      {issue.assignedTo}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="caption" color="text.secondary">
                                      {issue.reportedAt.toLocaleString('tr-TR')}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    {issue.resolvedAt ? (
                                      <Stack spacing={0.5}>
                                        <Typography variant="caption" color="text.secondary">
                                          {issue.resolvedAt.toLocaleString('tr-TR')}
                                        </Typography>
                                        <Typography variant="caption" color="success.main" fontWeight="500">
                                          {calculateDuration(issue.reportedAt, issue.resolvedAt)}
                                        </Typography>
                                      </Stack>
                                    ) : (
                                      <Typography variant="caption" color="text.secondary">
                                        -
                                      </Typography>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {issue.resolutionType ? (
                                      <Tooltip title={issue.resolutionDetails || ''}>
                                        <Chip
                                          label={issue.resolutionType === 'manual' ? 'Manuel' : 'Hotfix'}
                                          size="small"
                                          icon={getResolutionIcon(issue.resolutionType)}
                                          color={issue.resolutionType === 'hotfix' ? 'warning' : 'info'}
                                        />
                                      </Tooltip>
                                    ) : (
                                      <Typography variant="caption" color="text.secondary">
                                        -
                                      </Typography>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="outlined"
                                      size="small"
                                      startIcon={<ViewIcon />}
                                      onClick={() => handleOpenLog(issue.podLog)}
                                    >
                                      Görüntüle
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pod Log Dialog */}
      <Dialog open={logDialogOpen} onClose={handleCloseLog} maxWidth="md" fullWidth>
        <DialogTitle>Pod Log Detayları</DialogTitle>
        <DialogContent>
          <Paper
            sx={{
              bgcolor: '#1e1e1e',
              p: 2,
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              color: '#d4d4d4',
              whiteSpace: 'pre-wrap',
              overflowX: 'auto',
            }}
          >
            {selectedLog}
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseLog}>Kapat</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerReleaseTrackV2;
