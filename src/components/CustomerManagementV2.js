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
  TextField,
  IconButton,
  Chip,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

const CustomerManagementV2 = () => {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    tenantName: '',
    supportSuffix: '',
    emailDomain: '',
    devOpsEmails: '',
    approverEmails: '',
    environments: '',
    azureReleaseTemplate: '',
    selectedProduct: '',
  });

  // Firestore'dan müşterileri getir
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'customers'));
      const customersData = [];
      querySnapshot.forEach((doc) => {
        customersData.push({ id: doc.id, ...doc.data() });
      });
      setCustomers(customersData);
    } catch (error) {
      console.error('Müşteriler yüklenirken hata:', error);
      alert('Müşteriler yüklenirken hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Firestore'dan ürünleri getir
  const fetchProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'products'));
      const productsData = [];
      querySnapshot.forEach((doc) => {
        productsData.push({ id: doc.id, ...doc.data() });
      });
      setProducts(productsData);
    } catch (error) {
      console.error('Ürünler yüklenirken hata:', error);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
  }, []);

  const handleOpenDialog = (customer = null) => {
    if (customer) {
      setEditMode(true);
      setCurrentCustomer(customer);
      setFormData({
        name: customer.name,
        tenantName: customer.tenantName,
        supportSuffix: customer.supportSuffix,
        emailDomain: customer.emailDomain,
        devOpsEmails: customer.devOpsEmails.join(', '),
        approverEmails: customer.approverEmails.join(', '),
        environments: customer.environments.join(', '),
        azureReleaseTemplate: customer.azureReleaseTemplate || '',
        selectedProduct: customer.selectedProduct || '',
      });
    } else {
      setEditMode(false);
      setCurrentCustomer(null);
      setFormData({
        name: '',
        tenantName: '',
        supportSuffix: '',
        emailDomain: '',
        devOpsEmails: '',
        approverEmails: '',
        environments: '',
        azureReleaseTemplate: '',
        selectedProduct: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditMode(false);
    setCurrentCustomer(null);
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSave = async () => {
    try {
      const customerData = {
        name: formData.name,
        tenantName: formData.tenantName,
        supportSuffix: formData.supportSuffix,
        emailDomain: formData.emailDomain,
        devOpsEmails: formData.devOpsEmails.split(',').map(e => e.trim()).filter(e => e),
        approverEmails: formData.approverEmails.split(',').map(e => e.trim()).filter(e => e),
        environments: formData.environments.split(',').map(e => e.trim()).filter(e => e),
        azureReleaseTemplate: formData.azureReleaseTemplate,
        selectedProduct: formData.selectedProduct,
      };

      if (editMode) {
        // Güncelleme
        const customerRef = doc(db, 'customers', currentCustomer.id);
        await updateDoc(customerRef, customerData);
        
        // Local state'i güncelle
        setCustomers(prevCustomers => 
          prevCustomers.map(c => 
            c.id === currentCustomer.id 
              ? { ...c, ...customerData }
              : c
          )
        );
      } else {
        // Yeni ekleme
        const docRef = await addDoc(collection(db, 'customers'), customerData);
        
        // Local state'i güncelle
        setCustomers(prevCustomers => [
          ...prevCustomers,
          { id: docRef.id, ...customerData }
        ]);
      }
      
      handleCloseDialog();
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      alert('Kaydetme hatası: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bu müşteriyi silmek istediğinizden emin misiniz?')) {
      try {
        await deleteDoc(doc(db, 'customers', id));
        
        // Local state'i güncelle
        setCustomers(prevCustomers => 
          prevCustomers.filter(c => c.id !== id)
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
        Müşteri Yönetimi V2
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Müşteriler</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Yeni Müşteri Ekle
        </Button>
      </Box>

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
            İlk müşteriyi eklemek için yukarıdaki "Yeni Müşteri Ekle" butonuna tıklayın
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#1976d2' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Müşteri Adı</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Tenant Adı</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Destek Suffix</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Email Domain</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Ürünler</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Ortamlar</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>İşlemler</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id} hover>
                  <TableCell sx={{ fontWeight: 'bold' }}>{customer.name}</TableCell>
                  <TableCell>
                    <Chip label={customer.tenantName} size="small" color="primary" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip label={customer.supportSuffix} size="small" color="secondary" />
                  </TableCell>
                  <TableCell>{customer.emailDomain}</TableCell>
                  <TableCell>
                    {customer.selectedProduct ? (
                      <Chip 
                        label={products.find(p => p.id === customer.selectedProduct)?.name || 'Bilinmeyen'} 
                        size="small" 
                        color="success"
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">-</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {customer.environments.map((env, idx) => (
                        <Chip key={idx} label={env} size="small" />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <IconButton size="small" color="primary" onClick={() => handleOpenDialog(customer)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(customer.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Müşteri Ekleme/Düzenleme Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editMode ? 'Müşteri Düzenle' : 'Yeni Müşteri Ekle'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              Email adresleri ve ortamları virgülle ayırarak giriniz. Örnek: dev@example.com, prod@example.com
            </Alert>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {/* Müşteri Adı */}
              <TextField
                fullWidth
                label="Müşteri Adı"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                helperText="Örn: Türkiye Finans Katılım Bankası, Kuveyt Türk"
              />

              {/* Tenant Adı */}
              <TextField
                fullWidth
                label="Tenant Adı"
                value={formData.tenantName}
                onChange={(e) => handleInputChange('tenantName', e.target.value)}
                required
                helperText="Örn: turkiyefinans-prod, kuveytturk-prod"
              />

              {/* Destek Suffix */}
              <TextField
                fullWidth
                label="Destek Uygulaması Suffix"
                value={formData.supportSuffix}
                onChange={(e) => handleInputChange('supportSuffix', e.target.value)}
                required
                helperText="Jira/Destek sistemindeki kayıt prefix'i. Örn: TFKB, KTKB, ATKB"
              />

              {/* Email Domain */}
              <TextField
                fullWidth
                label="Email Domain"
                value={formData.emailDomain}
                onChange={(e) => handleInputChange('emailDomain', e.target.value)}
                required
                helperText="Örn: turkiyefinans.com.tr, kuveytturk.com.tr"
              />

              {/* DevOps Email Adresleri */}
              <TextField
                fullWidth
                label="DevOps Ekip Email Adresleri"
                value={formData.devOpsEmails}
                onChange={(e) => handleInputChange('devOpsEmails', e.target.value)}
                required
                multiline
                rows={2}
                helperText="Virgülle ayırarak birden fazla email girebilirsiniz"
              />

              {/* Onaylayıcı Email Adresleri */}
              <TextField
                fullWidth
                label="Onaylayıcı Ekip Email Adresleri"
                value={formData.approverEmails}
                onChange={(e) => handleInputChange('approverEmails', e.target.value)}
                required
                multiline
                rows={2}
                helperText="Virgülle ayırarak birden fazla email girebilirsiniz"
              />

              {/* Ortamlar */}
              <TextField
                fullWidth
                label="Ortamlar (Environments)"
                value={formData.environments}
                onChange={(e) => handleInputChange('environments', e.target.value)}
                required
                helperText="Virgülle ayırarak giriniz. Örn: Dev, Test, Preprod, Prod"
              />

              {/* Ürün Seçimi */}
              <FormControl fullWidth>
                <InputLabel>Ürün</InputLabel>
                <Select
                  value={formData.selectedProduct}
                  onChange={(e) => handleInputChange('selectedProduct', e.target.value)}
                  label="Ürün"
                >
                  <MenuItem value="">
                    <em>Ürün Seçiniz</em>
                  </MenuItem>
                  {products.map((product) => (
                    <MenuItem key={product.id} value={product.id}>
                      {product.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Azure Release Template */}
              <TextField
                fullWidth
                label="Azure Release Template"
                value={formData.azureReleaseTemplate}
                onChange={(e) => handleInputChange('azureReleaseTemplate', e.target.value)}
                helperText="Her müşteri için ayrı release tanımı varsa template adını giriniz"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>İptal</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={
              !formData.name ||
              !formData.tenantName ||
              !formData.supportSuffix ||
              !formData.emailDomain ||
              !formData.devOpsEmails ||
              !formData.approverEmails ||
              !formData.environments
            }
          >
            {editMode ? 'Güncelle' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerManagementV2;
