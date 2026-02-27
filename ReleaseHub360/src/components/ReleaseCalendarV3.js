import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CalendarMonth as CalendarIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  PlayArrow as PlayArrowIcon,
  Science as ScienceIcon
} from '@mui/icons-material';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';

const ReleaseCalendarV3 = () => {
  const navigate = useNavigate();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRelease, setEditingRelease] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    version: '',
    status: 'InProgress',
    masterStartDate: '',
    testDate: '',
    preProdDate: '',
    releaseDate: '',
    isDeprecated: false
  });

  // Ürünleri yükle
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        const productsData = [];
        querySnapshot.forEach((doc) => {
          productsData.push({ id: doc.id, ...doc.data() });
        });
        setProducts(productsData);
      } catch (error) {
        console.error('❌ Ürünler yüklenirken hata:', error);
      }
    };
    fetchProducts();
  }, []);

  // Seçili ürünün versiyonlarını yükle
  useEffect(() => {
    const fetchVersions = async () => {
      if (!selectedProduct) {
        setReleases([]);
        return;
      }

      console.log('📖 Versiyonlar yükleniyor... Product ID:', selectedProduct);
      setLoading(true);
      
      try {
        const versionsRef = collection(db, 'productVersions');
        const q = query(versionsRef, where('productId', '==', selectedProduct));
        const querySnapshot = await getDocs(q);
        
        const versionsData = [];
        querySnapshot.forEach((doc) => {
          versionsData.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`✅ ${versionsData.length} versiyon yüklendi`);
        setReleases(versionsData);
      } catch (error) {
        console.error('❌ Versiyonlar yüklenirken hata:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchVersions();
  }, [selectedProduct]);

  // Mock Data - artık kullanılmıyor
  /*
    {
      id: 1,
      version: 'v1.25.0',
      status: 'InProgress',
      masterStartDate: '2025-10-20',
      testDate: '2025-11-01',
      branchLockDate: '2025-11-05',
      preProdDate: '2025-11-08',
      releaseDate: '2025-11-12',
      order: 5,
      isDeprecated: false
    },
    {
      id: 2,
      version: 'v1.24.0',
      status: 'Testing',
      masterStartDate: '2025-09-20',
      testDate: '2025-10-05',
      branchLockDate: '2025-10-10',
      preProdDate: '2025-10-15',
      releaseDate: '2025-10-20',
      order: 4,
      isDeprecated: false
    },
    {
      id: 3,
      version: 'v1.23.0',
      status: 'Published',
      masterStartDate: '2025-08-20',
      testDate: '2025-09-05',
      branchLockDate: '2025-09-10',
      preProdDate: '2025-09-15',
      releaseDate: '2025-09-20',
      order: 3,
      isDeprecated: false
    },
    {
      id: 4,
      version: 'v1.22.0',
      status: 'Published',
      masterStartDate: '2025-07-15',
      testDate: '2025-08-01',
      branchLockDate: '2025-08-05',
      preProdDate: '2025-08-10',
      releaseDate: '2025-08-15',
      order: 2,
      isDeprecated: false
    },
    {
      id: 5,
      version: 'v1.21.0',
      status: 'Published',
      masterStartDate: '2025-06-10',
      testDate: '2025-06-25',
      branchLockDate: '2025-06-30',
      preProdDate: '2025-07-05',
      releaseDate: '2025-07-10',
      order: 1,
      isDeprecated: true
    }
  ]);
*/
  // Status için renk ve label
  const getStatusInfo = (status) => {
    switch (status) {
      case 'InProgress':
        return { color: 'primary', label: 'Geliştiriliyor', icon: <PlayArrowIcon fontSize="small" /> };
      case 'Testing':
        return { color: 'warning', label: 'Test Ediliyor', icon: <ScienceIcon fontSize="small" /> };
      case 'Published':
        return { color: 'success', label: 'Yayınlandı', icon: <CheckCircleIcon fontSize="small" /> };
      default:
        return { color: 'default', label: status, icon: null };
    }
  };

  // Tarih formatlama
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Version'ı numeric değere çevir (v1.2.3 -> 10203)
  const versionToNumber = (version) => {
    if (!version) return 0;
    const versionStr = version.replace(/^v/, '');
    const parts = versionStr.split('.').map(num => parseInt(num, 10) || 0);
    return parts[0] * 10000 + (parts[1] || 0) * 100 + (parts[2] || 0);
  };

  // Dialog açma/kapama
  const handleOpenDialog = (release = null) => {
    if (release) {
      setEditingRelease(release);
      setFormData({
        version: release.version,
        status: release.status,
        masterStartDate: release.masterStartDate,
        testDate: release.testDate,
        preProdDate: release.preProdDate,
        releaseDate: release.releaseDate,
        isDeprecated: release.isDeprecated
      });
    } else {
      setEditingRelease(null);
      setFormData({
        version: '',
        status: 'InProgress',
        masterStartDate: '',
        testDate: '',
        preProdDate: '',
        releaseDate: '',
        isDeprecated: false
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingRelease(null);
  };

  // Form değişikliği
  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Kaydetme
  const handleSave = async () => {
    if (!selectedProduct) {
      alert('Lütfen bir ürün seçin!');
      return;
    }

    try {
      const selectedProductData = products.find(p => p.id === selectedProduct);
      
      if (editingRelease) {
        // Güncelleme
        const docRef = doc(db, 'productVersions', editingRelease.id);
        await updateDoc(docRef, {
          ...formData,
          updatedAt: new Date().toISOString()
        });
        console.log('✅ Versiyon güncellendi');
      } else {
        // Yeni ekleme
        await addDoc(collection(db, 'productVersions'), {
          ...formData,
          productId: selectedProduct,
          productName: selectedProductData?.name || '',
          createdAt: new Date().toISOString(),
          status: formData.status || 'InProgress'
        });
        console.log('✅ Yeni versiyon eklendi');
      }
      
      handleCloseDialog();
      
      // Listeyi yeniden yükle
      const versionsRef = collection(db, 'productVersions');
      const q = query(versionsRef, where('productId', '==', selectedProduct));
      const querySnapshot = await getDocs(q);
      const versionsData = [];
      querySnapshot.forEach((doc) => {
        versionsData.push({ id: doc.id, ...doc.data() });
      });
      setReleases(versionsData);
      
    } catch (error) {
      console.error('❌ Kaydetme hatası:', error);
      alert('❌ Hata: ' + error.message);
    }
  };

  // Silme
  const handleDelete = async (id) => {
    if (window.confirm('Bu versiyonu silmek istediğinizden emin misiniz?')) {
      try {
        await deleteDoc(doc(db, 'productVersions', id));
        setReleases(prev => prev.filter(r => r.id !== id));
        console.log('✅ Versiyon silindi');
      } catch (error) {
        console.error('❌ Silme hatası:', error);
        alert('❌ Hata: ' + error.message);
      }
    }
  };

  // Versiyona göre sıralama (büyükten küçüğe)
  const sortedReleases = [...releases].sort((a, b) => versionToNumber(b.version) - versionToNumber(a.version));

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/')}
              variant="outlined"
              size="small"
            >
              Geri
            </Button>
            <Box>
              <Typography variant="h4" fontWeight="bold" color="primary.main" gutterBottom>
                Release Takvimi V3
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Planlanan ve yayınlanan versiyonların yönetimi
              </Typography>
            </Box>
          </Box>
          <CalendarIcon sx={{ fontSize: 64, color: 'primary.main', opacity: 0.7 }} />
        </Box>

        {/* Ürün Seçimi */}
        <Box sx={{ mb: 2 }}>
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
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            disabled={!selectedProduct}
          >
            Yeni Versiyon Ekle
          </Button>
          <Chip 
            label={`Toplam ${releases.length} Versiyon`} 
            color="primary" 
            variant="outlined"
          />
          <Chip 
            label={`${releases.filter(r => !r.isDeprecated).length} Aktif`} 
            color="success" 
            variant="outlined"
          />
          <Chip 
            label={`${releases.filter(r => r.isDeprecated).length} Deprecated`} 
            color="error" 
            variant="outlined"
          />
        </Box>
      </Paper>

      {/* Tablo */}
      {loading ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography>Yükleniyor...</Typography>
        </Paper>
      ) : !selectedProduct ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">Lütfen bir ürün seçin</Typography>
        </Paper>
      ) : (
      <TableContainer component={Paper} elevation={3}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.light' }}>
              <TableCell><strong>Versiyon</strong></TableCell>
              <TableCell><strong>Durum</strong></TableCell>
              <TableCell><strong>Master Başlangıç</strong></TableCell>
              <TableCell><strong>Test Tarihi</strong></TableCell>
              <TableCell><strong>PreProd Tarihi</strong></TableCell>
              <TableCell><strong>Release Tarihi</strong></TableCell>
              <TableCell><strong>Deprecated</strong></TableCell>
              <TableCell align="center"><strong>İşlemler</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedReleases.map((release) => {
              const statusInfo = getStatusInfo(release.status);
              return (
                <TableRow 
                  key={release.id}
                  sx={{ 
                    '&:hover': { bgcolor: 'action.hover' },
                    opacity: release.isDeprecated ? 0.6 : 1
                  }}
                >
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {release.version}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={statusInfo.label}
                      color={statusInfo.color}
                      icon={statusInfo.icon}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{formatDate(release.masterStartDate)}</TableCell>
                  <TableCell>{formatDate(release.testDate)}</TableCell>
                  <TableCell>{formatDate(release.preProdDate)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold" color="primary.main">
                      {formatDate(release.releaseDate)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {release.isDeprecated ? (
                      <Chip label="Evet" color="error" size="small" />
                    ) : (
                      <Chip label="Hayır" color="success" size="small" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Düzenle">
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => handleOpenDialog(release)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Sil">
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDelete(release.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      )}

      {/* Ekleme/Düzenleme Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingRelease ? 'Versiyon Düzenle' : 'Yeni Versiyon Ekle'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Versiyon"
                value={formData.version}
                onChange={(e) => handleFormChange('version', e.target.value)}
                placeholder="örn: v7.1.0"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Durum</InputLabel>
                <Select
                  value={formData.status}
                  label="Durum"
                  onChange={(e) => handleFormChange('status', e.target.value)}
                >
                  <MenuItem value="InProgress">Geliştiriliyor</MenuItem>
                  <MenuItem value="Testing">Test Ediliyor</MenuItem>
                  <MenuItem value="Published">Yayınlandı</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Master Başlangıç Tarihi"
                type="date"
                value={formData.masterStartDate}
                onChange={(e) => handleFormChange('masterStartDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Test Tarihi"
                type="date"
                value={formData.testDate}
                onChange={(e) => handleFormChange('testDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="PreProd Tarihi"
                type="date"
                value={formData.preProdDate}
                onChange={(e) => handleFormChange('preProdDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Release Tarihi"
                type="date"
                value={formData.releaseDate}
                onChange={(e) => handleFormChange('releaseDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Deprecated Durumu</InputLabel>
                <Select
                  value={formData.isDeprecated}
                  label="Deprecated Durumu"
                  onChange={(e) => handleFormChange('isDeprecated', e.target.value)}
                >
                  <MenuItem value={false}>Aktif</MenuItem>
                  <MenuItem value={true}>Deprecated</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} variant="outlined">
            İptal
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            color="primary"
            disabled={!formData.version}
          >
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ReleaseCalendarV3;
