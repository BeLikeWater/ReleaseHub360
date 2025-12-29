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
  CircularProgress,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PublishIcon from '@mui/icons-material/Publish';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const PullRequestListReadyToPublish = ({ selectedProduct, selectedProductData, prepPodStatus, onWorkItemsCollected }) => {
  const [prData, setPrData] = useState({});
  const [loadingPRs, setLoadingPRs] = useState(false);
  const [servicesNeedingUpdate, setServicesNeedingUpdate] = useState([]);

  // Helper function: Version'dan build number'ı çıkar
  const extractBuildNumber = (version) => {
    if (!version) return null;
    // "1.0.20251216.4" -> "20251216.4"
    const parts = version.split('.');
    if (parts.length >= 3) {
      return parts.slice(-2).join('.');
    }
    return version;
  };

  // Helper function: Pod status'u bul
  const findMatchingPod = (api) => {
    if (!api.serviceImageName || !prepPodStatus || prepPodStatus.length === 0) {
      return null;
    }

    return prepPodStatus.find(pod => {
      if (!pod.imageName) return false;
      const imageNameParts = pod.imageName.split('/');
      const serviceWithTag = imageNameParts[imageNameParts.length - 1];
      const serviceName = serviceWithTag.split(':')[0];
      return serviceName === api.serviceImageName;
    });
  };

  // Güncelleme bekleyen servisleri belirle
  useEffect(() => {
    if (!selectedProduct || !selectedProductData || !prepPodStatus) {
      setServicesNeedingUpdate([]);
      return;
    }

    console.log('🔍 Güncelleme bekleyen servisler belirleniyor...');
    const needsUpdate = [];
    const apis = [];

    // Tüm API'leri topla
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

    // Güncelleme bekleyen servisleri filtrele
    apis.forEach(api => {
      const matchingPod = findMatchingPod(api);
      if (matchingPod && api.currentVersion && matchingPod.currentVersion !== api.currentVersion) {
        needsUpdate.push({
          ...api,
          publishedVersion: api.currentVersion,
          prepVersion: matchingPod.currentVersion
        });
        console.log(`  ⚠️ ${api.name}: ${api.currentVersion} → ${matchingPod.currentVersion}`);
      }
    });

    console.log(`📊 Toplam ${needsUpdate.length} servis güncelleme bekliyor`);
    setServicesNeedingUpdate(needsUpdate);
  }, [selectedProduct, selectedProductData, prepPodStatus]);

  // PR'ları çek
  useEffect(() => {
    const fetchPRs = async () => {
      if (servicesNeedingUpdate.length === 0) {
        setPrData({});
        return;
      }

      console.log('🚀 PR\'lar çekiliyor...');
      setLoadingPRs(true);
      const newPrData = {};

      try {
        const prPromises = servicesNeedingUpdate.map(async (api) => {
          if (!api.repoName) {
            console.log(`⚠️ API repoName yok, atlanıyor: ${api.name}`);
            return { api, prs: [] };
          }

          try {
            const buildNumberFrom = extractBuildNumber(api.publishedVersion);
            const buildNumberTo = extractBuildNumber(api.prepVersion);

            if (!buildNumberFrom || !buildNumberTo) {
              console.log(`⚠️ Build number çıkarılamadı: ${api.name}`);
              return { api, prs: [] };
            }

            const url = `http://localhost:5678/webhook/GetPRListByRepoAndBuildNumber?repoName=${encodeURIComponent(api.repoName)}&build_number_from=${encodeURIComponent(buildNumberFrom)}&build_number_to=${encodeURIComponent(buildNumberTo)}`;
            console.log(`🌐 API çağrısı: ${url}`);

            const response = await fetch(url);

            if (!response.ok) {
              console.error(`PR'lar çekilirken hata (${api.repoName}):`, response.statusText);
              return { api, prs: [] };
            }

            const data = await response.json();
            console.log(`✅ API yanıtı (${api.repoName}):`, data);

            // API response formatını normalize et
            let prs = [];
            if (Array.isArray(data) && data.length > 0 && data[0].pull_requests) {
              prs = data[0].pull_requests.map(pr => ({
                id: pr.pull_request_id,
                title: pr.title,
                author: pr.created_by,
                branch: pr.source_branch,
                date: pr.creation_date ? new Date(pr.creation_date).toLocaleDateString('tr-TR') : '-',
                status: pr.status,
                url: pr.url,
                workItemIds: pr.work_item_ids || []
              }));
              console.log(`  → ${prs.length} PR bulundu`);
            }

            return { api, prs };
          } catch (error) {
            console.error(`❌ PR'lar çekilirken hata (${api.repoName}):`, error);
            return { api, prs: [] };
          }
        });

        const results = await Promise.all(prPromises);
        console.log('📊 Tüm API çağrıları tamamlandı');

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
            publishedVersion: api.publishedVersion,
            prepVersion: api.prepVersion,
            prs: prs
          };
        });

        setPrData(newPrData);
      } catch (error) {
        console.error('❌ PR fetch genel hata:', error);
      } finally {
        setLoadingPRs(false);
      }
    };

    fetchPRs();
  }, [servicesNeedingUpdate]);

  // Work Item ID'lerini topla ve parent'a gönder
  useEffect(() => {
    const workItemIds = [];
    
    Object.values(prData).forEach(group => {
      Object.values(group.modules).forEach(module => {
        Object.values(module.apis).forEach(api => {
          api.prs.forEach(pr => {
            if (pr.workItemIds && pr.workItemIds.length > 0) {
              workItemIds.push(...pr.workItemIds);
            }
          });
        });
      });
    });

    // Unique work item ID'leri
    const uniqueWorkItemIds = [...new Set(workItemIds)];
    
    if (uniqueWorkItemIds.length > 0 && onWorkItemsCollected) {
      console.log('📋 Yayına Hazır PR Work Item ID\'leri:', uniqueWorkItemIds);
      onWorkItemsCollected(uniqueWorkItemIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prData]);

  if (!selectedProduct || !selectedProductData) {
    return null;
  }

  const totalPRCount = Object.values(prData).reduce((total, group) => {
    return total + Object.values(group.modules).reduce((moduleTotal, module) => {
      return moduleTotal + Object.values(module.apis).reduce((apiTotal, api) => {
        return apiTotal + api.prs.length;
      }, 0);
    }, 0);
  }, 0);

  return (
    <Accordion sx={{ mb: 2 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <PublishIcon color="primary" />
          <Typography variant="h6">Yayınlanmaya Hazır PR'lar</Typography>
          {servicesNeedingUpdate.length > 0 && (
            <Chip
              label={`${servicesNeedingUpdate.length} servis`}
              size="small"
              color="warning"
            />
          )}
          {totalPRCount > 0 && (
            <Chip
              label={`${totalPRCount} PR`}
              size="small"
              color="primary"
            />
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {loadingPRs && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {!loadingPRs && servicesNeedingUpdate.length === 0 && (
          <Alert severity="success" icon={<CheckCircleIcon />}>
            Tüm servisler güncel! Güncelleme bekleyen servis bulunmuyor.
          </Alert>
        )}

        {!loadingPRs && servicesNeedingUpdate.length > 0 && Object.keys(prData).length === 0 && (
          <Alert severity="info">
            PR'lar yükleniyor veya hiç PR bulunamadı...
          </Alert>
        )}

        {!loadingPRs && Object.keys(prData).map((groupKey) => {
          const group = prData[groupKey];
          return (
            <Box key={groupKey} sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, color: '#1976d2' }}>
                📦 {group.name}
              </Typography>
              {Object.keys(group.modules).map((moduleKey) => {
                const module = group.modules[moduleKey];
                return (
                  <Box key={moduleKey} sx={{ ml: 3, mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, color: '#666' }}>
                      📂 {module.name}
                    </Typography>
                    {Object.keys(module.apis).map((apiKey) => {
                      const api = module.apis[apiKey];
                      return (
                        <Box key={apiKey} sx={{ ml: 3, mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Chip label={api.name} size="small" color="primary" />
                            <Chip 
                              label={`${api.publishedVersion} → ${api.prepVersion}`} 
                              size="small" 
                              color="warning"
                              sx={{ fontFamily: 'monospace' }}
                            />
                            <Chip 
                              label={`${api.prs.length} PR`} 
                              size="small" 
                              variant="outlined"
                            />
                          </Box>
                          {api.prs.length > 0 ? (
                            <TableContainer component={Paper} variant="outlined" sx={{ ml: 0 }}>
                              <Table size="small">
                                <TableHead>
                                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                                    <TableCell><strong>PR ID</strong></TableCell>
                                    <TableCell><strong>Başlık</strong></TableCell>
                                    <TableCell><strong>Yazar</strong></TableCell>
                                    <TableCell><strong>Branch</strong></TableCell>
                                    <TableCell><strong>Tarih</strong></TableCell>
                                    <TableCell><strong>Durum</strong></TableCell>
                                    <TableCell><strong>Work Items</strong></TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {api.prs.map((pr, index) => (
                                    <TableRow key={index} hover>
                                      <TableCell>
                                        <Chip
                                          label={pr.id}
                                          size="small"
                                          sx={{ fontFamily: 'monospace', bgcolor: '#e3f2fd' }}
                                          component="a"
                                          href={pr.url}
                                          target="_blank"
                                          clickable
                                        />
                                      </TableCell>
                                      <TableCell>{pr.title}</TableCell>
                                      <TableCell>{pr.author}</TableCell>
                                      <TableCell>
                                        <Chip 
                                          label={pr.branch} 
                                          size="small" 
                                          variant="outlined"
                                          sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}
                                        />
                                      </TableCell>
                                      <TableCell>{pr.date}</TableCell>
                                      <TableCell>
                                        <Chip
                                          label={pr.status}
                                          size="small"
                                          color={pr.status === 'completed' ? 'success' : 'default'}
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                          {pr.workItemIds && pr.workItemIds.length > 0 ? (
                                            pr.workItemIds.map((workItemId) => (
                                              <Chip
                                                key={workItemId}
                                                label={workItemId}
                                                size="small"
                                                color="secondary"
                                                component="a"
                                                href={`https://dev.azure.com/arc-product/ProductAndDelivery/_workitems/edit/${workItemId}`}
                                                target="_blank"
                                                clickable
                                                sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}
                                              />
                                            ))
                                          ) : (
                                            <Typography variant="caption" color="text.secondary">-</Typography>
                                          )}
                                        </Box>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          ) : (
                            <Alert severity="info" sx={{ ml: 0 }}>
                              Bu versiyon aralığında PR bulunamadı.
                            </Alert>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                );
              })}
            </Box>
          );
        })}
      </AccordionDetails>
    </Accordion>
  );
};

export default PullRequestListReadyToPublish;
