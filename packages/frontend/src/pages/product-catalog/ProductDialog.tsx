// ═══════════════════════════════════════════════
// ProductDialog — Create / Edit product with new Faz 1 fields
// ═══════════════════════════════════════════════

import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, CircularProgress, Divider, Typography,
  FormControl, InputLabel, Select, MenuItem, Chip, Box,
  Switch, FormControlLabel, ToggleButton, ToggleButtonGroup,
  Stepper, Step, StepLabel,
} from '@mui/material';
import type { Product, SourceControlType, ArtifactType, ConcurrentUpdatePolicy } from '@/types';
import { useCreateProduct, useUpdateProduct } from '@/services/productService';

interface Props {
  open: boolean;
  onClose: () => void;
  initial?: Partial<Product>;
}

const ARTIFACT_OPTIONS: { value: ArtifactType; label: string }[] = [
  { value: 'DOCKER', label: 'Docker' },
  { value: 'BINARY', label: 'Binary' },
  { value: 'GIT_SYNC', label: 'Git Sync' },
];

export default function ProductDialog({ open, onClose, initial }: Props) {
  const isEdit = Boolean(initial?.id);

  // ── Form state ──
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sourceControlType, setSourceControlType] = useState<SourceControlType | ''>('');
  const [azureOrg, setAzureOrg] = useState('');
  const [azureProject, setAzureProject] = useState('');
  const [azureReleaseProject, setAzureReleaseProject] = useState('');
  const [azurePat, setAzurePat] = useState('');
  const [githubOwner, setGithubOwner] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [supportedArtifactTypes, setSupportedArtifactTypes] = useState<ArtifactType[]>([]);
  const [usesReleaseBranches, setUsesReleaseBranches] = useState(false);
  const [concurrentUpdatePolicy, setConcurrentUpdatePolicy] = useState<ConcurrentUpdatePolicy | ''>('');
  const [initialVersion, setInitialVersion] = useState('v1.0.0');
  const [createInitialVersion, setCreateInitialVersion] = useState(true);

  // Reset form when initial changes
  useEffect(() => {
    setName(initial?.name ?? '');
    setDescription(initial?.description ?? '');
    setSourceControlType((initial?.sourceControlType ?? initial?.pmType ?? '') as SourceControlType | '');
    setAzureOrg(initial?.azureOrg ?? '');
    setAzureProject(initial?.azureProject ?? '');
    setAzureReleaseProject(initial?.azureReleaseProject ?? '');
    setAzurePat(''); // PAT is masked in responses — always blank on edit
    setGithubOwner(initial?.githubOwner ?? '');
    setGithubToken(''); // Token is masked — always blank on edit
    setSupportedArtifactTypes(initial?.supportedArtifactTypes ?? []);
    setUsesReleaseBranches(initial?.usesReleaseBranches ?? false);
    setConcurrentUpdatePolicy((initial?.concurrentUpdatePolicy ?? '') as ConcurrentUpdatePolicy | '');
    setInitialVersion('v1.0.0');
    setCreateInitialVersion(true);
  }, [initial]);

  const createMut = useCreateProduct();
  const updateMut = useUpdateProduct();
  const saving = createMut.isPending || updateMut.isPending;
  const [activeStep, setActiveStep] = useState(0);

  // Reset stepper when dialog opens/closes
  useEffect(() => { if (!open) setActiveStep(0); }, [open]);

  const handleSave = () => {
    const payload = {
      name,
      description: description || undefined,
      sourceControlType: sourceControlType || null,
      azureOrg: azureOrg || null,
      azureProject: azureProject || null,
      azureReleaseProject: azureReleaseProject || null,
      azurePat: azurePat || undefined, // only send if user typed something
      githubOwner: githubOwner || null,
      githubToken: githubToken || undefined, // only send if user typed something
      supportedArtifactTypes,
      usesReleaseBranches,
      concurrentUpdatePolicy: concurrentUpdatePolicy || null,
    };

    if (isEdit && initial?.id) {
      updateMut.mutate({ ...payload, id: initial.id }, { onSuccess: onClose });
    } else {
      createMut.mutate({ ...payload, initialVersion: createInitialVersion ? (initialVersion.trim() || 'v1.0.0') : undefined }, { onSuccess: onClose });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" key={initial?.id ?? 'new-prod'}>
      <DialogTitle>{isEdit ? 'Ürünü Düzenle' : 'Yeni Ürün'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>

        {/* ── 2-Adımlı Onboarding Wizard (sadece yeni ürün oluştururken) ── */}
        {!isEdit && (
          <Stepper activeStep={activeStep} sx={{ mb: 1 }}>
            <Step><StepLabel>Temel Bilgiler</StepLabel></Step>
            <Step><StepLabel>Artifact Konfigürasyonu</StepLabel></Step>
          </Stepper>
        )}

        {/* ── Adım 1: Temel Bilgiler + Kaynak Kontrol ── */}
        {(isEdit || activeStep === 0) && (
          <>
            <TextField label="Ürün Adı" fullWidth required value={name} onChange={(e) => setName(e.target.value)} />
            <TextField label="Açıklama" fullWidth multiline rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />

            <Divider />
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              KAYNAK KONTROL KONFİGÜRASYONU
            </Typography>

            <FormControl fullWidth size="small">
              <InputLabel>Kaynak Kontrol Tipi</InputLabel>
              <Select
                value={sourceControlType}
                label="Kaynak Kontrol Tipi"
                onChange={(e) => setSourceControlType(e.target.value as SourceControlType | '')}
              >
                <MenuItem value="">—</MenuItem>
                <MenuItem value="AZURE">Azure DevOps</MenuItem>
                <MenuItem value="GITHUB">GitHub</MenuItem>
              </Select>
            </FormControl>

            {sourceControlType === 'AZURE' && (
              <>
                <TextField label="Azure Organization" fullWidth required value={azureOrg} onChange={(e) => setAzureOrg(e.target.value)} placeholder="örn: itsfindev" />
                <TextField label="Azure Project" fullWidth required value={azureProject} onChange={(e) => setAzureProject(e.target.value)} placeholder="örn: etx" />
                <TextField label="Release Project (Classic CD)" fullWidth value={azureReleaseProject} onChange={(e) => setAzureReleaseProject(e.target.value)} placeholder="Boşsa Azure Project kullanılır" helperText="vsrm.dev.azure.com için farklı proje kullanılıyorsa doldur" />
                <TextField label="Personal Access Token (PAT)" fullWidth type="password" value={azurePat} onChange={(e) => setAzurePat(e.target.value)} placeholder={isEdit ? '(değiştirmek için yeni PAT girin)' : 'PAT token'} helperText={isEdit ? 'Boş bırakılırsa mevcut PAT korunur' : undefined} />
              </>
            )}

            {sourceControlType === 'GITHUB' && (
              <>
                <TextField label="GitHub Owner (org/user)" fullWidth required value={githubOwner} onChange={(e) => setGithubOwner(e.target.value)} placeholder="örn: myorg" />
                <TextField label="GitHub Token" fullWidth type="password" value={githubToken} onChange={(e) => setGithubToken(e.target.value)} placeholder={isEdit ? '(değiştirmek için yeni token girin)' : 'ghp_xxx...'} helperText={isEdit ? 'Boş bırakılırsa mevcut token korunur' : undefined} />
              </>
            )}
          </>
        )}

        {/* ── Adım 2: Artifact & Dağıtım ── */}
        {(isEdit || activeStep === 1) && (
          <>
            {isEdit && <Divider />}
            {isEdit && (
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                ARTIFACT &amp; DAĞITIM
              </Typography>
            )}

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
              label="Release Branch Stratejisi Kullanılıyor"
            />

            <FormControl fullWidth size="small">
              <InputLabel>Eşzamanlı Güncelleme Politikası</InputLabel>
              <Select value={concurrentUpdatePolicy} label="Eşzamanlı Güncelleme Politikası" onChange={(e) => setConcurrentUpdatePolicy(e.target.value as ConcurrentUpdatePolicy | '')}>
                <MenuItem value="">— (Belirlenmedi)</MenuItem>
                <MenuItem value="WARN">Uyar (WARN)</MenuItem>
                <MenuItem value="BLOCK">Engelle (BLOCK)</MenuItem>
              </Select>
            </FormControl>

            {/* D5-01: İlk versiyon toggle — sadece oluşturma modunda */}
            {!isEdit && (
              <>
                <Divider />
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  İLK VERSİYON
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={createInitialVersion}
                      onChange={(e) => setCreateInitialVersion(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="İlk versiyonu otomatik oluştur (v1.0.0)"
                />
                {createInitialVersion && (
                  <TextField
                    label="Başlangıç Versiyon"
                    fullWidth
                    size="small"
                    value={initialVersion}
                    onChange={(e) => setInitialVersion(e.target.value)}
                    placeholder="v1.0.0"
                    helperText="Ürünle birlikte PLANNED aşamasında oluşturulur"
                  />
                )}
              </>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>İptal</Button>
        {!isEdit && activeStep === 0 && (
          <Button variant="contained" onClick={() => setActiveStep(1)} disabled={!name}>
            İleri →
          </Button>
        )}
        {!isEdit && activeStep === 1 && (
          <>
            <Button onClick={() => setActiveStep(0)}>← Geri</Button>
            <Button variant="contained" onClick={handleSave} disabled={!name || saving}>
              {saving ? <CircularProgress size={18} /> : 'Oluştur'}
            </Button>
          </>
        )}
        {isEdit && (
          <Button variant="contained" onClick={handleSave} disabled={!name || saving}>
            {saving ? <CircularProgress size={18} /> : 'Kaydet'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
