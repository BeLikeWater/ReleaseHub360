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
  FormControlLabel,
  Checkbox,
  Alert,
  Tooltip,
  Input,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import GroupIcon from '@mui/icons-material/Group';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

// Mock Data - Versiyonlar (Release Takviminden gelecek)
const mockVersions = [
  { id: 1, version: 'v1.24.0', releaseDate: '2025-10-25' },
  { id: 2, version: 'v1.23.5', releaseDate: '2025-10-18' },
  { id: 3, version: 'v1.23.0', releaseDate: '2025-10-11' },
  { id: 4, version: 'v1.22.8', releaseDate: '2025-10-04' },
];

// Mock Data - Müşteriler
const mockCustomers = [
  { id: 1, name: 'Türkiye Finans Katılım Bankası', shortName: 'TFKB' },
  { id: 2, name: 'Kuveyt Türk Katılım Bankası', shortName: 'KTKB' },
  { id: 3, name: 'Albaraka Türk Katılım Bankası', shortName: 'ATKB' },
  { id: 4, name: 'Vakıf Katılım Bankası', shortName: 'VKB' },
];

// Mock Data - Başlangıç ToDo'ları
const initialTodos = [
  {
    id: 1,
    version: 'v1.24.0',
    description: 'Veritabanı migration scriptleri çalıştırılacak',
    timing: 'Geçiş Öncesi',
    responsibleTeam: 'Database',
    customers: [1, 2], // TFKB, KTKB
    requiresOnsite: true,
    priority: 'Yüksek',
    order: 1,
    attachments: [],
  },
  {
    id: 2,
    version: 'v1.24.0',
    description: 'Kubernetes pod restart',
    timing: 'Geçiş Anında',
    responsibleTeam: 'DevOps',
    customers: [], // Tüm müşteriler
    requiresOnsite: false,
    priority: 'Kritik',
    order: 2,
    attachments: [],
  },
  {
    id: 3,
    version: 'v1.24.0',
    description: 'Smoke test kontrolü',
    timing: 'Geçiş Sonrası',
    responsibleTeam: 'Delivery',
    customers: [],
    requiresOnsite: true,
    priority: 'Orta',
    order: 3,
    attachments: [],
  },
  {
    id: 4,
    version: 'v1.23.5',
    description: 'Cache temizleme işlemi',
    timing: 'Geçiş Öncesi',
    responsibleTeam: 'DevOps',
    customers: [3], // ATKB
    requiresOnsite: false,
    priority: 'Düşük',
    order: 1,
    attachments: [],
  },
];

