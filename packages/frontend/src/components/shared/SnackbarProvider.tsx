// ═══════════════════════════════════════════════
// SnackbarProvider — Renders toasts from toastStore
// Wrap your app root with this component.
// ═══════════════════════════════════════════════

import { Snackbar, Alert } from '@mui/material';
import { useToast } from '@/store/toastStore';

export function SnackbarProvider() {
  const toasts = useToast((s) => s.toasts);
  const removeToast = useToast((s) => s.removeToast);

  // Show only the first toast (stacked approach) — auto-dismiss
  const current = toasts[0];

  if (!current) return null;

  return (
    <Snackbar
      key={current.id}
      open
      autoHideDuration={current.duration ?? 4000}
      onClose={() => removeToast(current.id)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert
        onClose={() => removeToast(current.id)}
        severity={current.severity}
        variant="filled"
        sx={{ width: '100%' }}
      >
        {current.message}
      </Alert>
    </Snackbar>
  );
}
