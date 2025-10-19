import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Send as SendIcon,
  OpenInNew as OpenInNewIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

const BetaTagRequest = () => {
  const [selectedService, setSelectedService] = useState('');
  const [tagRequests, setTagRequests] = useState([
    {
      id: 1,
      service: 'Core API',
      previousTag: 'v6.2.0-beta.5',
      newTag: 'v6.2.0-beta.6',
      requestedBy: 'Ahmet Yılmaz',
      requestDate: '2025-10-19 10:30',
      status: 'completed',
      pipelineUrl: 'https://dev.azure.com/organization/project/_build/results?buildId=12345',
    },
    {
      id: 2,
      service: 'Payment Service',
      previousTag: 'v6.2.0-beta.3',
      newTag: 'v6.2.0-beta.4',
      requestedBy: 'Ayşe Demir',
      requestDate: '2025-10-19 09:15',
      status: 'completed',
      pipelineUrl: 'https://dev.azure.com/organization/project/_build/results?buildId=12344',
    },
  ]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Mock servis listesi
  const services = [
    { id: 1, name: 'Core API', currentTag: 'v6.2.0-beta.6' },
    { id: 2, name: 'Payment Service', currentTag: 'v6.2.0-beta.4' },
    { id: 3, name: 'Customer Service', currentTag: 'v6.2.0-beta.2' },
    { id: 4, name: 'Auth Service', currentTag: 'v6.2.0-beta.5' },
    { id: 5, name: 'Notification Service', currentTag: 'v6.2.0-beta.3' },
    { id: 6, name: 'Report Service', currentTag: 'v6.2.0-beta.1' },
  ];

  const incrementBetaTag = (currentTag) => {
    // v6.2.0-beta.6 -> v6.2.0-beta.7
    const match = currentTag.match(/^(.*-beta\.)(\d+)$/);
    if (match) {
      const prefix = match[1];
      const number = parseInt(match[2]);
      return `${prefix}${number + 1}`;
    }
    return currentTag;
  };

  const handleRequestBetaTag = () => {
    if (!selectedService) {
      setSnackbar({
        open: true,
        message: 'Lütfen bir servis seçiniz!',
        severity: 'warning',
      });
      return;
    }

    const service = services.find(s => s.name === selectedService);
    const newTag = incrementBetaTag(service.currentTag);
    
    // Yeni tag isteği oluştur
    const newRequest = {
      id: tagRequests.length + 1,
      service: selectedService,
      previousTag: service.currentTag,
      newTag: newTag,
      requestedBy: 'Mehmet Kaya', // Gerçek uygulamada kullanıcı bilgisinden gelecek
      requestDate: new Date().toLocaleString('tr-TR', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      status: 'processing',
      pipelineUrl: `https://dev.azure.com/organization/project/_build/results?buildId=${12345 + tagRequests.length + 1}`,
    };

    setTagRequests([newRequest, ...tagRequests]);
    
    // Mock pipeline başlatma - 2 saniye sonra completed olacak
    setTimeout(() => {
      setTagRequests(prev => prev.map(req => 
        req.id === newRequest.id ? { ...req, status: 'completed' } : req
      ));
      setSnackbar({
        open: true,
        message: `${newTag} başarıyla oluşturuldu!`,
        severity: 'success',
      });
    }, 2000);

    setSnackbar({
      open: true,
      message: `${selectedService} için ${newTag} oluşturuluyor...`,
      severity: 'info',
    });

    // Servis seçimini sıfırla
    setSelectedService('');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'processing':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Tamamlandı';
      case 'processing':
        return 'İşleniyor';
      case 'failed':
        return 'Başarısız';
      default:
        return status;
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SendIcon color="primary" />
        Beta Tag Request
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
        Servis için beta tag oluşturma talebi oluşturun
      </Typography>

      {/* Request Form */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Yeni Beta Tag Talebi
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mt: 2 }}>
          <FormControl sx={{ minWidth: 300 }} size="medium">
            <InputLabel>Servis Seçiniz</InputLabel>
            <Select
              value={selectedService}
              label="Servis Seçiniz"
              onChange={(e) => setSelectedService(e.target.value)}
            >
              {services.map((service) => (
                <MenuItem key={service.id} value={service.name}>
                  <Box>
                    <Typography variant="body1">{service.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Son Tag: {service.currentTag}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<SendIcon />}
            onClick={handleRequestBetaTag}
            disabled={!selectedService}
            sx={{ height: 56 }}
          >
            Beta Tag Request
          </Button>
        </Box>

        {selectedService && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>{selectedService}</strong> için yeni tag:{' '}
              <strong>
                {incrementBetaTag(services.find(s => s.name === selectedService)?.currentTag)}
              </strong>
            </Typography>
          </Alert>
        )}
      </Paper>

      {/* Tag Request History */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Tag Talep Geçmişi
          </Typography>
          <IconButton size="small" color="primary">
            <RefreshIcon />
          </IconButton>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Servis</strong></TableCell>
                <TableCell><strong>Önceki Tag</strong></TableCell>
                <TableCell><strong>Yeni Tag</strong></TableCell>
                <TableCell><strong>Talep Eden</strong></TableCell>
                <TableCell><strong>Tarih</strong></TableCell>
                <TableCell><strong>Durum</strong></TableCell>
                <TableCell align="center"><strong>İşlemler</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tagRequests.map((request) => (
                <TableRow key={request.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {request.service}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={request.previousTag} 
                      size="small" 
                      variant="outlined"
                      color="default"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={request.newTag} 
                      size="small" 
                      color="primary"
                    />
                  </TableCell>
                  <TableCell>{request.requestedBy}</TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {request.requestDate}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={getStatusText(request.status)} 
                      color={getStatusColor(request.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<OpenInNewIcon />}
                      onClick={() => window.open(request.pipelineUrl, '_blank')}
                      disabled={request.status === 'processing'}
                    >
                      Pipeline'a Git
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {tagRequests.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              Henüz beta tag talebi oluşturulmamış
            </Typography>
          </Box>
        )}
      </Paper>

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

export default BetaTagRequest;
