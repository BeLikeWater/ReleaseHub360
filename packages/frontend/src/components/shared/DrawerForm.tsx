// ═══════════════════════════════════════════════
// DrawerForm — Generic right-side drawer with header + scrolling content
// ═══════════════════════════════════════════════

import type { ReactNode, FormEvent } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  Button,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export interface DrawerFormProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Form content (fields etc.) */
  children: ReactNode;
  /** Submit handler — called on form submit */
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
  /** Submit button label */
  submitLabel?: string;
  /** Submit in-progress */
  loading?: boolean;
  /** Drawer width */
  width?: number | string;
  /** Extra actions beside submit */
  actions?: ReactNode;
}

export function DrawerForm({
  open,
  onClose,
  title,
  children,
  onSubmit,
  submitLabel = 'Kaydet',
  loading = false,
  width = 480,
  actions,
}: DrawerFormProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width, maxWidth: '100vw' } }}
    >
      <Box
        component={onSubmit ? 'form' : 'div'}
        onSubmit={onSubmit}
        sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', p: 2, gap: 1 }}>
          <Typography variant="h6" sx={{ flex: 1 }}>
            {title}
          </Typography>
          <IconButton onClick={onClose} size="small" edge="end">
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider />

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {children}
        </Box>

        {/* Footer */}
        <Divider />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2, justifyContent: 'flex-end' }}>
          {actions}
          <Button onClick={onClose} disabled={loading}>
            İptal
          </Button>
          {onSubmit && (
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={18} /> : undefined}
            >
              {submitLabel}
            </Button>
          )}
        </Box>
      </Box>
    </Drawer>
  );
}
