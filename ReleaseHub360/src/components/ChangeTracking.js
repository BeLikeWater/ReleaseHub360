import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Avatar,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  History as HistoryIcon,
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Edit as EditIcon,
  Api as ApiIcon,
  AccountTree as ProcessIcon,
  Security as AuthIcon,
  Tune as ParameterIcon,
  Approval as ApprovalIcon,
  AccountBalance as AccountingIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  Storage as TableIcon,
  UnfoldMore as ExpandAllIcon,
  UnfoldLess as CollapseAllIcon
} from '@mui/icons-material';

const ChangeTracking = () => {
  const navigate = useNavigate();
  const [selectedVersion, setSelectedVersion] = useState('v1.24.0');
  const [modelDialog, setModelDialog] = useState({ open: false, data: null, type: null });
  const [activeTab, setActiveTab] = useState(0);
  const [expandedPanel, setExpandedPanel] = useState(false);
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [currentModel, setCurrentModel] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({}); // Her kategori için ayrı state
  const [currentModelType, setCurrentModelType] = useState('request');

  const handlePanelChange = (panel) => (event, isExpanded) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  const handleCategoryToggle = (categoryKey) => (event, isExpanded) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryKey]: isExpanded
    }));
  };

  const handleExpandAll = () => {
    const allCategories = {};
    changeCategories.forEach(cat => {
      allCategories[cat.key] = true;
    });
    setExpandedCategories(allCategories);
  };

  const handleCollapseAll = () => {
    setExpandedCategories({});
  };

  const handleOpenModelDialog = (model, type) => {
    setCurrentModel(model);
    setCurrentModelType(type);
    setModelDialogOpen(true);
  };

  const handleCloseModelDialog = () => {
    setModelDialogOpen(false);
    setCurrentModel(null);
  };

  const versions = ['v1.24.0', 'v1.23.0', 'v1.22.0', 'v1.21.0'];

  // Değişiklik kategorileri
  const changeCategories = [
    { 
      key: 'apis', 
      label: 'API Tanımları', 
      icon: <ApiIcon />, 
      color: 'primary' 
    },
    { 
      key: 'processes', 
      label: 'Süreç Tanımları', 
      icon: <ProcessIcon />, 
      color: 'secondary' 
    },
    { 
      key: 'tables', 
      label: 'Tablo Tanımları', 
      icon: <TableIcon />, 
      color: 'success' 
    },
    { 
      key: 'authorization', 
      label: 'Yetkilendirme Tanımları', 
      icon: <AuthIcon />, 
      color: 'warning' 
    },
    { 
      key: 'parameters', 
      label: 'Parametre Tanımları', 
      icon: <ParameterIcon />, 
      color: 'info' 
    },
    { 
      key: 'approvals', 
      label: 'Kullanıcı Onay Tanımları', 
      icon: <ApprovalIcon />, 
      color: 'error' 
    },
    { 
      key: 'accounting', 
      label: 'Muhasebe Tanımları', 
      icon: <AccountingIcon />, 
      color: 'default' 
    }
  ];

  // Örnek değişiklik verileri
  const changesData = {
    'v1.24.0': {
      apis: {
        added: [
          { 
            name: 'validatePayment', 
            description: 'Ödeme doğrulama API\'si',
            microservice: 'payment-service',
            httpMethod: 'POST',
            apiPath: '/api/v1/payments/validate',
            details: 'Yeni ödeme sistemleri için validasyon endpoint\'i',
            requestModel: {
              name: 'PaymentValidationRequest',
              changes: {
                      added: [
                        { stepName: 'Manuel Belge Kontrolü', reason: 'OCR ile otomatikleştirildi' }
                      ],
                      stepsAdded: [
                        { stepName: 'Otomatik Risk Skoru Hesaplama', description: 'AI tabanlı risk analizi eklendi' }
                      ],
                      stepsModified: [
                        { 
                          stepName: 'Müşteri Bilgileri Doğrulama',
                          oldDuration: '2 gün',
                          newDuration: '1 gün',
                          change: 'e-Devlet entegrasyonu ile hızlandırıldı'
                        }
                      ],
                      removed: [],
                      updated: []
                    }
                  },
            responseModel: {
              name: 'PaymentValidationResponse',
              changes: {
                added: [
                  { property: 'isValid', type: 'boolean', description: 'Doğrulama sonucu' },
                  { property: 'errorCode', type: 'string', description: 'Hata kodu (varsa)' },
                  { property: 'errorMessage', type: 'string', description: 'Hata mesajı (varsa)' },
                  { property: 'validatedAt', type: 'datetime', description: 'Doğrulama zamanı' }
                ],
                removed: [],
                updated: []
              }
            }
          },
          { 
            name: 'sendNotification', 
            description: 'Bildirim gönderme API\'si',
            microservice: 'notification-service',
            httpMethod: 'POST',
            apiPath: '/api/v1/notifications/send',
            details: 'Asenkron bildirim gönderimi için endpoint',
            requestModel: {
              name: 'NotificationRequest',
              changes: {
                added: [
                  { property: 'userId', type: 'string', description: 'Kullanıcı ID\'si' },
                  { property: 'type', type: 'enum', description: 'Bildirim türü (SMS, EMAIL, PUSH)' },
                  { property: 'message', type: 'string', description: 'Bildirim mesajı' },
                  { property: 'priority', type: 'enum', description: 'Öncelik (LOW, MEDIUM, HIGH)' }
                ],
                removed: [],
                updated: []
              }
            },
            responseModel: {
              name: 'NotificationResponse',
              changes: {
                added: [
                  { property: 'notificationId', type: 'string', description: 'Bildirim ID\'si' },
                  { property: 'status', type: 'enum', description: 'Durum (QUEUED, SENT, FAILED)' },
                  { property: 'queuedAt', type: 'datetime', description: 'Kuyruğa alınma zamanı' }
                ],
                removed: [],
                updated: []
              }
            }
          }
        ],
        removed: [
          { 
            name: 'generateLegacyReport', 
            description: 'Eski rapor oluşturma API\'si',
            microservice: 'report-service',
            httpMethod: 'GET',
            apiPath: '/api/v1/reports/legacy',
            details: 'Artık kullanılmayan eski rapor sistemi kaldırıldı'
          }
        ],
        updated: [
          { 
            name: 'authenticateUser',
            description: 'Kullanıcı kimlik doğrulama API\'si',
            microservice: 'auth-service',
            httpMethod: 'POST',
            apiPath: '/api/v1/auth/login',
            oldValue: 'Token süresi: 24 saat',
            newValue: 'Token süresi: 8 saat, Refresh token eklendi',
            details: 'Güvenlik gereksinimlerine uygun olarak token süresi azaltıldı ve refresh token desteği eklendi',
            requestModel: {
              name: 'LoginRequest',
              changes: {
                added: [
                  { property: 'deviceInfo', type: 'object', description: 'Cihaz bilgisi (güvenlik için)' },
                  { property: 'rememberMe', type: 'boolean', description: 'Beni hatırla seçeneği' }
                ],
                removed: [],
                updated: [
                  { 
                    property: 'username', 
                    oldType: 'string', 
                    newType: 'string', 
                    oldDescription: 'Kullanıcı adı', 
                    newDescription: 'Kullanıcı adı veya email adresi' 
                  }
                ]
              }
            },
            responseModel: {
              name: 'LoginResponse',
              changes: {
                added: [
                  { property: 'refreshToken', type: 'string', description: 'Yenileme token\'ı' },
                  { property: 'expiresIn', type: 'integer', description: 'Token geçerlilik süresi (saniye)' },
                  { property: 'tokenType', type: 'string', description: 'Token türü (Bearer)' }
                ],
                removed: [
                  { property: 'sessionId', type: 'string', description: 'Artık kullanılmayan session ID' }
                ],
                updated: [
                  { 
                    property: 'accessToken', 
                    oldType: 'string', 
                    newType: 'string', 
                    oldDescription: '24 saatlik JWT token', 
                    newDescription: '8 saatlik JWT access token' 
                  }
                ]
              }
            }
          },
          {
            name: 'getDatabaseConnection',
            description: 'Veritabanı bağlantı API\'si',
            microservice: 'database-service',
            httpMethod: 'GET',
            apiPath: '/api/v1/db/connection',
            oldValue: 'Connection pool: 50, Timeout: 30s',
            newValue: 'Connection pool: 100, Timeout: 60s',
            details: 'Performans iyileştirmesi için connection pool artırıldı ve timeout süreleri uzatıldı',
            requestModel: {
              name: 'ConnectionRequest',
              changes: {
                added: [
                  { property: 'poolSize', type: 'integer', description: 'İstenen pool boyutu' },
                  { property: 'priority', type: 'enum', description: 'Bağlantı önceliği (LOW, MEDIUM, HIGH)' }
                ],
                removed: [],
                updated: []
              }
            },
            responseModel: {
              name: 'ConnectionResponse',
              changes: {
                added: [
                  { property: 'connectionId', type: 'string', description: 'Bağlantı ID\'si' },
                  { property: 'poolInfo', type: 'object', description: 'Pool durumu bilgisi' }
                ],
                removed: [],
                updated: [
                  { 
                    property: 'timeout', 
                    oldType: 'integer', 
                    newType: 'integer', 
                    oldDescription: '30 saniye timeout', 
                    newDescription: '60 saniye timeout' 
                  }
                ]
              }
            }
          }
        ]
      },
      processes: {
        added: [
          { 
            code: 'P-AUTO-REFUND-001',
            name: 'AutomaticRefundProcess', 
            description: 'Otomatik iade süreci', 
            module: 'Payment Module',
            details: 'Belirli koşullarda (hatalı işlem, iptal talebi) otomatik iade işlemi başlatılır' 
          },
          { 
            code: 'P-CREDIT-SCORE-002',
            name: 'CreditScoreValidationProcess', 
            description: 'Kredi skoru doğrulama süreci', 
            module: 'Loan Module',
            details: 'Kredi başvurularında otomatik skor kontrolü ve risk değerlendirmesi yapılır' 
          }
        ],
        removed: [
          { 
            code: 'P-MANUAL-APR-001',
            name: 'ManualApprovalProcess', 
            description: 'Manuel onay süreci', 
            module: 'Approval Module',
            details: 'Artık otomatik hale getirildi, manuel müdahale gerektirmiyor' 
          }
        ],
        updated: [
          {
            code: 'P-LOAN-APP-001',
            name: 'LoanApplicationProcess',
            description: 'Kredi başvuru süreci',
            module: 'Loan Module',
            oldValue: 'Süreç adımları: 7 adım, Max süre: 5 gün',
            newValue: 'Süreç adımları: 5 adım (Birleştirildi), Max süre: 3 gün',
            details: 'Müşteri memnuniyeti için süreç optimize edildi ve hızlandırıldı',
            processDesign: {
              stepsRemoved: [
                { stepName: 'Manuel Belge Kontrolü', reason: 'OCR ile otomatikleştirildi' },
                { stepName: 'İkinci El Onayı', reason: 'Tek onay ile birleştirildi' }
              ],
              stepsAdded: [
                { stepName: 'Otomatik Risk Skoru Hesaplama', description: 'AI tabanlı risk analizi eklendi' }
              ],
              stepsModified: [
                { 
                  stepName: 'Müşteri Bilgileri Doğrulama',
                  oldDuration: '2 gün',
                  newDuration: '1 gün',
                  change: 'e-Devlet entegrasyonu ile hızlandırıldı'
                }
              ],
              customFlow: [
                { step: 4, arrow: true, newName: 'K8s Test' },
                { step: 7, arrow: true, explanation: 'Buradan 3.cü adıma devam eder. Tüm sorunlar çözülene kadar bu şekilde devam eder' }
              ],
              slaChanges: {
                oldSLA: '5 iş günü',
                newSLA: '3 iş günü',
                improvement: '%40 daha hızlı'
              }
            }
          }
        ]
      },
      authorization: {
        added: [
          { name: 'PAYMENT_ADMIN', description: 'Ödeme yöneticisi rolü', details: 'Ödeme işlemlerini yönetebilme yetkisi' },
          { name: 'REPORT_VIEWER', description: 'Rapor görüntüleyici rolü', details: 'Sadece rapor görüntüleme yetkisi' }
        ],
        removed: [
          { name: 'LEGACY_USER', description: 'Eski kullanıcı rolü', details: 'Artık geçersiz olan rol' }
        ],
        updated: [
          {
            name: 'ADMIN',
            description: 'Sistem yöneticisi rolü',
            oldValue: 'Tüm modüllere erişim',
            newValue: 'Güvenlik modülü hariç tüm modüllere erişim',
            details: 'Güvenlik için yetki kısıtlaması yapıldı'
          }
        ]
      },
      parameters: {
        added: [
          { name: 'MAX_DAILY_TRANSACTION_LIMIT', description: 'Günlük işlem limiti', details: 'Günlük maksimum işlem sayısı: 1000' },
          { name: 'AUTO_LOGOUT_TIME', description: 'Otomatik çıkış süresi', details: 'İnaktivite sonrası otomatik çıkış: 30 dakika' }
        ],
        removed: [
          { name: 'OLD_ENCRYPTION_KEY', description: 'Eski şifreleme anahtarı', details: 'Güvenlik güncellenmesi ile kaldırıldı' }
        ],
        updated: [
          {
            name: 'SESSION_TIMEOUT',
            description: 'Oturum zaman aşımı',
            oldValue: '60 dakika',
            newValue: '30 dakika',
            details: 'Güvenlik gereksinimlerine uygun olarak azaltıldı'
          },
          {
            name: 'FILE_UPLOAD_SIZE',
            description: 'Dosya yükleme boyutu',
            oldValue: '10 MB',
            newValue: '50 MB',
            details: 'Kullanıcı istekleri doğrultusunda artırıldı'
          }
        ]
      },
      approvals: {
        added: [
          { name: 'HighAmountTransferApproval', description: 'Yüksek tutarlı transfer onayı', details: '100.000 TL üzeri transferler için onay gerekli' },
          { name: 'NewUserRegistrationApproval', description: 'Yeni kullanıcı kayıt onayı', details: 'Kurumsal hesaplar için onay süreci' }
        ],
        removed: [
          { name: 'DailyReportApproval', description: 'Günlük rapor onayı', details: 'Artık otomatik olarak oluşturuluyor' }
        ],
        updated: [
          {
            name: 'CreditApplicationApproval',
            description: 'Kredi başvuru onayı',
            oldValue: '2 seviyeli onay',
            newValue: '3 seviyeli onay',
            details: 'Risk yönetimi için ek onay seviyesi eklendi'
          }
        ]
      },
      accounting: {
        added: [
          { name: 'AutomaticReconciliation', description: 'Otomatik mutabakat', details: 'Günlük otomatik hesap mutabakatı' },
          { name: 'TaxCalculationModule', description: 'Vergi hesaplama modülü', details: 'Otomatik vergi hesaplaması' }
        ],
        removed: [
          { name: 'ManualLedgerEntry', description: 'Manuel defter girişi', details: 'Artık otomatik sistemle değiştirildi' }
        ],
        updated: [
          {
            name: 'MonthlyClosing',
            description: 'Aylık kapanış süreci',
            oldValue: 'Manuel kapanış - 5 gün',
            newValue: 'Otomatik kapanış - 2 gün',
            details: 'Süreç otomatikleştirildi ve hızlandırıldı'
          }
        ]
      }
    },
    'v1.23.0': {
      // v6.2.0 için daha az değişiklik örneği
      apis: {
        added: [
          { 
            name: 'getCacheData', 
            description: 'Cache veri erişim API\'si',
            microservice: 'cache-service',
            httpMethod: 'GET',
            apiPath: '/api/v1/cache/{key}',
            details: 'Performans iyileştirmesi için cache servisi',
            requestModel: {
              name: 'CacheRequest',
              changes: {
                added: [
                  { property: 'key', type: 'string', description: 'Cache anahtarı' },
                  { property: 'ttl', type: 'integer', description: 'Yaşam süresi (saniye)' }
                ],
                removed: [],
                updated: []
              }
            },
            responseModel: {
              name: 'CacheResponse',
              changes: {
                added: [
                  { property: 'data', type: 'object', description: 'Cache\'lenmiş veri' },
                  { property: 'hit', type: 'boolean', description: 'Cache hit durumu' },
                  { property: 'createdAt', type: 'datetime', description: 'Cache oluşturulma zamanı' }
                ],
                removed: [],
                updated: []
              }
            }
          }
        ],
        removed: [],
        updated: [
          {
            name: 'connectDatabase',
            description: 'Veritabanı bağlantı API\'si',
            microservice: 'database-service',
            httpMethod: 'POST',
            apiPath: '/api/v1/db/connect',
            oldValue: 'PostgreSQL 12 desteği',
            newValue: 'PostgreSQL 14 desteği',
            details: 'Veritabanı sürümü güncellendi',
            requestModel: {
              name: 'DatabaseConnectRequest',
              changes: {
                added: [],
                removed: [],
                updated: [
                  { 
                    property: 'version', 
                    oldType: 'string', 
                    newType: 'string', 
                    oldDescription: 'PostgreSQL 12', 
                    newDescription: 'PostgreSQL 14' 
                  }
                ]
              }
            },
            responseModel: {
              name: 'DatabaseConnectResponse',
              changes: {
                added: [
                  { property: 'serverVersion', type: 'string', description: 'Sunucu versiyon bilgisi' }
                ],
                removed: [],
                updated: []
              }
            }
          }
        ]
      },
      processes: {
        added: [],
        removed: [],
        updated: [
          {
            code: 'P-USER-REG-001',
            name: 'UserRegistrationProcess',
            description: 'Kullanıcı kayıt süreci',
            module: 'User Management Module',
            oldValue: 'Email doğrulama: İsteğe bağlı, SMS doğrulama: Yok',
            newValue: 'Email doğrulama: Zorunlu, SMS doğrulama: Opsiyonel',
            details: 'Güvenlik için email doğrulama zorunlu hale getirildi ve SMS seçeneği eklendi',
            processDesign: {
              stepsRemoved: [],
              stepsAdded: [
                { stepName: 'Email Doğrulama Kontrolü', description: 'Kayıt tamamlanmadan email doğrulanmalı' },
                { stepName: 'SMS Onay (Opsiyonel)', description: 'İki faktörlü doğrulama için SMS seçeneği' }
              ],
              stepsModified: [
                { 
                  stepName: 'Kullanıcı Bilgileri Validasyonu',
                  oldDuration: 'Anında',
                  newDuration: 'Anında + Email doğrulama (max 24 saat)',
                  change: 'Email doğrulama bekleme süresi eklendi'
                }
              ],
              slaChanges: {
                oldSLA: 'Anında tamamlanır',
                newSLA: 'Max 24 saat (email doğrulama)',
                improvement: 'Güvenlik artışı'
              }
            }
          }
        ]
      },
      tables: {
        added: [
          {
            tableName: 'user_sessions',
            description: 'Kullanıcı oturum takibi',
            columns: [
              { name: 'session_id', type: 'VARCHAR(255)', nullable: false, description: 'Oturum benzersiz ID' },
              { name: 'user_id', type: 'BIGINT', nullable: false, description: 'Kullanıcı ID (FK)' },
              { name: 'ip_address', type: 'VARCHAR(45)', nullable: true, description: 'Kullanıcı IP adresi' },
              { name: 'user_agent', type: 'TEXT', nullable: true, description: 'Tarayıcı bilgisi' },
              { name: 'created_at', type: 'TIMESTAMP', nullable: false, description: 'Oturum başlangıç zamanı' },
              { name: 'expires_at', type: 'TIMESTAMP', nullable: false, description: 'Oturum bitiş zamanı' }
            ]
          },
          {
            tableName: 'audit_logs',
            description: 'Sistem denetim kayıtları',
            columns: [
              { name: 'id', type: 'BIGINT', nullable: false, description: 'Otomatik artan ID (PK)' },
              { name: 'user_id', type: 'BIGINT', nullable: true, description: 'İşlemi yapan kullanıcı' },
              { name: 'action', type: 'VARCHAR(100)', nullable: false, description: 'Yapılan işlem tipi' },
              { name: 'entity_type', type: 'VARCHAR(100)', nullable: false, description: 'Etkilenen varlık tipi' },
              { name: 'entity_id', type: 'VARCHAR(100)', nullable: true, description: 'Etkilenen varlık ID' },
              { name: 'old_value', type: 'JSON', nullable: true, description: 'Eski değer' },
              { name: 'new_value', type: 'JSON', nullable: true, description: 'Yeni değer' },
              { name: 'created_at', type: 'TIMESTAMP', nullable: false, description: 'İşlem zamanı' }
            ]
          }
        ],
        removed: [
          {
            tableName: 'legacy_cache',
            description: 'Eski cache tablosu',
            reason: 'Redis\'e geçiş yapıldı, artık kullanılmıyor'
          }
        ],
        updated: [
          {
            tableName: 'users',
            description: 'Kullanıcı bilgileri tablosu',
            columnsAdded: [
              { name: 'two_factor_enabled', type: 'BOOLEAN', nullable: false, default: 'false', description: 'İki faktörlü doğrulama aktif mi?' },
              { name: 'phone_verified', type: 'BOOLEAN', nullable: false, default: 'false', description: 'Telefon doğrulandı mı?' },
              { name: 'last_login_ip', type: 'VARCHAR(45)', nullable: true, description: 'Son giriş IP adresi' }
            ],
            columnsRemoved: [
              { name: 'old_password_hash', type: 'VARCHAR(255)', reason: 'Artık sadece aktif şifre tutulacak' }
            ],
            columnsModified: [
              { 
                name: 'email', 
                oldType: 'VARCHAR(100)', 
                newType: 'VARCHAR(255)', 
                oldNullable: true,
                newNullable: false,
                change: 'Email alanı zorunlu hale getirildi ve uzunluğu artırıldı'
              },
              { 
                name: 'username', 
                oldType: 'VARCHAR(50)', 
                newType: 'VARCHAR(100)', 
                oldNullable: false,
                newNullable: false,
                change: 'Kullanıcı adı maksimum uzunluğu artırıldı'
              }
            ]
          },
          {
            tableName: 'transactions',
            description: 'İşlem kayıtları tablosu',
            columnsAdded: [
              { name: 'currency_code', type: 'VARCHAR(3)', nullable: false, default: 'TRY', description: 'Para birimi kodu (ISO 4217)' },
              { name: 'exchange_rate', type: 'DECIMAL(10,4)', nullable: true, description: 'Döviz kuru (varsa)' }
            ],
            columnsRemoved: [],
            columnsModified: [
              { 
                name: 'amount', 
                oldType: 'DECIMAL(10,2)', 
                newType: 'DECIMAL(18,4)', 
                oldNullable: false,
                newNullable: false,
                change: 'Hassasiyet ve maksimum tutar artırıldı'
              }
            ]
          }
        ]
      },
      authorization: {
        added: [
          { name: 'CACHE_ADMIN', description: 'Cache yöneticisi rolü', details: 'Cache yönetimi için yeni rol' }
        ],
        removed: [],
        updated: []
      },
      parameters: {
        added: [
          { name: 'CACHE_TTL', description: 'Cache yaşam süresi', details: 'Cache verilerin yaşam süresi: 3600 saniye' }
        ],
        removed: [],
        updated: []
      },
      approvals: {
        added: [],
        removed: [],
        updated: []
      },
      accounting: {
        added: [],
        removed: [],
        updated: []
      }
    }
  };

  // Değişiklik türü için renk ve icon getirme
  const getChangeTypeInfo = (type) => {
    switch (type) {
      case 'added':
        return { color: 'success', icon: <AddIcon fontSize="small" />, label: 'Eklenenler' };
      case 'removed':
        return { color: 'error', icon: <RemoveIcon fontSize="small" />, label: 'Silinenler' };
      case 'updated':
        return { color: 'warning', icon: <EditIcon fontSize="small" />, label: 'Güncellenenler' };
      default:
        return { color: 'default', icon: null, label: '' };
    }
  };

  // Seçili versiyonun verilerini getir
  const currentVersionData = changesData[selectedVersion] || {};

  // Toplam değişiklik sayısını hesapla
  const getTotalChanges = () => {
    let total = 0;
    Object.values(currentVersionData).forEach(category => {
      total += (category.added?.length || 0) + (category.removed?.length || 0) + (category.updated?.length || 0);
    });
    return total;
  };

  // Model değişikliklerini render etme fonksiyonu
  const renderModelChanges = (modelData) => {
    // Eğer süreç tasarımı ise
    if (modelData.stepsAdded || modelData.stepsRemoved || modelData.stepsModified) {
      return (
        <Box>
          {/* Silinen Adımlar */}
          {modelData.stepsRemoved && modelData.stepsRemoved.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" color="error.main" gutterBottom>
                ➖ Kaldırılan Süreç Adımları ({modelData.stepsRemoved.length})
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Adım</strong></TableCell>
                      <TableCell><strong>Kaldırılma Nedeni</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {modelData.stepsRemoved.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Chip label={item.stepName} size="small" color="error" />
                        </TableCell>
                        <TableCell>{item.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Eklenen Adımlar */}
          {modelData.stepsAdded && modelData.stepsAdded.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" color="success.main" gutterBottom>
                ➕ Eklenen Süreç Adımları ({modelData.stepsAdded.length})
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Adım</strong></TableCell>
                      <TableCell><strong>Açıklama</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {modelData.stepsAdded.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Chip label={item.stepName} size="small" color="success" />
                        </TableCell>
                        <TableCell>{item.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Değiştirilen Adımlar */}
          {modelData.stepsModified && modelData.stepsModified.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" color="info.main" gutterBottom>
                🔄 Değiştirilen Süreç Adımları ({modelData.stepsModified.length})
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Adım</strong></TableCell>
                      <TableCell><strong>Eski Süre</strong></TableCell>
                      <TableCell><strong>Yeni Süre</strong></TableCell>
                      <TableCell><strong>Değişiklik</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {modelData.stepsModified.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Chip label={item.stepName} size="small" color="info" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="error.main">
                            {item.oldDuration}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="success.main">
                            {item.newDuration}
                          </Typography>
                        </TableCell>
                        <TableCell>{item.change}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* SLA Değişiklikleri */}
          {modelData.slaChanges && (
            <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>
                📊 SLA Değişiklikleri
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Eski SLA</Typography>
                  <Typography variant="body1" color="error.main" fontWeight="bold">
                    {modelData.slaChanges.oldSLA}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Yeni SLA</Typography>
                  <Typography variant="body1" color="success.main" fontWeight="bold">
                    {modelData.slaChanges.newSLA}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">İyileştirme</Typography>
                  <Typography variant="body1" color="primary.main" fontWeight="bold">
                    {modelData.slaChanges.improvement}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </Box>
      );
    }

    // API Model değişiklikleri
    const { changes } = modelData;
    
    return (
      <Box>
        {/* Eklenenler */}
        {changes.added.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" color="success.main" gutterBottom>
              ➕ Eklenen Özellikler ({changes.added.length})
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Özellik</strong></TableCell>
                    <TableCell><strong>Tür</strong></TableCell>
                    <TableCell><strong>Açıklama</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {changes.added.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Chip label={item.property} size="small" color="success" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {item.type}
                        </Typography>
                      </TableCell>
                      <TableCell>{item.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Silinenler */}
        {changes.removed.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" color="error.main" gutterBottom>
              ➖ Silinen Özellikler ({changes.removed.length})
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Özellik</strong></TableCell>
                    <TableCell><strong>Tür</strong></TableCell>
                    <TableCell><strong>Açıklama</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {changes.removed.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Chip label={item.property} size="small" color="error" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {item.type}
                        </Typography>
                      </TableCell>
                      <TableCell>{item.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Güncellenenler */}
        {changes.updated.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" color="warning.main" gutterBottom>
              ✏️ Güncellenen Özellikler ({changes.updated.length})
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Özellik</strong></TableCell>
                    <TableCell><strong>Eski Değer</strong></TableCell>
                    <TableCell><strong>Yeni Değer</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {changes.updated.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Chip label={item.property} size="small" color="warning" />
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" color="error.main">
                            {item.oldType && `Tür: ${item.oldType}`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.oldDescription}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" color="success.main">
                            {item.newType && `Tür: ${item.newType}`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.newDescription}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {changes.added.length === 0 && changes.removed.length === 0 && changes.updated.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
            Bu modelde değişiklik bulunmuyor
          </Typography>
        )}
      </Box>
    );
  };

  return (
    <Box>
      {/* Header */}
      <Paper elevation={4} sx={{ p: 3, mb: 4, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/releases')}
              variant="outlined"
              size="small"
            >
              Geri
            </Button>
            <Box>
              <Typography variant="h4" fontWeight="bold" color="primary.main" gutterBottom>
                Değişiklik Takibi
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                {selectedVersion} versiyonu için yapılan değişiklikler
              </Typography>
            </Box>
          </Box>
          <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main' }}>
            <HistoryIcon fontSize="large" />
          </Avatar>
        </Box>

        {/* Versiyon Seçimi ve İstatistikler */}
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Versiyon Seç</InputLabel>
            <Select
              value={selectedVersion}
              label="Versiyon Seç"
              onChange={(e) => setSelectedVersion(e.target.value)}
            >
              {versions.map(version => (
                <MenuItem key={version} value={version}>{version}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Chip 
            label={`Toplam ${getTotalChanges()} Değişiklik`} 
            color="primary" 
            variant="filled"
            sx={{ fontWeight: 'bold' }}
          />

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<ExpandAllIcon />}
              onClick={handleExpandAll}
              size="small"
            >
              Tümünü Aç
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<CollapseAllIcon />}
              onClick={handleCollapseAll}
              size="small"
            >
              Tümünü Kapat
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Değişiklik Kategorileri */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {changeCategories.map(category => {
          const categoryData = currentVersionData[category.key] || { added: [], removed: [], updated: [] };
          const totalCategoryChanges = (categoryData.added?.length || 0) + 
                                       (categoryData.removed?.length || 0) + 
                                       (categoryData.updated?.length || 0);

          return (
            <Accordion 
              key={category.key} 
              expanded={expandedCategories[category.key] || false}
              onChange={handleCategoryToggle(category.key)}
              elevation={2}
              sx={{ borderRadius: 2, '&:before': { display: 'none' } }}
            >
              <AccordionSummary 
                expandIcon={<ExpandMoreIcon />}
                sx={{ 
                  bgcolor: `${category.color}.light`,
                  borderRadius: '8px 8px 0 0',
                  '&.Mui-expanded': { minHeight: 56 }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <Avatar sx={{ bgcolor: `${category.color}.main`, width: 40, height: 40 }}>
                    {category.icon}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" fontWeight="bold" color={`${category.color}.main`}>
                      {category.label}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {totalCategoryChanges > 0 ? `${totalCategoryChanges} değişiklik` : 'Değişiklik yok'}
                    </Typography>
                  </Box>
                  <Badge 
                    badgeContent={totalCategoryChanges} 
                    color={totalCategoryChanges > 0 ? 'primary' : 'default'}
                    sx={{ mr: 2 }}
                  >
                    <Chip 
                      label={category.label.split(' ')[0]}
                      size="small"
                      color={category.color}
                      variant="outlined"
                    />
                  </Badge>
                </Box>
              </AccordionSummary>
              
              <AccordionDetails sx={{ p: 0 }}>
                {/* Alt Kategoriler: Added, Removed, Updated */}
                {['added', 'removed', 'updated'].map(changeType => {
                  const changeTypeInfo = getChangeTypeInfo(changeType);
                  const items = categoryData[changeType] || [];
                  
                  if (items.length === 0) return null;

                  return (
                    <Accordion 
                      key={changeType}
                      elevation={1}
                      sx={{ 
                        '&:before': { display: 'none' },
                        '&.Mui-expanded': { margin: 0 }
                      }}
                    >
                      <AccordionSummary 
                        expandIcon={<ExpandMoreIcon />}
                        sx={{ 
                          bgcolor: `${changeTypeInfo.color}.light`,
                          minHeight: 48,
                          '&.Mui-expanded': { minHeight: 48 }
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: `${changeTypeInfo.color}.main`, width: 32, height: 32 }}>
                            {changeTypeInfo.icon}
                          </Avatar>
                          <Typography variant="subtitle1" fontWeight="medium" color={`${changeTypeInfo.color}.main`}>
                            {changeTypeInfo.label} ({items.length})
                          </Typography>
                        </Box>
                      </AccordionSummary>
                      
                      <AccordionDetails sx={{ p: 2 }}>
                        {changeType === 'updated' ? (
                          // API güncellemeleri için özel tablo görünümü
                          category.key === 'apis' ? (
                            <TableContainer component={Paper} variant="outlined">
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell><strong>API</strong></TableCell>
                                    <TableCell><strong>Mikroservis</strong></TableCell>
                                    <TableCell><strong>Method/Path</strong></TableCell>
                                    <TableCell><strong>Değişiklik</strong></TableCell>
                                    <TableCell><strong>Modeller</strong></TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {items.map((item, index) => (
                                    <TableRow key={index}>
                                      <TableCell>
                                        <Typography variant="subtitle2" fontWeight="bold">
                                          {item.name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          {item.description}
                                        </Typography>
                                      </TableCell>
                                      <TableCell>
                                        <Chip 
                                          label={item.microservice} 
                                          size="small" 
                                          color="primary" 
                                          variant="outlined"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Box>
                                          <Chip 
                                            label={item.httpMethod} 
                                            size="small" 
                                            color={item.httpMethod === 'GET' ? 'success' : item.httpMethod === 'POST' ? 'warning' : 'info'}
                                            sx={{ mb: 0.5 }}
                                          />
                                          <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
                                            {item.apiPath}
                                          </Typography>
                                        </Box>
                                      </TableCell>
                                      <TableCell>
                                        <Box>
                                          <Typography variant="body2" color="error.main" sx={{ mb: 0.5 }}>
                                            ➖ {item.oldValue}
                                          </Typography>
                                          <Typography variant="body2" color="success.main">
                                            ➕ {item.newValue}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                            {item.details}
                                          </Typography>
                                        </Box>
                                      </TableCell>
                                      <TableCell>
                                        <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                                          {item.requestModel && (
                                            <Button 
                                              size="small" 
                                              startIcon={<VisibilityIcon />}
                                              onClick={() => handleOpenModelDialog(item.requestModel, 'request')}
                                              variant="outlined"
                                              color="primary"
                                            >
                                              Request
                                            </Button>
                                          )}
                                          {item.responseModel && (
                                            <Button 
                                              size="small" 
                                              startIcon={<VisibilityIcon />}
                                              onClick={() => handleOpenModelDialog(item.responseModel, 'response')}
                                              variant="outlined"
                                              color="secondary"
                                            >
                                              Response
                                            </Button>
                                          )}
                                        </Box>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          ) : category.key === 'processes' ? (
                            // Süreç güncellemeleri için özel tablo görünümü
                            <TableContainer component={Paper} variant="outlined">
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell><strong>Süreç</strong></TableCell>
                                    <TableCell><strong>Modül</strong></TableCell>
                                    <TableCell><strong>Değişiklik</strong></TableCell>
                                    <TableCell><strong>Tasarım</strong></TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {items.map((item, index) => (
                                    <TableRow key={index}>
                                      <TableCell>
                                        <Typography variant="subtitle2" fontWeight="bold">
                                          {item.code}
                                        </Typography>
                                        <Typography variant="body2">
                                          {item.name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          {item.description}
                                        </Typography>
                                      </TableCell>
                                      <TableCell>
                                        <Chip 
                                          label={item.module} 
                                          size="small" 
                                          color="primary" 
                                          variant="outlined"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Box>
                                          <Typography variant="body2" color="error.main" sx={{ mb: 0.5 }}>
                                            ➖ {item.oldValue}
                                          </Typography>
                                          <Typography variant="body2" color="success.main">
                                            ➕ {item.newValue}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block', mt: 0.5 }}>
                                            {item.details}
                                          </Typography>
                                        </Box>
                                      </TableCell>
                                      <TableCell>
                                        {item.processDesign && (
                                          <Button 
                                            size="small" 
                                            startIcon={<VisibilityIcon />}
                                            onClick={() => handleOpenModelDialog(item.processDesign, 'process')}
                                            variant="outlined"
                                            color="info"
                                          >
                                            Tasarım Değişiklikleri
                                          </Button>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          ) : category.key === 'tables' ? (
                            <Box>
                              {changeType === 'added' && items.length > 0 && (
                                <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                                  <Table size="small">
                                    <TableHead>
                                      <TableRow>
                                        <TableCell><strong>Tablo Adı</strong></TableCell>
                                        <TableCell><strong>Açıklama</strong></TableCell>
                                        <TableCell><strong>Kolonlar</strong></TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {items.map((table, idx) => (
                                        <TableRow key={idx}>
                                          <TableCell>
                                            <Chip label={table.tableName} color="success" variant="outlined" />
                                          </TableCell>
                                          <TableCell>
                                            <Typography variant="body2">{table.description}</Typography>
                                          </TableCell>
                                          <TableCell>
                                            <Box>
                                              {table.columns.map((col, cidx) => (
                                                <Chip key={cidx} label={`${col.name} (${col.type}${col.nullable ? ', NULL' : ', NOT NULL'})`} variant="outlined" sx={{ mr: 0.5, mb: 0.5 }} />
                                              ))}
                                            </Box>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </TableContainer>
                              )}
                              {changeType === 'removed' && items.length > 0 && (
                                <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                                  <Table size="small">
                                    <TableHead>
                                      <TableRow>
                                        <TableCell><strong>Tablo Adı</strong></TableCell>
                                        <TableCell><strong>Açıklama</strong></TableCell>
                                        <TableCell><strong>Kaldırılma Nedeni</strong></TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {items.map((table, idx) => (
                                        <TableRow key={idx}>
                                          <TableCell>
                                            <Chip label={table.tableName} color="error" variant="outlined" />
                                          </TableCell>
                                          <TableCell>
                                            <Typography variant="body2">{table.description}</Typography>
                                          </TableCell>
                                          <TableCell>
                                            <Typography variant="body2" color="error.main">{table.reason}</Typography>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </TableContainer>
                              )}
                              {changeType === 'updated' && items.length > 0 && (
                                <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                                  <Table size="small">
                                    <TableHead>
                                      <TableRow>
                                        <TableCell><strong>Tablo Adı</strong></TableCell>
                                        <TableCell><strong>Açıklama</strong></TableCell>
                                        <TableCell><strong>Eklenen Kolonlar</strong></TableCell>
                                        <TableCell><strong>Silinen Kolonlar</strong></TableCell>
                                        <TableCell><strong>Güncellenen Kolonlar</strong></TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {items.map((table, idx) => (
                                        <TableRow key={idx}>
                                          <TableCell>
                                            <Chip label={table.tableName} color="warning" variant="outlined" />
                                          </TableCell>
                                          <TableCell>
                                            <Typography variant="body2">{table.description}</Typography>
                                          </TableCell>
                                          <TableCell>
                                            <Box>
                                              {(table.columnsAdded || []).map((col, cidx) => (
                                                <Chip key={cidx} label={`${col.name} (${col.type}${col.nullable ? ', NULL' : ', NOT NULL'})`} color="success" variant="outlined" sx={{ mr: 0.5, mb: 0.5 }} />
                                              ))}
                                            </Box>
                                          </TableCell>
                                          <TableCell>
                                            <Box>
                                              {(table.columnsRemoved || []).map((col, cidx) => (
                                                <Chip key={cidx} label={`${col.name} (${col.type})`} color="error" variant="outlined" sx={{ mr: 0.5, mb: 0.5 }} />
                                              ))}
                                            </Box>
                                          </TableCell>
                                          <TableCell>
                                            <Box>
                                              {(table.columnsModified || []).map((col, cidx) => (
                                                <Box key={cidx} sx={{ mb: 1 }}>
                                                  <Typography variant="body2" color="warning.main">
                                                    {col.name}: {col.oldType} ➔ {col.newType} {col.oldNullable !== col.newNullable ? `(${col.oldNullable ? 'NULL' : 'NOT NULL'} ➔ ${col.newNullable ? 'NULL' : 'NOT NULL'})` : ''}
                                                  </Typography>
                                                  <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                                    {col.change}
                                                  </Typography>
                                                </Box>
                                              ))}
                                            </Box>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </TableContainer>
                              )}
                            </Box>
                          ) : (
                            // Diğer kategoriler için standart tablo (updated)
                            <TableContainer component={Paper} variant="outlined">
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell><strong>Öğe</strong></TableCell>
                                    <TableCell><strong>Eski Değer</strong></TableCell>
                                    <TableCell><strong>Yeni Değer</strong></TableCell>
                                    <TableCell><strong>Açıklama</strong></TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {items.map((item, index) => (
                                    <TableRow key={index}>
                                      <TableCell>
                                        <Typography variant="subtitle2" fontWeight="bold">
                                          {item.name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          {item.description}
                                        </Typography>
                                      </TableCell>
                                      <TableCell>
                                        <Chip 
                                          label={item.oldValue} 
                                          size="small" 
                                          color="error" 
                                          variant="outlined"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Chip 
                                          label={item.newValue} 
                                          size="small" 
                                          color="success" 
                                          variant="outlined"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Typography variant="body2">
                                          {item.details}
                                        </Typography>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          )
                        ) : (
                          // Eklenen/Silinen öğeler için liste görünümü (API'ler dahil)
                          category.key === 'apis' ? (
                            <TableContainer component={Paper} variant="outlined">
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell><strong>API</strong></TableCell>
                                    <TableCell><strong>Mikroservis</strong></TableCell>
                                    <TableCell><strong>Method/Path</strong></TableCell>
                                    <TableCell><strong>Açıklama</strong></TableCell>
                                    {changeType === 'added' && <TableCell><strong>Modeller</strong></TableCell>}
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {items.map((item, index) => (
                                    <TableRow key={index}>
                                      <TableCell>
                                        <Typography variant="subtitle2" fontWeight="bold">
                                          {item.name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          {item.description}
                                        </Typography>
                                      </TableCell>
                                      <TableCell>
                                        <Chip 
                                          label={item.microservice} 
                                          size="small" 
                                          color="primary" 
                                          variant="outlined"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Box>
                                          {item.httpMethod && (
                                            <Chip 
                                              label={item.httpMethod} 
                                              size="small" 
                                              color={item.httpMethod === 'GET' ? 'success' : item.httpMethod === 'POST' ? 'warning' : 'info'}
                                              sx={{ mb: 0.5 }}
                                            />
                                          )}
                                          {item.apiPath && (
                                            <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
                                              {item.apiPath}
                                            </Typography>
                                          )}
                                        </Box>
                                      </TableCell>
                                      <TableCell>
                                        <Typography variant="body2">
                                          {item.details}
                                        </Typography>
                                      </TableCell>
                                      {changeType === 'added' && (
                                        <TableCell>
                                          <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                                            {item.requestModel && (
                                              <Button 
                                                size="small" 
                                                startIcon={<VisibilityIcon />}
                                                onClick={() => handleOpenModelDialog(item.requestModel, 'request')}
                                                variant="outlined"
                                                color="primary"
                                              >
                                                Request
                                              </Button>
                                            )}
                                            {item.responseModel && (
                                              <Button 
                                                size="small" 
                                                startIcon={<VisibilityIcon />}
                                                onClick={() => handleOpenModelDialog(item.responseModel, 'response')}
                                                variant="outlined"
                                                color="secondary"
                                              >
                                                Response
                                              </Button>
                                            )}
                                          </Box>
                                        </TableCell>
                                      )}
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          ) : category.key === 'processes' ? (
                            // Süreç ekleme/silme için özel tablo görünümü
                            <TableContainer component={Paper} variant="outlined">
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell><strong>Kod</strong></TableCell>
                                    <TableCell><strong>Süreç Adı</strong></TableCell>
                                    <TableCell><strong>Modül</strong></TableCell>
                                    <TableCell><strong>Açıklama</strong></TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {items.map((item, index) => (
                                    <TableRow key={index}>
                                      <TableCell>
                                        <Chip 
                                          label={item.code} 
                                          size="small" 
                                          color={changeType === 'added' ? 'success' : 'error'}
                                          variant="outlined"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Typography variant="subtitle2" fontWeight="bold">
                                          {item.name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          {item.description}
                                        </Typography>
                                      </TableCell>
                                      <TableCell>
                                        <Chip 
                                          label={item.module} 
                                          size="small" 
                                          color="primary" 
                                          variant="outlined"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Typography variant="body2">
                                          {item.details}
                                        </Typography>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          ) : (
                            // Diğer kategoriler için standart liste
                            <List>
                              {items.map((item, index) => (
                                <React.Fragment key={index}>
                                  <ListItem>
                                    <ListItemIcon>
                                      <Avatar sx={{ bgcolor: `${changeTypeInfo.color}.main`, width: 32, height: 32 }}>
                                        {changeTypeInfo.icon}
                                      </Avatar>
                                    </ListItemIcon>
                                    <ListItemText
                                      primary={
                                        <Typography variant="subtitle2" fontWeight="bold">
                                          {item.name}
                                        </Typography>
                                      }
                                      secondary={
                                        <Box>
                                          <Typography variant="body2" color="text.secondary">
                                            {item.description}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                            {item.details}
                                          </Typography>
                                        </Box>
                                      }
                                    />
                                  </ListItem>
                                  {index < items.length - 1 && <Divider variant="inset" component="li" />}
                                </React.Fragment>
                              ))}
                            </List>
                          ))}
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
                
                {totalCategoryChanges === 0 && (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Bu kategoride değişiklik bulunmuyor
                    </Typography>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>

      {/* Model Changes Dialog */}
      <Dialog 
        open={modelDialogOpen} 
        onClose={handleCloseModelDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <VisibilityIcon />
            <Typography variant="h6">
              {currentModelType === 'process' 
                ? 'Süreç Tasarımı Değişiklikleri' 
                : currentModelType === 'request' 
                  ? 'Request Model Değişiklikleri' 
                  : 'Response Model Değişiklikleri'
              }
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {currentModel && renderModelChanges(currentModel)}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModelDialog} variant="outlined">
            Kapat
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChangeTracking;