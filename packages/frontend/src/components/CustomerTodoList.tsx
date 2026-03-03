/**
 * CustomerTodoList
 *
 * Bir versiyon için müşteri taraflı todo tamamlama bileşeni.
 * Checkboxlar ile todo'lar tamamlanabilir / geri alınabilir.
 * Tamamlayan kişi adı ve tarih gösterilir.
 */
import { useState } from 'react';
import {
  Box, Typography, LinearProgress, Checkbox, Stack, Paper,
  Chip, Tooltip, CircularProgress, Alert, TextField, Collapse,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncheckedIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TodoCompletion {
  id: string;
  todoId: string;
  customerId: string;
  versionId: string;
  completed: boolean;
  completedAt: string | null;
  completedBy: string | null;
  notes: string | null;
}

interface TodoWithCompletion {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  timing: string;
  sortOrder: number;
  completion: TodoCompletion | null;
}

interface TodoSummary {
  total: number;
  completed: number;
  p0Incomplete: number;
}

interface TodoResponse {
  data: TodoWithCompletion[];
  summary: TodoSummary;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string | null): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const TIMING_LABELS: Record<string, string> = {
  PRE: 'Geçiş Öncesi',
  DURING: 'Geçiş Anında',
  POST: 'Geçiş Sonrası',
};

const TIMING_ORDER = ['PRE', 'DURING', 'POST'];

const PRIORITY_COLOR: Record<string, 'error' | 'warning' | 'default' | 'primary'> = {
  P0: 'error',
  P1: 'warning',
  P2: 'default',
  P3: 'default',
};

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  customerId: string;
  versionId: string;
  versionName: string;
}

