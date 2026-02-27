import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
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
  LinearProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  Button,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckIcon from '@mui/icons-material/Check';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import PublishIcon from '@mui/icons-material/Publish';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

// Mock Data - Servisler
const services = [
  { id: 1, name: 'cofins-backofficeportal' },
  { id: 2, name: 'cofins-bff-api' },
  { id: 3, name: 'cofins-content-service' },
  { id: 4, name: 'cofins-customerportal' },
  { id: 5, name: 'cofins-file-service' },
  { id: 6, name: 'cofins-service-api' },
  { id: 7, name: 'cofins-worker-service-api' },
];

// Mock Data - PR'lar
const mockPRs = [
  {
    id: 101,
    title: 'Feature: Add customer authentication',
    service: 'cofins-bff-api',
    branch: 'master',
    author: 'Ali Yılmaz',
    date: '2025-11-28',
    status: 'merged',
    workItems: [1001, 1002],
  },
  {
    id: 102,
    title: 'Fix: Update file upload logic',
    service: 'cofins-file-service',
    branch: 'master',
    author: 'Ayşe Kaya',
    date: '2025-11-29',
    status: 'merged',
    workItems: [1003],
  },
  {
    id: 103,
    title: 'Feature: Content management improvements',
    service: 'cofins-content-service',
    branch: 'master',
    author: 'Mehmet Demir',
    date: '2025-12-01',
    status: 'open',
    workItems: [1004, 1005],
  },
  {
    id: 104,
    title: 'Fix: Authentication token refresh',
    service: 'cofins-bff-api',
    branch: 'master',
    author: 'Zeynep Öz',
    date: '2025-12-02',
    status: 'merged',
    workItems: [1006],
  },
];

// Mock Data - Pipeline'lar
const mockPipelines = [
  {
    service: 'cofins-backofficeportal',
    buildNumber: '1.0.20251202.1',
    status: 'success',
    triggeredBy: 'Ali Yılmaz',
    date: '2025-12-02 10:30',
    duration: '5m 23s',
  },
  {
    service: 'cofins-bff-api',
    buildNumber: '1.0.20251202.2',
    status: 'success',
    triggeredBy: 'Ayşe Kaya',
    date: '2025-12-02 09:15',
    duration: '4m 12s',
  },
  {
    service: 'cofins-content-service',
    buildNumber: '1.0.20251202.3',
    status: 'running',
    triggeredBy: 'Mehmet Demir',
    date: '2025-12-02 11:00',
    duration: '2m 45s',
  },
  {
    service: 'cofins-file-service',
    buildNumber: '1.0.20251202.1',
    status: 'failed',
    triggeredBy: 'Zeynep Öz',
    date: '2025-12-02 08:45',
    duration: '3m 10s',
  },
];

// Mock Data - Pod Durumları
const mockPodStatus = [
  {
    service: 'cofins-backofficeportal',
    version: '1.0.20251202.1',
    podStatus: 'Running',
    status: 'Success',
    replicas: '3/3',
    restartCount: 0,
    uptime: '2h 15m',
    logs: null,
  },
  {
    service: 'cofins-bff-api',
    version: '1.0.20251202.2',
    podStatus: 'Running',
    status: 'Success',
    replicas: '2/2',
    restartCount: 0,
    uptime: '3h 42m',
    logs: null,
  },
  {
    service: 'cofins-content-service',
    version: '1.0.20251201.5',
    podStatus: 'Running',
    status: 'Success',
    replicas: '2/2',
    restartCount: 1,
    uptime: '1h 20m',
    logs: null,
  },
  {
    service: 'cofins-file-service',
    version: '1.0.20251202.1',
    podStatus: 'CrashLoopBackOff',
    status: 'Failed',
    replicas: '0/2',
    restartCount: 8,
    uptime: '5m',
    logs: `[ERROR] Failed to connect to storage service\nError: ECONNREFUSED storage.internal.svc.cluster.local:9000\n  at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1144:16)\n[WARN] Retry attempt 1/3...\n[ERROR] Connection timeout after 30s\n[FATAL] Storage connection failed. Pod restarting...`,
  },
  {
    service: 'cofins-customerportal',
    version: '1.0.20251130.3',
    podStatus: 'Running',
    status: 'Success',
    replicas: '3/3',
    restartCount: 0,
    uptime: '24h 10m',
    logs: null,
  },
  {
    service: 'cofins-service-api',
    version: '1.0.20251201.2',
    podStatus: 'Running',
    status: 'Success',
    replicas: '4/4',
    restartCount: 0,
    uptime: '12h 5m',
    logs: null,
  },
  {
    service: 'cofins-worker-service-api',
    version: '1.0.20251201.1',
    podStatus: 'ImagePullBackOff',
    status: 'Failed',
    replicas: '0/1',
    restartCount: 0,
    uptime: '0m',
    logs: `[ERROR] Failed to pull image "registry.internal/cofins-worker-service-api:1.0.20251201.1"\nError response from daemon: manifest for registry.internal/cofins-worker-service-api:1.0.20251201.1 not found: manifest unknown\n[WARN] Back-off pulling image "registry.internal/cofins-worker-service-api:1.0.20251201.1"`,
  },
];

