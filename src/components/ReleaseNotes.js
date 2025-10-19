import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Card,
  CardContent,
  Chip,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Alert,
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Badge,
  Button
} from '@mui/material';
import {
  Description as NotesIcon,
  ExpandMore as ExpandMoreIcon,
  BugReport as BugIcon,
  NewReleases as FeatureIcon,
  Link as LinkIcon,
  Assignment as JiraIcon,
  GitHub as AzureIcon,
  Code as CodeIcon,
  Warning as ActionIcon,
  CheckCircle as CheckIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';

const ReleaseNotes = () => {
  const navigate = useNavigate();
  const [selectedVersion, setSelectedVersion] = useState('v6.2.1');
  const [filterType, setFilterType] = useState('all');
  const [filterBusinessAction, setFilterBusinessAction] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const versions = ['v6.2.1', 'v6.2.0', 'v6.1.5', 'v6.1.0'];

  // Mock release notes data
  const releaseNotesData = {
    'v6.2.1': {
      releaseDate: '2024-01-15',
      items: [
        {
          jiraId: 'BANK-2345',
          azureId: 'AB#45678',
          module: 'Payment Service',
          type: 'feature',
          title: 'QR Kod ile Ödeme Desteği',
          description: 'Müşterilerin QR kod okutarak hızlı ödeme yapabilmesi için yeni özellik geliştirildi. Karekod Hızlı Ödeme Sistemi (KHÖS) entegrasyonu tamamlandı.',
          userGuideLink: 'https://docs.company.com/qr-payment-guide',
          businessActions: [
            'QR kod özelliğinin aktif edilmesi için sistem parametrelerinden "QR_PAYMENT_ENABLED" değeri "true" olarak ayarlanmalıdır',
            'İşlem limitleri "Parametre Yönetimi" ekranından tanımlanmalıdır',
            'Test ortamında en az 10 test işlemi gerçekleştirilmelidir'
          ]
        },
        {
          jiraId: 'BANK-2356',
          azureId: 'AB#45691',
          module: 'Auth Service',
          type: 'bug',
          title: 'Token Yenileme Sorunu Düzeltildi',
          description: 'Kullanıcı oturumunun sona ermesinden sonra otomatik token yenileme işleminde oluşan hata giderildi. Refresh token mekanizması iyileştirildi.',
          userGuideLink: null,
          businessActions: []
        },
        {
          jiraId: 'BANK-2367',
          azureId: 'AB#45702',
          module: 'Loan Module',
          type: 'feature',
          title: 'Hızlı Kredi Başvuru Süreci',
          description: 'Kredi başvuru sürecinde manuel adımlar azaltıldı. e-Devlet entegrasyonu ile otomatik belge doğrulama sistemi devreye alındı. Süreç 5 günden 3 güne düşürüldü.',
          userGuideLink: 'https://docs.company.com/fast-loan-process',
          businessActions: [
            'Yeni süreç akışı için kullanıcı eğitimleri verilmelidir',
            'e-Devlet entegrasyonu için gerekli yetkilendirmeler kontrol edilmelidir',
            'Eski başvurular için geçiş senaryosu uygulanmalıdır'
          ]
        },
        {
          jiraId: 'BANK-2378',
          azureId: 'AB#45713',
          module: 'Notification Service',
          type: 'feature',
          title: 'Push Notification Desteği',
          description: 'Mobil uygulama için anlık bildirim (push notification) altyapısı eklendi. Firebase Cloud Messaging (FCM) entegrasyonu tamamlandı.',
          userGuideLink: 'https://docs.company.com/push-notifications',
          businessActions: [
            'Bildirim şablonları "Bildirim Yönetimi" ekranından oluşturulmalıdır',
            'Kullanıcı izinleri gözden geçirilmelidir'
          ]
        },
        {
          jiraId: 'BANK-2389',
          azureId: 'AB#45724',
          module: 'Report Module',
          type: 'bug',
          title: 'Excel Export Karakter Seti Hatası',
          description: 'Türkçe karakterlerin Excel raporlarında bozuk görünmesi sorunu düzeltildi. UTF-8 encoding desteği eklendi.',
          userGuideLink: null,
          businessActions: []
        }
      ]
    },
    'v6.2.0': {
      releaseDate: '2023-12-20',
      items: [
        {
          jiraId: 'BANK-2234',
          azureId: 'AB#45567',
          module: 'Database Service',
          type: 'feature',
          title: 'PostgreSQL 14 Yükseltmesi',
          description: 'Veritabanı sürümü PostgreSQL 12\'den PostgreSQL 14\'e yükseltildi. Performans iyileştirmeleri ve yeni özellikler kullanıma açıldı.',
          userGuideLink: 'https://docs.company.com/postgres-14-migration',
          businessActions: [
            'Veritabanı yedekleme süreçleri güncellenmeli',
            'Yeni indexleme stratejileri gözden geçirilmeli',
            'Performans metrikleri takip edilmeli'
          ]
        },
        {
          jiraId: 'BANK-2245',
          azureId: 'AB#45578',
          module: 'User Management',
          type: 'feature',
          title: 'Email Doğrulama Zorunlu Hale Getirildi',
          description: 'Güvenlik için tüm yeni kullanıcı kayıtlarında email doğrulama zorunlu hale getirildi.',
          userGuideLink: null,
          businessActions: [
            'Email şablonları kontrol edilmeli',
            'Müşteri hizmetleri ekibine bilgilendirme yapılmalı'
          ]
        },
        {
          jiraId: 'BANK-2256',
          azureId: 'AB#45589',
          module: 'Cache Service',
          type: 'bug',
          title: 'Redis Bağlantı Havuzu Optimizasyonu',
          description: 'Yoğun zamanlarda Redis bağlantı havuzu tükenmesi sorunu giderildi. Connection pool boyutu dinamik hale getirildi.',
          userGuideLink: null,
          businessActions: []
        }
      ]
    }
  };

  const getTypeInfo = (type) => {
    switch (type) {
      case 'feature':
        return { icon: <FeatureIcon />, color: 'success', label: 'Feature' };
      case 'bug':
        return { icon: <BugIcon />, color: 'error', label: 'Bug Fix' };
      default:
        return { icon: <CodeIcon />, color: 'default', label: 'Other' };
    }
  };

  const currentReleaseNotes = releaseNotesData[selectedVersion] || { items: [] };

  // Filtreleme
  const filteredItems = currentReleaseNotes.items.filter(item => {
    const typeMatch = filterType === 'all' || item.type === filterType;
    const actionMatch = filterBusinessAction === 'all' || 
                       (filterBusinessAction === 'with' && item.businessActions.length > 0) ||
                       (filterBusinessAction === 'without' && item.businessActions.length === 0);
    const searchMatch = searchQuery === '' || 
                       item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       item.jiraId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       item.module.toLowerCase().includes(searchQuery.toLowerCase());
    
    return typeMatch && actionMatch && searchMatch;
  });

  const handleClearFilters = () => {
    setFilterType('all');
    setFilterBusinessAction('all');
    setSearchQuery('');
  };

  const hasActiveFilters = filterType !== 'all' || filterBusinessAction !== 'all' || searchQuery !== '';

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/releases')}
            variant="outlined"
            size="small"
          >
            Geri
          </Button>
          <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NotesIcon fontSize="large" color="primary" />
            Release Notları
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Bankaya gönderilen paket içeriği ve detaylı değişiklik bilgileri
        </Typography>
      </Box>

      {/* Filtreler */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <FilterIcon color="action" />
          <Typography variant="h6">Filtreler</Typography>
          {hasActiveFilters && (
            <Tooltip title="Filtreleri Temizle">
              <IconButton size="small" onClick={handleClearFilters} color="primary">
                <ClearIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Versiyon</InputLabel>
              <Select
                value={selectedVersion}
                onChange={(e) => setSelectedVersion(e.target.value)}
                label="Versiyon"
              >
                {versions.map((version) => (
                  <MenuItem key={version} value={version}>
                    {version}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>İşlem Tipi</InputLabel>
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                label="İşlem Tipi"
              >
                <MenuItem value="all">Tümü</MenuItem>
                <MenuItem value="feature">Feature</MenuItem>
                <MenuItem value="bug">Bug Fix</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Business Aksiyonları</InputLabel>
              <Select
                value={filterBusinessAction}
                onChange={(e) => setFilterBusinessAction(e.target.value)}
                label="Business Aksiyonları"
              >
                <MenuItem value="all">Tümü</MenuItem>
                <MenuItem value="with">Aksiyon Gerektiren</MenuItem>
                <MenuItem value="without">Aksiyon Gerektirmeyen</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              size="small"
              label="Ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Jira ID, Modül, Başlık..."
            />
          </Grid>
        </Grid>

        {hasActiveFilters && (
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
              Aktif Filtreler:
            </Typography>
            {filterType !== 'all' && (
              <Chip 
                label={`Tip: ${filterType === 'feature' ? 'Feature' : 'Bug Fix'}`} 
                size="small" 
                onDelete={() => setFilterType('all')}
              />
            )}
            {filterBusinessAction !== 'all' && (
              <Chip 
                label={`Aksiyonlar: ${filterBusinessAction === 'with' ? 'Var' : 'Yok'}`} 
                size="small" 
                onDelete={() => setFilterBusinessAction('all')}
              />
            )}
            {searchQuery && (
              <Chip 
                label={`Arama: "${searchQuery}"`} 
                size="small" 
                onDelete={() => setSearchQuery('')}
              />
            )}
          </Box>
        )}
      </Paper>

      {/* Release Bilgisi */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="subtitle2">
          <strong>{selectedVersion}</strong> - Yayın Tarihi: {currentReleaseNotes.releaseDate}
        </Typography>
        <Typography variant="body2">
          Toplam {currentReleaseNotes.items.length} değişiklik | Gösterilen: {filteredItems.length}
        </Typography>
      </Alert>

      {/* Release Items */}
      {filteredItems.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            Filtrelere uygun sonuç bulunamadı
          </Typography>
        </Paper>
      ) : (
        filteredItems.map((item, index) => {
          const typeInfo = getTypeInfo(item.type);
          return (
            <Accordion key={index} sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', pr: 2 }}>
                  <Chip
                    icon={typeInfo.icon}
                    label={typeInfo.label}
                    color={typeInfo.color}
                    size="small"
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {item.title}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                      <Chip label={item.jiraId} size="small" icon={<JiraIcon />} variant="outlined" />
                      <Chip label={item.azureId} size="small" icon={<AzureIcon />} variant="outlined" />
                      <Chip label={item.module} size="small" color="primary" variant="outlined" />
                    </Box>
                  </Box>
                  {item.businessActions.length > 0 && (
                    <Badge badgeContent={item.businessActions.length} color="warning">
                      <ActionIcon color="warning" />
                    </Badge>
                  )}
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Divider sx={{ mb: 2 }} />
                
                {/* Açıklama */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom color="primary">
                    📋 Açıklama
                  </Typography>
                  <Typography variant="body2" sx={{ pl: 2 }}>
                    {item.description}
                  </Typography>
                </Box>

                {/* Detay Bilgileri */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={4}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Jira Ticket
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {item.jiraId}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Azure DevOps
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {item.azureId}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Modül / Mikroservis
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {item.module}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                {/* User Guide */}
                {item.userGuideLink && (
                  <Box sx={{ mb: 3 }}>
                    <Alert severity="info" icon={<LinkIcon />}>
                      <Typography variant="subtitle2" gutterBottom>
                        📖 Kullanım Kılavuzu
                      </Typography>
                      <Link href={item.userGuideLink} target="_blank" rel="noopener">
                        {item.userGuideLink}
                      </Link>
                    </Alert>
                  </Box>
                )}

                {/* Business Actions */}
                {item.businessActions.length > 0 && (
                  <Box>
                    <Alert severity="warning" icon={<ActionIcon />}>
                      <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                        ⚠️ Business Ekip Aksiyonları
                      </Typography>
                      <Typography variant="caption" color="text.secondary" gutterBottom>
                        Bu değişiklik için aşağıdaki aksiyonlar alınmalıdır:
                      </Typography>
                      <List dense>
                        {item.businessActions.map((action, idx) => (
                          <ListItem key={idx}>
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              <CheckIcon fontSize="small" color="warning" />
                            </ListItemIcon>
                            <ListItemText
                              primary={action}
                              primaryTypographyProps={{ variant: 'body2' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Alert>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          );
        })
      )}
    </Container>
  );
};

export default ReleaseNotes;
