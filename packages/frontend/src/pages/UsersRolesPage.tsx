import { useState } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, Drawer, Divider, IconButton, Tab, Tabs,
  TextField, FormControl, InputLabel, Select, MenuItem, Avatar, Menu,
  ListItemIcon, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions,
  Tooltip, Autocomplete,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { useAuthStore } from '@/store/authStore';

type User = { id: string; email: string; name: string; role: string; isActive: boolean; createdAt: string };
type CustomerUser = { id: string; customerId: string; email: string; name: string; role: string; isActive: boolean; createdAt: string };
type CustomerOption = { id: string; name: string };

const ROLES = ['ADMIN', 'RELEASE_MANAGER', 'DEVELOPER', 'VIEWER'] as const;
const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin', RELEASE_MANAGER: 'Release Manager', DEVELOPER: 'Developer', VIEWER: 'Viewer',
};
const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: ['Tüm izinler', 'Kullanıcı yönetimi', 'Sistem ayarları'],
  RELEASE_MANAGER: ['Release yönetimi', 'Hotfix onay', 'Deployment tetikleme'],
  DEVELOPER: ['Görüntüle', 'PR işlemleri', 'Hotfix talebi'],
  VIEWER: ['Sadece okuma'],
};

function roleColor(role: string): 'error' | 'primary' | 'info' | 'default' {
  if (role === 'ADMIN') return 'error';
  if (role === 'RELEASE_MANAGER') return 'primary';
  if (role === 'DEVELOPER') return 'info';
  return 'default';
}

const CUSTOMER_ROLES = ['CONTACT', 'VIEWER', 'ADMIN'] as const;
const CUSTOMER_ROLE_LABELS: Record<string, string> = {
  CONTACT: 'İletişim', VIEWER: 'İzleyici', ADMIN: 'Yönetici',
};
function customerRoleColor(role: string): 'default' | 'info' | 'error' {
  if (role === 'ADMIN') return 'error';
  if (role === 'VIEWER') return 'info';
  return 'default';
}