// Mock Data - Work Items
const mockWorkItems = [
  {
    id: 1001,
    title: 'Implement OAuth2 authentication',
    type: 'User Story',
    assignedTo: 'Ali Yılmaz',
    state: 'Done',
    prIds: [101],
  },
  {
    id: 1002,
    title: 'Add JWT token validation',
    type: 'Task',
    assignedTo: 'Ali Yılmaz',
    state: 'Done',
    prIds: [101],
  },
  {
    id: 1003,
    title: 'Fix file upload size limit',
    type: 'Bug',
    assignedTo: 'Ayşe Kaya',
    state: 'Done',
    prIds: [102],
  },
  {
    id: 1004,
    title: 'Content versioning support',
    type: 'Feature',
    assignedTo: 'Mehmet Demir',
    state: 'In Progress',
    prIds: [103],
  },
  {
    id: 1005,
    title: 'Add content tagging',
    type: 'Task',
    assignedTo: 'Mehmet Demir',
    state: 'In Progress',
    prIds: [103],
  },
];

// Mock Data - Release Notes
const mockReleaseNotes = [
  {
    workItemId: 1001,
    note: 'OAuth2 authentication implemented for enhanced security',
    category: 'Security',
  },
  {
    workItemId: 1002,
    note: 'JWT token validation added to prevent unauthorized access',
    category: 'Security',
  },
  {
    workItemId: 1003,
    note: 'Fixed file upload size limit issue affecting large files',
    category: 'Bug Fix',
  },
  {
    workItemId: 1004,
    note: 'Content versioning support added for better content management',
    category: 'Feature',
  },
];

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

// Mock Data - Release ToDo'ları (Yeni Versiyon için)
const mockReleaseTodos = [
  {
    id: 1,
    description: 'TOGG konusu için yapılması gereken güncellemeler',
    timing: 'Geçiş Öncesi',
    responsibleTeam: 'Delivery',
    priority: 'Yüksek',
    details: [
      'Process (ID: 12345) - TOGG süreç tanımları güncellenmeli',
      'Forms (ID: 67890) - TOGG formları revize edilmeli',
      'HttpConnector (ID: 11223) - TOGG servis entegrasyonları kontrol edilmeli',
      'ProcessColumnSettings (ID: 44556) - TOGG kolon ayarları düzenlenmeli'
    ]
  },
];

