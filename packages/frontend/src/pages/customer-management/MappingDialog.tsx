import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Stack, Button, TextField, MenuItem, Divider,
  Typography, CircularProgress, Box,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import api from '@/api/client';
import type {
  Customer,
  SubscriptionLevel, CpmArtifactType, CpmDeploymentModel, CpmHostingType,
} from '@/types';

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
  subscriptionLevel: SubscriptionLevel | '';
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
  subscriptionLevel: '', artifactType: '', deploymentModel: '',
  hostingType: '', helmChartTemplateName: '', helmRepoUrl: '', environments: '',
});

export function mappingFormToInput(form: MappingFormState) {
  const { productId: _pid, ...rest } = form;
  void _pid;
  return {
    customerId: rest.customerId,
    productVersionId: rest.productVersionId,
    branch: rest.branch || undefined,
    environment: rest.environment || undefined,
    notes: rest.notes || undefined,
    subscriptionLevel: (rest.subscriptionLevel || undefined) as SubscriptionLevel | undefined,
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

const SUBSCRIPTION_LEVELS: Array<{ value: SubscriptionLevel | ''; label: string }> = [
  { value: '', label: 'Seçiniz' },
  { value: 'FULL', label: 'Full' },
  { value: 'MODULE_GROUP', label: 'Module Group' },
  { value: 'MODULE', label: 'Module' },
  { value: 'SERVICE', label: 'Service' },
];

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

  const { data: versions = [] } = useQuery<ProductVersionListItem[]>({
    queryKey: ['product-versions', form.productId],
    queryFn: () =>
      api.get(`/product-versions?productId=${form.productId}`).then((r) => r.data.data),
    enabled: !!form.productId,
  });

  const showHelm = form.artifactType === 'DOCKER' && form.deploymentModel === 'ON_PREM';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle>{editingId ? 'Eşleştirmeyi Düzenle' : 'Yeni Eşleştirme'}</DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5} mt={0.5}>
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
            onChange={(e) => set({ productId: e.target.value, productVersionId: '' })}>
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

          <Divider><Typography variant="caption" color="text.secondary">Abonelik</Typography></Divider>

          <TextField select label="Abonelik Seviyesi" fullWidth
            value={form.subscriptionLevel}
            onChange={(e) => set({ subscriptionLevel: e.target.value as SubscriptionLevel | '' })}>
            {SUBSCRIPTION_LEVELS.map((s) => (
              <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
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
