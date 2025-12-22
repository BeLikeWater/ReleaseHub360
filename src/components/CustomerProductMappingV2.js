import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Card,
  CardContent,
  Grid,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Collapse,
  List,
  ListItem,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CategoryIcon from '@mui/icons-material/Category';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

const CustomerProductMappingV2 = () => {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentMapping, setCurrentMapping] = useState(null);
  
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedModuleGroups, setSelectedModuleGroups] = useState([]);
  const [selectedModules, setSelectedModules] = useState([]);
  
  const [availableModuleGroups, setAvailableModuleGroups] = useState([]);
  const [availableModules, setAvailableModules] = useState([]);

  // Firestore'dan verileri getir
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Müşterileri çek
      const customersSnapshot = await getDocs(collection(db, 'customers'));
      const customersData = [];
      customersSnapshot.forEach((doc) => {
        customersData.push({ id: doc.id, ...doc.data() });
      });
      setCustomers(customersData);

      // Ürünleri çek
      const productsSnapshot = await getDocs(collection(db, 'products'));
      const productsData = [];
      productsSnapshot.forEach((doc) => {
        productsData.push({ id: doc.id, ...doc.data() });
      });
      setProducts(productsData);

      // Mapping'leri çek
      const mappingsSnapshot = await getDocs(collection(db, 'customerProductMappings'));
      const mappingsData = [];
      mappingsSnapshot.forEach((doc) => {
        mappingsData.push({ id: doc.id, ...doc.data() });
      });
      setMappings(mappingsData);
      
    } catch (error) {
      console.error('Veri yüklenirken hata:', error);
      alert('Veri yüklenirken hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Ürün seçildiğinde modül gruplarını ve direkt modülleri hazırla
  useEffect(() => {
    if (selectedProduct) {
      const product = products.find(p => p.id === selectedProduct);
      if (product) {
        // Modül gruplarını listele (hem grup hem de "Doğrudan Modüller" seçeneği)
        const groups = [];
        
        // Modül grupları
        if (product.childModuleGroups && product.childModuleGroups.length > 0) {
          product.childModuleGroups.forEach(mg => {
            groups.push({
              id: `mg_${mg.moduleGroupId}`,
              type: 'moduleGroup',
              name: mg.name,
              description: mg.description,
              modules: mg.childModules || []
            });
          });
        }
        
        // Doğrudan modüller
        if (product.childModules && product.childModules.length > 0) {
          groups.push({
            id: 'direct_modules',
            type: 'direct',
            name: 'Doğrudan Modüller',
            description: 'Ürüne doğrudan bağlı modüller',
            modules: product.childModules
          });
        }
        
        setAvailableModuleGroups(groups);
      }
    } else {
      setAvailableModuleGroups([]);
      setAvailableModules([]);
      setSelectedModuleGroups([]);
      setSelectedModules([]);
    }
  }, [selectedProduct, products]);

  // Modül grupları seçildiğinde modülleri birleştir
  useEffect(() => {
    if (selectedModuleGroups.length > 0) {
      const allModules = [];
      selectedModuleGroups.forEach(groupId => {
        const group = availableModuleGroups.find(g => g.id === groupId);
        if (group && group.modules) {
          group.modules.forEach(module => {
            allModules.push({
              ...module,
              groupId: groupId,
              groupName: group.name
            });
          });
        }
      });
      setAvailableModules(allModules);
    } else {
      setAvailableModules([]);
      setSelectedModules([]);
    }
  }, [selectedModuleGroups, availableModuleGroups]);

  const handleOpenDialog = (mapping = null) => {
    if (mapping) {
      setEditMode(true);
      setCurrentMapping(mapping);
      setSelectedCustomer(mapping.customerId);
      setSelectedProduct(mapping.productId);
      setSelectedModuleGroups(mapping.moduleGroupIds || []);
      setSelectedModules(mapping.moduleIds || []);
    } else {
      setEditMode(false);
      setCurrentMapping(null);
      setSelectedCustomer('');
      setSelectedProduct('');
      setSelectedModuleGroups([]);
      setSelectedModules([]);
      setAvailableModuleGroups([]);
      setAvailableModules([]);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditMode(false);
    setCurrentMapping(null);
    setSelectedCustomer('');
    setSelectedProduct('');
    setSelectedModuleGroups([]);
    setSelectedModules([]);
    setAvailableModuleGroups([]);
    setAvailableModules([]);
  };

  const handleSave = async () => {
    try {
      if (!selectedCustomer || !selectedProduct || selectedModules.length === 0) {
        alert('Lütfen tüm alanları doldurun ve en az bir modül seçin!');
        return;
      }

      const mappingData = {
        customerId: selectedCustomer,
        productId: selectedProduct,
        moduleGroupIds: selectedModuleGroups,
        moduleIds: selectedModules,
        createdAt: editMode ? currentMapping.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editMode) {
        // Güncelleme
        const mappingRef = doc(db, 'customerProductMappings', currentMapping.id);
        await updateDoc(mappingRef, mappingData);
        
        setMappings(prevMappings => 
          prevMappings.map(m => 
            m.id === currentMapping.id 
              ? { ...m, ...mappingData }
              : m
          )
        );
      } else {
        // Mevcut mapping kontrolü
        const exists = mappings.some(
          m => m.customerId === selectedCustomer && m.productId === selectedProduct
        );
        
        if (exists) {
          alert('Bu müşteri için bu ürün zaten tanımlı! Düzenlemek için mevcut kaydı kullanın.');
          return;
        }

        // Yeni ekleme
        const docRef = await addDoc(collection(db, 'customerProductMappings'), mappingData);
        
        setMappings(prevMappings => [
          ...prevMappings,
          { id: docRef.id, ...mappingData }
        ]);
      }
      
      handleCloseDialog();
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      alert('Kaydetme hatası: ' + error.message);
    }
  };

  const handleDelete = async (mappingId) => {
    if (window.confirm('Bu eşleştirmeyi silmek istediğinizden emin misiniz?')) {
      try {
        await deleteDoc(doc(db, 'customerProductMappings', mappingId));
        
        setMappings(prevMappings => 
          prevMappings.filter(m => m.id !== mappingId)
        );
      } catch (error) {
        console.error('Silme hatası:', error);
        alert('Silme hatası: ' + error.message);
      }
    }
  };

  const handleToggleExpand = (customerId) => {
    setExpandedCustomer(expandedCustomer === customerId ? null : customerId);
  };

  const getCustomerName = (customerId) => {
    return customers.find(c => c.id === customerId)?.name || 'Bilinmeyen';
  };

  const getProductName = (productId) => {
    return products.find(p => p.id === productId)?.name || 'Bilinmeyen';
  };

  const getModuleName = (moduleId) => {
    // Tüm ürünlerdeki tüm modüllerde ara
    for (const product of products) {
      // Modül gruplarında ara
      if (product.childModuleGroups) {
        for (const mg of product.childModuleGroups) {
          const module = mg.childModules?.find(m => m.moduleId === moduleId);
          if (module) return module.name;
        }
      }
      // Doğrudan modüllerde ara
      if (product.childModules) {
        const module = product.childModules.find(m => m.moduleId === moduleId);
        if (module) return module.name;
      }
    }
    return 'Bilinmeyen';
  };

  const getModulesByGroup = (productId, moduleIds) => {
    const product = products.find(p => p.id === productId);
    if (!product) return [];

    const groupedModules = [];

    // Modül grupları varsa
    if (product.childModuleGroups) {
      product.childModuleGroups.forEach(group => {
        const modules = group.childModules?.filter(m => moduleIds.includes(m.moduleId)) || [];
        if (modules.length > 0) {
          groupedModules.push({
            groupId: group.moduleGroupId,
            groupName: group.name,
            modules: modules
          });
        }
      });
    }

    // Doğrudan modüller varsa
    if (product.childModules) {
      const directModules = product.childModules.filter(m => moduleIds.includes(m.moduleId));
      if (directModules.length > 0) {
        groupedModules.push({
          groupId: 'direct',
          groupName: 'Doğrudan Modüller',
          modules: directModules
        });
      }
    }

    return groupedModules;
  };

  const getGroupColor = (index) => {
    const colors = ['#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#d32f2f', '#0288d1'];
    return colors[index % colors.length];
  };

  const getCustomerMappings = (customerId) => {
    return mappings.filter(m => m.customerId === customerId);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
        Müşteri - Ürün İlişkilendirme V2
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Eşleştirmeler</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Yeni Eşleştirme
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Müşterilere ürünler, modül grupları ve modüller atanır. Her müşteri için farklı modül kombinasyonları seçebilirsiniz.
      </Alert>

      {loading ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography>Yükleniyor...</Typography>
        </Paper>
      ) : customers.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            Henüz müşteri kaydı bulunmuyor
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Önce Müşteri Yönetimi V2'den müşteri ekleyin
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#1976d2' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', width: 50 }}></TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Müşteri</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Atanmış Ürünler</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>
                  Toplam Modül Sayısı
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {customers.map((customer) => {
                const customerMappings = getCustomerMappings(customer.id);
                const totalModules = customerMappings.reduce((sum, m) => sum + (m.moduleIds?.length || 0), 0);
                const isExpanded = expandedCustomer === customer.id;

                return (
                  <React.Fragment key={customer.id}>
                    <TableRow hover>
                      <TableCell>
                        <IconButton size="small" onClick={() => handleToggleExpand(customer.id)}>
                          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight="bold">{customer.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {customer.shortName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {customerMappings.map((mapping) => (
                            <Chip
                              key={mapping.id}
                              label={getProductName(mapping.productId)}
                              color="primary"
                              size="small"
                            />
                          ))}
                          {customerMappings.length === 0 && (
                            <Typography variant="body2" color="text.secondary">
                              Henüz ürün atanmamış
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Chip label={totalModules} color="info" />
                      </TableCell>
                    </TableRow>
                    
                    {/* Genişletilmiş Detay */}
                    <TableRow>
                      <TableCell colSpan={4} sx={{ p: 0, borderBottom: isExpanded ? 1 : 0 }}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ p: 3, bgcolor: '#f5f5f5' }}>
                            {customerMappings.length === 0 ? (
                              <Alert severity="warning">Bu müşteriye henüz ürün atanmamış.</Alert>
                            ) : (
                              <Grid container spacing={2}>
                                {customerMappings.map((mapping, mappingIndex) => {
                                  const groupedModules = getModulesByGroup(mapping.productId, mapping.moduleIds || []);
                                  const productColor = getGroupColor(mappingIndex);

                                  return (
                                    <Grid item xs={12} key={mapping.id}>
                                      <Card variant="outlined" sx={{ borderLeft: `4px solid ${productColor}` }}>
                                        <CardContent>
                                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                              <CategoryIcon sx={{ color: productColor }} />
                                              <Typography variant="h6" sx={{ color: productColor, fontWeight: 'bold' }}>
                                                {getProductName(mapping.productId)}
                                              </Typography>
                                            </Box>
                                            <Box>
                                              <IconButton
                                                size="small"
                                                color="primary"
                                                onClick={() => handleOpenDialog(mapping)}
                                                sx={{ mr: 1 }}
                                              >
                                                <EditIcon />
                                              </IconButton>
                                              <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleDelete(mapping.id)}
                                              >
                                                <DeleteIcon />
                                              </IconButton>
                                            </Box>
                                          </Box>
                                          <Divider sx={{ mb: 2 }} />
                                          
                                          {groupedModules.length === 0 ? (
                                            <Alert severity="info">Bu ürün için henüz modül seçilmemiş</Alert>
                                          ) : (
                                            <Grid container spacing={2}>
                                              {groupedModules.map((group, idx) => (
                                                <Grid item xs={12} md={6} key={group.groupId}>
                                                  <Card variant="outlined">
                                                    <CardContent>
                                                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                                                        {group.groupName} ({group.modules.length})
                                                      </Typography>
                                                      <List dense>
                                                        {group.modules.map((module) => (
                                                          <Box key={module.moduleId}>
                                                            <ListItem>
                                                              <ListItemText
                                                                primary={module.name}
                                                                primaryTypographyProps={{ fontFamily: 'monospace', fontWeight: 'bold' }}
                                                                secondary={
                                                                  module.childApis && module.childApis.length > 0
                                                                    ? `${module.childApis.length} API`
                                                                    : null
                                                                }
                                                              />
                                                            </ListItem>
                                                            {module.childApis && module.childApis.length > 0 && (
                                                              <Box sx={{ pl: 4, pb: 1 }}>
                                                                {module.childApis.map((api, apiIdx) => (
                                                                  <Chip
                                                                    key={apiIdx}
                                                                    label={api.name}
                                                                    size="small"
                                                                    variant="outlined"
                                                                    sx={{ 
                                                                      mr: 0.5, 
                                                                      mb: 0.5,
                                                                      fontSize: '0.7rem',
                                                                      height: '20px'
                                                                    }}
                                                                  />
                                                                ))}
                                                              </Box>
                                                            )}
                                                          </Box>
                                                        ))}
                                                      </List>
                                                    </CardContent>
                                                  </Card>
                                                </Grid>
                                              ))}
                                            </Grid>
                                          )}
                                        </CardContent>
                                      </Card>
                                    </Grid>
                                  );
                                })}
                              </Grid>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Eşleştirme Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editMode ? 'Eşleştirme Düzenle' : 'Yeni Eşleştirme Ekle'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            
            {/* Müşteri Seçimi */}
            <FormControl fullWidth required>
              <InputLabel>Müşteri Seçin</InputLabel>
              <Select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                label="Müşteri Seçin"
                disabled={editMode}
              >
                {customers.map((customer) => (
                  <MenuItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Ürün Seçimi (Single Select) */}
            {selectedCustomer && (
              <FormControl fullWidth required>
                <InputLabel>Ürün Seçin</InputLabel>
                <Select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  label="Ürün Seçin"
                  disabled={editMode}
                >
                  {products.map((product) => (
                    <MenuItem key={product.id} value={product.id}>
                      {product.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Modül Grubu Seçimi (Multi Select) */}
            {selectedProduct && availableModuleGroups.length > 0 && (
              <FormControl fullWidth required>
                <InputLabel>Modül Grupları Seçin</InputLabel>
                <Select
                  multiple
                  value={selectedModuleGroups}
                  onChange={(e) => setSelectedModuleGroups(e.target.value)}
                  input={<OutlinedInput label="Modül Grupları Seçin" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => {
                        const group = availableModuleGroups.find(g => g.id === value);
                        return (
                          <Chip key={value} label={group?.name || value} size="small" />
                        );
                      })}
                    </Box>
                  )}
                >
                  {availableModuleGroups.map((group) => (
                    <MenuItem key={group.id} value={group.id}>
                      <Checkbox checked={selectedModuleGroups.indexOf(group.id) > -1} />
                      <ListItemText 
                        primary={group.name} 
                        secondary={`${group.modules?.length || 0} modül`}
                      />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Modül Seçimi (Multi Select) */}
            {availableModules.length > 0 && (
              <FormControl fullWidth required>
                <InputLabel>Modüller Seçin</InputLabel>
                <Select
                  multiple
                  value={selectedModules}
                  onChange={(e) => setSelectedModules(e.target.value)}
                  input={<OutlinedInput label="Modüller Seçin" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => {
                        const module = availableModules.find(m => m.moduleId === value);
                        return (
                          <Chip key={value} label={module?.name || value} size="small" color="primary" />
                        );
                      })}
                    </Box>
                  )}
                >
                  {availableModules.map((module) => (
                    <MenuItem key={module.moduleId} value={module.moduleId}>
                      <Checkbox checked={selectedModules.indexOf(module.moduleId) > -1} />
                      <ListItemText 
                        primary={module.name}
                        secondary={`${module.groupName}`}
                      />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {selectedProduct && availableModuleGroups.length === 0 && (
              <Alert severity="warning">
                Bu ürün için henüz modül grubu veya modül tanımlanmamış
              </Alert>
            )}

          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>İptal</Button>
          <Button 
            onClick={handleSave} 
            variant="contained"
            disabled={!selectedCustomer || !selectedProduct || selectedModules.length === 0}
          >
            {editMode ? 'Güncelle' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerProductMappingV2;
