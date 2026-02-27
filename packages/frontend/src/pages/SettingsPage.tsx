import { useState, useEffect } from 'react';
import {
  Box, Typography, Tabs, Tab, TextField, Button, Paper,
  Stack, Chip, CircularProgress, Alert, Divider, InputAdornment,
  IconButton, FormControlLabel, Checkbox,
} from '@mui/material';
import {
  Visibility as ShowIcon,
  VisibilityOff as HideIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';

interface Setting {
  key: string;
  value: string;
  category: string;
  description?: string;
}

type ConnectionStatus = 'idle' | 'testing' | 'ok' | 'error';

function ConnectionChip({ status }: { status: ConnectionStatus }) {
  if (status === 'testing') return <CircularProgress size={16} />;
  if (status === 'ok') return <Chip icon={<CheckIcon />} label="Bağlı" color="success" size="small" />;
  if (status === 'error') return <Chip icon={<ErrorIcon />} label="Bağlantı Hatası" color="error" size="small" />;
  return null;
}

function MaskedField({
  label, settingKey, settings, onChange,
}: {
  label: string;
  settingKey: string;
  settings: Record<string, string>;
  onChange: (key: string, val: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <TextField
      fullWidth label={label} size="small"
      type={show ? 'text' : 'password'}
      placeholder="●●●●●●●●●●●● (yeni değer girin)"
      value={settings[settingKey] ?? ''}
      onChange={(e) => onChange(settingKey, e.target.value)}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton size="small" onClick={() => setShow((s) => !s)}>
              {show ? <HideIcon fontSize="small" /> : <ShowIcon fontSize="small" />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
  const [tfsStatus, setTfsStatus] = useState<ConnectionStatus>('idle');
  const [n8nStatus, setN8nStatus] = useState<ConnectionStatus>('idle');
  const [mcpStatus, setMcpStatus] = useState<ConnectionStatus>('idle');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data: settings = [], isLoading } = useQuery<Setting[]>({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then((r) => r.data.data ?? r.data),
  });

  useEffect(() => {
    if (settings.length > 0) {
      const map: Record<string, string> = {};
      settings.forEach((s) => { map[s.key] = s.value ?? ''; });
      setLocalSettings(map);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (body: { settings: { key: string; value: string; category: string }[] }) =>
      api.put('/settings', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const testConnection = async (type: 'tfs' | 'n8n' | 'mcp') => {
    const setter = { tfs: setTfsStatus, n8n: setN8nStatus, mcp: setMcpStatus }[type];
    setter('testing');
    try {
      await api.post('/settings/test-connection', { type });
      setter('ok');
    } catch {
      setter('error');
    }
  };

  const handleChange = (key: string, value: string) => {
    setLocalSettings((s) => ({ ...s, [key]: value }));
  };

  const handleSave = () => {
    const payload = Object.entries(localSettings)
      .filter(([, v]) => v !== '')
      .map(([key, value]) => {
        const original = settings.find((s) => s.key === key);
        return { key, value, category: original?.category ?? 'GENERAL' };
      });
    updateMutation.mutate({ settings: payload });
  };

  if (isLoading) return <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>;

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight={700} mb={3}>
        Sistem Ayarları
      </Typography>

      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Ayarlar başarıyla kaydedildi
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Entegrasyonlar" />
        <Tab label="Bildirimler" />
        <Tab label="Genel" />
      </Tabs>

      {/* Integrations Tab */}
      {tab === 0 && (
        <Stack spacing={3}>
          {/* TFS */}
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1" fontWeight={700}>Azure DevOps / TFS</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <ConnectionChip status={tfsStatus} />
                <Button size="small" onClick={() => testConnection('tfs')}>
                  Bağlantıyı Test Et
                </Button>
              </Stack>
            </Stack>
            <Stack spacing={2}>
              <TextField
                fullWidth label="Organisation URL" size="small"
                value={localSettings['tfs.url'] ?? ''}
                onChange={(e) => handleChange('tfs.url', e.target.value)}
                placeholder="https://dev.azure.com/org"
              />
              <MaskedField
                label="PAT Token"
                settingKey="tfs.pat"
                settings={localSettings}
                onChange={handleChange}
              />
              <TextField
                fullWidth label="Project" size="small"
                value={localSettings['tfs.project'] ?? ''}
                onChange={(e) => handleChange('tfs.project', e.target.value)}
              />
            </Stack>
          </Paper>

          {/* n8n */}
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1" fontWeight={700}>n8n Workflow Engine</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <ConnectionChip status={n8nStatus} />
                <Button size="small" onClick={() => testConnection('n8n')}>
                  Bağlantıyı Test Et
                </Button>
              </Stack>
            </Stack>
            <Stack spacing={2}>
              <TextField
                fullWidth label="Base URL" size="small"
                value={localSettings['n8n.url'] ?? ''}
                onChange={(e) => handleChange('n8n.url', e.target.value)}
                placeholder="http://n8n:5678"
              />
              <MaskedField
                label="API Key"
                settingKey="n8n.apiKey"
                settings={localSettings}
                onChange={handleChange}
              />
            </Stack>
          </Paper>

          {/* MCP */}
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1" fontWeight={700}>MCP Server</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <ConnectionChip status={mcpStatus} />
                <Button size="small" onClick={() => testConnection('mcp')}>
                  Bağlantıyı Test Et
                </Button>
              </Stack>
            </Stack>
            <TextField
              fullWidth label="Base URL" size="small"
              value={localSettings['mcp.url'] ?? ''}
              onChange={(e) => handleChange('mcp.url', e.target.value)}
              placeholder="http://mcp-server:8083"
            />
          </Paper>
        </Stack>
      )}

      {/* Notifications Tab */}
      {tab === 1 && (
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Typography variant="subtitle1" fontWeight={700} mb={2}>E-posta Bildirimleri</Typography>
          <Stack spacing={1}>
            {[
              { key: 'notify.hotfixApproval', label: 'Hotfix onayı' },
              { key: 'notify.pipelineFail', label: 'Pipeline başarısız' },
              { key: 'notify.codeSyncDone', label: 'Code sync tamamlandı' },
              { key: 'notify.breakingChange', label: 'Breaking change tespit edildi' },
              { key: 'notify.phaseTransition', label: 'Her versiyon aşama geçişi' },
              { key: 'notify.prMerge', label: 'Tüm PR merge\'leri' },
            ].map(({ key, label }) => (
              <FormControlLabel
                key={key}
                control={
                  <Checkbox
                    checked={localSettings[key] === 'true'}
                    onChange={(e) => handleChange(key, e.target.checked ? 'true' : 'false')}
                    size="small"
                  />
                }
                label={label}
              />
            ))}
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" mb={1}>Slack Webhook (opsiyonel)</Typography>
          <TextField
            fullWidth size="small"
            value={localSettings['notify.slackWebhook'] ?? ''}
            onChange={(e) => handleChange('notify.slackWebhook', e.target.value)}
            placeholder="https://hooks.slack.com/services/xxx"
          />
        </Paper>
      )}

      {/* General Tab */}
      {tab === 2 && (
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Stack spacing={2.5}>
            <TextField
              fullWidth label="Uygulama Adı" size="small"
              value={localSettings['app.name'] ?? ''}
              onChange={(e) => handleChange('app.name', e.target.value)}
            />
            <TextField
              select fullWidth label="Varsayılan Zaman Dilimi" size="small"
              value={localSettings['app.timezone'] ?? 'Europe/Istanbul'}
              onChange={(e) => handleChange('app.timezone', e.target.value)}
              SelectProps={{ native: true }}
            >
              {['Europe/Istanbul', 'UTC', 'Europe/London', 'America/New_York'].map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </TextField>
            <TextField
              select fullWidth label="Oturum Süresi" size="small"
              value={localSettings['auth.accessTokenExpiry'] ?? '15m'}
              onChange={(e) => handleChange('auth.accessTokenExpiry', e.target.value)}
              SelectProps={{ native: true }}
            >
              {['5m', '15m', '30m', '1h'].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </TextField>
          </Stack>
        </Paper>
      )}

      {/* Sticky Save */}
      <Box sx={{ position: 'sticky', bottom: 16, display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button
          variant="contained" size="large"
          onClick={handleSave}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? <CircularProgress size={20} /> : 'Değişiklikleri Kaydet'}
        </Button>
      </Box>
    </Box>
  );
}
