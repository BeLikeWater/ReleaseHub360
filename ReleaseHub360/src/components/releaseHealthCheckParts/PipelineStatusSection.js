import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
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

const PipelineStatusSection = ({ selectedProduct, selectedProductData }) => {
  const [buildData, setBuildData] = useState({});
  const [loadingBuilds, setLoadingBuilds] = useState(false);
  const [expandedApis, setExpandedApis] = useState({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Seçilen ürün değiştiğinde build'leri çek
  useEffect(() => {
    const fetchBuilds = async () => {
      console.log('🔍 fetchBuilds çalıştı - selectedProduct:', selectedProduct);
      console.log('🔍 selectedProductData:', selectedProductData);
      
      if (!selectedProduct || !selectedProductData) {
        console.log('❌ Build fetch iptal edildi - koşullar sağlanmadı');
        setBuildData({});
        return;
      }

      console.log('✅ Build fetch başlıyor...');
      setLoadingBuilds(true);
      const newBuildData = {};

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
        console.log('📋 PipelineName olan API\'ler:', apis.filter(a => a.pipelineName));

        const buildPromises = apis.map(async (api) => {
          if (!api.pipelineName) {
            console.log(`⚠️ API pipelineName yok, atlanıyor: ${api.name}`);
            return { api, builds: [] };
          }

          try {
            const url = `http://localhost:5678/webhook/GetBuildListByPipeline?pipelineName=${encodeURIComponent(api.pipelineName)}`;
            console.log(`🌐 API çağrısı yapılıyor: ${url}`);
            
            const response = await fetch(url);

            if (!response.ok) {
              console.error(`Build'ler çekilirken hata (${api.pipelineName}):`, response.statusText);
              return { api, builds: [] };
            }

            const data = await response.json();
            console.log(`✅ API yanıtı alındı (${api.pipelineName}):`, data);
            
            // API response formatını normalize et
            let builds = [];
            if (Array.isArray(data)) {
              if (data.length > 0 && data[0].builds) {
                builds = data[0].builds.map(build => ({
                  buildNumber: build.build_number,
                  status: build.status,
                  finishTime: new Date(build.finish_time).toLocaleDateString('tr-TR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  }),
                  prId: build.pr_id,
                  url: build.url
                }));
                console.log(`  → ${builds.length} build bulundu`);
              }
            }
            
            return { api, builds };
          } catch (error) {
            console.error(`❌ Build'ler çekilirken hata (${api.pipelineName}):`, error);
            return { api, builds: [] };
          }
        });

        const results = await Promise.all(buildPromises);
        console.log('📊 Tüm API çağrıları tamamlandı. Sonuçlar:', results);

        results.forEach(({ api, builds }) => {
          const groupKey = api.moduleGroupId;
          const moduleKey = `${api.moduleGroupId}_${api.moduleId}`;
          const apiKey = `${api.moduleGroupId}_${api.moduleId}_${api.apiId}`;

          if (!newBuildData[groupKey]) {
            newBuildData[groupKey] = {
              name: api.moduleGroupName,
              modules: {}
            };
          }

          if (!newBuildData[groupKey].modules[moduleKey]) {
            newBuildData[groupKey].modules[moduleKey] = {
              name: api.moduleName,
              apis: {}
            };
          }

          newBuildData[groupKey].modules[moduleKey].apis[apiKey] = {
            name: api.name,
            pipelineName: api.pipelineName,
            builds: builds,
            latestStatus: builds.length > 0 ? builds[0].status : null,
            latestBuildNumber: builds.length > 0 ? builds[0].buildNumber : null
          };
        });

        console.log('💾 Build verileri state\'e kaydediliyor:', newBuildData);
        setBuildData(newBuildData);
      } catch (error) {
        console.error('❌ Build verileri işlenirken hata:', error);
      } finally {
        setLoadingBuilds(false);
        console.log('✅ Build fetch tamamlandı');
      }
    };

    fetchBuilds();
  }, [selectedProduct, selectedProductData, refreshTrigger]);

  const handleRefreshBuilds = () => {
    console.log('🔄 Manuel build yenileme tetiklendi');
    setRefreshTrigger(prev => prev + 1);
  };

  const toggleApi = (apiId) => {
    setExpandedApis(prev => ({
      ...prev,
      [apiId]: !prev[apiId]
    }));
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'succeeded':
      case 'success':
        return 'success';
      case 'partiallysucceeded':
      case 'partially succeeded':
        return 'warning';
      case 'failed':
      case 'error':
        return 'error';
      case 'inprogress':
      case 'in progress':
        return 'info';
      case 'canceled':
      case 'cancelled':
        return 'default';
      default:
        return 'default';
    }
  };

  const getApiStatusColor = (latestStatus) => {
    if (!latestStatus) return 'default';
    switch (latestStatus.toLowerCase()) {
      case 'succeeded':
      case 'success':
        return 'success';
      default:
        return 'error';
    }
  };

  return (
    <Accordion sx={{ mt: 2 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
          <CheckCircleIcon color="primary" />
          <Typography variant="h6">
            Servis Pipeline Durumları
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={(e) => {
              e.stopPropagation();
              handleRefreshBuilds();
            }}
            disabled={loadingBuilds}
            sx={{ ml: 'auto' }}
          >
            Yenile
          </Button>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {loadingBuilds ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography>Pipeline durumları yükleniyor...</Typography>
          </Box>
        ) : Object.keys(buildData).length === 0 ? (
          <Alert severity="info">
            Bu ürün için pipeline verisi bulunamadı. API tanımlarında pipelineName alanlarını kontrol edin.
          </Alert>
        ) : (
          <Box>
            {Object.entries(buildData).map(([groupKey, group]) => (
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
                      const isExpanded = expandedApis[apiKey];
                      
                      return (
                        <Box key={apiKey} sx={{ ml: 4, mb: 2 }}>
                          <Paper
                            onClick={() => toggleApi(apiKey)}
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
                                {api.pipelineName && (
                                  <Chip 
                                    label={api.pipelineName} 
                                    size="small" 
                                    sx={{ mt: 0.5, fontFamily: 'monospace', fontSize: '0.7rem' }} 
                                  />
                                )}
                              </Box>
                              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                {api.latestBuildNumber && (
                                  <Chip 
                                    label={api.latestBuildNumber} 
                                    size="small" 
                                    variant="outlined"
                                    sx={{ fontFamily: 'monospace' }}
                                  />
                                )}
                                <Chip 
                                  label={`${api.builds.length} build`} 
                                  size="small" 
                                  color={api.builds.length > 0 ? 'primary' : 'default'}
                                />
                                {api.latestStatus && (
                                  <Chip 
                                    label={api.latestStatus} 
                                    size="small" 
                                    color={getApiStatusColor(api.latestStatus)}
                                  />
                                )}
                              </Box>
                            </Box>
                          </Paper>
                          
                          {isExpanded && api.builds.length > 0 && (
                            <Box sx={{ mt: 1, ml: 2 }}>
                              <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                  <TableHead>
                                    <TableRow sx={{ bgcolor: '#f9f9f9' }}>
                                      <TableCell sx={{ fontWeight: 'bold' }}>Build Number</TableCell>
                                      <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                      <TableCell sx={{ fontWeight: 'bold' }}>Finish Time</TableCell>
                                      <TableCell sx={{ fontWeight: 'bold' }}>PR ID</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {api.builds.map((build, idx) => (
                                      <TableRow key={idx} hover>
                                        <TableCell>
                                          <Chip 
                                            label={build.buildNumber} 
                                            size="small" 
                                            variant="outlined"
                                            sx={{ fontFamily: 'monospace' }}
                                          />
                                        </TableCell>
                                        <TableCell>
                                          <Chip 
                                            label={build.status || 'unknown'} 
                                            size="small" 
                                            color={getStatusColor(build.status)}
                                          />
                                        </TableCell>
                                        <TableCell>{build.finishTime || '-'}</TableCell>
                                        <TableCell>
                                          {build.prId ? (
                                            <Chip 
                                              label={`#${build.prId}`} 
                                              size="small" 
                                              color="primary"
                                              variant="outlined"
                                            />
                                          ) : '-'}
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

export default PipelineStatusSection;
