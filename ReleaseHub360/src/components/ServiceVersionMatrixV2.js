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
  CircularProgress,
} from '@mui/material';
import {
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as HourglassIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

const ServiceVersionMatrixV2 = () => {
  const [filterText, setFilterText] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('all');
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [prepPodStatus, setPrepPodStatus] = useState([]);
  const [prodPublishedVersions, setProdPublishedVersions] = useState({});

  // Prep ortamı pod status bilgilerini çek
  const fetchPrepPodStatus = async () => {
    try {
      console.log('🔍 Prep pod status bilgileri çekiliyor...');
      const podResponse = await fetch('http://localhost:5678/webhook/GetPodStatusPrep');
      if (podResponse.ok) {
        const podData = await podResponse.json();
        console.log('✅ Prep pod status alındı:', podData.length, 'pod');
        setPrepPodStatus(podData);
      } else {
        console.log('⚠️ Prep pod status alınamadı');
        setPrepPodStatus([]);
      }
    } catch (error) {
      console.error('❌ Prep pod status hatası:', error);
      setPrepPodStatus([]);
    }
  };

  // Firebase'den Appwys.io ürününün API'lerini çek
  const fetchServices = async () => {
    try {
      console.log('🔍 Appwys.io ürünü aranyor...');
      
      // Farklı collection adlarını dene
      const collectionNames = ['Products', 'products', 'Product', 'product'];
      let foundCollection = null;
      let appwysProduct = null;
      
      for (const collectionName of collectionNames) {
        try {
          const testRef = collection(db, collectionName);
          const q = query(testRef, where('name', '==', 'Appwys.io'));
          const testSnapshot = await getDocs(q);
          
          if (testSnapshot.size > 0) {
            console.log(`✅ Appwys.io bulundu: "${collectionName}"`);
            foundCollection = collectionName;
            appwysProduct = testSnapshot.docs[0].data();
            break;
          }
        } catch (error) {
          console.log(`❌ "${collectionName}" bulunamadı`);
        }
      }
      
      if (!appwysProduct) {
        console.log('⚠️ Appwys.io ürünü bulunamadı');
        setServices([]);
        return;
      }
      
      // Tüm API'leri topla (obje olarak: name, serviceImageName, currentVersion)
      const allApis = [];
      
      // childModuleGroups içindeki API'ler
      if (appwysProduct.childModuleGroups) {
        appwysProduct.childModuleGroups.forEach(moduleGroup => {
          if (moduleGroup.childModules) {
            moduleGroup.childModules.forEach(module => {
              if (module.childApis) {
                module.childApis.forEach(api => {
                  if (api.name) {
                    allApis.push({
                      name: api.name,
                      serviceImageName: api.serviceImageName || api.imageUrl || '',
                      currentVersion: api.currentVersion || ''
                    });
                  }
                });
              }
            });
          }
        });
      }
      
      // Direkt childModules içindeki API'ler
      if (appwysProduct.childModules) {
        appwysProduct.childModules.forEach(module => {
          if (module.childApis) {
            module.childApis.forEach(api => {
              if (api.name) {
                allApis.push({
                  name: api.name,
                  serviceImageName: api.serviceImageName || api.imageUrl || '',
                  currentVersion: api.currentVersion || ''
                });
              }
            });
          }
        });
      }
      
      console.log(`✅ Toplam ${allApis.length} API bulundu`);
      console.log('📋 API örnekleri:', allApis.slice(0, 3));
      setServices(allApis);
    } catch (error) {
      console.error('❌ APIler yüklenirken hata:', error);
      setServices([]);
      setProdPublishedVersions({});
    }
  };

  // Firebase'den müşterileri çek
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      console.log('🔍 Müşteriler Firebase\'den çekiliyor...');
      
      // Farklı collection adlarını dene
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

      // ProductVersions collection'ından Prep ve Prod approved versiyonlarını çek
      console.log('🔍 ProductVersions collection\'dan Prep ve Prod approved versiyonlar aranıyor...');
      let prepApprovedVersion = 'v1.24.0'; // Varsayılan
      let prodApprovedVersion = 'v1.24.0'; // Varsayılan
      
      const versionCollectionNames = ['ProductVersions', 'productVersions', 'ProductVersion', 'productVersion'];
      for (const versionCollectionName of versionCollectionNames) {
        try {
          const versionsRef = collection(db, versionCollectionName);
          
          // Prep approved versiyonu çek
          const prepQuery = query(versionsRef, where('prep', '==', 'Approved'));
          const prepSnapshot = await getDocs(prepQuery);
          
          if (prepSnapshot.size > 0) {
            console.log(`✅ ${prepSnapshot.size} adet Prep approved versiyon bulundu`);
            
            let highestPrepVersion = null;
            let highestPrepVersionNumber = 0;
            
            prepSnapshot.forEach((versionDoc) => {
              const versionData = versionDoc.data();
              const version = versionData.version || versionData.versionNumber;
              
              if (version) {
                const versionStr = version.replace(/^v/, '');
                const parts = versionStr.split('.').map(p => parseInt(p) || 0);
                const versionNumber = parts[0] * 10000 + (parts[1] || 0) * 100 + (parts[2] || 0);
                
                if (versionNumber > highestPrepVersionNumber) {
                  highestPrepVersionNumber = versionNumber;
                  highestPrepVersion = version;
                }
              }
            });
            
            if (highestPrepVersion) {
              prepApprovedVersion = highestPrepVersion.startsWith('v') ? highestPrepVersion : `v${highestPrepVersion}`;
              console.log(`✅ En yüksek Prep approved versiyon: ${prepApprovedVersion}`);
            }
          }
          
          // Prod approved versiyonu çek
          const prodQuery = query(versionsRef, where('prod', '==', 'Approved'));
          const prodSnapshot = await getDocs(prodQuery);
          
          if (prodSnapshot.size > 0) {
            console.log(`✅ ${prodSnapshot.size} adet Prod approved versiyon bulundu`);
            
            let highestProdVersion = null;
            let highestProdVersionNumber = 0;
            
            prodSnapshot.forEach((versionDoc) => {
              const versionData = versionDoc.data();
              const version = versionData.version || versionData.versionNumber;
              
              if (version) {
                const versionStr = version.replace(/^v/, '');
                const parts = versionStr.split('.').map(p => parseInt(p) || 0);
                const versionNumber = parts[0] * 10000 + (parts[1] || 0) * 100 + (parts[2] || 0);
                
                if (versionNumber > highestProdVersionNumber) {
                  highestProdVersionNumber = versionNumber;
                  highestProdVersion = version;
                }
              }
            });
            
            if (highestProdVersion) {
              prodApprovedVersion = highestProdVersion.startsWith('v') ? highestProdVersion : `v${highestProdVersion}`;
              console.log(`✅ En yüksek Prod approved versiyon: ${prodApprovedVersion}`);
            }
          }
          
          // Her iki sorgu da başarılıysa döngüden çık
          if (prepSnapshot.size > 0 || prodSnapshot.size > 0) {
            break;
          }
        } catch (error) {
          console.log(`❌ "${versionCollectionName}" okunamadı:`, error.message);
        }
      }
      
      const fetchedCustomers = [];
      customersSnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Müşterinin environments bilgisini al (varsayılan: ['Dev', 'Test', 'Prod'])
        const customerEnvironments = data.environments || ['Dev', 'Test', 'Prod'];
        
        // Her ortam için versiyon ve lastMailTime bilgisi oluştur
        const environments = customerEnvironments.map(envName => {
          let envVersion = 'v1.24.0'; // Varsayılan
          if (envName === 'Prep') {
            envVersion = prepApprovedVersion;
          } else if (envName === 'Prod') {
            envVersion = prodApprovedVersion;
          }
          
          return {
            name: envName,
            version: envVersion,
            lastMailTime: new Date(Date.now() - Math.random() * 120 * 60000) // Rastgele 0-2 saat arası
          };
        });
        
        fetchedCustomers.push({
          id: doc.id,
          name: data.name || 'İsimsiz Müşteri',
          environments: environments
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

  // Component mount olduğunda müşterileri, servisleri ve pod status'ü çek
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchCustomers(), fetchServices(), fetchPrepPodStatus()]);
    };
    loadData();
  }, []);

  // Servis versiyonları ve hotfix durumları
  const generateServiceVersions = () => {
    const versions = {};
    
    services.forEach((service) => {
      const serviceName = service.name;
      versions[serviceName] = {};
      
      customers.forEach((customer) => {
        versions[serviceName][customer.id] = {};
        
        customer.environments.forEach((env) => {
          let version = null;
          
          // Prep ortamı: Pod status'tan gelen çalışan versiyon
          if (env.name === 'Prep') {
            const matchingPod = prepPodStatus.find(pod => {
              // Pod'un imageName'inden registry'siz service adını al
              const podImageName = pod.imageName?.split(':')[0]; // örn: cofins.azurecr.io/cofins-backofficeportal
              const podServiceName = podImageName?.split('/').pop(); // örn: cofins-backofficeportal
              
              // Service'in imageUrl'inden aynı şekilde al
              const serviceImageName = service.serviceImageName?.split(':')[0]; // örn: cofins.azurecr.io/cofins-backofficeportal
              const serviceNameFromImage = serviceImageName?.split('/').pop(); // örn: cofins-backofficeportal
              
              // Pod name ile de kontrol et (boşluksuz, küçük harf)
              const podName = pod.name?.toLowerCase(); // örn: cofinsbackofficeportal
              const serviceNameLower = serviceNameFromImage?.toLowerCase().replace(/-/g, ''); // cofinsbackofficeportal
              
              return podServiceName === serviceNameFromImage || podName === serviceNameLower;
            });
            
            if (matchingPod && matchingPod.currentVersion) {
              version = matchingPod.currentVersion.startsWith('v') 
                ? matchingPod.currentVersion 
                : `v${matchingPod.currentVersion}`;
            }
          }
          
          // Prod ortamı: API'nin currentVersion'u (yayınlanan versiyon)
          else if (env.name === 'Prod') {
            if (service.currentVersion) {
              version = service.currentVersion.startsWith('v')
                ? service.currentVersion
                : `v${service.currentVersion}`;
            }
          }
          
          // Diğer ortamlar: Müşterinin environment versiyonu
          else {
            version = env.version || 'v1.24.0';
          }
          
          // Versiyon durumunu belirle
          let status = 'default';
          let hotfixes = [];
          
          if (version) {
            status = 'current';
          }
          
          versions[serviceName][customer.id][env.name] = {
            status,
            version,
            hotfixes,
          };
        });
      });
    });
    
    return versions;
  };

  const [serviceVersions, setServiceVersions] = useState({});
  
  // Veriler değiştiğinde service versions'ı güncelle
  useEffect(() => {
    if (customers.length > 0 && services.length > 0) {
      console.log('🔄 Service versions güncelleniyor...');
      setServiceVersions(generateServiceVersions());
    }
  }, [customers, services, prepPodStatus]);

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
    service.name.toLowerCase().includes(filterText.toLowerCase())
  );

  const filteredCustomers = selectedCustomer === 'all' 
    ? customers 
    : customers.filter(c => c.id === selectedCustomer);

  // Yenileme
  const handleRefresh = async () => {
    await Promise.all([fetchCustomers(), fetchServices(), fetchPrepPodStatus()]);
    setLastUpdate(new Date());
  };

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
      {/* Başlık ve Kontroller */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" fontWeight="bold">
            Servis Versiyon Matrisi V2
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

        {customers.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="error" gutterBottom>
              ⚠️ Müşteri bulunamadı
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Firebase'de Customers collection'ında müşteri kaydı bulunmuyor.
            </Typography>
          </Box>
        ) : (
          <>
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
                  disabled={loading}
                >
                  <MenuItem value="all">Tüm Müşteriler ({customers.length})</MenuItem>
                  {customers.map((customer) => (
                    <MenuItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            {/* Renk Açıklaması */}
            <Card variant="outlined" sx={{ bgcolor: '#f5f5f5', mt: 2 }}>
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
          </>
        )}
      </Paper>

      {/* Müşteri yoksa tabloyu gösterme */}
      {customers.length === 0 ? null : (
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
            {filteredServices.map((service, serviceIndex) => {
              const serviceName = service.name;
              return (
              <TableRow 
                key={serviceName}
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
                  {serviceName}
                </TableCell>

                {/* Versiyon hücreleri */}
                {filteredCustomers.map((customer) => (
                  <React.Fragment key={customer.id}>
                    {customer.environments.map((env, envIndex) => {
                      const versionData = serviceVersions[serviceName]?.[customer.id]?.[env.name];
                      
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
            );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      )}
    </Box>
  );
};

export default ServiceVersionMatrixV2;
