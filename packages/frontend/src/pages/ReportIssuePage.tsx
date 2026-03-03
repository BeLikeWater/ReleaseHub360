import { useState } from 'react';
import {
  Box, Typography, Button, TextField, Tabs, Tab, Chip, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Drawer, Divider, IconButton, Stack, Alert, Snackbar,
  MenuItem, CircularProgress, LinearProgress, ToggleButton, ToggleButtonGroup,
  Badge,
} from '@mui/material';
import {
  Send as SendIcon,
  Close as CloseIcon,
  Warning as WarningIcon,
  ArrowForward as ArrowForwardIcon,
  ChatBubbleOutline as CommentIcon,
  ViewList as ListIcon,
  ViewKanban as KanbanIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import apiClient from '@/api/client';
import { useAuthStore } from '@/store/authStore';

// ── Types ─────────────────────────────────────────────────────────────────────

type IssueStatus = 'OPEN' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
type IssuePriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

interface Issue {
  id: string;
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  category: string | null;
  module: string | null;
  steps: string | null;
  reportedByName: string | null;
  assignedTo: string | null;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer: { id: string; name: string; code: string } | null;
  _count?: { comments: number; attachments: number };
}

interface Comment {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = ['Platform Hatası', 'Yanlış Veri', 'Performans', 'Özellik İsteği', 'Diğer'];
const PRIORITIES: { value: IssuePriority; label: string }[] = [
  { value: 'CRITICAL', label: 'Kritik (sistem çalışmıyor)' },
  { value: 'HIGH', label: 'Yüksek' },
  { value: 'MEDIUM', label: 'Orta' },
  { value: 'LOW', label: 'Düşük' },
];
const MODULES = ['Release Health Check', 'Pipeline Durumu', 'Hotfix Merkezi', 'Müşteri Yönetimi', 'Ürün Kataloğu', 'Diğer'];

const STATUS_META: Record<IssueStatus, { label: string; color: 'default' | 'info' | 'warning' | 'success' | 'error' | 'primary' }> = {
  OPEN: { label: 'Açık', color: 'error' },
  ACKNOWLEDGED: { label: 'Alındı', color: 'info' },
  IN_PROGRESS: { label: 'İşlemde', color: 'warning' },
  RESOLVED: { label: 'Çözüldü', color: 'success' },
  CLOSED: { label: 'Kapatıldı', color: 'default' },
};

const ALLOWED_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  OPEN: ['ACKNOWLEDGED', 'IN_PROGRESS', 'CLOSED'],
  ACKNOWLEDGED: ['IN_PROGRESS', 'CLOSED'],
  IN_PROGRESS: ['RESOLVED', 'ACKNOWLEDGED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: [],
};

function priorityColor(p: IssuePriority): 'error' | 'warning' | 'info' | 'default' {
  if (p === 'CRITICAL') return 'error';
  if (p === 'HIGH') return 'warning';
  if (p === 'MEDIUM') return 'info';
  return 'default';
}

function fmtDate(d: string) {
  try { return format(new Date(d), 'dd MMM yyyy HH:mm', { locale: tr }); }
  catch { return d; }
}

// ── Issue Detail Drawer ───────────────────────────────────────────────────────

function IssueDrawer({ issue, onClose }: { issue: Issue | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const currentUser = useAuthStore(s => s.user);

  const { data: comments = [], isLoading: loadingComments } = useQuery<Comment[]>({
    queryKey: ['issue-comments', issue?.id],
    queryFn: () => apiClient.get(`/transition-issues/${issue!.id}/comments`).then(r => r.data.data ?? []),
    enabled: !!issue,
  });

  const transitionMutation = useMutation({
    mutationFn: ({ status }: { status: IssueStatus }) =>
      apiClient.post(`/transition-issues/${issue!.id}/transition`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transition-issues'] });
      qc.invalidateQueries({ queryKey: ['transition-issues', issue?.id] });
      onClose();
    },
  });

  const commentMutation = useMutation({
    mutationFn: () => apiClient.post(`/transition-issues/${issue!.id}/comments`, {
      body: newComment,
      authorName: currentUser?.name ?? 'Kullanıcı',
      authorId: currentUser?.id,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['issue-comments', issue?.id] });
      setNewComment('');
    },
  });

  if (!issue) return null;

  const allowedNext = ALLOWED_TRANSITIONS[issue.status] ?? [];

  return (
    <Drawer anchor="right" open={!!issue} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, p: 3, display: 'flex', flexDirection: 'column', gap: 2 } }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box sx={{ flex: 1, pr: 1 }}>
          <Stack direction="row" spacing={1} mb={0.5} flexWrap="wrap">
            <Chip size="small" label={STATUS_META[issue.status].label} color={STATUS_META[issue.status].color} />
            <Chip size="small" label={issue.priority} color={priorityColor(issue.priority)} variant="outlined" />
            {issue.category && <Chip size="small" label={issue.category} variant="outlined" />}
          </Stack>
          <Typography variant="h6" fontWeight={700}>{issue.title}</Typography>
          <Typography variant="caption" color="text.secondary">
            {issue.reportedByName && `${issue.reportedByName} · `}{fmtDate(issue.createdAt)}
          </Typography>
        </Box>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </Stack>

      <Divider />

      {/* Description */}
      <Box>
        <Typography variant="body2" color="text.secondary" mb={0.5}>Açıklama</Typography>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{issue.description}</Typography>
      </Box>

      {issue.steps && (
        <Box>
          <Typography variant="body2" color="text.secondary" mb={0.5}>Tekrar Adımları</Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{issue.steps}</Typography>
        </Box>
      )}

      {issue.customer && (
        <Box>
          <Typography variant="body2" color="text.secondary">Müşteri</Typography>
          <Typography variant="body2">{issue.customer.name} ({issue.customer.code})</Typography>
        </Box>
      )}

      {issue.resolution && (
        <Alert severity="success">
          <Typography variant="body2"><strong>Çözüm:</strong> {issue.resolution}</Typography>
        </Alert>
      )}

      {/* Status Transitions */}
      {allowedNext.length > 0 && (
        <Box>
          <Typography variant="body2" color="text.secondary" mb={1}>Durum Değiştir</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {allowedNext.map(s => (
              <Button key={s} size="small" variant="outlined"
                color={STATUS_META[s].color === 'default' ? 'inherit' : STATUS_META[s].color}
                startIcon={<ArrowForwardIcon />}
                disabled={transitionMutation.isPending}
                onClick={() => transitionMutation.mutate({ status: s })}>
                {STATUS_META[s].label}
              </Button>
            ))}
          </Stack>
        </Box>
      )}

      <Divider />

      {/* Comments */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={1}>
          <CommentIcon fontSize="small" color="action" />
          <Typography variant="body2" fontWeight={600}>Yorumlar ({comments.length})</Typography>
        </Stack>

        {loadingComments && <LinearProgress sx={{ mb: 1 }} />}

        <Stack spacing={1.5} mb={2}>
          {comments.map(c => (
            <Paper key={c.id} variant="outlined" sx={{ p: 1.5 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" fontWeight={600}>{c.authorName}</Typography>
                <Typography variant="caption" color="text.secondary">{fmtDate(c.createdAt)}</Typography>
              </Stack>
              <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>{c.body}</Typography>
            </Paper>
          ))}
          {comments.length === 0 && !loadingComments && (
            <Typography variant="caption" color="text.secondary">Henüz yorum yok.</Typography>
          )}
        </Stack>

        <Stack direction="row" spacing={1}>
          <TextField
            size="small" fullWidth multiline rows={2}
            placeholder="Yorum ekle..."
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
          />
          <Button variant="contained" size="small"
            disabled={!newComment.trim() || commentMutation.isPending}
            onClick={() => commentMutation.mutate()}>
            Gönder
          </Button>
        </Stack>
      </Box>
    </Drawer>
  );
}

// ── Kanban Board ──────────────────────────────────────────────────────────────

function KanbanBoard({ issues, onSelectIssue }: { issues: Issue[]; onSelectIssue: (i: Issue) => void }) {
  const COLUMNS: IssueStatus[] = ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
  const grouped = COLUMNS.reduce<Record<IssueStatus, Issue[]>>((acc, s) => {
    acc[s] = issues.filter(i => i.status === s);
    return acc;
  }, {} as Record<IssueStatus, Issue[]>);

  return (
    <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 2 }}>
      {COLUMNS.map(col => (
        <Box key={col} sx={{ minWidth: 220, flex: '0 0 220px' }}>
          <Paper variant="outlined" sx={{ bgcolor: 'action.hover', p: 1, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip size="small" label={STATUS_META[col].label} color={STATUS_META[col].color} />
            <Typography variant="caption" color="text.secondary">({grouped[col].length})</Typography>
          </Paper>
          <Stack spacing={1}>
            {grouped[col].map(issue => (
              <Paper key={issue.id} variant="outlined" sx={{ p: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                onClick={() => onSelectIssue(issue)}>
                <Chip size="small" label={issue.priority} color={priorityColor(issue.priority)} variant="outlined" sx={{ mb: 0.5 }} />
                <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5, lineHeight: 1.3 }}>{issue.title}</Typography>
                {issue.customer && (
                  <Typography variant="caption" color="text.secondary">{issue.customer.name}</Typography>
                )}
                <Stack direction="row" spacing={0.5} alignItems="center" mt={0.5}>
                  <CommentIcon sx={{ fontSize: 12 }} color="action" />
                  <Typography variant="caption" color="text.secondary">{issue._count?.comments ?? 0}</Typography>
                </Stack>
              </Paper>
            ))}
            {grouped[col].length === 0 && (
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">Boş</Typography>
              </Paper>
            )}
          </Stack>
        </Box>
      ))}
    </Box>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const emptyForm = {
  title: '', category: 'Platform Hatası', priority: 'MEDIUM' as IssuePriority,
  module: '', description: '', steps: '',
};

export default function ReportIssuePage() {
  const currentUser = useAuthStore(s => s.user);
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [form, setForm] = useState(emptyForm);
  const [drawerIssue, setDrawerIssue] = useState<Issue | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'RELEASE_MANAGER';

  // Tab 1: my issues
  const { data: myIssues = [], isLoading: loadingMine } = useQuery<Issue[]>({
    queryKey: ['transition-issues', 'mine', currentUser?.id],
    queryFn: () => apiClient.get('/transition-issues', {
      params: { reportedById: currentUser?.id },
    }).then(r => r.data.data ?? []),
    enabled: tab === 1 && !!currentUser?.id,
  });

  // Tab 2: all issues (admin/RM)
  const { data: allIssues = [], isLoading: loadingAll } = useQuery<Issue[]>({
    queryKey: ['transition-issues', 'all', statusFilter],
    queryFn: () => apiClient.get('/transition-issues', {
      params: statusFilter ? { status: statusFilter } : {},
    }).then(r => r.data.data ?? []),
    enabled: tab === 2,
  });

  const submitMutation = useMutation({
    mutationFn: (data: typeof form) => apiClient.post('/transition-issues', {
      title: data.title,
      description: data.description,
      priority: data.priority,
      category: data.category,
      module: data.module || null,
      steps: data.steps || null,
      reportedByName: currentUser?.name ?? 'Kullanıcı',
      reportedById: currentUser?.id ?? null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transition-issues'] });
      setSnackbar('Sorun başarıyla bildirildi. "Benim Sorunlarım" sekmesinden takip edebilirsiniz.');
      setForm(emptyForm);
      setTab(1);
    },
    onError: () => setSnackbar('Sorun gönderilemedi, lütfen tekrar deneyin.'),
  });

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value })),
  });

  const openMineCount = myIssues.filter(i => i.status === 'OPEN' || i.status === 'IN_PROGRESS').length;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>Sorun Bildir</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Yeni Bildir" />
        <Tab label={
          <Badge badgeContent={openMineCount} color="warning" invisible={openMineCount === 0}>
            Benim Sorunlarım
          </Badge>
        } />
        {isAdmin && <Tab label="Tüm Sorunlar" />}
      </Tabs>

      {/* ── Tab 0: Submit Form ─────────────────────────────────────────────── */}
      {tab === 0 && (
        <Box sx={{ maxWidth: 700 }}>
          <Stack spacing={2.5}>
            <TextField label="Başlık *" fullWidth {...field('title')} />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField select label="Kategori" fullWidth {...field('category')}>
                {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
              <TextField select label="Öncelik" fullWidth {...field('priority')}>
                {PRIORITIES.map(p => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
              </TextField>
            </Stack>

            {form.priority === 'CRITICAL' && (
              <Alert severity="warning" icon={<WarningIcon />}>
                Kritik öncelik — sistem yöneticisi bilgilendirilecek.
              </Alert>
            )}

            <TextField select label="İlgili Ekran / Modül" fullWidth {...field('module')}>
              <MenuItem value="">Seçin...</MenuItem>
              {MODULES.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </TextField>

            <TextField label="Açıklama *" fullWidth multiline rows={4} {...field('description')} />
            <TextField label="Sorunu Tekrar Etme Adımları" fullWidth multiline rows={3} {...field('steps')} />

            <Stack direction="row" justifyContent="flex-end">
              <Button variant="contained" startIcon={<SendIcon />}
                disabled={!form.title || !form.description || submitMutation.isPending}
                onClick={() => submitMutation.mutate(form)}>
                {submitMutation.isPending ? 'Gönderiliyor...' : 'Sorunu Gönder'}
              </Button>
            </Stack>
          </Stack>
        </Box>
      )}

      {/* ── Tab 1: My Issues ──────────────────────────────────────────────── */}
      {tab === 1 && (
        <Box>
          {loadingMine && <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>}

          {!loadingMine && myIssues.length === 0 && (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">Henüz bildirdiğiniz sorun yok.</Typography>
              <Button variant="contained" sx={{ mt: 2 }} onClick={() => setTab(0)}>Sorun Bildir</Button>
            </Paper>
          )}

          {!loadingMine && myIssues.length > 0 && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Başlık</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Öncelik</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Durum</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Tarih</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Yorumlar</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {myIssues.map(issue => (
                    <TableRow key={issue.id} hover sx={{ cursor: 'pointer' }}
                      onClick={() => setDrawerIssue(issue)}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{issue.title}</Typography>
                        {issue.module && <Typography variant="caption" color="text.secondary">{issue.module}</Typography>}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={issue.priority} color={priorityColor(issue.priority)} />
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={STATUS_META[issue.status].label} color={STATUS_META[issue.status].color} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{fmtDate(issue.createdAt)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <CommentIcon fontSize="small" color="action" sx={{ fontSize: 14 }} />
                          <Typography variant="caption">{issue._count?.comments ?? 0}</Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* ── Tab 2: All Issues (Admin/RM) ───────────────────────────────────── */}
      {tab === 2 && isAdmin && (
        <Box>
          <Stack direction="row" spacing={2} mb={2} flexWrap="wrap" alignItems="center">
            <TextField select label="Durum" size="small" value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)} sx={{ minWidth: 160 }}>
              <MenuItem value="">Tümü</MenuItem>
              {(Object.keys(STATUS_META) as IssueStatus[]).map(s => (
                <MenuItem key={s} value={s}>{STATUS_META[s].label}</MenuItem>
              ))}
            </TextField>

            <ToggleButtonGroup size="small" value={viewMode} exclusive
              onChange={(_, v) => v && setViewMode(v)}>
              <ToggleButton value="list"><ListIcon fontSize="small" /></ToggleButton>
              <ToggleButton value="board"><KanbanIcon fontSize="small" /></ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {loadingAll && <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>}

          {!loadingAll && allIssues.length === 0 && (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">Filtrelerle eşleşen sorun bulunamadı.</Typography>
            </Paper>
          )}

          {!loadingAll && allIssues.length > 0 && viewMode === 'board' && (
            <KanbanBoard issues={allIssues} onSelectIssue={setDrawerIssue} />
          )}

          {!loadingAll && allIssues.length > 0 && viewMode === 'list' && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Başlık</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Kategori</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Öncelik</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Durum</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Müşteri</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Tarih</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Yorumlar</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allIssues.map(issue => (
                    <TableRow key={issue.id} hover sx={{ cursor: 'pointer' }}
                      onClick={() => setDrawerIssue(issue)}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{issue.title}</Typography>
                        {issue.module && <Typography variant="caption" color="text.secondary">{issue.module}</Typography>}
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{issue.category ?? '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={issue.priority} color={priorityColor(issue.priority)} />
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={STATUS_META[issue.status].label} color={STATUS_META[issue.status].color} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{issue.customer?.name ?? '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{fmtDate(issue.createdAt)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <CommentIcon fontSize="small" color="action" sx={{ fontSize: 14 }} />
                          <Typography variant="caption">{issue._count?.comments ?? 0}</Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* Detail Drawer */}
      <IssueDrawer issue={drawerIssue} onClose={() => setDrawerIssue(null)} />

      <Snackbar open={!!snackbar} autoHideDuration={5000}
        onClose={() => setSnackbar(null)} message={snackbar} />
    </Box>
  );
}
