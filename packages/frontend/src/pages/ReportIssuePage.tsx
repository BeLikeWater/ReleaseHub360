import { useState } from 'react';
import {
  Box, Typography, Button, TextField, FormControl, FormLabel, RadioGroup,
  FormControlLabel, Radio, Tab, Tabs, Card, CardContent, Alert, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Snackbar, Drawer, Divider, IconButton,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import WarningIcon from '@mui/icons-material/Warning';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import apiClient from '@/api/client';
import { useAuthStore } from '@/store/authStore';

type Issue = {
  id: string; title: string; status: string; priority: string;
  category?: string; createdAt: string;
};

const CATEGORIES = ['Platform Hatası', 'Yanlış Veri', 'Performans', 'Özellik İsteği', 'Diğer'];
const PRIORITIES = [
  { value: 'CRITICAL', label: 'Kritik (sistem çalışmıyor)' },
  { value: 'HIGH', label: 'Yüksek' },
  { value: 'MEDIUM', label: 'Orta' },
  { value: 'LOW', label: 'Düşük' },
];
const MODULES = ['Release Health Check', 'Pipeline Durumu', 'Hotfix Merkezi', 'Müşteri Yönetimi', 'Ürün Kataloğu', 'Diğer'];

function priorityColor(p: string): 'error' | 'warning' | 'info' | 'default' {
  if (p === 'CRITICAL') return 'error';
  if (p === 'HIGH') return 'warning';
  if (p === 'MEDIUM') return 'info';
  return 'default';
}

export default function ReportIssuePage() {
  const currentUser = useAuthStore(s => s.user);
  void currentUser; // used for future scoped filtering
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState({
    title: '', category: 'Platform Hatası', priority: 'MEDIUM',
    module: '', description: '', steps: '',
  });
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [drawerIssue, setDrawerIssue] = useState<Issue | null>(null);

  // Re-use urgent-changes as a proxy for user-reported issues (same status tracking model)
  const { data: myIssues = [] } = useQuery<Issue[]>({
    queryKey: ['my-issues'],
    queryFn: () => apiClient.get('/urgent-changes', { params: { limit: 50 } }).then(r => r.data.data ?? r.data),
    enabled: tab === 1,
  });

  const submitMutation = useMutation({
    mutationFn: (data: typeof form) => apiClient.post('/urgent-changes', {
      title: data.title,
      description: `[${data.category}] ${data.description}\n\nAdımlar:\n${data.steps}\n\nModül: ${data.module}`,
      priority: data.priority,
      status: 'OPEN',
    }),
    onSuccess: () => {
      setSnackbar(`Sorun bildirildi! Takip etmek için "Benim Sorunlarım" sekmesine bakın.`);
      setForm({ title: '', category: 'Platform Hatası', priority: 'MEDIUM', module: '', description: '', steps: '' });
    },
  });

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>Sorun Bildir</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Yeni Sorun Bildir" />
        <Tab label={`Benim Sorunlarım (${myIssues.length ?? '...'})`} />
      </Tabs>

      {tab === 0 && (
        <Card variant="outlined" sx={{ maxWidth: 700 }}>
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField label="Başlık *" fullWidth value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />

              <FormControl>
                <FormLabel>Kategori *</FormLabel>
                <RadioGroup row value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <FormControlLabel key={c} value={c} control={<Radio size="small" />} label={c} />)}
                </RadioGroup>
              </FormControl>

              <FormControl>
                <FormLabel>Öncelik</FormLabel>
                <RadioGroup row value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  {PRIORITIES.map(p => <FormControlLabel key={p.value} value={p.value} control={<Radio size="small" />} label={p.label} />)}
                </RadioGroup>
              </FormControl>

              {form.priority === 'CRITICAL' && (
                <Alert severity="warning" icon={<WarningIcon />}>
                  Kritik öncelik seçildi — Admin bilgilendirilecek.
                </Alert>
              )}

              <FormControl fullWidth>
                <TextField
                  select label="İlgili Ekran / Modül"
                  value={form.module} onChange={e => setForm(f => ({ ...f, module: e.target.value }))}
                  SelectProps={{ native: true }}
                >
                  <option value="">Seçin...</option>
                  {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
                </TextField>
              </FormControl>

              <TextField label="Açıklama *" fullWidth multiline rows={4} value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />

              <TextField label="Sorunu Tekrar Etme Adımları" fullWidth multiline rows={3} value={form.steps}
                onChange={e => setForm(f => ({ ...f, steps: e.target.value }))} />

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button startIcon={<AttachFileIcon />} variant="outlined">Ekran Görüntüsü Ekle</Button>
                <Button variant="contained" startIcon={<SendIcon />}
                  disabled={!form.title || !form.description || submitMutation.isPending}
                  onClick={() => submitMutation.mutate(form)}>
                  Sorunu Gönder
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {tab === 1 && (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Başlık</TableCell>
                <TableCell>Öncelik</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell>Tarih</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {myIssues.length === 0 ? (
                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>Henüz sorun bildirmediniz.</TableCell></TableRow>
              ) : myIssues.map(issue => (
                <TableRow key={issue.id} hover sx={{ cursor: 'pointer' }} onClick={() => setDrawerIssue(issue)}>
                  <TableCell>{issue.title}</TableCell>
                  <TableCell><Chip label={issue.priority} color={priorityColor(issue.priority)} size="small" /></TableCell>
                  <TableCell><Chip label={issue.status} size="small" /></TableCell>
                  <TableCell>{format(new Date(issue.createdAt), 'dd MMM yyyy', { locale: tr })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Detail Drawer */}
      <Drawer anchor="right" open={!!drawerIssue} onClose={() => setDrawerIssue(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 440 }, p: 3 } }}>
        {drawerIssue && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Box>
                <Chip label={drawerIssue.priority} color={priorityColor(drawerIssue.priority)} size="small" sx={{ mb: 1 }} />
                <Typography variant="h6" fontWeight={700}>{drawerIssue.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {format(new Date(drawerIssue.createdAt), 'dd MMMM yyyy', { locale: tr })}
                </Typography>
              </Box>
              <IconButton onClick={() => setDrawerIssue(null)}><CloseIcon /></IconButton>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Chip label={drawerIssue.status} size="small" sx={{ mb: 2 }} />
          </>
        )}
      </Drawer>

      <Snackbar open={!!snackbar} autoHideDuration={5000} onClose={() => setSnackbar(null)}
        message={snackbar} />
    </Box>
  );
}
