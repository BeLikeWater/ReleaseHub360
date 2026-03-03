import { useState } from 'react';
import {
  Drawer, Typography, Stack, Button, TextField, MenuItem,
  FormControl, FormLabel, RadioGroup, FormControlLabel, Radio,
  Divider, CircularProgress, Tab, Tabs, Box,
} from '@mui/material';
import type { Customer, TicketPlatform } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

export type CustomerFormState = {
  name: string;
  code: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  notes: string;
  isActive: boolean;
  ticketPlatform: TicketPlatform | '';
  ticketBaseUrl: string;
  ticketApiToken: string;
  ticketProjectKey: string;
  azureTargetAreaPath: string;
  azureTargetIterationPath: string;
  azureTargetWorkItemType: string;
  azureTargetTags: string;     // comma-separated for UI
  githubTargetRepo: string;
  githubTargetLabels: string; // comma-separated for UI
};

export const blankCustomerForm = (): CustomerFormState => ({
  name: '', code: '', contactEmail: '', contactPhone: '',
  address: '', notes: '', isActive: true,
  ticketPlatform: '', ticketBaseUrl: '', ticketApiToken: '',
  ticketProjectKey: '', azureTargetAreaPath: '', azureTargetIterationPath: '',
  azureTargetWorkItemType: '', azureTargetTags: '',
  githubTargetRepo: '', githubTargetLabels: '',
});

export function customerFormToInput(form: CustomerFormState) {
  return {
    name: form.name,
    code: form.code,
    contactEmail: form.contactEmail || undefined,
    contactPhone: form.contactPhone || undefined,
    address: form.address || undefined,
    notes: form.notes || undefined,
    isActive: form.isActive,
    ticketPlatform: (form.ticketPlatform || undefined) as TicketPlatform | undefined,
    ticketBaseUrl: form.ticketBaseUrl || undefined,
    ticketApiToken: form.ticketApiToken || undefined,
    ticketProjectKey: form.ticketProjectKey || undefined,
    azureTargetAreaPath: form.azureTargetAreaPath || undefined,
    azureTargetIterationPath: form.azureTargetIterationPath || undefined,
    azureTargetWorkItemType: form.azureTargetWorkItemType || undefined,
    azureTargetTags: form.azureTargetTags
      ? form.azureTargetTags.split(',').map((s) => s.trim()).filter(Boolean)
      : [],
    githubTargetRepo: form.githubTargetRepo || undefined,
    githubTargetLabels: form.githubTargetLabels
      ? form.githubTargetLabels.split(',').map((s) => s.trim()).filter(Boolean)
      : [],
  };
}

