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
import WorkItemsSection from './WorkItemsSection';

const PullRequestsList = ({ selectedProduct, selectedProductData, onWorkItemsCollected }) => {
  const [prData, setPrData] = useState({});
  const [loadingPRs, setLoadingPRs] = useState(false);
  const [expandedServices, setExpandedServices] = useState({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [collectedWorkItemIds, setCollectedWorkItemIds] = useState([]);
  const [buildData, setBuildData] = useState({});
  const [loadingBuilds, setLoadingBuilds] = useState(false);
  const [releaseData, setReleaseData] = useState({});
  const [loadingReleases, setLoadingReleases] = useState(false);

  // Seçilen ürün ve versiyon oluşturulma tarihi değiştiğinde PR'ları çek
  useEffect(() => {
    const fetchPRs = async () => {
      console.log('🔍 fetchPRs çalıştı - selectedProduct:', selectedProduct);
      console.log('🔍 selectedProductData:', selectedProductData);
      console.log('🔍 currentVersionCreatedAt:', selectedProductData?.currentVersionCreatedAt);
      
      if (!selectedProduct || !selectedProductData?.currentVersionCreatedAt) {
        console.log('❌ PR fetch iptal edildi - koşullar sağlanmadı');
        setPrData({});
        return;
      }

      console.log('✅ PR fetch başlıyor...');
      setLoadingPRs(true);
      const newPrData = {};

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
        console.log('📋 RepoName olan API\'ler:', apis.filter(a => a.repoName));

        const prPromises = apis.map(async (api) => {
          if (!api.repoName) {
            console.log(`⚠️ API repoName yok, atlanıyor: ${api.name}`);
            return { api, prs: [] };
          }

          try {
            const startDate = new Date(selectedProductData.currentVersionCreatedAt).toISOString();
            const url = `http://localhost:5678/webhook/GetPRListByRepo?repoName=${encodeURIComponent(api.repoName)}&startDate=${encodeURIComponent(startDate)}`;
            console.log(`🌐 API çağrısı yapılıyor: ${url}`);
            
            const response = await fetch(url);

            if (!response.ok) {
              console.error(`PR'lar çekilirken hata (${api.repoName}):`, response.statusText);
              return { api, prs: [] };
            }

            const data = await response.json();
            console.log(`✅ API yanıtı alındı (${api.repoName}):`, data);
            
            // API response formatını normalize et
            let prs = [];
            if (Array.isArray(data)) {
              // Array içinde wrapper objeler var
              if (data.length > 0 && data[0].pull_requests) {
                prs = data[0].pull_requests.map(pr => ({
                  id: pr.pull_request_id,
                  title: pr.title,
                  author: pr.created_by,
                  branch: pr.source_branch,
                  date: new Date(pr.creation_date).toLocaleDateString('tr-TR'),
                  status: pr.status,
                  url: pr.url,
                  workItemIds: pr.work_item_ids || []
                }));
                console.log(`  → ${prs.length} PR bulundu`);
              }
            }
            
            return { api, prs };
          } catch (error) {
            console.error(`❌ PR'lar çekilirken hata (${api.repoName}):`, error);
            return { api, prs: [] };
          }
        });

        const results = await Promise.all(prPromises);
        console.log('📊 Tüm API çağrıları tamamlandı. Sonuçlar:', results);

        results.forEach(({ api, prs }) => {
          const groupKey = api.moduleGroupId;
          const moduleKey = `${api.moduleGroupId}_${api.moduleId}`;
          const apiKey = `${api.moduleGroupId}_${api.moduleId}_${api.apiId}`;

          if (!newPrData[groupKey]) {
            newPrData[groupKey] = {
              name: api.moduleGroupName,
              modules: {}
            };
          }

          if (!newPrData[groupKey].modules[moduleKey]) {
            newPrData[groupKey].modules[moduleKey] = {
              name: api.moduleName,
              apis: {}
            };
          }

          newPrData[groupKey].modules[moduleKey].apis[apiKey] = {
            name: api.name,
            repoName: api.repoName,
            releaseName: api.releaseName,
            prs: prs
          };
        });

        console.log('💾 PR verileri state\'e kaydediliyor:', newPrData);
        setPrData(newPrData);
        
        // Collect all work item IDs and notify parent
        const allWorkItemIds = new Set();
        Object.values(newPrData).forEach(group => {
          Object.values(group.modules).forEach(module => {
            Object.values(module.apis).forEach(api => {
              api.prs.forEach(pr => {
                if (pr.workItemIds && Array.isArray(pr.workItemIds)) {
                  pr.workItemIds.forEach(id => allWorkItemIds.add(id));
                }
              });
            });
          });
        });
        
        const workItemIdsArray = Array.from(allWorkItemIds);
        console.log('📋 Toplanan Work Item ID\'leri:', workItemIdsArray);
        setCollectedWorkItemIds(workItemIdsArray);
        
        // Parent component'e bildir
        if (onWorkItemsCollected) {
          onWorkItemsCollected(workItemIdsArray);
        }
      } catch (error) {
        console.error('❌ PR verileri işlenirken hata:', error);
      } finally {
        setLoadingPRs(false);
        console.log('✅ PR fetch tamamlandı');
      }
    };

    fetchPRs();
  }, [selectedProduct, selectedProductData, refreshTrigger]);

  // PR'lar yüklendikten sonra build bilgilerini çek
  useEffect(() => {
    const fetchBuilds = async () => {
      if (!prData || Object.keys(prData).length === 0) {
        setBuildData({});
        return;
      }

      console.log('🏗️ Build bilgileri çekiliyor...');
      setLoadingBuilds(true);

      try {
        const buildMap = {};
        const fetchPromises = [];

        // Her API için ayrı ayrı build bilgilerini çek
        Object.values(prData).forEach(group => {
          Object.values(group.modules).forEach(module => {
            Object.values(module.apis).forEach(api => {
              if (!api.repoName || api.prs.length === 0) {
                return;
              }

              // Bu API'nin PR ID'lerini topla
              const apiPrIds = api.prs
                .filter(pr => pr.id)
                .map(pr => pr.id);

              if (apiPrIds.length === 0) {
                return;
              }

              // Her API için ayrı fetch
              const fetchPromise = (async () => {
                try {
                  const pridsString = JSON.stringify(apiPrIds);
                  const url = `http://localhost:5678/webhook/GetBuildListByPrids?prids=${encodeURIComponent(pridsString)}&repository_name=${encodeURIComponent(api.repoName)}`;
                  console.log(`🌐 Build API çağrısı: ${api.repoName}, PR IDs:`, apiPrIds);
                  
                  const response = await fetch(url);

                  if (!response.ok) {
                    console.error(`Build bilgileri çekilirken hata (${api.repoName}):`, response.statusText);
                    return;
                  }

                  const data = await response.json();
                  console.log(`✅ Build bilgileri alındı (${api.repoName}):`, data);

                  // Build verilerini PR ID'ye göre map'le
                  if (Array.isArray(data) && data.length > 0 && data[0].builds) {
                    data[0].builds.forEach(build => {
                      if (build.pr_id) {
                        // Aynı PR ID için birden fazla build olabilir, en sonuncuyu kullan
                        buildMap[build.pr_id] = build;
                      }
                    });
                  }
                } catch (error) {
                  console.error(`❌ Build bilgileri çekilirken hata (${api.repoName}):`, error);
                }
              })();

              fetchPromises.push(fetchPromise);
            });
          });
        });

        // Tüm API çağrılarının tamamlanmasını bekle
        await Promise.all(fetchPromises);

        console.log('💾 Build verileri state\'e kaydediliyor:', buildMap);
        setBuildData(buildMap);
      } catch (error) {
        console.error('❌ Build bilgileri işlenirken hata:', error);
      } finally {
        setLoadingBuilds(false);
        console.log('✅ Build fetch tamamlandı');
      }
    };

    fetchBuilds();
  }, [prData]);

  // Build'ler yüklendikten sonra release bilgilerini çek
  useEffect(() => {
    const fetchReleases = async () => {
      if (!prData || Object.keys(prData).length === 0 || !buildData || Object.keys(buildData).length === 0) {
        setReleaseData({});
        return;
      }

      console.log('🚀 Release bilgileri çekiliyor...');
      setLoadingReleases(true);

      try {
        const releaseMap = {};
        const fetchPromises = [];

        // Her API için release bilgilerini çek
        Object.values(prData).forEach(group => {
          Object.values(group.modules).forEach(module => {
            Object.values(module.apis).forEach(api => {
              // releaseName boşsa atla
              if (!api.releaseName) {
                console.log(`⚠️ Release name yok, atlanıyor: ${api.name}`);
                return;
              }

              // Bu API'ye ait succeeded build'leri bul
              const succeededBuilds = api.prs
                .filter(pr => pr.id && buildData[pr.id] && buildData[pr.id].result === 'succeeded')
                .map(pr => ({
                  prId: pr.id,
                  buildNumber: buildData[pr.id].build_number
                }));

              if (succeededBuilds.length === 0) {
                console.log(`⚠️ Succeeded build yok, atlanıyor: ${api.name}`);
                return;
              }

              // Her API için ayrı fetch
              const fetchPromise = (async () => {
                try {
                  const url = `http://localhost:5678/webhook/GetReleases?definition_name=${encodeURIComponent(api.releaseName)}`;
                  console.log(`🌐 Release API çağrısı: ${api.releaseName}`);
                  
                  const response = await fetch(url);

                  if (!response.ok) {
                    console.error(`Release bilgileri çekilirken hata (${api.releaseName}):`, response.statusText);
                    return;
                  }

                  const data = await response.json();
                  console.log(`✅ Release bilgileri alındı (${api.releaseName}):`, data);

                  // Release verilerini build number'a göre eşleştir
                  if (Array.isArray(data) && data.length > 0 && data[0].data && data[0].data.length > 0) {
                    const releases = data[0].data[0].releases || [];
                    
                    console.log(`📊 Release listesi (${api.releaseName}):`, releases.map(r => r.name));
                    console.log(`🔍 Aranan build number'lar:`, succeededBuilds.map(b => b.buildNumber));
                    
                    // Her succeeded build için eşleşen release'i bul
                    succeededBuilds.forEach(({ prId, buildNumber }) => {
                      console.log(`🔎 PR ${prId} için aranan build number: "${buildNumber}"`);
                      
                      const matchingRelease = releases.find(release => {
                        // Release name: "1.0.20251216.2", Build number: "20251216.2"
                        const matches = release.name && release.name.includes(buildNumber);
                        if (release.name) {
                          console.log(`  Karşılaştırma: "${release.name}".includes("${buildNumber}") = ${matches}`);
                        }
                        return matches;
                      });

                      if (matchingRelease) {
                        console.log(`🎯 Eşleşme bulundu! PR ID: ${prId}, Build: ${buildNumber}, Release: ${matchingRelease.name}`);
                        releaseMap[prId] = {
                          name: matchingRelease.name,
                          status: matchingRelease.status,
                          stages: matchingRelease.stages || [],
                          url: matchingRelease.url
                        };
                      } else {
                        console.log(`❌ Eşleşme bulunamadı! PR ID: ${prId}, Build: ${buildNumber}`);
                      }
                    });
                  }
                } catch (error) {
                  console.error(`❌ Release bilgileri çekilirken hata (${api.releaseName}):`, error);
                }
              })();

              fetchPromises.push(fetchPromise);
            });
          });
        });

        // Tüm API çağrılarının tamamlanmasını bekle
        await Promise.all(fetchPromises);

        console.log('💾 Release verileri state\'e kaydediliyor:', releaseMap);
        setReleaseData(releaseMap);
      } catch (error) {
        console.error('❌ Release bilgileri işlenirken hata:', error);
      } finally {
        setLoadingReleases(false);
        console.log('✅ Release fetch tamamlandı');
      }
    };

    fetchReleases();
  }, [prData, buildData]);

  const handleRefreshPRs = () => {
    console.log('🔄 Manuel PR yenileme tetiklendi');
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
    <>
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
          <CheckCircleIcon color="primary" />
          <Typography variant="h6">
            Son Tarihten Bugüne Atılan PR'lar
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={(e) => {
              e.stopPropagation();
              handleRefreshPRs();
            }}
            disabled={loadingPRs}
            sx={{ ml: 'auto' }}
          >
            Yenile
          </Button>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {loadingPRs ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography>PR'lar yükleniyor...</Typography>
          </Box>
        ) : Object.keys(prData).length === 0 ? (
          <Alert severity="info">
            Bu ürün için PR verisi bulunamadı. API tanımlarında repoName alanlarını kontrol edin.
          </Alert>
        ) : (
          <Box>
            {Object.entries(prData).map(([groupKey, group]) => (
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
                                {api.repoName && (
                                  <Chip 
                                    label={api.repoName} 
                                    size="small" 
                                    sx={{ mt: 0.5, fontFamily: 'monospace', fontSize: '0.7rem' }} 
                                  />
                                )}
                              </Box>
                              <Chip 
                                label={`${api.prs.length} PR`} 
                                size="small" 
                                color={api.prs.length > 0 ? 'primary' : 'default'}
                              />
                            </Box>
                          </Paper>
                          
                          {isExpanded && api.prs.length > 0 && (
                            <Box sx={{ mt: 1, ml: 2 }}>
                              <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                  <TableHead>
                                    <TableRow sx={{ bgcolor: '#f9f9f9' }}>
                                      <TableCell sx={{ fontWeight: 'bold' }}>PR ID</TableCell>
                                      <TableCell sx={{ fontWeight: 'bold' }}>PR Title</TableCell>
                                      <TableCell sx={{ fontWeight: 'bold' }}>Author</TableCell>
                                      <TableCell sx={{ fontWeight: 'bold' }}>Branch</TableCell>
                                      <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                                      <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                      <TableCell sx={{ fontWeight: 'bold' }}>Pipeline Durumu</TableCell>
                                      <TableCell sx={{ fontWeight: 'bold' }}>Release Durumu</TableCell>
                                      <TableCell sx={{ fontWeight: 'bold' }}>Work Items</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {api.prs.map((pr, idx) => {
                                      const build = buildData[pr.id];
                                      const release = releaseData[pr.id];
                                      return (
                                      <TableRow key={idx} hover>
                                        <TableCell>
                                          <Chip 
                                            label={pr.id || '-'} 
                                            size="small" 
                                            color="primary"
                                            variant="outlined"
                                            sx={{ fontFamily: 'monospace' }}
                                          />
                                        </TableCell>
                                        <TableCell>{pr.title || '-'}</TableCell>
                                        <TableCell>{pr.author || '-'}</TableCell>
                                        <TableCell>
                                          <Chip label={pr.branch || 'master'} size="small" variant="outlined" />
                                        </TableCell>
                                        <TableCell>
                                          {pr.date || '-'}
                                        </TableCell>
                                        <TableCell>
                                          <Chip 
                                            label={pr.status || 'unknown'} 
                                            size="small" 
                                            color={getStatusColor(pr.status)}
                                          />
                                        </TableCell>
                                        <TableCell>
                                          {loadingBuilds ? (
                                            <Typography variant="caption" color="text.secondary">
                                              Yükleniyor...
                                            </Typography>
                                          ) : build ? (
                                            <Box
                                              onClick={() => window.open(build.url, '_blank')}
                                              sx={{
                                                cursor: 'pointer',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 0.5,
                                                '&:hover': {
                                                  opacity: 0.8
                                                }
                                              }}
                                            >
                                              <Chip
                                                label={build.result || 'unknown'}
                                                size="small"
                                                color={build.result === 'succeeded' ? 'success' : build.result === 'failed' ? 'error' : 'default'}
                                                sx={{ fontWeight: 'bold' }}
                                              />
                                              <Typography
                                                variant="caption"
                                                sx={{
                                                  fontSize: '0.65rem',
                                                  color: 'text.secondary',
                                                  fontFamily: 'monospace'
                                                }}
                                              >
                                                {build.build_number}
                                              </Typography>
                                            </Box>
                                          ) : (
                                            <Typography variant="caption" color="text.secondary">
                                              -
                                            </Typography>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {loadingReleases ? (
                                            <Typography variant="caption" color="text.secondary">
                                              Yükleniyor...
                                            </Typography>
                                          ) : release ? (
                                            <Box
                                              onClick={() => window.open(release.url, '_blank')}
                                              sx={{
                                                cursor: 'pointer',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 0.5,
                                                '&:hover': {
                                                  opacity: 0.8
                                                }
                                              }}
                                            >
                                              {release.stages && release.stages.length > 0 ? (
                                                release.stages.map((stage, stageIdx) => {
                                                  const getStageColor = (status) => {
                                                    switch (status) {
                                                      case 'succeeded':
                                                        return 'success';
                                                      case 'rejected':
                                                      case 'failed':
                                                        return 'error';
                                                      case 'inProgress':
                                                        return 'warning';
                                                      case 'notStarted':
                                                        return 'default';
                                                      default:
                                                        return 'default';
                                                    }
                                                  };

                                                  return (
                                                    <Chip
                                                      key={stageIdx}
                                                      label={`${stage.name}: ${stage.status}`}
                                                      size="small"
                                                      color={getStageColor(stage.status)}
                                                      sx={{ 
                                                        fontWeight: 'bold',
                                                        fontSize: '0.7rem',
                                                        mb: 0.5
                                                      }}
                                                    />
                                                  );
                                                })
                                              ) : (
                                                <Typography variant="caption" color="text.secondary">
                                                  Stage yok
                                                </Typography>
                                              )}
                                            </Box>
                                          ) : build && build.result === 'succeeded' && !api.releaseName ? (
                                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                              Release Name tanımlı değil
                                            </Typography>
                                          ) : build && build.result !== 'succeeded' ? (
                                            <Typography variant="caption" color="text.secondary">
                                              -
                                            </Typography>
                                          ) : (
                                            <Typography variant="caption" color="text.secondary">
                                              -
                                            </Typography>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {pr.workItemIds && pr.workItemIds.length > 0 ? (
                                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                              {pr.workItemIds.map((workItemId, widx) => (
                                                <Chip 
                                                  key={widx}
                                                  label={workItemId} 
                                                  size="small" 
                                                  variant="outlined"
                                                  color="info"
                                                  sx={{ fontSize: '0.7rem' }}
                                                />
                                              ))}
                                            </Box>
                                          ) : (
                                            '-'
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    );
                                    })}
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

    {/* Work Items Section */}
    <WorkItemsSection 
      selectedProduct={selectedProduct}
      selectedProductData={selectedProductData}
      workItemIds={collectedWorkItemIds}
    />
  </>
  );
};

export default PullRequestsList;
