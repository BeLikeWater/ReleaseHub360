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

const ModuleGroupManagement = () => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [moduleGroups, setModuleGroups] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [formData, setFormData] = useState({
    moduleGroupId: '',
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
    }
  }, [selectedProduct, products]);

  const handleOpenDialog = (moduleGroup = null, index = null) => {
    if (moduleGroup) {
      setEditingIndex(index);
      setFormData({
        moduleGroupId: moduleGroup.moduleGroupId,
        name: moduleGroup.name,
        description: moduleGroup.description,
        serviceImageName: moduleGroup.serviceImageName || '',
        currentVersion: moduleGroup.currentVersion || '',
        currentVersionCreatedAt: moduleGroup.currentVersionCreatedAt || '',
      });
    } else {
      setEditingIndex(null);
      setFormData({
        moduleGroupId: Date.now(),
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
      moduleGroupId: '',
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
      let updatedModuleGroups = [...(product.childModuleGroups || [])];

      if (editingIndex !== null) {
        updatedModuleGroups[editingIndex] = {
          ...updatedModuleGroups[editingIndex],
          ...formData,
        };
      } else {
        updatedModuleGroups.push({
          ...formData,
          childModules: [],
        });
      }

      const productRef = doc(db, 'products', selectedProduct);
      await updateDoc(productRef, {
        childModuleGroups: updatedModuleGroups,
      });

      handleCloseDialog();
      
      // Local state'i güncelle
      setProducts(prevProducts => 
        prevProducts.map(p => 
          p.id === selectedProduct 
            ? { ...p, childModuleGroups: updatedModuleGroups }
            : p
        )
      );
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      alert('Kaydetme hatası: ' + error.message);
    }
  };

  const handleDelete = async (index) => {
    if (window.confirm('Bu modül grubunu silmek istediğinizden emin misiniz?')) {
      try {
        const product = products.find(p => p.id === selectedProduct);
        const updatedModuleGroups = product.childModuleGroups.filter((_, i) => i !== index);

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
      } catch (error) {
        console.error('Silme hatası:', error);
        alert('Silme hatası: ' + error.message);
      }
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
        Modül Grubu Yönetimi
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
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
      </Paper>

      {selectedProduct && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">Modül Grupları</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Yeni Modül Grubu Ekle
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
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Modül Sayısı</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {moduleGroups.map((moduleGroup, index) => (
                  <TableRow key={index} hover>
                    <TableCell sx={{ fontWeight: 'bold' }}>{moduleGroup.name}</TableCell>
                    <TableCell>{moduleGroup.description}</TableCell>
                    <TableCell>
                      {moduleGroup.serviceImageName && (
                        <Chip label={moduleGroup.serviceImageName} size="small" color="primary" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>
                      {moduleGroup.currentVersion && (
                        <Chip label={`v${moduleGroup.currentVersion}`} size="small" color="success" />
                      )}
                    </TableCell>
                    <TableCell>
                      {moduleGroup.currentVersionCreatedAt 
                        ? new Date(moduleGroup.currentVersionCreatedAt).toLocaleDateString('tr-TR')
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <Chip label={moduleGroup.childModules?.length || 0} size="small" color="info" />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleOpenDialog(moduleGroup, index)}
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
        <DialogTitle>{editingIndex !== null ? 'Modül Grubu Düzenle' : 'Yeni Modül Grubu Ekle'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              fullWidth
              label="Modül Grubu Adı"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              helperText="Örn: Core Modülleri, İş Süreçleri"
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
              label="Versiyon Oluşturulma Zamanı"
              type="datetime-local"
              value={formData.currentVersionCreatedAt}
              onChange={(e) => setFormData({ ...formData, currentVersionCreatedAt: e.target.value })}
              InputLabelProps={{ shrink: true }}
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

export default ModuleGroupManagement;
