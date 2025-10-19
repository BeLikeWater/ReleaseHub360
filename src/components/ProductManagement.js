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
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  OutlinedInput,
  FormHelperText,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CodeIcon from '@mui/icons-material/Code';
import CategoryIcon from '@mui/icons-material/Category';
import LinkIcon from '@mui/icons-material/Link';

// Mock Data - Servisler
const initialServices = [
  { id: 1, name: 'auth-service', description: 'Kimlik doğrulama ve yetkilendirme servisi', version: 'v1.24.0' },
  { id: 2, name: 'notification-service', description: 'Bildirim yönetimi servisi', version: 'v1.22.0' },
  { id: 3, name: 'logging-service', description: 'Merkezi loglama servisi', version: 'v1.20.0' },
  { id: 4, name: 'limit-service', description: 'Kredi limit hesaplama servisi', version: 'v2.1.0' },
  { id: 5, name: 'tahsis-service', description: 'Kredi tahsis servisi', version: 'v2.0.5' },
  { id: 6, name: 'risk-service', description: 'Risk değerlendirme servisi', version: 'v1.15.0' },
  { id: 7, name: 'payment-service', description: 'Ödeme işlemleri servisi', version: 'v3.2.0' },
  { id: 8, name: 'account-service', description: 'Hesap yönetimi servisi', version: 'v2.5.0' },
];

// Mock Data - Ürün Grupları
const initialProductGroups = [
  {
    id: 1,
    name: 'Altyapı Grubu',
    description: 'Temel altyapı servisleri',
    serviceIds: [1, 2, 3], // auth, notification, logging
    color: '#2196F3',
  },
  {
    id: 2,
    name: 'Kredi Grubu',
    description: 'Kredi işlemleri servisleri',
    serviceIds: [4, 5, 6], // limit, tahsis, risk
    color: '#4CAF50',
  },
  {
    id: 3,
    name: 'Ödeme Grubu',
    description: 'Ödeme ve hesap servisleri',
    serviceIds: [7, 8], // payment, account
    color: '#FF9800',
  },
];

// Mock Data - Grup Bağımlılıkları
const initialGroupDependencies = [
  { id: 1, groupId: 2, dependsOnGroupId: 1, mandatory: true }, // Kredi -> Altyapı (zorunlu)
  { id: 2, groupId: 3, dependsOnGroupId: 1, mandatory: true }, // Ödeme -> Altyapı (zorunlu)
  { id: 3, groupId: 2, dependsOnGroupId: 3, mandatory: false }, // Kredi -> Ödeme (opsiyonel)
];

