import { useState, useMemo } from 'react';
import {
  Box, Typography, Button, TextField, InputAdornment,
  Chip, IconButton, Menu, MenuItem, Dialog, DialogTitle, DialogContent,
  DialogActions, Divider, CircularProgress, Alert, Accordion, AccordionSummary,
  AccordionDetails, Tabs, Tab, Collapse, FormControl, InputLabel, Select,
  Switch, FormControlLabel,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface Product {
  id: string; name: string; description?: string; repoUrl?: string; isActive: boolean;
  pmType?: string; azureOrg?: string; azureProject?: string; azureReleaseProject?: string; azurePat?: string;
}
interface Service {
  id: string; productId: string; moduleId?: string | null; name: string; description?: string;
  repoName?: string; repoUrl?: string; pipelineName?: string; serviceImageName?: string;
  currentVersion?: string; currentVersionCreatedAt?: string | null; releaseName?: string;
  releaseStage?: string | null;
  port?: number; isActive: boolean;
}
interface Module { id: string; productId: string; moduleGroupId?: string; name: string; description?: string }
interface ModuleGroup { id: string; productId: string; name: string; description?: string; modules: Module[] }

function RowMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  return (
    <>
      <IconButton size="small" onClick={(e) => { e.stopPropagation(); setAnchor(e.currentTarget); }}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem onClick={() => { onEdit(); setAnchor(null); }}>Düzenle</MenuItem>
        <MenuItem onClick={() => { onDelete(); setAnchor(null); }} sx={{ color: 'error.main' }}>Sil</MenuItem>
      </Menu>
    </>
  );
}

// ─── DeleteDialog ────────────────────────────────────────────────────────────