const ReleaseHealthCheckV2 = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [releaseDate, setReleaseDate] = useState('2025-12-01');
  const [newVersion, setNewVersion] = useState('');
  const [expandedServices, setExpandedServices] = useState({});
  const [selectedTodo, setSelectedTodo] = useState(null);
  const [todoDialogOpen, setTodoDialogOpen] = useState(false);
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedModelType, setSelectedModelType] = useState('request');

  // Firebase'den ürünleri getir
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const querySnapshot = await getDocs(collection(db, 'products'));
        const productsData = [];
        querySnapshot.forEach((doc) => {
          productsData.push({ id: doc.id, ...doc.data() });
        });
        setProducts(productsData);
      } catch (error) {
        console.error('Ürünler yüklenirken hata:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const selectedProductData = products.find(p => p.id === selectedProduct);

  const toggleService = (serviceId) => {
    setExpandedServices(prev => ({
      ...prev,
      [serviceId]: !prev[serviceId]
    }));
  };

  const handlePublish = () => {
    if (!newVersion) {
      alert('Lütfen yeni versiyon numarası girin!');
      return;
    }
    // Burada yeni versiyon yayınlama işlemi yapılacak
    alert(`Yeni versiyon ${newVersion} yayınlanacak. Mevcut versiyon: ${selectedProductData?.version}`);
    // TODO: API call to update product version
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
      case 'merged':
      case 'Done':
        return 'success';
      case 'failed':
        return 'error';
      case 'running':
      case 'In Progress':
        return 'warning';
      case 'open':
        return 'info';
      default:
        return 'default';
    }
  };

  const getChangeTypeColor = (changeType) => {
    switch (changeType) {
      case 'added':
        return 'success';
      case 'modified':
        return 'warning';
      case 'deleted':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Kritik': return 'error';
      case 'Yüksek': return 'warning';
      case 'Orta': return 'info';
      case 'Düşük': return 'default';
      default: return 'default';
    }
  };

  const getTimingColor = (timing) => {
    switch (timing) {
      case 'Geçiş Öncesi': return '#2196F3';
      case 'Geçiş Anında': return '#FF9800';
      case 'Geçiş Sonrası': return '#4CAF50';
      default: return '#999';
    }
  };

  const getTeamColor = (team) => {
    switch (team) {
      case 'Delivery': return '#9C27B0';
      case 'DevOps': return '#00BCD4';
      case 'Database': return '#FF5722';
      default: return '#607D8B';
    }
  };

  const getPodStatusColor = (status) => {
    switch (status) {
      case 'Success': return 'success';
      case 'Failed': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Release Health Check v2-4
      </Typography>

      {loading ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography>Yükleniyor...</Typography>
        </Paper>
      ) : (
        <>
          {/* Üst Bilgiler - Ürün Seçimi, Versiyon ve Tarih */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Ürün Seç</InputLabel>
                  <Select
                    value={selectedProduct}
                    label="Ürün Seç"
                    onChange={(e) => setSelectedProduct(e.target.value)}
                  >
                    {products.map((product) => (
                      <MenuItem key={product.id} value={product.id}>
                        {product.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 1 }}>
                <Typography variant="caption" sx={{ opacity: 0.9, display: 'block' }}>
                  Mevcut Versiyon
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                  {selectedProductData?.currentVersion ? `v${selectedProductData.currentVersion}` : '-'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={2}>
            <Card 
              sx={{ 
                height: '100%', 
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 1 }}>
                <Typography variant="caption" sx={{ opacity: 0.9, display: 'block' }}>
                  Versiyon Oluşturulma Tarihi
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                  {selectedProductData?.currentVersionCreatedAt 
                    ? new Date(selectedProductData.currentVersionCreatedAt).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      })
                    : '-'
                  }
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={1}>
            <Divider orientation="vertical" sx={{ height: '100%', mx: 2 }} />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="Yeni Versiyon"
              value={newVersion}
              onChange={(e) => setNewVersion(e.target.value)}
              placeholder="örn: 1.2.0"
              InputProps={{
                startAdornment: <NewReleasesIcon sx={{ mr: 1, color: 'primary.main' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="contained"
              color="success"
              size="large"
              startIcon={<PublishIcon />}
              onClick={handlePublish}
              disabled={!newVersion || !selectedProduct}
              sx={{ height: '56px' }}
            >
              Yayınla
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {!selectedProduct && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Lütfen bir ürün grubu seçin.
        </Alert>
      )}

      {selectedProduct && (
        <>
          {/* Aşama 1: Son tarihten bugüne atılan PR'lar */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleIcon color="primary" />
                <Typography variant="h6">
                  Son Tarihten Bugüne Atılan PR'lar ({mockPRs.length})
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {/* Servis bazında gruplanmış PR'lar */}
              {services.map((service) => {
                const servicePRs = mockPRs.filter(pr => pr.service === service.name);
                if (servicePRs.length === 0) return null;

                const isExpanded = expandedServices[service.id];

                // Branch'leri grupla
                const branchGroups = servicePRs.reduce((acc, pr) => {
                  if (!acc[pr.branch]) {
                    acc[pr.branch] = [];
                  }
                  acc[pr.branch].push(pr);
                  return acc;
                }, {});

                return (
                  <Box key={service.id} sx={{ mb: 3 }}>
                    {/* Servis Başlığı - Tıklanabilir */}
                    <Paper 
                      sx={{ 
                        p: 2, 
                        mb: 1, 
                        bgcolor: '#f5f5f5',
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: '#e8e8e8',
                        },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                      onClick={() => toggleService(service.id)}
                    >
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                        📦 {service.name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip 
                          label={`${servicePRs.length} PR`} 
                          size="small" 
                          color="primary"
                        />
                        {isExpanded ? <ExpandMoreIcon /> : <ExpandMoreIcon sx={{ transform: 'rotate(-90deg)' }} />}
                      </Box>
                    </Paper>

                    {/* Branch'ler - Açılıp kapanabilen */}
                    {isExpanded && (
                      <Box sx={{ ml: 3 }}>
                        {Object.entries(branchGroups).map(([branch, prs]) => (
                          <Box key={branch} sx={{ mb: 2 }}>
                            {/* Branch Başlığı */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Chip 
                                label={`🌿 ${branch}`} 
                                size="small" 
                                sx={{ 
                                  bgcolor: '#4caf50', 
                                  color: 'white',
                                  fontWeight: 'bold',
                                }} 
                              />
                              <Typography variant="caption" color="text.secondary">
                                ({prs.length} PR)
                              </Typography>
                            </Box>

                            {/* PR'lar */}
                            <TableContainer component={Paper} sx={{ ml: 4, maxWidth: 'calc(100vw - 400px)' }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                                <TableCell sx={{ fontWeight: 'bold', width: '80px' }}>PR ID</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', minWidth: '300px' }}>Başlık</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', width: '120px' }}>Yazar</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', width: '100px' }}>Tarih</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', width: '100px' }}>Durum</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', width: '150px' }}>Work Items</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {prs.map((pr) => (
                                <TableRow key={pr.id} hover>
                                  <TableCell>#{pr.id}</TableCell>
                                  <TableCell sx={{ 
                                    maxWidth: '300px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}>
                                    {pr.title}
                                  </TableCell>
                                  <TableCell>{pr.author}</TableCell>
                                  <TableCell>{pr.date}</TableCell>
                                  <TableCell>
                                    <Chip label={pr.status} size="small" color={getStatusColor(pr.status)} />
                                  </TableCell>
                                  <TableCell>
                                    {pr.workItems.map(wi => (
                                      <Chip key={wi} label={`#${wi}`} size="small" sx={{ mr: 0.5 }} />
                                    ))}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                );
              })}
            </AccordionDetails>
          </Accordion>

          {/* Aşama 2: Her bir servis için son tetiklenen pipeline'lar */}
          <Accordion defaultExpanded sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleIcon color="primary" />
                <Typography variant="h6">
                  Servis Pipeline Durumları ({mockPipelines.length})
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#1976d2' }}>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Servis</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Build Numarası</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Durum</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Tetikleyen</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Tarih</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Süre</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {mockPipelines.map((pipeline, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell sx={{ fontWeight: 'bold' }}>{pipeline.service}</TableCell>
                        <TableCell>{pipeline.buildNumber}</TableCell>
                        <TableCell>
                          <Chip label={pipeline.status} size="small" color={getStatusColor(pipeline.status)} />
                        </TableCell>
                        <TableCell>{pipeline.triggeredBy}</TableCell>
                        <TableCell>{pipeline.date}</TableCell>
                        <TableCell>{pipeline.duration}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>

          {/* Pod Durumları */}
          <Accordion defaultExpanded sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleIcon color="primary" />
                <Typography variant="h6">
                  Pod Durumları ({mockPodStatus.length})
                </Typography>
                <Chip 
                  label={`${mockPodStatus.filter(p => p.status === 'Failed').length} hata`} 
                  size="small" 
                  color="error"
                  sx={{ display: mockPodStatus.filter(p => p.status === 'Failed').length > 0 ? 'inline-flex' : 'none' }}
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#1976d2' }}>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Servis</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Versiyon</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Pod Durumu</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Replicas</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Restart</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Uptime</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Durum</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Hata Detayı</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {mockPodStatus.map((pod, idx) => (
                      <TableRow 
                        key={idx} 
                        hover
                        sx={{ 
                          backgroundColor: pod.status === 'Failed' ? '#ffebee' : 'inherit'
                        }}
                      >
                        <TableCell sx={{ fontWeight: 'bold' }}>{pod.service}</TableCell>
                        <TableCell>
                          <Chip label={pod.version} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={pod.podStatus} 
                            size="small" 
                            color={pod.podStatus === 'Running' ? 'success' : 'error'}
                            variant="filled"
                          />
                        </TableCell>
                        <TableCell>{pod.replicas}</TableCell>
                        <TableCell>
                          {pod.restartCount > 0 ? (
                            <Chip 
                              label={pod.restartCount} 
                              size="small" 
                              color={pod.restartCount > 3 ? 'error' : 'warning'}
                            />
                          ) : (
                            <Typography variant="body2">{pod.restartCount}</Typography>
                          )}
                        </TableCell>
                        <TableCell>{pod.uptime}</TableCell>
                        <TableCell>
                          <Chip 
                            label={pod.status} 
                            size="small" 
                            color={getPodStatusColor(pod.status)} 
                          />
                        </TableCell>
                        <TableCell>
                          {pod.logs ? (
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => {
                                setSelectedTodo({ ...pod, description: `${pod.service} - Hata Logları` });
                                setTodoDialogOpen(true);
                              }}
                            >
                              <ErrorIcon />
                            </IconButton>
                          ) : (
                            <Typography variant="body2" color="text.secondary">-</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Hatalı Pod Uyarısı */}
              {mockPodStatus.some(p => p.status === 'Failed') && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    🚨 Pod Hataları Tespit Edildi!
                  </Typography>
                  <Typography variant="body2">
                    {mockPodStatus.filter(p => p.status === 'Failed').length} servis pod hatasıyla karşılaştı.
                    Lütfen hata detaylarını inceleyip gerekli düzeltmeleri yapınız.
                  </Typography>
                </Alert>
              )}
            </AccordionDetails>
          </Accordion>

          {/* Aşama 3: PR'lara ait workitemlar */}
          <Accordion defaultExpanded sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleIcon color="primary" />
                <Typography variant="h6">
                  Work Items ({mockWorkItems.length})
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#1976d2' }}>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ID</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Başlık</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Tip</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Atanan</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Durum</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>İlgili PR'lar</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {mockWorkItems.map((item) => (
                      <TableRow key={item.id} hover>
                        <TableCell>#{item.id}</TableCell>
                        <TableCell>{item.title}</TableCell>
                        <TableCell><Chip label={item.type} size="small" color="info" /></TableCell>
                        <TableCell>{item.assignedTo}</TableCell>
                        <TableCell>
                          <Chip label={item.state} size="small" color={getStatusColor(item.state)} />
                        </TableCell>
                        <TableCell>
                          {item.prIds.map(pr => (
                            <Chip key={pr} label={`#${pr}`} size="small" sx={{ mr: 0.5 }} />
                          ))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>

          {/* Aşama 4: Work Item'lara ait release note'lar */}
          <Accordion defaultExpanded sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleIcon color="primary" />
                <Typography variant="h6">
                  Release Notes ({mockReleaseNotes.length})
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#1976d2' }}>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Work Item</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Kategori</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Not</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {mockReleaseNotes.map((note, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell>#{note.workItemId}</TableCell>
                        <TableCell>
                          <Chip label={note.category} size="small" color="primary" />
                        </TableCell>
                        <TableCell>{note.note}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>

          {/* Aşama 5: Work Item'lara ait yapılan değişiklikler */}
          <Accordion defaultExpanded sx={{ mt: 2 }}>
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
                                  {change.oldValue} → {change.newValue}
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
                        <TableCell>{change.description}</TableCell>
                        <TableCell align="center">
                          {(change.requestModel || change.responseModel) ? (
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              {change.requestModel && (
                                <IconButton 
                                  size="small" 
                                  color="primary"
                                  onClick={() => {
                                    setSelectedModel(change.requestModel);
                                    setSelectedModelType('request');
                                    setModelDialogOpen(true);
                                  }}
                                >
                                  <InfoIcon />
                                </IconButton>
                              )}
                              {change.responseModel && (
                                <IconButton 
                                  size="small" 
                                  color="secondary"
                                  onClick={() => {
                                    setSelectedModel(change.responseModel);
                                    setSelectedModelType('response');
                                    setModelDialogOpen(true);
                                  }}
                                >
                                  <InfoIcon />
                                </IconButton>
                              )}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">-</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {change.breakingChange ? (
                            <Box>
                              <Chip
                                icon={<ErrorIcon />}
                                label="BREAKING"
                                color="error"
                                size="small"
                              />
                              {change.breakingChangeDetails && (
                                <Typography variant="caption" display="block" sx={{ mt: 1, color: 'error.main' }}>
                                  {change.breakingChangeDetails}
                                </Typography>
                              )}
                            </Box>
                          ) : (
                            <Chip label="Normal" size="small" color="success" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Breaking Changes Özet */}
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

          {/* Release ToDo'lar */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h6">Release ToDo'lar (Yeni Versiyon)</Typography>
                <Chip 
                  label={`${mockReleaseTodos.length} görev`} 
                  size="small" 
                  color="warning"
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Açıklama</TableCell>
                      <TableCell>Zaman</TableCell>
                      <TableCell>Ekip</TableCell>
                      <TableCell>Öncelik</TableCell>
                      <TableCell align="center">Detay</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {mockReleaseTodos.map((todo) => (
                      <TableRow key={todo.id}>
                        <TableCell>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                            {todo.description}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={todo.timing} 
                            size="small"
                            sx={{ 
                              backgroundColor: getTimingColor(todo.timing),
                              color: 'white'
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={todo.responsibleTeam} 
                            size="small"
                            sx={{ 
                              backgroundColor: getTeamColor(todo.responsibleTeam),
                              color: 'white'
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={todo.priority} 
                            color={getPriorityColor(todo.priority)} 
                            size="small" 
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => {
                              setSelectedTodo(todo);
                              setTodoDialogOpen(true);
                            }}
                          >
                            <InfoIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Kritik ToDo Uyarısı */}
              {mockReleaseTodos.some(t => t.priority === 'Kritik') && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    🚨 Kritik ToDo'lar!
                  </Typography>
                  <Typography variant="body2">
                    {mockReleaseTodos.filter(t => t.priority === 'Kritik').length} adet kritik görev bulunuyor.
                    Bu görevler yeni versiyon yayınlanmadan önce mutlaka tamamlanmalıdır.
                  </Typography>
                </Alert>
              )}
            </AccordionDetails>
          </Accordion>
        </>
      )}

      {/* ToDo/Pod Detay Dialog */}
      <Dialog 
        open={todoDialogOpen} 
        onClose={() => setTodoDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {selectedTodo?.logs ? 'Pod Hata Detayları' : 'ToDo Detayları'}
            </Typography>
            <IconButton onClick={() => setTodoDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedTodo && (
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                {selectedTodo.description}
              </Typography>
              
              {/* Todo details */}
              {selectedTodo.timing && (
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Chip 
                    label={selectedTodo.timing} 
                    size="small"
                    sx={{ 
                      backgroundColor: getTimingColor(selectedTodo.timing),
                      color: 'white'
                    }}
                  />
                  <Chip 
                    label={selectedTodo.responsibleTeam} 
                    size="small"
                    sx={{ 
                      backgroundColor: getTeamColor(selectedTodo.responsibleTeam),
                      color: 'white'
                    }}
                  />
                  <Chip 
                    label={selectedTodo.priority} 
                    color={getPriorityColor(selectedTodo.priority)} 
                    size="small" 
                  />
                </Box>
              )}

              {/* Pod error details */}
              {selectedTodo.logs && (
                <Box>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip 
                      label={`Versiyon: ${selectedTodo.version}`} 
                      size="small"
                      variant="outlined"
                    />
                    <Chip 
                      label={selectedTodo.podStatus} 
                      size="small"
                      color="error"
                    />
                    <Chip 
                      label={`Replicas: ${selectedTodo.replicas}`} 
                      size="small"
                      variant="outlined"
                    />
                    <Chip 
                      label={`Restart: ${selectedTodo.restartCount}`} 
                      size="small"
                      color={selectedTodo.restartCount > 3 ? 'error' : 'warning'}
                    />
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Hata Logları:
                  </Typography>
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 2, 
                      bgcolor: '#f5f5f5',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      whiteSpace: 'pre-wrap',
                      maxHeight: '400px',
                      overflow: 'auto'
                    }}
                  >
                    {selectedTodo.logs}
                  </Paper>
                </Box>
              )}

              {/* Todo task list */}
              {selectedTodo.details && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Yapılması Gereken Güncellemeler:
                  </Typography>
                  <List>
                    {selectedTodo.details.map((detail, index) => (
                      <ListItem key={index} sx={{ py: 0.5 }}>
                        <ListItemText 
                          primary={detail}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Model Changes Dialog */}
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
                          <TableCell sx={{ fontWeight: 'bold' }}>Alan Adı</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Tip</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Açıklama</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedModel.changes.added.map((prop, idx) => (
                          <TableRow key={idx} sx={{ bgcolor: '#e8f5e9' }}>
                            <TableCell sx={{ fontFamily: 'monospace' }}>{prop.property}</TableCell>
                            <TableCell>
                              <Chip label={prop.type} size="small" color="success" />
                            </TableCell>
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
                    ❌ Kaldırılan Alanlar ({selectedModel.changes.removed.length}) - BREAKING CHANGE
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>Alan Adı</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Tip</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Açıklama</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedModel.changes.removed.map((prop, idx) => (
                          <TableRow key={idx} sx={{ bgcolor: '#ffebee' }}>
                            <TableCell sx={{ fontFamily: 'monospace', textDecoration: 'line-through' }}>
                              {prop.property}
                            </TableCell>
                            <TableCell>
                              <Chip label={prop.type} size="small" color="error" />
                            </TableCell>
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
                          <TableCell sx={{ fontWeight: 'bold' }}>Alan Adı</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Eski → Yeni</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Açıklama Değişimi</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedModel.changes.updated.map((prop, idx) => (
                          <TableRow key={idx} sx={{ bgcolor: '#fff3e0' }}>
                            <TableCell sx={{ fontFamily: 'monospace' }}>{prop.property}</TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip label={prop.oldType} size="small" variant="outlined" />
                                <Typography variant="caption">→</Typography>
                                <Chip label={prop.newType} size="small" color="warning" />
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" display="block" color="text.secondary">
                                Eski: {prop.oldDescription}
                              </Typography>
                              <Typography variant="caption" display="block" color="text.primary">
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
      )}
    </Box>
  );
};

export default ReleaseHealthCheckV2;
