import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Stack, Button, TextField, MenuItem, Divider,
  Typography, CircularProgress, Box,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import api from '@/api/client';
import type {
  Customer,
  CpmArtifactType, CpmDeploymentModel, CpmHostingType,
} from '@/types';
import LicenseTree, { type LicenseSelection } from '@/components/LicenseTree';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProductListItem { id: string; name: string }
interface ProductVersionListItem { id: string; version: string; phase: string }

export type MappingFormState = {
  customerId: string;
  productId: string;
  productVersionId: string;
  branch: string;
  environment: string;
  notes: string;
  // License tree selection
  licensedModuleGroupIds: string[];
  licensedModuleIds: string[];
  licensedServiceIds: string[];
  // Deployment
  artifactType: CpmArtifactType | '';
  deploymentModel: CpmDeploymentModel | '';
  hostingType: CpmHostingType | '';
  helmChartTemplateName: string;
  helmRepoUrl: string;
  environments: string; // comma-sep for UI
};

export const blankMappingForm = (): MappingFormState => ({
  customerId: '', productId: '', productVersionId: '',
  branch: '', environment: '', notes: '',
  licensedModuleGroupIds: [], licensedModuleIds: [], licensedServiceIds: [],
  artifactType: '', deploymentModel: '',
  hostingType: '', helmChartTemplateName: '', helmRepoUrl: '', environments: '',
});

