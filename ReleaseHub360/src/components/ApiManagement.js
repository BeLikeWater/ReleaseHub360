import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const ApiManagement = () => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedModuleGroup, setSelectedModuleGroup] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [moduleGroups, setModuleGroups] = useState([]);
  const [modules, setModules] = useState([]);
  const [apis, setApis] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [formData, setFormData] = useState({
    apiId: '',
    name: '',
    description: '',
    repoName: '',
    pipelineName: '',
    serviceImageName: '',
    releaseName: '',
    currentVersion: '',
    currentVersionCreatedAt: '',
  });

  const fetchProducts = async () => {
    const querySnapshot = await getDocs(collection(db, 'products'));
    const productsData = [];
    querySnapshot.forEach((doc) => {
      productsData.push({ id: doc.id, ...doc.data() });
    });
    setProducts(productsData);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      const product = products.find(p => p.id === selectedProduct);
      setModuleGroups(product?.childModuleGroups || []);
    }
  }, [selectedProduct, products]);

  // selectedProduct değiştiğinde filtre sıfırla
  useEffect(() => {
    setSelectedModuleGroup('');
    setSelectedModule('');
  }, [selectedProduct]);

  useEffect(() => {
    if (selectedModuleGroup === 'direct') {
      const product = products.find(p => p.id === selectedProduct);
      setModules(product?.childModules || []);
    } else if (selectedModuleGroup) {
      const product = products.find(p => p.id === selectedProduct);
      const moduleGroup = product?.childModuleGroups?.find(mg => mg.moduleGroupId.toString() === selectedModuleGroup);
      setModules(moduleGroup?.childModules || []);
    }
  }, [selectedModuleGroup, selectedProduct, products]);

  // selectedModuleGroup değiştiğinde module sıfırla
  useEffect(() => {
    setSelectedModule('');
  }, [selectedModuleGroup]);

  useEffect(() => {
    if (selectedModule) {
      if (selectedModuleGroup === 'direct') {
        const product = products.find(p => p.id === selectedProduct);
        const module = product?.childModules?.find(m => m.moduleId.toString() === selectedModule);
        setApis(module?.childApis || []);
      } else {
        const product = products.find(p => p.id === selectedProduct);
        const moduleGroup = product?.childModuleGroups?.find(mg => mg.moduleGroupId.toString() === selectedModuleGroup);
        const module = moduleGroup?.childModules?.find(m => m.moduleId.toString() === selectedModule);
        setApis(module?.childApis || []);
      }
    }
  }, [selectedModule, selectedModuleGroup, selectedProduct, products]);

  const handleOpenDialog = (api = null, index = null) => {
    if (api) {
      setEditingIndex(index);
      setFormData({
        apiId: api.apiId,
        name: api.name,
        description: api.description,
        repoName: api.repoName || '',
        pipelineName: api.pipelineName || '',
        serviceImageName: api.serviceImageName || '',
        releaseName: api.releaseName || '',
        currentVersion: api.currentVersion || '',
        currentVersionCreatedAt: api.currentVersionCreatedAt || '',
      });
    } else {
      setEditingIndex(null);
      setFormData({
        apiId: Date.now(),
        name: '',
        description: '',
        repoName: '',
        pipelineName: '',
        serviceImageName: '',
        releaseName: '',
        currentVersion: '',
        currentVersionCreatedAt: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingIndex(null);
    setFormData({
      apiId: '',
      name: '',
      description: '',
      repoName: '',
      pipelineName: '',
      serviceImageName: '',
      releaseName: '',
      currentVersion: '',
      currentVersionCreatedAt: '',
    });
  };

  const handleSave = async () => {
    try {
      const product = products.find(p => p.id === selectedProduct);
      let updatedModules = null;
      let updatedModuleGroups = null;
      
      if (selectedModuleGroup === 'direct') {
        // Deep copy for direct modules
        updatedModules = JSON.parse(JSON.stringify(product.childModules || []));
        const moduleIndex = updatedModules.findIndex(m => m.moduleId.toString() === selectedModule);
        
        if (moduleIndex === -1) {
          console.error('Modül bulunamadı');
          return;
        }
        
        if (!updatedModules[moduleIndex].childApis) {
          updatedModules[moduleIndex].childApis = [];
        }
        
        if (editingIndex !== null) {
          updatedModules[moduleIndex].childApis[editingIndex] = {
            ...updatedModules[moduleIndex].childApis[editingIndex],
            apiId: typeof formData.apiId === 'number' ? formData.apiId : parseInt(formData.apiId),
            name: formData.name,
            description: formData.description,
            repoName: formData.repoName,
            pipelineName: formData.pipelineName,
            serviceImageName: formData.serviceImageName,
            releaseName: formData.releaseName,
            currentVersion: formData.currentVersion,
            currentVersionCreatedAt: formData.currentVersionCreatedAt,
          };
        } else {
          updatedModules[moduleIndex].childApis.push({
            apiId: typeof formData.apiId === 'number' ? formData.apiId : parseInt(formData.apiId),
            moduleId: parseInt(selectedModule),
            name: formData.name,
            description: formData.description,
            repoName: formData.repoName,
            pipelineName: formData.pipelineName,
            serviceImageName: formData.serviceImageName,
            releaseName: formData.releaseName,
            currentVersion: formData.currentVersion,
            currentVersionCreatedAt: formData.currentVersionCreatedAt,
            childApiEndpoints: [],
          });
        }
        
        const productRef = doc(db, 'products', selectedProduct);
        await updateDoc(productRef, {
          childModules: updatedModules,
        });
      } else {
        // Deep copy for module groups
        updatedModuleGroups = JSON.parse(JSON.stringify(product.childModuleGroups || []));
        const mgIndex = updatedModuleGroups.findIndex(mg => mg.moduleGroupId.toString() === selectedModuleGroup);
        
        if (mgIndex === -1) {
          console.error('Modül grubu bulunamadı');
          return;
        }
        
        const moduleIndex = updatedModuleGroups[mgIndex].childModules.findIndex(m => m.moduleId.toString() === selectedModule);
        
        if (moduleIndex === -1) {
          console.error('Modül bulunamadı');
          return;
        }
        
        if (!updatedModuleGroups[mgIndex].childModules[moduleIndex].childApis) {
          updatedModuleGroups[mgIndex].childModules[moduleIndex].childApis = [];
        }
        
        if (editingIndex !== null) {
          updatedModuleGroups[mgIndex].childModules[moduleIndex].childApis[editingIndex] = {
            ...updatedModuleGroups[mgIndex].childModules[moduleIndex].childApis[editingIndex],
            apiId: typeof formData.apiId === 'number' ? formData.apiId : parseInt(formData.apiId),
            name: formData.name,
            description: formData.description,
            repoName: formData.repoName,
            pipelineName: formData.pipelineName,
            serviceImageName: formData.serviceImageName,
            releaseName: formData.releaseName,
            currentVersion: formData.currentVersion,
            currentVersionCreatedAt: formData.currentVersionCreatedAt,
          };
        } else {
          updatedModuleGroups[mgIndex].childModules[moduleIndex].childApis.push({
            apiId: typeof formData.apiId === 'number' ? formData.apiId : parseInt(formData.apiId),
            moduleId: parseInt(selectedModule),
            name: formData.name,
            description: formData.description,
            repoName: formData.repoName,
            pipelineName: formData.pipelineName,
            serviceImageName: formData.serviceImageName,
            releaseName: formData.releaseName,
            currentVersion: formData.currentVersion,
            currentVersionCreatedAt: formData.currentVersionCreatedAt,
            childApiEndpoints: [],
          });
        }
        
        const productRef = doc(db, 'products', selectedProduct);
        await updateDoc(productRef, {
          childModuleGroups: updatedModuleGroups,
        });
      }

      handleCloseDialog();
      
      // Local state'i güncelle, fetchProducts kullanma
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p.id === selectedProduct 
            ? { 
                ...p, 
                childModules: selectedModuleGroup === 'direct' ? updatedModules : p.childModules,
                childModuleGroups: selectedModuleGroup !== 'direct' ? updatedModuleGroups : p.childModuleGroups
              }
            : p
        )
      );
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      alert('Kaydetme hatası: ' + error.message);
    }
  };

  const handleDelete = async (index) => {
    if (window.confirm('Bu API\'yi silmek istediğinizden emin misiniz?')) {
      try {
        const product = products.find(p => p.id === selectedProduct);
        
        if (selectedModuleGroup === 'direct') {
          // Deep copy
          const updatedModules = JSON.parse(JSON.stringify(product.childModules || []));
          const moduleIndex = updatedModules.findIndex(m => m.moduleId.toString() === selectedModule);
          updatedModules[moduleIndex].childApis = updatedModules[moduleIndex].childApis.filter((_, i) => i !== index);
          
          const productRef = doc(db, 'products', selectedProduct);
          await updateDoc(productRef, {
            childModules: updatedModules,
          });
          
          // Local state'i güncelle
          setProducts(prevProducts => 
            prevProducts.map(p => 
              p.id === selectedProduct 
                ? { ...p, childModules: updatedModules }
                : p
            )
          );
        } else {
          // Deep copy
          const updatedModuleGroups = JSON.parse(JSON.stringify(product.childModuleGroups || []));
          const mgIndex = updatedModuleGroups.findIndex(mg => mg.moduleGroupId.toString() === selectedModuleGroup);
          const moduleIndex = updatedModuleGroups[mgIndex].childModules.findIndex(m => m.moduleId.toString() === selectedModule);
          updatedModuleGroups[mgIndex].childModules[moduleIndex].childApis = 
            updatedModuleGroups[mgIndex].childModules[moduleIndex].childApis.filter((_, i) => i !== index);
          
          const productRef = doc(db, 'products', selectedProduct);
          await updateDoc(productRef, {
            childModuleGroups: updatedModuleGroups,
          });
          
          // Local state'i güncelle
          setProducts(prevProducts => 
            prevProducts.map(p => 
              p.id === selectedProduct 
                ? { ...p, childModuleGroups: updatedModuleGroups }
                : p
            )
          );
        }
      } catch (error) {
        console.error('Silme hatası:', error);
        alert('Silme hatası: ' + error.message);
      }
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
        API Yönetimi
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControl sx={{ flex: 1, minWidth: 200 }}>
            <InputLabel>Ürün Seçin</InputLabel>
            <Select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              label="Ürün Seçin"
            >
              {products.map((product) => (
                <MenuItem key={product.id} value={product.id}>
                  {product.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedProduct && (
            <FormControl sx={{ flex: 1, minWidth: 200 }}>
              <InputLabel>Modül Grubu Seçin</InputLabel>
              <Select
                value={selectedModuleGroup}
                onChange={(e) => setSelectedModuleGroup(e.target.value)}
                label="Modül Grubu Seçin"
              >
                <MenuItem value="direct">
                  <em>Doğrudan Modüller</em>
                </MenuItem>
                {moduleGroups.map((mg) => (
                  <MenuItem key={mg.moduleGroupId} value={mg.moduleGroupId.toString()}>
                    {mg.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {selectedModuleGroup && (
            <FormControl sx={{ flex: 1, minWidth: 200 }}>
              <InputLabel>Modül Seçin</InputLabel>
              <Select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                label="Modül Seçin"
              >
                {modules.map((module) => (
                  <MenuItem key={module.moduleId} value={module.moduleId.toString()}>
                    {module.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
      </Paper>

      {selectedModule && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">API'ler</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Yeni API Ekle
            </Button>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#1976d2' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Ad</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Açıklama</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Repo Name</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Pipeline Name</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Release Name</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Service Image</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Mevcut Versiyon</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Oluşturulma</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Endpoint Sayısı</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {apis.map((api, index) => (
                  <TableRow key={index} hover>
                    <TableCell sx={{ fontWeight: 'bold' }}>{api.name}</TableCell>
                    <TableCell>{api.description}</TableCell>
                    <TableCell>
                      {api.repoName && (
                        <Chip label={api.repoName} size="small" sx={{ fontFamily: 'monospace' }} />
                      )}
                    </TableCell>
                    <TableCell>
                      {api.pipelineName && (
                        <Chip label={api.pipelineName} size="small" color="info" sx={{ fontFamily: 'monospace' }} />
                      )}
                    </TableCell>
                    <TableCell>
                      {api.releaseName && (
                        <Chip label={api.releaseName} size="small" color="secondary" sx={{ fontFamily: 'monospace' }} />
                      )}
                    </TableCell>
                    <TableCell>
                      {api.serviceImageName && (
                        <Chip label={api.serviceImageName} size="small" color="primary" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>
                      {api.currentVersion && (
                        <Chip label={`v${api.currentVersion}`} size="small" color="success" />
                      )}
                    </TableCell>
                    <TableCell>
                      {api.currentVersionCreatedAt 
                        ? new Date(api.currentVersionCreatedAt).toLocaleDateString('tr-TR')
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <Chip label={api.childApiEndpoints?.length || 0} size="small" color="warning" />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleOpenDialog(api, index)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(index)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingIndex !== null ? 'API Düzenle' : 'Yeni API Ekle'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              fullWidth
              label="API Adı"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              helperText="Örn: User API, Payment API"
            />
            <TextField
              fullWidth
              label="Açıklama"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              multiline
              rows={3}
            />
            <TextField
              fullWidth
              label="Repo Adı"
              value={formData.repoName}
              onChange={(e) => setFormData({ ...formData, repoName: e.target.value })}
              helperText="Örn: Cofins.CustomerPortal, Cofins.ServiceApi"
            />
            <TextField
              fullWidth
              label="Pipeline Adı"
              value={formData.pipelineName}
              onChange={(e) => setFormData({ ...formData, pipelineName: e.target.value })}
              helperText="Örn: Cofins.CustomerPortal-CI, Cofins.ServiceApi-Build"
            />
            <TextField
              fullWidth
              label="Release Name"
              value={formData.releaseName}
              onChange={(e) => setFormData({ ...formData, releaseName: e.target.value })}
              helperText="Release definition adı (Örn: Cofins.CustomerPortal-Release)"
            />
            <TextField
              fullWidth
              label="Service Image Adı"
              value={formData.serviceImageName}
              onChange={(e) => setFormData({ ...formData, serviceImageName: e.target.value })}
              helperText="Docker image adı"
            />
            <TextField
              fullWidth
              label="Mevcut Versiyon"
              value={formData.currentVersion}
              onChange={(e) => setFormData({ ...formData, currentVersion: e.target.value })}
              helperText="Örn: 1.0.0"
            />
            <TextField
              fullWidth
              label="Mevcut Versiyon Oluşturulma"
              type="datetime-local"
              value={formData.currentVersionCreatedAt}
              onChange={(e) => setFormData({ ...formData, currentVersionCreatedAt: e.target.value })}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>İptal</Button>
          <Button 
            onClick={handleSave} 
            variant="contained"
            disabled={!formData.name || !formData.description}
          >
            {editingIndex !== null ? 'Güncelle' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApiManagement;
