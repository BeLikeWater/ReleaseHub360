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
  IconButton,
  Chip,
  Card,
  CardContent,
  Grid,
  Alert,
  Collapse,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CategoryIcon from '@mui/icons-material/Category';
import Badge from '@mui/material/Badge';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';

// Mock Data - Müşteriler (CustomerManagement'tan)
const mockCustomers = [
  { id: 1, name: 'Türkiye Finans Katılım Bankası', shortName: 'TFKB' },
  { id: 2, name: 'Kuveyt Türk Katılım Bankası', shortName: 'KTKB' },
  { id: 3, name: 'Albaraka Türk Katılım Bankası', shortName: 'ATKB' },
  { id: 4, name: 'Vakıf Katılım Bankası', shortName: 'VKB' },
];

// Mock Data - Ürün Grupları (ProductManagement'tan)
const mockProductGroups = [
  {
    id: 1,
    name: 'Altyapı Grubu',
    color: '#2196F3',
    services: [
      { id: 1, name: 'auth-service' },
      { id: 2, name: 'notification-service' },
      { id: 3, name: 'logging-service' },
    ],
  },
  {
    id: 2,
    name: 'Kredi Grubu',
    color: '#4CAF50',
    services: [
      { id: 4, name: 'limit-service' },
      { id: 5, name: 'tahsis-service' },
      { id: 6, name: 'risk-service' },
    ],
  },
  {
    id: 3,
    name: 'Ödeme Grubu',
    color: '#FF9800',
    services: [
      { id: 7, name: 'payment-service' },
      { id: 8, name: 'account-service' },
    ],
  },
];

// Mock Data - Müşteri-Grup İlişkilendirmeleri
const initialMappings = [
  { customerId: 1, productGroupId: 1 }, // TFKB - Altyapı
  { customerId: 1, productGroupId: 2 }, // TFKB - Kredi
  { customerId: 1, productGroupId: 3 }, // TFKB - Ödeme
  { customerId: 2, productGroupId: 1 }, // KTKB - Altyapı
  { customerId: 2, productGroupId: 2 }, // KTKB - Kredi
  { customerId: 3, productGroupId: 1 }, // ATKB - Altyapı
  { customerId: 3, productGroupId: 3 }, // ATKB - Ödeme
  { customerId: 4, productGroupId: 1 }, // VKB - Altyapı
];

// Mock Data - Gerçek Kurulu Servisler (örnek: ServiceVersionMatrix'ten)
const actualInstalledServices = [
  { 
    customerId: 1, // TFKB
    serviceIds: [1, 2, 3, 4, 5] // auth, notification, logging, limit, tahsis (risk eksik, ödeme grubu hiç yok)
  },
  { 
    customerId: 2, // KTKB
    serviceIds: [1, 2, 3, 4, 5, 6, 7, 8] // Hepsi kurulu (ödeme grubu fazla)
  },
  { 
    customerId: 3, // ATKB
    serviceIds: [1, 2, 7] // Altyapıdan logging eksik, ödeme'den account eksik
  },
  { 
    customerId: 4, // VKB
    serviceIds: [1, 2, 3] // Sadece altyapı, tamam
  },
];

