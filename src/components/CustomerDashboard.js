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
const pendingHotfixes = 5;
const criticalHotfixes = 2;
const pendingUrgents = 7;
const expiredUrgents = 3;

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
      version: 'v1.25.0',
      state: 'InProgress',
      testStartDate: '',
      publishDate: '',
      environments: {
        dev: { planned: '2025-11-01', actual: '' },
        test: { planned: '2025-11-05', actual: '' },
        prod: { planned: '2025-11-10', actual: '' }
      }
    },
    {
      id: 2,
      version: 'v1.24.0',
      state: 'Test',
      testStartDate: '2025-10-18',
      publishDate: '',
      environments: {
        dev: { planned: '2025-10-22', actual: '2025-10-22' },
        test: { planned: '2025-10-25', actual: '' },
        prod: { planned: '2025-10-28', actual: '' }
      }
    },
    {
      id: 3,
      version: 'v1.23.0',
      state: 'Published',
      testStartDate: '2025-09-20',
      publishDate: '2025-10-05',
      environments: {
        dev: { planned: '2025-10-06', actual: '2025-10-06' },
        test: { planned: '2025-10-08', actual: '2025-10-07' },
        prod: { planned: '2025-10-10', actual: '2025-10-09' }
      }
    },
    {
      id: 4,
      version: 'v1.22.0',
      state: 'Published',
      testStartDate: '2025-08-15',
      publishDate: '2025-09-01',
      environments: {
        dev: { planned: '2025-09-02', actual: '2025-09-02' },
        test: { planned: '2025-09-05', actual: '2025-09-04' },
        prod: { planned: '2025-09-08', actual: '2025-09-07' }
      }
    },
    {
      id: 5,
      version: 'v1.21.0',
      state: 'Published',
      testStartDate: '2025-07-10',
      publishDate: '2025-08-01',
      environments: {
        dev: { planned: '2025-08-02', actual: '2025-08-02' },
        test: { planned: '2025-08-05', actual: '2025-08-04' },
        prod: { planned: '2025-08-10', actual: '2025-08-08' }
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
              Müşteri Portal
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
        <Grid item >
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
                      Bekleyen Güncellemeler
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
              
              {/* Mevcut Versiyon */}
              <Box sx={{ mb: 2 }}>
                <Paper 
                  elevation={3}
                  sx={{ 
                    p: 2, 
                    bgcolor: 'primary.main', 
                    color: 'white', 
                    borderRadius: 2,
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                    boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)'
                  }}
                >
                  <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', mb: 0.5 }}>
                    📌 Mevcut Versiyon
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    v1.23.0
                  </Typography>
                </Paper>
              </Box>

              {/* Bekleyen Versiyonlar */}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontWeight: 600 }}>
                  🔔 Bekleyen Güncellemeler
                </Typography>
                <Grid container spacing={1.5}>
                  <Grid item xs={6}>
                    <Paper 
                      elevation={2}
                      sx={{ 
                        p: 1.5, 
                        bgcolor: '#fff3e0', 
                        borderRadius: 2,
                        textAlign: 'center',
                        border: '2px solid #ff9800',
                        transition: 'transform 0.2s',
                        '&:hover': {
                          transform: 'scale(1.05)'
                        }
                      }}
                    >
                      <Typography variant="body2" fontWeight="bold" color="warning.dark">
                        v1.24.0
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Sonraki
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper 
                      elevation={2}
                      sx={{ 
                        p: 1.5, 
                        bgcolor: '#e8f5e9', 
                        borderRadius: 2,
                        textAlign: 'center',
                        border: '2px solid #4caf50',
                        transition: 'transform 0.2s',
                        '&:hover': {
                          transform: 'scale(1.05)'
                        }
                      }}
                    >
                      <Typography variant="body2" fontWeight="bold" color="success.dark">
                        v1.25.0
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Planlanan
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Bekleyen Hotfix Kartı */}
        <Grid item xs={12} md={6}>
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
              
              {/* Toplam Hotfix Sayısı */}
              <Box sx={{ mb: 2 }}>
                <Paper 
                  elevation={3}
                  sx={{ 
                    p: 2, 
                    bgcolor: 'error.main', 
                    color: 'white', 
                    borderRadius: 2,
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #d32f2f 0%, #c62828 100%)',
                    boxShadow: '0 4px 12px rgba(211, 47, 47, 0.3)'
                  }}
                >
                  <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', mb: 0.5 }}>
                    � Toplam Hotfix
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {pendingHotfixes} Adet
                  </Typography>
                </Paper>
              </Box>

              {/* Hotfix Detayı */}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontWeight: 600 }}>
                  📊 Hotfix Detayı
                </Typography>
                <Grid container spacing={1.5}>
                  <Grid item xs={6}>
                    <Paper 
                      elevation={2}
                      sx={{ 
                        p: 1.5, 
                        bgcolor: '#ffebee', 
                        borderRadius: 2,
                        textAlign: 'center',
                        border: '2px solid #f44336',
                        transition: 'transform 0.2s',
                        '&:hover': {
                          transform: 'scale(1.05)'
                        }
                      }}
                    >
                      <Typography variant="h6" fontWeight="bold" color="error.dark">
                        {criticalHotfixes}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Kritik
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper 
                      elevation={2}
                      sx={{ 
                        p: 1.5, 
                        bgcolor: '#fff3e0', 
                        borderRadius: 2,
                        textAlign: 'center',
                        border: '2px solid #ff9800',
                        transition: 'transform 0.2s',
                        '&:hover': {
                          transform: 'scale(1.05)'
                        }
                      }}
                    >
                      <Typography variant="h6" fontWeight="bold" color="warning.dark">
                        {pendingHotfixes - criticalHotfixes}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Normal
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
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
              
              {/* Toplam Acil Değişiklik Sayısı */}
              <Box sx={{ mb: 2 }}>
                <Paper 
                  elevation={3}
                  sx={{ 
                    p: 2, 
                    bgcolor: 'warning.main', 
                    color: 'white', 
                    borderRadius: 2,
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #f57c00 0%, #ef6c00 100%)',
                    boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)'
                  }}
                >
                  <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', mb: 0.5 }}>
                    ⚡ Toplam Acil Değişiklik
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {pendingUrgents} Adet
                  </Typography>
                </Paper>
              </Box>

              {/* Acil Değişiklik Detayı */}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', fontWeight: 600 }}>
                  📊 Değişiklik Detayı
                </Typography>
                <Grid container spacing={1.5}>
                  <Grid item xs={6}>
                    <Paper 
                      elevation={2}
                      sx={{ 
                        p: 1.5, 
                        bgcolor: '#ffebee', 
                        borderRadius: 2,
                        textAlign: 'center',
                        border: '2px solid #f44336',
                        transition: 'transform 0.2s',
                        '&:hover': {
                          transform: 'scale(1.05)'
                        }
                      }}
                    >
                      <Typography variant="h6" fontWeight="bold" color="error.dark">
                        {expiredUrgents}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Zamanı Geçmiş
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper 
                      elevation={2}
                      sx={{ 
                        p: 1.5, 
                        bgcolor: '#e8f5e9', 
                        borderRadius: 2,
                        textAlign: 'center',
                        border: '2px solid #4caf50',
                        transition: 'transform 0.2s',
                        '&:hover': {
                          transform: 'scale(1.05)'
                        }
                      }}
                    >
                      <Typography variant="h6" fontWeight="bold" color="success.dark">
                        {pendingUrgents - expiredUrgents}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Normal
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
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
