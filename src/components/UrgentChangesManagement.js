import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Tooltip,
  Input,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';

// Mock Data - Başlangıç Urgent Changes
const initialUrgentChanges = [
  {
    id: 1,
    app: 'Redis',
    title: 'Versiyon Güncellemesi (v5.0.7 → v7.2.1)',
    description: 'Redis\'in mevcut 5.0.7 sürümünde yaşanan bellek yönetimi sorunları ve eksik TLS desteği nedeniyle, Redis\'in 7.2.1 sürümüne yükseltilmesi planlanmaktadır.',
    version: 'v6.2.1',
    deadline: '2025-12-31',
    status: 'not-started',
    priority: 'high',
    tasks: [
      'Redis sunucusunun yedeği alınacak.',
      'Yeni sürüm için yapılandırma dosyaları (redis.conf) güncellenecek.',
      'appendonly ve save parametreleri gözden geçirilecek.',
      'Upgrade sonrası bağlantı testleri ve performans ölçümleri yapılacak.'
    ],
    attachments: [],
  },
  {
    id: 2,
    app: 'Keycloak',
    title: 'Yeni Client Tanımı ve Config Ekleme',
    description: 'Yeni bir mikroservis için Keycloak üzerinde client_id: payment-service adıyla bir client tanımı yapılacaktır.',
    version: 'v6.2.1',
    deadline: '2025-10-15',
    status: 'in-progress',
    priority: 'high',
    tasks: [
      'client_id, client_secret, redirect_uri, valid redirect URIs tanımlanacak.',
      'access token lifespan değeri 3600 saniye olarak ayarlanacak.',
      'Service Account Roles altında payment-admin rolü eklenecek.',
      'Gerekli Protocol Mapper tanımlamaları yapılacak (örn. groups, email, preferred_username).'
    ],
    attachments: [],
  },
  {
    id: 3,
    app: 'Kafka',
    title: 'Yeni Topic Oluşturulması (payment-events)',
    description: 'Yeni bir mikroservis için Kafka üzerinde payment-events adlı bir topic oluşturulacaktır.',
    version: 'v6.2.1',
    deadline: '2025-10-10',
    status: 'completed',
    priority: 'medium',
    tasks: [
      'Topic adı: payment-events',
      'Partition sayısı: 6',
      'Replication factor: 3',
      'Retention süresi: 7 gün (retention.ms=604800000)',
      'cleanup.policy=delete olarak ayarlanacak.',
      'ACL tanımlamaları yapılacak: payment-service için Read/Write yetkisi.'
    ],
    attachments: [],
  },
];

