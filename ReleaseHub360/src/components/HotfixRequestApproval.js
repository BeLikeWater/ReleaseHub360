import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Alert,
  Snackbar,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  useMediaQuery,
  useTheme,
  Stepper,
  Step,
  StepLabel,
  Tabs,
  Tab,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  BugReport as HotfixIcon,
  Close as CloseIcon,
  Science as SandboxIcon,
  CloudUpload as PublishIcon,
  AccessTime as WaitingIcon,
} from '@mui/icons-material';

const HotfixRequestApproval = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState(''); // 'approve' or 'reject'
  const [comment, setComment] = useState('');
  const [releaseNote, setReleaseNote] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [tabValue, setTabValue] = useState(0); // 0: Initial Approvals, 1: Release Approvals

  // Mock current approver
  const currentApprover = {
    name: 'Ali Veli',
    email: 'ali.veli@company.com',
  };

  // Mock hotfix requests needing approval
  const [requests, setRequests] = useState([
    {
      id: 1,
      service: 'Core API',
      version: 'v6.2.0',
      requestedBy: 'Ahmet Yılmaz',
      requestedByEmail: 'ahmet.yilmaz@company.com',
      requestDate: '2025-10-18 14:30',
      workItems: [
        { 
          id: 123456, 
          title: 'Payment gateway timeout fix',
          type: 'Bug',
          priority: 'High',
        }
      ],
      reason: 'Kritik ödeme hatası - müşteri işlemleri durdu. Bir sonraki versiyonu bekleyemeyiz.',
      status: 'waiting_approval', // Initial approval needed
    },
    {
      id: 2,
      service: 'Payment Service',
      version: 'v6.3.0',
      requestedBy: 'Ayşe Demir',
      requestedByEmail: 'ayse.demir@company.com',
      requestDate: '2025-10-19 09:15',
      workItems: [
        { 
          id: 123457, 
          title: 'Currency conversion error',
          type: 'Bug',
          priority: 'Medium',
        }
      ],
      reason: 'Döviz kurları yanlış hesaplanıyor, finansal raporlar hatalı.',
      status: 'waiting_approval',
    },
    {
      id: 3,
      service: 'Auth Service',
      version: 'v6.2.0',
      requestedBy: 'Can Öztürk',
      requestedByEmail: 'can.ozturk@company.com',
      requestDate: '2025-10-19 10:00',
      workItems: [
        { 
          id: 123458, 
          title: 'Auth token expiration problem',
          type: 'Bug',
          priority: 'Critical',
        }
      ],
      reason: 'Token expiration hatası kullanıcı deneyimini olumsuz etkiliyor. Günlük 1000+ kullanıcı etkileniyor.',
      status: 'waiting_release_approval', // Ready for customer release, needs final approval
      sandboxTestDate: '2025-10-20 15:30',
      sandboxTestResult: 'Başarılı - Tüm senaryolar test edildi',
    },
    {
      id: 4,
      service: 'Notification Service',
      version: 'v6.4.0',
      requestedBy: 'Mehmet Kaya',
      requestedByEmail: 'mehmet.kaya@company.com',
      requestDate: '2025-10-20 08:00',
      workItems: [
        { 
          id: 123459, 
          title: 'Email notification not sent',
          type: 'Bug',
          priority: 'High',
        }
      ],
      reason: 'E-posta bildirimleri gönderilmiyor, müşteri iletişimi kopuyor.',
      status: 'waiting_release_approval',
      sandboxTestDate: '2025-10-20 16:00',
      sandboxTestResult: 'Başarılı - Email gönderimi doğrulandı',
    },
  ]);

  // Helper functions for status steps (same as HotfixRequest.js)
  const getStatusSteps = () => [
    'Waiting Approval',
    'Ready for PR',
    'Published to Sandbox',
    'Waiting Release Approval',
    'Published to Customers'
  ];

  const getActiveStep = (status) => {
    const steps = {
      'waiting_approval': 0,
      'ready_for_pr': 1,
      'published_to_sandbox': 2,
      'waiting_release_approval': 3,
      'published_to_customers': 4,
    };
    return steps[status] || 0;
  };

  const handleOpenDialog = (request, action) => {
    setSelectedRequest(request);
    setActionType(action);
    setDialogOpen(true);
    // Pre-fill release note for release approval if available
    if (request.status === 'waiting_release_approval' && request.workItems[0]) {
      setReleaseNote(`${request.service} ${request.version} - ${request.workItems[0].title} düzeltildi.`);
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedRequest(null);
    setActionType('');
    setComment('');
    setReleaseNote('');
  };

  const handleSubmitAction = () => {
    let newStatus;
    let message;
    
    if (selectedRequest.status === 'waiting_approval') {
      // Initial approval
      newStatus = actionType === 'approve' ? 'ready_for_pr' : 'rejected';
      message = actionType === 'approve' 
        ? `Hotfix talebi onaylandı! Developer PR oluşturabilir.` 
        : `Hotfix talebi reddedildi.`;
    } else if (selectedRequest.status === 'waiting_release_approval') {
      // Release approval
      newStatus = actionType === 'approve' ? 'published_to_customers' : 'published_to_sandbox';
      message = actionType === 'approve' 
        ? `Hotfix müşterilere yayınlandı!` 
        : `Hotfix yayınlama onayı reddedildi. Sandbox'ta kalıyor.`;
    }
    
    setRequests(prev =>
      prev.map(req =>
        req.id === selectedRequest.id ? { ...req, status: newStatus } : req
      )
    );

    setSnackbar({
      open: true,
      message: message,
      severity: actionType === 'approve' ? 'success' : 'warning',
    });

    handleCloseDialog();
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Filter requests by approval type
  const initialApprovals = requests.filter(req => req.status === 'waiting_approval');
  const releaseApprovals = requests.filter(req => req.status === 'waiting_release_approval');

  return (
    <Box sx={{ pb: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <HotfixIcon color="error" />
        Hotfix Onay Yönetimi
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
        Hotfix taleplerini ve yayın onaylarını yönetin
      </Typography>

      {/* Tabs for different approval types */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={(e, newValue) => setTabValue(newValue)}
          variant={isMobile ? "fullWidth" : "standard"}
        >
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WaitingIcon />
                <span>İlk Onay ({initialApprovals.length})</span>
              </Box>
            }
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PublishIcon />
                <span>Yayınlama Onayı ({releaseApprovals.length})</span>
              </Box>
            }
          />
        </Tabs>
      </Paper>

      {/* Tab 0: Initial Approvals */}
      {tabValue === 0 && (
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>İlk Onay:</strong> Developer'ın hotfix talebi için ilk onayı verin. 
              Onaylandığında developer PR oluşturabilir ve sandbox'a deploy edebilir.
            </Typography>
          </Alert>

          {/* Initial Approval Cards */}
          <Grid container spacing={isMobile ? 2 : 3}>
            {initialApprovals.map((request) => (
              <Grid item xs={12} key={request.id}>
                <Card 
                  elevation={3}
                  sx={{ 
                    border: '2px solid',
                    borderColor: 'primary.main',
                  }}
                >
                  <CardContent sx={{ pb: 1 }}>
                    {/* Header with Service and Version */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                        {request.service}
                      </Typography>
                      <Chip
                        label={request.version}
                        color="primary"
                        size="small"
                      />
                    </Box>

                    {/* Roadmap Stepper */}
                    <Box sx={{ mb: 3, bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                      <Stepper activeStep={getActiveStep(request.status)} alternativeLabel>
                        {getStatusSteps().map((label) => (
                          <Step key={label}>
                            <StepLabel 
                              sx={{
                                '& .MuiStepLabel-label': {
                                  fontSize: '0.7rem',
                                  mt: 0.5,
                                }
                              }}
                            >
                              {label}
                            </StepLabel>
                          </Step>
                        ))}
                      </Stepper>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Request Details */}
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Stack spacing={1.5}>
                          {/* Requester */}
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Talep Eden
                            </Typography>
                            <Typography variant="body2" fontWeight="medium">
                              {request.requestedBy}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {request.requestedByEmail}
                            </Typography>
                          </Box>

                          {/* Date */}
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Talep Tarihi
                            </Typography>
                            <Typography variant="body2">
                              {request.requestDate}
                            </Typography>
                          </Box>
                        </Stack>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <Stack spacing={1.5}>
                          {/* Work Items */}
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Work Items
                            </Typography>
                            {request.workItems.map((item, idx) => (
                              <Chip
                                key={idx}
                                label={`#${item.id} - ${item.title}`}
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ mt: 0.5, mr: 0.5 }}
                              />
                            ))}
                          </Box>
                        </Stack>
                      </Grid>

                      {/* Reason */}
                      {request.reason && (
                        <Grid item xs={12}>
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Hotfix Nedeni
                            </Typography>
                            <Alert severity="warning" sx={{ mt: 0.5 }}>
                              <Typography variant="body2">
                                {request.reason}
                              </Typography>
                            </Alert>
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>

                  {/* Actions */}
                  <CardActions sx={{ p: 2, pt: 0, gap: 1 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      color="success"
                      startIcon={<ApproveIcon />}
                      onClick={() => handleOpenDialog(request, 'approve')}
                      size={isMobile ? 'medium' : 'large'}
                    >
                      Onayla
                    </Button>
                    <Button
                      fullWidth
                      variant="outlined"
                      color="error"
                      startIcon={<RejectIcon />}
                      onClick={() => handleOpenDialog(request, 'reject')}
                      size={isMobile ? 'medium' : 'large'}
                    >
                      Reddet
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {initialApprovals.length === 0 && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                🎉 İlk onay bekleyen talep bulunmuyor
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tüm talepler onaylanmış veya reddedilmiş
              </Typography>
            </Paper>
          )}
        </Box>
      )}

      {/* Tab 1: Release Approvals */}
      {tabValue === 1 && (
        <Box>
          <Alert severity="success" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Yayınlama Onayı:</strong> Sandbox'ta test edilmiş hotfixleri müşterilere yayınlamak için onay verin.
              Release note girişi zorunludur.
            </Typography>
          </Alert>

          {/* Release Approval Cards */}
          <Grid container spacing={isMobile ? 2 : 3}>
            {releaseApprovals.map((request) => (
              <Grid item xs={12} key={request.id}>
                <Card 
                  elevation={3}
                  sx={{ 
                    border: '2px solid',
                    borderColor: 'success.main',
                  }}
                >
                  <CardContent sx={{ pb: 1 }}>
                    {/* Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                        {request.service}
                      </Typography>
                      <Chip
                        label={request.version}
                        color="success"
                        size="small"
                      />
                    </Box>

                    {/* Roadmap Stepper */}
                    <Box sx={{ mb: 3, bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
                      <Stepper activeStep={getActiveStep(request.status)} alternativeLabel>
                        {getStatusSteps().map((label) => (
                          <Step key={label}>
                            <StepLabel 
                              sx={{
                                '& .MuiStepLabel-label': {
                                  fontSize: '0.7rem',
                                  mt: 0.5,
                                }
                              }}
                            >
                              {label}
                            </StepLabel>
                          </Step>
                        ))}
                      </Stepper>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Request Details */}
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Stack spacing={1.5}>
                          {/* Requester */}
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Talep Eden
                            </Typography>
                            <Typography variant="body2" fontWeight="medium">
                              {request.requestedBy}
                            </Typography>
                          </Box>

                          {/* Sandbox Test Info */}
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Sandbox Test
                            </Typography>
                            <Chip
                              icon={<SandboxIcon />}
                              label={request.sandboxTestResult}
                              size="small"
                              color="success"
                              sx={{ mt: 0.5 }}
                            />
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                              Test Tarihi: {request.sandboxTestDate}
                            </Typography>
                          </Box>
                        </Stack>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <Stack spacing={1.5}>
                          {/* Work Items */}
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Work Items
                            </Typography>
                            {request.workItems.map((item, idx) => (
                              <Chip
                                key={idx}
                                label={`#${item.id} - ${item.title}`}
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ mt: 0.5, mr: 0.5 }}
                              />
                            ))}
                          </Box>
                        </Stack>
                      </Grid>
                    </Grid>
                  </CardContent>

                  {/* Actions */}
                  <CardActions sx={{ p: 2, pt: 0, gap: 1 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      color="success"
                      startIcon={<PublishIcon />}
                      onClick={() => handleOpenDialog(request, 'approve')}
                      size={isMobile ? 'medium' : 'large'}
                    >
                      Müşterilere Yayınla
                    </Button>
                    <Button
                      fullWidth
                      variant="outlined"
                      color="error"
                      startIcon={<RejectIcon />}
                      onClick={() => handleOpenDialog(request, 'reject')}
                      size={isMobile ? 'medium' : 'large'}
                    >
                      Reddet
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {releaseApprovals.length === 0 && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                📦 Yayınlama onayı bekleyen hotfix bulunmuyor
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sandbox'ta test bekleyen veya henüz hazır olmayan hotfixler var
              </Typography>
            </Paper>
          )}
        </Box>
      )}

      {/* Approval/Rejection Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {selectedRequest?.status === 'waiting_approval' 
                ? (actionType === 'approve' ? 'Hotfix Talebini Onayla' : 'Hotfix Talebini Reddet')
                : (actionType === 'approve' ? 'Müşterilere Yayınla' : 'Yayınlama Onayını Reddet')
              }
            </Typography>
            {isMobile && (
              <IconButton onClick={handleCloseDialog} size="small">
                <CloseIcon />
              </IconButton>
            )}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedRequest && (
            <Box>
              {/* Request Summary */}
              <Paper sx={{ p: 2, bgcolor: 'grey.50', mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                  Talep Özeti
                </Typography>
                <List dense>
                  <ListItem disableGutters>
                    <ListItemText
                      primary="Servis"
                      secondary={selectedRequest.service}
                      primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                      secondaryTypographyProps={{ variant: 'body2', fontWeight: 'bold' }}
                    />
                  </ListItem>
                  <ListItem disableGutters>
                    <ListItemText
                      primary="Versiyon"
                      secondary={selectedRequest.version}
                      primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                      secondaryTypographyProps={{ variant: 'body2', fontWeight: 'bold' }}
                    />
                  </ListItem>
                  <ListItem disableGutters>
                    <ListItemText
                      primary="Talep Eden"
                      secondary={`${selectedRequest.requestedBy} (${selectedRequest.requestedByEmail})`}
                      primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                      secondaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                  <ListItem disableGutters>
                    <ListItemText
                      primary="Work Items"
                      secondary={selectedRequest.workItems.map(item => `#${item.id} - ${item.title}`).join(', ')}
                      primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                      secondaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                </List>
              </Paper>

              {/* Roadmap Progress */}
              <Paper sx={{ p: 2, bgcolor: 'info.lighter', mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                  �️ Süreç Durumu
                </Typography>
                <Stepper activeStep={getActiveStep(selectedRequest.status)} alternativeLabel sx={{ mt: 2 }}>
                  {getStatusSteps().map((label) => (
                    <Step key={label}>
                      <StepLabel 
                        sx={{
                          '& .MuiStepLabel-label': {
                            fontSize: '0.7rem',
                            mt: 0.5,
                          }
                        }}
                      >
                        {label}
                      </StepLabel>
                    </Step>
                  ))}
                </Stepper>
              </Paper>

              {/* Sandbox Test Info - Only for Release Approval */}
              {selectedRequest.status === 'waiting_release_approval' && selectedRequest.sandboxTestDate && (
                <Paper sx={{ p: 2, bgcolor: 'success.lighter', mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                    🧪 Sandbox Test Sonuçları
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>Test Tarihi:</strong> {selectedRequest.sandboxTestDate}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    <strong>Sonuç:</strong> {selectedRequest.sandboxTestResult}
                  </Typography>
                </Paper>
              )}

              {/* Reason - For Initial Approval */}
              {selectedRequest.status === 'waiting_approval' && selectedRequest.reason && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Hotfix Nedeni
                  </Typography>
                  <Typography variant="body2">
                    {selectedRequest.reason}
                  </Typography>
                </Alert>
              )}

              {/* Release Note Field - Only for Release Approval */}
              {selectedRequest.status === 'waiting_release_approval' && actionType === 'approve' && (
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Release Note (Zorunlu)"
                  value={releaseNote}
                  onChange={(e) => setReleaseNote(e.target.value)}
                  placeholder="Release note giriniz..."
                  required
                  sx={{ mb: 2 }}
                  helperText="Müşterilere gösterilecek release note"
                />
              )}

              {/* Comment Field */}
              <TextField
                fullWidth
                multiline
                rows={3}
                label={actionType === 'approve' ? 'Onay Notu (Opsiyonel)' : 'Red Nedeni (Zorunlu)'}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  actionType === 'approve'
                    ? 'İsteğe bağlı onay notunuzu girebilirsiniz...'
                    : 'Lütfen red nedenini açıklayınız...'
                }
                required={actionType === 'reject'}
                helperText={
                  actionType === 'reject' && !comment
                    ? 'Red nedeni zorunludur'
                    : ''
                }
              />

              {/* Approver Info */}
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="caption">
                  <strong>Onaylayan:</strong> {currentApprover.name} ({currentApprover.email})
                </Typography>
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDialog} variant="outlined">
            İptal
          </Button>
          <Button
            onClick={handleSubmitAction}
            variant="contained"
            color={actionType === 'approve' ? 'success' : 'error'}
            disabled={
              (actionType === 'reject' && !comment.trim()) ||
              (actionType === 'approve' && selectedRequest?.status === 'waiting_release_approval' && !releaseNote.trim())
            }
          >
            {selectedRequest?.status === 'waiting_approval'
              ? (actionType === 'approve' ? 'Onayla' : 'Reddet')
              : (actionType === 'approve' ? 'Müşterilere Yayınla' : 'Reddet')
            }
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

export default HotfixRequestApproval;
