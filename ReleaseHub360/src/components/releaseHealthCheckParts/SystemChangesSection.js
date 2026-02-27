import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Alert,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';

// Mock Data - Değişiklikler
const mockChanges = [
  {
    changeType: 'API Eklendi',
    apiName: 'validatePayment',
    microservice: 'cofins-service-api',
    httpMethod: 'POST',
    apiPath: '/api/v1/payments/validate',
    description: 'Ödeme doğrulama API\'si eklendi',
    breakingChange: false,
    requestModel: {
      name: 'PaymentValidationRequest',
      changes: {
        added: [
          { property: 'transactionId', type: 'string', description: 'Transaction ID' },
          { property: 'amount', type: 'decimal', description: 'Transaction amount' },
          { property: 'currency', type: 'string', description: 'Currency code (TRY, USD, EUR)' },
          { property: 'merchantId', type: 'string', description: 'Merchant ID' }
        ],
        removed: [],
        updated: []
      }
    },
    responseModel: {
      name: 'PaymentValidationResponse',
      changes: {
        added: [
          { property: 'isValid', type: 'boolean', description: 'Validation result' },
          { property: 'errorCode', type: 'string', description: 'Error code if validation fails' },
          { property: 'validatedAt', type: 'datetime', description: 'Validation timestamp' }
        ],
        removed: [],
        updated: []
      }
    }
  },
  {
    changeType: 'API Güncellendi',
    apiName: 'authenticateUser',
    microservice: 'cofins-bff-api',
    httpMethod: 'POST',
    apiPath: '/api/v1/auth/login',
    description: 'Token süresi azaltıldı, refresh token eklendi',
    breakingChange: true,
    breakingChangeDetails: 'LoginResponse modelinden sessionId alanı kaldırıldı. Artık refreshToken kullanılmalı.',
    requestModel: {
      name: 'LoginRequest',
      changes: {
        added: [
          { property: 'deviceInfo', type: 'object', description: 'Device information for security' },
          { property: 'rememberMe', type: 'boolean', description: 'Remember me option' }
        ],
        removed: [],
        updated: [
          { 
            property: 'username', 
            oldType: 'string', 
            newType: 'string', 
            oldDescription: 'Username', 
            newDescription: 'Username or email address' 
          }
        ]
      }
    },
    responseModel: {
      name: 'LoginResponse',
      changes: {
        added: [
          { property: 'refreshToken', type: 'string', description: 'Refresh token' },
          { property: 'expiresIn', type: 'integer', description: 'Token expiry in seconds' }
        ],
        removed: [
          { property: 'sessionId', type: 'string', description: 'Deprecated session ID (BREAKING)' }
        ],
        updated: [
          { 
            property: 'accessToken', 
            oldType: 'string', 
            newType: 'string', 
            oldDescription: '24-hour JWT token', 
            newDescription: '8-hour JWT access token' 
          }
        ]
      }
    }
  },
  {
    changeType: 'API Kaldırıldı',
    apiName: 'getLegacyCustomerData',
    microservice: 'cofins-customerportal',
    httpMethod: 'GET',
    apiPath: '/api/v1/customers/legacy',
    description: 'Eski müşteri veri API\'si kaldırıldı',
    breakingChange: true,
    breakingChangeDetails: 'API tamamen kaldırıldı. Yeni /api/v2/customers endpoint\'i kullanılmalı.',
  },
  {
    changeType: 'Parametre Güncellendi',
    parameterName: 'FILE_UPLOAD_SIZE',
    oldValue: '10 MB',
    newValue: '50 MB',
    description: 'Dosya yükleme boyutu limit artırıldı',
    breakingChange: false,
  },
  {
    changeType: 'Parametre Kaldırıldı',
    parameterName: 'OLD_ENCRYPTION_KEY',
    oldValue: 'AES-128',
    description: 'Eski şifreleme anahtarı kaldırıldı',
    breakingChange: true,
    breakingChangeDetails: 'Eski şifreleme anahtarı kaldırıldı. Tüm sistemler yeni AES-256 anahtarını kullanmalı.',
  },
  {
    changeType: 'Tablo Kolonu Eklendi',
    tableName: 'Customers',
    columnName: 'risk_score',
    dataType: 'decimal(5,2)',
    description: 'Müşteri risk skoru kolonu eklendi',
    breakingChange: false,
  },
  {
    changeType: 'Tablo Kolonu Kaldırıldı',
    tableName: 'Transactions',
    columnName: 'legacy_reference',
    dataType: 'varchar(50)',
    description: 'Eski sistem referans kolonu kaldırıldı',
    breakingChange: true,
    breakingChangeDetails: 'legacy_reference kolonu kaldırıldı. Artık transaction_id kullanılmalı.',
  },
];

