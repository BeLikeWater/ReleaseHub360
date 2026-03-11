import { useState, useMemo, type MouseEvent } from 'react';
import {
  Box, Button, Tabs, Tab, Typography, TextField, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, IconButton, Menu, CircularProgress,
  Stack, Tooltip, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Switch, FormControlLabel, InputLabel, FormControl, Select,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  OpenInNew as OpenInNewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/api/client';
import type { Customer, CustomerProductMapping, CustomerBranch } from '@/types';
import CustomerDialog, {
  blankCustomerForm, customerFormToInput, customerToForm,
  type CustomerFormState,
} from './CustomerDialog';
import MappingDialog, {
  blankMappingForm, mappingFormToInput,
  type MappingFormState,
} from './MappingDialog';

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CustomerManagementPage() {
  const [tab, setTab] = useState(0);

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight={700} mb={2}>
        Müşteri Yönetimi
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Müşteriler" />
        <Tab label="Ürün Eşleştirmeleri" />
        <Tab label="Code Branch'ler" />
      </Tabs>

      {tab === 0 && <CustomersTab />}
      {tab === 1 && <MappingsTab />}
      {tab === 2 && <CustomerBranchesTab />}
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — Customers
// ═══════════════════════════════════════════════════════════════════════════════

function CustomersTab() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'passive'>('all');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerFormState>(blankCustomerForm());

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuCustomer, setMenuCustomer] = useState<Customer | null>(null);

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers').then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (body: ReturnType<typeof customerFormToInput>) =>
      api.post('/customers', body).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); closeDrawer(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: ReturnType<typeof customerFormToInput> & { id: string }) =>
      api.put(`/customers/${id}`, body).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); closeDrawer(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/customers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });

  const filtered = useMemo(() => customers.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.code ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === 'all' ? true :
      statusFilter === 'active' ? c.isActive : !c.isActive;
    return matchSearch && matchStatus;
  }), [customers, search, statusFilter]);

  const openNew = () => { setEditing(null); setForm(blankCustomerForm()); setDrawerOpen(true); };
  const openEdit = (c: Customer) => { setEditing(c); setForm(customerToForm(c)); setDrawerOpen(true); };
  const closeDrawer = () => setDrawerOpen(false);

  const handleSave = () => {
    const input = customerFormToInput(form);
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...input });
    } else {
      createMutation.mutate(input);
    }
  };

  const handleMenuOpen = (e: MouseEvent<HTMLElement>, c: Customer) => {
    setMenuAnchor(e.currentTarget);
    setMenuCustomer(c);
  };
  const handleMenuClose = () => { setMenuAnchor(null); setMenuCustomer(null); };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack direction="row" spacing={2}>
          <TextField
            size="small" placeholder="Ara..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            sx={{ width: 260 }}
          />
          <TextField
            select size="small" label="Durum"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            sx={{ width: 140 }}>
            <MenuItem value="all">Tümü</MenuItem>
            <MenuItem value="active">Aktif</MenuItem>
            <MenuItem value="passive">Pasif</MenuItem>
          </TextField>
        </Stack>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="body2" color="text.secondary">
            Toplam: {filtered.length} müşteri
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
            Yeni Müşteri
          </Button>
        </Stack>
      </Stack>

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell>Müşteri Adı</TableCell>
                <TableCell>Kod</TableCell>
                <TableCell>Ticket Platformu</TableCell>
                <TableCell align="center">Ürün Sayısı</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell>Son Güncelleme</TableCell>
                <TableCell align="center" width={48}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} hover sx={c.isActive ? {} : { opacity: 0.45 }}>
                  <TableCell>
                    <Typography
                      variant="body2" color="primary.main"
                      sx={{ cursor: 'pointer', fontWeight: 500 }}
                      onClick={() => navigate(`/customers/${c.id}/dashboard`)}>
                      {c.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">{c.code}</Typography>
                  </TableCell>
                  <TableCell>
                    {c.ticketPlatform ? (
                      <Chip size="small" label={c.ticketPlatform} variant="outlined" />
                    ) : (
                      <Typography variant="body2" color="text.disabled">—</Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">{c._count?.productMappings ?? 0}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={c.isActive ? 'Aktif' : 'Pasif'}
                      color={c.isActive ? 'success' : 'default'} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(c.updatedAt).toLocaleDateString('tr-TR')}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={(e) => handleMenuOpen(e, c)}>
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    Müşteri bulunamadı
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        <MenuItem onClick={() => { navigate(`/customers/${menuCustomer?.id}/dashboard`); handleMenuClose(); }}>
          <OpenInNewIcon fontSize="small" sx={{ mr: 1 }} /> Dashboard'a Git
        </MenuItem>
        <MenuItem onClick={() => { openEdit(menuCustomer!); handleMenuClose(); }}>Düzenle</MenuItem>
        <MenuItem
          onClick={() => { deleteMutation.mutate(menuCustomer!.id); handleMenuClose(); }}
          sx={{ color: 'error.main' }}>
          Sil
        </MenuItem>
      </Menu>

      <CustomerDialog
        open={drawerOpen}
        editing={editing}
        form={form}
        isSaving={isSaving}
        onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
        onSave={handleSave}
        onClose={closeDrawer}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3 — Customer Code Branches
// ═══════════════════════════════════════════════════════════════════════════════

interface BranchForm {
  customerId: string;
  branchName: string;
  repoName: string;
  azureOrg: string;
  azureProject: string;
  azurePat: string;
  description: string;
  isActive: boolean;
}

const blankBranchForm = (): BranchForm => ({
  customerId: '',
  branchName: '',
  repoName: '',
  azureOrg: '',
  azureProject: '',
  azurePat: '',
  description: '',
  isActive: true,
});

function CustomerBranchesTab() {
  const qc = useQueryClient();

  const [customerFilter, setCustomerFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<CustomerBranch | null>(null);
  const [form, setForm] = useState<BranchForm>(blankBranchForm());
  const [showPat, setShowPat] = useState(false);

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuBranch, setMenuBranch] = useState<CustomerBranch | null>(null);

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers').then((r) => r.data.data),
  });

  const { data: branches = [], isLoading } = useQuery<CustomerBranch[]>({
    queryKey: ['customer-branches-admin', customerFilter],
    queryFn: () =>
      api.get('/code-sync/customer-branches', {
        params: customerFilter ? { customerId: customerFilter } : {},
      }).then((r) => r.data.data ?? r.data),
  });

  const createMutation = useMutation({
    mutationFn: (body: Omit<BranchForm, 'isActive'> & { isActive: boolean }) =>
      api.post('/code-sync/customer-branches', body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-branches-admin'] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: BranchForm & { id: string }) =>
      api.put(`/code-sync/customer-branches/${id}`, body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-branches-admin'] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/code-sync/customer-branches/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customer-branches-admin'] }),
  });

  const openNew = () => {
    setEditingBranch(null);
    setForm(blankBranchForm());
    setShowPat(false);
    setDialogOpen(true);
  };

  const openEdit = (b: CustomerBranch) => {
    setEditingBranch(b);
    setForm({
      customerId: b.customerId,
      branchName: b.branchName,
      repoName: b.repoName ?? '',
      azureOrg: b.azureOrg ?? '',
      azureProject: b.azureProject ?? '',
      azurePat: b.azurePat ?? '',
      description: b.description ?? '',
      isActive: b.isActive,
    });
    setShowPat(false);
    setDialogOpen(true);
  };

  const closeDialog = () => setDialogOpen(false);

  const handleSave = () => {
    if (editingBranch) {
      updateMutation.mutate({ id: editingBranch.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleMenuOpen = (e: MouseEvent<HTMLElement>, b: CustomerBranch) => {
    setMenuAnchor(e.currentTarget);
    setMenuBranch(b);
  };
  const handleMenuClose = () => { setMenuAnchor(null); setMenuBranch(null); };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? id;

  const patchForm = (patch: Partial<BranchForm>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <FormControl size="small" sx={{ width: 240 }}>
          <InputLabel>Müşteri Filtrele</InputLabel>
          <Select
            value={customerFilter}
            label="Müşteri Filtrele"
            onChange={(e) => setCustomerFilter(e.target.value)}
          >
            <MenuItem value="">Tümü</MenuItem>
            {customers.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
          Branch Ekle
        </Button>
      </Stack>

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell>Müşteri</TableCell>
                <TableCell>Branch Adı</TableCell>
                <TableCell>Repo</TableCell>
                <TableCell>Org / Project</TableCell>
                <TableCell align="center">Durum</TableCell>
                <TableCell>Oluşturulma</TableCell>
                <TableCell align="center" width={88}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {branches.map((b) => (
                <TableRow key={b.id} hover sx={b.isActive ? {} : { opacity: 0.45 }}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {customerName(b.customerId)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">{b.branchName}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">{b.repoName ?? '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    {(b.azureOrg || b.azureProject) ? (
                      <Tooltip title={`${b.azureOrg ?? ''}/${b.azureProject ?? ''}`} placement="top">
                        <Typography variant="body2" color="text.secondary"
                          sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {[b.azureOrg, b.azureProject].filter(Boolean).join(' / ')}
                        </Typography>
                      </Tooltip>
                    ) : (
                      <Typography variant="body2" color="text.disabled">Ürün creds</Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Chip size="small" label={b.isActive ? 'Aktif' : 'Pasif'}
                      color={b.isActive ? 'success' : 'default'} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(b.createdAt).toLocaleDateString('tr-TR')}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      <IconButton size="small" onClick={() => openEdit(b)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={(e) => handleMenuOpen(e, b)}>
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {branches.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    Kayıtlı branch bulunamadı
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        <MenuItem onClick={() => { openEdit(menuBranch!); handleMenuClose(); }}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} /> Düzenle
        </MenuItem>
        <MenuItem
          onClick={() => { deleteMutation.mutate(menuBranch!.id); handleMenuClose(); }}
          sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Sil
        </MenuItem>
      </Menu>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingBranch ? 'Branch Düzenle' : 'Yeni Code Branch'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {/* Customer */}
            <FormControl size="small" fullWidth>
              <InputLabel>Müşteri *</InputLabel>
              <Select
                value={form.customerId}
                label="Müşteri *"
                onChange={(e) => patchForm({ customerId: e.target.value })}
                disabled={!!editingBranch}
              >
                {customers.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Branch Name */}
            <TextField
              size="small" label="Branch Adı *" fullWidth
              value={form.branchName}
              onChange={(e) => patchForm({ branchName: e.target.value })}
              placeholder="release/v2.4.0"
            />

            {/* Repo Name */}
            <TextField
              size="small" label="Repo Adı" fullWidth
              value={form.repoName}
              onChange={(e) => patchForm({ repoName: e.target.value })}
              placeholder="my-project-repo"
            />

            {/* Azure Org */}
            <TextField
              size="small" label="Azure Org (opsiyonel)" fullWidth
              value={form.azureOrg}
              onChange={(e) => patchForm({ azureOrg: e.target.value })}
              placeholder="https://dev.azure.com/my-org  (boş = ürün creds)"
              helperText="Boş bırakılırsa ürün konfigürasyonundaki org kullanılır"
            />

            {/* Azure Project */}
            <TextField
              size="small" label="Azure Project (opsiyonel)" fullWidth
              value={form.azureProject}
              onChange={(e) => patchForm({ azureProject: e.target.value })}
              placeholder="MyProject  (boş = ürün creds)"
            />

            {/* Azure PAT */}
            <TextField
              size="small" label="Azure PAT (opsiyonel)" fullWidth
              value={form.azurePat}
              type={showPat ? 'text' : 'password'}
              onChange={(e) => patchForm({ azurePat: e.target.value })}
              placeholder="Boş = ürün creds"
              helperText="Boş bırakılırsa ürün konfigürasyonundaki PAT kullanılır"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPat((v) => !v)}>
                      <Typography variant="caption">{showPat ? 'Gizle' : 'Göster'}</Typography>
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Description */}
            <TextField
              size="small" label="Açıklama" fullWidth multiline rows={2}
              value={form.description}
              onChange={(e) => patchForm({ description: e.target.value })}
            />

            {/* isActive */}
            <FormControlLabel
              control={
                <Switch
                  checked={form.isActive}
                  onChange={(e) => patchForm({ isActive: e.target.checked })}
                />
              }
              label="Aktif"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeDialog} disabled={isSaving}>İptal</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!form.customerId || !form.branchName || isSaving}
          >
            {isSaving ? <CircularProgress size={18} /> : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — Product Mappings
// ═══════════════════════════════════════════════════════════════════════════════

const PHASES = ['PLANNED', 'DEVELOPMENT', 'RC', 'STAGING', 'PRODUCTION', 'ARCHIVED'];

function MappingsTab() {
  const qc = useQueryClient();

  const [customerFilter, setCustomerFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<CustomerProductMapping | null>(null);
  const [mapForm, setMapForm] = useState<MappingFormState>(blankMappingForm());

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuMapping, setMenuMapping] = useState<CustomerProductMapping | null>(null);

  const { data: mappings = [], isLoading: loadingMappings } = useQuery<CustomerProductMapping[]>({
    queryKey: ['customer-product-mappings'],
    queryFn: () => api.get('/customer-product-mappings').then((r) => r.data.data),
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers').then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (body: ReturnType<typeof mappingFormToInput>) =>
      api.post('/customer-product-mappings', body).then((r) => r.data),
    onSuccess: async (data) => {
      // Save license selection
      await api.put(`/customer-product-mappings/${data.data.id}/license`, {
        licensedModuleGroupIds: mapForm.licensedModuleGroupIds,
        licensedModuleIds: mapForm.licensedModuleIds,
        licensedServiceIds: mapForm.licensedServiceIds,
        licenseTags: [],
      });
      qc.invalidateQueries({ queryKey: ['customer-product-mappings'] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: ReturnType<typeof mappingFormToInput> & { id: string }) =>
      api.put(`/customer-product-mappings/${id}`, body).then((r) => r.data),
    onSuccess: async (_, variables) => {
      // Save license selection
      await api.put(`/customer-product-mappings/${variables.id}/license`, {
        licensedModuleGroupIds: mapForm.licensedModuleGroupIds,
        licensedModuleIds: mapForm.licensedModuleIds,
        licensedServiceIds: mapForm.licensedServiceIds,
        licenseTags: [],
      });
      qc.invalidateQueries({ queryKey: ['customer-product-mappings'] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/customer-product-mappings/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customer-product-mappings'] }),
  });

  const filtered = useMemo(() => mappings.filter((m) => {
    const matchCustomer = !customerFilter || m.customerId === customerFilter;
    const matchProduct = !productFilter ||
      (m.productVersion?.product?.name ?? '').toLowerCase().includes(productFilter.toLowerCase());
    const matchPhase = !phaseFilter || m.productVersion?.phase === phaseFilter;
    return matchCustomer && matchProduct && matchPhase;
  }), [mappings, customerFilter, productFilter, phaseFilter]);

  const openNew = () => {
    setEditingMapping(null);
    setMapForm(blankMappingForm());
    setDialogOpen(true);
  };

  const openEdit = (m: CustomerProductMapping) => {
    setEditingMapping(m);
    setMapForm({
      customerId: m.customerId,
      productId: m.productId ?? '',
      productVersionId: m.productVersionId,
      branch: m.branch ?? '',
      environment: m.environment ?? '',
      notes: m.notes ?? '',
      licensedModuleGroupIds: m.licensedModuleGroupIds ?? [],
      licensedModuleIds: m.licensedModuleIds ?? [],
      licensedServiceIds: m.licensedServiceIds ?? [],
      artifactType: m.artifactType ?? '',
      deploymentModel: m.deploymentModel ?? '',
      hostingType: m.hostingType ?? '',
      helmChartTemplateName: m.helmChartTemplateName ?? '',
      helmRepoUrl: m.helmRepoUrl ?? '',
      environments: (m.environments ?? []).join(', '),
    });
    setDialogOpen(true);
  };

  const closeDialog = () => setDialogOpen(false);

  const handleSave = () => {
    const input = mappingFormToInput(mapForm);
    if (editingMapping) {
      updateMutation.mutate({ id: editingMapping.id, ...input });
    } else {
      createMutation.mutate(input);
    }
  };

  const handleMenuOpen = (e: MouseEvent<HTMLElement>, m: CustomerProductMapping) => {
    setMenuAnchor(e.currentTarget);
    setMenuMapping(m);
  };
  const handleMenuClose = () => { setMenuAnchor(null); setMenuMapping(null); };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={2}>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <TextField select size="small" label="Müşteri"
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            sx={{ width: 200 }}>
            <MenuItem value="">Tümü</MenuItem>
            {customers.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </TextField>
          <TextField size="small" label="Ürün"
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            sx={{ width: 200 }} />
          <TextField select size="small" label="Sürüm Aşaması"
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value)}
            sx={{ width: 180 }}>
            <MenuItem value="">Tümü</MenuItem>
            {PHASES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </TextField>
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
          Eşleştirme Ekle
        </Button>
      </Stack>

      {loadingMappings ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell>Müşteri</TableCell>
                <TableCell>Ürün</TableCell>
                <TableCell>Versiyon</TableCell>
                <TableCell>Lisans</TableCell>
                <TableCell>Deployment</TableCell>
                <TableCell>Branch / Ortam</TableCell>
                <TableCell align="center" width={48}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((m) => (
                <TableRow key={m.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {m.customer?.name ?? m.customerId}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {m.customer?.code ?? ''}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {m.productVersion?.product?.name ?? '-'}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {m.productVersion?.version ?? '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {(m.licensedServiceIds?.length ?? 0) > 0 ? (
                      <Chip size="small" label={`${m.licensedServiceIds.length} servis`} color="success" variant="outlined" />
                    ) : (
                      <Typography variant="body2" color="text.disabled">—</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                      {m.deploymentModel && <Chip size="small" label={m.deploymentModel} variant="outlined" />}
                      {m.artifactType && <Chip size="small" label={m.artifactType} variant="outlined" color="info" />}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={`${m.branch ?? ''} / ${m.environment ?? ''}`} placement="top">
                      <Typography variant="body2" color="text.secondary"
                        sx={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {[m.branch, m.environment].filter(Boolean).join(' / ') || '—'}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={(e) => handleMenuOpen(e, m)}>
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    Eşleştirme bulunamadı
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        <MenuItem onClick={() => { openEdit(menuMapping!); handleMenuClose(); }}>Düzenle</MenuItem>
        <MenuItem
          onClick={() => { deleteMutation.mutate(menuMapping!.id); handleMenuClose(); }}
          sx={{ color: 'error.main' }}>
          Sil
        </MenuItem>
      </Menu>

      <MappingDialog
        open={dialogOpen}
        editingId={editingMapping?.id ?? null}
        form={mapForm}
        customers={customers}
        isSaving={isSaving}
        onChange={(patch) => setMapForm((f) => ({ ...f, ...patch }))}
        onSave={handleSave}
        onClose={closeDialog}
      />
    </>
  );
}
