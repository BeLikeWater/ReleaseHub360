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
  Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import WorkItemsSection from './WorkItemsSection';

const PullRequestsList = ({ selectedProduct, selectedProductData, onWorkItemsCollected }) => {
  const [prData, setPrData] = useState({});
  const [loadingPRs, setLoadingPRs] = useState(false);
  const [expandedServices, setExpandedServices] = useState({});
  const [expandedModuleGroups, setExpandedModuleGroups] = useState({});
  const [expandedModules, setExpandedModules] = useState({});
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
                  workItemIds: pr.work_item_ids || [],
                  // Mock pipeline & deployment data - gerçekte API'den gelecek
                  prStatus: Math.random() > 0.7 ? 'Completed' : Math.random() > 0.4 ? 'Active' : 'Abandoned',
                  pipeline: {
                    status: Math.random() > 0.6 ? 'Succeeded' : Math.random() > 0.3 ? 'In Progress' : 'Failed',
                    buildNumber: `${Math.floor(Math.random() * 1000) + 100}`,
                  },
                  // Ortamlar: Test ve Prep
                  environments: [
                    {
                      name: 'Test',
                      status: Math.random() > 0.5 ? 'Onaylanmış' : Math.random() > 0.3 ? 'Onay Bekliyor' : 'Pasif',
                      releaseNumber: `R-${Math.floor(Math.random() * 100) + 1}`
                    },
                    {
                      name: 'Prep',
                      status: Math.random() > 0.7 ? 'Onaylanmış' : Math.random() > 0.4 ? 'Onay Bekliyor' : 'Pasif',
                      releaseNumber: `R-${Math.floor(Math.random() * 100) + 1}`
                    }
                  ]
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

  const toggleModuleGroup = (groupKey) => {
    setExpandedModuleGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const toggleModule = (moduleKey) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleKey]: !prev[moduleKey]
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

  const getPRStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'; // green gradient
      case 'Active':
        return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'; // pink-red gradient
      case 'Abandoned':
        return 'linear-gradient(135deg, #a8a8a8 0%, #7f7f7f 100%)'; // gray gradient
      default:
        return 'linear-gradient(135deg, #a8a8a8 0%, #7f7f7f 100%)';
    }
  };

  const getPipelineStatusColor = (status) => {
    switch (status) {
      case 'Succeeded':
        return 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'; // green gradient
      case 'In Progress':
        return 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'; // blue gradient
      case 'Failed':
        return 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'; // red-yellow gradient
      default:
        return 'linear-gradient(135deg, #a8a8a8 0%, #7f7f7f 100%)';
    }
  };

  const getEnvironmentStatusColor = (status) => {
    switch (status) {
      case 'Onaylanmış':
        return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'; // purple gradient
      case 'Onay Bekliyor':
        return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'; // pink gradient
      case 'Pasif':
        return 'linear-gradient(135deg, #a8a8a8 0%, #7f7f7f 100%)'; // gray gradient
      default:
        return 'linear-gradient(135deg, #a8a8a8 0%, #7f7f7f 100%)';
    }
  };

  // Pipeline Stage Box Component - Ultra Minimal Versiyon
  const CompactStatusBox = ({ status, statusColor, tooltipText, showArrow = false }) => {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%' }}>
        <Tooltip 
          title={tooltipText || ''} 
          arrow 
          placement="top"
          componentsProps={{
            tooltip: {
              sx: {
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                fontSize: '0.75rem',
                py: 1.2,
                px: 1.8,
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.25)'
              }
            },
            arrow: {
              sx: {
                color: '#667eea'
              }
            }
          }}
        >
          <Box
            sx={{
              flex: 1,
              minHeight: '40px',
              background: statusColor,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              py: 0.75,
              px: 1,
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)',
                backgroundSize: '200% 200%',
                transition: 'all 0.5s ease'
              },
              '&:hover': {
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                transform: 'translateY(-2px) scale(1.03)',
                '&::before': {
                  backgroundPosition: '100% 100%'
                }
              }
            }}
          >
            {/* Status Only */}
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: '600', 
                fontSize: '0.8rem',
                textAlign: 'center',
                lineHeight: 1.1,
                textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                letterSpacing: '0.3px',
                position: 'relative',
                zIndex: 1
              }}
            >
              {status}
            </Typography>
          </Box>
        </Tooltip>
        
        {showArrow && (
          <Box
            sx={{
              fontSize: '1.2rem',
              color: '#b0b0b0',
              fontWeight: 'bold',
              lineHeight: 1,
              opacity: 0.6,
              transition: 'all 0.3s',
              '&:hover': {
                opacity: 1,
                transform: 'translateX(3px)'
              }
            }}
          >
            ➤
          </Box>
        )}
      </Box>
    );
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
            {Object.entries(prData).map(([groupKey, group]) => {
              const isGroupExpanded = expandedModuleGroups[groupKey];
              const totalPRsInGroup = Object.values(group.modules).reduce((sum, module) => {
                return sum + Object.values(module.apis).reduce((apiSum, api) => apiSum + api.prs.length, 0);
              }, 0);

              return (
                <Box key={groupKey} sx={{ mb: 2 }}>
                  <Paper 
                    onClick={() => toggleModuleGroup(groupKey)}
                    sx={{ 
                      p: 1.5, 
                      mb: 1,
                      cursor: 'pointer',
                      bgcolor: '#e3f2fd',
                      borderLeft: '4px solid #1976d2',
                      '&:hover': { bgcolor: '#bbdefb' },
                      transition: 'all 0.2s'
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ExpandMoreIcon 
                          sx={{ 
                            transform: isGroupExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                            transition: 'transform 0.2s'
                          }} 
                        />
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                          📦 {group.name}
                        </Typography>
                      </Box>
                      <Chip 
                        label={`${totalPRsInGroup} PR`} 
                        size="small" 
                        color={totalPRsInGroup > 0 ? 'primary' : 'default'}
                      />
                    </Box>
                  </Paper>

                  {isGroupExpanded && (
                    <Box sx={{ ml: 3 }}>
                      {Object.entries(group.modules).map(([moduleKey, module]) => {
                        const isModuleExpanded = expandedModules[moduleKey];
                        const totalPRsInModule = Object.values(module.apis).reduce((sum, api) => sum + api.prs.length, 0);

                        return (
                          <Box key={moduleKey} sx={{ mb: 1.5 }}>
                            <Paper 
                              onClick={() => toggleModule(moduleKey)}
                              sx={{ 
                                p: 1.25, 
                                mb: 1,
                                cursor: 'pointer',
                                bgcolor: '#f5f5f5',
                                borderLeft: '3px solid #757575',
                                '&:hover': { bgcolor: '#eeeeee' },
                                transition: 'all 0.2s'
                              }}
                            >
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <ExpandMoreIcon 
                                    sx={{ 
                                      transform: isModuleExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                                      transition: 'transform 0.2s'
                                    }} 
                                  />
                                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                    📂 {module.name}
                                  </Typography>
                                </Box>
                                <Chip 
                                  label={`${totalPRsInModule} PR`} 
                                  size="small" 
                                  color={totalPRsInModule > 0 ? 'info' : 'default'}
                                />
                              </Box>
                            </Paper>

                            {isModuleExpanded && (
                              <Box sx={{ ml: 3 }}>
                                {Object.entries(module.apis).map(([apiKey, api]) => {
                                  const isExpanded = expandedServices[apiKey];
                                  
                                  return (
                                    <Box key={apiKey} sx={{ mb: 1.5 }}>
                                      <Paper
                                        onClick={() => toggleService(apiKey)}
                                        sx={{
                                          p: 1.5,
                                          cursor: 'pointer',
                                          bgcolor: '#fafafa',
                                          '&:hover': { bgcolor: '#f0f0f0' },
                                          borderLeft: '2px solid #9e9e9e',
                                          transition: 'all 0.2s'
                                        }}
                                      >
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                              <ExpandMoreIcon 
                                                sx={{ 
                                                  transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                                                  transition: 'transform 0.2s',
                                                  fontSize: '1rem'
                                                }} 
                                              />
                                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                                🔌 {api.name}
                                              </Typography>
                                            </Box>
                                            {api.repoName && (
                                              <Chip 
                                                label={api.repoName} 
                                                size="small" 
                                                sx={{ mt: 0.5, ml: 3, fontFamily: 'monospace', fontSize: '0.7rem' }} 
                                              />
                                            )}
                                          </Box>
                                          <Chip 
                                            label={`${api.prs.length} PR`} 
                                            size="small" 
                                            color={api.prs.length > 0 ? 'success' : 'default'}
                                          />
                                        </Box>
                                      </Paper>
                                      
                                      {isExpanded && api.prs.length > 0 && (
                                        <Box sx={{ mt: 1, ml: 2 }}>
                                          <TableContainer component={Paper} variant="outlined">
                                            <Table size="small">
                                              <TableHead>
                                                <TableRow 
                                                  sx={{ 
                                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                    '& .MuiTableCell-root': {
                                                      color: 'white',
                                                      borderBottom: 'none'
                                                    }
                                                  }}
                                                >
                                                  <TableCell sx={{ fontWeight: '600', width: '25%', fontSize: '0.85rem' }}>PR Title</TableCell>
                                                  <TableCell sx={{ fontWeight: '600', width: '10%', fontSize: '0.85rem' }}>Author</TableCell>
                                                  <TableCell sx={{ fontWeight: '600', width: '8%', fontSize: '0.85rem' }}>Date</TableCell>
                                                  <TableCell sx={{ fontWeight: '600', width: '10%', fontSize: '0.85rem' }}>Work Items</TableCell>
                                                  <TableCell sx={{ fontWeight: '600', width: '12%', textAlign: 'center', fontSize: '0.85rem' }}>PR Status</TableCell>
                                                  <TableCell sx={{ fontWeight: '600', width: '12%', textAlign: 'center', fontSize: '0.85rem' }}>Pipeline Status</TableCell>
                                                  <TableCell sx={{ fontWeight: '600', width: '12%', textAlign: 'center', fontSize: '0.85rem' }}>Test Status</TableCell>
                                                  <TableCell sx={{ fontWeight: '600', width: '11%', textAlign: 'center', fontSize: '0.85rem' }}>Prep Status</TableCell>
                                                </TableRow>
                                              </TableHead>
                                              <TableBody>
                                                {api.prs.map((pr, idx) => (
                                                  <TableRow 
                                                    key={idx} 
                                                    sx={{
                                                      '&:hover': {
                                                        bgcolor: '#f8f9ff',
                                                        transition: 'all 0.2s ease'
                                                      },
                                                      '&:nth-of-type(even)': {
                                                        bgcolor: '#fafbff'
                                                      }
                                                    }}
                                                  >
                                                    <TableCell>
                                                      <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                                                        {pr.title || '-'}
                                                      </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                      <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                                        {pr.author || '-'}
                                                      </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                      <Typography variant="caption">
                                                        {pr.date || '-'}
                                                      </Typography>
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
                                                              sx={{ fontSize: '0.65rem', height: '20px' }}
                                                            />
                                                          ))}
                                                        </Box>
                                                      ) : (
                                                        <Typography variant="caption">-</Typography>
                                                      )}
                                                    </TableCell>
                                                    
                                                    {/* PR Status Column */}
                                                    <TableCell sx={{ p: 0.75 }}>
                                                      <CompactStatusBox 
                                                        status={pr.prStatus || 'Active'}
                                                        statusColor={getPRStatusColor(pr.prStatus)}
                                                        tooltipText={`Branch: ${pr.branch || 'master'} | Status: ${pr.prStatus || 'Active'}`}
                                                        showArrow={true}
                                                      />
                                                    </TableCell>
                                                    
                                                    {/* Pipeline Status Column */}
                                                    <TableCell sx={{ p: 0.75 }}>
                                                      {pr.pipeline && (
                                                        <CompactStatusBox 
                                                          status={pr.pipeline.status}
                                                          statusColor={getPipelineStatusColor(pr.pipeline.status)}
                                                          tooltipText={`Build: ${pr.pipeline.buildNumber} | Status: ${pr.pipeline.status}`}
                                                          showArrow={true}
                                                        />
                                                      )}
                                                    </TableCell>
                                                    
                                                    {/* Test Status Column */}
                                                    <TableCell sx={{ p: 0.75 }}>
                                                      {pr.environments && pr.environments[0] && (
                                                        <CompactStatusBox 
                                                          status={pr.environments[0].status}
                                                          statusColor={getEnvironmentStatusColor(pr.environments[0].status)}
                                                          tooltipText={`${pr.environments[0].name} Environment | Release: ${pr.environments[0].releaseNumber} | Status: ${pr.environments[0].status}`}
                                                          showArrow={true}
                                                        />
                                                      )}
                                                    </TableCell>
                                                    
                                                    {/* Prep Status Column - Son kolon, ok yok */}
                                                    <TableCell sx={{ p: 0.75 }}>
                                                      {pr.environments && pr.environments[1] && (
                                                        <CompactStatusBox 
                                                          status={pr.environments[1].status}
                                                          statusColor={getEnvironmentStatusColor(pr.environments[1].status)}
                                                          tooltipText={`${pr.environments[1].name} Environment | Release: ${pr.environments[1].releaseNumber} | Status: ${pr.environments[1].status}`}
                                                          showArrow={false}
                                                        />
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
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </Box>
              );
            })}
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