export default function CustomerTodoList({ customerId, versionId, versionName }: Props) {
  const queryClient = useQueryClient();
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery<TodoResponse>({
    queryKey: ['customer-todos', customerId, versionId],
    queryFn: () =>
      api.get('/customer-todo-completions', { params: { customerId, versionId } })
        .then((r) => r.data),
    enabled: !!customerId && !!versionId,
  });

  const toggleMutation = useMutation({
    mutationFn: (payload: { todoId: string; versionId: string; completed: boolean; notes?: string | null }) =>
      api.patch('/customer-todo-completions', { ...payload, customerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-todos', customerId, versionId] });
      queryClient.invalidateQueries({ queryKey: ['customer-dashboard'] });
      setSavingId(null);
    },
    onError: () => setSavingId(null),
  });

  const handleToggle = (todo: TodoWithCompletion) => {
    const newCompleted = !todo.completion?.completed;
    setSavingId(todo.id);
    toggleMutation.mutate({
      todoId: todo.id,
      versionId,
      completed: newCompleted,
      notes: noteInputs[todo.id] ?? todo.completion?.notes ?? null,
    });
  };

  const handleNoteChange = (todoId: string, value: string) => {
    setNoteInputs((prev) => ({ ...prev, [todoId]: value }));
  };

  const handleNoteBlur = (todo: TodoWithCompletion) => {
    const newNote = noteInputs[todo.id];
    if (newNote === undefined) return;
    if (newNote === (todo.completion?.notes ?? '')) return;
    setSavingId(todo.id);
    toggleMutation.mutate({
      todoId: todo.id,
      versionId,
      completed: todo.completion?.completed ?? false,
      notes: newNote || null,
    });
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (isError || !data) {
    return <Alert severity="error">Todo listesi yüklenemedi.</Alert>;
  }

  const { summary } = data;
  const completionPct = summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0;

  // Group by timing
  const grouped: Record<string, TodoWithCompletion[]> = {};
  for (const timing of TIMING_ORDER) {
    grouped[timing] = data.data.filter((t) => t.timing === timing);
  }

  if (summary.total === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          <strong>{versionName}</strong> versiyonu için yapılacak listesi tanımlanmamış.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Progress bar */}
      <Stack direction="row" alignItems="center" spacing={2} mb={2}>
        <LinearProgress
          variant="determinate"
          value={completionPct}
          sx={{ flex: 1, height: 10, borderRadius: 1 }}
          color={summary.p0Incomplete > 0 ? 'error' : completionPct === 100 ? 'success' : 'primary'}
        />
        <Typography variant="body2" fontWeight={600} sx={{ whiteSpace: 'nowrap' }}>
          {summary.completed}/{summary.total} tamamlandı
        </Typography>
        {summary.p0Incomplete > 0 && (
          <Chip
            size="small"
            icon={<StarIcon sx={{ fontSize: 14 }} />}
            label={`${summary.p0Incomplete} P0 eksik`}
            color="error"
          />
        )}
        {completionPct === 100 && (
          <Chip size="small" icon={<CheckCircleIcon />} label="Tamamlandı" color="success" />
        )}
      </Stack>

      {/* Todos grouped by timing */}
      {TIMING_ORDER.map((timing) => {
        const todos = grouped[timing];
        if (!todos || todos.length === 0) return null;
        return (
          <Box key={timing} mb={2.5}>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2 }}
            >
              ── {TIMING_LABELS[timing] ?? timing} ──
            </Typography>
            <Stack spacing={0.5} mt={0.5}>
              {todos.map((todo) => {
                const isCompleted = todo.completion?.completed ?? false;
                const isSaving = savingId === todo.id;
                const currentNote = noteInputs[todo.id] ?? todo.completion?.notes ?? '';

                return (
                  <Paper
                    key={todo.id}
                    variant="outlined"
                    sx={{
                      px: 1.5,
                      py: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0.5,
                      bgcolor: isCompleted ? 'action.selected' : 'background.paper',
                      borderColor: isCompleted ? 'success.light' : 'divider',
                      opacity: isSaving ? 0.7 : 1,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    <Stack direction="row" alignItems="flex-start" spacing={1}>
                      {/* Checkbox */}
                      <Tooltip title={isCompleted ? 'Tamamlandı işaretini kaldır' : 'Tamamlandı işaretle'}>
                        <Checkbox
                          size="small"
                          checked={isCompleted}
                          disabled={isSaving}
                          onChange={() => handleToggle(todo)}
                          icon={<UncheckedIcon fontSize="small" />}
                          checkedIcon={<CheckCircleIcon fontSize="small" color="success" />}
                          sx={{ p: 0 }}
                        />
                      </Tooltip>

                      {/* Title + badges */}
                      <Box sx={{ flex: 1 }}>
                        <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
                          <Chip
                            label={todo.priority}
                            size="small"
                            color={PRIORITY_COLOR[todo.priority] ?? 'default'}
                            sx={{ fontSize: 11, height: 18, fontWeight: 700 }}
                          />
                          <Typography
                            variant="body2"
                            sx={{
                              textDecoration: isCompleted ? 'line-through' : 'none',
                              color: isCompleted ? 'text.secondary' : 'text.primary',
                              fontWeight: isCompleted ? 400 : 600,
                            }}
                          >
                            {todo.title}
                          </Typography>
                          {todo.category && todo.category !== 'TECHNICAL' && (
                            <Chip
                              label={todo.category}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: 10, height: 16 }}
                            />
                          )}
                        </Stack>
                        {todo.description && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                            {todo.description}
                          </Typography>
                        )}
                      </Box>

                      {/* Completion info */}
                      {isCompleted && todo.completion?.completedBy && (
                        <Tooltip title={`${fmtDate(todo.completion.completedAt)}`}>
                          <Typography variant="caption" color="success.main" sx={{ whiteSpace: 'nowrap', pt: 0.25 }}>
                            ✅ {todo.completion.completedBy}
                          </Typography>
                        </Tooltip>
                      )}
                    </Stack>

                    {/* Note input — always visible but small */}
                    <Collapse in={true}>
                      <TextField
                        size="small"
                        placeholder="Not ekle (opsiyonel)..."
                        fullWidth
                        value={currentNote}
                        onChange={(e) => handleNoteChange(todo.id, e.target.value)}
                        onBlur={() => handleNoteBlur(todo)}
                        variant="standard"
                        sx={{ mt: 0.25, '& input': { fontSize: 12 } }}
                        disabled={isSaving}
                      />
                    </Collapse>
                  </Paper>
                );
              })}
            </Stack>
          </Box>
        );
      })}
    </Box>
  );
}