export function mappingFormToInput(form: MappingFormState) {
  const { productId: _pid, licensedModuleGroupIds: _lg, licensedModuleIds: _lm, licensedServiceIds: _ls, ...rest } = form;
  void _pid; void _lg; void _lm; void _ls;
  return {
    customerId: rest.customerId,
    productVersionId: rest.productVersionId,
    branch: rest.branch || undefined,
    environment: rest.environment || undefined,
    notes: rest.notes || undefined,
    artifactType: (rest.artifactType || undefined) as CpmArtifactType | undefined,
    deploymentModel: (rest.deploymentModel || undefined) as CpmDeploymentModel | undefined,
    hostingType: (rest.hostingType || undefined) as CpmHostingType | undefined,
    helmChartTemplateName: rest.helmChartTemplateName || undefined,
    helmRepoUrl: rest.helmRepoUrl || undefined,
    environments: rest.environments
      ? rest.environments.split(',').map((s) => s.trim()).filter(Boolean)
      : [],
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  editingId: string | null;
  form: MappingFormState;
  customers: Customer[];
  isSaving: boolean;
  onChange: (patch: Partial<MappingFormState>) => void;
  onSave: () => void;
  onClose: () => void;
}

const ARTIFACT_TYPES: Array<{ value: CpmArtifactType | ''; label: string }> = [
  { value: '', label: 'Seçiniz' },
  { value: 'DOCKER', label: 'Docker' },
  { value: 'BINARY', label: 'Binary' },
  { value: 'GIT_SYNC', label: 'Git Sync' },
];

const DEPLOYMENT_MODELS: Array<{ value: CpmDeploymentModel | ''; label: string }> = [
  { value: '', label: 'Seçiniz' },
  { value: 'SAAS', label: 'SaaS' },
  { value: 'ON_PREM', label: 'On-Prem' },
];

const HOSTING_TYPES: Array<{ value: CpmHostingType | ''; label: string }> = [
  { value: '', label: 'Seçiniz' },
  { value: 'IAAS', label: 'IaaS' },
  { value: 'SELF_HOSTED', label: 'Self-Hosted' },
];

export default function MappingDialog({
  open, editingId, form, customers, isSaving, onChange, onSave, onClose,
}: Props) {
  const set = (patch: Partial<MappingFormState>) => onChange(patch);

  const { data: products = [] } = useQuery<ProductListItem[]>({
    queryKey: ['products'],
    queryFn: () => api.get('/products').then((r) => r.data.data),
  });

  const { data: versionsRaw } = useQuery<ProductVersionListItem[]>({
    queryKey: ['product-versions', form.productId],
    queryFn: () =>
      api.get(`/product-versions?productId=${form.productId}`).then((r) => {
        const d = r.data?.data ?? r.data;
        return Array.isArray(d) ? d : [];
      }),
    enabled: !!form.productId,
  });
  const versions: ProductVersionListItem[] = Array.isArray(versionsRaw) ? versionsRaw : [];

  const showHelm = form.artifactType === 'DOCKER' && form.deploymentModel === 'ON_PREM';

  const licenseValue: LicenseSelection = {
    licensedModuleGroupIds: form.licensedModuleGroupIds,
    licensedModuleIds: form.licensedModuleIds,
    licensedServiceIds: form.licensedServiceIds,
  };

  const handleLicenseChange = (sel: LicenseSelection) => {
    onChange({
      licensedModuleGroupIds: sel.licensedModuleGroupIds,
      licensedModuleIds: sel.licensedModuleIds,
      licensedServiceIds: sel.licensedServiceIds,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth scroll="paper">
      <DialogTitle>{editingId ? 'Eşleştirmeyi Düzenle' : 'Yeni Eşleştirme'}</DialogTitle>

      <DialogContent dividers>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} mt={0.5}>
          {/* ─── Sol: Meta + Deployment alanları ─────────────────────── */}
          <Stack spacing={2.5} flex={1} minWidth={280}>
            {/* Customer + Product/Version selects */}
            <TextField select label="Müşteri" required fullWidth
              value={form.customerId}
              onChange={(e) => set({ customerId: e.target.value })}>
              <MenuItem value="">Seçiniz</MenuItem>
              {customers.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name} ({c.code})</MenuItem>
              ))}
            </TextField>

            <TextField select label="Ürün" required fullWidth
              value={form.productId}
              onChange={(e) => set({ productId: e.target.value, productVersionId: '', licensedModuleGroupIds: [], licensedModuleIds: [], licensedServiceIds: [] })}>
              <MenuItem value="">Seçiniz</MenuItem>
              {products.map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
              ))}
            </TextField>

            <TextField select label="Versiyon" required fullWidth
              value={form.productVersionId}
              onChange={(e) => set({ productVersionId: e.target.value })}
              disabled={!form.productId}>
              <MenuItem value="">Seçiniz</MenuItem>
              {versions.map((v) => (
                <MenuItem key={v.id} value={v.id}>{v.version} — {v.phase}</MenuItem>
              ))}
            </TextField>

            <Divider><Typography variant="caption" color="text.secondary">Deployment</Typography></Divider>

            <Stack direction="row" spacing={2}>
              <TextField select label="Artifact Tipi" fullWidth
                value={form.artifactType}
                onChange={(e) => set({ artifactType: e.target.value as CpmArtifactType | '' })}>
                {ARTIFACT_TYPES.map((a) => (
                  <MenuItem key={a.value} value={a.value}>{a.label}</MenuItem>
                ))}
              </TextField>
              <TextField select label="Deployment Modeli" fullWidth
                value={form.deploymentModel}
                onChange={(e) => set({ deploymentModel: e.target.value as CpmDeploymentModel | '' })}>
                {DEPLOYMENT_MODELS.map((d) => (
                  <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>
                ))}
              </TextField>
            </Stack>

            {form.deploymentModel === 'ON_PREM' && (
              <TextField select label="Hosting Tipi" fullWidth
                value={form.hostingType}
                onChange={(e) => set({ hostingType: e.target.value as CpmHostingType | '' })}>
                {HOSTING_TYPES.map((h) => (
                  <MenuItem key={h.value} value={h.value}>{h.label}</MenuItem>
                ))}
              </TextField>
            )}

            {showHelm && (
              <Box>
                <Divider sx={{ mb: 2 }}><Typography variant="caption" color="text.secondary">Helm</Typography></Divider>
                <Stack spacing={2}>
                  <TextField label="Helm Chart Template Adı" fullWidth
                    value={form.helmChartTemplateName}
                    onChange={(e) => set({ helmChartTemplateName: e.target.value })} />
                  <TextField label="Helm Repo URL" fullWidth
                    value={form.helmRepoUrl}
                    onChange={(e) => set({ helmRepoUrl: e.target.value })} />
                </Stack>
              </Box>
            )}

            <Divider><Typography variant="caption" color="text.secondary">Genel</Typography></Divider>

            <TextField label="Branch" fullWidth placeholder="production"
              value={form.branch} onChange={(e) => set({ branch: e.target.value })} />
            <TextField label="Ortam" fullWidth placeholder="PROD / STAGE / DEV"
              value={form.environment} onChange={(e) => set({ environment: e.target.value })} />
            <TextField label="Ortamlar (virgülle ayrılmış)" fullWidth
              value={form.environments} onChange={(e) => set({ environments: e.target.value })}
              placeholder="PROD, STAGE" />
            <TextField label="Notlar" fullWidth multiline rows={2}
              value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
          </Stack>

          {/* ─── Sağ: Lisans Ağacı ──────────────────────────────────── */}
          <Box flex={1.2} minWidth={300} sx={{
            borderLeft: { md: '1px solid' },
            borderColor: { md: 'divider' },
            pl: { md: 3 },
          }}>
            <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
              Lisans Ağacı
            </Typography>
            <LicenseTree
              productId={form.productId}
              value={licenseValue}
              onChange={handleLicenseChange}
            />
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>İptal</Button>
        <Button variant="contained" onClick={onSave} disabled={isSaving}>
          {isSaving ? <CircularProgress size={18} /> : editingId ? 'Güncelle' : 'Eşleştir'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
