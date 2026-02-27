import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Tooltip,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Card,
  CardContent,
} from '@mui/material';
import {
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as HourglassIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

const ServiceVersionMatrix = () => {
  const [filterText, setFilterText] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('all');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Mock Data - Servisler
  const services = [
    'UserManagement.Web',
    'Authentication.Api',
    'Payment.Service',
    'Notification.Hub',
    'Analytics.Engine',
    'Reporting.Service',
    'FileStorage.Api',
    'Integration.Gateway',
    'Workflow.Engine',
    'AuditLog.Service',
    'Configuration.Api',
    'Messaging.Queue',
  ];

  // Mock Data - Müşteriler ve ortamları
  const customers = [
    {
      id: 'customer1',
      name: 'TechCorp Solutions',
      environments: [
        { name: 'Dev', version: 'v1.25.0', lastMailTime: new Date(Date.now() - 30 * 60000) },
        { name: 'Test', version: 'v1.24.5', lastMailTime: new Date(Date.now() - 45 * 60000) },
        { name: 'Preprod', version: 'v1.24.2', lastMailTime: new Date(Date.now() - 20 * 60000) },
        { name: 'Prod', version: 'v1.24.0', lastMailTime: new Date(Date.now() - 55 * 60000) },
      ],
    },
    {
      id: 'customer2',
      name: 'Global Finance Inc',
      environments: [
        { name: 'Test', version: 'v1.24.3', lastMailTime: new Date(Date.now() - 25 * 60000) },
        { name: 'Preprod', version: 'v1.24.0', lastMailTime: new Date(Date.now() - 35 * 60000) },
        { name: 'Prod', version: 'v1.23.5', lastMailTime: new Date(Date.now() - 150 * 60000) }, // 2.5 saat önce - PROBLEM!
      ],
    },
    {
      id: 'customer3',
      name: 'Healthcare Systems',
      environments: [
        { name: 'Dev', version: 'v1.24.8', lastMailTime: new Date(Date.now() - 15 * 60000) },
        { name: 'Test', version: 'v1.24.5', lastMailTime: new Date(Date.now() - 130 * 60000) }, // 2+ saat önce - PROBLEM!
        { name: 'Prod', version: 'v1.24.0', lastMailTime: new Date(Date.now() - 40 * 60000) },
      ],
    },
    {
      id: 'customer4',
      name: 'Retail Network',
      environments: [
        { name: 'Dev', version: 'v1.25.2', lastMailTime: new Date(Date.now() - 18 * 60000) },
        { name: 'Test', version: 'v1.24.9', lastMailTime: new Date(Date.now() - 28 * 60000) },
        { name: 'Preprod', version: 'v1.24.5', lastMailTime: new Date(Date.now() - 42 * 60000) },
        { name: 'Prod', version: 'v1.24.0', lastMailTime: new Date(Date.now() - 50 * 60000) },
      ],
    },
    {
      id: 'customer5',
      name: 'Manufacturing Corp',
      environments: [
        { name: 'Test', version: 'v1.24.3', lastMailTime: new Date(Date.now() - 33 * 60000) },
        { name: 'Prod', version: 'v1.24.0', lastMailTime: new Date(Date.now() - 48 * 60000) },
      ],
    },
  ];

  // Mock Data - Servis versiyonları ve hotfix durumları
  const generateServiceVersions = () => {
    const versions = {};
    const latestVersion = 'v1.24.0';
    
    // Müşteride olmayan servisler (müşteri başına)
    const excludedServices = {
      customer2: ['Messaging.Queue', 'Workflow.Engine'], // Global Finance'da bu servisler yok
      customer3: ['FileStorage.Api'], // Healthcare'de bu servis yok
      customer5: ['Analytics.Engine', 'Reporting.Service', 'Workflow.Engine'], // Manufacturing'de bunlar yok
    };

    // Henüz Prod'a çıkmamış servisler (sadece Dev/Test'te olan)
    const devOnlyServices = {
      customer1: { services: ['Messaging.Queue'], maxEnv: 'Test' }, // Sadece Dev ve Test'te
      customer2: { services: ['Integration.Gateway'], maxEnv: 'Test' },
      customer4: { services: ['AuditLog.Service'], maxEnv: 'Preprod' }, // Dev, Test, Preprod'da var
    };

    // Kritik hotfix'leri belirli hücrelere sabitlemek için
    const criticalHotfixes = [
      { service: 'Payment.Service', customerId: 'customer2', envName: 'Prod' },
      { service: 'Authentication.Api', customerId: 'customer3', envName: 'Prod' },
      { service: 'UserManagement.Web', customerId: 'customer5', envName: 'Prod' },
      { service: 'Notification.Hub', customerId: 'customer1', envName: 'Preprod' },
      { service: 'FileStorage.Api', customerId: 'customer4', envName: 'Prod' },
    ];
    
    services.forEach((service) => {
      versions[service] = {};
      customers.forEach((customer) => {
        versions[service][customer.id] = {};
        
        // Bu servis bu müşteride hiç yok mu?
        if (excludedServices[customer.id]?.includes(service)) {
          customer.environments.forEach((env) => {
            versions[service][customer.id][env.name] = null; // Servis yok
          });
          return;
        }

        customer.environments.forEach((env) => {
          // Bu servis henüz bu ortama çıkmamış mı?
          const devOnlyConfig = devOnlyServices[customer.id];
          if (devOnlyConfig?.services.includes(service)) {
            const envOrder = ['Dev', 'Test', 'Preprod', 'Prod'];
            const currentEnvIndex = envOrder.indexOf(env.name);
            const maxEnvIndex = envOrder.indexOf(devOnlyConfig.maxEnv);
            
            if (currentEnvIndex > maxEnvIndex) {
              versions[service][customer.id][env.name] = null; // Henüz bu ortama çıkmamış
              return;
            }
          }

          // Bu hücre kritik hotfix listesinde mi?
          const isCritical = criticalHotfixes.some(
            ch => ch.service === service && ch.customerId === customer.id && ch.envName === env.name
          );

          let status, version, hotfixes;
          
          if (isCritical) {
            // Kritik hotfix bekliyor - Kırmızı
            status = 'critical-hotfix';
            version = env.name === 'Prod' ? 'v1.24.0-prod.16' : 'v1.24.0-prod.18';
            hotfixes = [
              { version: 'v1.24.0-prod.27', critical: true },
              { version: 'v1.24.0-prod.28', critical: false },
            ];
          } else {
            // Rastgele durum oluştur
            const randomStatus = Math.random();
            const isProd = env.name === 'Prod';
            const isTest = env.name === 'Test';
            const isDev = env.name === 'Dev';
            const isPreprod = env.name === 'Preprod';
            
            // Her ortam için rastgele prod numarası üret
            const getRandomProdNumber = () => Math.floor(Math.random() * 40) + 1;
            
            if (isDev && randomStatus < 0.75) {
              // Dev'de çoğunlukla en yeni versiyon
              status = 'current';
              version = `v1.25.0-prod.${getRandomProdNumber()}`;
              hotfixes = [];
            } else if (isTest && randomStatus < 0.60) {
              // Test'te çoğunlukla güncel
              status = 'current';
              version = `v1.24.0-prod.${getRandomProdNumber()}`;
              hotfixes = [];
            } else if (isPreprod && randomStatus < 0.50) {
              // Preprod'da orta seviye güncellik
              status = 'current';
              version = `v1.24.0-prod.${getRandomProdNumber()}`;
              hotfixes = [];
            } else if (isProd && randomStatus < 0.45) {
              // Prod'da yarısı güncel
              status = 'current';
              version = `v1.24.0-prod.${getRandomProdNumber()}`;
              hotfixes = [];
            } else {
              // Hotfix bekliyor - Sarı
              const currentProd = getRandomProdNumber();
              status = 'pending-hotfix';
              version = `v1.24.0-prod.${currentProd}`;
              hotfixes = [
                { version: `v1.24.0-prod.${currentProd + 1}`, critical: false },
                { version: `v1.24.0-prod.${currentProd + 2}`, critical: false },
              ];
            }
          }
          
          versions[service][customer.id][env.name] = {
            status,
            version,
            hotfixes,
          };
        });
      });
    });
    
    return versions;
  };

  const [serviceVersions, setServiceVersions] = useState(generateServiceVersions());

  // Son mail zamanını kontrol et (2 saatten eski mi?)
  const isMailDelayed = (lastMailTime) => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60000);
    return lastMailTime < twoHoursAgo;
  };

  // Versiyon hücresinin rengini belirle
  const getVersionChipColor = (status) => {
    switch (status) {
      case 'current':
        return 'success';
      case 'pending-hotfix':
        return 'warning';
      case 'critical-hotfix':
        return 'error';
      default:
        return 'default';
    }
  };

  // Hotfix listesi için tooltip içeriği
  const renderHotfixTooltip = (hotfixes) => {
    if (!hotfixes || hotfixes.length === 0) return null;
    
    return (
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
          Bekleyen Hotfixler:
        </Typography>
        {hotfixes.map((hotfix, index) => (
          <Typography
            key={index}
            variant="body2"
            sx={{
              color: hotfix.critical ? '#ff1744' : 'inherit',
              fontWeight: hotfix.critical ? 'bold' : 'normal',
              mb: 0.5,
            }}
          >
            {hotfix.critical && '⚠️ '} {hotfix.version}
            {hotfix.critical && ' (KRİTİK)'}
          </Typography>
        ))}
      </Box>
    );
  };

  // Filtreleme
  const filteredServices = services.filter(service =>
    service.toLowerCase().includes(filterText.toLowerCase())
  );

  const filteredCustomers = selectedCustomer === 'all' 
    ? customers 
    : customers.filter(c => c.id === selectedCustomer);

  // Yenileme
  const handleRefresh = () => {
    setServiceVersions(generateServiceVersions());
    setLastUpdate(new Date());
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Başlık ve Kontroller */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" fontWeight="bold">
            Servis Versiyon Matrisi
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="caption" color="text.secondary">
              Son Güncelleme: {lastUpdate.toLocaleTimeString('tr-TR')}
            </Typography>
            <Tooltip title="Yenile">
              <IconButton onClick={handleRefresh} size="small" color="primary">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={2} mb={2}>
          <TextField
            label="Servis Ara"
            placeholder="Filter..."
            variant="outlined"
            size="small"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            sx={{ minWidth: 250 }}
          />
          
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Müşteri Seç</InputLabel>
            <Select
              value={selectedCustomer}
              label="Müşteri Seç"
              onChange={(e) => setSelectedCustomer(e.target.value)}
            >
              <MenuItem value="all">Tüm Müşteriler</MenuItem>
              {customers.map((customer) => (
                <MenuItem key={customer.id} value={customer.id}>
                  {customer.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {/* Renk Açıklaması */}
        <Card variant="outlined" sx={{ bgcolor: '#f5f5f5' }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Stack direction="row" spacing={3} flexWrap="wrap">
              <Stack direction="row" spacing={1} alignItems="center">
                <CheckCircleIcon color="success" fontSize="small" />
                <Typography variant="caption">Güncel Versiyon</Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <WarningIcon color="warning" fontSize="small" />
                <Typography variant="caption">Hotfix Bekliyor</Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <WarningIcon color="error" fontSize="small" />
                <Typography variant="caption">Kritik Hotfix Bekliyor</Typography>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <HourglassIcon color="action" fontSize="small" />
                <Typography variant="caption">Güncelleme Gecikmesi (2+ saat)</Typography>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Paper>

      {/* Versiyon Matrisi Tablosu */}
      <TableContainer 
        component={Paper} 
        sx={{ 
          maxHeight: 'calc(100vh - 350px)',
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            {/* İlk Satır - Banka İsimleri */}
            <TableRow>
              <TableCell 
                rowSpan={2}
                sx={{ 
                  minWidth: 200, 
                  bgcolor: '#1976d2',
                  borderRight: '2px solid #fff',
                  position: 'sticky',
                  left: 0,
                  zIndex: 11,
                  top: 0,
                }}
              >
                <Typography variant="h6" fontWeight="bold" sx={{ color: 'white' }}>
                  Service
                </Typography>
              </TableCell>

              {filteredCustomers.map((customer) => (
                <TableCell 
                  key={customer.id}
                  colSpan={customer.environments.length}
                  align="center"
                  sx={{ 
                    bgcolor: '#1976d2',
                    borderLeft: '2px solid #fff',
                    py: 1.5,
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                  }}
                >
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ color: 'white' }}>
                    {customer.name}
                  </Typography>
                </TableCell>
              ))}
            </TableRow>

            {/* İkinci Satır - Ortam Detayları */}
            <TableRow>
              {filteredCustomers.map((customer) => (
                <React.Fragment key={customer.id}>
                  {customer.environments.map((env, envIndex) => (
                    <TableCell 
                      key={`${customer.id}-${env.name}`}
                      align="center"
                      sx={{ 
                        minWidth: 140,
                        bgcolor: '#1976d2',
                        borderLeft: envIndex === 0 ? '2px solid #fff' : '1px solid rgba(255,255,255,0.3)',
                        py: 1,
                        position: 'sticky',
                        top: 57,
                        zIndex: 10,
                      }}
                    >
                      <Stack spacing={0.5}>
                        <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
                          <Typography variant="body2" fontWeight="600" sx={{ color: 'white' }}>
                            {env.name}
                          </Typography>
                          {isMailDelayed(env.lastMailTime) && (
                            <Tooltip title={`Son mail: ${env.lastMailTime.toLocaleTimeString('tr-TR')} - Güncelleme gecikmesi!`}>
                              <HourglassIcon sx={{ fontSize: 16, color: '#ffd54f' }} />
                            </Tooltip>
                          )}
                        </Stack>
                        <Typography variant="caption" sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.9)' }}>
                          {env.version}
                        </Typography>
                      </Stack>
                    </TableCell>
                  ))}
                </React.Fragment>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredServices.map((service, serviceIndex) => (
              <TableRow 
                key={service}
                sx={{ 
                  '&:hover': { 
                    bgcolor: 'rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                {/* Servis adı */}
                <TableCell 
                  component="th" 
                  scope="row"
                  sx={{
                    position: 'sticky',
                    left: 0,
                    bgcolor: serviceIndex % 2 === 0 ? '#fff' : '#fafafa',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    borderRight: '2px solid #e0e0e0',
                    zIndex: 10,
                    '&:hover': {
                      bgcolor: serviceIndex % 2 === 0 ? '#f5f5f5' : '#eeeeee',
                    }
                  }}
                >
                  {service}
                </TableCell>

                {/* Versiyon hücreleri */}
                {filteredCustomers.map((customer) => (
                  <React.Fragment key={customer.id}>
                    {customer.environments.map((env, envIndex) => {
                      const versionData = serviceVersions[service]?.[customer.id]?.[env.name];
                      
                      // Servis bu müşteride yok veya bu ortama çıkmamış
                      if (!versionData) {
                        return (
                          <TableCell 
                            key={`${customer.id}-${env.name}`}
                            align="center"
                            sx={{ 
                              borderLeft: envIndex === 0 ? '2px solid #e0e0e0' : '1px solid rgba(224, 224, 224, 0.4)',
                              py: 1,
                              color: 'text.disabled',
                            }}
                          >
                            <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                              -
                            </Typography>
                          </TableCell>
                        );
                      }

                      const hasHotfixes = versionData.hotfixes && versionData.hotfixes.length > 0;

                      return (
                        <TableCell 
                          key={`${customer.id}-${env.name}`}
                          align="center"
                          sx={{ 
                            borderLeft: envIndex === 0 ? '2px solid #e0e0e0' : '1px solid rgba(224, 224, 224, 0.4)',
                            py: 1,
                          }}
                        >
                          {hasHotfixes ? (
                            <Tooltip 
                              title={renderHotfixTooltip(versionData.hotfixes)}
                              arrow
                              placement="top"
                            >
                              <Chip
                                label={versionData.version}
                                color={getVersionChipColor(versionData.status)}
                                size="small"
                                sx={{ 
                                  minWidth: 110,
                                  cursor: 'pointer',
                                  '&:hover': {
                                    opacity: 0.8,
                                  }
                                }}
                              />
                            </Tooltip>
                          ) : (
                            <Chip
                              label={versionData.version}
                              color={getVersionChipColor(versionData.status)}
                              size="small"
                              sx={{ minWidth: 110 }}
                            />
                          )}
                        </TableCell>
                      );
                    })}
                  </React.Fragment>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ServiceVersionMatrix;
