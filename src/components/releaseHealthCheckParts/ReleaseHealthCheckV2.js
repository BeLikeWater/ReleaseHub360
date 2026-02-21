import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
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
  LinearProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  Button,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Tabs,
  Tab,
  Checkbox,
  FormControlLabel,
  DialogActions,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckIcon from '@mui/icons-material/Check';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import PublishIcon from '@mui/icons-material/Publish';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CloudIcon from '@mui/icons-material/Cloud';
import { collection, getDocs, addDoc, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import PullRequestsList from './PullRequestsList';
import PullRequestListReadyToPublish from './PullRequestListReadyToPublish';
import PipelineStatusSection from './PipelineStatusSection';
import PodStatusSection from './PodStatusSection';
import PRDetailedAnalyze from './PRDetailedAnalyze';
import ReleaseNotesSection from './ReleaseNotesSection';
import WorkItemsSection from './WorkItemsSection';
import SystemChangesSection from './SystemChangesSection';
import ReleaseTodosSection from './ReleaseTodosSection';
import ServicesNeedingUpdateSection from './ServicesNeedingUpdateSection';

const ReleaseHealthCheckV2 = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [releaseDate, setReleaseDate] = useState('2025-12-01');
  const [newVersion, setNewVersion] = useState('');
  const [expandedServices, setExpandedServices] = useState({});
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedModelType, setSelectedModelType] = useState('request');
  const [selectedTodo, setSelectedTodo] = useState(null);
  const [todoDialogOpen, setTodoDialogOpen] = useState(false);
  const [collectedWorkItemIds, setCollectedWorkItemIds] = useState([]);
  const [prepPodStatus, setPrepPodStatus] = useState([]);
  const [currentTab, setCurrentTab] = useState(0);
  const [readyToPublishWorkItemIds, setReadyToPublishWorkItemIds] = useState([]);
  const [hotfixDialogOpen, setHotfixDialogOpen] = useState(false);
  const [selectedHotfixServices, setSelectedHotfixServices] = useState([]);
  const [availableServicesForHotfix, setAvailableServicesForHotfix] = useState([]);

  // Firebase'den ürünleri getir
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const querySnapshot = await getDocs(collection(db, 'products'));
        const productsData = [];
        querySnapshot.forEach((doc) => {
          productsData.push({ id: doc.id, ...doc.data() });
        });
        setProducts(productsData);

        // Prep ortamı pod status bilgilerini çek
        try {
          const podResponse = await fetch('http://localhost:5678/webhook/GetPodStatusPrep');
          const podData = await podResponse.json();
          console.log('📦 Prep Pod Status:', podData);
          setPrepPodStatus(podData);
        } catch (error) {
          console.error('Pod status alınırken hata:', error);
        }
      } catch (error) {
        console.error('Ürünler yüklenirken hata:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const selectedProductData = products.find(p => p.id === selectedProduct);

  const handleWorkItemsCollected = useCallback((workItemIds) => {
    console.log('📋 Parent: Work Item ID\'leri alındı:', workItemIds);
    setCollectedWorkItemIds(workItemIds);
  }, []);

  const handleReadyToPublishWorkItemsCollected = useCallback((workItemIds) => {
    console.log('📋 Parent: Yayına Hazır PR Work Item ID\'leri alındı:', workItemIds);
    setReadyToPublishWorkItemIds(workItemIds);
  }, []);

  const toggleService = (serviceId) => {
    setExpandedServices(prev => ({
      ...prev,
      [serviceId]: !prev[serviceId]
    }));
  };

  const handlePublish = async () => {
    if (!newVersion) {
      alert('Lütfen yeni versiyon numarası girin!');
      return;
    }

    if (!selectedProduct || !selectedProductData) {
      alert('Lütfen bir ürün seçin!');
      return;
    }

    try {
      console.log('🚀 Yeni versiyon yayınlanıyor...');
      console.log('Product ID:', selectedProduct);
      console.log('Product Name:', selectedProductData.name);
      console.log('New Version:', newVersion);
      console.log('Previous Version:', selectedProductData.currentVersion);

      // Güncelleme bekleyen servisleri topla (releases bilgisi için)
      const releases = [];
      
      selectedProductData?.childModuleGroups?.forEach((moduleGroup) => {
        moduleGroup.childModules?.forEach((module) => {
          module.childApis?.forEach((api) => {
            // Pod status'u bul
            const matchingPod = prepPodStatus.find(pod => {
              if (!api.serviceImageName || !pod.imageName) return false;
              const imageNameParts = pod.imageName.split('/');
              const serviceWithTag = imageNameParts[imageNameParts.length - 1];
              const serviceName = serviceWithTag.split(':')[0];
              return serviceName === api.serviceImageName;
            });

            // Eğer pod bulundu VE versiyonlar farklıysa
            if (matchingPod && matchingPod.currentVersion !== api.currentVersion) {
              releases.push({
                releaseName: api.name, // API adı (release ismi)
                version: matchingPod.currentVersion // Prep ortamındaki versiyon
              });
            }
          });
        });
      });

      console.log('📦 Güncelleme bekleyen servisler (releases):', releases);

      // Önce bu version'a sahip bir kayıt var mı kontrol et
      const productVersionsRef = collection(db, 'productVersions');
      const versionQuery = query(
        productVersionsRef, 
        where('productId', '==', selectedProduct),
        where('version', '==', newVersion)
      );
      
      const existingVersions = await getDocs(versionQuery);
      
      if (!existingVersions.empty) {
        // Kayıt var - güncelle
        console.log('📝 Mevcut versiyon kaydı bulundu, güncelleniyor...');
        const existingDoc = existingVersions.docs[0];
        const docRef = doc(db, 'productVersions', existingDoc.id);
        
        await updateDoc(docRef, {
          status: 'Published',
          releases: releases,
          prep: 'Approved',
          prod: 'PendingApproval',
          updatedAt: new Date().toISOString(),
          updatedBy: 'System'
        });
        
        console.log('✅ Versiyon kaydı güncellendi');
        alert(`✅ Başarılı!\n\nVersiyon ${newVersion} güncellendi ve Published olarak işaretlendi.\n\nGüncelleme bekleyen servis sayısı: ${releases.length}`);
      } else {
        // Kayıt yok - yeni kayıt oluştur
        console.log('📝 Yeni versiyon kaydı oluşturuluyor...');
        await addDoc(productVersionsRef, {
          productId: selectedProduct,
          productName: selectedProductData.name,
          version: newVersion,
          previousVersion: selectedProductData.currentVersion || '',
          releases: releases,
          prep: 'Approved',
          prod: 'PendingApproval',
          createdAt: new Date().toISOString(),
          createdBy: 'System',
          status: 'Published'
        });

        console.log('✅ Yeni versiyon kaydı oluşturuldu');
        alert(`✅ Başarılı!\n\nYeni versiyon ${newVersion} yayınlandı.\nÖnceki versiyon: ${selectedProductData.currentVersion || 'Yok'}\n\nGüncelleme bekleyen servis sayısı: ${releases.length}`);
      }

      // Input'ı temizle
      setNewVersion('');

    } catch (error) {
      console.error('❌ Versiyon yayınlama hatası:', error);
      alert('❌ Hata: ' + error.message);
    }
  };

  const handleHotfixClick = () => {
    if (!newVersion) {
      alert('Lütfen yeni versiyon numarası girin!');
      return;
    }

    if (!selectedProduct || !selectedProductData) {
      alert('Lütfen bir ürün seçin!');
      return;
    }

    // Güncelleme bekleyen servisleri topla
    const services = [];
    
    selectedProductData?.childModuleGroups?.forEach((moduleGroup) => {
      moduleGroup.childModules?.forEach((module) => {
        module.childApis?.forEach((api) => {
          // Pod status'u bul
          const matchingPod = prepPodStatus.find(pod => {
            if (!api.serviceImageName || !pod.imageName) return false;
            const imageNameParts = pod.imageName.split('/');
            const serviceWithTag = imageNameParts[imageNameParts.length - 1];
            const serviceName = serviceWithTag.split(':')[0];
            return serviceName === api.serviceImageName;
          });

          // Eğer pod bulundu VE versiyonlar farklıysa
          if (matchingPod && matchingPod.currentVersion !== api.currentVersion) {
            services.push({
              releaseName: api.name,
              version: matchingPod.currentVersion,
              id: `${api.serviceImageName}-${matchingPod.currentVersion}`
            });
          }
        });
      });
    });

    if (services.length === 0) {
      alert('Güncelleme bekleyen servis bulunamadı!');
      return;
    }

    setAvailableServicesForHotfix(services);
    setSelectedHotfixServices([]);
    setHotfixDialogOpen(true);
  };

  const handleHotfixPublish = async () => {
    if (selectedHotfixServices.length === 0) {
      alert('Lütfen en az bir servis seçin!');
      return;
    }

    try {
      console.log('🔥 Hotfix yayınlanıyor...');
      
      // Seçilen servisleri releases formatına çevir
      const releases = selectedHotfixServices.map(serviceId => {
        const service = availableServicesForHotfix.find(s => s.id === serviceId);
        return {
          releaseName: service.releaseName,
          version: service.version
        };
      });

      // Önce bu version'a sahip bir kayıt var mı kontrol et
      const productVersionsRef = collection(db, 'productVersions');
      const versionQuery = query(
        productVersionsRef, 
        where('productId', '==', selectedProduct),
        where('version', '==', newVersion)
      );
      
      const existingVersions = await getDocs(versionQuery);
      
      if (!existingVersions.empty) {
        // Kayıt var - güncelle
        console.log('📝 Mevcut versiyon kaydı bulundu, hotfix olarak güncelleniyor...');
        const existingDoc = existingVersions.docs[0];
        const docRef = doc(db, 'productVersions', existingDoc.id);
        
        // Mevcut releases'leri al ve yenileri ekle
        const currentReleases = existingDoc.data().releases || [];
        const updatedReleases = [...currentReleases, ...releases];
        
        await updateDoc(docRef, {
          status: 'Published',
          releases: updatedReleases,
          isHotfix: true,
          prep: 'Approved',
          prod: 'PendingApproval',
          updatedAt: new Date().toISOString(),
          updatedBy: 'System'
        });
        
        console.log('✅ Hotfix kaydı güncellendi');
        alert(`✅ Başarılı!\n\nHotfix ${newVersion} güncellendi.\n\nEklenen servis sayısı: ${releases.length}`);
      } else {
        // Kayıt yok - yeni hotfix kaydı oluştur
        console.log('📝 Yeni hotfix kaydı oluşturuluyor...');
        await addDoc(productVersionsRef, {
          productId: selectedProduct,
          productName: selectedProductData.name,
          version: newVersion,
          previousVersion: selectedProductData.currentVersion || '',
          releases: releases,
          isHotfix: true,
          prep: 'Approved',
          prod: 'PendingApproval',
          createdAt: new Date().toISOString(),
          createdBy: 'System',
          status: 'Published'
        });

        console.log('✅ Yeni hotfix kaydı oluşturuldu');
        alert(`✅ Başarılı!\n\nHotfix ${newVersion} yayınlandı.\n\nServis sayısı: ${releases.length}`);
      }

      // Dialog'u kapat ve input'ı temizle
      setHotfixDialogOpen(false);
      setNewVersion('');
      setSelectedHotfixServices([]);

    } catch (error) {
      console.error('❌ Hotfix yayınlama hatası:', error);
      alert('❌ Hata: ' + error.message);
    }
  };

  const handleHotfixServiceToggle = (serviceId) => {
    setSelectedHotfixServices(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId);
      } else {
        return [...prev, serviceId];
      }
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
      case 'merged':
      case 'completed':
      case 'Done':
        return 'success';
      case 'failed':
        return 'error';
      case 'running':
      case 'In Progress':
        return 'warning';
      case 'open':
        return 'info';
      default:
        return 'default';
    }
  };

  const getChangeTypeColor = (changeType) => {
    switch (changeType) {
      case 'added':
        return 'success';
      case 'modified':
        return 'warning';
      case 'deleted':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Kritik': return 'error';
      case 'Yüksek': return 'warning';
      case 'Orta': return 'info';
      case 'Düşük': return 'default';
      default: return 'default';
    }
  };

  const getTimingColor = (timing) => {
    switch (timing) {
      case 'Geçiş Öncesi': return '#2196F3';
      case 'Geçiş Anında': return '#FF9800';
      case 'Geçiş Sonrası': return '#4CAF50';
      default: return '#999';
    }
  };

  const getTeamColor = (team) => {
    switch (team) {
      case 'Delivery': return '#9C27B0';
      case 'DevOps': return '#00BCD4';
      case 'Database': return '#FF5722';
      default: return '#607D8B';
    }
  };

  const getPodStatusColor = (status) => {
    switch (status) {
      case 'Success': return 'success';
      case 'Failed': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Release Health Check v2-4
      </Typography>

      {loading ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography>Yükleniyor...</Typography>
        </Paper>
      ) : (
        <>
          {/* Üst Bilgiler - Ürün Seçimi, Versiyon ve Tarih */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Ürün Seç</InputLabel>
                  <Select
                    value={selectedProduct}
                    label="Ürün Seç"
                    onChange={(e) => setSelectedProduct(e.target.value)}
                  >
                    {products.map((product) => (
                      <MenuItem key={product.id} value={product.id}>
                        {product.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <Card
                  sx={{
                    height: '100%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CardContent sx={{ textAlign: 'center', py: 1 }}>
                    <Typography variant="caption" sx={{ opacity: 0.9, display: 'block' }}>
                      Mevcut Versiyon
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                      {selectedProductData?.currentVersion ? `v${selectedProductData.currentVersion}` : '-'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={2}>
                <Card
                  sx={{
                    height: '100%',
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CardContent sx={{ textAlign: 'center', py: 1 }}>
                    <Typography variant="caption" sx={{ opacity: 0.9, display: 'block' }}>
                      Versiyon Oluşturulma Tarihi
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                      {selectedProductData?.currentVersionCreatedAt
                        ? new Date(selectedProductData.currentVersionCreatedAt).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        })
                        : '-'
                      }
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={1}>
                <Divider orientation="vertical" sx={{ height: '100%', mx: 2 }} />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                  label="Yeni Versiyon"
                  value={newVersion}
                  onChange={(e) => setNewVersion(e.target.value)}
                  placeholder="örn: 1.2.0"
                  InputProps={{
                    startAdornment: <NewReleasesIcon sx={{ mr: 1, color: 'primary.main' }} />,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  variant="contained"
                  color="success"
                  size="large"
                  startIcon={<PublishIcon />}
                  onClick={handlePublish}
                  disabled={!newVersion || !selectedProduct}
                  sx={{ height: '56px' }}
                >
                  Yayınla
                </Button>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  variant="contained"
                  color="error"
                  size="large"
                  startIcon={<WarningIcon />}
                  onClick={handleHotfixClick}
                  disabled={!newVersion || !selectedProduct}
                  sx={{ height: '56px' }}
                >
                  Hotfix Yayınla
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {!selectedProduct && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Lütfen bir ürün grubu seçin.
            </Alert>
          )}

          {selectedProduct && (
            <>
              {/* Tab Navigation */}
              <Paper sx={{ mb: 3 }}>
                <Tabs
                  value={currentTab}
                  onChange={(e, newValue) => setCurrentTab(newValue)}
                  variant="fullWidth"
                  sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                  <Tab
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PublishIcon />
                        <Typography>Yayına Hazır Paket</Typography>
                      </Box>
                    }
                  />
                  <Tab
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <InfoIcon />
                        <Typography>Devam Eden Geliştirmeler</Typography>
                      </Box>
                    }
                  />
                </Tabs>
              </Paper>

              {/* Tab 0: Yayına Hazır Paket (Prep → Prod) */}
              <Box sx={{ display: currentTab === 0 ? 'block' : 'none' }}>
                <ServicesNeedingUpdateSection 
                  selectedProductData={selectedProductData}
                  prepPodStatus={prepPodStatus}
                />

                {/* Yayınlanmaya Hazır PR'lar */}
                <PullRequestListReadyToPublish
                  selectedProduct={selectedProduct}
                  selectedProductData={selectedProductData}
                  prepPodStatus={prepPodStatus}
                  onWorkItemsCollected={handleReadyToPublishWorkItemsCollected}
                />

                {/* Work Items - Yayına Hazır Paket */}
                <WorkItemsSection
                  selectedProduct={selectedProduct}
                  selectedProductData={selectedProductData}
                  workItemIds={readyToPublishWorkItemIds}
                />

                {/* Release Notes - Yayına Hazır Paket */}
                <ReleaseNotesSection workItemIds={readyToPublishWorkItemIds} />

                {/* Sistem Değişiklikleri - Yayına Hazır Paket */}
                <SystemChangesSection />

                {/* Release ToDo'lar - Yayına Hazır Paket */}
                <ReleaseTodosSection />
              </Box>

              {/* Tab 1: Devam Eden Geliştirmeler */}
              <Box sx={{ display: currentTab === 1 ? 'block' : 'none' }}>
                {/* Aşama 1: Son tarihten bugüne atılan PR'lar */}
                <PullRequestsList
                  selectedProduct={selectedProduct}
                  selectedProductData={selectedProductData}
                  onWorkItemsCollected={handleWorkItemsCollected}
                />

                {/* Aşama 2: Her bir servis için son tetiklenen pipeline'lar */}
                <PipelineStatusSection
                  selectedProduct={selectedProduct}
                  selectedProductData={selectedProductData}
                />

                {/* Pod Durumları */}
                <PodStatusSection
                  selectedProduct={selectedProduct}
                  selectedProductData={selectedProductData}
                />

                {/* PR Detailed Analyze Section */}
                <Box sx={{ mt: 2 }}>
                  <PRDetailedAnalyze />
                </Box>
              </Box>
            </>
          )}

          {/* ToDo/Pod Detay Dialog */}
          <Dialog
            open={todoDialogOpen}
            onClose={() => setTodoDialogOpen(false)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">
                  {selectedTodo?.logs ? 'Pod Hata Detayları' : 'ToDo Detayları'}
                </Typography>
                <IconButton onClick={() => setTodoDialogOpen(false)}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              {selectedTodo && (
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    {selectedTodo.description}
                  </Typography>

                  {/* Todo details */}
                  {selectedTodo.timing && (
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Chip
                        label={selectedTodo.timing}
                        size="small"
                        sx={{
                          backgroundColor: getTimingColor(selectedTodo.timing),
                          color: 'white'
                        }}
                      />
                      <Chip
                        label={selectedTodo.responsibleTeam}
                        size="small"
                        sx={{
                          backgroundColor: getTeamColor(selectedTodo.responsibleTeam),
                          color: 'white'
                        }}
                      />
                      <Chip
                        label={selectedTodo.priority}
                        color={getPriorityColor(selectedTodo.priority)}
                        size="small"
                      />
                    </Box>
                  )}

                  {/* Pod error details */}
                  {selectedTodo.logs && (
                    <Box>
                      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        <Chip
                          label={`Versiyon: ${selectedTodo.version}`}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={selectedTodo.podStatus}
                          size="small"
                          color="error"
                        />
                        <Chip
                          label={`Replicas: ${selectedTodo.replicas}`}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={`Restart: ${selectedTodo.restartCount}`}
                          size="small"
                          color={selectedTodo.restartCount > 3 ? 'error' : 'warning'}
                        />
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        Hata Logları:
                      </Typography>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 2,
                          bgcolor: '#f5f5f5',
                          fontFamily: 'monospace',
                          fontSize: '0.875rem',
                          whiteSpace: 'pre-wrap',
                          maxHeight: '400px',
                          overflow: 'auto'
                        }}
                      >
                        {selectedTodo.logs}
                      </Paper>
                    </Box>
                  )}

                  {/* Todo task list */}
                  {selectedTodo.details && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        Yapılması Gereken Güncellemeler:
                      </Typography>
                      <List>
                        {selectedTodo.details.map((detail, index) => (
                          <ListItem key={index} sx={{ py: 0.5 }}>
                            <ListItemText
                              primary={detail}
                              primaryTypographyProps={{ variant: 'body2' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </>
                  )}
                </Box>
              )}
            </DialogContent>
          </Dialog>

          {/* Hotfix Servis Seçim Dialog */}
          <Dialog
            open={hotfixDialogOpen}
            onClose={() => setHotfixDialogOpen(false)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              Hotfix için Servis Seçin
              <Typography variant="caption" display="block" color="text.secondary">
                Güncelleme bekleyen servislerden hotfix'e dahil edilecekleri seçin
              </Typography>
            </DialogTitle>
            <DialogContent>
              <List>
                {availableServicesForHotfix.map((service) => (
                  <ListItem key={service.id} dense>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedHotfixServices.includes(service.id)}
                          onChange={() => handleHotfixServiceToggle(service.id)}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {service.releaseName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Versiyon: {service.version}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
              {availableServicesForHotfix.length === 0 && (
                <Alert severity="info">
                  Güncelleme bekleyen servis bulunamadı.
                </Alert>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setHotfixDialogOpen(false)}>
                İptal
              </Button>
              <Button
                onClick={handleHotfixPublish}
                variant="contained"
                color="error"
                disabled={selectedHotfixServices.length === 0}
                startIcon={<PublishIcon />}
              >
                Hotfix Yayınla ({selectedHotfixServices.length} servis)
              </Button>
            </DialogActions>
          </Dialog>

        </>
      )}
    </Box>
  );
};

export default ReleaseHealthCheckV2;
