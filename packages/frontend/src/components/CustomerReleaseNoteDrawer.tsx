/**
 * CustomerReleaseNoteDrawer
 *
 * Sağdan açılan Drawer — seçilen versiyonun release notlarını gösterir.
 * Müşteri erişim kontrolü backend'de yapılır (/api/release-notes/by-version/:id).
 */
import {
  Drawer, Box, Typography, IconButton, Chip, Stack, Divider,
  CircularProgress, Alert, Paper,
} from '@mui/material';
import { Close as CloseIcon, Article as ArticleIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import api from '@/api/client';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReleaseNote {
  id: string;
  productVersionId: string;
  category: string;
  title: string;
  description: string | null;
  isBreaking: boolean;
  sortOrder: number;
  workitemId: string | null;
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { label: string; color: 'error' | 'warning' | 'success' | 'info' | 'default' | 'primary' }> = {
  FEATURE:     { label: '✨ Yeni Özellik',    color: 'primary' },
  BUG:         { label: '🐛 Bug Fix',         color: 'success' },
  SECURITY:    { label: '🔒 Güvenlik',       color: 'error'   },
  BREAKING:    { label: '⚠️ Breaking Change', color: 'error'   },
  PERFORMANCE: { label: '⚡ Performans',     color: 'info'    },
  DEPRECATED:  { label: '🗑️ Kullanım Dışı',  color: 'warning' },
};

const CATEGORY_ORDER = ['BREAKING', 'SECURITY', 'FEATURE', 'BUG', 'PERFORMANCE', 'DEPRECATED'];

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  versionId: string | null;
  versionName: string;
  productName?: string;
}

export default function CustomerReleaseNoteDrawer({ open, onClose, versionId, versionName, productName }: Props) {
  const { data, isLoading, isError } = useQuery<{ data: ReleaseNote[] }>({
    queryKey: ['release-notes-by-version', versionId],
    queryFn: () => api.get(`/release-notes/by-version/${versionId}`).then((r) => r.data),
    enabled: open && !!versionId,
  });

  const notes = data?.data ?? [];

  // Group by category in defined order
  const grouped: Record<string, ReleaseNote[]> = {};
  for (const cat of CATEGORY_ORDER) {
    const catNotes = notes.filter((n) => n.category === cat);
    if (catNotes.length > 0) grouped[cat] = catNotes;
  }
  // fallback: unknown categories
  const unknownCats = [...new Set(notes.filter(n => !CATEGORY_ORDER.includes(n.category)).map(n => n.category))];
  for (const cat of unknownCats) {
    grouped[cat] = notes.filter((n) => n.category === cat);
  }

  const hasBreaking = notes.some((n) => n.isBreaking);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, display: 'flex', flexDirection: 'column' } }}
    >
      {/* Header */}
      <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <ArticleIcon color="primary" sx={{ mt: 0.25 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" fontWeight={700}>
            Release Notları
          </Typography>
          <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
            {productName && (
              <Typography variant="body2" color="text.secondary">{productName}</Typography>
            )}
            <Typography variant="body2" fontFamily="monospace" fontWeight={600} color="primary">
              {versionName}
            </Typography>
            {hasBreaking && (
              <Chip label="Breaking Change" size="small" color="error" sx={{ fontSize: 10 }} />
            )}
          </Stack>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
        {isLoading && (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={28} />
          </Box>
        )}
        {isError && (
          <Alert severity="error">Release notları yüklenemedi.</Alert>
        )}
        {!isLoading && !isError && notes.length === 0 && (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              <strong>{versionName}</strong> versiyonu için henüz release notu yayınlanmamıştır.
            </Typography>
          </Paper>
        )}
        {!isLoading && !isError && notes.length > 0 && (
          <Stack spacing={2.5}>
            {hasBreaking && (
              <Alert severity="warning" icon="⚠️" sx={{ fontWeight: 600 }}>
                Bu versiyonda kırıcı değişiklikler (Breaking Change) bulunmaktadır. Geçiş öncesinde entegrasyonlarınızı gözden geçirin.
              </Alert>
            )}
            {Object.entries(grouped).map(([category, categoryNotes]) => {
              const meta = CATEGORY_META[category] ?? { label: category, color: 'default' as const };
              return (
                <Box key={category}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <Chip label={meta.label} size="small" color={meta.color} />
                    <Typography variant="caption" color="text.secondary">
                      {categoryNotes.length} madde
                    </Typography>
                  </Stack>
                  <Stack spacing={0.75}>
                    {categoryNotes.map((note) => (
                      <Paper
                        key={note.id}
                        variant="outlined"
                        sx={{
                          px: 1.5,
                          py: 1,
                          borderLeft: note.isBreaking ? '3px solid' : '1px solid',
                          borderLeftColor: note.isBreaking ? 'error.main' : 'divider',
                        }}
                      >
                        <Stack direction="row" spacing={0.5} alignItems="flex-start">
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" fontWeight={600}>
                              {note.title}
                            </Typography>
                            {note.description && (
                              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block', whiteSpace: 'pre-line' }}>
                                {note.description}
                              </Typography>
                            )}
                          </Box>
                          <Stack direction="row" spacing={0.5} flexShrink={0}>
                            {note.isBreaking && (
                              <Chip label="Breaking" size="small" color="error" sx={{ fontSize: 10, height: 18 }} />
                            )}
                            {note.workitemId && (
                              <Chip
                                label={`#${note.workitemId}`}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: 10, height: 18 }}
                              />
                            )}
                          </Stack>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                  <Divider sx={{ mt: 2 }} />
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>

      {/* Footer */}
      {notes.length > 0 && (
        <Box sx={{ px: 2.5, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">
            Toplam {notes.length} release notu · {notes.filter((n) => n.isBreaking).length} breaking change
          </Typography>
        </Box>
      )}
    </Drawer>
  );
}
