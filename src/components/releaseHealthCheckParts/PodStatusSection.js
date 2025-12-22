import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Button,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';

const PodStatusSection = ({ selectedProduct, selectedProductData }) => {
  const [podData, setPodData] = useState({});
  const [loadingPods, setLoadingPods] = useState(false);
  const [expandedServices, setExpandedServices] = useState({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Extract service name from image name
  // Example: "cofins.azurecr.io/cofins-backofficeportal:1.0.20251216.4" -> "cofins-backofficeportal"
  const extractServiceNameFromImage = (imageName) => {
    if (!imageName) return null;
    const match = imageName.match(/\/([^:]+):/);
    return match ? match[1] : null;
  };

  // Fetch pod status for all APIs
  useEffect(() => {
    const fetchPods = async () => {
      console.log('🔍 fetchPods çalıştı - selectedProduct:', selectedProduct);
      console.log('🔍 selectedProductData:', selectedProductData);
      
      if (!selectedProduct || !selectedProductData) {
        console.log('❌ Pod fetch iptal edildi - koşullar sağlanmadı');
        setPodData({});
        return;
      }

      console.log('✅ Pod fetch başlıyor...');
      setLoadingPods(true);
      const newPodData = {};

      try {
        const apis = [];
        
        if (selectedProductData.childModuleGroups) {
          selectedProductData.childModuleGroups.forEach(moduleGroup => {
            if (moduleGroup.childModules) {
              moduleGroup.childModules.forEach(module => {
                if (module.childApis) {
                  module.childApis.forEach(api => {
                    apis.push({
                      ...api,
                      moduleGroupName: moduleGroup.name,
                      moduleName: module.name,
                      moduleGroupId: moduleGroup.moduleGroupId,
                      moduleId: module.moduleId
                    });
                  });
                }
              });
            }
          });
        }

        if (selectedProductData.childModules) {
          selectedProductData.childModules.forEach(module => {
            if (module.childApis) {
              module.childApis.forEach(api => {
                apis.push({
                  ...api,
                  moduleGroupName: 'Doğrudan Modüller',
                  moduleName: module.name,
                  moduleGroupId: 'direct',
                  moduleId: module.moduleId
                });
              });
            }
          });
        }

        console.log(`📋 Toplam ${apis.length} API bulundu:`, apis);
        console.log('📋 ServiceImageName olan API\'ler:', apis.filter(a => a.serviceImageName));

        // Fetch pod status from API
        console.log('🌐 GetPodStatus API çağrısı yapılıyor...');
        
        let allPods = [];
        try {
          const response = await fetch('http://localhost:5678/webhook/GetPodStatus');
          if (response.ok) {
            allPods = await response.json();
            console.log('✅ Pod verileri alındı:', allPods);
          } else {
            console.error('❌ GetPodStatus API hatası:', response.statusText);
          }
        } catch (error) {
          console.error('❌ GetPodStatus API hatası:', error);
        }

        // Match pods with APIs based on serviceImageName
        apis.forEach((api) => {
          let matchingPods = [];
          
          if (api.serviceImageName && allPods.length > 0) {
            matchingPods = allPods.filter(pod => {
              const podServiceName = extractServiceNameFromImage(pod.imageName);
              const matches = podServiceName && podServiceName === api.serviceImageName;
              if (matches) {
                console.log(`✅ Eşleşme bulundu: API "${api.name}" (${api.serviceImageName}) <-> Pod "${pod.podName}"`);
              }
              return matches;
            });
            console.log(`📊 API "${api.name}" için ${matchingPods.length} pod bulundu`);
          } else {
            console.log(`⚠️ API "${api.name}": serviceImageName yok, atlanıyor`);
          }
          const groupKey = api.moduleGroupId;
          const moduleKey = `${api.moduleGroupId}_${api.moduleId}`;
          const apiKey = `${api.moduleGroupId}_${api.moduleId}_${api.apiId}`;

          if (!newPodData[groupKey]) {
            newPodData[groupKey] = {
              name: api.moduleGroupName,
              modules: {}
            };
          }

          if (!newPodData[groupKey].modules[moduleKey]) {
            newPodData[groupKey].modules[moduleKey] = {
              name: api.moduleName,
              apis: {}
            };
          }

          // Get unique versions from pods
          const uniqueVersions = [...new Set(matchingPods.map(p => p.currentVersion))];
          
          newPodData[groupKey].modules[moduleKey].apis[apiKey] = {
            name: api.name,
            serviceImageName: api.serviceImageName,
            pods: matchingPods,
            totalPods: matchingPods.length,
            runningPods: matchingPods.filter(p => p.status === 'Running').length,
            versions: uniqueVersions
          };
        });

        console.log('💾 Pod verileri state\'e kaydediliyor:', newPodData);
        setPodData(newPodData);
      } catch (error) {
        console.error('❌ Pod verileri işlenirken hata:', error);
      } finally {
        setLoadingPods(false);
        console.log('✅ Pod fetch tamamlandı');
      }
    };

    fetchPods();
  }, [selectedProduct, selectedProductData, refreshTrigger]);

  const handleRefreshPods = () => {
    console.log('🔄 Manuel Pod yenileme tetiklendi');
    setRefreshTrigger(prev => prev + 1);
  };

  const toggleService = (serviceId) => {
    setExpandedServices(prev => ({
      ...prev,
      [serviceId]: !prev[serviceId]
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
      case 'merged':
      case 'completed':
      case 'Done':
        return 'success';
      case 'pending':
      case 'In Progress':
        return 'warning';
      case 'failed':
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Accordion defaultExpanded sx={{ mt: 2 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
          <CheckCircleIcon color="primary" />
          <Typography variant="h6">
            Pod Durumları
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={(e) => {
              e.stopPropagation();
              handleRefreshPods();
            }}
            disabled={loadingPods}
            sx={{ ml: 'auto' }}
          >
            Yenile
          </Button>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {loadingPods ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography>Pod bilgileri yükleniyor...</Typography>
          </Box>
        ) : Object.keys(podData).length === 0 ? (
          <Alert severity="info">
            Bu ürün için pod verisi bulunamadı. API tanımlarında serviceImageName alanlarını kontrol edin.
          </Alert>
        ) : (
          <Box>
            {Object.entries(podData).map(([groupKey, group]) => (
              <Box key={groupKey} sx={{ mb: 3 }}>
                <Paper 
                  sx={{ 
                    p: 2, 
                    mb: 2, 
                    bgcolor: '#e3f2fd',
                    borderLeft: '4px solid #1976d2'
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                    📦 {group.name}
                  </Typography>
                </Paper>

                {Object.entries(group.modules).map(([moduleKey, module]) => (
                  <Box key={moduleKey} sx={{ ml: 4, mb: 2 }}>
                    <Paper 
                      sx={{ 
                        p: 1.5, 
                        mb: 1.5, 
                        bgcolor: '#f5f5f5',
                        borderLeft: '3px solid #757575'
                      }}
                    >
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        📂 {module.name}
                      </Typography>
                    </Paper>

                    {Object.entries(module.apis).map(([apiKey, api]) => {
                      const isExpanded = expandedServices[apiKey];
                      
                      return (
                        <Box key={apiKey} sx={{ ml: 4, mb: 2 }}>
                          <Paper
                            onClick={() => toggleService(apiKey)}
                            sx={{
                              p: 1.5,
                              cursor: 'pointer',
                              bgcolor: '#fafafa',
                              '&:hover': { bgcolor: '#f0f0f0' },
                              borderLeft: '2px solid #9e9e9e'
                            }}
                          >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                  🔌 {api.name}
                                </Typography>
                                {api.serviceImageName && (
                                  <Chip 
                                    label={api.serviceImageName} 
                                    size="small" 
                                    sx={{ mt: 0.5, fontFamily: 'monospace', fontSize: '0.7rem' }} 
                                  />
                                )}
                              </Box>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Chip 
                                  label={`${api.runningPods}/${api.totalPods} Running`} 
                                  size="small" 
                                  color={api.runningPods === api.totalPods && api.totalPods > 0 ? 'success' : 'default'}
                                />
                                {api.versions && api.versions.length > 0 && (
                                  <Chip 
                                    label={api.versions.length === 1 ? api.versions[0] : `${api.versions.length} versions`} 
                                    size="small" 
                                    color="info"
                                    variant="outlined"
                                    sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}
                                  />
                                )}
                              </Box>
                            </Box>
                          </Paper>
                          
                          {isExpanded && api.pods.length > 0 && (
                            <Box sx={{ mt: 1, ml: 2 }}>
                              <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                  <TableHead>
                                    <TableRow sx={{ bgcolor: '#f9f9f9' }}>
                                      <TableCell sx={{ fontWeight: 'bold' }}>Pod Name</TableCell>
                                      <TableCell sx={{ fontWeight: 'bold' }}>Namespace</TableCell>
                                      <TableCell sx={{ fontWeight: 'bold' }}>Version</TableCell>
                                      <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                      <TableCell sx={{ fontWeight: 'bold' }}>Image</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {api.pods.map((pod, idx) => (
                                      <TableRow key={idx} hover>
                                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                          {pod.podName}
                                        </TableCell>
                                        <TableCell>
                                          <Chip label={pod.namespace} size="small" variant="outlined" />
                                        </TableCell>
                                        <TableCell>
                                          <Chip label={pod.currentVersion} size="small" color="primary" variant="outlined" />
                                        </TableCell>
                                        <TableCell>
                                          <Chip 
                                            label={pod.status} 
                                            size="small" 
                                            color={pod.status === 'Running' ? 'success' : 'error'}
                                          />
                                        </TableCell>
                                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                          {pod.imageName}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                ))}
              </Box>
            ))}
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default PodStatusSection;
