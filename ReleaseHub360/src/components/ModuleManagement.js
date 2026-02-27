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

const ModuleManagement = () => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedModuleGroup, setSelectedModuleGroup] = useState('');
  const [moduleGroups, setModuleGroups] = useState([]);
  const [modules, setModules] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [isDirectModule, setIsDirectModule] = useState(false);
  const [formData, setFormData] = useState({
    moduleId: '',
    name: '',
    description: '',
    serviceImageName: '',
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
      setSelectedModuleGroup('');
    }
  }, [selectedProduct, products]);

  useEffect(() => {
    if (selectedModuleGroup === 'direct') {
      const product = products.find(p => p.id === selectedProduct);
      setModules(product?.childModules || []);
      setIsDirectModule(true);
    } else if (selectedModuleGroup) {
      const product = products.find(p => p.id === selectedProduct);
      const moduleGroup = product?.childModuleGroups?.find(mg => mg.moduleGroupId.toString() === selectedModuleGroup);
      setModules(moduleGroup?.childModules || []);
      setIsDirectModule(false);
    }
  }, [selectedModuleGroup, selectedProduct, products]);

  const handleOpenDialog = (module = null, index = null) => {
    if (module) {
      setEditingIndex(index);
      setFormData({
        moduleId: module.moduleId,
        name: module.name,
        description: module.description,
        serviceImageName: module.serviceImageName || '',
        currentVersion: module.currentVersion || '',
        currentVersionCreatedAt: module.currentVersionCreatedAt || '',
      });
    } else {
      setEditingIndex(null);
      setFormData({
        moduleId: Date.now(),
        name: '',
        description: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingIndex(null);
    setFormData({
      moduleId: '',
      name: '',
      description: '',
      serviceImageName: '',
      currentVersion: '',
      currentVersionCreatedAt: '',
    });
  };

  const handleSave = async () => {
    try {
      const product = products.find(p => p.id === selectedProduct);
      let updatedModules = null;
      let updatedModuleGroups = null;
      
      if (isDirectModule) {
        updatedModules = [...(product.childModules || [])];
        if (editingIndex !== null) {
          updatedModules[editingIndex] = {
            ...updatedModules[editingIndex],
            ...formData,
          };
        } else {
          updatedModules.push({
            ...formData,
            childApis: [],
          });
        }
        const productRef = doc(db, 'products', selectedProduct);
        await updateDoc(productRef, {
          childModules: updatedModules,
        });
      } else {
        updatedModuleGroups = [...product.childModuleGroups];
        const mgIndex = updatedModuleGroups.findIndex(mg => mg.moduleGroupId.toString() === selectedModuleGroup);
        let tempModules = [...(updatedModuleGroups[mgIndex].childModules || [])];
        
        if (editingIndex !== null) {
          tempModules[editingIndex] = {
            ...tempModules[editingIndex],
            ...formData,
          };
        } else {
          tempModules.push({
            ...formData,
            childApis: [],
          });
        }
        
        updatedModuleGroups[mgIndex].childModules = tempModules;
        const productRef = doc(db, 'products', selectedProduct);
        await updateDoc(productRef, {
          childModuleGroups: updatedModuleGroups,
        });
      }

      handleCloseDialog();
      
      // Local state'i güncelle
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p.id === selectedProduct 
            ? { 
                ...p, 
                childModules: isDirectModule ? updatedModules : p.childModules,
                childModuleGroups: !isDirectModule ? updatedModuleGroups : p.childModuleGroups
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
    if (window.confirm('Bu modülü silmek istediğinizden emin misiniz?')) {
      try {
        const product = products.find(p => p.id === selectedProduct);
        let updatedModules = null;
        let updatedModuleGroups = null;
        
        if (isDirectModule) {
          updatedModules = product.childModules.filter((_, i) => i !== index);
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
          updatedModuleGroups = [...product.childModuleGroups];
          const mgIndex = updatedModuleGroups.findIndex(mg => mg.moduleGroupId.toString() === selectedModuleGroup);
          updatedModuleGroups[mgIndex].childModules = updatedModuleGroups[mgIndex].childModules.filter((_, i) => i !== index);
          
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
        Modül Yönetimi
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl fullWidth>
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
            <FormControl fullWidth>
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
        </Box>
      </Paper>

      {selectedModuleGroup && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">Modüller</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Yeni Modül Ekle
            </Button>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#1976d2' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Ad</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Açıklama</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Service Image</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Mevcut Versiyon</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Oluşturulma</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>API Sayısı</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {modules.map((module, index) => (
                  <TableRow key={index} hover>
                    <TableCell sx={{ fontWeight: 'bold' }}>{module.name}</TableCell>
                    <TableCell>{module.description}</TableCell>
                    <TableCell>
                      {module.serviceImageName && (
                        <Chip label={module.serviceImageName} size="small" color="primary" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>
                      {module.currentVersion && (
                        <Chip label={`v${module.currentVersion}`} size="small" color="success" />
                      )}
                    </TableCell>
                    <TableCell>
                      {module.currentVersionCreatedAt 
                        ? new Date(module.currentVersionCreatedAt).toLocaleDateString('tr-TR')
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <Chip label={module.childApis?.length || 0} size="small" color="secondary" />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleOpenDialog(module, index)}
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
        <DialogTitle>{editingIndex !== null ? 'Modül Düzenle' : 'Yeni Modül Ekle'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              fullWidth
              label="Modül Adı"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              helperText="Örn: Kullanıcı Yönetimi, Raporlama"
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

export default ModuleManagement;
