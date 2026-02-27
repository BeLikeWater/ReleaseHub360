import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Avatar,
  List,
  ListItem,
  Button,
  Collapse,
  CircularProgress,
  Divider,
  Alert,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  RocketLaunch as ReleaseIcon,
  ArrowBack as ArrowBackIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  BugReport as HotfixIcon,
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  Description as DescriptionIcon,
  Assignment as AssignmentIcon,
  History as HistoryIcon,
  ReportProblem as ReportProblemIcon
} from '@mui/icons-material';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

const Releases = () => {
  const navigate = useNavigate();
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedVersions, setExpandedVersions] = useState({});
  const [environments, setEnvironments] = useState(['Dev', 'Test', 'Prep', 'Prod']);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [approvalDialog, setApprovalDialog] = useState({ open: false, releaseId: null, environment: null });
  const [approvingEnv, setApprovingEnv] = useState({});

  // Firebase'den yayınlanmış versiyonları çek
  useEffect(() => {
    const fetchReleases = async () => {
      try {
        setLoading(true);
        
        // Müşteri bilgisini localStorage'dan al
        const loginInfo = localStorage.getItem('customerDashboardLogin');
        if (loginInfo) {
          const parsed = JSON.parse(loginInfo);
          
          // Environment'ları müşteri bilgisinden al
          if (parsed.customerInfo && parsed.customerInfo.environments && parsed.customerInfo.environments.length > 0) {
            setEnvironments(parsed.customerInfo.environments);
          }
        }
        
        const versionsRef = collection(db, 'productVersions');
        const q = query(versionsRef, where('status', '==', 'Published'));
        const querySnapshot = await getDocs(q);
        
        const versionsData = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          versionsData.push({
            id: doc.id,
            ...data
          });
        });
        
        // Versiyon numarasına göre sırala (büyükten küçüğe)
        versionsData.sort((a, b) => {
          const numA = versionToNumber(a.version);
          const numB = versionToNumber(b.version);
          return numB - numA;
        });
        
        console.log('📦 Yayınlanmış versiyonlar:', versionsData);
        setReleases(versionsData);
      } catch (error) {
        console.error('Versiyonlar yüklenirken hata:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchReleases();
  }, []);

  // Versiyon numarasını sayıya çevir (v1.3.0 -> 130)
  const versionToNumber = (version) => {
    if (!version) return 0;
    const clean = version.replace(/^v/, '');
    const parts = clean.split('.').map(p => parseInt(p) || 0);
    return parts[0] * 100 + (parts[1] || 0) * 10 + (parts[2] || 0);
  };

  const toggleExpand = (versionId) => {
    setExpandedVersions(prev => ({
      ...prev,
      [versionId]: !prev[versionId]
    }));
  };

  const handleApprovalClick = (releaseId, environment) => {
    setApprovalDialog({ open: true, releaseId, environment });
  };

  const handleApprovalConfirm = async () => {
    const { releaseId, environment } = approvalDialog;
    const envKey = `${releaseId}-${environment}`;
    
    // Loading başlat
    setApprovingEnv(prev => ({ ...prev, [envKey]: true }));
    setApprovalDialog({ open: false, releaseId: null, environment: null });
    
    // 5 saniye bekle (POC için)
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Release'i güncelle
    setReleases(prev => prev.map(release => {
      if (release.id === releaseId) {
        return {
          ...release,
          [environment.toLowerCase()]: 'Approved'
        };
      }
      return release;
    }));
    
    // Loading'i kapat
    setApprovingEnv(prev => ({ ...prev, [envKey]: false }));
  };

  const handleApprovalCancel = () => {
    setApprovalDialog({ open: false, releaseId: null, environment: null });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Box sx={{ p: 4 }}>
      {/* Header */}
      <Paper elevation={4} sx={{ p: 3, mb: 4, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/customer-dashboard-v2')}
              variant="outlined"
              size="small"
            >
              Geri
            </Button>
            <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
              <ReleaseIcon />
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight="bold">
                Yayınlanmış Versiyonlar
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tüm Published durumundaki versiyonlar
              </Typography>
            </Box>
          </Box>
          <Chip
            label={`${releases.length} Versiyon`}
            color="primary"
            size="medium"
            sx={{ fontWeight: 'bold', fontSize: '1rem' }}
          />
        </Box>
      </Paper>

      {/* Releases Listesi */}
      <Paper elevation={4} sx={{ borderRadius: 3, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}>
            <CircularProgress size={60} />
          </Box>
        ) : releases.length === 0 ? (
          <Box sx={{ p: 10, textAlign: 'center' }}>
            <Alert severity="info">Henüz yayınlanmış versiyon bulunmamaktadır.</Alert>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {releases.map((release, index) => {
              const isExpanded = expandedVersions[release.id];
              const hasReleases = release.releases && release.releases.length > 0;

              return (
                <React.Fragment key={release.id}>
                  <ListItem
                    sx={{
                      p: 2,
                      borderBottom: index < releases.length - 1 ? '1px solid' : 'none',
                      borderColor: 'divider',
                      flexDirection: 'column',
                      alignItems: 'stretch'
                    }}
                  >
                    {/* Ana Satır */}
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        width: '100%',
                      }}
                    >
                      {/* Icon - Hotfix veya Release */}
                      <Avatar
                        sx={{
                          bgcolor: release.isHotfix ? 'error.main' : 'success.main',
                          width: 36,
                          height: 36,
                          mr: 1.5
                        }}
                      >
                        {release.isHotfix ? <HotfixIcon /> : <ReleaseIcon />}
                      </Avatar>

                      {/* Versiyon Bilgisi */}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" fontWeight="bold" color="primary.main">
                          {release.version && !release.version.startsWith('v') ? `v${release.version}` : release.version}
                        </Typography>
                        {hasReleases && (
                          <Button
                            onClick={() => toggleExpand(release.id)}
                            size="small"
                            sx={{ 
                              mt: 0.5,
                              textTransform: 'none',
                              p: 0,
                              minWidth: 'auto',
                              '&:hover': {
                                backgroundColor: 'transparent',
                                textDecoration: 'underline'
                              }
                            }}
                          >
                            {isExpanded ? 'Servisleri Gizle' : `Servisleri Görüntüle (${release.releases.length})`}
                          </Button>
                        )}
                      </Box>

                      {/* Environment Butonları */}
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flex: 1, justifyContent: 'center' }}>
                        {environments.map((env) => {
                          // Ortam durumunu productVersions dökümanından al (küçük harf ile)
                          const envKey = env.toLowerCase();
                          const envStatus = release[envKey]; // undefined ise bir şey yapma
                          
                          // Duruma göre stil ayarları
                          const getChipProps = () => {
                            if (!envStatus) {
                              // Eğer property yoksa normal outlined chip
                              return {
                                variant: 'outlined',
                                sx: {
                                  borderColor: 'grey.300',
                                  color: 'grey.600',
                                  borderWidth: '1px'
                                },
                                icon: null
                              };
                            }
                            
                            switch(envStatus) {
                              case 'Approved':
                                return {
                                  variant: 'outlined',
                                  sx: {
                                    borderColor: '#66bb6a',
                                    color: '#2e7d32',
                                    borderWidth: '1px',
                                    backgroundColor: '#e8f5e9',
                                    '&:hover': {
                                      borderColor: '#66bb6a',
                                      backgroundColor: '#e8f5e9'
                                    }
                                  },
                                  icon: <CheckCircleIcon sx={{ fontSize: 16, color: '#66bb6a' }} />
                                };
                              case 'PendingApproval':
                                return {
                                  variant: 'filled',
                                  color: 'info',
                                  sx: {
                                    backgroundColor: 'info.main',
                                    color: 'white',
                                    '&:hover': {
                                      backgroundColor: 'info.dark'
                                    }
                                  },
                                  icon: <AccessTimeIcon sx={{ fontSize: 16, color: 'white' }} />
                                };
                              default:
                                // Bilinmeyen durumlar için normal outlined
                                return {
                                  variant: 'outlined',
                                  sx: {
                                    borderColor: 'grey.300',
                                    color: 'grey.600',
                                    borderWidth: '1px'
                                  },
                                  icon: null
                                };
                            }
                          };
                          
                          const chipProps = getChipProps();
                          const isApproving = approvingEnv[`${release.id}-${env}`];
                          
                          return (
                            <Box key={env} sx={{ position: 'relative', display: 'inline-block' }}>
                              <Chip
                                label={env}
                                size="small"
                                variant={chipProps.variant}
                                color={chipProps.color}
                                icon={isApproving ? <CircularProgress size={16} sx={{ color: 'white' }} /> : chipProps.icon}
                                onClick={envStatus === 'PendingApproval' && !isApproving ? () => handleApprovalClick(release.id, env) : undefined}
                                sx={{
                                  minWidth: '85px',
                                  fontWeight: '600',
                                  fontSize: '0.8125rem',
                                  height: '32px',
                                  borderRadius: '16px',
                                  px: 1,
                                  cursor: envStatus === 'PendingApproval' && !isApproving ? 'pointer' : 'default',
                                  '& .MuiChip-icon': {
                                    marginLeft: '8px',
                                    marginRight: '-4px'
                                  },
                                  ...chipProps.sx
                                }}
                              />
                            </Box>
                          );
                        })}
                      </Box>

                      {/* Context Menu */}
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          setAnchorEl(e.currentTarget);
                          setSelectedRelease(release);
                        }}
                        sx={{ ml: 2 }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Box>

                    {/* Expandable Releases */}
                    {hasReleases && (
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{ mt: 2, pl: 4, pr: 2 }}>
                          <Divider sx={{ mb: 2 }} />
                          <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" sx={{ mb: 1 }}>
                            Güncelleme Bekleyen Servisler ({release.releases.length})
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {release.releases.map((service, idx) => (
                              <Box
                                key={idx}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 2,
                                  p: 1,
                                  bgcolor: '#f5f5f5',
                                  borderRadius: 1
                                }}
                              >
                                <Typography variant="caption" sx={{ flex: 1, fontSize: '0.75rem' }}>
                                  {service.releaseName}
                                </Typography>
                                <Chip
                                  label={service.version}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontFamily: 'monospace', fontSize: '0.7rem', height: '20px' }}
                                />
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      </Collapse>
                    )}
                  </ListItem>
                </React.Fragment>
              );
            })}
          </List>
        )}
      </Paper>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => {
          setAnchorEl(null);
          setSelectedRelease(null);
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={() => {
          // Release Notlar action - navigate to ReleaseNoteForVersion
          navigate('/release-note-for-version', { state: { release: selectedRelease } });
          setAnchorEl(null);
        }}>
          <ListItemIcon>
            <DescriptionIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Release Notlar</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          // Yapılacaklar Listesi action
          navigate('/todo-list');
          setAnchorEl(null);
        }}>
          <ListItemIcon>
            <AssignmentIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Yapılacaklar Listesi</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          // Değişiklik Listesi action
          navigate('/change-tracking');
          setAnchorEl(null);
        }}>
          <ListItemIcon>
            <HistoryIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Değişiklik Listesi</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={() => {
            // Hata Bildir action
            navigate('/report-issue');
            setAnchorEl(null);
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <ReportProblemIcon fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText>Hata Bildir</ListItemText>
        </MenuItem>
      </Menu>

      {/* Approval Dialog */}
      <Dialog
        open={approvalDialog.open}
        onClose={handleApprovalCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Ortam Onayı</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>{approvalDialog.environment}</strong> ortamı için bu versiyonu onaylamak istediğinizden emin misiniz?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleApprovalCancel} color="inherit">
            İptal
          </Button>
          <Button onClick={handleApprovalConfirm} variant="contained" color="primary" autoFocus>
            Onayla
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Releases;