export default function UsersRolesPage() {
  const qc = useQueryClient();
  const currentUser = useAuthStore(s => s.user);
  const [tab, setTab] = useState(0);

  // ── Kurum Kullanıcıları state ──────────────────────
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; user: User } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'DEVELOPER', password: 'changeme123' });
  const [_editUser, _setEditUser] = useState<User | null>(null);
  const [editRoleDialog, setEditRoleDialog] = useState<{ user: User; role: string } | null>(null);

  // ── Müşteri Kullanıcıları state ────────────────────
  const [cuSearch, setCuSearch] = useState('');
  const [cuCustomer, setCuCustomer] = useState<CustomerOption | null>(null);
  const [cuDrawerOpen, setCuDrawerOpen] = useState(false);
  const [cuEditTarget, setCuEditTarget] = useState<CustomerUser | null>(null);
  const [cuForm, setCuForm] = useState({ customerId: '', name: '', email: '', role: 'VIEWER', password: '' });

  // ── Queries ───────────────────────────────────────
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => apiClient.get('/users').then(r => r.data.data ?? r.data),
  });

  const { data: customers = [] } = useQuery<CustomerOption[]>({
    queryKey: ['customers-options'],
    queryFn: () => apiClient.get('/customers').then(r => (r.data.data ?? r.data).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))),
    enabled: tab === 1,
  });

  const { data: customerUsers = [], isLoading: cuLoading } = useQuery<CustomerUser[]>({
    queryKey: ['customer-users', cuCustomer?.id],
    queryFn: () => apiClient.get('/customer-users', { params: cuCustomer ? { customerId: cuCustomer.id } : {} }).then(r => r.data.data ?? r.data),
    enabled: tab === 1,
  });

  // ── Org user mutations ────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: typeof form) => apiClient.post('/users', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setDrawerOpen(false); },
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => apiClient.patch(`/users/${id}/role`, { role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setEditRoleDialog(null); },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => apiClient.patch(`/users/${id}/status`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setMenuAnchor(null); },
  });

  // ── Customer user mutations ────────────────────────
  const cuCreateMutation = useMutation({
    mutationFn: (data: typeof cuForm) => cuEditTarget
      ? apiClient.patch(`/customer-users/${cuEditTarget.id}`, { name: data.name, role: data.role, ...(data.password ? { password: data.password } : {}) })
      : apiClient.post('/customer-users', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-users'] });
      setCuDrawerOpen(false);
      setCuEditTarget(null);
    },
  });

  const cuDeleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/customer-users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customer-users'] }),
  });

  const filtered = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter ? u.role === roleFilter : true;
    return matchesSearch && matchesRole;
  });

  const filteredCu = customerUsers.filter(cu =>
    cu.name.toLowerCase().includes(cuSearch.toLowerCase()) || cu.email.toLowerCase().includes(cuSearch.toLowerCase())
  );

  const roleCounts = ROLES.reduce((acc, r) => ({ ...acc, [r]: users.filter(u => u.role === r).length }), {} as Record<string, number>);

  function openCuCreate() {
    setCuEditTarget(null);
    setCuForm({ customerId: cuCustomer?.id ?? '', name: '', email: '', role: 'VIEWER', password: '' });
    setCuDrawerOpen(true);
  }

  function openCuEdit(cu: CustomerUser) {
    setCuEditTarget(cu);
    setCuForm({ customerId: cu.customerId, name: cu.name, email: cu.email, role: cu.role, password: '' });
    setCuDrawerOpen(true);
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Kullanıcı & Rol Yönetimi</Typography>
        {tab === 0 && currentUser?.role === 'ADMIN' && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setForm({ name: '', email: '', role: 'DEVELOPER', password: 'changeme123' }); setDrawerOpen(true); }}>
            + Kullanıcı Davet Et
          </Button>
        )}
        {tab === 1 && currentUser?.role === 'ADMIN' && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCuCreate}>
            + Müşteri Kullanıcısı Ekle
          </Button>
        )}
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Kurum Kullanıcıları" />
        <Tab label="Müşteri Kullanıcıları" />
        <Tab label="Roller" />
      </Tabs>

      {/* ── TAB 0: Kurum Kullanıcıları ── */}
      {tab === 0 && (
        <>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField size="small" placeholder="Ara..." value={search} onChange={e => setSearch(e.target.value)} sx={{ flex: 1 }} />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Rol</InputLabel>
              <Select value={roleFilter} label="Rol" onChange={e => setRoleFilter(e.target.value)}>
                <MenuItem value="">Tümü</MenuItem>
                {ROLES.map(r => <MenuItem key={r} value={r}>{ROLE_LABELS[r]}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ mb: 1 }}>
            <Typography variant="body2" color="text.secondary">Toplam: {filtered.length} kullanıcı</Typography>
          </Box>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Ad Soyad</TableCell>
                  <TableCell>E-posta</TableCell>
                  <TableCell>Rol</TableCell>
                  <TableCell>Durum</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} align="center">Yükleniyor...</TableCell></TableRow>
                ) : filtered.map(u => (
                  <TableRow key={u.id} sx={{ opacity: u.isActive ? 1 : 0.5 }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>
                          {u.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography variant="body2" fontWeight={500}>{u.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Chip label={ROLE_LABELS[u.role] ?? u.role} color={roleColor(u.role)} size="small" />
                    </TableCell>
                    <TableCell>
                      {u.isActive ? (
                        <Chip label="Aktif" color="success" size="small" icon={<CheckCircleIcon />} />
                      ) : (
                        <Chip label="Pasif" color="default" size="small" icon={<BlockIcon />} />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {currentUser?.role === 'ADMIN' && (
                        <IconButton size="small" onClick={e => { e.stopPropagation(); setMenuAnchor({ el: e.currentTarget, user: u }); }}>
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* ── TAB 1: Müşteri Kullanıcıları ── */}
      {tab === 1 && (
        <>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Autocomplete
              size="small"
              options={customers}
              getOptionLabel={o => o.name}
              value={cuCustomer}
              onChange={(_, v) => setCuCustomer(v)}
              renderInput={params => <TextField {...params} label="Müşteri Filtrele" placeholder="Tümü" />}
              sx={{ flex: 1 }}
            />
            <TextField size="small" placeholder="Ad / E-posta ara..." value={cuSearch}
              onChange={e => setCuSearch(e.target.value)} sx={{ flex: 1 }} />
          </Box>
          <Box sx={{ mb: 1 }}>
            <Typography variant="body2" color="text.secondary">Toplam: {filteredCu.length} müşteri kullanıcısı</Typography>
          </Box>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Ad Soyad</TableCell>
                  <TableCell>E-posta</TableCell>
                  <TableCell>Müşteri</TableCell>
                  <TableCell>Rol</TableCell>
                  <TableCell>Durum</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {cuLoading ? (
                  <TableRow><TableCell colSpan={6} align="center">Yükleniyor...</TableCell></TableRow>
                ) : filteredCu.length === 0 ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>Kayıt bulunamadı.</TableCell></TableRow>
                ) : filteredCu.map(cu => (
                  <TableRow key={cu.id} sx={{ opacity: cu.isActive ? 1 : 0.5 }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', fontSize: 14 }}>
                          {cu.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography variant="body2" fontWeight={500}>{cu.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{cu.email}</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {customers.find(c => c.id === cu.customerId)?.name ?? cu.customerId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={CUSTOMER_ROLE_LABELS[cu.role] ?? cu.role} color={customerRoleColor(cu.role)} size="small" />
                    </TableCell>
                    <TableCell>
                      {cu.isActive
                        ? <Chip label="Aktif" color="success" size="small" icon={<CheckCircleIcon />} />
                        : <Chip label="Pasif" color="default" size="small" icon={<BlockIcon />} />}
                    </TableCell>
                    <TableCell align="right">
                      {currentUser?.role === 'ADMIN' && (
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="Düzenle">
                            <IconButton size="small" onClick={() => openCuEdit(cu)}><EditIcon fontSize="small" /></IconButton>
                          </Tooltip>
                          <Tooltip title="Sil">
                            <IconButton size="small" color="error" onClick={() => { if (window.confirm('Bu kullanıcıyı silemek istediğinize emin misiniz?')) cuDeleteMutation.mutate(cu.id); }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* ── TAB 2: Roller ── */}
      {tab === 2 && (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Rol</TableCell>
                <TableCell>Kullanıcı Sayısı</TableCell>
                <TableCell>İzinler</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ROLES.map(r => (
                <TableRow key={r}>
                  <TableCell><Chip label={ROLE_LABELS[r]} color={roleColor(r)} /></TableCell>
                  <TableCell>{roleCounts[r] ?? 0}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {ROLE_PERMISSIONS[r].map(p => (
                        <Chip key={p} label={p} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Action Menu (Org Users) ── */}
      <Menu anchorEl={menuAnchor?.el} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => { setEditRoleDialog({ user: menuAnchor!.user, role: menuAnchor!.user.role }); setMenuAnchor(null); }}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Rol Değiştir</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { statusMutation.mutate({ id: menuAnchor!.user.id, isActive: !menuAnchor!.user.isActive }); setMenuAnchor(null); }}>
          <ListItemIcon>{menuAnchor?.user.isActive ? <BlockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}</ListItemIcon>
          <ListItemText>{menuAnchor?.user.isActive ? 'Pasif Yap' : 'Aktif Yap'}</ListItemText>
        </MenuItem>
        <MenuItem disabled={menuAnchor?.user.id === currentUser?.id}
          onClick={() => { if (window.confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) deleteMutation.mutate(menuAnchor!.user.id); }}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText sx={{ color: 'error.main' }}>Sil</ListItemText>
        </MenuItem>
      </Menu>

      {/* ── Rol Değiştir Dialog ── */}
      <Dialog open={!!editRoleDialog} onClose={() => setEditRoleDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Rol Değiştir — {editRoleDialog?.user.name}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Yeni Rol</InputLabel>
            <Select value={editRoleDialog?.role ?? ''} label="Yeni Rol"
              onChange={e => setEditRoleDialog(d => d ? { ...d, role: e.target.value } : null)}>
              {ROLES.map(r => <MenuItem key={r} value={r}>{ROLE_LABELS[r]}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditRoleDialog(null)}>İptal</Button>
          <Button variant="contained" onClick={() => roleMutation.mutate({ id: editRoleDialog!.user.id, role: editRoleDialog!.role })}>
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Kurum Kullanıcısı Oluştur Drawer ── */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 420 }, p: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight={700}>Kullanıcı Davet Et</Typography>
          <IconButton onClick={() => setDrawerOpen(false)}><CloseIcon /></IconButton>
        </Box>
        <Divider sx={{ mb: 3 }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="Ad Soyad *" fullWidth value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <TextField label="E-posta *" type="email" fullWidth value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <FormControl fullWidth>
            <InputLabel>Rol</InputLabel>
            <Select value={form.role} label="Rol" onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              {ROLES.map(r => <MenuItem key={r} value={r}>{ROLE_LABELS[r]}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="İlk Şifre" type="password" fullWidth value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))} helperText="Kullanıcı ilk girişte değiştirmeli." />
          <Tooltip title="">
            <Typography variant="caption" color="text.secondary">
              Kullanıcı oluşturulduğunda sisteme erişim sağlayabilir.
            </Typography>
          </Tooltip>
        </Box>
        <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
          <Button fullWidth onClick={() => setDrawerOpen(false)}>İptal</Button>
          <Button fullWidth variant="contained" disabled={!form.name || !form.email || createMutation.isPending}
            onClick={() => createMutation.mutate(form)}>
            Oluştur
          </Button>
        </Box>
      </Drawer>

      {/* ── Müşteri Kullanıcısı Oluştur/Düzenle Drawer ── */}
      <Drawer anchor="right" open={cuDrawerOpen} onClose={() => { setCuDrawerOpen(false); setCuEditTarget(null); }}
        PaperProps={{ sx: { width: { xs: '100%', sm: 420 }, p: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight={700}>
            {cuEditTarget ? 'Müşteri Kullanıcısı Düzenle' : 'Müşteri Kullanıcısı Ekle'}
          </Typography>
          <IconButton onClick={() => { setCuDrawerOpen(false); setCuEditTarget(null); }}><CloseIcon /></IconButton>
        </Box>
        <Divider sx={{ mb: 3 }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {!cuEditTarget && (
            <Autocomplete
              options={customers}
              getOptionLabel={o => o.name}
              value={customers.find(c => c.id === cuForm.customerId) ?? null}
              onChange={(_, v) => setCuForm(f => ({ ...f, customerId: v?.id ?? '' }))}
              renderInput={params => <TextField {...params} label="Müşteri *" required />}
            />
          )}
          <TextField label="Ad Soyad *" fullWidth value={cuForm.name}
            onChange={e => setCuForm(f => ({ ...f, name: e.target.value }))} />
          <TextField label="E-posta *" type="email" fullWidth value={cuForm.email}
            disabled={!!cuEditTarget}
            onChange={e => setCuForm(f => ({ ...f, email: e.target.value }))} />
          <FormControl fullWidth>
            <InputLabel>Rol</InputLabel>
            <Select value={cuForm.role} label="Rol" onChange={e => setCuForm(f => ({ ...f, role: e.target.value }))}>
              {CUSTOMER_ROLES.map(r => <MenuItem key={r} value={r}>{CUSTOMER_ROLE_LABELS[r]}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label={cuEditTarget ? 'Yeni Şifre (boş = değiştirme)' : 'Şifre *'} type="password" fullWidth
            value={cuForm.password} onChange={e => setCuForm(f => ({ ...f, password: e.target.value }))} />
        </Box>
        <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
          <Button fullWidth onClick={() => { setCuDrawerOpen(false); setCuEditTarget(null); }}>İptal</Button>
          <Button fullWidth variant="contained" disabled={cuCreateMutation.isPending ||
            (!cuEditTarget && (!cuForm.customerId || !cuForm.email || !cuForm.password))}
            onClick={() => cuCreateMutation.mutate(cuForm)}>
            {cuEditTarget ? 'Güncelle' : 'Oluştur'}
          </Button>
        </Box>
      </Drawer>
    </Box>
  );
}
