// ═══════════════════════════════════════════════
// SettingsTab — Product settings with new Faz 1 fields
// ═══════════════════════════════════════════════

import { useState } from 'react';
import {
  Box, TextField, Button, CircularProgress, Typography,
  Switch, FormControlLabel, Divider, Chip,
  FormControl, InputLabel, Select, MenuItem, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import type { Product, SourceControlType, ArtifactType, ConcurrentUpdatePolicy } from '@/types';
import { useUpdateProduct } from '@/services/productService';

interface Props {
  product: Product;
  onUpdated: () => void;
}

const ARTIFACT_OPTIONS: { value: ArtifactType; label: string }[] = [
  { value: 'DOCKER', label: 'Docker' },
  { value: 'BINARY', label: 'Binary' },
  { value: 'GIT_SYNC', label: 'Git Sync' },
];

export default function SettingsTab({ product, onUpdated }: Props) {
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description ?? '');
  const [isActive, setIsActive] = useState(product.isActive);
  const [sourceControlType, setSourceControlType] = useState<SourceControlType | ''>(product.sourceControlType ?? '');
  const [azureOrg, setAzureOrg] = useState(product.azureOrg ?? '');
  const [azureProject, setAzureProject] = useState(product.azureProject ?? '');
  const [azureReleaseProject, setAzureReleaseProject] = useState(product.azureReleaseProject ?? '');
  const [azurePat, setAzurePat] = useState('');
  const [githubOwner, setGithubOwner] = useState(product.githubOwner ?? '');
  const [githubToken, setGithubToken] = useState('');
  const [supportedArtifactTypes, setSupportedArtifactTypes] = useState<ArtifactType[]>(product.supportedArtifactTypes ?? []);
  const [usesReleaseBranches, setUsesReleaseBranches] = useState(product.usesReleaseBranches);
  const [concurrentUpdatePolicy, setConcurrentUpdatePolicy] = useState<ConcurrentUpdatePolicy | ''>(product.concurrentUpdatePolicy ?? '');

  const updateMut = useUpdateProduct();

  const handleSave = () => {
    updateMut.mutate({
      id: product.id,
      name,
      description: description || undefined,
      isActive,
      sourceControlType: sourceControlType || null,
      azureOrg: azureOrg || null,
      azureProject: azureProject || null,
      azureReleaseProject: azureReleaseProject || null,
      azurePat: azurePat || undefined,
      githubOwner: githubOwner || null,
      githubToken: githubToken || undefined,
      supportedArtifactTypes,
      usesReleaseBranches,
      concurrentUpdatePolicy: concurrentUpdatePolicy || null,
    }, { onSuccess: onUpdated });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* ── Temel ── */}
      <TextField label="Ürün Adı" fullWidth required value={name} onChange={(e) => setName(e.target.value)} />
      <TextField label="Açıklama" fullWidth multiline rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      <FormControlLabel
        control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
        label="Aktif"
      />

      {/* ── Kaynak Kontrol ── */}
      <Divider />
      <Typography variant="subtitle2" color="text.secondary">Kaynak Kontrol</Typography>

      <FormControl fullWidth size="small">
        <InputLabel>Kaynak Kontrol Tipi</InputLabel>
        <Select value={sourceControlType} label="Kaynak Kontrol Tipi"
          onChange={(e) => setSourceControlType(e.target.value as SourceControlType | '')}>
          <MenuItem value="">—</MenuItem>
          <MenuItem value="AZURE">Azure DevOps</MenuItem>
          <MenuItem value="GITHUB">GitHub</MenuItem>
        </Select>
      </FormControl>

      {sourceControlType === 'AZURE' && (
        <>
          <TextField label="Azure Organization" fullWidth value={azureOrg} onChange={(e) => setAzureOrg(e.target.value)} />
          <TextField label="Azure Project" fullWidth value={azureProject} onChange={(e) => setAzureProject(e.target.value)} />
          <TextField label="Release Project" fullWidth value={azureReleaseProject} onChange={(e) => setAzureReleaseProject(e.target.value)} />
          <TextField label="PAT" fullWidth type="password" value={azurePat} onChange={(e) => setAzurePat(e.target.value)}
            placeholder="(değiştirmek için yeni PAT girin)" helperText="Boş bırakılırsa mevcut PAT korunur" />
        </>
      )}

      {sourceControlType === 'GITHUB' && (
        <>
          <TextField label="GitHub Owner" fullWidth value={githubOwner} onChange={(e) => setGithubOwner(e.target.value)} />
          <TextField label="GitHub Token" fullWidth type="password" value={githubToken} onChange={(e) => setGithubToken(e.target.value)}
            placeholder="(değiştirmek için yeni token girin)" helperText="Boş bırakılırsa mevcut token korunur" />
        </>
      )}

      {/* ── Artifact ── */}
      <Divider />
      <Typography variant="subtitle2" color="text.secondary">Artifact & Dağıtım</Typography>

      <Box>
        <Typography variant="body2" sx={{ mb: 1 }}>Desteklenen Artifact Tipleri</Typography>
        <ToggleButtonGroup value={supportedArtifactTypes} onChange={(_, val: ArtifactType[]) => setSupportedArtifactTypes(val)} size="small">
          {ARTIFACT_OPTIONS.map((opt) => (
            <ToggleButton key={opt.value} value={opt.value}>{opt.label}</ToggleButton>
          ))}
        </ToggleButtonGroup>
        {supportedArtifactTypes.length > 0 && (
          <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5 }}>
            {supportedArtifactTypes.map((t) => <Chip key={t} label={t} size="small" variant="outlined" />)}
          </Box>
        )}
      </Box>

      <FormControlLabel
        control={<Switch checked={usesReleaseBranches} onChange={(e) => setUsesReleaseBranches(e.target.checked)} />}
        label="Release Branch Stratejisi"
      />

      <FormControl fullWidth size="small">
        <InputLabel>Eşzamanlı Güncelleme</InputLabel>
        <Select value={concurrentUpdatePolicy} label="Eşzamanlı Güncelleme"
          onChange={(e) => setConcurrentUpdatePolicy(e.target.value as ConcurrentUpdatePolicy | '')}>
          <MenuItem value="">—</MenuItem>
          <MenuItem value="WARN">Uyar</MenuItem>
          <MenuItem value="BLOCK">Engelle</MenuItem>
        </Select>
      </FormControl>

      {/* ── Save ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
        <Button variant="contained" onClick={handleSave} disabled={!name || updateMut.isPending}>
          {updateMut.isPending ? <CircularProgress size={18} /> : 'Kaydet'}
        </Button>
        {updateMut.isSuccess && (
          <Typography variant="caption" color="success.main">Kaydedildi ✓</Typography>
        )}
      </Box>
    </Box>
  );
}
