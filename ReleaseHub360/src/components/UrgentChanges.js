import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Chip,
  Grid,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
  IconButton,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  PlayArrow as StartIcon,
  Done as DoneIcon,
  Error as ErrorIcon,
  AttachFile as AttachFileIcon,
  Schedule as ScheduleIcon,
  Description as DescriptionIcon,
  Code as CodeIcon,
  AccountTree as VersionIcon,
  Visibility as ViewIcon,
  PlaylistAddCheck as TaskIcon
} from '@mui/icons-material';

const UrgentChanges = () => {
  const navigate = useNavigate();
  const [selectedChange, setSelectedChange] = useState(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all'); // all, not-started, in-progress, completed, error

  // Mock urgent changes data
  const urgentChanges = [
    {
      id: 1,
      app: 'Redis',
      title: 'Versiyon Güncellemesi (v5.0.7 → v7.2.1)',
      description: 'Redis\'in mevcut 5.0.7 sürümünde yaşanan bellek yönetimi sorunları ve eksik TLS desteği nedeniyle, Redis\'in 7.2.1 sürümüne yükseltilmesi planlanmaktadır.',
      version: 'v6.2.1',
      deadline: '2025-12-31',
      status: 'not-started', // not-started, in-progress, completed, error
      priority: 'high',
      tasks: [
        'Redis sunucusunun yedeği alınacak.',
        'Yeni sürüm için yapılandırma dosyaları (redis.conf) güncellenecek.',
        'appendonly ve save parametreleri gözden geçirilecek.',
        'Upgrade sonrası bağlantı testleri ve performans ölçümleri yapılacak.'
      ],
      attachments: [
        'redis-migration-plan.pdf',
        'redis.conf.backup',
        'performance-metrics.xlsx'
      ]
    },
    {
      id: 2,
      app: 'Keycloak',
      title: 'Yeni Client Tanımı ve Config Ekleme',
      description: 'Yeni bir mikroservis için Keycloak üzerinde client_id: payment-service adıyla bir client tanımı yapılacaktır.',
      version: 'v6.2.1',
      deadline: '2025-10-15',
      status: 'in-progress',
      priority: 'high',
      tasks: [
        'client_id, client_secret, redirect_uri, valid redirect URIs tanımlanacak.',
        'access token lifespan değeri 3600 saniye olarak ayarlanacak.',
        'Service Account Roles altında payment-admin rolü eklenecek.',
        'Gerekli Protocol Mapper tanımlamaları yapılacak (örn. groups, email, preferred_username).'
      ],
      attachments: [
        'keycloak-client-config.json',
        'protocol-mapper-setup.md'
      ]
    },
    {
      id: 3,
      app: 'Kafka',
      title: 'Yeni Topic Oluşturulması (payment-events)',
      description: 'Yeni bir mikroservis için Kafka üzerinde payment-events adlı bir topic oluşturulacaktır.',
      version: 'v6.2.1',
      deadline: '2025-10-10',
      status: 'completed',
      priority: 'medium',
      tasks: [
        'Topic adı: payment-events',
        'Partition sayısı: 6',
        'Replication factor: 3',
        'Retention süresi: 7 gün (retention.ms=604800000)',
        'cleanup.policy=delete olarak ayarlanacak.',
        'ACL tanımlamaları yapılacak: payment-service için Read/Write yetkisi.'
      ],
      attachments: [
        'kafka-topic-config.yaml',
        'acl-permissions.txt'
      ]
    },
    {
      id: 4,
      app: 'Keycloak',
      title: 'Token Süresi ve Login Policy Güncellemesi',
      description: 'Güvenlik politikaları doğrultusunda token süresi ve giriş denemesi sınırı güncellenecektir.',
      version: 'v6.2.0',
      deadline: '2025-10-12',
      status: 'not-started',
      priority: 'critical',
      tasks: [
        'access token lifespan: 900 saniyeye düşürülecek.',
        'refresh token lifespan: 1800 saniye olarak ayarlanacak.',
        'login attempts: maksimum 5 deneme sonrası kullanıcı kilitlenecek.',
        'Brute Force Detection aktif hale getirilecek.'
      ],
      attachments: [
        'security-policy-update.pdf',
        'keycloak-realm-export.json'
      ]
    },
    {
      id: 5,
      app: 'Kafka',
      title: 'Monitoring Entegrasyonu (Prometheus + Grafana)',
      description: 'Kafka cluster\'ının izlenebilirliğini artırmak amacıyla Prometheus ve Grafana entegrasyonu yapılacaktır.',
      version: 'v6.2.1',
      deadline: '2025-10-14',
      status: 'error',
      priority: 'medium',
      tasks: [
        'JMX Exporter Kafka broker\'lara entegre edilecek.',
        'Prometheus konfigürasyonuna Kafka hedefleri eklenecek.',
        'Grafana dashboard\'ları oluşturulacak (örn. Kafka Overview, Consumer Lag, Broker Metrics).',
        'Alert tanımlamaları yapılacak (örn. Under-replicated partitions, High consumer lag).'
      ],
      attachments: [
        'prometheus-config.yml',
        'grafana-dashboard.json',
        'jmx-exporter-config.yaml'
      ]
    }
  ];

  const getStatusInfo = (status) => {
    switch (status) {
      case 'not-started':
        return { label: 'Başlanmadı', color: 'default', icon: <ScheduleIcon /> };
      case 'in-progress':
        return { label: 'Devam Ediyor', color: 'info', icon: <StartIcon /> };
      case 'completed':
        return { label: 'Tamamlandı', color: 'success', icon: <CheckIcon /> };
      case 'error':
        return { label: 'Hatalı', color: 'error', icon: <ErrorIcon /> };
      default:
        return { label: 'Bilinmiyor', color: 'default', icon: <ScheduleIcon /> };
    }
  };

  const getPriorityInfo = (priority) => {
    switch (priority) {
      case 'critical':
        return { label: 'Kritik', color: 'error' };
      case 'high':
        return { label: 'Yüksek', color: 'warning' };
      case 'medium':
        return { label: 'Orta', color: 'info' };
      case 'low':
        return { label: 'Düşük', color: 'success' };
      default:
        return { label: 'Bilinmiyor', color: 'default' };
    }
  };

  const getDaysRemaining = (deadline) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleViewDetail = (change) => {
    setSelectedChange(change);
    setDetailDialog(true);
  };

  const handleCloseDetail = () => {
    setDetailDialog(false);
    setSelectedChange(null);
  };

  const handleStatusChange = (changeId, newStatus) => {
    alert(`Değişiklik #${changeId} durumu "${newStatus}" olarak güncellendi!`);
  };

  const handleFilterClick = (filter) => {
    setStatusFilter(filter);
  };

  // Filtreleme
  const filteredChanges = statusFilter === 'all' 
    ? urgentChanges 
    : urgentChanges.filter(c => c.status === statusFilter);

  const notStartedCount = urgentChanges.filter(c => c.status === 'not-started').length;
  const inProgressCount = urgentChanges.filter(c => c.status === 'in-progress').length;
  const completedCount = urgentChanges.filter(c => c.status === 'completed').length;
  const errorCount = urgentChanges.filter(c => c.status === 'error').length;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/customer-dashboard')}
            sx={{ mr: 2 }}
          >
            Geri
          </Button>
          <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon fontSize="large" color="warning" />
            Acil Değişiklikler
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Yan ürünlere ait acil değişiklik talepleri ve yapılacak işlemler
        </Typography>
      </Box>

      {/* İstatistikler */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper 
            onClick={() => handleFilterClick('not-started')}
            sx={{ 
              p: 2, 
              textAlign: 'center', 
              bgcolor: statusFilter === 'not-started' ? 'grey.300' : 'grey.100',
              cursor: 'pointer',
              transition: 'all 0.3s',
              border: statusFilter === 'not-started' ? '2px solid' : 'none',
              borderColor: 'grey.700',
              '&:hover': {
                bgcolor: 'grey.200',
                transform: 'translateY(-4px)',
                boxShadow: 3
              }
            }}
          >
            <Typography variant="h4" fontWeight="bold">{notStartedCount}</Typography>
            <Typography variant="body2" color="text.secondary">Başlanmadı</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper 
            onClick={() => handleFilterClick('in-progress')}
            sx={{ 
              p: 2, 
              textAlign: 'center', 
              bgcolor: statusFilter === 'in-progress' ? 'info.main' : 'info.light',
              color: statusFilter === 'in-progress' ? 'white' : 'inherit',
              cursor: 'pointer',
              transition: 'all 0.3s',
              border: statusFilter === 'in-progress' ? '2px solid' : 'none',
              borderColor: 'info.dark',
              '&:hover': {
                bgcolor: 'info.main',
                color: 'white',
                transform: 'translateY(-4px)',
                boxShadow: 3
              }
            }}
          >
            <Typography variant="h4" fontWeight="bold">{inProgressCount}</Typography>
            <Typography variant="body2">Devam Ediyor</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper 
            onClick={() => handleFilterClick('completed')}
            sx={{ 
              p: 2, 
              textAlign: 'center', 
              bgcolor: statusFilter === 'completed' ? 'success.main' : 'success.light',
              color: statusFilter === 'completed' ? 'white' : 'inherit',
              cursor: 'pointer',
              transition: 'all 0.3s',
              border: statusFilter === 'completed' ? '2px solid' : 'none',
              borderColor: 'success.dark',
              '&:hover': {
                bgcolor: 'success.main',
                color: 'white',
                transform: 'translateY(-4px)',
                boxShadow: 3
              }
            }}
          >
            <Typography variant="h4" fontWeight="bold">{completedCount}</Typography>
            <Typography variant="body2">Tamamlandı</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper 
            onClick={() => handleFilterClick('error')}
            sx={{ 
              p: 2, 
              textAlign: 'center', 
              bgcolor: statusFilter === 'error' ? 'error.main' : 'error.light',
              color: statusFilter === 'error' ? 'white' : 'inherit',
              cursor: 'pointer',
              transition: 'all 0.3s',
              border: statusFilter === 'error' ? '2px solid' : 'none',
              borderColor: 'error.dark',
              '&:hover': {
                bgcolor: 'error.main',
                color: 'white',
                transform: 'translateY(-4px)',
                boxShadow: 3
              }
            }}
          >
            <Typography variant="h4" fontWeight="bold">{errorCount}</Typography>
            <Typography variant="body2">Hatalı</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Filtre Bilgisi ve Temizleme */}
      {statusFilter !== 'all' && (
        <Alert 
          severity="info" 
          sx={{ mb: 3 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={() => handleFilterClick('all')}
            >
              Filtreyi Temizle
            </Button>
          }
        >
          Filtre aktif: <strong>{getStatusInfo(statusFilter).label}</strong> durumundaki değişiklikler gösteriliyor. ({filteredChanges.length} sonuç)
        </Alert>
      )}

      {/* Değişiklik Kartları */}
      <Grid container spacing={3}>
        {filteredChanges.map((change) => {
          const statusInfo = getStatusInfo(change.status);
          const priorityInfo = getPriorityInfo(change.priority);
          const daysRemaining = getDaysRemaining(change.deadline);

          return (
            <Grid item xs={12} md={6} lg={4} key={change.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderLeft: `4px solid`,
                  borderColor: priorityInfo.color + '.main'
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  {/* Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Chip 
                      label={change.app} 
                      icon={<CodeIcon />}
                      color="primary"
                      size="small"
                    />
                    <Chip 
                      label={priorityInfo.label} 
                      color={priorityInfo.color}
                      size="small"
                    />
                  </Box>

                  {/* Title */}
                  <Typography variant="h6" gutterBottom sx={{ minHeight: 48 }}>
                    {change.title}
                  </Typography>

                  {/* Description */}
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                      mb: 2, 
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical'
                    }}
                  >
                    {change.description}
                  </Typography>

                  {/* Metadata */}
                  <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    <Chip 
                      icon={<VersionIcon />}
                      label={change.version} 
                      size="small" 
                      variant="outlined"
                    />
                    <Chip 
                      icon={<TaskIcon />}
                      label={`${change.tasks.length} görev`} 
                      size="small" 
                      variant="outlined"
                    />
                    <Chip 
                      icon={<AttachFileIcon />}
                      label={`${change.attachments.length} ek`} 
                      size="small" 
                      variant="outlined"
                    />
                  </Box>

                  {/* Deadline */}
                  <Alert 
                    severity={daysRemaining < 0 ? 'error' : daysRemaining <= 3 ? 'warning' : 'info'}
                    icon={<ScheduleIcon />}
                    sx={{ mb: 2 }}
                  >
                    <Typography variant="caption" fontWeight="bold">
                      Son Tarih: {change.deadline}
                      {daysRemaining >= 0 ? ` (${daysRemaining} gün kaldı)` : ' (GEÇTİ!)'}
                    </Typography>
                  </Alert>

                  {/* Status */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" color="text.secondary">Durum:</Typography>
                    <Chip
                      icon={statusInfo.icon}
                      label={statusInfo.label}
                      color={statusInfo.color}
                      size="small"
                    />
                  </Box>
                </CardContent>

                <Divider />

                <CardActions sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {/* Detay Butonu */}
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<ViewIcon />}
                    onClick={() => handleViewDetail(change)}
                  >
                    Detayları Görüntüle
                  </Button>

                  {/* Durum Butonları */}
                  <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                    {change.status === 'not-started' && (
                      <Button
                        fullWidth
                        variant="contained"
                        color="primary"
                        size="small"
                        startIcon={<StartIcon />}
                        onClick={() => handleStatusChange(change.id, 'in-progress')}
                      >
                        Başla
                      </Button>
                    )}
                    {change.status === 'in-progress' && (
                      <>
                        <Button
                          fullWidth
                          variant="contained"
                          color="success"
                          size="small"
                          startIcon={<DoneIcon />}
                          onClick={() => handleStatusChange(change.id, 'completed')}
                        >
                          Tamamla
                        </Button>
                        <Button
                          fullWidth
                          variant="contained"
                          color="error"
                          size="small"
                          startIcon={<ErrorIcon />}
                          onClick={() => handleStatusChange(change.id, 'error')}
                        >
                          Hata
                        </Button>
                      </>
                    )}
                    {change.status === 'error' && (
                      <Button
                        fullWidth
                        variant="contained"
                        color="primary"
                        size="small"
                        startIcon={<StartIcon />}
                        onClick={() => handleStatusChange(change.id, 'in-progress')}
                      >
                        Tekrar Başla
                      </Button>
                    )}
                    {change.status === 'completed' && (
                      <Chip
                        label="✓ Tamamlandı"
                        color="success"
                        sx={{ width: '100%' }}
                      />
                    )}
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Detay Dialog */}
      <Dialog
        open={detailDialog}
        onClose={handleCloseDetail}
        maxWidth="md"
        fullWidth
      >
        {selectedChange && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CodeIcon />
                  <Typography variant="h6">{selectedChange.app}</Typography>
                </Box>
                <Chip 
                  label={getPriorityInfo(selectedChange.priority).label}
                  color={getPriorityInfo(selectedChange.priority).color}
                />
              </Box>
              <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 1 }}>
                {selectedChange.title}
              </Typography>
            </DialogTitle>
            <DialogContent dividers>
              {/* Açıklama */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Açıklama:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedChange.description}
                </Typography>
              </Box>

              {/* Metadata */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="caption" color="text.secondary">Bağlı Versiyon</Typography>
                    <Typography variant="body1" fontWeight="bold">{selectedChange.version}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="caption" color="text.secondary">Son Tarih</Typography>
                    <Typography variant="body1" fontWeight="bold">{selectedChange.deadline}</Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Yapılacaklar */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TaskIcon />
                  Yapılacaklar ({selectedChange.tasks.length} görev):
                </Typography>
                <List dense>
                  {selectedChange.tasks.map((task, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <CheckIcon color="primary" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={task}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>

              {/* Ekler */}
              <Box>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AttachFileIcon />
                  Ekler ({selectedChange.attachments.length} dosya):
                </Typography>
                <List dense>
                  {selectedChange.attachments.map((file, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <DescriptionIcon color="action" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={file}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDetail}>Kapat</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default UrgentChanges;
