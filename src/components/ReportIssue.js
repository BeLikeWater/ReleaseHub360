import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  CircularProgress,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Grid
} from '@mui/material';
import {
  BugReport as BugIcon,
  CloudUpload as UploadIcon,
  Email as EmailIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Storage as PodIcon,
  Description as LogIcon,
  Send as SendIcon,
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';

const ReportIssue = () => {
  const navigate = useNavigate();
  const [environmentDialogOpen, setEnvironmentDialogOpen] = useState(false);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [processComplete, setProcessComplete] = useState(false);
  const [failedPods, setFailedPods] = useState([]);
  const [collectedLogs, setCollectedLogs] = useState([]);

  const environments = [
    { value: 'dev', label: 'Development (DEV)', color: 'info' },
    { value: 'test', label: 'Test (TEST)', color: 'warning' },
    { value: 'uat', label: 'User Acceptance Test (UAT)', color: 'secondary' },
    { value: 'prod', label: 'Production (PROD)', color: 'error' }
  ];

  const steps = [
    {
      label: 'Kubernetes API Bağlantısı',
      description: 'Ortam bağlantısı kontrol ediliyor...',
      icon: <RefreshIcon />
    },
    {
      label: 'Pod Durumları Kontrol Ediliyor',
      description: 'Ayakta olmayan pod\'lar tespit ediliyor...',
      icon: <PodIcon />
    },
    {
      label: 'Log Toplama',
      description: 'Hatalı pod logları toplanıyor...',
      icon: <LogIcon />
    },
    {
      label: 'Dosya Oluşturma',
      description: 'Log dosyası hazırlanıyor...',
      icon: <UploadIcon />
    },
    {
      label: 'E-posta Gönderimi',
      description: 'Support ekibine mail gönderiliyor...',
      icon: <EmailIcon />
    }
  ];

  const handleOpenEnvironmentDialog = () => {
    setEnvironmentDialogOpen(true);
    setSelectedEnvironment('');
    setIssueDescription('');
  };

  const handleCloseEnvironmentDialog = () => {
    setEnvironmentDialogOpen(false);
  };

  const handleStartProcess = () => {
    if (!selectedEnvironment) {
      return;
    }
    
    setEnvironmentDialogOpen(false);
    setProgressDialogOpen(true);
    setActiveStep(0);
    setProcessComplete(false);
    setFailedPods([]);
    setCollectedLogs([]);
    
    // Süreci başlat
    simulateProcess();
  };

  const simulateProcess = async () => {
    // Adım 1: Kubernetes API Bağlantısı
    await new Promise(resolve => setTimeout(resolve, 1500));
    setActiveStep(1);

    // Adım 2: Pod Durumları Kontrol
    await new Promise(resolve => setTimeout(resolve, 2000));
    const mockFailedPods = [
      { name: 'payment-service-7d8f9b-x7k2m', namespace: 'backend', status: 'CrashLoopBackOff', restarts: 5 },
      { name: 'auth-service-5c6a8d-p9m3n', namespace: 'backend', status: 'Error', restarts: 3 },
      { name: 'notification-worker-4b5c7e-q8r4p', namespace: 'workers', status: 'ImagePullBackOff', restarts: 0 }
    ];
    setFailedPods(mockFailedPods);
    setActiveStep(2);

    // Adım 3: Log Toplama
    await new Promise(resolve => setTimeout(resolve, 2500));
    const mockLogs = mockFailedPods.map(pod => ({
      podName: pod.name,
      namespace: pod.namespace,
      logSize: `${Math.floor(Math.random() * 500 + 100)} KB`,
      lines: Math.floor(Math.random() * 5000 + 1000)
    }));
    setCollectedLogs(mockLogs);
    setActiveStep(3);

    // Adım 4: Dosya Oluşturma
    await new Promise(resolve => setTimeout(resolve, 1500));
    setActiveStep(4);

    // Adım 5: E-posta Gönderimi
    await new Promise(resolve => setTimeout(resolve, 2000));
    setActiveStep(5);
    setProcessComplete(true);
  };

  const handleCloseProgressDialog = () => {
    setProgressDialogOpen(false);
    setActiveStep(0);
    setProcessComplete(false);
  };

  const getEnvironmentColor = (env) => {
    const environment = environments.find(e => e.value === env);
    return environment ? environment.color : 'default';
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/releases')}
            variant="outlined"
            size="small"
          >
            Geri
          </Button>
          <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BugIcon fontSize="large" color="error" />
            Hata Bildir
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Ortamda yaşanan sorunları otomatik olarak tespit edin ve destek ekibine iletin
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Ana Aksiyon Kartı */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 4, textAlign: 'center', height: '100%' }}>
            <BugIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Sorun Bildirimi Başlat
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Sistem otomatik olarak ortamdaki hatalı pod'ları tespit edecek, 
              loglarını toplayacak ve destek ekibine e-posta ile gönderecektir.
            </Typography>
            <Button
              variant="contained"
              size="large"
              color="error"
              startIcon={<BugIcon />}
              onClick={handleOpenEnvironmentDialog}
              sx={{ mt: 2 }}
            >
              Hata Bildirimi Yap
            </Button>
          </Paper>
        </Grid>

        {/* Bilgi Kartı */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 4, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Otomatik Süreç Adımları
            </Typography>
            <List dense>
              {steps.map((step, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemIcon>
                      {step.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={step.label}
                      secondary={step.description}
                    />
                  </ListItem>
                  {index < steps.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Bilgilendirme Alanı */}
        <Grid item xs={12}>
          <Alert severity="info" icon={<EmailIcon />}>
            <Typography variant="subtitle2" gutterBottom>
              <strong>Not:</strong> E-posta Bilgilendirmesi
            </Typography>
            <Typography variant="body2">
              Süreç tamamlandıktan sonra, kopyası size de gönderilecek olan destek talebi için 
              e-posta kutunuzu kontrol edebilirsiniz. Destek ekibi en kısa sürede size dönüş yapacaktır.
            </Typography>
          </Alert>
        </Grid>
      </Grid>

      {/* Ortam Seçimi Dialog */}
      <Dialog
        open={environmentDialogOpen}
        onClose={handleCloseEnvironmentDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BugIcon color="error" />
            <Typography variant="h6">Ortam Seçimi</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Ortam</InputLabel>
              <Select
                value={selectedEnvironment}
                onChange={(e) => setSelectedEnvironment(e.target.value)}
                label="Ortam"
              >
                {environments.map((env) => (
                  <MenuItem key={env.value} value={env.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label={env.label} size="small" color={env.color} />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={4}
              label="Sorun Açıklaması (Opsiyonel)"
              placeholder="Yaşadığınız sorunu kısaca açıklayabilirsiniz..."
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              variant="outlined"
            />

            <Alert severity="warning" sx={{ mt: 2 }}>
              Seçilen ortamdaki tüm namespace'ler taranacak ve hatalı pod logları toplanacaktır.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEnvironmentDialog} startIcon={<CloseIcon />}>
            İptal
          </Button>
          <Button
            onClick={handleStartProcess}
            variant="contained"
            color="error"
            disabled={!selectedEnvironment}
            startIcon={<SendIcon />}
          >
            Başlat
          </Button>
        </DialogActions>
      </Dialog>

      {/* İşlem Süreci Dialog */}
      <Dialog
        open={progressDialogOpen}
        onClose={processComplete ? handleCloseProgressDialog : undefined}
        maxWidth="md"
        fullWidth
        disableEscapeKeyDown={!processComplete}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {processComplete ? <CheckIcon color="success" /> : <RefreshIcon color="primary" />}
              <Typography variant="h6">
                {processComplete ? 'İşlem Tamamlandı' : 'Hata Bildirimi İşleniyor'}
              </Typography>
            </Box>
            {selectedEnvironment && (
              <Chip 
                label={environments.find(e => e.value === selectedEnvironment)?.label} 
                size="small" 
                color={getEnvironmentColor(selectedEnvironment)}
              />
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((step, index) => (
              <Step key={index}>
                <StepLabel
                  optional={
                    index === activeStep && !processComplete && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <CircularProgress size={16} />
                        <Typography variant="caption">İşleniyor...</Typography>
                      </Box>
                    )
                  }
                  StepIconComponent={() => (
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: index < activeStep ? 'success.main' : index === activeStep ? 'primary.main' : 'grey.300',
                        color: 'white'
                      }}
                    >
                      {index < activeStep ? <CheckIcon /> : step.icon}
                    </Box>
                  )}
                >
                  {step.label}
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary">
                    {step.description}
                  </Typography>

                  {/* Adım 2: Hatalı Pod'lar göster */}
                  {index === 1 && failedPods.length > 0 && activeStep > 1 && (
                    <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Tespit Edilen Hatalı Pod'lar: {failedPods.length}
                      </Typography>
                      <List dense>
                        {failedPods.map((pod, idx) => (
                          <ListItem key={idx}>
                            <ListItemIcon>
                              <ErrorIcon color="error" />
                            </ListItemIcon>
                            <ListItemText
                              primary={pod.name}
                              secondary={`Namespace: ${pod.namespace} | Status: ${pod.status} | Restarts: ${pod.restarts}`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Paper>
                  )}

                  {/* Adım 3: Toplanan Loglar */}
                  {index === 2 && collectedLogs.length > 0 && activeStep > 2 && (
                    <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Toplanan Loglar: {collectedLogs.length} dosya
                      </Typography>
                      <List dense>
                        {collectedLogs.map((log, idx) => (
                          <ListItem key={idx}>
                            <ListItemIcon>
                              <LogIcon color="primary" />
                            </ListItemIcon>
                            <ListItemText
                              primary={`${log.podName}.log`}
                              secondary={`${log.logSize} | ${log.lines} satır`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Paper>
                  )}

                  {/* Adım 4: Dosya Bilgisi */}
                  {index === 3 && activeStep > 3 && (
                    <Paper variant="outlined" sx={{ mt: 2, p: 2, bgcolor: 'success.light' }}>
                      <Typography variant="subtitle2" gutterBottom>
                        ✅ Log dosyası başarıyla oluşturuldu
                      </Typography>
                      <Typography variant="caption">
                        {`error-logs-${selectedEnvironment}-${new Date().toISOString().split('T')[0]}.zip`}
                      </Typography>
                    </Paper>
                  )}

                  {/* Adım 5: E-posta Bilgisi */}
                  {index === 4 && processComplete && (
                    <Paper variant="outlined" sx={{ mt: 2, p: 2, bgcolor: 'success.light' }}>
                      <Typography variant="subtitle2" gutterBottom>
                        ✅ E-posta başarıyla gönderildi
                      </Typography>
                      <Typography variant="body2">
                        Alıcı: support@company.com
                      </Typography>
                      <Typography variant="body2">
                        Kopya: your-email@company.com
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        Konu: [{selectedEnvironment.toUpperCase()}] Hata Raporu - {new Date().toLocaleString('tr-TR')}
                      </Typography>
                    </Paper>
                  )}
                </StepContent>
              </Step>
            ))}
          </Stepper>

          {processComplete && (
            <Alert severity="success" sx={{ mt: 3 }} icon={<CheckIcon />}>
              <Typography variant="subtitle2" gutterBottom>
                <strong>İşlem Başarıyla Tamamlandı!</strong>
              </Typography>
              <Typography variant="body2">
                Hata raporu destek ekibine iletildi. E-posta kutunuzu kontrol ederek 
                gönderilen bildirim e-postasını görebilirsiniz. Destek ekibi en kısa sürede 
                size dönüş yapacaktır.
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseProgressDialog}
            variant={processComplete ? 'contained' : 'outlined'}
            disabled={!processComplete}
          >
            Kapat
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ReportIssue;
