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
                                      <TableCell sx={{ fontWeight: 'bold' }}>PR Title</TableCell>
                                      <TableCell sx={{ fontWeight: 'bold' }}>Author</TableCell>
                                      <TableCell sx={{ fontWeight: 'bold' }}>Branch</TableCell>
                                      <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                                      <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                      <TableCell sx={{ fontWeight: 'bold' }}>Work Items</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {api.prs.map((pr, idx) => (
                                      <TableRow key={idx} hover>
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