const UrgentChangesManagement = () => {
  const [urgentChanges, setUrgentChanges] = useState(initialUrgentChanges);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentChange, setCurrentChange] = useState(null);
  const [formData, setFormData] = useState({
    app: '',
    title: '',
    description: '',
    version: '',
    deadline: '',
    status: 'not-started',
    priority: 'medium',
    tasks: [],
    attachments: [],
  });
  const [taskInput, setTaskInput] = useState('');

  const statusOptions = [
    { value: 'not-started', label: 'Başlanmadı' },
    { value: 'in-progress', label: 'Devam Ediyor' },
    { value: 'completed', label: 'Tamamlandı' },
    { value: 'error', label: 'Hatalı' },
  ];

  const priorityOptions = [
    { value: 'low', label: 'Düşük' },
    { value: 'medium', label: 'Orta' },
    { value: 'high', label: 'Yüksek' },
    { value: 'critical', label: 'Kritik' },
  ];

  const appOptions = ['Redis', 'Keycloak', 'Kafka', 'RabbitMQ', 'PostgreSQL', 'MongoDB', 'Elasticsearch', 'Nginx'];

  const handleOpenDialog = (change = null) => {
    if (change) {
      setEditMode(true);
      setCurrentChange(change);
      setFormData({
        app: change.app,
        title: change.title,
        description: change.description,
        version: change.version,
        deadline: change.deadline,
        status: change.status,
        priority: change.priority,
        tasks: change.tasks,
        attachments: change.attachments,
      });
    } else {
      setEditMode(false);
      setCurrentChange(null);
      setFormData({
        app: '',
        title: '',
        description: '',
        version: '',
        deadline: '',
        status: 'not-started',
        priority: 'medium',
        tasks: [],
        attachments: [],
      });
    }
    setTaskInput('');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditMode(false);
    setCurrentChange(null);
    setTaskInput('');
  };

  const handleSave = () => {
    const newChange = {
      id: editMode ? currentChange.id : Date.now(),
      ...formData,
    };

    if (editMode) {
      setUrgentChanges(urgentChanges.map(c => c.id === currentChange.id ? newChange : c));
    } else {
      setUrgentChanges([...urgentChanges, newChange]);
    }

    handleCloseDialog();
  };

  const handleDelete = (id) => {
    if (window.confirm('Bu urgent change kaydını silmek istediğinizden emin misiniz?')) {
      setUrgentChanges(urgentChanges.filter(c => c.id !== id));
    }
  };

  const handleAddTask = () => {
    if (taskInput.trim()) {
      setFormData({
        ...formData,
        tasks: [...formData.tasks, taskInput.trim()]
      });
      setTaskInput('');
    }
  };

  const handleRemoveTask = (index) => {
    setFormData({
      ...formData,
      tasks: formData.tasks.filter((_, i) => i !== index)
    });
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    const fileNames = files.map(file => file.name);
    setFormData({ ...formData, attachments: [...formData.attachments, ...fileNames] });
  };

  const handleRemoveAttachment = (index) => {
    const newAttachments = formData.attachments.filter((_, i) => i !== index);
    setFormData({ ...formData, attachments: newAttachments });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'not-started': return 'default';
      case 'in-progress': return 'info';
      case 'completed': return 'success';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option ? option.label : status;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getPriorityLabel = (priority) => {
    const option = priorityOptions.find(opt => opt.value === priority);
    return option ? option.label : priority;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Urgent Changes Yönetimi
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Yeni Urgent Change Ekle
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Altyapı bileşenlerinde yapılacak acil değişiklikleri tanımlayın. Her değişiklik için uygulama, versiyon, durum, öncelik ve görevler belirtilir.
      </Alert>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#1976d2' }}>
              <TableCell sx={{ color: 'white', fontWeight: 'bold', width: 120 }}>Uygulama</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Başlık</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold', width: 100 }}>Versiyon</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold', width: 120 }}>Son Tarih</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold', width: 130 }}>Durum</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold', width: 100 }}>Öncelik</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold', width: 80, textAlign: 'center' }}>
                Görevler
              </TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold', width: 80, textAlign: 'center' }}>
                Ekler
              </TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold', width: 150, textAlign: 'center' }}>
                İşlemler
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {urgentChanges.map((change) => (
              <TableRow key={change.id} hover>
                <TableCell>
                  <Chip label={change.app} size="small" color="primary" variant="outlined" />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {change.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    {change.description.substring(0, 80)}...
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label={change.version} size="small" variant="outlined" />
                </TableCell>
                <TableCell>{change.deadline}</TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(change.status)}
                    size="small"
                    color={getStatusColor(change.status)}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={getPriorityLabel(change.priority)}
                    size="small"
                    color={getPriorityColor(change.priority)}
                  />
                </TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  <Chip label={change.tasks.length} size="small" color="info" />
                </TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  {change.attachments.length > 0 && (
                    <Tooltip title={change.attachments.join(', ')}>
                      <Chip
                        icon={<AttachFileIcon />}
                        label={change.attachments.length}
                        size="small"
                        variant="outlined"
                      />
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => handleOpenDialog(change)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(change.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Urgent Change Ekleme/Düzenleme Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editMode ? 'Urgent Change Düzenle' : 'Yeni Urgent Change Ekle'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <FormControl fullWidth required>
              <InputLabel>Uygulama</InputLabel>
              <Select
                value={formData.app}
                onChange={(e) => setFormData({ ...formData, app: e.target.value })}
                label="Uygulama"
              >
                {appOptions.map(app => (
                  <MenuItem key={app} value={app}>{app}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Başlık"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              helperText="Değişikliğin kısa başlığı"
            />

            <TextField
              fullWidth
              label="Açıklama"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              multiline
              rows={4}
              helperText="Değişikliğin detaylı açıklaması"
            />

            <TextField
              fullWidth
              label="Versiyon"
              value={formData.version}
              onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              required
              helperText="Örn: v6.2.1, v7.2.1"
            />

            <TextField
              fullWidth
              label="Son Tarih"
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              required
              InputLabelProps={{ shrink: true }}
            />

            <FormControl fullWidth required>
              <InputLabel>Durum</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                label="Durum"
              >
                {statusOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Öncelik</InputLabel>
              <Select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                label="Öncelik"
              >
                {priorityOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Görevler Listesi */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Görevler
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Yeni görev ekle..."
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTask();
                    }
                  }}
                />
                <IconButton color="primary" onClick={handleAddTask}>
                  <AddCircleIcon />
                </IconButton>
              </Box>
              {formData.tasks.length > 0 && (
                <Paper variant="outlined" sx={{ maxHeight: 200, overflow: 'auto' }}>
                  <List dense>
                    {formData.tasks.map((task, index) => (
                      <ListItem
                        key={index}
                        secondaryAction={
                          <IconButton edge="end" size="small" onClick={() => handleRemoveTask(index)}>
                            <RemoveCircleIcon color="error" />
                          </IconButton>
                        }
                      >
                        <ListItemText primary={task} />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}
            </Box>

            {/* Dosya Yükleme Alanı */}
            <Box>
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUploadIcon />}
                fullWidth
              >
                Dosya Seç (Çoklu seçim yapabilirsiniz)
                <Input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  sx={{ display: 'none' }}
                />
              </Button>
              {formData.attachments.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Seçilen Dosyalar ({formData.attachments.length}):
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {formData.attachments.map((file, index) => (
                      <Chip
                        key={index}
                        label={file}
                        onDelete={() => handleRemoveAttachment(index)}
                        size="small"
                        icon={<AttachFileIcon />}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>İptal</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={
              !formData.app ||
              !formData.title ||
              !formData.description ||
              !formData.version ||
              !formData.deadline
            }
          >
            {editMode ? 'Güncelle' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UrgentChangesManagement;