const CustomerServiceMapping = () => {
  const [mappings, setMappings] = useState(initialMappings);
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedProductGroup, setSelectedProductGroup] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);

  const handleToggleExpand = (customerId) => {
    setExpandedCustomer(expandedCustomer === customerId ? null : customerId);
  };

  const handleOpenDialog = () => {
    setSelectedCustomer('');
    setSelectedProductGroup('');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleAddMapping = () => {
    if (!selectedCustomer || !selectedProductGroup) return;

    // Check if mapping already exists
    const exists = mappings.some(
      m => m.customerId === selectedCustomer && m.productGroupId === selectedProductGroup
    );

    if (exists) {
      alert('Bu müşteri için bu ürün grubu zaten tanımlı!');
      return;
    }

    setMappings([...mappings, { customerId: selectedCustomer, productGroupId: selectedProductGroup }]);
    handleCloseDialog();
  };

  const handleDeleteMapping = (customerId, productGroupId) => {
    if (window.confirm('Bu ürün grubunu müşteriden kaldırmak istediğinizden emin misiniz?')) {
      setMappings(mappings.filter(
        m => !(m.customerId === customerId && m.productGroupId === productGroupId)
      ));
    }
  };

  const getCustomerGroups = (customerId) => {
    return mappings
      .filter(m => m.customerId === customerId)
      .map(m => mockProductGroups.find(g => g.id === m.productGroupId))
      .filter(Boolean);
  };

  const getProductGroup = (groupId) => {
    return mockProductGroups.find(g => g.id === groupId);
  };

  const getAvailableGroupsForCustomer = () => {
    if (!selectedCustomer) return mockProductGroups;
    
    const customerMappings = mappings.filter(m => m.customerId === selectedCustomer);
    const assignedGroupIds = customerMappings.map(m => m.productGroupId);
    
    return mockProductGroups.filter(g => !assignedGroupIds.includes(g.id));
  };

// Hesaplama: Kurulması gereken ama kurulu olmayan servisler & fazladan kurulu servisler
const getInstallRemoveInfo = (customerId) => {
  // Müşteriye atanmış gruplar
  const assignedGroupIds = mappings.filter(m => m.customerId === customerId).map(m => m.productGroupId);
  const assignedGroups = assignedGroupIds.map(gid => mockProductGroups.find(g => g.id === gid)).filter(Boolean);
  
  // Müşteriye atanmış tüm servisler (grup bazlı)
  const assignedServices = [];
  assignedGroups.forEach(group => {
    group.services.forEach(service => {
      assignedServices.push({ groupId: group.id, groupName: group.name, ...service });
    });
  });
  
  // Gerçekte kurulu servisler
  const installedServiceIds = actualInstalledServices.find(a => a.customerId === customerId)?.serviceIds || [];
  
  // Kurulması gereken ama kurulu olmayanlar (grup bazında göster)
  const toInstall = assignedServices.filter(svc => !installedServiceIds.includes(svc.id));
  
  // Fazladan kurulu olanlar (müşteriye atanmamış ama kurulu)
  const toRemove = [];
  mockProductGroups.forEach(group => {
    const isGroupAssigned = assignedGroupIds.includes(group.id);
    if (!isGroupAssigned) {
      // Bu grup müşteriye atanmamış, ama servisleri kurulu mu?
      group.services.forEach(service => {
        if (installedServiceIds.includes(service.id)) {
          toRemove.push({ groupId: group.id, groupName: group.name, ...service });
        }
      });
    }
  });
  
  return { toInstall, toRemove };
};  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Müşteri - Ürün Grubu İlişkilendirme
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
          >
            Ürün Grubu Ata
          </Button>
          <Badge
            color="error"
            badgeContent={mockCustomers.filter(c => {
              const info = getInstallRemoveInfo(c.id);
              return info.toInstall.length > 0 || info.toRemove.length > 0;
            }).length}
          >
            <IconButton color="warning" onClick={() => setNotifOpen(true)}>
              <NotificationsActiveIcon />
            </IconButton>
          </Badge>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Müşterilere ürün grupları atanır. Her ürün grubu birden fazla servisi içerir. Kurulum farkları için bildirim ikonunu kullanın.
      </Alert>

      {/* İstatistikler */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Toplam Müşteri
              </Typography>
              <Typography variant="h4">{mockCustomers.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Toplam Ürün Grubu
              </Typography>
              <Typography variant="h4">{mockProductGroups.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Toplam İlişkilendirme
              </Typography>
              <Typography variant="h4">{mappings.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Ana Tablo */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#1976d2' }}>
              <TableCell sx={{ color: 'white', fontWeight: 'bold', width: 50 }}></TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Müşteri</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Atanmış Ürün Grupları</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>
                Toplam Servis Sayısı
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {mockCustomers.map((customer) => {
              const customerGroups = getCustomerGroups(customer.id);
              const totalServices = customerGroups.reduce((sum, group) => sum + group.services.length, 0);
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
                        {customerGroups.map((group) => (
                          <Chip
                            key={group.id}
                            label={group.name}
                            sx={{ bgcolor: group.color, color: 'white', fontWeight: 'bold' }}
                            size="small"
                          />
                        ))}
                        {customerGroups.length === 0 && (
                          <Typography variant="body2" color="text.secondary">
                            Henüz ürün grubu atanmamış
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Chip label={totalServices} color="primary" />
                    </TableCell>
                  </TableRow>
                  
                  {/* Genişletilmiş Detay */}
                  <TableRow>
                    <TableCell colSpan={4} sx={{ p: 0, borderBottom: isExpanded ? 1 : 0 }}>
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 3, bgcolor: '#f5f5f5' }}>
                          {customerGroups.length === 0 ? (
                            <Alert severity="warning">Bu müşteriye henüz ürün grubu atanmamış.</Alert>
                          ) : (
                            <Grid container spacing={2}>
                              {customerGroups.map((group) => (
                                <Grid item xs={12} md={6} key={group.id}>
                                  <Card variant="outlined" sx={{ borderLeft: `4px solid ${group.color}` }}>
                                    <CardContent>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                          <CategoryIcon sx={{ color: group.color }} />
                                          <Typography variant="h6" sx={{ color: group.color, fontWeight: 'bold' }}>
                                            {group.name}
                                          </Typography>
                                        </Box>
                                        <IconButton
                                          size="small"
                                          color="error"
                                          onClick={() => handleDeleteMapping(customer.id, group.id)}
                                        >
                                          <DeleteIcon />
                                        </IconButton>
                                      </Box>
                                      <Divider sx={{ mb: 2 }} />
                                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                                        Servisler ({group.services.length})
                                      </Typography>
                                      <List dense>
                                        {group.services.map((service) => (
                                          <ListItem key={service.id}>
                                            <ListItemText
                                              primary={service.name}
                                              primaryTypographyProps={{ fontFamily: 'monospace' }}
                                            />
                                          </ListItem>
                                        ))}
                                      </List>
                                    </CardContent>
                                  </Card>
                                </Grid>
                              ))}
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

      {/* Ürün Grubu Atama Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Müşteriye Ürün Grubu Ata</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <FormControl fullWidth required>
              <InputLabel>Müşteri Seçiniz</InputLabel>
              <Select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                label="Müşteri Seçiniz"
              >
                {mockCustomers.map((customer) => (
                  <MenuItem key={customer.id} value={customer.id}>
                    {customer.name} ({customer.shortName})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required disabled={!selectedCustomer}>
              <InputLabel>Ürün Grubu Seçiniz</InputLabel>
              <Select
                value={selectedProductGroup}
                onChange={(e) => setSelectedProductGroup(e.target.value)}
                label="Ürün Grubu Seçiniz"
              >
                {getAvailableGroupsForCustomer().map((group) => (
                  <MenuItem key={group.id} value={group.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          bgcolor: group.color,
                          borderRadius: '50%',
                        }}
                      />
                      {group.name} ({group.services.length} servis)
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedProductGroup && (
              <Alert severity="info">
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Bu gruba dahil servisler:
                </Typography>
                <List dense>
                  {getProductGroup(selectedProductGroup)?.services.map((service) => (
                    <ListItem key={service.id}>
                      <ListItemText
                        primary={service.name}
                        primaryTypographyProps={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>İptal</Button>
          <Button
            onClick={handleAddMapping}
            variant="contained"
            disabled={!selectedCustomer || !selectedProductGroup}
          >
            Ata
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bildirim Dialog */}
      <Dialog open={notifOpen} onClose={() => setNotifOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Kurulum Farkları Bildirimi</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {mockCustomers.map((customer) => {
              const info = getInstallRemoveInfo(customer.id);
              if (info.toInstall.length === 0 && info.toRemove.length === 0) return null;
              
              // Grup bazında grupla
              const toInstallByGroup = {};
              info.toInstall.forEach(svc => {
                if (!toInstallByGroup[svc.groupName]) toInstallByGroup[svc.groupName] = [];
                toInstallByGroup[svc.groupName].push(svc);
              });
              
              const toRemoveByGroup = {};
              info.toRemove.forEach(svc => {
                if (!toRemoveByGroup[svc.groupName]) toRemoveByGroup[svc.groupName] = [];
                toRemoveByGroup[svc.groupName].push(svc);
              });
              
              return (
                <Card key={customer.id} sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                      {customer.name} ({customer.shortName})
                    </Typography>
                    
                    {info.toInstall.length > 0 && (
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                          Kurulması gereken servisler:
                        </Typography>
                        {Object.keys(toInstallByGroup).map(groupName => (
                          <Box key={groupName} sx={{ mb: 1 }}>
                            <Typography variant="body2" fontWeight="bold" color="text.secondary">
                              {groupName}:
                            </Typography>
                            <List dense sx={{ pl: 2 }}>
                              {toInstallByGroup[groupName].map(svc => (
                                <ListItem key={svc.id}>
                                  <ListItemText 
                                    primary={svc.name}
                                    primaryTypographyProps={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                                  />
                                </ListItem>
                              ))}
                            </List>
                          </Box>
                        ))}
                      </Alert>
                    )}
                    
                    {info.toRemove.length > 0 && (
                      <Alert severity="error">
                        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                          Kaldırılması gereken servisler (müşteri bu grupları almamış):
                        </Typography>
                        {Object.keys(toRemoveByGroup).map(groupName => (
                          <Box key={groupName} sx={{ mb: 1 }}>
                            <Typography variant="body2" fontWeight="bold" color="text.secondary">
                              {groupName}:
                            </Typography>
                            <List dense sx={{ pl: 2 }}>
                              {toRemoveByGroup[groupName].map(svc => (
                                <ListItem key={svc.id}>
                                  <ListItemText 
                                    primary={svc.name}
                                    primaryTypographyProps={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                                  />
                                </ListItem>
                              ))}
                            </List>
                          </Box>
                        ))}
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {/* Hiç fark yoksa */}
            {mockCustomers.every(c => {
              const info = getInstallRemoveInfo(c.id);
              return info.toInstall.length === 0 && info.toRemove.length === 0;
            }) && (
              <Alert severity="success">Tüm müşterilerde kurulumlar uyumlu!</Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotifOpen(false)}>Kapat</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CustomerServiceMapping;