export function customerToForm(c: Customer): CustomerFormState {
  return {
    name: c.name,
    code: c.code ?? '',
    contactEmail: c.contactEmail ?? '',
    contactPhone: c.contactPhone ?? '',
    address: c.address ?? '',
    notes: c.notes ?? '',
    isActive: c.isActive,
    ticketPlatform: c.ticketPlatform ?? '',
    ticketBaseUrl: c.ticketBaseUrl ?? '',
    ticketApiToken: '',   // masked on server — send empty to keep existing
    ticketProjectKey: c.ticketProjectKey ?? '',
    azureTargetAreaPath: c.azureTargetAreaPath ?? '',
    azureTargetIterationPath: c.azureTargetIterationPath ?? '',
    azureTargetWorkItemType: c.azureTargetWorkItemType ?? '',
    azureTargetTags: (c.azureTargetTags ?? []).join(', '),
    githubTargetRepo: c.githubTargetRepo ?? '',
    githubTargetLabels: (c.githubTargetLabels ?? []).join(', '),
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  editing: Customer | null;
  form: CustomerFormState;
  isSaving: boolean;
  onChange: (patch: Partial<CustomerFormState>) => void;
  onSave: () => void;
  onClose: () => void;
}

const TICKET_PLATFORMS: Array<{ value: TicketPlatform | ''; label: string }> = [
  { value: '', label: 'Seçiniz' },
  { value: 'AZURE', label: 'Azure DevOps' },
  { value: 'GITHUB', label: 'GitHub' },
  { value: 'JIRA', label: 'Jira' },
  { value: 'NONE', label: 'Yok' },
];

export default function CustomerDialog({ open, editing, form, isSaving, onChange, onSave, onClose }: Props) {
  const [tab, setTab] = useState(0);

  const f = form;
  const set = (patch: Partial<CustomerFormState>) => onChange(patch);

  return (
    <Drawer anchor="right" open={open} onClose={onClose}
      PaperProps={{ sx: { width: 540, p: 0, display: 'flex', flexDirection: 'column' } }}>

      {/* Header */}
      <Box sx={{ px: 3, pt: 3, pb: 1 }}>
        <Typography variant="h6">{editing ? 'Müşteriyi Düzenle' : 'Yeni Müşteri'}</Typography>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Temel Bilgiler" />
        <Tab label="Ticket Platformu" />
      </Tabs>

      {/* Scrollable body */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>
        {tab === 0 && (
          <Stack spacing={2.5}>
            <TextField label="Müşteri Adı" fullWidth required
              value={f.name} onChange={(e) => set({ name: e.target.value })} />
            <TextField label="Müşteri Kodu" fullWidth required
              value={f.code} onChange={(e) => set({ code: e.target.value })} />
            <TextField label="E-posta" type="email" fullWidth
              value={f.contactEmail} onChange={(e) => set({ contactEmail: e.target.value })} />
            <TextField label="Telefon" fullWidth
              value={f.contactPhone} onChange={(e) => set({ contactPhone: e.target.value })} />
            <TextField label="Adres" fullWidth
              value={f.address} onChange={(e) => set({ address: e.target.value })} />
            <TextField label="Notlar" fullWidth multiline rows={3}
              value={f.notes} onChange={(e) => set({ notes: e.target.value })} />
            <FormControl component="fieldset">
              <FormLabel component="legend">Durum</FormLabel>
              <RadioGroup row
                value={f.isActive ? 'active' : 'passive'}
                onChange={(e) => set({ isActive: e.target.value === 'active' })}>
                <FormControlLabel value="active" control={<Radio />} label="Aktif" />
                <FormControlLabel value="passive" control={<Radio />} label="Pasif" />
              </RadioGroup>
            </FormControl>
          </Stack>
        )}

        {tab === 1 && (
          <Stack spacing={2.5}>
            <TextField select label="Ticket Platformu" fullWidth
              value={f.ticketPlatform}
              onChange={(e) => set({ ticketPlatform: e.target.value as TicketPlatform | '' })}>
              {TICKET_PLATFORMS.map((p) => (
                <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
              ))}
            </TextField>

            {f.ticketPlatform && f.ticketPlatform !== 'NONE' && (
              <>
                <TextField label="Base URL" fullWidth
                  value={f.ticketBaseUrl}
                  onChange={(e) => set({ ticketBaseUrl: e.target.value })}
                  placeholder="https://dev.azure.com/myorg" />
                <TextField label="API Token" fullWidth type="password"
                  value={f.ticketApiToken}
                  onChange={(e) => set({ ticketApiToken: e.target.value })}
                  helperText={editing ? 'Boş bırakılırsa mevcut token korunur' : undefined} />
                <TextField label="Proje / Repo Anahtarı" fullWidth
                  value={f.ticketProjectKey}
                  onChange={(e) => set({ ticketProjectKey: e.target.value })} />

                {f.ticketPlatform === 'AZURE' && (
                  <>
                    <Divider><Typography variant="caption">Azure Hedef Alanları</Typography></Divider>
                    <TextField label="Area Path" fullWidth
                      value={f.azureTargetAreaPath}
                      onChange={(e) => set({ azureTargetAreaPath: e.target.value })} />
                    <TextField label="Iteration Path" fullWidth
                      value={f.azureTargetIterationPath}
                      onChange={(e) => set({ azureTargetIterationPath: e.target.value })} />
                    <TextField label="Work Item Type" fullWidth
                      value={f.azureTargetWorkItemType}
                      onChange={(e) => set({ azureTargetWorkItemType: e.target.value })}
                      placeholder="Task" />
                    <TextField label="Etiketler (virgülle ayrılmış)" fullWidth
                      value={f.azureTargetTags}
                      onChange={(e) => set({ azureTargetTags: e.target.value })} />
                  </>
                )}

                {f.ticketPlatform === 'GITHUB' && (
                  <>
                    <Divider><Typography variant="caption">GitHub Hedef Alanları</Typography></Divider>
                    <TextField label="Hedef Repository (owner/repo)" fullWidth
                      value={f.githubTargetRepo}
                      onChange={(e) => set({ githubTargetRepo: e.target.value })} />
                    <TextField label="Label'lar (virgülle ayrılmış)" fullWidth
                      value={f.githubTargetLabels}
                      onChange={(e) => set({ githubTargetLabels: e.target.value })} />
                  </>
                )}
              </>
            )}
          </Stack>
        )}
      </Box>

      {/* Footer */}
      <Divider />
      <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>İptal</Button>
        <Button variant="contained" onClick={onSave} disabled={isSaving}>
          {isSaving ? <CircularProgress size={18} /> : 'Kaydet'}
        </Button>
      </Stack>
    </Drawer>
  );
}
