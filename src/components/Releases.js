import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Checkbox,
  List,
  ListItem,
  Grid,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  RocketLaunch as ReleaseIcon,
  MoreVert as MoreVertIcon,
  CalendarToday as DateIcon,
  Tag as TagIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  Description as NotesIcon,
  History as ChangelogIcon,
  Assignment as TodoIcon,
  BugReport as BugIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';

const Releases = () => {
  const navigate = useNavigate();
  const [selectedVersion, setSelectedVersion] = useState('all');
  const [groupByVersion, setGroupByVersion] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [deploymentInfo, setDeploymentInfo] = useState({ release: null, environment: null });

  // Örnek release verileri
  const releases = [
    {
      id: 1,
      name: 'NG-3.0.0.251017.01',
      version: 'v6.2.1',
      tag: 'NG-3.0.0.251017.01',
      branch: 'master',
      createdDate: '2025-10-17T15:13:52',
      environments: {
        'Dev': { status: 'success', date: '2025-10-17T15:20:00' },
        'Test': { status: 'success', date: '2025-10-17T15:45:00' },
        'PreProd': { status: 'pending', date: null },
        'Prod': { status: 'not-started', date: null }
      }
    },
    {
      id: 2,
      name: 'NG-3.0.0.251016.01',
      version: 'v6.2.0',
      tag: 'NG-3.0.0.251016.01',
      branch: 'master',
      createdDate: '2025-10-16T14:25:30',
      environments: {
        'Dev': { status: 'success', date: '2025-10-16T14:30:00' },
        'Test': { status: 'failed', date: '2025-10-16T15:00:00' },
        'PreProd': { status: 'not-started', date: null },
        'Prod': { status: 'not-started', date: null }
      }
    },
    {
      id: 3,
      name: 'NG-3.0.0.251015.01',
      version: 'v6.1.5',
      tag: 'NG-3.0.0.251015.01',
      branch: 'master',
      createdDate: '2025-10-15T11:45:15',
      environments: {
        'Dev': { status: 'success', date: '2025-10-15T12:00:00' },
        'Test': { status: 'success', date: '2025-10-15T12:30:00' },
        'PreProd': { status: 'success', date: '2025-10-15T13:00:00' },
        'Prod': { status: 'success', date: '2025-10-15T13:30:00' }
      }
    },
    {
      id: 4,
      name: 'NG-3.0.0.251014.01',
      version: 'v6.1.0',
      tag: 'NG-3.0.0.251014.01',
      branch: 'master',
      createdDate: '2025-10-14T09:15:45',
      environments: {
        'Dev': { status: 'success', date: '2025-10-14T09:30:00' },
        'Test': { status: 'success', date: '2025-10-14T10:00:00' },
        'PreProd': { status: 'pending', date: null },
        'Prod': { status: 'not-started', date: null }
      }
    },
    {
      id: 5,
      name: 'NG-3.0.0.251013.01',
      version: 'v6.0.8',
      tag: 'NG-3.0.0.251013.01',
      branch: 'master',
      createdDate: '2025-10-13T16:30:20',
      environments: {
        'Dev': { status: 'success', date: '2025-10-13T16:45:00' },
        'Test': { status: 'failed', date: '2025-10-13T17:15:00' },
        'PreProd': { status: 'not-started', date: null },
        'Prod': { status: 'not-started', date: null }
      }
    }
  ];

  const versions = ['all', 'v6.2.1', 'v6.2.0', 'v6.1.5', 'v6.1.0'];
  const environments = ['Dev', 'Test', 'PreProd', 'Prod'];

  const filteredReleases = selectedVersion === 'all' 
    ? releases 
    : releases.filter(release => release.version === selectedVersion);

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return '#4CAF50';
      case 'failed': return '#f44336';
      case 'pending': return '#ff9800';
      case 'not-started': return '#9e9e9e';
      default: return '#9e9e9e';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircleIcon sx={{ color: 'white', fontSize: 16 }} />;
      case 'failed': return <CancelIcon sx={{ color: 'white', fontSize: 16 }} />;
      case 'pending': return <ScheduleIcon sx={{ color: 'white', fontSize: 16 }} />;
      default: return null;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'success': return 'Başarılı';
      case 'failed': return 'Başarısız';
      case 'pending': return 'Bekliyor';
      case 'not-started': return 'Başlamadı';
      default: return 'Bilinmiyor';
    }
  };

  const handleMenuClick = (event, release) => {
    setAnchorEl(event.currentTarget);
    setSelectedRelease(release);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRelease(null);
  };

  // Mevcut ortam versiyonları (simüle edilmiş)
  const currentEnvironmentVersions = {
    'Dev': 'v6.2.1',
    'Test': 'v6.2.0', 
    'PreProd': 'v6.1.5',
    'Prod': 'v6.1.5'
  };

  // Geçişten önce yapılması gereken işlem sayıları (simüle edilmiş)
  const pendingTasksCount = {
    'Dev': 0,
    'Test': 2,
    'PreProd': 5,
    'Prod': 8
  };

  // Version comparison helper
  const compareVersions = (version1, version2) => {
    const v1 = version1.replace('v', '').split('.').map(Number);
    const v2 = version2.replace('v', '').split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
      const num1 = v1[i] || 0;
      const num2 = v2[i] || 0;
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    return 0;
  };

  const handleEnvironmentClick = (release, environment) => {
    const envStatus = release.environments[environment];
    // Sadece pending veya not-started durumlarında deploy edilebilir
    if (envStatus.status === 'pending' || envStatus.status === 'not-started') {
      setDeploymentInfo({ release, environment });
      setConfirmDialog(true);
    }
  };

  const handleDeployConfirm = () => {
    // Burada deployment işlemi yapılacak
    console.log(`Deploying ${deploymentInfo.release.name} to ${deploymentInfo.environment}`);
    setConfirmDialog(false);
    setDeploymentInfo({ release: null, environment: null });
  };

  const handleDeployCancel = () => {
    setConfirmDialog(false);
    setDeploymentInfo({ release: null, environment: null });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('tr-TR');
  };

  const formatCreatedDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const groupedReleases = groupByVersion 
    ? releases.reduce((acc, release) => {
        if (!acc[release.version]) acc[release.version] = [];
        acc[release.version].push(release);
        return acc;
      }, {})
    : { 'Tüm Releases': filteredReleases };

  return (
    <Box sx={{ p: 4 }}>
      {/* Header */}
      <Paper elevation={4} sx={{ p: 3, mb: 4, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/customer-dashboard')}
              variant="outlined"
              size="small"
            >
              Geri
            </Button>
            <Box>
              <Typography variant="h4" fontWeight="bold" color="primary.main" gutterBottom>
                Release Yönetimi
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Tüm release'ların durumu ve ortam bilgileri
              </Typography>
            </Box>
          </Box>
          <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main' }}>
            <ReleaseIcon fontSize="large" />
          </Avatar>
        </Box>

        {/* Filtreler */}
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Versiyon Seç</InputLabel>
            <Select
              value={selectedVersion}
              label="Versiyon Seç"
              onChange={(e) => setSelectedVersion(e.target.value)}
            >
              <MenuItem value="all">Tüm Versiyonlar</MenuItem>
              {versions.slice(1).map(version => (
                <MenuItem key={version} value={version}>{version}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControlLabel
            control={
              <Checkbox
                checked={groupByVersion}
                onChange={(e) => setGroupByVersion(e.target.checked)}
                color="primary"
              />
            }
            label="Versiyon Bazında Grupla"
          />
        </Box>
      </Paper>

      {/* Releases Tablosu */}
      <Paper elevation={4} sx={{ borderRadius: 3, overflow: 'hidden' }}>
        {/* Tablo Header */}
        <Box sx={{ 
          bgcolor: 'grey.100', 
          p: 2, 
          display: 'flex', 
          alignItems: 'center',
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}>
          <Box sx={{ width: '30%' }}>
            <Typography variant="h6" fontWeight="bold">
              Releases
            </Typography>
          </Box>
          <Box sx={{ width: '20%' }}>
            <Typography variant="h6" fontWeight="bold">
              Created
            </Typography>
          </Box>
          <Box sx={{ width: '50%' }}>
            <Typography variant="h6" fontWeight="bold">
              Stages
            </Typography>
          </Box>
        </Box>

        {/* Releases Listesi */}
        <List sx={{ p: 0 }}>
          {filteredReleases.map((release) => (
            <ListItem 
              key={release.id} 
              sx={{ 
                p: 0, 
                borderBottom: '1px solid',
                borderColor: 'divider',
                '&:hover': {
                  backgroundColor: 'action.hover'
                }
              }}
            >
              <Box sx={{ 
                width: '100%', 
                display: 'flex', 
                alignItems: 'center',
                p: 2
              }}>
                {/* Release Bilgileri */}
                <Box sx={{ width: '30%', display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar 
                    sx={{ 
                      bgcolor: 'success.main', 
                      width: 32, 
                      height: 32,
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                  >
                    E
                  </Avatar>
                  <Box>
                    <Typography variant="body1" fontWeight="bold" color="primary.main">
                      {release.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        🌿 {release.branch}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Created Tarihi */}
                <Box sx={{ width: '20%' }}>
                  <Typography variant="body2">
                    {formatCreatedDate(release.createdDate)}
                  </Typography>
                </Box>

                {/* Stages */}
                <Box sx={{ width: '50%', display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  {environments.map((env) => {
                    const envStatus = release.environments[env];
                    const isClickable = envStatus.status === 'pending' || envStatus.status === 'not-started';
                    
                    return (
                      <Chip
                        key={env}
                        label={env}
                        onClick={() => isClickable && handleEnvironmentClick(release, env)}
                        size="small"
                        sx={{
                          backgroundColor: getStatusColor(envStatus.status),
                          color: 'white',
                          fontWeight: 'bold',
                          cursor: isClickable ? 'pointer' : 'default',
                          '&:hover': isClickable ? {
                            opacity: 0.8,
                            transform: 'scale(1.05)'
                          } : {},
                          transition: 'all 0.2s ease-in-out',
                          minWidth: '80px'
                        }}
                        icon={getStatusIcon(envStatus.status)}
                      />
                    );
                  })}
                </Box>

                {/* Context Menu */}
                <IconButton
                  onClick={(e) => handleMenuClick(e, release)}
                  size="small"
                  sx={{ ml: 1 }}
                >
                  <MoreVertIcon />
                </IconButton>
              </Box>
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          elevation: 8,
          sx: { borderRadius: 2 }
        }}
      >
        <MenuItem 
          onClick={() => {
            handleMenuClose();
            navigate('/release-notes');
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <NotesIcon fontSize="small" />
            <Typography variant="body2">Release Notları</Typography>
          </Box>
        </MenuItem>
        
        <MenuItem 
          onClick={() => {
            handleMenuClose();
            navigate('/change-tracking');
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ChangelogIcon fontSize="small" />
            <Typography variant="body2">Değişiklik Takibi</Typography>
          </Box>
        </MenuItem>
        
        <MenuItem 
          onClick={() => {
            handleMenuClose();
            navigate('/todo-list');
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TodoIcon fontSize="small" />
            <Typography variant="body2">Yapılacaklar Listesi</Typography>
          </Box>
        </MenuItem>
        
        <MenuItem 
          onClick={() => {
            handleMenuClose();
            navigate('/report-issue');
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <BugIcon fontSize="small" color="error" />
            <Typography variant="body2" color="error.main">Hata Bildir</Typography>
          </Box>
        </MenuItem>
      </Menu>

      {/* Deployment Onaylama Diyalogu */}
      <Dialog
        open={confirmDialog}
        onClose={handleDeployCancel}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1
          }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <ReleaseIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Deployment Onayı
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Release hazır durumda - Onayınızı bekliyor
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ pt: 2 }}>
          {deploymentInfo.release && (
            <Box>
              {/* Ana Bilgilendirme Mesajı */}
              <Box sx={{ mb: 3, p: 3, bgcolor: 'success.light', borderRadius: 2, border: '1px solid', borderColor: 'success.main' }}>
                <Typography variant="body1" fontWeight="bold" color="success.contrastText" gutterBottom>
                  ✅ The state is ready to approve
                </Typography>
                <Typography variant="body2" color="success.contrastText">
                  After release approved, you will get an email to inform that release package is ready to apply.
                </Typography>
              </Box>

              {/* Deployment Bilgileri */}
              <Typography variant="body1" gutterBottom sx={{ mb: 2 }}>
                <strong>{deploymentInfo.release.name}</strong> release'ini{' '}
                <Chip 
                  label={deploymentInfo.environment?.toUpperCase()} 
                  color="primary" 
                  size="small" 
                  sx={{ mx: 1 }}
                />
                ortamına deploy etmek istediğinize emin misiniz?
              </Typography>

              {/* Versiyon Karşılaştırma ve Uyarı */}
              {(() => {
                const currentVersion = currentEnvironmentVersions[deploymentInfo.environment];
                const newVersion = deploymentInfo.release.version;
                const comparison = compareVersions(newVersion, currentVersion);
                
                if (comparison < 0) {
                  // Düşük versiyon uyarısı
                  return (
                    <Box sx={{ mb: 3, p: 3, bgcolor: 'error.light', borderRadius: 2, border: '2px solid', borderColor: 'error.main' }}>
                      <Typography variant="body1" fontWeight="bold" color="error.contrastText" gutterBottom>
                        ⚠️ VERSION DOWNGRADE WARNING
                      </Typography>
                      <Typography variant="body2" color="error.contrastText" gutterBottom>
                        You are trying to deploy a lower version ({newVersion}) to an environment that currently has a higher version ({currentVersion}).
                      </Typography>
                      <Typography variant="body2" color="error.contrastText" sx={{ fontWeight: 'bold' }}>
                        This may cause compatibility issues and data loss. Please confirm this is intentional.
                      </Typography>
                    </Box>
                  );
                } else {
                  // Normal versiyon geçişi bilgisi
                  return (
                    <Box sx={{ mb: 3, p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
                      <Typography variant="body2" color="info.contrastText" gutterBottom>
                        <strong>Version Transition:</strong>
                      </Typography>
                      <Typography variant="body2" color="info.contrastText">
                        {deploymentInfo.environment} ortamı <strong>{currentVersion}</strong> versiyonundan <strong>{newVersion}</strong> versiyonuna geçecektir.
                      </Typography>
                      {comparison > 0 && (
                        <Typography variant="body2" color="info.contrastText" sx={{ mt: 1, fontWeight: 'bold' }}>
                          ✅ Bu bir versiyon yükseltmesidir.
                        </Typography>
                      )}
                      {comparison === 0 && (
                        <Typography variant="body2" color="info.contrastText" sx={{ mt: 1, fontWeight: 'bold' }}>
                          ℹ️ Aynı versiyon tekrar deploy edilecektir.
                        </Typography>
                      )}
                    </Box>
                  );
                }
              })()}

              {/* Release Detay Bilgileri */}
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
                <Typography variant="subtitle2" color="text.primary" gutterBottom>
                  Release Detayları:
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      • <strong>Versiyon:</strong> {deploymentInfo.release.version}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • <strong>Tag:</strong> {deploymentInfo.release.tag}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      • <strong>Branch:</strong> {deploymentInfo.release.branch}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • <strong>Oluşturulma:</strong> {formatDate(deploymentInfo.release.createdDate)}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* Geçişten Önce Yapılması Gereken İşlemler */}
              {(() => {
                const taskCount = pendingTasksCount[deploymentInfo.environment];
                
                if (taskCount > 0) {
                  return (
                    <Box sx={{ mt: 3, p: 3, bgcolor: 'warning.light', borderRadius: 2, border: '2px solid', borderColor: 'warning.main' }}>
                      <Typography variant="body1" fontWeight="bold" color="warning.contrastText" gutterBottom>
                        ⚠️ Deployment Öncesi Gerekli İşlemler
                      </Typography>
                      <Typography variant="body2" color="warning.contrastText" gutterBottom>
                        {deploymentInfo.environment} ortamına deployment yapılmadan önce <strong>{taskCount} adet</strong> işlem tamamlanmalıdır.
                      </Typography>
                      <Typography variant="body2" color="warning.contrastText" sx={{ fontStyle: 'italic' }}>
                        Bu işlemleri tamamlamadan deployment yapılamaz.
                      </Typography>
                    </Box>
                  );
                } else {
                  return (
                    <Box sx={{ mt: 3, p: 2, bgcolor: 'success.light', borderRadius: 2, border: '1px solid', borderColor: 'success.main' }}>
                      <Typography variant="body2" fontWeight="bold" color="success.contrastText" gutterBottom>
                        ✅ Tüm Ön Koşullar Tamamlandı
                      </Typography>
                      <Typography variant="body2" color="success.contrastText">
                        Deployment için gerekli tüm işlemler tamamlanmıştır.
                      </Typography>
                    </Box>
                  );
                }
              })()}

              {/* Son Durum Bilgisi */}
              <Box sx={{ mt: 3, p: 2, bgcolor: 'primary.light', borderRadius: 2 }}>
                <Typography variant="body2" color="primary.contrastText" gutterBottom>
                  <strong>Deployment sonrası durum:</strong>
                </Typography>
                <Typography variant="body2" color="primary.contrastText">
                  {deploymentInfo.environment} ortamı {deploymentInfo.release.version} versiyonuna sahip olacak ve email bildirimi gönderilecektir.
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button
            onClick={handleDeployCancel}
            variant="outlined"
            color="inherit"
            sx={{ borderRadius: 2, px: 3 }}
          >
            İptal Et
          </Button>
          
          {/* ToDo Liste Butonu - Sadece bekleyen işlem varsa göster */}
          {deploymentInfo.release && pendingTasksCount[deploymentInfo.environment] > 0 && (
            <Button
              onClick={() => {
                setConfirmDialog(false);
                navigate('/todo-list');
              }}
              variant="contained"
              color="warning"
              sx={{ borderRadius: 2, px: 3 }}
            >
              ToDo Liste ({pendingTasksCount[deploymentInfo.environment]})
            </Button>
          )}
          
          <Button
            onClick={handleDeployConfirm}
            variant="contained"
            disabled={deploymentInfo.release && pendingTasksCount[deploymentInfo.environment] > 0}
            color={(() => {
              if (deploymentInfo.release) {
                const taskCount = pendingTasksCount[deploymentInfo.environment];
                if (taskCount > 0) return 'inherit'; // Disabled durumu için
                
                const currentVersion = currentEnvironmentVersions[deploymentInfo.environment];
                const newVersion = deploymentInfo.release.version;
                const comparison = compareVersions(newVersion, currentVersion);
                return comparison < 0 ? 'error' : 'primary';
              }
              return 'primary';
            })()}
            sx={{ 
              borderRadius: 2, 
              px: 3,
              opacity: deploymentInfo.release && pendingTasksCount[deploymentInfo.environment] > 0 ? 0.5 : 1
            }}
          >
            {(() => {
              if (deploymentInfo.release) {
                const taskCount = pendingTasksCount[deploymentInfo.environment];
                if (taskCount > 0) return `${taskCount} İşlem Bekliyor`;
                
                const currentVersion = currentEnvironmentVersions[deploymentInfo.environment];
                const newVersion = deploymentInfo.release.version;
                const comparison = compareVersions(newVersion, currentVersion);
                return comparison < 0 ? 'Downgrade Onayla' : 'Deploy Et';
              }
              return 'Deploy Et';
            })()}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Releases;