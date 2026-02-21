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
  Chip,
  Stack,
  Alert,
  Collapse,
  Grid,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Upload as UploadIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

const ProductCatalog = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    serviceImageName: '',
    currentVersion: '',
    currentVersionCreatedAt: '',
    deploymentType: 'docker', // 'docker', 'dll-ftp', 'code-sync'
  });
  const [uploadStatus, setUploadStatus] = useState('');

  // Firestore'dan ürünleri getir
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'products'));
      const productsData = [];
      querySnapshot.forEach((doc) => {
        productsData.push({ id: doc.id, ...doc.data() });
      });
      setProducts(productsData);
    } catch (error) {
      console.error('Ürünler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenDialog = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description,
        serviceImageName: product.serviceImageName || '',
        currentVersion: product.currentVersion || '',
        currentVersionCreatedAt: product.currentVersionCreatedAt || '',
        deploymentType: product.deploymentType || 'docker',
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        serviceImageName: '',
        currentVersion: '',
        currentVersionCreatedAt: '',
        deploymentType: 'docker',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
    });
  };

  const handleSave = async () => {
    try {
      if (editingProduct) {
        // Güncelleme
        const productRef = doc(db, 'products', editingProduct.id);
        await updateDoc(productRef, formData);
        
        // Local state'i güncelle
        setProducts(prevProducts => 
          prevProducts.map(p => 
            p.id === editingProduct.id 
              ? { ...p, ...formData }
              : p
          )
        );
      } else {
        // Yeni ekleme
        const newProduct = {
          ...formData,
          productId: Date.now(),
          childModuleGroups: [],
          childModules: [],
        };
        const docRef = await addDoc(collection(db, 'products'), newProduct);
        
        // Local state'i güncelle
        setProducts(prevProducts => [
          ...prevProducts,
          { id: docRef.id, ...newProduct }
        ]);
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      alert('Kaydetme hatası: ' + error.message);
    }
  };

  const handleDelete = async (productId) => {
    if (window.confirm('Bu ürünü silmek istediğinizden emin misiniz?')) {
      try {
        await deleteDoc(doc(db, 'products', productId));
        
        // Local state'i güncelle
        setProducts(prevProducts => 
          prevProducts.filter(p => p.id !== productId)
        );
      } catch (error) {
        console.error('Silme hatası:', error);
        alert('Silme hatası: ' + error.message);
      }
    }
  };

  const handleToggleExpand = (productId) => {
    setExpandedProduct(expandedProduct === productId ? null : productId);
  };

  const getGroupColor = (index) => {
    const colors = ['#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#d32f2f', '#0288d1'];
    return colors[index % colors.length];
  };

  const getTotalModules = (product) => {
    const groupModules = product.childModuleGroups?.reduce((sum, mg) => sum + (mg.childModules?.length || 0), 0) || 0;
    const directModules = product.childModules?.length || 0;
    return groupModules + directModules;
  };

  const getTotalAPIs = (product) => {
    let total = 0;
    if (product.childModuleGroups) {
      product.childModuleGroups.forEach(mg => {
        mg.childModules?.forEach(m => {
          total += m.childApis?.length || 0;
        });
      });
    }
    if (product.childModules) {
      product.childModules.forEach(m => {
        total += m.childApis?.length || 0;
      });
    }
    return total;
  };

  // JSON dosyasından toplu yükleme
  const handleBulkUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setUploadStatus('Yükleniyor...');
      const text = await file.text();
      const jsonData = JSON.parse(text);
      
      if (!jsonData.value || !Array.isArray(jsonData.value)) {
        throw new Error('Geçersiz JSON formatı');
      }

      const batch = writeBatch(db);
      const productsRef = collection(db, 'products');

      // Önce mevcut tüm verileri temizle
      const existingDocs = await getDocs(productsRef);
      existingDocs.forEach((document) => {
        batch.delete(document.ref);
      });

      // Yeni verileri ekle
      jsonData.value.forEach((product) => {
        const newDocRef = doc(productsRef);
        batch.set(newDocRef, {
          productId: product.productId,
          name: product.name,
          description: product.description,
          childModuleGroups: product.childModuleGroups || [],
          childModules: product.childModules || [],
        });
      });

      await batch.commit();
      setUploadStatus('Başarıyla yüklendi!');
      fetchProducts();
      
      setTimeout(() => {
        setOpenUploadDialog(false);
        setUploadStatus('');
      }, 2000);
    } catch (error) {
      console.error('Yükleme hatası:', error);
      setUploadStatus('Hata: ' + error.message);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
        Ürün Kataloğu
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Ürünler</Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => setOpenUploadDialog(true)}
          >
            JSON Yükle
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Yeni Ürün Ekle
          </Button>
        </Stack>
      </Box>

      {loading ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography>Yükleniyor...</Typography>
        </Paper>
      ) : products.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            Henüz ürün kaydı bulunmuyor
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Yeni ürün eklemek için "Yeni Ürün Ekle" butonunu kullanın
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#1976d2' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', width: 50 }}></TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Ürün</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Dağıtım Yöntemi</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Versiyon</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>Modül Grupları</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>Toplam Modül</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>Toplam API</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>İşlemler</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((product) => {
                const isExpanded = expandedProduct === product.id;
                const totalModules = getTotalModules(product);
                const totalAPIs = getTotalAPIs(product);

                return (
                  <React.Fragment key={product.id}>
                    <TableRow hover>
                      <TableCell>
                        <IconButton size="small" onClick={() => handleToggleExpand(product.id)}>
                          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight="bold">{product.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {product.description}
                        </Typography>
                        {product.serviceImageName && (
                          <Box sx={{ mt: 0.5 }}>
                            <Chip 
                              label={product.serviceImageName} 
                              size="small" 
                              sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}
                            />
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        {product.deploymentType === 'docker' && (
                          <Chip 
                            label="Docker Image"
                            size="small" 
                            color="primary"
                            variant="outlined"
                          />
                        )}
                        {product.deploymentType === 'dll-ftp' && (
                          <Chip 
                            label="DLL/FTP"
                            size="small" 
                            color="warning"
                            variant="outlined"
                          />
                        )}
                        {product.deploymentType === 'code-sync' && (
                          <Chip 
                            label="Code Sync"
                            size="small" 
                            color="info"
                            variant="outlined"
                          />
                        )}
                        {!product.deploymentType && (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {product.currentVersion ? (
                          <Chip 
                            label={`v${product.currentVersion}`}
                            size="small" 
                            color="success"
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Chip 
                          label={product.childModuleGroups?.length || 0} 
                          size="small"
                          color="info"
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Chip 
                          label={totalModules} 
                          size="small"
                          color="primary"
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Chip 
                          label={totalAPIs} 
                          size="small"
                          color="secondary"
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <IconButton size="small" color="primary" onClick={() => handleOpenDialog(product)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(product.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                    
                    {/* Genişletilmiş Detay */}
                    <TableRow>
                      <TableCell colSpan={7} sx={{ p: 0, borderBottom: isExpanded ? 1 : 0 }}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ p: 3, bgcolor: '#f5f5f5' }}>
                            <Grid container spacing={2}>
                              {/* Modül Grupları */}
                              {product.childModuleGroups && product.childModuleGroups.length > 0 && (
                                product.childModuleGroups.map((moduleGroup, idx) => {
                                  const groupColor = getGroupColor(idx);
                                  return (
                                    <Grid item xs={12} md={6} key={idx}>
                                      <Card variant="outlined" sx={{ borderLeft: `4px solid ${groupColor}` }}>
                                        <CardContent>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                            <CategoryIcon sx={{ color: groupColor }} />
                                            <Typography variant="h6" sx={{ color: groupColor, fontWeight: 'bold' }}>
                                              {moduleGroup.name}
                                            </Typography>
                                          </Box>
                                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                            {moduleGroup.description}
                                          </Typography>
                                          <Divider sx={{ mb: 2 }} />
                                          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                                            Modüller ({moduleGroup.childModules?.length || 0})
                                          </Typography>
                                          {moduleGroup.childModules && moduleGroup.childModules.length > 0 ? (
                                            <List dense>
                                              {moduleGroup.childModules.map((module, mIdx) => (
                                                <Box key={mIdx}>
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
                                          ) : (
                                            <Alert severity="info" sx={{ mt: 1 }}>Bu grupta henüz modül yok</Alert>
                                          )}
                                        </CardContent>
                                      </Card>
                                    </Grid>
                                  );
                                })
                              )}

                              {/* Doğrudan Modüller */}
                              {product.childModules && product.childModules.length > 0 && (
                                <Grid item xs={12} md={6}>
                                  <Card variant="outlined" sx={{ borderLeft: `4px solid #607d8b` }}>
                                    <CardContent>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <CategoryIcon sx={{ color: '#607d8b' }} />
                                        <Typography variant="h6" sx={{ color: '#607d8b', fontWeight: 'bold' }}>
                                          Doğrudan Modüller
                                        </Typography>
                                      </Box>
                                      <Divider sx={{ mb: 2 }} />
                                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                                        Modüller ({product.childModules.length})
                                      </Typography>
                                      <List dense>
                                        {product.childModules.map((module, mIdx) => (
                                          <Box key={mIdx}>
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
                              )}

                              {!product.childModuleGroups?.length && !product.childModules?.length && (
                                <Grid item xs={12}>
                                  <Alert severity="warning">Bu ürün için henüz modül grubu veya modül tanımlanmamış</Alert>
                                </Grid>
                              )}
                            </Grid>
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

      {/* Ürün Ekleme/Düzenleme Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingProduct ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              fullWidth
              label="Ürün Adı"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              helperText="Örn: OBA Suite, AppWys"
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
            
            <FormControl fullWidth>
              <InputLabel>Derleme ve Yayınlama Yöntemi</InputLabel>
              <Select
                value={formData.deploymentType}
                label="Derleme ve Yayınlama Yöntemi"
                onChange={(e) => setFormData({ ...formData, deploymentType: e.target.value })}
              >
                <MenuItem value="docker">
                  <Box>
                    <Typography variant="body1">Docker Image - Container Registry</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Docker image oluşturulup registry'ye push'lanarak yayınlanır
                    </Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="dll-ftp">
                  <Box>
                    <Typography variant="body1">DLL/Binary - FTP Deployment</Typography>
                    <Typography variant="caption" color="text.secondary">
                      DLL/Binary dosyalar derlenir ve FTP üzerinden sunuculara yüklenir
                    </Typography>
                  </Box>
                </MenuItem>
                <MenuItem value="code-sync">
                  <Box>
                    <Typography variant="body1">Code Synchronization - Sold Codebase</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Kodu satılmış müşterilere Git üzerinden kod senkronizasyonu ile güncellenir
                    </Typography>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
            
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
            {editingProduct ? 'Güncelle' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* JSON Yükleme Dialog */}
      <Dialog open={openUploadDialog} onClose={() => setOpenUploadDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>JSON Dosyası Yükle</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Bu işlem mevcut tüm verileri silip yerine JSON dosyasındaki verileri yükleyecektir.
          </Alert>
          <Button
            variant="contained"
            component="label"
            fullWidth
          >
            JSON Dosyası Seç
            <input
              type="file"
              hidden
              accept=".json"
              onChange={handleBulkUpload}
            />
          </Button>
          {uploadStatus && (
            <Alert severity={uploadStatus.includes('Hata') ? 'error' : 'success'} sx={{ mt: 2 }}>
              {uploadStatus}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUploadDialog(false)}>Kapat</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductCatalog;
