import React, { useState } from 'react';
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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

// Mock Data - Başlangıç müşterileri (Katılım Bankaları)
const initialCustomers = [
  {
    id: 1,
    name: 'Türkiye Finans Katılım Bankası',
    tenantName: 'turkiyefinans-prod',
    supportSuffix: 'TFKB',
    emailDomain: 'turkiyefinans.com.tr',
    devOpsEmails: ['devops@turkiyefinans.com.tr', 'platform@turkiyefinans.com.tr'],
    approverEmails: ['release-team@turkiyefinans.com.tr', 'it-manager@turkiyefinans.com.tr'],
    environments: ['Dev', 'Test', 'Preprod', 'Prod'],
    azureReleaseTemplate: 'turkiyefinans-release-template-v2',
  },
  {
    id: 2,
    name: 'Kuveyt Türk Katılım Bankası',
    tenantName: 'kuveytturk-prod',
    supportSuffix: 'KTKB',
    emailDomain: 'kuveytturk.com.tr',
    devOpsEmails: ['devops@kuveytturk.com.tr'],
    approverEmails: ['release-approvers@kuveytturk.com.tr'],
    environments: ['Dev', 'UAT', 'Prod'],
    azureReleaseTemplate: 'kuveytturk-release-template-v1',
  },
  {
    id: 3,
    name: 'Albaraka Türk Katılım Bankası',
    tenantName: 'albaraka-prod',
    supportSuffix: 'ATKB',
    emailDomain: 'albaraka.com.tr',
    devOpsEmails: ['platform@albaraka.com.tr', 'devops-team@albaraka.com.tr'],
    approverEmails: ['it-approval@albaraka.com.tr'],
    environments: ['Dev', 'Test', 'Prod'],
    azureReleaseTemplate: 'albaraka-release-template-v1',
  },
  {
    id: 4,
    name: 'Vakıf Katılım Bankası',
    tenantName: 'vakifkatilim-prod',
    supportSuffix: 'VKB',
    emailDomain: 'vakifkatilim.com.tr',
    devOpsEmails: ['devops@vakifkatilim.com.tr'],
    approverEmails: ['release-team@vakifkatilim.com.tr', 'tech-lead@vakifkatilim.com.tr'],
    environments: ['Dev', 'Test', 'Preprod', 'Prod'],
    azureReleaseTemplate: '',
  },
];

const CustomerManagement = () => {
  const [customers, setCustomers] = useState(initialCustomers);
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
  });

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

  const handleSave = () => {
    const newCustomer = {
      id: editMode ? currentCustomer.id : Date.now(),
      name: formData.name,
      tenantName: formData.tenantName,
      supportSuffix: formData.supportSuffix,
      emailDomain: formData.emailDomain,
      devOpsEmails: formData.devOpsEmails.split(',').map(e => e.trim()).filter(e => e),
      approverEmails: formData.approverEmails.split(',').map(e => e.trim()).filter(e => e),
      environments: formData.environments.split(',').map(e => e.trim()).filter(e => e),
      azureReleaseTemplate: formData.azureReleaseTemplate,
    };

    if (editMode) {
      setCustomers(customers.map(c => c.id === currentCustomer.id ? newCustomer : c));
    } else {
      setCustomers([...customers, newCustomer]);
    }

    handleCloseDialog();
  };

  const handleDelete = (id) => {
    if (window.confirm('Bu müşteriyi silmek istediğinizden emin misiniz?')) {
      setCustomers(customers.filter(c => c.id !== id));
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Müşteri Yönetimi
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Yeni Müşteri Ekle
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#1976d2' }}>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Müşteri Adı</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Tenant Adı</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Destek Suffix</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Email Domain</TableCell>
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

export default CustomerManagement;
