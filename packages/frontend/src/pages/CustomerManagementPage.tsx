import React, { useState, useMemo } from 'react';
import {
  Box, Button, Tabs, Tab, Typography, TextField, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, IconButton, Menu, Drawer, Dialog,
  DialogTitle, DialogContent, DialogActions, FormControlLabel,
  Radio, RadioGroup, FormLabel, FormControl, CircularProgress,
  Stack, Tooltip, InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/api/client';
import LicenseTree, { LicenseSelection } from '@/components/LicenseTree';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Customer {
  id: string;
  name: string;
  code: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
  updatedAt: string;
  _count?: { productMappings: number };
}

interface CustomerProductMapping {
  id: string;
  customerId: string;
  productId: string;
  productVersionId: string;
  branch?: string;
  environment?: string;
  notes?: string;
  licensedModuleGroupIds: string[];
  licensedModuleIds: string[];
  licensedServiceIds: string[];
  licenseTags: string[];
  customer: { name: string; code: string };
  productVersion: { version: string; phase: string; product: { name: string } };
}

interface Product {
  id: string;
  name: string;
}

interface ProductVersion {
  id: string;
  version: string;
  phase: string;
}

// ─── Blank forms ──────────────────────────────────────────────────────────────

const blankCustomer = (): Partial<Customer> => ({
  name: '', code: '', contactEmail: '', contactPhone: '',
  address: '', notes: '', isActive: true,
});

const blankMapping = () => ({
  customerId: '', productVersionId: '', branch: '', environment: '', notes: '',
  productId: '',
});

const blankLicense = (): LicenseSelection => ({
  licensedModuleGroupIds: [],
  licensedModuleIds: [],
  licensedServiceIds: [],
});

// ─── CustomerManagementPage ───────────────────────────────────────────────────

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
      </Tabs>

      {tab === 0 && <CustomersTab />}
      {tab === 1 && <MappingsTab />}
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
  const [form, setForm] = useState<Partial<Customer>>(blankCustomer());

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuCustomer, setMenuCustomer] = useState<Customer | null>(null);

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers').then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (body: Partial<Customer>) => api.post('/customers', body).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); closeDrawer(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: Partial<Customer> & { id: string }) =>
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
      c.code.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      statusFilter === 'all' ? true :
      statusFilter === 'active' ? c.isActive :
      !c.isActive;
    return matchSearch && matchStatus;
  }), [customers, search, statusFilter]);

  const openNew = () => { setEditing(null); setForm(blankCustomer()); setDrawerOpen(true); };
  const openEdit = (c: Customer) => { setEditing(c); setForm({ ...c }); setDrawerOpen(true); };
  const closeDrawer = () => setDrawerOpen(false);

  const handleSave = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>, c: Customer) => {
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
            size="small"
            placeholder="Ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            sx={{ width: 260 }}
          />
          <TextField
            select size="small" label="Durum"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            sx={{ width: 140 }}
          >
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
                      variant="body2"
                      color="primary.main"
                      sx={{ cursor: 'pointer', fontWeight: 500 }}
                      onClick={() => navigate(`/customers/${c.id}/dashboard`)}
                    >
                      {c.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">{c.code}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">{c._count?.productMappings ?? 0}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={c.isActive ? 'Aktif' : 'Pasif'}
                      color={c.isActive ? 'success' : 'default'}
                    />
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
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
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
          sx={{ color: 'error.main' }}
        >
          Sil
        </MenuItem>
      </Menu>

      <Drawer anchor="right" open={drawerOpen} onClose={closeDrawer}
        PaperProps={{ sx: { width: 500, p: 3 } }}>
        <Typography variant="h6" mb={3}>
          {editing ? 'Müşteriyi Düzenle' : 'Yeni Müşteri'}
        </Typography>
        <Stack spacing={2.5}>
          <TextField
            label="Müşteri Adı" fullWidth required
            value={form.name ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <TextField
            label="Müşteri Kodu" fullWidth required
            value={form.code ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
          />
          <TextField
            label="E-posta" type="email" fullWidth
            value={form.contactEmail ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
          />
          <TextField
            label="Telefon" fullWidth
            value={form.contactPhone ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
          />
          <TextField
            label="Adres" fullWidth
            value={form.address ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          />
          <TextField
            label="Notlar" fullWidth multiline rows={3}
            value={form.notes ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
          <FormControl component="fieldset">
            <FormLabel component="legend">Durum</FormLabel>
            <RadioGroup
              row
              value={form.isActive ? 'active' : 'passive'}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === 'active' }))}
            >
              <FormControlLabel value="active" control={<Radio />} label="Aktif" />
              <FormControlLabel value="passive" control={<Radio />} label="Pasif" />
            </RadioGroup>
          </FormControl>
        </Stack>
        <Stack direction="row" justifyContent="flex-end" spacing={2} mt={4}>
          <Button onClick={closeDrawer}>İptal</Button>
          <Button variant="contained" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <CircularProgress size={18} /> : 'Kaydet'}
          </Button>
        </Stack>
      </Drawer>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — Product Mappings
// ═══════════════════════════════════════════════════════════════════════════════

function MappingsTab() {
  const qc = useQueryClient();

  const [customerFilter, setCustomerFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<CustomerProductMapping | null>(null);
  const [mapForm, setMapForm] = useState(blankMapping());
  const [licenseSelection, setLicenseSelection] = useState<LicenseSelection>(blankLicense());

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

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => api.get('/products').then((r) => r.data.data),
  });

  const { data: versions = [] } = useQuery<ProductVersion[]>({
    queryKey: ['product-versions', mapForm.productId],
    queryFn: () => api.get(`/product-versions?productId=${mapForm.productId}`).then((r) => r.data.data),
    enabled: !!mapForm.productId,
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof mapForm) => {
      const { productId: _pid, ...rest } = body;
      return api.post('/customer-product-mappings', rest).then((r) => r.data);
    },
    onSuccess: async (data) => {
      // Save license selection for newly created mapping
      await api.put(`/customer-product-mappings/${data.data.id}/license`, licenseSelection);
      qc.invalidateQueries({ queryKey: ['customer-product-mappings'] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: string } & typeof mapForm) => {
      const { productId: _pid, ...rest } = body;
      return api.put(`/customer-product-mappings/${id}`, rest).then((r) => r.data);
    },
    onSuccess: async (_, variables) => {
      // Save license selection
      await api.put(`/customer-product-mappings/${variables.id}/license`, licenseSelection);
      qc.invalidateQueries({ queryKey: ['customer-product-mappings'] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/customer-product-mappings/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customer-product-mappings'] }),
  });

  const PHASES = ['PLANNED', 'DEVELOPMENT', 'RC', 'STAGING', 'PRODUCTION', 'ARCHIVED'];

  const filtered = useMemo(() => mappings.filter((m) => {
    const matchCustomer = !customerFilter || m.customerId === customerFilter;
    const matchProduct = !productFilter ||
      m.productVersion.product.name.toLowerCase().includes(productFilter.toLowerCase());
    const matchPhase = !phaseFilter || m.productVersion.phase === phaseFilter;
    return matchCustomer && matchProduct && matchPhase;
  }), [mappings, customerFilter, productFilter, phaseFilter]);

  const openNew = () => {
    setEditingMapping(null);
    setMapForm(blankMapping());
    setLicenseSelection(blankLicense()); // will be populated when product is selected
    setDialogOpen(true);
  };

  const openEdit = (m: CustomerProductMapping) => {
    setEditingMapping(m);
    setMapForm({
      customerId: m.customerId,
      productVersionId: m.productVersionId,
      branch: m.branch ?? '',
      environment: m.environment ?? '',
      notes: m.notes ?? '',
      productId: m.productId,
    });
    setLicenseSelection({
      licensedModuleGroupIds: m.licensedModuleGroupIds ?? [],
      licensedModuleIds: m.licensedModuleIds ?? [],
      licensedServiceIds: m.licensedServiceIds ?? [],
    });
    setDialogOpen(true);
  };

  const closeDialog = () => setDialogOpen(false);

  const handleSave = () => {
    if (editingMapping) {
      updateMutation.mutate({ id: editingMapping.id, ...mapForm });
    } else {
      createMutation.mutate(mapForm);
    }
  };

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>, m: CustomerProductMapping) => {
    setMenuAnchor(e.currentTarget);
    setMenuMapping(m);
  };
  const handleMenuClose = () => { setMenuAnchor(null); setMenuMapping(null); };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={2}>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <TextField
            select size="small" label="Müşteri"
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            sx={{ width: 200 }}
          >
            <MenuItem value="">Tümü</MenuItem>
            {customers.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            size="small" label="Ürün"
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            sx={{ width: 200 }}
          />
          <TextField
            select size="small" label="Sürüm Aşaması"
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value)}
            sx={{ width: 180 }}
          >
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
                <TableCell>Branch</TableCell>
                <TableCell>Ortam</TableCell>
                <TableCell>Notlar</TableCell>
                <TableCell align="center" width={48}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((m) => (
                <TableRow key={m.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{m.customer.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{m.customer.code}</Typography>
                  </TableCell>
                  <TableCell>{m.productVersion.product.name}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">{m.productVersion.version}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">{m.branch ?? '-'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">{m.environment ?? '-'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={m.notes ?? ''} placement="top">
                      <Typography
                        variant="body2" color="text.secondary"
                        sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {m.notes ?? '-'}
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
          sx={{ color: 'error.main' }}
        >
          Sil
        </MenuItem>
      </Menu>

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="lg" fullWidth>
        <DialogTitle>{editingMapping ? 'Eşleştirmeyi Düzenle' : 'Yeni Eşleştirme'}</DialogTitle>
        <DialogContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} mt={1}>
            {/* Left: Meta fields */}
            <Stack spacing={2.5} flex={1} minWidth={280}>
              <TextField
                select label="Müşteri" required fullWidth
                value={mapForm.customerId}
                onChange={(e) => setMapForm((f) => ({ ...f, customerId: e.target.value }))}
              >
                {customers.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name} ({c.code})</MenuItem>
                ))}
              </TextField>
              <TextField
                select label="Ürün" required fullWidth
                value={mapForm.productId}
                onChange={(e) => {
                  setMapForm((f) => ({ ...f, productId: e.target.value, productVersionId: '' }));
                  setLicenseSelection(blankLicense()); // reset; LicenseTree will select-all on load
                }}
              >
                {products.map((p) => (
                  <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                ))}
              </TextField>
              <TextField
                select label="Versiyon" required fullWidth
                value={mapForm.productVersionId}
                onChange={(e) => setMapForm((f) => ({ ...f, productVersionId: e.target.value }))}
                disabled={!mapForm.productId}
              >
                {versions.map((v) => (
                  <MenuItem key={v.id} value={v.id}>{v.version} — {v.phase}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="Branch" fullWidth placeholder="production"
                value={mapForm.branch}
                onChange={(e) => setMapForm((f) => ({ ...f, branch: e.target.value }))}
              />
              <TextField
                label="Ortam" fullWidth placeholder="PROD / STAGE / DEV"
                value={mapForm.environment}
                onChange={(e) => setMapForm((f) => ({ ...f, environment: e.target.value }))}
              />
              <TextField
                label="Notlar" fullWidth multiline rows={2}
                value={mapForm.notes}
                onChange={(e) => setMapForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </Stack>

            {/* Right: License tree */}
            <Box flex={2} minWidth={320} sx={{ borderLeft: { md: '1px solid' }, borderColor: { md: 'divider' }, pl: { md: 3 } }}>
              <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
                Lisans Ağacı
              </Typography>
              <LicenseTree
                productId={mapForm.productId}
                value={licenseSelection}
                onChange={setLicenseSelection}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeDialog}>İptal</Button>
          <Button variant="contained" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <CircularProgress size={18} /> : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
