import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Avatar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondary,
  Divider,
  Badge,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  Assignment as TodoIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  InsertDriveFile as FileIcon,
  Code as ScriptIcon,
  Storage as BackupIcon,
  Settings as ConfigIcon,
  Assignment as ChecklistIcon,
  Undo as RollbackIcon,
  BugReport as TestIcon,
  Assessment as ReportIcon,
  Description as DocumentIcon,
  AttachFile as AttachmentIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';

const TodoList = () => {
  const navigate = useNavigate();
  const [selectedEnvironment, setSelectedEnvironment] = useState('Dev');
  const [selectedPhase, setSelectedPhase] = useState('all');
  const [selectedVersion, setSelectedVersion] = useState('v1.25.0');
  const [todos, setTodos] = useState([
    // Geçişten Önce
    {
      id: 1,
      title: 'Database backup alma',
      description: 'Production database\'in güncel backup\'ını al',
      phase: 'before',
      environments: ['Test', 'PreProd', 'Prod'],
      versions: ['v1.25.0', 'v1.24.0', 'v1.23.0'], // Tüm versiyonlarda geçerli
      completionStatus: {
        'Dev': { completed: false, completedAt: null },
        'Test': { completed: true, completedAt: '2025-10-18T09:30:00' },
        'PreProd': { completed: true, completedAt: '2025-10-18T10:15:00' },
        'Prod': { completed: false, completedAt: null }
      },
      priority: 'high',
      estimatedTime: '30 dakika',
      attachments: [
        { type: 'backup', name: 'backup_script.sql', size: '2.3 MB' },
        { type: 'document', name: 'backup_proseduru.pdf', size: '450 KB' }
      ]
    },
    {
      id: 2,
      title: 'Maintenance modu aktif et',
      description: 'Kullanıcılara bakım bildirimi göster',
      phase: 'before',
      environments: ['PreProd', 'Prod'],
      versions: ['v1.25.0', 'v1.24.0', 'v1.23.0'],
      completionStatus: {
        'Dev': { completed: false, completedAt: null },
        'Test': { completed: false, completedAt: null },
        'PreProd': { completed: true, completedAt: '2025-10-18T10:30:00' },
        'Prod': { completed: false, completedAt: null }
      },
      priority: 'medium',
      estimatedTime: '5 dakika'
    },
    {
      id: 3,
      title: 'Load balancer konfigürasyonu kontrol et',
      description: 'Yeni versiyon için load balancer ayarlarını doğrula',
      phase: 'before',
      environments: ['Prod'],
      versions: ['v1.25.0', 'v1.24.0'],
      completionStatus: {
        'Dev': { completed: false, completedAt: null },
        'Test': { completed: false, completedAt: null },
        'PreProd': { completed: false, completedAt: null },
        'Prod': { completed: false, completedAt: null }
      },
      priority: 'high',
      estimatedTime: '15 dakika',
      attachments: [
        { type: 'config', name: 'nginx.conf', size: '15 KB' },
        { type: 'checklist', name: 'lb_kontrol_listesi.xlsx', size: '28 KB' }
      ]
    },
    
    // v6.2.1'e özel geçiş öncesi işlem
    {
      id: 11,
      title: 'Yeni Redis cluster konfigürasyonu',
      description: 'v6.2.1 ile gelen yeni Redis cluster mimarisini hazırla',
      phase: 'before',
      environments: ['Test', 'PreProd', 'Prod'],
      versions: ['v1.25.0'], // Sadece v6.2.1'de gerekli
      completionStatus: {
        'Dev': { completed: false, completedAt: null },
        'Test': { completed: false, completedAt: null },
        'PreProd': { completed: false, completedAt: null },
        'Prod': { completed: false, completedAt: null }
      },
      priority: 'critical',
      estimatedTime: '45 dakika',
      attachments: [
        { type: 'config', name: 'redis-cluster.conf', size: '8 KB' },
        { type: 'script', name: 'cluster-setup.sh', size: '3 KB' }
      ]
    },
    
    // Geçiş Anında
    {
      id: 4,
      title: 'Application servislerini durdur',
      description: 'Tüm uygulama servislerini güvenli şekilde durdur',
      phase: 'during',
      environments: ['Test', 'PreProd', 'Prod'],
      versions: ['v1.25.0', 'v1.24.0', 'v1.23.0'],
      completionStatus: {
        'Dev': { completed: false, completedAt: null },
        'Test': { completed: true, completedAt: '2025-10-17T14:20:00' },
        'PreProd': { completed: false, completedAt: null },
        'Prod': { completed: false, completedAt: null }
      },
      priority: 'critical',
      estimatedTime: '10 dakika'
    },
    {
      id: 5,
      title: 'Database migration çalıştır',
      description: 'Yeni versiyon için gerekli database değişikliklerini uygula',
      phase: 'during',
      environments: ['Test', 'PreProd', 'Prod'],
      versions: ['v1.25.0', 'v1.24.0'],
      completionStatus: {
        'Dev': { completed: false, completedAt: null },
        'Test': { completed: true, completedAt: '2025-10-17T14:35:00' },
        'PreProd': { completed: false, completedAt: null },
        'Prod': { completed: false, completedAt: null }
      },
      priority: 'critical',
      estimatedTime: '45 dakika',
      attachments: [
        { type: 'script', name: 'migration_v6.2.1.sql', size: '856 KB' },
        { type: 'rollback', name: 'rollback_script.sql', size: '245 KB' },
        { type: 'document', name: 'migration_notes.md', size: '12 KB' }
      ]
    },
    
    // v6.2.1'e özel geçiş anında işlem
    {
      id: 12,
      title: 'Elasticsearch indeks yeniden oluştur',
      description: 'v6.2.1\'de değişen search schema için indeksleri yenile',
      phase: 'during',
      environments: ['Test', 'PreProd', 'Prod'],
      versions: ['v1.25.0'], // Sadece v6.2.1'de gerekli
      completionStatus: {
        'Dev': { completed: false, completedAt: null },
        'Test': { completed: false, completedAt: null },
        'PreProd': { completed: false, completedAt: null },
        'Prod': { completed: false, completedAt: null }
      },
      priority: 'high',
      estimatedTime: '25 dakika',
      attachments: [
        { type: 'script', name: 'reindex_elasticsearch.sh', size: '4 KB' },
        { type: 'config', name: 'new_mapping.json', size: '12 KB' }
      ]
    },
    {
      id: 6,
      title: 'Cache temizle',
      description: 'Redis cache\'i temizle ve yeniden başlat',
      phase: 'during',
      environments: ['Test', 'PreProd', 'Prod'],
      versions: ['v1.25.0', 'v1.24.0', 'v1.23.0'],
      completionStatus: {
        'Dev': { completed: true, completedAt: '2025-10-16T16:45:00' },
        'Test': { completed: true, completedAt: '2025-10-17T11:15:00' },
        'PreProd': { completed: true, completedAt: '2025-10-18T09:20:00' },
        'Prod': { completed: false, completedAt: null }
      },
      priority: 'medium',
      estimatedTime: '5 dakika'
    },

    // Geçişten Sonra
    {
      id: 7,
      title: 'Health check kontrolü',
      description: 'Tüm servislerin sağlıklı çalıştığını doğrula',
      phase: 'after',
      environments: ['Test', 'PreProd', 'Prod'],
      versions: ['v1.25.0', 'v1.24.0', 'v1.23.0'],
      completionStatus: {
        'Dev': { completed: true, completedAt: '2025-10-16T17:10:00' },
        'Test': { completed: true, completedAt: '2025-10-17T15:00:00' },
        'PreProd': { completed: true, completedAt: '2025-10-18T11:45:00' },
        'Prod': { completed: false, completedAt: null }
      },
      priority: 'critical',
      estimatedTime: '20 dakika'
    },
    {
      id: 8,
      title: 'Smoke test çalıştır',
      description: 'Kritik fonksiyonların çalıştığını test et',
      phase: 'after',
      environments: ['Test', 'PreProd', 'Prod'],
      versions: ['v1.25.0', 'v1.24.0', 'v1.23.0'],
      completionStatus: {
        'Dev': { completed: true, completedAt: '2025-10-16T17:25:00' },
        'Test': { completed: true, completedAt: '2025-10-17T15:20:00' },
        'PreProd': { completed: false, completedAt: null },
        'Prod': { completed: false, completedAt: null }
      },
      priority: 'high',
      estimatedTime: '30 dakika',
      attachments: [
        { type: 'test', name: 'smoke_test_suite.js', size: '34 KB' },
        { type: 'report', name: 'test_raporu_template.xlsx', size: '67 KB' }
      ]
    },
    {
      id: 9,
      title: 'Maintenance modu kapat',
      description: 'Bakım modunu kapat ve kullanıcıları bilgilendir',
      phase: 'after',
      environments: ['PreProd', 'Prod'],
      versions: ['v1.25.0', 'v1.24.0', 'v1.23.0'],
      completionStatus: {
        'Dev': { completed: false, completedAt: null },
        'Test': { completed: false, completedAt: null },
        'PreProd': { completed: true, completedAt: '2025-10-18T12:00:00' },
        'Prod': { completed: false, completedAt: null }
      },
      priority: 'high',
      estimatedTime: '5 dakika'
    },
    {
      id: 10,
      title: 'Monitoring dashboard kontrol et',
      description: 'Grafana ve diğer monitoring araçlarında anomali kontrolü',
      phase: 'after',
      environments: ['Prod'],
      versions: ['v1.25.0', 'v1.24.0', 'v1.23.0'],
      completionStatus: {
        'Dev': { completed: false, completedAt: null },
        'Test': { completed: false, completedAt: null },
        'PreProd': { completed: false, completedAt: null },
        'Prod': { completed: false, completedAt: null }
      },
      priority: 'medium',
      estimatedTime: '15 dakika'
    },
    
    // v6.2.1'e özel geçiş sonrası işlem
    {
      id: 13,
      title: 'Yeni API endpoint\'lerini test et',
      description: 'v1.25.0 ile eklenen yeni API\'lerin çalışmasını doğrula',
      phase: 'after',
      environments: ['Test', 'PreProd', 'Prod'],
      versions: ['v1.25.0'], // Sadece v1.25.0'de gerekli
      completionStatus: {
        'Dev': { completed: false, completedAt: null },
        'Test': { completed: false, completedAt: null },
        'PreProd': { completed: false, completedAt: null },
        'Prod': { completed: false, completedAt: null }
      },
      priority: 'high',
      estimatedTime: '20 dakika',
      attachments: [
        { type: 'test', name: 'api_test_collection.json', size: '18 KB' },
        { type: 'document', name: 'yeni_endpoints.md', size: '5 KB' }
      ]
    },
    
    // Dev ortamına özel işlemler
    {
      id: 14,
      title: 'Geliştirme veritabanını güncelle',
      description: 'Dev ortamı için migration script\'lerini çalıştır',
      phase: 'before',
      environments: ['Dev'],
      versions: ['v1.25.0', 'v1.24.0', 'v1.23.0'],
      completionStatus: {
        'Dev': { completed: true, completedAt: '2025-10-20T08:30:00' },
        'Test': { completed: false, completedAt: null },
        'PreProd': { completed: false, completedAt: null },
        'Prod': { completed: false, completedAt: null }
      },
      priority: 'high',
      estimatedTime: '15 dakika',
      attachments: [
        { type: 'script', name: 'migration_v1.25.sql', size: '12 KB' },
        { type: 'backup', name: 'dev_backup_pre_migration.sql', size: '4.2 MB' }
      ]
    },
    {
      id: 15,
      title: 'Docker container\'ları yeniden oluştur',
      description: 'Dev ortamı container\'larını yeni image ile güncelle',
      phase: 'during',
      environments: ['Dev'],
      versions: ['v1.25.0', 'v1.24.0'],
      completionStatus: {
        'Dev': { completed: false, completedAt: null },
        'Test': { completed: false, completedAt: null },
        'PreProd': { completed: false, completedAt: null },
        'Prod': { completed: false, completedAt: null }
      },
      priority: 'medium',
      estimatedTime: '10 dakika',
      attachments: [
        { type: 'config', name: 'docker-compose.yml', size: '3 KB' },
        { type: 'script', name: 'rebuild_containers.sh', size: '1.5 KB' }
      ]
    },
    {
      id: 16,
      title: 'Lokal cache\'leri temizle',
      description: 'Redis ve uygulama cache\'lerini sıfırla',
      phase: 'during',
      environments: ['Dev'],
      versions: ['v1.25.0', 'v1.24.0', 'v1.23.0'],
      completionStatus: {
        'Dev': { completed: true, completedAt: '2025-10-21T09:15:00' },
        'Test': { completed: false, completedAt: null },
        'PreProd': { completed: false, completedAt: null },
        'Prod': { completed: false, completedAt: null }
      },
      priority: 'low',
      estimatedTime: '5 dakika',
      attachments: [
        { type: 'script', name: 'clear_cache.sh', size: '800 B' }
      ]
    },
    {
      id: 17,
      title: 'Unit test\'leri çalıştır',
      description: 'Tüm unit test\'lerin başarılı olduğunu doğrula',
      phase: 'after',
      environments: ['Dev'],
      versions: ['v1.25.0', 'v1.24.0', 'v1.23.0'],
      completionStatus: {
        'Dev': { completed: false, completedAt: null },
        'Test': { completed: false, completedAt: null },
        'PreProd': { completed: false, completedAt: null },
        'Prod': { completed: false, completedAt: null }
      },
      priority: 'critical',
      estimatedTime: '30 dakika',
      attachments: [
        { type: 'test', name: 'unit_test_results.html', size: '125 KB' },
        { type: 'report', name: 'coverage_report.pdf', size: '340 KB' }
      ]
    },
    {
      id: 18,
      title: 'API dokümantasyonunu güncelle',
      description: 'Swagger ve Postman collection\'ları güncelle',
      phase: 'after',
      environments: ['Dev'],
      versions: ['v1.25.0'],
      completionStatus: {
        'Dev': { completed: false, completedAt: null },
        'Test': { completed: false, completedAt: null },
        'PreProd': { completed: false, completedAt: null },
        'Prod': { completed: false, completedAt: null }
      },
      priority: 'medium',
      estimatedTime: '25 dakika',
      attachments: [
        { type: 'document', name: 'swagger.yaml', size: '45 KB' },
        { type: 'document', name: 'postman_collection.json', size: '78 KB' },
        { type: 'document', name: 'api_changelog.md', size: '8 KB' }
      ]
    },
    {
      id: 19,
      title: 'Environment variable\'ları kontrol et',
      description: 'Dev ortamı için yeni eklenen env değişkenlerini ayarla',
      phase: 'before',
      environments: ['Dev'],
      versions: ['v1.25.0', 'v1.24.0'],
      completionStatus: {
        'Dev': { completed: true, completedAt: '2025-10-20T07:45:00' },
        'Test': { completed: false, completedAt: null },
        'PreProd': { completed: false, completedAt: null },
        'Prod': { completed: false, completedAt: null }
      },
      priority: 'high',
      estimatedTime: '10 dakika',
      attachments: [
        { type: 'config', name: '.env.dev', size: '2 KB' },
        { type: 'document', name: 'env_variables_guide.md', size: '6 KB' }
      ]
    },
    {
      id: 20,
      title: 'Log seviyelerini ayarla',
      description: 'Dev ortamı için debug log seviyesini aktif et',
      phase: 'before',
      environments: ['Dev'],
      versions: ['v1.25.0', 'v1.24.0', 'v1.23.0'],
      completionStatus: {
        'Dev': { completed: true, completedAt: '2025-10-21T08:00:00' },
        'Test': { completed: false, completedAt: null },
        'PreProd': { completed: false, completedAt: null },
        'Prod': { completed: false, completedAt: null }
      },
      priority: 'low',
      estimatedTime: '5 dakika',
      attachments: [
        { type: 'config', name: 'log4j.properties', size: '1.5 KB' }
      ]
    },
    {
      id: 21,
      title: 'Integration test\'leri çalıştır',
      description: 'Mikroservisler arası entegrasyonu test et',
      phase: 'after',
      environments: ['Dev'],
      versions: ['v1.25.0', 'v1.24.0'],
      completionStatus: {
        'Dev': { completed: false, completedAt: null },
        'Test': { completed: false, completedAt: null },
        'PreProd': { completed: false, completedAt: null },
        'Prod': { completed: false, completedAt: null }
      },
      priority: 'critical',
      estimatedTime: '45 dakika',
      attachments: [
        { type: 'test', name: 'integration_tests.zip', size: '2.1 MB' },
        { type: 'report', name: 'integration_test_report.html', size: '180 KB' }
      ]
    }
  ]);

  const environments = ['Dev', 'Test', 'PreProd', 'Prod'];
  const versions = ['v1.25.0', 'v1.24.0', 'v1.23.0', 'v1.22.0'];
  const phases = [
    { key: 'before', label: 'Geçişten Önce', icon: <ScheduleIcon />, color: 'primary' },
    { key: 'during', label: 'Geçiş Anında', icon: <PlayArrowIcon />, color: 'warning' },
    { key: 'after', label: 'Geçişten Sonra', icon: <StopIcon />, color: 'success' }
  ];

  // Attachment icon ve renk getirme fonksiyonu
  const getAttachmentIcon = (type) => {
    switch (type) {
      case 'script': return <ScriptIcon sx={{ fontSize: 16 }} />;
      case 'backup': return <BackupIcon sx={{ fontSize: 16 }} />;
      case 'config': return <ConfigIcon sx={{ fontSize: 16 }} />;
      case 'checklist': return <ChecklistIcon sx={{ fontSize: 16 }} />;
      case 'rollback': return <RollbackIcon sx={{ fontSize: 16 }} />;
      case 'test': return <TestIcon sx={{ fontSize: 16 }} />;
      case 'report': return <ReportIcon sx={{ fontSize: 16 }} />;
      case 'document': return <DocumentIcon sx={{ fontSize: 16 }} />;
      default: return <FileIcon sx={{ fontSize: 16 }} />;
    }
  };

  const getAttachmentColor = (type) => {
    switch (type) {
      case 'script': return '#2196f3';
      case 'backup': return '#4caf50';
      case 'config': return '#ff9800';
      case 'checklist': return '#9c27b0';
      case 'rollback': return '#f44336';
      case 'test': return '#00bcd4';
      case 'report': return '#795548';
      case 'document': return '#607d8b';
      default: return '#9e9e9e';
    }
  };

  // Filtreleme fonksiyonu
  const getFilteredTodos = () => {
    return todos.filter(todo => {
      const environmentMatch = todo.environments.includes(selectedEnvironment);
      const phaseMatch = selectedPhase === 'all' || todo.phase === selectedPhase;
      const versionMatch = todo.versions.includes(selectedVersion);
      return environmentMatch && phaseMatch && versionMatch;
    });
  };

  // Belirli ortam için todo'nun tamamlanma durumunu kontrol et
  const isTodoCompletedForEnvironment = (todo, environment) => {
    return todo.completionStatus[environment]?.completed || false;
  };

  // Phase'e göre gruplandırma
  const getGroupedTodos = () => {
    const filtered = getFilteredTodos();
    const grouped = phases.reduce((acc, phase) => {
      const phaseTodos = filtered.filter(todo => todo.phase === phase.key);
      
      // Seçili ortam için tamamlanma durumuna göre sırala
      const incomplete = phaseTodos.filter(todo => !isTodoCompletedForEnvironment(todo, selectedEnvironment));
      const completed = phaseTodos.filter(todo => isTodoCompletedForEnvironment(todo, selectedEnvironment));
      
      acc[phase.key] = [...incomplete, ...completed];
      return acc;
    }, {});
    
    return grouped;
  };

  // Todo'yu belirli ortam için tamamla/tamamlama
  const handleToggleTodo = (todoId) => {
    setTodos(prevTodos => 
      prevTodos.map(todo => {
        if (todo.id === todoId) {
          const currentStatus = todo.completionStatus[selectedEnvironment];
          const newCompletionStatus = {
            ...todo.completionStatus,
            [selectedEnvironment]: {
              completed: !currentStatus?.completed,
              completedAt: !currentStatus?.completed ? new Date().toISOString() : null
            }
          };
          
          return { ...todo, completionStatus: newCompletionStatus };
        }
        return todo;
      })
    );
  };

  // Öncelik rengi
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return '#d32f2f';
      case 'high': return '#f57c00';
      case 'medium': return '#1976d2';
      case 'low': return '#388e3c';
      default: return '#757575';
    }
  };

  // Öncelik metni
  const getPriorityText = (priority) => {
    switch (priority) {
      case 'critical': return 'Kritik';
      case 'high': return 'Yüksek';
      case 'medium': return 'Orta';
      case 'low': return 'Düşük';
      default: return 'Tanımsız';
    }
  };

  // Tamamlanma sayıları
  const getCompletionStats = () => {
    const filtered = getFilteredTodos();
    const total = filtered.length;
    const completed = filtered.filter(todo => isTodoCompletedForEnvironment(todo, selectedEnvironment)).length;
    return { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const stats = getCompletionStats();
  const groupedTodos = getGroupedTodos();

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
                ToDo Listesi
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                {selectedVersion} - {selectedEnvironment} ortamı için deployment işlemleri
              </Typography>
            </Box>
          </Box>
          <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main' }}>
            <TodoIcon fontSize="large" />
          </Avatar>
        </Box>

        {/* İstatistikler */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Chip 
            label={`Toplam: ${stats.total}`} 
            color="primary" 
            variant="outlined"
          />
          <Chip 
            label={`Tamamlanan: ${stats.completed}`} 
            color="success" 
            variant="outlined"
          />
          <Chip 
            label={`%${stats.percentage} Tamamlandı`} 
            color={stats.percentage === 100 ? 'success' : 'warning'}
            variant="filled"
          />
        </Box>

        {/* Filtreler */}
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Versiyon</InputLabel>
            <Select
              value={selectedVersion}
              label="Versiyon"
              onChange={(e) => setSelectedVersion(e.target.value)}
            >
              {versions.map(version => (
                <MenuItem key={version} value={version}>{version}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Ortam Seç</InputLabel>
            <Select
              value={selectedEnvironment}
              label="Ortam Seç"
              onChange={(e) => setSelectedEnvironment(e.target.value)}
            >
              {environments.map(env => (
                <MenuItem key={env} value={env}>{env}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Faz Seç</InputLabel>
            <Select
              value={selectedPhase}
              label="Faz Seç"
              onChange={(e) => setSelectedPhase(e.target.value)}
            >
              <MenuItem value="all">Tüm Fazlar</MenuItem>
              {phases.map(phase => (
                <MenuItem key={phase.key} value={phase.key}>{phase.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* ToDo Grupları */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {phases.map(phase => {
          const phaseTodos = groupedTodos[phase.key] || [];
          const completedCount = phaseTodos.filter(todo => isTodoCompletedForEnvironment(todo, selectedEnvironment)).length;
          const totalCount = phaseTodos.length;

          // Sadece belirli bir faz seçiliyse ve o fazda todo yoksa kutuyu gösterme
          if (totalCount === 0 && selectedPhase !== 'all' && selectedPhase !== phase.key) return null;

          return (
            <Accordion 
              key={phase.key} 
              defaultExpanded 
              elevation={2}
              sx={{ borderRadius: 2, '&:before': { display: 'none' } }}
            >
              <AccordionSummary 
                expandIcon={<ExpandMoreIcon />}
                sx={{ 
                  bgcolor: `${phase.color}.light`,
                  borderRadius: '8px 8px 0 0',
                  '&.Mui-expanded': { minHeight: 56 }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <Avatar sx={{ bgcolor: `${phase.color}.main`, width: 40, height: 40 }}>
                    {phase.icon}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" fontWeight="bold" color={`${phase.color}.main`}>
                      {phase.label}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {totalCount > 0 ? `${completedCount}/${totalCount} tamamlandı` : 'İşlem bulunamadı'}
                    </Typography>
                  </Box>
                  <Badge 
                    badgeContent={totalCount - completedCount} 
                    color="error"
                    sx={{ mr: 2 }}
                  >
                    <Chip 
                      label={`${totalCount} işlem`}
                      size="small"
                      color={phase.color}
                      variant="outlined"
                    />
                  </Badge>
                </Box>
              </AccordionSummary>
              
              <AccordionDetails sx={{ p: 0 }}>
                <List>
                  {phaseTodos.map((todo, index) => (
                    <React.Fragment key={todo.id}>
                      <ListItem
                        sx={{
                          opacity: isTodoCompletedForEnvironment(todo, selectedEnvironment) ? 0.6 : 1,
                          bgcolor: isTodoCompletedForEnvironment(todo, selectedEnvironment) ? 'grey.50' : 'transparent',
                          '&:hover': { bgcolor: isTodoCompletedForEnvironment(todo, selectedEnvironment) ? 'grey.100' : 'action.hover' }
                        }}
                      >
                        <ListItemIcon>
                          <Checkbox
                            checked={isTodoCompletedForEnvironment(todo, selectedEnvironment)}
                            onChange={() => handleToggleTodo(todo.id)}
                            color="success"
                            icon={<CheckCircleIcon color="disabled" />}
                            checkedIcon={<CheckCircleIcon color="success" />}
                          />
                        </ListItemIcon>
                        
                        <ListItemText
                          sx={{ flex: 1, mr: 2 }}
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography 
                                variant="body1" 
                                fontWeight={isTodoCompletedForEnvironment(todo, selectedEnvironment) ? 'normal' : 'medium'}
                                sx={{ 
                                  textDecoration: isTodoCompletedForEnvironment(todo, selectedEnvironment) ? 'line-through' : 'none',
                                  color: isTodoCompletedForEnvironment(todo, selectedEnvironment) ? 'text.secondary' : 'text.primary'
                                }}
                              >
                                {todo.title}
                              </Typography>
                              
                              <Chip 
                                label={getPriorityText(todo.priority)}
                                size="small"
                                sx={{
                                  bgcolor: getPriorityColor(todo.priority),
                                  color: 'white',
                                  fontSize: '11px',
                                  height: 20
                                }}
                              />
                            </Box>
                          }
                          secondary={
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                {todo.description}
                              </Typography>
                              
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mt: 1 }}>
                                <Typography variant="caption" color="text.secondary">
                                  ⏱️ {todo.estimatedTime}
                                </Typography>
                                
                                <Typography variant="caption" color="text.secondary">
                                  • 🌍 {todo.environments.length === environments.length ? 'Tüm Ortamlar' : todo.environments.join(', ')}
                                </Typography>
                                
                                {/* Seçili ortam için completion durumu */}
                                {todo.completionStatus[selectedEnvironment]?.completed && (
                                  <Typography variant="caption" color="success.main">
                                    ✅ {selectedEnvironment}: {new Date(todo.completionStatus[selectedEnvironment].completedAt).toLocaleString('tr-TR')}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          }
                        />

                        {/* Attachments Alanı */}
                        {todo.attachments && todo.attachments.length > 0 && (
                          <Box sx={{ 
                            minWidth: 200, 
                            maxWidth: 250,
                            ml: 2,
                            display: 'flex', 
                            flexDirection: 'column',
                            gap: 1
                          }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                              Ekler ({todo.attachments.length})
                            </Typography>
                            
                            {todo.attachments.map((attachment, idx) => (
                              <Box
                                key={idx}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1,
                                  p: 1,
                                  bgcolor: 'grey.50',
                                  borderRadius: 1,
                                  cursor: 'pointer',
                                  '&:hover': { bgcolor: 'grey.100' }
                                }}
                              >
                                <Box sx={{ color: getAttachmentColor(attachment.type) }}>
                                  {getAttachmentIcon(attachment.type)}
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      display: 'block',
                                      fontWeight: 'medium',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {attachment.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
                                    {attachment.size}
                                  </Typography>
                                </Box>
                              </Box>
                            ))}
                          </Box>
                        )}
                      </ListItem>
                      
                      {index < phaseTodos.length - 1 && <Divider variant="inset" component="li" />}
                    </React.Fragment>
                  ))}
                  
                  {phaseTodos.length === 0 && (
                    <ListItem>
                      <ListItemText
                        primary={
                          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                            Bu faz için işlem bulunamadı
                          </Typography>
                        }
                      />
                    </ListItem>
                  )}
                </List>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>
    </Box>
  );
};

export default TodoList;