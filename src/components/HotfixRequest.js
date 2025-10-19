import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Alert,
  Snackbar,
  Grid,
  Autocomplete,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  BugReport as HotfixIcon,
  CheckCircle as CheckCircleIcon,
  PendingActions as PendingIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';

const HotfixRequest = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState('');
  const [selectedVersion, setSelectedVersion] = useState('');
  const [selectedWorkItems, setSelectedWorkItems] = useState([]);
  const [selectedDependentHotfixes, setSelectedDependentHotfixes] = useState([]);
  const [reason, setReason] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Mock current user
  const currentUser = {
    name: 'Mehmet Kaya',
    email: 'mehmet.kaya@company.com',
  };

  // Mock services
  const services = [
    { id: 1, name: 'Core API' },
    { id: 2, name: 'Payment Service' },
    { id: 3, name: 'Customer Service' },
    { id: 4, name: 'Auth Service' },
  ];

  // Mock versions (bazıları yayınlanmış, bazıları freeze aşamasında)
  const versions = [
    { id: 1, version: 'v6.3.0', isReleased: false, releaseDate: null, status: 'freeze' },
    { id: 2, version: 'v6.2.0', isReleased: true, releaseDate: '2025-10-01', status: 'released' },
    { id: 3, version: 'v6.1.0', isReleased: true, releaseDate: '2025-09-15', status: 'released' },
    { id: 4, version: 'v6.0.0', isReleased: true, releaseDate: '2025-09-01', status: 'released' },
  ];

  // Mock Azure Work Items (sadece yayınlanmış versiyonlar için)
  const workItems = [
    { id: 123456, title: 'Payment gateway timeout fix', type: 'Bug' },
    { id: 123457, title: 'Customer data validation issue', type: 'Bug' },
    { id: 123458, title: 'Auth token expiration problem', type: 'Bug' },
    { id: 123459, title: 'Critical security patch', type: 'Task' },
    { id: 123460, title: 'Database connection pool fix', type: 'Bug' },
  ];

  // Mock existing hotfix requests
  const [hotfixRequests, setHotfixRequests] = useState([
    {
      id: 1,
      service: 'Core API',
      version: 'v6.2.0',
      isReleased: true,
      requestedBy: 'Ahmet Yılmaz',
      requestedByEmail: 'ahmet.yilmaz@company.com',
      requestDate: '2025-10-18 14:30',
      workItems: [{ id: 123456, title: 'Payment gateway timeout fix' }],
      dependentHotfixes: [],
      reason: 'Kritik ödeme hatası - müşteri işlemleri durdu. Bir sonraki versiyonu bekleyemeyiz.',
      status: 'approved',
    },
    {
      id: 2,
      service: 'Payment Service',
      version: 'v6.3.0',
      isReleased: false,
      requestedBy: 'Ayşe Demir',
      requestedByEmail: 'ayse.demir@company.com',
      requestDate: '2025-10-19 09:15',
      workItems: [],
      dependentHotfixes: [],
      reason: '',
      status: 'pending',
    },
    {
      id: 3,
      service: 'Auth Service',
      version: 'v6.2.0',
      isReleased: true,
      requestedBy: 'Can Öztürk',
      requestedByEmail: 'can.ozturk@company.com',
      requestDate: '2025-10-19 10:00',
      workItems: [{ id: 123458, title: 'Auth token expiration problem' }],
      dependentHotfixes: [{ id: 1, service: 'Core API', version: 'v6.2.0' }],
      reason: 'Token expiration hatası kullanıcı deneyimini olumsuz etkiliyor. Günlük 1000+ kullanıcı etkileniyor.',
      status: 'pending',
    },
  ]);

  const getVersionData = (versionString) => {
    return versions.find(v => v.version === versionString);
  };

  const isVersionReleased = (versionString) => {
    const versionData = getVersionData(versionString);
    return versionData?.isReleased || false;
  };

  // Get dependent hotfixes for the selected version (excluding current service)
  const getAvailableDependentHotfixes = () => {
    if (!selectedVersion) return [];
    return hotfixRequests.filter(
      req => req.version === selectedVersion && req.service !== selectedService
    );
  };

  const handleOpenDialog = () => {
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedService('');
    setSelectedVersion('');
    setSelectedWorkItems([]);
    setSelectedDependentHotfixes([]);
    setReason('');
  };

  const handleSubmitHotfixRequest = () => {
    // Validation
    if (!selectedService || !selectedVersion) {
      setSnackbar({
        open: true,
        message: 'Lütfen servis ve versiyon seçiniz!',
        severity: 'warning',
      });
      return;
    }

    const versionReleased = isVersionReleased(selectedVersion);

    // Yayınlanmış versiyonlar için zorunlu alan kontrolü
    if (versionReleased) {
      if (selectedWorkItems.length === 0) {
        setSnackbar({
          open: true,
          message: 'Yayınlanmış versiyonlar için Azure Work Item seçimi zorunludur!',
          severity: 'warning',
        });
        return;
      }

      if (!reason.trim()) {
        setSnackbar({
          open: true,
          message: 'Hotfix talebinin nedenini açıklayınız!',
          severity: 'warning',
        });
        return;
      }
    }

    const newRequest = {
      id: hotfixRequests.length + 1,
      service: selectedService,
      version: selectedVersion,
      isReleased: versionReleased,
      requestedBy: currentUser.name,
      requestedByEmail: currentUser.email,
      requestDate: new Date().toLocaleString('tr-TR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      workItems: selectedWorkItems,
      dependentHotfixes: selectedDependentHotfixes,
      reason: reason,
      status: 'pending',
    };

    setHotfixRequests([newRequest, ...hotfixRequests]);
    setSnackbar({
      open: true,
      message: `${selectedService} - ${selectedVersion} için hotfix talebi oluşturuldu!`,
      severity: 'success',
    });
    handleCloseDialog();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved':
        return 'Onaylandı';
      case 'pending':
        return 'Beklemede';
      case 'rejected':
        return 'Reddedildi';
      default:
        return status;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircleIcon fontSize="small" />;
      case 'pending':
        return <PendingIcon fontSize="small" />;
      case 'rejected':
        return <CancelIcon fontSize="small" />;
      default:
        return null;
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <HotfixIcon color="error" />
        Hotfix Request
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
        Lock'lanmış branch'lar için hotfix değişiklik talebi oluşturun
      </Typography>

      {/* Action Button */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          Yeni Hotfix Talebi
        </Button>
      </Box>

      {/* Hotfix Requests Table */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Hotfix Talepleri
        </Typography>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Servis</strong></TableCell>
                <TableCell><strong>Versiyon</strong></TableCell>
                <TableCell><strong>Durum</strong></TableCell>
                <TableCell><strong>Talep Eden</strong></TableCell>
                <TableCell><strong>Tarih</strong></TableCell>
                <TableCell><strong>Work Items</strong></TableCell>
                <TableCell><strong>Bağımlı Hotfix</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {hotfixRequests.map((request) => (
                <TableRow key={request.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {request.service}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={request.version}
                        size="small"
                        color={request.isReleased ? 'success' : 'warning'}
                      />
                      <Chip
                        label={request.isReleased ? 'Released' : 'Freeze'}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getStatusIcon(request.status)}
                      label={getStatusText(request.status)}
                      color={getStatusColor(request.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{request.requestedBy}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {request.requestedByEmail}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {request.requestDate}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {request.isReleased ? (
                      request.workItems.length > 0 ? (
                        <Box>
                          {request.workItems.map((item, idx) => (
                            <Chip
                              key={idx}
                              label={`#${item.id}`}
                              size="small"
                              sx={{ mb: 0.5, mr: 0.5 }}
                              color="primary"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          -
                        </Typography>
                      )
                    ) : (
                      <Typography variant="caption" color="text.secondary" fontStyle="italic">
                        N/A (Freeze)
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {request.dependentHotfixes.length > 0 ? (
                      <Box>
                        {request.dependentHotfixes.map((dep, idx) => (
                          <Chip
                            key={idx}
                            label={`${dep.service}`}
                            size="small"
                            sx={{ mb: 0.5, mr: 0.5 }}
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        -
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {request.reason && request.isReleased ? (
                      <Typography
                        variant="caption"
                        sx={{
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'block',
                        }}
                      >
                        {request.reason}
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary" fontStyle="italic">
                        {request.isReleased ? '-' : 'N/A (Freeze)'}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {hotfixRequests.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              Henüz hotfix talebi oluşturulmamış
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Hotfix Request Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Yeni Hotfix Talebi</Typography>
            <IconButton onClick={handleCloseDialog} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            {/* Talep Eden (Read-only) */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Talep Eden"
                value={currentUser.email}
                InputProps={{
                  readOnly: true,
                }}
                helperText="Giriş yapmış kullanıcı bilgisi"
              />
            </Grid>

            {/* Servis Seçimi */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Servis</InputLabel>
                <Select
                  value={selectedService}
                  label="Servis"
                  onChange={(e) => setSelectedService(e.target.value)}
                >
                  {services.map((service) => (
                    <MenuItem key={service.id} value={service.name}>
                      {service.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Versiyon Seçimi */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Versiyon</InputLabel>
                <Select
                  value={selectedVersion}
                  label="Versiyon"
                  onChange={(e) => setSelectedVersion(e.target.value)}
                >
                  {versions.map((version) => (
                    <MenuItem key={version.id} value={version.version}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <span>{version.version}</span>
                        <Chip
                          label={version.isReleased ? 'Released' : 'Freeze'}
                          size="small"
                          color={version.isReleased ? 'success' : 'warning'}
                        />
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Durum Bilgilendirmesi - Her zaman görünür */}
            {selectedVersion && (
              <Grid item xs={12}>
                <Alert severity={isVersionReleased(selectedVersion) ? 'warning' : 'info'}>
                  <Typography variant="body2" fontWeight="bold">
                    {isVersionReleased(selectedVersion) 
                      ? '⚠️ Yayınlanmış Versiyon için Hotfix' 
                      : 'ℹ️ Henüz Yayınlanmamış Versiyon (Freeze)'}
                  </Typography>
                  <Typography variant="caption">
                    {isVersionReleased(selectedVersion)
                      ? 'Bu versiyon zaten yayınlanmıştır. Work item, bağımlılık ve neden bilgileri zorunludur.'
                      : 'Bu versiyon freeze aşamasındadır ancak henüz yayınlanmamıştır. Work item ve neden bilgisi gerekmez, sadece değişiklik geçişi yapılacaktır.'}
                  </Typography>
                </Alert>
              </Grid>
            )}

            {/* Azure Work Item Seçimi - Her zaman görünür */}
            <Grid item xs={12}>
              <Autocomplete
                multiple
                disabled={!selectedVersion || !isVersionReleased(selectedVersion)}
                options={workItems}
                getOptionLabel={(option) => `#${option.id} - ${option.title}`}
                value={selectedWorkItems}
                onChange={(event, newValue) => setSelectedWorkItems(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={selectedVersion && isVersionReleased(selectedVersion) ? "Azure Work Items *" : "Azure Work Items"}
                    placeholder="Work item seçiniz"
                    helperText={
                      !selectedVersion 
                        ? "Önce versiyon seçiniz" 
                        : isVersionReleased(selectedVersion)
                        ? "Release note ve geliştirme takibi için gereklidir"
                        : "Freeze versiyonlar için gerekli değildir"
                    }
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={`#${option.id} - ${option.title}`}
                      {...getTagProps({ index })}
                      color="primary"
                      size="small"
                    />
                  ))
                }
              />
            </Grid>

            {/* Bağımlı Hotfix Seçimi - Her zaman görünür */}
            <Grid item xs={12}>
              <Autocomplete
                multiple
                disabled={!selectedVersion || !isVersionReleased(selectedVersion)}
                options={getAvailableDependentHotfixes()}
                getOptionLabel={(option) => `${option.service} - ${option.version} (${option.requestedBy})`}
                value={selectedDependentHotfixes}
                onChange={(event, newValue) => setSelectedDependentHotfixes(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Bağımlı Hotfixler"
                    placeholder="Bağımlı hotfix seçiniz"
                    helperText={
                      !selectedVersion
                        ? "Önce versiyon seçiniz"
                        : isVersionReleased(selectedVersion)
                        ? "Aynı versiyona farklı servislere açılmış hotfix requestleri"
                        : "Freeze versiyonlar için gerekli değildir"
                    }
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={`${option.service} - ${option.version}`}
                      {...getTagProps({ index })}
                      variant="outlined"
                      size="small"
                    />
                  ))
                }
                noOptionsText="Bu versiyon için başka hotfix talebi bulunamadı"
              />
            </Grid>

            {/* Hotfix Nedeni - Her zaman görünür */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                disabled={!selectedVersion || !isVersionReleased(selectedVersion)}
                required={selectedVersion && isVersionReleased(selectedVersion)}
                multiline
                rows={4}
                label={selectedVersion && isVersionReleased(selectedVersion) ? "Hotfix Nedeni *" : "Hotfix Nedeni"}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Bu hotfix neden talep ediliyor? Neden bir sonraki versiyona kadar beklenemiyor?"
                helperText={
                  !selectedVersion
                    ? "Önce versiyon seçiniz"
                    : isVersionReleased(selectedVersion)
                    ? "Aciliyet nedeni ve etki alanını detaylı açıklayınız"
                    : "Freeze versiyonlar için gerekli değildir"
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCloseDialog} variant="outlined">
            İptal
          </Button>
          <Button
            onClick={handleSubmitHotfixRequest}
            variant="contained"
            color="primary"
            disabled={!selectedService || !selectedVersion}
          >
            Hotfix Talebi Oluştur
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default HotfixRequest;
