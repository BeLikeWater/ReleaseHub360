import React, { useState } from 'react';
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

const ReleaseCalendar = () => {
  const navigate = useNavigate();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRelease, setEditingRelease] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    version: '',
    status: 'InProgress',
    masterStartDate: '',
    testDate: '',
    branchLockDate: '',
    preProdDate: '',
    releaseDate: '',
    order: '',
    isDeprecated: false
  });

  // Mock Data
  const [releases, setReleases] = useState([
    {
      id: 1,
      version: 'v6.2.1',
      status: 'Published',
      masterStartDate: '2025-09-01',
      testDate: '2025-09-15',
      branchLockDate: '2025-09-20',
      preProdDate: '2025-09-25',
      releaseDate: '2025-10-01',
      order: 1,
      isDeprecated: false
    },
    {
      id: 2,
      version: 'v6.3.0',
      status: 'Testing',
      masterStartDate: '2025-10-02',
      testDate: '2025-10-16',
      branchLockDate: '2025-10-21',
      preProdDate: '2025-10-26',
      releaseDate: '2025-11-01',
      order: 2,
      isDeprecated: false
    },
    {
      id: 3,
      version: 'v6.4.0',
      status: 'InProgress',
      masterStartDate: '2025-11-02',
      testDate: '2025-11-16',
      branchLockDate: '2025-11-21',
      preProdDate: '2025-11-26',
      releaseDate: '2025-12-01',
      order: 3,
      isDeprecated: false
    },
    {
      id: 4,
      version: 'v7.0.0',
      status: 'InProgress',
      masterStartDate: '2025-12-02',
      testDate: '2025-12-16',
      branchLockDate: '2025-12-21',
      preProdDate: '2025-12-28',
      releaseDate: '2026-01-05',
      order: 4,
      isDeprecated: false
    },
    {
      id: 5,
      version: 'v6.0.0',
      status: 'Published',
      masterStartDate: '2025-05-01',
      testDate: '2025-05-15',
      branchLockDate: '2025-05-20',
      preProdDate: '2025-05-25',
      releaseDate: '2025-06-01',
      order: 0,
      isDeprecated: true
    }
  ]);

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

  // Dialog açma/kapama
  const handleOpenDialog = (release = null) => {
    if (release) {
      setEditingRelease(release);
      setFormData({
        version: release.version,
        status: release.status,
        masterStartDate: release.masterStartDate,
        testDate: release.testDate,
        branchLockDate: release.branchLockDate,
        preProdDate: release.preProdDate,
        releaseDate: release.releaseDate,
        order: release.order,
        isDeprecated: release.isDeprecated
      });
    } else {
      setEditingRelease(null);
      setFormData({
        version: '',
        status: 'InProgress',
        masterStartDate: '',
        testDate: '',
        branchLockDate: '',
        preProdDate: '',
        releaseDate: '',
        order: releases.length + 1,
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
  const handleSave = () => {
    if (editingRelease) {
      // Güncelleme
      setReleases(prev => prev.map(r => 
        r.id === editingRelease.id 
          ? { ...r, ...formData }
          : r
      ));
    } else {
      // Yeni ekleme
      const newRelease = {
        id: Math.max(...releases.map(r => r.id)) + 1,
        ...formData
      };
      setReleases(prev => [...prev, newRelease]);
    }
    handleCloseDialog();
  };

  // Silme
  const handleDelete = (id) => {
    if (window.confirm('Bu versiyonu silmek istediğinizden emin misiniz?')) {
      setReleases(prev => prev.filter(r => r.id !== id));
    }
  };

  // Tarihe göre sıralama
  const sortedReleases = [...releases].sort((a, b) => b.order - a.order);

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
                Release Takvimi
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Planlanan ve yayınlanan versiyonların yönetimi
              </Typography>
            </Box>
          </Box>
          <CalendarIcon sx={{ fontSize: 64, color: 'primary.main', opacity: 0.7 }} />
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
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
      <TableContainer component={Paper} elevation={3}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.light' }}>
              <TableCell><strong>Sıra</strong></TableCell>
              <TableCell><strong>Versiyon</strong></TableCell>
              <TableCell><strong>Durum</strong></TableCell>
              <TableCell><strong>Master Başlangıç</strong></TableCell>
              <TableCell><strong>Test Tarihi</strong></TableCell>
              <TableCell><strong>Branch Lock</strong></TableCell>
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
                    <Chip label={release.order} size="small" variant="outlined" />
                  </TableCell>
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
                  <TableCell>{formatDate(release.branchLockDate)}</TableCell>
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
                label="Branch Lock Tarihi"
                type="date"
                value={formData.branchLockDate}
                onChange={(e) => handleFormChange('branchLockDate', e.target.value)}
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
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Sıra"
                type="number"
                value={formData.order}
                onChange={(e) => handleFormChange('order', parseInt(e.target.value))}
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

export default ReleaseCalendar;