function DeleteDialog({ open, onClose, onConfirm, label }: { open: boolean; onClose: () => void; onConfirm: () => void; label: string }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Silme Onayı</DialogTitle>
      <DialogContent>
        <Typography><strong>{label}</strong> kalıcı olarak silinecek. Emin misiniz?</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>İptal</Button>
        <Button color="error" variant="contained" onClick={onConfirm}>Sil</Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── ServiceDialog ────────────────────────────────────────────────────────────

function ServiceDialog({
  open, onClose, productId, defaultModuleId, initial, modules,
}: {
  open: boolean; onClose: () => void; productId: string;
  defaultModuleId?: string | null; initial?: Partial<Service>; modules: Module[];
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [moduleId, setModuleId] = useState<string>(initial?.moduleId ?? defaultModuleId ?? '');
  const [repoName, setRepoName] = useState(initial?.repoName ?? '');
  const [repoUrl, setRepoUrl] = useState(initial?.repoUrl ?? '');
  const [pipelineName, setPipelineName] = useState(initial?.pipelineName ?? '');
  const [serviceImageName, setServiceImageName] = useState(initial?.serviceImageName ?? '');
  const [currentVersion, setCurrentVersion] = useState(initial?.currentVersion ?? '');
  const [releaseName, setReleaseName] = useState(initial?.releaseName ?? '');
  const [releaseStage, setReleaseStage] = useState(initial?.releaseStage ?? '');
  const [port, setPort] = useState(initial?.port?.toString() ?? '');
  const isEdit = Boolean(initial?.id);

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        description: description || undefined,
        repoName: repoName || undefined,
        repoUrl: repoUrl || undefined,
        pipelineName: pipelineName || undefined,
        serviceImageName: serviceImageName || undefined,
        currentVersion: currentVersion || undefined,
        releaseName: releaseName || undefined,
        releaseStage: releaseStage || null,
        port: port ? Number(port) : undefined,
        moduleId: moduleId || null,
        productId,
      };
      return isEdit ? apiClient.put(`/services/${initial!.id}`, payload) : apiClient.post('/services', payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['services', productId] }); onClose(); },
  });
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" key={initial?.id ?? 'new-service'}>
      <DialogTitle>{isEdit ? 'Servisi Düzenle' : 'Yeni Servis'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        <TextField label="Servis Adı" fullWidth required value={name} onChange={(e) => setName(e.target.value)} />
        <TextField label="Açıklama" fullWidth multiline rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        <FormControl fullWidth>
          <InputLabel>Modül (opsiyonel)</InputLabel>
          <Select label="Modül (opsiyonel)" value={moduleId} onChange={(e) => setModuleId(e.target.value)}>
            <MenuItem value="">Atanmamış</MenuItem>
            {modules.map((m) => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField label="Repo Adı" fullWidth value={repoName} onChange={(e) => setRepoName(e.target.value)} placeholder="azure-devops-repo-name" />
        <TextField label="Repo URL" fullWidth value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} />
        <TextField label="Pipeline Adı" fullWidth value={pipelineName} onChange={(e) => setPipelineName(e.target.value)} />
        <TextField label="Image Adı" fullWidth value={serviceImageName} onChange={(e) => setServiceImageName(e.target.value)} placeholder="docker-image-name" />
        <TextField label="Mevcut Versiyon" fullWidth value={currentVersion} onChange={(e) => setCurrentVersion(e.target.value)} placeholder="1.0.0" />

        {/* Release Definition + Stage */}
        <Divider />
        <Typography variant="caption" color="text.secondary" fontWeight={600}>RELEASE SNAPSHOT KONFİGÜRASYONU</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="Release Definition Adı"
            fullWidth
            value={releaseName}
            onChange={(e) => setReleaseName(e.target.value)}
            placeholder="Örn: MyService.CD"
            helperText="Classic Release pipeline definition adı"
          />
          <TextField
            label="Release Stage Adı"
            fullWidth
            value={releaseStage}
            onChange={(e) => setReleaseStage(e.target.value)}
            placeholder="Örn: Production"
            helperText="İzlenecek aşamanın tam adı"
          />
        </Box>

        <TextField label="Port" fullWidth type="number" value={port} onChange={(e) => setPort(e.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>İptal</Button>
        <Button variant="contained" onClick={() => save.mutate()} disabled={!name || save.isPending}>
          {save.isPending ? <CircularProgress size={18} /> : (isEdit ? 'Kaydet' : 'Oluştur')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── ModuleGroupDialog ────────────────────────────────────────────────────────

function ModuleGroupDialog({ open, onClose, productId, initial }: { open: boolean; onClose: () => void; productId: string; initial?: Partial<ModuleGroup> }) {
  const qc = useQueryClient();
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const isEdit = Boolean(initial?.id);
  const save = useMutation({
    mutationFn: () => {
      const payload = { name, description: description || undefined, productId };
      return isEdit ? apiClient.put(`/modules/groups/${initial!.id}`, payload) : apiClient.post('/modules/groups', payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['module-groups', productId] }); onClose(); },
  });
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" key={initial?.id ?? 'new-mg'}>
      <DialogTitle>{isEdit ? 'Modül Grubunu Düzenle' : 'Yeni Modül Grubu'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        <TextField label="Grup Adı" fullWidth required value={name} onChange={(e) => setName(e.target.value)} />
        <TextField label="Açıklama" fullWidth value={description} onChange={(e) => setDescription(e.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>İptal</Button>
        <Button variant="contained" onClick={() => save.mutate()} disabled={!name || save.isPending}>
          {save.isPending ? <CircularProgress size={18} /> : (isEdit ? 'Kaydet' : 'Oluştur')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── ModuleDialog ─────────────────────────────────────────────────────────────

function ModuleDialog({ open, onClose, productId, groupId, initial }: { open: boolean; onClose: () => void; productId: string; groupId: string; initial?: Partial<Module> }) {
  const qc = useQueryClient();
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const isEdit = Boolean(initial?.id);
  const save = useMutation({
    mutationFn: () => {
      const payload = { name, description: description || undefined, productId, moduleGroupId: groupId };
      return isEdit ? apiClient.put(`/modules/${initial!.id}`, payload) : apiClient.post('/modules', payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['module-groups', productId] }); onClose(); },
  });
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" key={initial?.id ?? 'new-mod'}>
      <DialogTitle>{isEdit ? 'Modülü Düzenle' : 'Yeni Modül'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        <TextField label="Modül Adı" fullWidth required value={name} onChange={(e) => setName(e.target.value)} />
        <TextField label="Açıklama" fullWidth value={description} onChange={(e) => setDescription(e.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>İptal</Button>
        <Button variant="contained" onClick={() => save.mutate()} disabled={!name || save.isPending}>
          {save.isPending ? <CircularProgress size={18} /> : (isEdit ? 'Kaydet' : 'Oluştur')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── ProductDialog ────────────────────────────────────────────────────────────

function ProductDialog({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: Partial<Product> }) {
  const qc = useQueryClient();
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [repoUrl, setRepoUrl] = useState(initial?.repoUrl ?? '');
  const [pmType, setPmType] = useState(initial?.pmType ?? '');
  const [azureOrg, setAzureOrg] = useState(initial?.azureOrg ?? '');
  const [azureProject, setAzureProject] = useState(initial?.azureProject ?? '');
  const [azureReleaseProject, setAzureReleaseProject] = useState(initial?.azureReleaseProject ?? '');
  const [azurePat, setAzurePat] = useState(initial?.azurePat ?? '');
  const isEdit = Boolean(initial?.id);
  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        description: description || undefined,
        repoUrl: repoUrl || undefined,
        pmType: pmType || null,
        azureOrg: azureOrg || null,
        azureProject: azureProject || null,
        azureReleaseProject: azureReleaseProject || null,
        azurePat: azurePat || null,
      };
      return isEdit ? apiClient.put(`/products/${initial!.id}`, payload) : apiClient.post('/products', payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); onClose(); },
  });
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" key={initial?.id ?? 'new-prod'}>
      <DialogTitle>{isEdit ? 'Ürünü Düzenle' : 'Yeni Ürün'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
        <TextField label="Ürün Adı" fullWidth required value={name} onChange={(e) => setName(e.target.value)} />
        <TextField label="Açıklama" fullWidth multiline rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        <TextField label="Repo URL" fullWidth value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} />

        <Divider />
        <Typography variant="caption" color="text.secondary" fontWeight={600}>PROJE YÖNETİM KONFİGÜRASYONU</Typography>

        <FormControl fullWidth size="small">
          <InputLabel>Proje Yönetim Tipi</InputLabel>
          <Select value={pmType} label="Proje Yönetim Tipi" onChange={(e) => setPmType(e.target.value)}>
            <MenuItem value="">—</MenuItem>
            <MenuItem value="AZURE">Azure DevOps</MenuItem>
            <MenuItem value="GITHUB" disabled>GitHub (yakında)</MenuItem>
          </Select>
        </FormControl>

        {pmType === 'AZURE' && (
          <>
            <TextField label="Azure Organization" fullWidth required value={azureOrg} onChange={(e) => setAzureOrg(e.target.value)}
              placeholder="örn: itsfindev" />
            <TextField label="Azure Project" fullWidth required value={azureProject} onChange={(e) => setAzureProject(e.target.value)}
              placeholder="örn: etx" />
            <TextField label="Release Project (Classic CD)" fullWidth value={azureReleaseProject} onChange={(e) => setAzureReleaseProject(e.target.value)}
              placeholder="Boşsa Azure Project kullanılır — örn: OBA-Cofins-DevOps" helperText="vsrm.dev.azure.com için farklı proje kullanılıyorsa doldur" />
            <TextField label="Personal Access Token (PAT)" fullWidth type="password" value={azurePat}
              onChange={(e) => setAzurePat(e.target.value)} placeholder="PAT token" />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>İptal</Button>
        <Button variant="contained" onClick={() => save.mutate()} disabled={!name || save.isPending}>
          {save.isPending ? <CircularProgress size={18} /> : (isEdit ? 'Kaydet' : 'Oluştur')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── ServiceRow (compact inline) ─────────────────────────────────────────────

function ServiceRow({ service, onEdit, onDelete }: {
  service: Service;
  onEdit: (s: Service) => void;
  onDelete: (s: Service) => void;
}) {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1.5, px: 3, py: 0.75,
      borderTop: '1px solid', borderColor: 'divider',
      '&:hover': { bgcolor: 'action.hover' },
    }}>
      <FiberManualRecordIcon sx={{ fontSize: 10, color: service.isActive ? 'success.main' : 'text.disabled', flexShrink: 0 }} />
      <Typography variant="body2" fontWeight={600} sx={{ minWidth: 180, flexShrink: 0 }}>
        {service.name}
      </Typography>
      {service.repoName && (
        <Typography variant="caption" color="text.secondary" fontFamily="monospace" sx={{ flexShrink: 0 }}>
          {service.repoName}
        </Typography>
      )}
      {service.pipelineName && service.pipelineName !== service.repoName && (
        <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0 }}>
          pipe: {service.pipelineName}
        </Typography>
      )}
      <Box flex={1} />
      {service.currentVersion && (
        <Chip
          label={`v${service.currentVersion}`}
          size="small" color="primary" variant="outlined"
          sx={{ height: 20, fontSize: '0.7rem', flexShrink: 0 }}
        />
      )}
      <RowMenu onEdit={() => onEdit(service)} onDelete={() => onDelete(service)} />
    </Box>
  );
}

// ─── StructureTab ─────────────────────────────────────────────────────────────

function StructureTab({ productId }: { productId: string }) {
  const qc = useQueryClient();
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [groupDialog, setGroupDialog] = useState<{ open: boolean; initial?: ModuleGroup }>({ open: false });
  const [moduleDialog, setModuleDialog] = useState<{ groupId: string; initial?: Module } | null>(null);
  const [serviceDialog, setServiceDialog] = useState<{ defaultModuleId?: string | null; initial?: Service } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'group' | 'module' | 'service'; item: { id: string; name: string } } | null>(null);

  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['module-groups', productId],
    queryFn: async () => (await apiClient.get(`/modules/groups?productId=${productId}`)).data.data as ModuleGroup[],
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['services', productId],
    queryFn: async () => (await apiClient.get(`/services?productId=${productId}`)).data.data as Service[],
  });

  const allModules = useMemo(() => groups.flatMap((g) => g.modules ?? []), [groups]);

  const servicesByModule = useMemo(() => {
    const map = new Map<string, Service[]>();
    for (const s of services) {
      const key = s.moduleId ?? '__none__';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [services]);

  const deleteGroupMut = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/modules/groups/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['module-groups', productId] }); setDeleteTarget(null); },
  });
  const deleteModuleMut = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/modules/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['module-groups', productId] }); setDeleteTarget(null); },
  });
  const deleteServiceMut = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/services/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['services', productId] }); setDeleteTarget(null); },
  });

  const toggleModule = (id: string) => setExpandedModules((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'group') deleteGroupMut.mutate(deleteTarget.item.id);
    if (deleteTarget.type === 'module') deleteModuleMut.mutate(deleteTarget.item.id);
    if (deleteTarget.type === 'service') deleteServiceMut.mutate(deleteTarget.item.id);
  };

  if (groupsLoading || servicesLoading) return <CircularProgress size={24} sx={{ mt: 2 }} />;

  const unassigned = servicesByModule.get('__none__') ?? [];

  return (
    <>
      {groups.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Henüz modül grubu tanımlanmamış. Aşağıdaki butonla yapıyı oluşturmaya başlayın.
        </Alert>
      )}

      {groups.map((group) => (
        <Accordion key={group.id} disableGutters variant="outlined" sx={{ mb: 1, '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, mr: 1 }}>
              <Typography fontWeight={700}>{group.name}</Typography>
              <Chip label={`${group.modules?.length ?? 0} modül`} size="small" variant="outlined" />
            </Box>
            <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <Button size="small" startIcon={<AddIcon />}
                onClick={() => setModuleDialog({ groupId: group.id })}>
                Modül
              </Button>
              <RowMenu
                onEdit={() => setGroupDialog({ open: true, initial: group })}
                onDelete={() => setDeleteTarget({ type: 'group', item: group })}
              />
            </Box>
          </AccordionSummary>

          <AccordionDetails sx={{ p: 0 }}>
            {(group.modules ?? []).length === 0 && (
              <Typography variant="caption" color="text.disabled" sx={{ px: 2, py: 1, display: 'block' }}>
                Bu gruba henüz modül eklenmemiş.
              </Typography>
            )}

            {(group.modules ?? []).map((mod) => {
              const modServices = servicesByModule.get(mod.id) ?? [];
              const isExpanded = expandedModules.has(mod.id);
              return (
                <Box key={mod.id} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                  <Box
                    onClick={() => toggleModule(mod.id)}
                    sx={{
                      display: 'flex', alignItems: 'center', px: 2, py: 1,
                      bgcolor: 'grey.50', cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <IconButton size="small" sx={{ mr: 0.5, p: 0.25 }}>
                      {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </IconButton>
                    <Typography variant="body2" fontWeight={600} flex={1}>{mod.name}</Typography>
                    <Chip
                      label={`${modServices.length} servis`}
                      size="small" variant="outlined"
                      sx={{ mr: 1, height: 20, fontSize: '0.7rem' }}
                    />
                    <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'flex', gap: 0.5 }}>
                      <Button size="small" startIcon={<AddIcon />}
                        onClick={() => setServiceDialog({ defaultModuleId: mod.id })}>
                        Servis
                      </Button>
                      <RowMenu
                        onEdit={() => setModuleDialog({ groupId: mod.moduleGroupId ?? group.id, initial: mod })}
                        onDelete={() => setDeleteTarget({ type: 'module', item: mod })}
                      />
                    </Box>
                  </Box>

                  <Collapse in={isExpanded}>
                    <Box sx={{ bgcolor: 'background.paper' }}>
                      {modServices.length === 0 && (
                        <Typography variant="caption" color="text.disabled" sx={{ px: 4, py: 1, display: 'block' }}>
                          Bu modüle henüz servis eklenmemiş.
                        </Typography>
                      )}
                      {modServices.map((s) => (
                        <ServiceRow
                          key={s.id} service={s}
                          onEdit={(svc) => setServiceDialog({ defaultModuleId: svc.moduleId, initial: svc })}
                          onDelete={(svc) => setDeleteTarget({ type: 'service', item: svc })}
                        />
                      ))}
                    </Box>
                  </Collapse>
                </Box>
              );
            })}
          </AccordionDetails>
        </Accordion>
      ))}

      <Button
        startIcon={<AddIcon />} variant="outlined" size="small" sx={{ mt: 1 }}
        onClick={() => setGroupDialog({ open: true })}
      >
        Yeni Modül Grubu
      </Button>

      {unassigned.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">Modüle Atanmamış Servisler</Typography>
            <Chip label={unassigned.length} size="small" />
            <Button size="small" startIcon={<AddIcon />}
              onClick={() => setServiceDialog({ defaultModuleId: null })}>
              Servis Ekle
            </Button>
          </Box>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            {unassigned.map((s) => (
              <ServiceRow
                key={s.id} service={s}
                onEdit={(svc) => setServiceDialog({ defaultModuleId: null, initial: svc })}
                onDelete={(svc) => setDeleteTarget({ type: 'service', item: svc })}
              />
            ))}
          </Box>
        </Box>
      )}

      <ModuleGroupDialog
        open={groupDialog.open}
        onClose={() => setGroupDialog({ open: false })}
        productId={productId}
        initial={groupDialog.initial}
      />
      {moduleDialog && (
        <ModuleDialog
          open
          onClose={() => setModuleDialog(null)}
          productId={productId}
          groupId={moduleDialog.groupId}
          initial={moduleDialog.initial}
        />
      )}
      {serviceDialog !== null && (
        <ServiceDialog
          open
          onClose={() => setServiceDialog(null)}
          productId={productId}
          defaultModuleId={serviceDialog.defaultModuleId}
          initial={serviceDialog.initial}
          modules={allModules}
        />
      )}
      <DeleteDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        label={deleteTarget?.item.name ?? ''}
      />
    </>
  );
}

