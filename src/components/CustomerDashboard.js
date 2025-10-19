import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Chip, 
  Grid, 
  Paper,
  Avatar,
  LinearProgress,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  RocketLaunch as ReleaseIcon,
  BugReport as HotfixIcon,
  Warning as UrgentIcon,
  TrendingUp as TrendIcon,
  Assessment as ReportIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';

const customerVersion = 4;
const currentRelease = 6;
const pendingReleases = currentRelease - customerVersion;
const pendingHotfixes = 3;
const pendingUrgents = 2;

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [environmentDates, setEnvironmentDates] = useState({
    dev: { planned: '', actual: '' },
    test: { planned: '', actual: '' },
    prod: { planned: '', actual: '' }
  });

  // Örnek versiyon verileri
  const versions = [
    {
      id: 1,
      version: 'v6.2.1',
      state: 'Published',
      testStartDate: '2025-10-10',
      publishDate: '2025-10-15',
      environments: {
        dev: { planned: '2025-10-16', actual: '2025-10-16' },
        test: { planned: '2025-10-18', actual: '2025-10-17' },
        prod: { planned: '2025-10-20', actual: '2025-10-19' }
      }
    },
    {
      id: 2,
      version: 'v6.1.0',
      state: 'Published',
      testStartDate: '2025-09-15',
      publishDate: '2025-09-25',
      environments: {
        dev: { planned: '2025-09-26', actual: '2025-09-26' },
        test: { planned: '2025-09-28', actual: '2025-09-27' },
        prod: { planned: '2025-10-01', actual: '2025-09-30' }
      }
    },
    {
      id: 3,
      version: 'v6.0.3',
      state: 'Test',
      testStartDate: '2025-10-12',
      publishDate: '',
      environments: {
        dev: { planned: '2025-10-20', actual: '' },
        test: { planned: '2025-10-22', actual: '' },
        prod: { planned: '2025-10-25', actual: '' }
      }
    },
    {
      id: 4,
      version: 'v6.0.2',
      state: 'InProgress',
      testStartDate: '',
      publishDate: '',
      environments: {
        dev: { planned: '2025-10-28', actual: '' },
        test: { planned: '2025-10-30', actual: '' },
        prod: { planned: '2025-11-01', actual: '' }
      }
    },
    {
      id: 5,
      version: 'v5.9.1',
      state: 'Published',
      testStartDate: '2025-08-20',
      publishDate: '2025-09-01',
      environments: {
        dev: { planned: '2025-09-02', actual: '2025-09-02' },
        test: { planned: '2025-09-05', actual: '2025-09-04' },
        prod: { planned: '2025-09-10', actual: '2025-09-08' }
      }
    }
  ];

  const getStatusColor = (count) => {
    if (count === 0) return 'success';
    if (count <= 2) return 'warning';
    return 'error';
  };

  const getProgressValue = (current, total) => {
    return total > 0 ? (current / total) * 100 : 0;
  };

  const getStateColor = (state) => {
    switch (state) {
      case 'Published': return 'success';
      case 'Test': return 'warning';
      case 'InProgress': return 'info';
      default: return 'default';
    }
  };

  const getStateLabel = (state) => {
    switch (state) {
      case 'Published': return 'Yayınlandı';
      case 'Test': return 'Test Ediliyor';
      case 'InProgress': return 'Geliştiriliyor';
      default: return state;
    }
  };

  const handleEditClick = (version, event) => {
    event.stopPropagation(); // Satır click'ini engelle
    setSelectedVersion(version);
    setEnvironmentDates(version.environments || {
      dev: { planned: '', actual: '' },
      test: { planned: '', actual: '' },
      prod: { planned: '', actual: '' }
    });
    setOpenDialog(true);
  };

  const handleSave = () => {
    // Burada veri güncelleme işlemi yapılacak
    console.log('Güncellenen veriler:', {
      version: selectedVersion?.version,
      environments: environmentDates
    });
    setOpenDialog(false);
  };

  const handleEnvironmentDateChange = (env, type, value) => {
    setEnvironmentDates(prev => ({
      ...prev,
      [env]: {
        ...prev[env],
        [type]: value
      }
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      p: 4
    }}>
      {/* Header */}
      <Paper 
        elevation={8} 
        sx={{ 
          p: 3, 
          mb: 4, 
          borderRadius: 3,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
              Müşteri Portal Dashboard
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Güncel Durum ve Bekleyen İşlemler
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Tooltip title="Son güncelleme: 2 dakika önce">
              <IconButton color="primary" size="large">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" color="text.secondary">
                Son Güncelleme
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {new Date().toLocaleString('tr-TR')}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={4}>
        {/* Bekleyen Release Kartı */}
        <Grid item xs={12} md={4}>
          <Card 
            elevation={12}
            sx={{ 
              height: '100%',
              background: 'linear-gradient(145deg, #ffffff, #f0f0f0)',
              borderRadius: 4,
              transition: 'transform 0.3s ease-in-out',
              cursor: 'pointer',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
              }
            }}
            onClick={() => navigate('/releases')}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar 
                    sx={{ 
                      width: 48, 
                      height: 48, 
                      bgcolor: 'primary.main',
                      boxShadow: '0 8px 16px rgba(25, 118, 210, 0.3)'
                    }}
                  >
                    <ReleaseIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Bekleyen Release
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Yeni sürüm güncellemeleri
                    </Typography>
                  </Box>
                </Box>
                <Chip 
                  label={`${pendingReleases}`}
                  color={getStatusColor(pendingReleases)}
                  size="small"
                  sx={{ fontWeight: 'bold' }}
                />
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'primary.main', color: 'white', borderRadius: 1 }}>
                      <Typography variant="h6" fontWeight="bold">
                        v{customerVersion}
                      </Typography>
                      <Typography variant="caption">
                        Müşteri
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'success.main', color: 'white', borderRadius: 1 }}>
                      <Typography variant="h6" fontWeight="bold">
                        v{currentRelease}
                      </Typography>
                      <Typography variant="caption">
                        Son Release
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
                <Box sx={{ mt: 1.5 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={getProgressValue(customerVersion, currentRelease)} 
                    sx={{ 
                      height: 8, 
                      borderRadius: 4,
                      backgroundColor: 'rgba(25, 118, 210, 0.1)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: 'primary.main'
                      }
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}>
                    %{Math.round(getProgressValue(customerVersion, currentRelease))} Güncel
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Bekleyen Hotfix Kartı */}
        <Grid item xs={12} md={4}>
          <Card 
            elevation={12}
            onClick={() => navigate('/hotfix-management')}
            sx={{ 
              height: '100%',
              background: 'linear-gradient(145deg, #ffffff, #f0f0f0)',
              borderRadius: 4,
              transition: 'transform 0.3s ease-in-out',
              cursor: 'pointer',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar 
                    sx={{ 
                      width: 48, 
                      height: 48, 
                      bgcolor: 'error.main',
                      boxShadow: '0 8px 16px rgba(211, 47, 47, 0.3)'
                    }}
                  >
                    <HotfixIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Bekleyen Hotfix
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Kritik düzeltmeler
                    </Typography>
                  </Box>
                </Box>
                <Chip 
                  label={`${pendingHotfixes}`}
                  color={getStatusColor(pendingHotfixes)}
                  size="small"
                  sx={{ fontWeight: 'bold' }}
                />
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Grid container spacing={1}>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'error.main', color: 'white', borderRadius: 1 }}>
                      <Typography variant="body1" fontWeight="bold">
                        {pendingHotfixes}
                      </Typography>
                      <Typography variant="caption">
                        Kritik
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'warning.main', color: 'white', borderRadius: 1 }}>
                      <Typography variant="body1" fontWeight="bold">
                        2
                      </Typography>
                      <Typography variant="caption">
                        Test
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'success.main', color: 'white', borderRadius: 1 }}>
                      <Typography variant="body1" fontWeight="bold">
                        1
                      </Typography>
                      <Typography variant="caption">
                        Hazır
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
                <Box sx={{ mt: 1.5 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={75} 
                    sx={{ 
                      height: 8, 
                      borderRadius: 4,
                      backgroundColor: 'rgba(211, 47, 47, 0.1)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: 'error.main'
                      }
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}>
                    %75 Tamamlandı
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Bekleyen Acil Değişiklik Kartı */}
        <Grid item xs={12} md={4}>
          <Card 
            elevation={12}
            onClick={() => navigate('/urgent-changes')}
            sx={{ 
              height: '100%',
              background: 'linear-gradient(145deg, #ffffff, #f0f0f0)',
              borderRadius: 4,
              transition: 'transform 0.3s ease-in-out',
              cursor: 'pointer',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
              }
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar 
                    sx={{ 
                      width: 48, 
                      height: 48, 
                      bgcolor: 'warning.main',
                      boxShadow: '0 8px 16px rgba(255, 152, 0, 0.3)'
                    }}
                  >
                    <UrgentIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      Acil Değişiklikler
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Urgent güncellemeler
                    </Typography>
                  </Box>
                </Box>
                <Chip 
                  label={`${pendingUrgents}`}
                  color={getStatusColor(pendingUrgents)}
                  size="small"
                  sx={{ fontWeight: 'bold' }}
                />
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Grid container spacing={1}>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'warning.main', color: 'white', borderRadius: 1 }}>
                      <Typography variant="body1" fontWeight="bold">
                        {pendingUrgents}
                      </Typography>
                      <Typography variant="caption">
                        Aktif
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'info.main', color: 'white', borderRadius: 1 }}>
                      <Typography variant="body1" fontWeight="bold">
                        1
                      </Typography>
                      <Typography variant="caption">
                        Analiz
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'success.main', color: 'white', borderRadius: 1 }}>
                      <Typography variant="body1" fontWeight="bold">
                        3
                      </Typography>
                      <Typography variant="caption">
                        Tamam
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
                <Box sx={{ mt: 1.5 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={40} 
                    sx={{ 
                      height: 8, 
                      borderRadius: 4,
                      backgroundColor: 'rgba(255, 152, 0, 0.1)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: 'warning.main'
                      }
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}>
                    %40 İlerleme
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Versiyon Tablosu */}
        <Grid item xs={12}>
          <Paper 
            elevation={8}
            sx={{ 
              p: 4, 
              borderRadius: 3,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" fontWeight="bold">
                Versiyon Takibi
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Versiyona tıklayarak banka alım bilgilerini düzenleyebilirsiniz
              </Typography>
            </Box>
            
            <TableContainer>
              <Table sx={{ minWidth: 750 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Versiyon</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Durum</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Test Başlama</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Yayın Tarihi</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Banka Durumu</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>İşlemler</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {versions.map((version) => {
                    const hasAllActual = version.environments?.dev?.actual && 
                                       version.environments?.test?.actual && 
                                       version.environments?.prod?.actual;
                    const hasAnyActual = version.environments?.dev?.actual || 
                                       version.environments?.test?.actual || 
                                       version.environments?.prod?.actual;
                    
                    return (
                      <TableRow
                        key={version.id}
                        sx={{
                          '&:hover': {
                            backgroundColor: 'action.hover',
                          },
                          transition: 'background-color 0.2s ease-in-out'
                        }}
                      >
                        <TableCell>
                          <Typography variant="body1" fontWeight="bold" color="primary.main">
                            {version.version}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getStateLabel(version.state)}
                            color={getStateColor(version.state)}
                            size="small"
                            sx={{ fontWeight: 'bold' }}
                          />
                        </TableCell>
                        <TableCell>{formatDate(version.testStartDate)}</TableCell>
                        <TableCell>{formatDate(version.publishDate)}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {hasAllActual && (
                              <Chip 
                                label="Tüm Ortamlarda Aktif" 
                                color="success" 
                                size="small"
                                sx={{ fontSize: '0.7rem' }}
                              />
                            )}
                            {hasAnyActual && !hasAllActual && (
                              <Chip 
                                label="Kısmi Aktif" 
                                color="warning" 
                                size="small"
                                sx={{ fontSize: '0.7rem' }}
                              />
                            )}
                            {!hasAnyActual && (
                              <Chip 
                                label="Henüz Alınmadı" 
                                color="default" 
                                size="small"
                                sx={{ fontSize: '0.7rem' }}
                              />
                            )}
                            <Typography variant="caption" color="text.secondary">
                              DEV: {formatDate(version.environments?.dev?.actual) || 'Bekliyor'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              TEST: {formatDate(version.environments?.test?.actual) || 'Bekliyor'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              PROD: {formatDate(version.environments?.prod?.actual) || 'Bekliyor'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <IconButton
                            onClick={(e) => handleEditClick(version, e)}
                            color="primary"
                            size="small"
                            sx={{
                              backgroundColor: 'primary.main',
                              color: 'white',
                              '&:hover': {
                                backgroundColor: 'primary.dark',
                              }
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Özet Bilgi Kartı */}
        <Grid item xs={12}>
          <Paper 
            elevation={8}
            sx={{ 
              p: 4, 
              borderRadius: 3,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" fontWeight="bold">
                Genel Durum Özeti
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <IconButton color="primary">
                  <TrendIcon />
                </IconButton>
                <IconButton color="primary">
                  <ReportIcon />
                </IconButton>
              </Box>
            </Box>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h3" color="primary.main" fontWeight="bold">
                    {pendingReleases + pendingHotfixes + pendingUrgents}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Toplam Bekleyen İş
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h3" color="success.main" fontWeight="bold">
                    85%
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Genel Tamamlanma
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h3" color="warning.main" fontWeight="bold">
                    3
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Gün Ortalama Süre
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h3" color="error.main" fontWeight="bold">
                    1
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Kritik Öncelik
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* Banka Ortam Düzenleme Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h5" fontWeight="bold" color="primary.main">
            {selectedVersion?.version} - Banka Ortam Planlaması
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Her ortam için planlanan ve gerçekleşen tarihleri girebilirsiniz
          </Typography>
        </DialogTitle>
        
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={3}>
            {/* DEV Ortamı */}
            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 3, borderRadius: 2, bgcolor: '#e3f2fd' }}>
                <Typography variant="h6" fontWeight="bold" color="primary.main" gutterBottom>
                  🛠️ DEV Ortamı
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Planlanan Tarih"
                      type="date"
                      value={environmentDates.dev.planned}
                      onChange={(e) => handleEnvironmentDateChange('dev', 'planned', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Gerçekleşen Tarih"
                      type="date"
                      value={environmentDates.dev.actual}
                      onChange={(e) => handleEnvironmentDateChange('dev', 'actual', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      size="small"
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* TEST Ortamı */}
            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 3, borderRadius: 2, bgcolor: '#fff3e0' }}>
                <Typography variant="h6" fontWeight="bold" color="warning.main" gutterBottom>
                  🧪 TEST Ortamı
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Planlanan Tarih"
                      type="date"
                      value={environmentDates.test.planned}
                      onChange={(e) => handleEnvironmentDateChange('test', 'planned', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Gerçekleşen Tarih"
                      type="date"
                      value={environmentDates.test.actual}
                      onChange={(e) => handleEnvironmentDateChange('test', 'actual', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      size="small"
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* PROD Ortamı */}
            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 3, borderRadius: 2, bgcolor: '#e8f5e8' }}>
                <Typography variant="h6" fontWeight="bold" color="success.main" gutterBottom>
                  🚀 PROD Ortamı
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Planlanan Tarih"
                      type="date"
                      value={environmentDates.prod.planned}
                      onChange={(e) => handleEnvironmentDateChange('prod', 'planned', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Gerçekleşen Tarih"
                      type="date"
                      value={environmentDates.prod.actual}
                      onChange={(e) => handleEnvironmentDateChange('prod', 'actual', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      size="small"
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button
            onClick={() => setOpenDialog(false)}
            variant="outlined"
            startIcon={<CancelIcon />}
            sx={{ borderRadius: 2 }}
          >
            İptal
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            startIcon={<SaveIcon />}
            sx={{ borderRadius: 2 }}
          >
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerDashboard;
