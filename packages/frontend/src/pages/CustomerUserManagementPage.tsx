import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Chip,
  IconButton,
  Drawer,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Tooltip,
  Switch,
  FormControlLabel,
  Divider,
  Stack,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import {
  getPortalUsers,
  createPortalUser,
  updatePortalUser,
  deletePortalUser,
  PortalUser,
  CustomerRole,
  CreatePortalUserPayload,
} from '@/services/customerUserService';

const ROLE_OPTIONS: { value: CustomerRole; label: string }[] = [
  { value: 'APP_ADMIN', label: 'App Admin' },
  { value: 'APPROVER', label: 'Onaylayıcı' },
  { value: 'BUSINESS_USER', label: 'İş Kullanıcısı' },
  { value: 'PARTNER', label: 'Partner' },
];

const roleColor: Record<CustomerRole, 'error' | 'warning' | 'info' | 'default'> = {
  APP_ADMIN: 'error',
  APPROVER: 'warning',
  BUSINESS_USER: 'info',
  PARTNER: 'default',
};

type DrawerMode = 'add' | 'edit' | null;

export default function CustomerUserManagementPage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [selected, setSelected] = useState<PortalUser | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<CustomerRole>('BUSINESS_USER');
  const [formActive, setFormActive] = useState(true);
  const [formError, setFormError] = useState('');

  // Guard: CUSTOMER_ADMIN only
  if (user?.role !== 'CUSTOMER_ADMIN') {
    return (
      <Box p={4}>
        <Alert severity="error">Bu sayfaya erişim yetkiniz bulunmamaktadır.</Alert>
      </Box>
    );
  }

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['customerPortalUsers'],
    queryFn: getPortalUsers,
  });

  const createMut = useMutation({
    mutationFn: (data: CreatePortalUserPayload) => createPortalUser(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customerPortalUsers'] });
      closeDrawer();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { customerRole: CustomerRole; isActive: boolean; name: string } }) =>
      updatePortalUser(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customerPortalUsers'] });
      closeDrawer();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deletePortalUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customerPortalUsers'] }),
  });

  function openAdd() {
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('BUSINESS_USER');
    setFormActive(true);
    setFormError('');
    setSelected(null);
    setDrawerMode('add');
  }

  function openEdit(u: PortalUser) {
    setFormName(u.name);
    setFormEmail(u.email);
    setFormPassword('');
    setFormRole(u.customerRole);
    setFormActive(u.isActive);
    setFormError('');
    setSelected(u);
    setDrawerMode('edit');
  }

  function closeDrawer() {
    setDrawerMode(null);
    setSelected(null);
  }

  function handleSubmit() {
    setFormError('');
    if (drawerMode === 'add') {
      if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) {
        setFormError('Ad, e-posta ve şifre zorunludur.');
        return;
      }
      createMut.mutate({ name: formName.trim(), email: formEmail.trim(), password: formPassword, customerRole: formRole });
    } else if (drawerMode === 'edit' && selected) {
      updateMut.mutate({ id: selected.id, data: { customerRole: formRole, isActive: formActive, name: formName.trim() } });
    }
  }

  const isBusy = createMut.isPending || updateMut.isPending;

  return (
    <Box p={3}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h5" fontWeight={700}>
          Kullanıcı Yönetimi
        </Typography>
        <Button variant="contained" startIcon={<PersonAddIcon />} onClick={openAdd}>
          Kullanıcı Ekle
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>Kullanıcılar yüklenemedi.</Alert>}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell><strong>Ad</strong></TableCell>
              <TableCell><strong>E-posta</strong></TableCell>
              <TableCell><strong>Rol</strong></TableCell>
              <TableCell><strong>Durum</strong></TableCell>
              <TableCell><strong>Oluşturulma</strong></TableCell>
              <TableCell align="right"><strong>İşlem</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  Henüz kullanıcı eklenmemiş.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell>{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={ROLE_OPTIONS.find((r) => r.value === u.customerRole)?.label ?? u.customerRole}
                      color={roleColor[u.customerRole] ?? 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={u.isActive ? 'Aktif' : 'Pasif'}
                      color={u.isActive ? 'success' : 'default'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{new Date(u.createdAt).toLocaleDateString('tr-TR')}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Düzenle">
                      <IconButton size="small" onClick={() => openEdit(u)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Sil">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => { if (window.confirm(`${u.name} silinsin mi?`)) deleteMut.mutate(u.id); }}
                        disabled={deleteMut.isPending}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add / Edit Drawer */}
      <Drawer anchor="right" open={drawerMode !== null} onClose={closeDrawer}>
        <Box sx={{ width: 380, p: 3 }}>
          <Typography variant="h6" fontWeight={700} mb={2}>
            {drawerMode === 'add' ? 'Yeni Kullanıcı' : 'Kullanıcıyı Düzenle'}
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Stack spacing={2.5}>
            <TextField
              label="Ad Soyad"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              fullWidth
              size="small"
              required
            />

            <TextField
              label="E-posta"
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              fullWidth
              size="small"
              required
              disabled={drawerMode === 'edit'}
            />

            {drawerMode === 'add' && (
              <TextField
                label="Şifre"
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                fullWidth
                size="small"
                required
              />
            )}

            <FormControl fullWidth size="small">
              <InputLabel>Rol</InputLabel>
              <Select
                value={formRole}
                label="Rol"
                onChange={(e) => setFormRole(e.target.value as CustomerRole)}
              >
                {ROLE_OPTIONS.map((r) => (
                  <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {drawerMode === 'edit' && (
              <FormControlLabel
                control={<Switch checked={formActive} onChange={(e) => setFormActive(e.target.checked)} />}
                label={formActive ? 'Aktif' : 'Pasif'}
              />
            )}

            {formError && <Alert severity="error">{formError}</Alert>}

            <Stack direction="row" spacing={1} justifyContent="flex-end" pt={1}>
              <Button variant="outlined" onClick={closeDrawer} disabled={isBusy}>
                İptal
              </Button>
              <Button variant="contained" onClick={handleSubmit} disabled={isBusy}>
                {isBusy ? <CircularProgress size={18} /> : drawerMode === 'add' ? 'Ekle' : 'Kaydet'}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Drawer>
    </Box>
  );
}