// ─── SettingsTab ──────────────────────────────────────────────────────────────

function SettingsTab({ product, onUpdated }: { product: Product; onUpdated: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description ?? '');
  const [repoUrl, setRepoUrl] = useState(product.repoUrl ?? '');
  const [isActive, setIsActive] = useState(product.isActive);

  const save = useMutation({
    mutationFn: () => apiClient.put(`/products/${product.id}`, {
      name, description: description || undefined, repoUrl: repoUrl || undefined, isActive,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); onUpdated(); },
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <TextField label="Ürün Adı" fullWidth required value={name} onChange={(e) => setName(e.target.value)} />
      <TextField label="Açıklama" fullWidth multiline rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      <TextField label="Repo URL" fullWidth value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} />
      <FormControlLabel
        control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
        label="Aktif"
      />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button variant="contained" onClick={() => save.mutate()} disabled={!name || save.isPending}>
          {save.isPending ? <CircularProgress size={18} /> : 'Kaydet'}
        </Button>
        {save.isSuccess && (
          <Typography variant="caption" color="success.main">Kaydedildi ✓</Typography>
        )}
      </Box>
    </Box>
  );
}

// ─── ProductDetail ────────────────────────────────────────────────────────────

function ProductDetail({ product, onEdit, onDelete }: { product: Product; onEdit: () => void; onDelete: () => void }) {
  const [tab, setTab] = useState(0);
  return (
    <Box sx={{ p: 3, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="h6" fontWeight={700}>{product.name}</Typography>
            <Chip label={product.isActive ? 'Aktif' : 'Pasif'} color={product.isActive ? 'success' : 'default'} size="small" />
          </Box>
          {product.description && (
            <Typography variant="body2" color="text.secondary">{product.description}</Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          <Button size="small" variant="outlined" onClick={onEdit}>Düzenle</Button>
          <Button size="small" variant="outlined" color="error" onClick={onDelete}>Sil</Button>
        </Box>
      </Box>

      <Divider />

      <Tabs
        value={tab} onChange={(_, v) => setTab(v)}
        sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5 } }}
      >
        <Tab label="Yapı" />
        <Tab label="Ürün Ayarları" />
      </Tabs>

      {tab === 0 && <StructureTab productId={product.id} />}
      {tab === 1 && <SettingsTab product={product} onUpdated={() => setTab(0)} />}
    </Box>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProductCatalogPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productDialog, setProductDialog] = useState<{ open: boolean; initial?: Product }>({ open: false });
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => (await apiClient.get('/products')).data.data as Product[],
  });

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const deleteProductMut = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/products/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      setDeleteProduct(null);
      if (selectedProduct?.id === deleteProduct?.id) setSelectedProduct(null);
    },
  });

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Left — product list */}
      <Box sx={{
        width: 300, flexShrink: 0,
        borderRight: '1px solid', borderColor: 'divider',
        display: 'flex', flexDirection: 'column',
      }}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="subtitle1" fontWeight={700}>Ürün Kataloğu</Typography>
            <Button size="small" startIcon={<AddIcon />} variant="contained"
              onClick={() => setProductDialog({ open: true })}>
              Yeni
            </Button>
          </Box>
          <TextField
            size="small" fullWidth placeholder="Ürün ara..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
        </Box>

        <Box sx={{ overflowY: 'auto', flex: 1 }}>
          {isLoading && <CircularProgress size={20} sx={{ m: 2 }} />}
          {filtered.map((p) => (
            <Box
              key={p.id}
              onClick={() => setSelectedProduct(p)}
              sx={{
                px: 2, py: 1.5, cursor: 'pointer',
                borderBottom: '1px solid', borderColor: 'divider',
                borderLeft: '3px solid',
                borderLeftColor: selectedProduct?.id === p.id ? 'primary.main' : 'transparent',
                bgcolor: selectedProduct?.id === p.id ? 'primary.50' : 'transparent',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Typography variant="body2" fontWeight={selectedProduct?.id === p.id ? 700 : 400}>
                {p.name}
              </Typography>
              {p.description && (
                <Typography variant="caption" color="text.secondary" noWrap display="block">
                  {p.description}
                </Typography>
              )}
            </Box>
          ))}
          {!isLoading && filtered.length === 0 && (
            <Typography variant="body2" color="text.disabled" sx={{ p: 2 }}>
              Ürün bulunamadı
            </Typography>
          )}
        </Box>
      </Box>

      {/* Right — detail */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {selectedProduct ? (
          <ProductDetail
            key={selectedProduct.id}
            product={selectedProduct}
            onEdit={() => setProductDialog({ open: true, initial: selectedProduct })}
            onDelete={() => setDeleteProduct(selectedProduct)}
          />
        ) : (
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography color="text.disabled">Soldan bir ürün seçin</Typography>
          </Box>
        )}
      </Box>

      <ProductDialog
        open={productDialog.open}
        onClose={() => setProductDialog({ open: false })}
        initial={productDialog.initial}
      />
      <DeleteDialog
        open={Boolean(deleteProduct)}
        onClose={() => setDeleteProduct(null)}
        onConfirm={() => deleteProductMut.mutate(deleteProduct!.id)}
        label={deleteProduct?.name ?? ''}
      />
    </Box>
  );
}