const SystemChangesSection = () => {
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedModelType, setSelectedModelType] = useState('request');

  const handleViewModelDetails = (change, modelType) => {
    const model = modelType === 'request' ? change.requestModel : change.responseModel;
    setSelectedModel(model);
    setSelectedModelType(modelType);
    setModelDialogOpen(true);
  };

  return (
    <>
      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleIcon color="primary" />
            <Typography variant="h6">
              Sistem Değişiklikleri ({mockChanges.length})
            </Typography>
            {mockChanges.some(c => c.breakingChange) && (
              <Chip
                icon={<WarningIcon />}
                label="Breaking Changes Var!"
                color="error"
                size="small"
              />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#1976d2' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Değişiklik Tipi</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Detay</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Açıklama</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Model Detayı</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Breaking Change</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mockChanges.map((change, idx) => (
                  <TableRow 
                    key={idx} 
                    hover
                    sx={{ 
                      bgcolor: change.breakingChange ? 'rgba(211, 47, 47, 0.08)' : 'inherit'
                    }}
                  >
                    <TableCell>
                      <Chip 
                        label={change.changeType} 
                        size="small" 
                        color={
                          change.changeType.includes('Eklendi') ? 'success' :
                          change.changeType.includes('Kaldırıldı') ? 'error' :
                          'warning'
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {change.apiName && (
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {change.apiName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {change.httpMethod} {change.apiPath}
                          </Typography>
                          <br />
                          <Chip label={change.microservice} size="small" variant="outlined" sx={{ mt: 0.5 }} />
                        </Box>
                      )}
                      {change.parameterName && (
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {change.parameterName}
                          </Typography>
                          {change.oldValue && (
                            <Typography variant="caption" color="text.secondary">
                              {change.oldValue} → {change.newValue || 'Removed'}
                            </Typography>
                          )}
                        </Box>
                      )}
                      {change.tableName && (
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {change.tableName}.{change.columnName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {change.dataType}
                          </Typography>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {change.description}
                      </Typography>
                      {change.breakingChangeDetails && (
                        <Alert severity="error" sx={{ mt: 1 }}>
                          <Typography variant="caption">
                            {change.breakingChangeDetails}
                          </Typography>
                        </Alert>
                      )}
                    </TableCell>
                    <TableCell>
                      {(change.requestModel || change.responseModel) && (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {change.requestModel && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<InfoIcon />}
                              onClick={() => handleViewModelDetails(change, 'request')}
                            >
                              Request
                            </Button>
                          )}
                          {change.responseModel && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<InfoIcon />}
                              onClick={() => handleViewModelDetails(change, 'response')}
                            >
                              Response
                            </Button>
                          )}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {change.breakingChange ? (
                        <Chip 
                          icon={<WarningIcon />} 
                          label="YES" 
                          size="small" 
                          color="error"
                        />
                      ) : (
                        <Chip label="NO" size="small" color="success" variant="outlined" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Breaking Changes Alert */}
          {mockChanges.some(c => c.breakingChange) && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                ⚠️ Breaking Changes Tespit Edildi!
              </Typography>
              <Typography variant="body2">
                Bu release {mockChanges.filter(c => c.breakingChange).length} adet breaking change içermektedir.
                Lütfen deployment öncesi gerekli migrasyonları ve testleri yapınız.
              </Typography>
            </Alert>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Model Details Dialog */}
      <Dialog 
        open={modelDialogOpen} 
        onClose={() => setModelDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {selectedModelType === 'request' ? 'Request Model' : 'Response Model'} Değişiklikleri
            </Typography>
            <IconButton onClick={() => setModelDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedModel && (
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                {selectedModel.name}
              </Typography>

              {/* Added Properties */}
              {selectedModel.changes.added && selectedModel.changes.added.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="success.main">
                    ✅ Eklenen Alanlar ({selectedModel.changes.added.length})
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Property</strong></TableCell>
                          <TableCell><strong>Type</strong></TableCell>
                          <TableCell><strong>Description</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedModel.changes.added.map((prop, idx) => (
                          <TableRow key={idx}>
                            <TableCell><Chip label={prop.property} size="small" color="success" /></TableCell>
                            <TableCell>{prop.type}</TableCell>
                            <TableCell>{prop.description}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {/* Removed Properties */}
              {selectedModel.changes.removed && selectedModel.changes.removed.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="error.main">
                    ❌ Kaldırılan Alanlar ({selectedModel.changes.removed.length})
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Property</strong></TableCell>
                          <TableCell><strong>Type</strong></TableCell>
                          <TableCell><strong>Description</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedModel.changes.removed.map((prop, idx) => (
                          <TableRow key={idx}>
                            <TableCell><Chip label={prop.property} size="small" color="error" /></TableCell>
                            <TableCell>{prop.type}</TableCell>
                            <TableCell>{prop.description}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {/* Updated Properties */}
              {selectedModel.changes.updated && selectedModel.changes.updated.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="warning.main">
                    🔄 Güncellenen Alanlar ({selectedModel.changes.updated.length})
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>Property</strong></TableCell>
                          <TableCell><strong>Type Change</strong></TableCell>
                          <TableCell><strong>Description Change</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedModel.changes.updated.map((prop, idx) => (
                          <TableRow key={idx}>
                            <TableCell><Chip label={prop.property} size="small" color="warning" /></TableCell>
                            <TableCell>
                              <Typography variant="caption" color="text.secondary">
                                Eski: {prop.oldType}
                              </Typography>
                              <br />
                              <Typography variant="caption" fontWeight="bold">
                                Yeni: {prop.newType}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" color="text.secondary">
                                Eski: {prop.oldDescription}
                              </Typography>
                              <br />
                              <Typography variant="caption" fontWeight="bold">
                                Yeni: {prop.newDescription}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {/* Warning for breaking changes */}
              {selectedModel.changes.removed && selectedModel.changes.removed.length > 0 && (
                <Alert severity="error">
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    ⚠️ Breaking Change Uyarısı
                  </Typography>
                  <Typography variant="body2">
                    Bu modelden {selectedModel.changes.removed.length} alan kaldırıldı. 
                    Mevcut entegrasyonlar güncellenmeli ve testler yapılmalıdır.
                  </Typography>
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SystemChangesSection;
