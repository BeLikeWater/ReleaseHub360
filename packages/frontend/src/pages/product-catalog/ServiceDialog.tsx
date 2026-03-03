// ═══════════════════════════════════════════════
// ServiceDialog — Create / Edit service with new Faz 1 fields
// ═══════════════════════════════════════════════

import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress, Divider, Typography,
  FormControl, InputLabel, Select, MenuItem, Box,
  Switch, FormControlLabel, Tabs, Tab, Collapse, Checkbox, Alert,
} from '@mui/material';
import type { Module, Service, ContainerPlatform } from '@/types';
import { useCreateService, useUpdateService } from '@/services/serviceService';

interface Props {
  open: boolean;
  onClose: () => void;
  productId: string;
  defaultModuleId?: string | null;
  initial?: Service;
  modules: Module[];
}

const CONTAINER_PLATFORMS: { value: ContainerPlatform; label: string }[] = [
  { value: 'RANCHER', label: 'Rancher' },
  { value: 'OPENSHIFT', label: 'OpenShift' },
  { value: 'KUBERNETES', label: 'Kubernetes' },
  { value: 'DOCKER_COMPOSE', label: 'Docker Compose' },
];

export default function ServiceDialog({ open, onClose, productId, defaultModuleId, initial, modules }: Props) {
  const isEdit = Boolean(initial?.id);
  const [activeTab, setActiveTab] = useState(0);

  // ── Basic ──
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [moduleId, setModuleId] = useState<string>('');
  const [repoName, setRepoName] = useState('');
  const [pipelineName, setPipelineName] = useState('');
  const [releaseName, setReleaseName] = useState('');
  const [releaseProject, setReleaseProject] = useState('');
  const [releaseProjectOverride, setReleaseProjectOverride] = useState(false);
  const [port, setPort] = useState('');
  const [isActive, setIsActive] = useState(true);

  // ── Stage config ──
  const [prodStageName, setProdStageName] = useState('');
  const [prepStageName, setPrepStageName] = useState('');
  const [prodStageId, setProdStageId] = useState('');
  const [prepStageId, setPrepStageId] = useState('');

  // ── Docker ──
  const [dockerImageName, setDockerImageName] = useState('');
  const [containerPlatform, setContainerPlatform] = useState<ContainerPlatform | ''>('');
  const [platformUrl, setPlatformUrl] = useState('');
  const [platformToken, setPlatformToken] = useState('');
  const [clusterName, setClusterName] = useState('');
  const [namespace, setNamespace] = useState('');
  const [workloadName, setWorkloadName] = useState('');

  // ── Release tracking ──
  const [lastProdReleaseName, setLastProdReleaseName] = useState('');
  const [lastProdReleaseDate, setLastProdReleaseDate] = useState('');

  // Reset form
  useEffect(() => {
    setName(initial?.name ?? '');
    setDescription(initial?.description ?? '');
    setModuleId(initial?.moduleId ?? defaultModuleId ?? '');
    setRepoName(initial?.repoName ?? '');
    setPipelineName(initial?.pipelineName ?? '');
    setReleaseName(initial?.releaseName ?? '');
    setReleaseProject(initial?.releaseProject ?? '');
    setReleaseProjectOverride(Boolean(initial?.releaseProject));
    setPort(initial?.port?.toString() ?? '');
    setIsActive(initial?.isActive ?? true);
    setProdStageName(initial?.prodStageName ?? initial?.releaseStage ?? '');
    setPrepStageName(initial?.prepStageName ?? '');
    setProdStageId(initial?.prodStageId ?? '');
    setPrepStageId(initial?.prepStageId ?? '');
    setDockerImageName(initial?.dockerImageName ?? initial?.serviceImageName ?? '');
    setContainerPlatform((initial?.containerPlatform ?? '') as ContainerPlatform | '');
    setPlatformUrl(initial?.platformUrl ?? '');
    setPlatformToken(''); // masked — blank on edit
    setClusterName(initial?.clusterName ?? '');
    setNamespace(initial?.namespace ?? '');
    setWorkloadName(initial?.workloadName ?? '');
    setLastProdReleaseName(initial?.lastProdReleaseName ?? initial?.currentVersion ?? '');
    setLastProdReleaseDate(
      initial?.lastProdReleaseDate
        ? new Date(initial.lastProdReleaseDate).toISOString().slice(0, 16)
        : ''
    );
    setActiveTab(0);
  }, [initial, defaultModuleId]);

  const createMut = useCreateService();
  const updateMut = useUpdateService();
  const saving = createMut.isPending || updateMut.isPending;

  const handleSave = () => {
    const payload = {
      name,
      productId,
      description: description || undefined,
      moduleId: moduleId || null,
      repoName: repoName || undefined,
      pipelineName: pipelineName || undefined,
      releaseName: releaseName || undefined,
      releaseProject: releaseProjectOverride ? (releaseProject || null) : null,
      port: port ? Number(port) : null,
      isActive,
      prodStageName: prodStageName || null,
      prepStageName: prepStageName || null,
      prodStageId: prodStageId || null,
      prepStageId: prepStageId || null,
      dockerImageName: dockerImageName || null,
      containerPlatform: containerPlatform || null,
      platformUrl: platformUrl || null,
      platformToken: platformToken || undefined, // only send if typed
      clusterName: clusterName || null,
      namespace: namespace || null,
      workloadName: workloadName || null,
      lastProdReleaseName: lastProdReleaseName || null,
      lastProdReleaseDate: lastProdReleaseDate ? new Date(lastProdReleaseDate).toISOString() : null,
    };

    if (isEdit && initial?.id) {
      updateMut.mutate({ ...payload, id: initial.id }, { onSuccess: onClose });
    } else {
      createMut.mutate(payload, { onSuccess: onClose });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" key={initial?.id ?? 'new-svc'}>
      <DialogTitle>{isEdit ? 'Servisi Düzenle' : 'Yeni Servis'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 0, pt: '8px !important', minHeight: 400 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ mb: 2, minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5 } }}
        >
          <Tab label="Temel" />
          <Tab label="Stage & Pipeline" />
          <Tab label="Docker / Binary" />
        </Tabs>

        {/* ── Tab 0: Temel Bilgiler ── */}
        {activeTab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Servis Adı" fullWidth required value={name} onChange={(e) => setName(e.target.value)} />
            <TextField label="Açıklama" fullWidth value={description} onChange={(e) => setDescription(e.target.value)} />

            <FormControl fullWidth size="small">
              <InputLabel>Modül</InputLabel>
              <Select value={moduleId} label="Modül" onChange={(e) => setModuleId(e.target.value)}>
                <MenuItem value="">— (Atanmamış)</MenuItem>
                {modules.map((m) => (
                  <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField label="Repo Adı" fullWidth value={repoName} onChange={(e) => setRepoName(e.target.value)}
              placeholder="örn: my-service" />

            <TextField label="Port" fullWidth type="number" value={port} onChange={(e) => setPort(e.target.value)} />

            <FormControlLabel
              control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
              label="Aktif"
            />

            <TextField label="Son Prod Release" fullWidth value={lastProdReleaseName}
              onChange={(e) => setLastProdReleaseName(e.target.value)}
              placeholder="örn: Release-42" />

            <TextField
              label="Son Prod Release Tarihi"
              type="datetime-local"
              fullWidth
              value={lastProdReleaseDate}
              onChange={(e) => setLastProdReleaseDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />

            <Divider />
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              PREP (Salt Okunur)
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Son Prep Release:</strong>{' '}
                {initial?.lastPrepReleaseName ?? '—'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Son Prep Tarihi:</strong>{' '}
                {initial?.lastPrepReleaseDate
                  ? new Date(initial.lastPrepReleaseDate).toLocaleString('tr-TR', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })
                  : '—'}
              </Typography>
            </Box>

            <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
              Prep bilgisi Health Check ekranındaki 🔄 butonu ile Azure'dan güncellenir.
            </Alert>
          </Box>
        )}

        {/* ── Tab 1: Stage & Pipeline ── */}
        {activeTab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              PİPELINE BİLGİLERİ
            </Typography>

            <TextField label="Pipeline Adı" fullWidth value={pipelineName} onChange={(e) => setPipelineName(e.target.value)} />
            <TextField label="Release Adı" fullWidth value={releaseName} onChange={(e) => setReleaseName(e.target.value)} />

            <FormControlLabel
              control={
                <Checkbox
                  checked={releaseProjectOverride}
                  onChange={(e) => setReleaseProjectOverride(e.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">Release ayrı project'tedir</Typography>}
            />
            <Collapse in={releaseProjectOverride} unmountOnExit>
              <TextField
                label="Release Project"
                fullWidth
                value={releaseProject}
                onChange={(e) => setReleaseProject(e.target.value)}
                placeholder="örn: SharedReleases"
                helperText="Boş bırakılırsa ürün ayarlarındaki Release Project kullanılır"
                autoFocus={releaseProjectOverride}
              />
            </Collapse>

            <Divider />
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              STAGE KONFİGÜRASYONU (İkili Stage)
            </Typography>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Prod Stage Adı" fullWidth value={prodStageName}
                onChange={(e) => setProdStageName(e.target.value)}
                placeholder="örn: Production" />
              <TextField label="Prep Stage Adı" fullWidth value={prepStageName}
                onChange={(e) => setPrepStageName(e.target.value)}
                placeholder="örn: PreProd" />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Prod Stage ID" fullWidth value={prodStageId}
                onChange={(e) => setProdStageId(e.target.value)}
                helperText="Rename koruması için" />
              <TextField label="Prep Stage ID" fullWidth value={prepStageId}
                onChange={(e) => setPrepStageId(e.target.value)}
                helperText="Rename koruması için" />
            </Box>
          </Box>
        )}

        {/* ── Tab 2: Docker / Binary ── */}
        {activeTab === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              DOCKER KONFİGÜRASYONU
            </Typography>

            <TextField label="Docker Image Adı" fullWidth value={dockerImageName}
              onChange={(e) => setDockerImageName(e.target.value)}
              placeholder="örn: registry.io/my-service" />

            <FormControl fullWidth size="small">
              <InputLabel>Container Platform</InputLabel>
              <Select
                value={containerPlatform}
                label="Container Platform"
                onChange={(e) => setContainerPlatform(e.target.value as ContainerPlatform | '')}
              >
                <MenuItem value="">— (Belirlenmedi)</MenuItem>
                {CONTAINER_PLATFORMS.map((cp) => (
                  <MenuItem key={cp.value} value={cp.value}>{cp.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {containerPlatform && (
              <>
                <TextField label="Platform URL" fullWidth value={platformUrl}
                  onChange={(e) => setPlatformUrl(e.target.value)} />
                <TextField label="Platform Token" fullWidth type="password"
                  value={platformToken} onChange={(e) => setPlatformToken(e.target.value)}
                  placeholder={isEdit ? '(değiştirmek için yeni token girin)' : ''}
                  helperText={isEdit ? 'Boş bırakılırsa mevcut token korunur' : undefined} />
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField label="Cluster" fullWidth value={clusterName}
                    onChange={(e) => setClusterName(e.target.value)} />
                  <TextField label="Namespace" fullWidth value={namespace}
                    onChange={(e) => setNamespace(e.target.value)} />
                </Box>
                <TextField label="Workload" fullWidth value={workloadName}
                  onChange={(e) => setWorkloadName(e.target.value)} />
              </>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>İptal</Button>
        <Button variant="contained" onClick={handleSave} disabled={!name || saving}>
          {saving ? <CircularProgress size={18} /> : (isEdit ? 'Kaydet' : 'Oluştur')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