const ReleaseTodoManagement = () => {
  const [todos, setTodos] = useState(initialTodos);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentTodo, setCurrentTodo] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState(''); // Versiyon filtresi
  const [formData, setFormData] = useState({
    version: '',
    description: '',
    timing: 'Geçiş Öncesi',
    responsibleTeam: 'Delivery',
    customers: [],
    requiresOnsite: false,
    priority: 'Orta',
    order: 1,
    attachments: [],
  });

  const timingOptions = ['Geçiş Öncesi', 'Geçiş Anında', 'Geçiş Sonrası'];
  const teamOptions = ['Delivery', 'DevOps', 'Database'];
  const priorityOptions = ['Düşük', 'Orta', 'Yüksek', 'Kritik'];

  const handleOpenDialog = (todo = null) => {
    if (todo) {
      setEditMode(true);
      setCurrentTodo(todo);
      setFormData({
        version: todo.version,
        description: todo.description,
        timing: todo.timing,
        responsibleTeam: todo.responsibleTeam,
        customers: todo.customers,
        requiresOnsite: todo.requiresOnsite,
        priority: todo.priority,
        order: todo.order,
        attachments: todo.attachments,
      });
    } else {
      setEditMode(false);
      setCurrentTodo(null);
      setFormData({
        version: '',
        description: '',
        timing: 'Geçiş Öncesi',
        responsibleTeam: 'Delivery',
        customers: [],
        requiresOnsite: false,
        priority: 'Orta',
        order: todos.length + 1,
        attachments: [],
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditMode(false);
    setCurrentTodo(null);
  };

  const handleSave = () => {
    const newTodo = {
      id: editMode ? currentTodo.id : Date.now(),
      ...formData,
    };

    if (editMode) {
      setTodos(todos.map(t => t.id === currentTodo.id ? newTodo : t));
    } else {
      setTodos([...todos, newTodo]);
    }

    handleCloseDialog();
  };

  const handleDelete = (id) => {
    if (window.confirm('Bu todo\'yu silmek istediğinizden emin misiniz?')) {
      setTodos(todos.filter(t => t.id !== id));
    }
  };

  const handleMoveOrder = (id, direction) => {
    const todoIndex = todos.findIndex(t => t.id === id);
    if (todoIndex === -1) return;

    const newTodos = [...todos];
    const targetIndex = direction === 'up' ? todoIndex - 1 : todoIndex + 1;

    if (targetIndex < 0 || targetIndex >= todos.length) return;

    [newTodos[todoIndex], newTodos[targetIndex]] = [newTodos[targetIndex], newTodos[todoIndex]];
    setTodos(newTodos);
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
      default: return '#999';
    }
  };

  const getCustomerNames = (customerIds) => {
    if (customerIds.length === 0) return 'Tüm Müşteriler';
    return customerIds
      .map(id => mockCustomers.find(c => c.id === id)?.shortName)
      .filter(Boolean)
      .join(', ');
  };

  // Filtrelenmiş todos
  const filteredTodos = selectedVersion 
    ? todos.filter(todo => todo.version === selectedVersion)
    : todos;

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Release ToDo Yönetimi
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Versiyon Filtresi</InputLabel>
            <Select
              value={selectedVersion}
              label="Versiyon Filtresi"
              onChange={(e) => setSelectedVersion(e.target.value)}
            >
              <MenuItem value="">Tüm Versiyonlar</MenuItem>
              {mockVersions.map((v) => (
                <MenuItem key={v.id} value={v.version}>
                  {v.version} ({v.releaseDate})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Yeni ToDo Ekle
          </Button>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Release sürecinde yapılması gereken görevleri tanımlayın. Her görev versiyona, zamana ve sorumlu ekibe göre organize edilir.
      </Alert>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#1976d2' }}>
              <TableCell sx={{ color: 'white', fontWeight: 'bold', width: 50 }}>Sıra</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold', width: 100 }}>Versiyon</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Açıklama</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold', width: 130 }}>Zaman</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold', width: 120 }}>Ekip</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold', width: 150 }}>Müşteri</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold', width: 100, textAlign: 'center' }}>
                Yerinde
              </TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold', width: 100 }}>Öncelik</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold', width: 80, textAlign: 'center' }}>
                Ekler
              </TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold', width: 180, textAlign: 'center' }}>
                İşlemler
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTodos.map((todo, index) => (
              <TableRow 
                key={todo.id} 
                hover
              >
                <TableCell>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <IconButton 
                      size="small" 
                      onClick={() => handleMoveOrder(todo.id, 'up')}
                      disabled={index === 0}
                    >
                      <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                    <Typography variant="body2" sx={{ textAlign: 'center' }}>
                      {index + 1}
                    </Typography>
                    <IconButton 
                      size="small" 
                      onClick={() => handleMoveOrder(todo.id, 'down')}
                      disabled={index === filteredTodos.length - 1}
                    >
                      <ArrowDownwardIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip label={todo.version} size="small" color="primary" variant="outlined" />
                </TableCell>
                <TableCell>
                  {todo.description}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={todo.timing} 
                    size="small" 
                    sx={{ bgcolor: getTimingColor(todo.timing), color: 'white' }}
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={todo.responsibleTeam} 
                    size="small" 
                    sx={{ bgcolor: getTeamColor(todo.responsibleTeam), color: 'white' }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {getCustomerNames(todo.customers)}
                  </Typography>
                </TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  {todo.requiresOnsite && (
                    <Tooltip title="Müşteri yanında bulunulması gerekiyor">
                      <GroupIcon color="warning" />
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={todo.priority} 
                    size="small" 
                    color={getPriorityColor(todo.priority)}
                  />
                </TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  {todo.attachments.length > 0 && (
                    <Tooltip title={todo.attachments.join(', ')}>
                      <Chip 
                        icon={<AttachFileIcon />} 
                        label={todo.attachments.length} 
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
                    onClick={() => handleOpenDialog(todo)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    color="error" 
                    onClick={() => handleDelete(todo.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ToDo Ekleme/Düzenleme Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editMode ? 'ToDo Düzenle' : 'Yeni ToDo Ekle'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <FormControl fullWidth required>
              <InputLabel>Versiyon</InputLabel>
              <Select
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                label="Versiyon"
              >
                {mockVersions.map(v => (
                  <MenuItem key={v.id} value={v.version}>
                    {v.version} - {v.releaseDate}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Açıklama"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              multiline
              rows={3}
              helperText="Yapılması gereken işlemin detaylı açıklaması"
            />

            <FormControl fullWidth required>
              <InputLabel>Zaman</InputLabel>
              <Select
                value={formData.timing}
                onChange={(e) => setFormData({ ...formData, timing: e.target.value })}
                label="Zaman"
              >
                {timingOptions.map(option => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Sorumlu Ekip</InputLabel>
              <Select
                value={formData.responsibleTeam}
                onChange={(e) => setFormData({ ...formData, responsibleTeam: e.target.value })}
                label="Sorumlu Ekip"
              >
                {teamOptions.map(option => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Müşteri Filtresi</InputLabel>
              <Select
                multiple
                value={formData.customers}
                onChange={(e) => setFormData({ ...formData, customers: e.target.value })}
                label="Müşteri Filtresi"
                renderValue={(selected) => 
                  selected.length === 0 
                    ? 'Tüm Müşteriler' 
                    : selected.map(id => mockCustomers.find(c => c.id === id)?.shortName).join(', ')
                }
              >
                {mockCustomers.map(customer => (
                  <MenuItem key={customer.id} value={customer.id}>
                    {customer.name} ({customer.shortName})
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1.5 }}>
                Boş bırakılırsa tüm müşteriler için geçerli olur
              </Typography>
            </FormControl>

            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.requiresOnsite}
                  onChange={(e) => setFormData({ ...formData, requiresOnsite: e.target.checked })}
                />
              }
              label="Firma müşteri yanında bulunmalı"
            />

            <FormControl fullWidth required>
              <InputLabel>Öncelik</InputLabel>
              <Select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                label="Öncelik"
              >
                {priorityOptions.map(option => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </Select>
            </FormControl>

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
            disabled={!formData.version || !formData.description}
          >
            {editMode ? 'Güncelle' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReleaseTodoManagement;
