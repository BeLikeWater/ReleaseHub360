import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  Badge,
  Grid,
  Avatar
} from '@mui/material';
import {
  BugReport as BugIcon,
  NewReleases as FeatureIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Storage as DatabaseIcon,
  Visibility as ViewIcon,
  ArrowBack as ArrowBackIcon,
  LocalFireDepartment as HotfixIcon,
  Schedule as ScheduleIcon,
  Code as ServiceIcon,
  Tag as TagIcon,
  RocketLaunch as ReleaseIcon,
  Description as DescriptionIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
  SelectAll as SelectAllIcon,
  CloudDownload as DownloadIcon
} from '@mui/icons-material';

const HotfixManagement = () => {
  const navigate = useNavigate();
  const [selectedEnvironment, setSelectedEnvironment] = useState('Test');
  const [selectedVersion, setSelectedVersion] = useState('v1.25.0');
  const [dbChangesDialog, setDbChangesDialog] = useState(false);
  const [selectedHotfix, setSelectedHotfix] = useState(null);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [selectionDialog, setSelectionDialog] = useState(false);
  const [selectedHotfixes, setSelectedHotfixes] = useState([]);
  const [approvalType, setApprovalType] = useState('all'); // 'all' or 'selected'
  const [dependencyDialog, setDependencyDialog] = useState(false);
  const [missingDependencies, setMissingDependencies] = useState([]);

  const environments = ['Development', 'Test', 'PreProduction', 'Production'];
  const versions = ['v1.25.0', 'v1.24.0', 'v1.23.0', 'v1.22.0'];

  // Mock hotfix data
  const hotfixes = [
    {
      id: 1,
      date: '2024-01-12',
      service: 'payment-service',
      description: 'Kredi kartı ödeme işleminde timeout hatası düzeltildi',
      version: 'v1.24.0',
      tag: 'hotfix-payment-1.24.0',
      release: 'Release-16',
      type: 'bug',
      breakingChange: false,
      dependencies: [3], // auth-service'e bağımlı
      dbChanges: [
        { type: 'ALTER', table: 'payments', description: 'timeout_duration kolonuna index eklendi', breaking: false },
        { type: 'UPDATE', table: 'payment_config', description: 'Default timeout değeri 30sn -> 60sn olarak güncellendi', breaking: false }
      ]
    },
    {
      id: 2,
      date: '2024-01-13',
      service: 'reporting-service',
      description: 'Müşteri raporlarında tarih formatı düzeltildi',
      version: 'v1.23.0',
      tag: 'hotfix-reporting-1.23.0',
      release: 'Release-16',
      type: 'bug',
      breakingChange: true,
      dependencies: [], // Bağımlılık yok
      dbChanges: [
        { type: 'DROP', table: 'report_cache', description: 'old_date_format kolonu silindi - BREAKING CHANGE', breaking: true },
        { type: 'ADD', table: 'report_cache', description: 'new_date_format kolonu eklendi (ISO-8601)', breaking: false },
        { type: 'CREATE', table: 'date_migration_log', description: 'Tarih format geçiş logları için yeni tablo', breaking: false }
      ]
    },
    {
      id: 3,
      date: '2024-01-14',
      service: 'auth-service',
      description: 'Token yenileme mekanizması iyileştirildi',
      version: 'v1.24.0',
      tag: 'hotfix-auth-1.24.0',
      release: 'Release-15',
      type: 'feature',
      breakingChange: false,
      dependencies: [], // Bağımlılık yok
      dbChanges: [
        { type: 'ADD', table: 'user_sessions', description: 'refresh_token_expiry kolonu eklendi', breaking: false },
        { type: 'ALTER', table: 'user_sessions', description: 'last_activity kolonuna index eklendi', breaking: false }
      ]
    },
    {
      id: 4,
      date: '2024-01-15',
      service: 'loan-service',
      description: 'Kredi hesaplama algoritması optimize edildi',
      version: 'v1.25.0',
      tag: 'hotfix-loan-1.25.0',
      release: 'Release-16',
      type: 'feature',
      breakingChange: false,
      dependencies: [1, 3], // payment-service ve auth-service'e bağımlı
      dbChanges: []
    },
    {
      id: 5,
      date: '2024-01-16',
      service: 'notification-service',
      description: 'Email gönderim hatası düzeltildi',
      version: 'v1.23.0',
      tag: 'hotfix-notification-1.23.0',
      release: 'Release-14',
      type: 'bug',
      breakingChange: false,
      dependencies: [], // Bağımlılık yok
      dbChanges: [
        { type: 'ALTER', table: 'email_queue', description: 'retry_count kolonu max değeri artırıldı', breaking: false }
      ]
    }
  ];

  const handleOpenDbChanges = (hotfix) => {
    setSelectedHotfix(hotfix);
    setDbChangesDialog(true);
  };

  const handleCloseDbChanges = () => {
    setDbChangesDialog(false);
    setSelectedHotfix(null);
  };

  const handleOpenApprovalAll = () => {
    setApprovalType('all');
    setApprovalDialog(true);
  };

  const handleOpenSelectionDialog = () => {
    setSelectedHotfixes([]);
    setSelectionDialog(true);
  };

  const handleCloseSelectionDialog = () => {
    setSelectionDialog(false);
  };

  const handleToggleHotfix = (hotfixId) => {
    setSelectedHotfixes(prev => {
      if (prev.includes(hotfixId)) {
        return prev.filter(id => id !== hotfixId);
      } else {
        return [...prev, hotfixId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedHotfixes.length === hotfixes.length) {
      setSelectedHotfixes([]);
    } else {
      setSelectedHotfixes(hotfixes.map(h => h.id));
    }
  };

  // Bağımlılık kontrolü
  const checkDependencies = (selectedIds) => {
    const missing = [];
    
    selectedIds.forEach(id => {
      const hotfix = hotfixes.find(h => h.id === id);
      if (hotfix && hotfix.dependencies && hotfix.dependencies.length > 0) {
        hotfix.dependencies.forEach(depId => {
          if (!selectedIds.includes(depId)) {
            const depHotfix = hotfixes.find(h => h.id === depId);
            if (depHotfix) {
              missing.push({
                source: hotfix,
                dependency: depHotfix
              });
            }
          }
        });
      }
    });
    
    return missing;
  };

  const handleProceedToApproval = () => {
    // Bağımlılık kontrolü yap
    const missing = checkDependencies(selectedHotfixes);
    
    if (missing.length > 0) {
      setMissingDependencies(missing);
      setDependencyDialog(true);
      return;
    }
    
    setSelectionDialog(false);
    setApprovalType('selected');
    setApprovalDialog(true);
  };

  const handleAddMissingDependencies = () => {
    // Eksik bağımlılıkları seçime ekle
    const newSelections = [...selectedHotfixes];
    missingDependencies.forEach(({ dependency }) => {
      if (!newSelections.includes(dependency.id)) {
        newSelections.push(dependency.id);
      }
    });
    setSelectedHotfixes(newSelections);
    setDependencyDialog(false);
    
    // Yeni seçim ile tekrar kontrol et
    const stillMissing = checkDependencies(newSelections);
    if (stillMissing.length === 0) {
      setSelectionDialog(false);
      setApprovalType('selected');
      setApprovalDialog(true);
    } else {
      // Hala eksik bağımlılık varsa (nested dependencies), tekrar göster
      setMissingDependencies(stillMissing);
      setDependencyDialog(true);
    }
  };

  const handleCloseApproval = () => {
    setApprovalDialog(false);
  };

  const handleConfirmApproval = () => {
    // Burada gerçek onay işlemi yapılır
    alert(`${approvalType === 'all' ? 'Tüm hotfixler' : `${selectedHotfixes.length} hotfix`} onaylandı!`);
    setApprovalDialog(false);
    setSelectedHotfixes([]);
  };

  // Özet kartından tıklanarak seçim yapma
  const handleSummaryClick = (env, type) => {
    // Ortamı seçili yap
    setSelectedEnvironment(env);
    
    // Tipe uygun hotfixleri filtrele ve seç
    const filtered = hotfixes.filter(h => h.type === type);
    setSelectedHotfixes(filtered.map(h => h.id));
    
    // Seçim dialogunu aç
    setSelectionDialog(true);
  };

  const getTypeInfo = (type) => {
    return type === 'bug' 
      ? { icon: <BugIcon />, color: 'error', label: 'Bug Fix' }
      : { icon: <FeatureIcon />, color: 'success', label: 'Feature' };
  };

  const getDbChangeTypeColor = (type) => {
    switch (type) {
      case 'DROP': return 'error';
      case 'ALTER': return 'warning';
      case 'ADD': return 'success';
      case 'CREATE': return 'info';
      case 'UPDATE': return 'primary';
      default: return 'default';
    }
  };

  const hotfixesWithBreakingChanges = hotfixes.filter(h => h.breakingChange).length;
  const hotfixesWithDbChanges = hotfixes.filter(h => h.dbChanges.length > 0).length;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/customer-dashboard')}
            variant="outlined"
            size="small"
          >
            Geri
          </Button>
          <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HotfixIcon fontSize="large" color="error" />
            Bekleyen Hotfixler
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          {selectedVersion} versiyonu - {selectedEnvironment} ortamı için bekleyen hotfix listesi
        </Typography>
      </Box>

      {/* Filtreler ve İstatistikler */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Ortam</InputLabel>
              <Select
                value={selectedEnvironment}
                onChange={(e) => setSelectedEnvironment(e.target.value)}
                label="Ortam"
              >
                {environments.map((env) => (
                  <MenuItem key={env} value={env}>{env}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Versiyon</InputLabel>
              <Select
                value={selectedVersion}
                onChange={(e) => setSelectedVersion(e.target.value)}
                label="Versiyon"
              >
                {versions.map((ver) => (
                  <MenuItem key={ver} value={ver}>{ver}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip label={`Toplam: ${hotfixes.length}`} color="primary" />
              <Chip 
                label={`Breaking Change: ${hotfixesWithBreakingChanges}`} 
                color="error" 
                icon={<WarningIcon />}
              />
              <Chip 
                label={`DB Değişikliği: ${hotfixesWithDbChanges}`} 
                color="warning" 
                icon={<DatabaseIcon />}
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Aksiyon Butonları */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          startIcon={<DownloadIcon />}
          onClick={handleOpenApprovalAll}
        >
          Tüm Hotfixleri Al
        </Button>
        <Button
          variant="outlined"
          color="primary"
          size="large"
          startIcon={<SelectAllIcon />}
          onClick={handleOpenSelectionDialog}
        >
          Seçili Hotfixleri Al
        </Button>
      </Box>

      {/* Breaking Change Uyarısı */}
      {hotfixesWithBreakingChanges > 0 && (
        <Alert severity="error" sx={{ mb: 3 }} icon={<WarningIcon />}>
          <Typography variant="subtitle2" fontWeight="bold">
            ⚠️ Dikkat: Breaking Change İçeren Hotfixler Var!
          </Typography>
          <Typography variant="body2">
            {hotfixesWithBreakingChanges} hotfix breaking change içermektedir. 
            Özellikle raporlama altyapısını etkileyebilecek kolon silme işlemleri bulunmaktadır.
          </Typography>
        </Alert>
      )}

      {/* Hotfix Listesi */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.light' }}>
              <TableCell><strong>Tarih</strong></TableCell>
              <TableCell><strong>Service</strong></TableCell>
              <TableCell><strong>Açıklama</strong></TableCell>
              <TableCell><strong>Versiyon/Tag</strong></TableCell>
              <TableCell><strong>Release</strong></TableCell>
              <TableCell><strong>Tip</strong></TableCell>
              <TableCell><strong>Bağımlılıklar</strong></TableCell>
              <TableCell><strong>Breaking</strong></TableCell>
              <TableCell><strong>DB Değişiklikleri</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {hotfixes.map((hotfix) => {
              const typeInfo = getTypeInfo(hotfix.type);
              return (
                <TableRow 
                  key={hotfix.id}
                  sx={{ 
                    '&:hover': { bgcolor: 'action.hover' },
                    bgcolor: hotfix.breakingChange ? 'error.lighter' : 'inherit'
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ScheduleIcon fontSize="small" color="action" />
                      <Typography variant="body2">{hotfix.date}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={hotfix.service} 
                      size="small" 
                      icon={<ServiceIcon />}
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{hotfix.description}</Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Version:</Typography>
                      <Typography variant="body2" fontWeight="bold">{hotfix.version}</Typography>
                      <Chip 
                        label={hotfix.tag} 
                        size="small" 
                        icon={<TagIcon />}
                        variant="outlined"
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={hotfix.release} 
                      size="small" 
                      icon={<ReleaseIcon />}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={typeInfo.icon}
                      label={typeInfo.label}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {hotfix.dependencies && hotfix.dependencies.length > 0 ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {hotfix.dependencies.map(depId => {
                          const depHotfix = hotfixes.find(h => h.id === depId);
                          return depHotfix ? (
                            <Chip
                              key={depId}
                              label={`${depHotfix.service} ${depHotfix.version}`}
                              size="small"
                              color="warning"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem' }}
                            />
                          ) : null;
                        })}
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary">-</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {hotfix.breakingChange ? (
                      <Tooltip title="Breaking Change İçeriyor!">
                        <Chip 
                          label="BREAKING" 
                          size="small" 
                          color="error"
                          icon={<WarningIcon />}
                        />
                      </Tooltip>
                    ) : (
                      <Chip label="Safe" size="small" color="success" icon={<CheckIcon />} />
                    )}
                  </TableCell>
                  <TableCell>
                    {hotfix.dbChanges.length > 0 ? (
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        startIcon={<DatabaseIcon />}
                        endIcon={
                          <Badge 
                            badgeContent={hotfix.dbChanges.length} 
                            color="error"
                          />
                        }
                        onClick={() => handleOpenDbChanges(hotfix)}
                      >
                        Görüntüle
                      </Button>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        Değişiklik Yok
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Ortam Bazlı Özet Kart */}
      <Paper sx={{ p: 3, mt: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <ScheduleIcon />
          Waiting Hot-fixes
        </Typography>

        <Box sx={{ overflowX: 'auto' }}>
          <Box sx={{ display: 'flex', gap: 2, minWidth: 800 }}>
            {/* Development */}
            <Box sx={{ flex: 1, textAlign: 'center' }}>
              <Typography variant="body2" fontWeight="bold" sx={{ mb: 2 }}>
                Development
              </Typography>
              <Typography 
                variant="body2" 
                color="primary" 
                sx={{ mb: 2, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
              >
                v1.24.0
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 2 }}>
                <Box 
                  onClick={() => handleSummaryClick('Development', 'bug')} 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { opacity: 0.8, transform: 'scale(1.05)' },
                    transition: 'all 0.2s'
                  }}
                >
                  <BugIcon sx={{ color: 'error.main', fontSize: 40, mb: 1 }} />
                  <Box
                    sx={{
                      border: '2px solid',
                      borderColor: 'error.main',
                      borderRadius: '24px',
                      px: 3,
                      py: 1,
                      backgroundColor: 'error.light',
                      color: 'error.dark'
                    }}
                  >
                    <Typography variant="h6" fontWeight="bold">5</Typography>
                  </Box>
                </Box>
                <Box 
                  onClick={() => handleSummaryClick('Development', 'feature')} 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { opacity: 0.8, transform: 'scale(1.05)' },
                    transition: 'all 0.2s'
                  }}
                >
                  <FeatureIcon sx={{ color: 'primary.main', fontSize: 40, mb: 1 }} />
                  <Box
                    sx={{
                      border: '2px solid',
                      borderColor: 'primary.main',
                      borderRadius: '24px',
                      px: 3,
                      py: 1,
                      backgroundColor: 'background.paper'
                    }}
                  >
                    <Typography variant="h6" fontWeight="bold" color="primary">12</Typography>
                  </Box>
                </Box>
              </Box>
              <Button
                variant="outlined"
                color="success"
                fullWidth
                startIcon={<CheckIcon />}
                sx={{ borderRadius: '24px' }}
                onClick={() => navigate('/releases')}
              >
                Upgrade to v1.25
              </Button>
            </Box>

            {/* Test */}
            <Box sx={{ flex: 1, textAlign: 'center' }}>
              <Typography variant="body2" fontWeight="bold" sx={{ mb: 2 }}>
                Test
              </Typography>
              <Typography 
                variant="body2" 
                color="primary" 
                sx={{ mb: 2, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
              >
                v1.23.0
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 2 }}>
                <Box 
                  onClick={() => handleSummaryClick('Test', 'bug')} 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { opacity: 0.8, transform: 'scale(1.05)' },
                    transition: 'all 0.2s'
                  }}
                >
                  <BugIcon sx={{ color: 'success.main', fontSize: 40, mb: 1 }} />
                  <Box
                    sx={{
                      border: '2px solid',
                      borderColor: 'success.main',
                      borderRadius: '24px',
                      px: 3,
                      py: 1,
                      backgroundColor: 'success.light',
                      color: 'success.dark'
                    }}
                  >
                    <Typography variant="h6" fontWeight="bold">0</Typography>
                  </Box>
                </Box>
                <Box 
                  onClick={() => handleSummaryClick('Test', 'feature')} 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { opacity: 0.8, transform: 'scale(1.05)' },
                    transition: 'all 0.2s'
                  }}
                >
                  <FeatureIcon sx={{ color: 'success.main', fontSize: 40, mb: 1 }} />
                  <Box
                    sx={{
                      border: '2px solid',
                      borderColor: 'success.main',
                      borderRadius: '24px',
                      px: 3,
                      py: 1,
                      backgroundColor: 'success.light',
                      color: 'success.dark'
                    }}
                  >
                    <Typography variant="h6" fontWeight="bold">0</Typography>
                  </Box>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                There is no new version
              </Typography>
            </Box>

            {/* PreProduction */}
            <Box sx={{ flex: 1, textAlign: 'center' }}>
              <Typography variant="body2" fontWeight="bold" sx={{ mb: 2 }}>
                PreProduction
              </Typography>
              <Typography 
                variant="body2" 
                color="primary" 
                sx={{ mb: 2, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
              >
                v1.23.0
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 2 }}>
                <Box 
                  onClick={() => handleSummaryClick('PreProduction', 'bug')} 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { opacity: 0.8, transform: 'scale(1.05)' },
                    transition: 'all 0.2s'
                  }}
                >
                  <BugIcon sx={{ color: 'error.main', fontSize: 40, mb: 1 }} />
                  <Box
                    sx={{
                      border: '2px solid',
                      borderColor: 'error.main',
                      borderRadius: '24px',
                      px: 3,
                      py: 1,
                      backgroundColor: 'error.light',
                      color: 'error.dark'
                    }}
                  >
                    <Typography variant="h6" fontWeight="bold">5</Typography>
                  </Box>
                </Box>
                <Box 
                  onClick={() => handleSummaryClick('PreProduction', 'feature')} 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { opacity: 0.8, transform: 'scale(1.05)' },
                    transition: 'all 0.2s'
                  }}
                >
                  <FeatureIcon sx={{ color: 'primary.main', fontSize: 40, mb: 1 }} />
                  <Box
                    sx={{
                      border: '2px solid',
                      borderColor: 'primary.main',
                      borderRadius: '24px',
                      px: 3,
                      py: 1,
                      backgroundColor: 'background.paper'
                    }}
                  >
                    <Typography variant="h6" fontWeight="bold" color="primary">7</Typography>
                  </Box>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                &nbsp;
              </Typography>
            </Box>

            {/* Production */}
            <Box sx={{ flex: 1, textAlign: 'center' }}>
              <Typography variant="body2" fontWeight="bold" sx={{ mb: 2 }}>
                Production
              </Typography>
              <Typography 
                variant="body2" 
                color="primary" 
                sx={{ mb: 2, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
              >
                v1.23.0
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 2 }}>
                <Box 
                  onClick={() => handleSummaryClick('Production', 'bug')} 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { opacity: 0.8, transform: 'scale(1.05)' },
                    transition: 'all 0.2s'
                  }}
                >
                  <BugIcon sx={{ color: 'error.main', fontSize: 40, mb: 1 }} />
                  <Box
                    sx={{
                      border: '2px solid',
                      borderColor: 'error.main',
                      borderRadius: '24px',
                      px: 3,
                      py: 1,
                      backgroundColor: 'error.light',
                      color: 'error.dark'
                    }}
                  >
                    <Typography variant="h6" fontWeight="bold">5</Typography>
                  </Box>
                </Box>
                <Box 
                  onClick={() => handleSummaryClick('Production', 'feature')} 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { opacity: 0.8, transform: 'scale(1.05)' },
                    transition: 'all 0.2s'
                  }}
                >
                  <FeatureIcon sx={{ color: 'primary.main', fontSize: 40, mb: 1 }} />
                  <Box
                    sx={{
                      border: '2px solid',
                      borderColor: 'primary.main',
                      borderRadius: '24px',
                      px: 3,
                      py: 1,
                      backgroundColor: 'background.paper'
                    }}
                  >
                    <Typography variant="h6" fontWeight="bold" color="primary">7</Typography>
                  </Box>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                &nbsp;
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* DB Değişiklikleri Dialog */}
      <Dialog
        open={dbChangesDialog}
        onClose={handleCloseDbChanges}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DatabaseIcon color="warning" />
            <Typography variant="h6">Veritabanı Değişiklikleri</Typography>
          </Box>
          {selectedHotfix && (
            <Typography variant="body2" color="text.secondary">
              {selectedHotfix.service} - {selectedHotfix.version}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent dividers>
          {selectedHotfix && selectedHotfix.dbChanges.length > 0 ? (
            <List>
              {selectedHotfix.dbChanges.map((change, index) => (
                <React.Fragment key={index}>
                  <ListItem
                    sx={{
                      bgcolor: change.breaking ? 'error.lighter' : 'inherit',
                      borderRadius: 1,
                      mb: 1
                    }}
                  >
                    <ListItemIcon>
                      {change.breaking ? (
                        <WarningIcon color="error" />
                      ) : (
                        <CheckIcon color="success" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Chip 
                            label={change.type} 
                            size="small" 
                            color={getDbChangeTypeColor(change.type)}
                          />
                          <Typography variant="subtitle2" fontWeight="bold">
                            {change.table}
                          </Typography>
                          {change.breaking && (
                            <Chip label="BREAKING" size="small" color="error" />
                          )}
                        </Box>
                      }
                      secondary={change.description}
                    />
                  </ListItem>
                  {index < selectedHotfix.dbChanges.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Typography>Veritabanı değişikliği bulunmamaktadır.</Typography>
          )}

          {selectedHotfix && selectedHotfix.dbChanges.some(c => c.breaking) && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography variant="subtitle2" fontWeight="bold">
                ⚠️ Breaking Change Uyarısı
              </Typography>
              <Typography variant="body2">
                Bu hotfix raporlama altyapısını etkileyebilecek breaking change içermektedir.
                Özellikle kolon silme işlemleri mevcut raporları bozabilir.
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDbChanges} variant="outlined">
            Kapat
          </Button>
        </DialogActions>
      </Dialog>

      {/* Seçim Dialog */}
      <Dialog
        open={selectionDialog}
        onClose={handleCloseSelectionDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h6">Hotfix Seçimi</Typography>
              {selectedHotfixes.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                  {selectedEnvironment} ortamı - {selectedHotfixes.length} hotfix seçildi
                </Typography>
              )}
            </Box>
            <Button
              size="small"
              startIcon={selectedHotfixes.length === hotfixes.length ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}
              onClick={handleSelectAll}
            >
              {selectedHotfixes.length === hotfixes.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Almak istediğiniz hotfixleri seçin:
          </Typography>
          <List>
            {hotfixes.map((hotfix) => (
              <ListItem
                key={hotfix.id}
                button
                onClick={() => handleToggleHotfix(hotfix.id)}
                sx={{ 
                  borderRadius: 1, 
                  mb: 1,
                  border: '1px solid',
                  borderColor: selectedHotfixes.includes(hotfix.id) ? 'primary.main' : 'divider',
                  bgcolor: selectedHotfixes.includes(hotfix.id) ? 'primary.lighter' : 'inherit'
                }}
              >
                <ListItemIcon>
                  <Checkbox
                    edge="start"
                    checked={selectedHotfixes.includes(hotfix.id)}
                    tabIndex={-1}
                    disableRipple
                  />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {hotfix.service}
                      </Typography>
                      <Chip label={hotfix.version} size="small" />
                      {hotfix.breakingChange && (
                        <Chip label="BREAKING" size="small" color="error" />
                      )}
                    </Box>
                  }
                  secondary={hotfix.description}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSelectionDialog}>İptal</Button>
          <Button
            onClick={handleProceedToApproval}
            variant="contained"
            disabled={selectedHotfixes.length === 0}
          >
            Devam Et ({selectedHotfixes.length})
          </Button>
        </DialogActions>
      </Dialog>

      {/* Onay Dialog */}
      <Dialog
        open={approvalDialog}
        onClose={handleCloseApproval}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color="warning" />
            <Typography variant="h6">Hotfix Onayı</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Onay Gerekli
            </Typography>
            <Typography variant="body2">
              {approvalType === 'all' 
                ? `Tüm hotfixler (${hotfixes.length} adet)` 
                : `Seçilen ${selectedHotfixes.length} hotfix`
              } {selectedEnvironment} ortamına uygulanacaktır.
            </Typography>
          </Alert>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Özet:
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Ortam</Typography>
                  <Typography variant="body2" fontWeight="bold">{selectedEnvironment}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Versiyon</Typography>
                  <Typography variant="body2" fontWeight="bold">{selectedVersion}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Hotfix Sayısı</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {approvalType === 'all' ? hotfixes.length : selectedHotfixes.length}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">Breaking Changes</Typography>
                  <Typography variant="body2" fontWeight="bold" color="error.main">
                    {approvalType === 'all' 
                      ? hotfixesWithBreakingChanges 
                      : hotfixes.filter(h => selectedHotfixes.includes(h.id) && h.breakingChange).length
                    }
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>

          {((approvalType === 'all' && hotfixesWithBreakingChanges > 0) ||
            (approvalType === 'selected' && hotfixes.filter(h => selectedHotfixes.includes(h.id) && h.breakingChange).length > 0)) && (
            <Alert severity="error">
              Breaking change içeren hotfixler var! Raporlama altyapısı etkilenebilir.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseApproval}>İptal</Button>
          <Button onClick={handleConfirmApproval} variant="contained" color="primary">
            Onayla ve Uygula
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bağımlılık Uyarı Dialog */}
      <Dialog 
        open={dependencyDialog} 
        onClose={() => setDependencyDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color="error" />
            <Typography variant="h6">Eksik Bağımlılıklar Tespit Edildi</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Dikkat! Bağımlılık Hatası
            </Typography>
            <Typography variant="body2">
              Seçtiğiniz bazı hotfixler başka hotfixlere bağımlıdır. Lütfen aşağıdaki eksik bağımlılıkları da seçiminize ekleyin.
            </Typography>
          </Alert>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Eksik Bağımlılıklar ({missingDependencies.length} adet):
            </Typography>

            {missingDependencies.map((item, index) => (
              <Paper 
                key={index}
                elevation={2}
                sx={{ 
                  p: 2, 
                  mb: 2,
                  borderLeft: '4px solid',
                  borderColor: 'error.main'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Chip 
                    label={item.source.service}
                    size="small"
                    color="primary"
                  />
                  <Typography variant="body2" color="text.secondary">
                    {item.source.version}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    seçildi
                  </Typography>
                </Box>

                <Alert severity="warning" sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" fontWeight="bold">
                      Bağımlılık:
                    </Typography>
                    <Chip 
                      label={item.dependency.service}
                      size="small"
                      color="error"
                      variant="outlined"
                    />
                    <Typography variant="body2" color="text.secondary">
                      {item.dependency.version}
                    </Typography>
                    <Chip 
                      label="SEÇİLMEDİ"
                      size="small"
                      color="error"
                      sx={{ ml: 'auto' }}
                    />
                  </Box>
                </Alert>

                <Box sx={{ pl: 2, borderLeft: '2px solid #e0e0e0' }}>
                  <Typography variant="caption" color="text.secondary">
                    {item.dependency.description}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Chip 
                      label={item.dependency.tag}
                      size="small"
                      variant="outlined"
                    />
                    <Chip 
                      label={item.dependency.release}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                </Box>
              </Paper>
            ))}
          </Box>

          <Alert severity="info">
            <Typography variant="body2">
              <strong>Önerilen Aksiyon:</strong> Eksik bağımlılıkları otomatik olarak seçiminize ekleyin.
              Bu işlem, tüm bağımlı hotfixlerin birlikte uygulanmasını sağlayacaktır.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDependencyDialog(false)}>
            Geri Dön
          </Button>
          <Button 
            onClick={handleAddMissingDependencies} 
            variant="contained" 
            color="primary"
            startIcon={<CheckBoxIcon />}
          >
            Eksik Bağımlılıkları Ekle ve Devam Et
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default HotfixManagement;