const ProductManagement = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [services, setServices] = useState(initialServices);
  const [productGroups, setProductGroups] = useState(initialProductGroups);
  const [groupDependencies, setGroupDependencies] = useState(initialGroupDependencies);

  // Dialog States
  const [openServiceDialog, setOpenServiceDialog] = useState(false);
  const [openGroupDialog, setOpenGroupDialog] = useState(false);
  const [openDependencyDialog, setOpenDependencyDialog] = useState(false);

  // Form States
  const [editMode, setEditMode] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);

  const [serviceForm, setServiceForm] = useState({ name: '', description: '', version: '' });
  const [groupForm, setGroupForm] = useState({ name: '', description: '', serviceIds: [], color: '#2196F3' });
  const [dependencyForm, setDependencyForm] = useState({ groupId: '', dependsOnGroupId: '', mandatory: true });

  // Service Dialog Handlers
  const handleOpenServiceDialog = (service = null) => {
    if (service) {
      setEditMode(true);
      setCurrentItem(service);
      setServiceForm({ name: service.name, description: service.description, version: service.version });
    } else {
      setEditMode(false);
      setCurrentItem(null);
      setServiceForm({ name: '', description: '', version: '' });
    }
    setOpenServiceDialog(true);
  };

  const handleSaveService = () => {
    const newService = {
      id: editMode ? currentItem.id : Date.now(),
      name: serviceForm.name,
      description: serviceForm.description,
      version: serviceForm.version,
    };

    if (editMode) {
      setServices(services.map(s => s.id === currentItem.id ? newService : s));
    } else {
      setServices([...services, newService]);
    }
    setOpenServiceDialog(false);
  };

  const handleDeleteService = (id) => {
    // Check if service is used in any group
    const isUsed = productGroups.some(g => g.serviceIds.includes(id));
    if (isUsed) {
      alert('Bu servis bir ürün grubunda kullanılıyor. Önce gruptan çıkarmalısınız.');
      return;
    }
    if (window.confirm('Bu servisi silmek istediğinizden emin misiniz?')) {
      setServices(services.filter(s => s.id !== id));
    }
  };

  // Product Group Dialog Handlers
  const handleOpenGroupDialog = (group = null) => {
    if (group) {
      setEditMode(true);
      setCurrentItem(group);
      setGroupForm({ 
        name: group.name, 
        description: group.description, 
        serviceIds: group.serviceIds,
        color: group.color 
      });
    } else {
      setEditMode(false);
      setCurrentItem(null);
      setGroupForm({ name: '', description: '', serviceIds: [], color: '#2196F3' });
    }
    setOpenGroupDialog(true);
  };

  const handleSaveGroup = () => {
    const newGroup = {
      id: editMode ? currentItem.id : Date.now(),
      name: groupForm.name,
      description: groupForm.description,
      serviceIds: groupForm.serviceIds,
      color: groupForm.color,
    };

    if (editMode) {
      setProductGroups(productGroups.map(g => g.id === currentItem.id ? newGroup : g));
    } else {
      setProductGroups([...productGroups, newGroup]);
    }
    setOpenGroupDialog(false);
  };

  const handleDeleteGroup = (id) => {
    // Check if group is used in dependencies
    const isUsed = groupDependencies.some(d => d.groupId === id || d.dependsOnGroupId === id);
    if (isUsed) {
      alert('Bu grup bir bağımlılıkta kullanılıyor. Önce bağımlılığı silmelisiniz.');
      return;
    }
    if (window.confirm('Bu ürün grubunu silmek istediğinizden emin misiniz?')) {
      setProductGroups(productGroups.filter(g => g.id !== id));
    }
  };

  // Dependency Dialog Handlers
  const handleOpenDependencyDialog = (dependency = null) => {
    if (dependency) {
      setEditMode(true);
      setCurrentItem(dependency);
      setDependencyForm({ 
        groupId: dependency.groupId, 
        dependsOnGroupId: dependency.dependsOnGroupId,
        mandatory: dependency.mandatory 
      });
    } else {
      setEditMode(false);
      setCurrentItem(null);
      setDependencyForm({ groupId: '', dependsOnGroupId: '', mandatory: true });
    }
    setOpenDependencyDialog(true);
  };

  const handleSaveDependency = () => {
    if (dependencyForm.groupId === dependencyForm.dependsOnGroupId) {
      alert('Bir grup kendine bağımlı olamaz!');
      return;
    }

    // Check for circular dependency
    const wouldCreateCircular = (fromId, toId) => {
      if (fromId === toId) return true;
      const deps = groupDependencies.filter(d => d.groupId === toId);
      return deps.some(d => wouldCreateCircular(fromId, d.dependsOnGroupId));
    };

    if (wouldCreateCircular(dependencyForm.dependsOnGroupId, dependencyForm.groupId)) {
      alert('Bu bağımlılık döngüsel bir bağımlılık oluşturacak!');
      return;
    }

    const newDependency = {
      id: editMode ? currentItem.id : Date.now(),
      groupId: dependencyForm.groupId,
      dependsOnGroupId: dependencyForm.dependsOnGroupId,
      mandatory: dependencyForm.mandatory,
    };

    if (editMode) {
      setGroupDependencies(groupDependencies.map(d => d.id === currentItem.id ? newDependency : d));
    } else {
      setGroupDependencies([...groupDependencies, newDependency]);
    }
    setOpenDependencyDialog(false);
  };

  const handleDeleteDependency = (id) => {
    if (window.confirm('Bu bağımlılığı silmek istediğinizden emin misiniz?')) {
      setGroupDependencies(groupDependencies.filter(d => d.id !== id));
    }
  };

  // Helper functions
  const getServiceName = (id) => services.find(s => s.id === id)?.name || 'Bilinmeyen';
  const getGroupName = (id) => productGroups.find(g => g.id === id)?.name || 'Bilinmeyen';
  const getGroupColor = (id) => productGroups.find(g => g.id === id)?.color || '#999';

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
        Ürün Yönetimi
      </Typography>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
          <Tab icon={<CodeIcon />} label="Servisler" iconPosition="start" />
          <Tab icon={<CategoryIcon />} label="Ürün Grupları" iconPosition="start" />
          <Tab icon={<LinkIcon />} label="Grup Bağımlılıkları" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* TAB 1: Servisler */}
      {activeTab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">Servis Tanımları</Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenServiceDialog()}>
              Yeni Servis Ekle
            </Button>
          </Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#1976d2' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Servis Adı</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Açıklama</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Versiyon</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id} hover>
                    <TableCell sx={{ fontWeight: 'bold' }}>{service.name}</TableCell>
                    <TableCell>{service.description}</TableCell>
                    <TableCell><Chip label={service.version} size="small" color="primary" /></TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <IconButton size="small" color="primary" onClick={() => handleOpenServiceDialog(service)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteService(service.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* TAB 2: Ürün Grupları */}
      {activeTab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">Ürün Grupları</Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenGroupDialog()}>
              Yeni Ürün Grubu Ekle
            </Button>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {productGroups.map((group) => (
              <Card key={group.id} sx={{ minWidth: 300, maxWidth: 400, border: `3px solid ${group.color}` }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" sx={{ color: group.color, fontWeight: 'bold' }}>
                        {group.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {group.description}
                      </Typography>
                    </Box>
                    <Box>
                      <IconButton size="small" color="primary" onClick={() => handleOpenGroupDialog(group)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteGroup(group.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                    Servisler ({group.serviceIds.length})
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {group.serviceIds.map((serviceId) => (
                      <Chip 
                        key={serviceId} 
                        label={getServiceName(serviceId)} 
                        size="small"
                        sx={{ bgcolor: group.color, color: 'white' }}
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      )}

      {/* TAB 3: Grup Bağımlılıkları */}
      {activeTab === 2 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">Grup Bağımlılıkları</Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDependencyDialog()}>
              Yeni Bağımlılık Ekle
            </Button>
          </Box>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#1976d2' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Grup</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>→</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Bağımlı Olduğu Grup</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Zorunluluk</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupDependencies.map((dep) => (
                  <TableRow key={dep.id} hover>
                    <TableCell>
                      <Chip 
                        label={getGroupName(dep.groupId)} 
                        sx={{ bgcolor: getGroupColor(dep.groupId), color: 'white', fontWeight: 'bold' }}
                      />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', fontSize: '1.5rem' }}>→</TableCell>
                    <TableCell>
                      <Chip 
                        label={getGroupName(dep.dependsOnGroupId)} 
                        sx={{ bgcolor: getGroupColor(dep.dependsOnGroupId), color: 'white', fontWeight: 'bold' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={dep.mandatory ? 'Zorunlu' : 'Opsiyonel'} 
                        color={dep.mandatory ? 'error' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <IconButton size="small" color="primary" onClick={() => handleOpenDependencyDialog(dep)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteDependency(dep.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Alert severity="info" sx={{ mt: 2 }}>
            <strong>Zorunlu Bağımlılık:</strong> Ana grup satılırken bağımlı grup mutlaka birlikte satılmalıdır.<br/>
            <strong>Opsiyonel Bağımlılık:</strong> Ana grup bağımlı grup olmadan da satılabilir.
          </Alert>
        </Box>
      )}

      {/* Service Dialog */}
      <Dialog open={openServiceDialog} onClose={() => setOpenServiceDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? 'Servis Düzenle' : 'Yeni Servis Ekle'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              fullWidth
              label="Servis Adı"
              value={serviceForm.name}
              onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
              required
              helperText="Örn: auth-service, payment-service"
            />
            <TextField
              fullWidth
              label="Açıklama"
              value={serviceForm.description}
              onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
              required
              multiline
              rows={2}
            />
            <TextField
              fullWidth
              label="Başlangıç Versiyonu"
              value={serviceForm.version}
              onChange={(e) => setServiceForm({ ...serviceForm, version: e.target.value })}
              required
              helperText="Örn: v1.0.0"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenServiceDialog(false)}>İptal</Button>
          <Button 
            onClick={handleSaveService} 
            variant="contained"
            disabled={!serviceForm.name || !serviceForm.description || !serviceForm.version}
          >
            {editMode ? 'Güncelle' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Product Group Dialog */}
      <Dialog open={openGroupDialog} onClose={() => setOpenGroupDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? 'Ürün Grubu Düzenle' : 'Yeni Ürün Grubu Ekle'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              fullWidth
              label="Grup Adı"
              value={groupForm.name}
              onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
              required
              helperText="Örn: Altyapı Grubu, Kredi Grubu"
            />
            <TextField
              fullWidth
              label="Açıklama"
              value={groupForm.description}
              onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
              required
              multiline
              rows={2}
            />
            <FormControl fullWidth required>
              <InputLabel>Servisler</InputLabel>
              <Select
                multiple
                value={groupForm.serviceIds}
                onChange={(e) => setGroupForm({ ...groupForm, serviceIds: e.target.value })}
                input={<OutlinedInput label="Servisler" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((id) => (
                      <Chip key={id} label={getServiceName(id)} size="small" />
                    ))}
                  </Box>
                )}
              >
                {services.map((service) => (
                  <MenuItem key={service.id} value={service.id}>
                    {service.name}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>Bu gruba dahil edilecek servisleri seçiniz</FormHelperText>
            </FormControl>
            <TextField
              fullWidth
              label="Grup Rengi"
              type="color"
              value={groupForm.color}
              onChange={(e) => setGroupForm({ ...groupForm, color: e.target.value })}
              helperText="Görsel ayrım için renk seçiniz"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenGroupDialog(false)}>İptal</Button>
          <Button 
            onClick={handleSaveGroup} 
            variant="contained"
            disabled={!groupForm.name || !groupForm.description || groupForm.serviceIds.length === 0}
          >
            {editMode ? 'Güncelle' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dependency Dialog */}
      <Dialog open={openDependencyDialog} onClose={() => setOpenDependencyDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? 'Bağımlılık Düzenle' : 'Yeni Bağımlılık Ekle'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <FormControl fullWidth required>
              <InputLabel>Grup</InputLabel>
              <Select
                value={dependencyForm.groupId}
                onChange={(e) => setDependencyForm({ ...dependencyForm, groupId: e.target.value })}
                label="Grup"
              >
                {productGroups.map((group) => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>Bağımlılık tanımlanacak grup</FormHelperText>
            </FormControl>
            <FormControl fullWidth required>
              <InputLabel>Bağımlı Olduğu Grup</InputLabel>
              <Select
                value={dependencyForm.dependsOnGroupId}
                onChange={(e) => setDependencyForm({ ...dependencyForm, dependsOnGroupId: e.target.value })}
                label="Bağımlı Olduğu Grup"
              >
                {productGroups.map((group) => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>Bu gruba bağımlı olan grup</FormHelperText>
            </FormControl>
            <FormControl fullWidth required>
              <InputLabel>Zorunluluk</InputLabel>
              <Select
                value={dependencyForm.mandatory}
                onChange={(e) => setDependencyForm({ ...dependencyForm, mandatory: e.target.value })}
                label="Zorunluluk"
              >
                <MenuItem value={true}>Zorunlu (Beraber satılmalı)</MenuItem>
                <MenuItem value={false}>Opsiyonel</MenuItem>
              </Select>
              <FormHelperText>Bağımlılık tipi</FormHelperText>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDependencyDialog(false)}>İptal</Button>
          <Button 
            onClick={handleSaveDependency} 
            variant="contained"
            disabled={!dependencyForm.groupId || !dependencyForm.dependsOnGroupId}
          >
            {editMode ? 'Güncelle' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductManagement;
