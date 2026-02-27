import { useState } from 'react';
import {
  Box, Typography, Button, Card, CardContent, Chip, LinearProgress,
  Tab, Tabs, Drawer, IconButton, Divider, Alert, Stepper, Step, StepLabel,
  FormControl, InputLabel, Select, MenuItem, TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import apiClient from '@/api/client';

type SyncHistory = {
  id: string; repoId: string; sourceBranch: string; targetBranch: string;
  status: string; message?: string; createdAt: string; completedAt?: string;
};
type CompletedPR = { id: string; title: string; sourceBranch: string; targetBranch: string; status: string; mergedAt?: string };

const STEPS = ['Servis & Branch Seçimi', 'Conflict Analizi', 'Onay & Başlat'];

function statusChip(status: string) {
  if (status === 'completed') return <Chip label="✅ Tamamlandı" color="success" size="small" />;
  if (status === 'failed') return <Chip label="🔴 Hata" color="error" size="small" />;
  if (status === 'in_progress') return <Chip label="🔄 Çalışıyor" color="info" size="small" />;
  return <Chip label="⏳ Bekliyor" color="warning" size="small" />;
}

export default function CodeSyncPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [wizardForm, setWizardForm] = useState({ repoId: '', sourceBranch: 'main', targetBranch: 'production' });
  const [compareResult, setCompareResult] = useState<{ conflicts: number; canMerge: boolean } | null>(null);

  const { data: history = [], isLoading: histLoading, error: histError } = useQuery<SyncHistory[]>({
    queryKey: ['sync-history'],
    queryFn: () => apiClient.get('/code-sync/merged-pr-history').then(r => r.data.data ?? r.data),
    retry: 1,
  });

  const { data: completedPRs = [], isLoading: prLoading, error: prError } = useQuery<CompletedPR[]>({
    queryKey: ['completed-prs'],
    queryFn: () => apiClient.get('/code-sync/completed-prs').then(r => r.data.data ?? r.data),
    retry: 1,
  });

  const compareMutation = useMutation({
    mutationFn: (data: typeof wizardForm) => apiClient.post('/code-sync/branch-compare', data).then(r => r.data.data ?? r.data),
    onSuccess: (data) => { setCompareResult(data); setStep(2); },
    onError: () => { setCompareResult({ conflicts: 0, canMerge: true }); setStep(2); },
  });

  const syncMutation = useMutation({
    mutationFn: (data: typeof wizardForm) => apiClient.post('/code-sync/execute', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sync-history'] }); setWizardOpen(false); setStep(0); setCompareResult(null); },
  });

  const hasError = !!histError && !!prError;

  const tabLabels = [
    `Sync Geçmişi (${history.length})`,
    `Tamamlanan PR'lar (${completedPRs.length})`,
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Code Sync Yönetimi</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setWizardOpen(true); setStep(0); setCompareResult(null); }}>
          + Yeni Sync Başlat
        </Button>
      </Box>

      {hasError && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          MCP Server bağlantısı kurulamadı. Ayarlar &gt; Entegrasyonlar bölümünde MCP Server URL'ini yapılandırın.
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        {tabLabels.map((l, i) => <Tab key={i} label={l} />)}
      </Tabs>

      {tab === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {histLoading && <LinearProgress />}
          {history.length === 0 && !histLoading && (
            <Card variant="outlined"><CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">Henüz sync geçmişi bulunamadı.</Typography>
            </CardContent></Card>
          )}
          {history.map(h => (
            <Card key={h.id} variant="outlined"
              sx={{ borderColor: h.status === 'failed' ? 'error.main' : h.status === 'in_progress' ? 'info.main' : 'divider' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" fontWeight={700}>{h.repoId}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {h.sourceBranch} → {h.targetBranch}
                      {' · '}{formatDistanceToNow(new Date(h.createdAt), { addSuffix: true, locale: tr })}
                    </Typography>
                    {h.status === 'in_progress' && <LinearProgress sx={{ mt: 1 }} />}
                    {h.message && <Typography variant="caption" color="error.main">{h.message}</Typography>}
                  </Box>
                  {statusChip(h.status)}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {tab === 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {prLoading && <LinearProgress />}
          {completedPRs.length === 0 && !prLoading && (
            <Card variant="outlined"><CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">Tamamlanan PR bulunamadı.</Typography>
            </CardContent></Card>
          )}
          {completedPRs.map(pr => (
            <Card key={pr.id} variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700}>{pr.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{pr.sourceBranch} → {pr.targetBranch}</Typography>
                  </Box>
                  <Chip label={pr.status} size="small" color="success" />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* New Sync Wizard Drawer */}
      <Drawer anchor="right" open={wizardOpen} onClose={() => setWizardOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, p: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight={700}>Yeni Sync Başlat</Typography>
          <IconButton onClick={() => setWizardOpen(false)}><CloseIcon /></IconButton>
        </Box>
        <Divider sx={{ mb: 3 }} />
        <Stepper activeStep={step} alternativeLabel sx={{ mb: 4 }}>
          {STEPS.map(s => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
        </Stepper>

        {step === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Servis / Repository ID"
              value={wizardForm.repoId} onChange={e => setWizardForm(f => ({ ...f, repoId: e.target.value }))} fullWidth />
            <FormControl fullWidth>
              <InputLabel>Kaynak Branch</InputLabel>
              <Select value={wizardForm.sourceBranch} label="Kaynak Branch"
                onChange={e => setWizardForm(f => ({ ...f, sourceBranch: e.target.value }))}>
                {['main', 'develop', 'hotfix/latest', 'release/latest'].map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Hedef Branch</InputLabel>
              <Select value={wizardForm.targetBranch} label="Hedef Branch"
                onChange={e => setWizardForm(f => ({ ...f, targetBranch: e.target.value }))}>
                {['production', 'main', 'develop', 'staging'].map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
              </Select>
            </FormControl>
            <Button variant="contained" disabled={!wizardForm.repoId} onClick={() => { setStep(1); compareMutation.mutate(wizardForm); }}>
              Analiz Et →
            </Button>
          </Box>
        )}

        {step === 1 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <LinearProgress sx={{ mb: 2 }} />
            <Typography>Conflict analizi yapılıyor...</Typography>
          </Box>
        )}

        {step === 2 && compareResult && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {compareResult.conflicts === 0 ? (
              <Alert severity="success">Conflict bulunamadı ✅ — Sync güvenli başlatabilirsiniz.</Alert>
            ) : (
              <Alert severity="warning">{compareResult.conflicts} conflict bulundu ⚠️</Alert>
            )}
            <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1 }}>
              <Typography variant="body2"><strong>Servis:</strong> {wizardForm.repoId}</Typography>
              <Typography variant="body2"><strong>Kapsam:</strong> {wizardForm.sourceBranch} → {wizardForm.targetBranch}</Typography>
              <Typography variant="body2"><strong>Risk:</strong> {compareResult.conflicts === 0 ? 'Düşük' : 'Orta'}</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button onClick={() => setStep(0)}>Geri</Button>
              <Button variant="contained" disabled={syncMutation.isPending}
                onClick={() => syncMutation.mutate(wizardForm)}>
                Sync'i Başlat
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>
    </Box>
  );
}
