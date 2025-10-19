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
  Tooltip,
  Stack,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Info as InfoIcon,
  BugReport as HotfixIcon,
  Description as NoteIcon,
  Link as LinkIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Warning as WarningIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

const HotfixRequestApproval = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState(''); // 'approve' or 'reject'
  const [comment, setComment] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Mock current approver
  const currentApprover = {
    name: 'Ali Veli',
    email: 'ali.veli@company.com',
  };

  // Mock pending hotfix requests
  const [pendingRequests, setPendingRequests] = useState([
    {
      id: 1,
      service: 'Core API',
      version: 'v6.2.0',
      isReleased: true,
      requestedBy: 'Ahmet Yılmaz',
      requestedByEmail: 'ahmet.yilmaz@company.com',
      requestDate: '2025-10-18 14:30',
      workItems: [
        { 
          id: 123456, 
          title: 'Payment gateway timeout fix',
          type: 'Bug',
          priority: 'High',
          assignedTo: 'Ahmet Yılmaz',
          releaseNote: 'Ödeme gateway zaman aşımı sorunu düzeltildi. Timeout değeri 30 saniyeye çıkarıldı ve retry mekanizması eklendi.',
          impact: 'Müşteri ödeme işlemlerinde yaşanan kesintiler giderilecek.',
          testingNotes: 'Tüm ödeme senaryoları test edildi. Load test sonuçları başarılı.',
        }
      ],
      dependentHotfixes: [],
      reason: 'Kritik ödeme hatası - müşteri işlemleri durdu. Bir sonraki versiyonu bekleyemeyiz.',
      status: 'pending',
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
      workItems: [
        { 
          id: 123458, 
          title: 'Auth token expiration problem',
          type: 'Bug',
          priority: 'Critical',
          assignedTo: 'Can Öztürk',
          releaseNote: 'Token süre dolum hatası düzeltildi. Refresh token mekanizması iyileştirildi.',
          impact: 'Kullanıcılar artık oturum süreleri beklenmedik şekilde sonlanmayacak.',
          testingNotes: 'Token yenileme mekanizması test edildi. Edge case senaryoları kapsandı.',
        }
      ],
      dependentHotfixes: [
        { id: 1, service: 'Core API', version: 'v6.2.0', requestedBy: 'Ahmet Yılmaz' }
      ],
      reason: 'Token expiration hatası kullanıcı deneyimini olumsuz etkiliyor. Günlük 1000+ kullanıcı etkileniyor.',
      status: 'pending',
    },
    {
      id: 4,
      service: 'Customer Service',
      version: 'v6.3.0',
      isReleased: false,
      requestedBy: 'Zeynep Kara',
      requestedByEmail: 'zeynep.kara@company.com',
      requestDate: '2025-10-19 11:30',
      workItems: [],
      dependentHotfixes: [],
      reason: '',
      status: 'pending',
    },
  ]);

  const handleOpenDialog = (request, action) => {
    setSelectedRequest(request);
    setActionType(action);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedRequest(null);
    setActionType('');
    setComment('');
  };

  const handleSubmitAction = () => {
    const newStatus = actionType === 'approve' ? 'approved' : 'rejected';
    
    setPendingRequests(prev =>
      prev.map(req =>
        req.id === selectedRequest.id ? { ...req, status: newStatus } : req
      )
    );

    setSnackbar({
      open: true,
      message: actionType === 'approve' 
        ? `Hotfix talebi onaylandı!` 
        : `Hotfix talebi reddedildi!`,
      severity: actionType === 'approve' ? 'success' : 'warning',
    });

    handleCloseDialog();
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Filter only pending requests
  const activePendingRequests = pendingRequests.filter(req => req.status === 'pending');

  return (
    <Box sx={{ pb: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <HotfixIcon color="error" />
        Hotfix Request Approval
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
        Bekleyen hotfix taleplerini onaylayın veya reddedin
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          ℹ️ <strong>Not:</strong> Henüz değişiklik girilmediği için AI analizi yapılamıyor. 
          Onay için work item detayları ve talep nedeni kontrol edilmelidir.
        </Typography>
      </Alert>

      {/* Pending Requests Cards */}
      <Grid container spacing={isMobile ? 2 : 3}>
        {activePendingRequests.map((request) => (
          <Grid item xs={12} sm={12} md={6} lg={4} key={request.id}>
            <Card 
              elevation={3}
              sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                border: request.isReleased ? '2px solid' : '1px solid',
                borderColor: request.isReleased ? 'warning.main' : 'grey.300',
              }}
            >
              <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                    {request.service}
                  </Typography>
                  <Tooltip 
                    title={request.isReleased 
                      ? "Bu versiyon yayınlanmış - Detaylı bilgi gerekli" 
                      : "Bu versiyon freeze aşamasında - Basit onay"
                    }
                  >
                    <Chip
                      label={request.version}
                      color={request.isReleased ? 'success' : 'warning'}
                      size="small"
                    />
                  </Tooltip>
                </Box>

                {/* Version Status Badge */}
                <Box sx={{ mb: 2 }}>
                  <Chip
                    icon={request.isReleased ? <WarningIcon /> : <InfoIcon />}
                    label={request.isReleased ? 'Released Version' : 'Freeze Version'}
                    size="small"
                    variant="outlined"
                    color={request.isReleased ? 'error' : 'info'}
                  />
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Request Info */}
                <Stack spacing={1.5}>
                  {/* Requester */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <PersonIcon fontSize="small" color="action" />
                    <Box sx={{ flexGrow: 1 }}>
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
                  </Box>

                  {/* Date */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarIcon fontSize="small" color="action" />
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Tarih
                      </Typography>
                      <Typography variant="body2">
                        {request.requestDate}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Work Items - Only for Released */}
                  {request.isReleased && (
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <LinkIcon fontSize="small" color="action" />
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Work Items
                        </Typography>
                        {request.workItems.map((item, idx) => (
                          <Tooltip 
                            key={idx}
                            title={
                              <Box>
                                <Typography variant="caption" fontWeight="bold">{item.title}</Typography>
                                <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                  <strong>Release Note:</strong> {item.releaseNote}
                                </Typography>
                                <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                  <strong>Impact:</strong> {item.impact}
                                </Typography>
                              </Box>
                            }
                            arrow
                          >
                            <Chip
                              label={`#${item.id}`}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ mt: 0.5, mr: 0.5, cursor: 'help' }}
                            />
                          </Tooltip>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Dependent Hotfixes */}
                  {request.dependentHotfixes.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <LinkIcon fontSize="small" color="action" />
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Bağımlı Hotfixler
                        </Typography>
                        {request.dependentHotfixes.map((dep, idx) => (
                          <Chip
                            key={idx}
                            label={dep.service}
                            size="small"
                            variant="outlined"
                            sx={{ mt: 0.5, mr: 0.5 }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Reason - Only for Released */}
                  {request.isReleased && request.reason && (
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <NoteIcon fontSize="small" color="action" />
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Hotfix Nedeni
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            mt: 0.5,
                            p: 1,
                            bgcolor: 'warning.lighter',
                            borderRadius: 1,
                            fontSize: '0.875rem',
                          }}
                        >
                          {request.reason}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {/* Freeze Info */}
                  {!request.isReleased && (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      <Typography variant="caption">
                        Freeze versiyonu için basit onay yeterlidir
                      </Typography>
                    </Alert>
                  )}
                </Stack>
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

      {activePendingRequests.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            🎉 Bekleyen hotfix talebi bulunmuyor
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tüm talepler işleme alınmış
          </Typography>
        </Paper>
      )}

      {/* Approval/Rejection Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {actionType === 'approve' ? 'Hotfix Talebini Onayla' : 'Hotfix Talebini Reddet'}
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
                      secondary={
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                          <Chip label={selectedRequest.version} size="small" color="primary" />
                          <Chip 
                            label={selectedRequest.isReleased ? 'Released' : 'Freeze'} 
                            size="small" 
                            color={selectedRequest.isReleased ? 'success' : 'warning'}
                          />
                        </Box>
                      }
                      primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
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
                </List>
              </Paper>

              {/* Work Item Details - Only for Released */}
              {selectedRequest.isReleased && selectedRequest.workItems.length > 0 && (
                <Paper sx={{ p: 2, bgcolor: 'info.lighter', mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                    📋 Work Item Detayları
                  </Typography>
                  {selectedRequest.workItems.map((item, idx) => (
                    <Box key={idx} sx={{ mt: 2 }}>
                      <Typography variant="body2" fontWeight="bold">
                        #{item.id} - {item.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                        <strong>Type:</strong> {item.type} | <strong>Priority:</strong> {item.priority}
                      </Typography>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        <strong>Release Note:</strong> {item.releaseNote}
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        <strong>Impact:</strong> {item.impact}
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        <strong>Testing:</strong> {item.testingNotes}
                      </Typography>
                    </Box>
                  ))}
                </Paper>
              )}

              {/* Comment Field */}
              <TextField
                fullWidth
                multiline
                rows={4}
                label={actionType === 'approve' ? 'Onay Notu (Opsiyonel)' : 'Red Nedeni'}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  actionType === 'approve'
                    ? 'Onay notunuzu girebilirsiniz...'
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
            disabled={actionType === 'reject' && !comment.trim()}
          >
            {actionType === 'approve' ? 'Onayla' : 'Reddet'}
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
