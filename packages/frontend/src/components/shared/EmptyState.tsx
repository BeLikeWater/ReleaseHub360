// ═══════════════════════════════════════════════
// EmptyState — "No data" placeholder
// ═══════════════════════════════════════════════

import type { ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';

export interface EmptyStateProps {
  /** Icon to display (defaults to InboxIcon) */
  icon?: ReactNode;
  /** Primary message */
  title?: string;
  /** Secondary description */
  description?: string;
  /** Action button label */
  actionLabel?: string;
  /** Action button click handler */
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title = 'Kayıt bulunamadı',
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        px: 3,
        textAlign: 'center',
      }}
    >
      <Box sx={{ color: 'text.secondary', mb: 2 }}>
        {icon ?? <InboxIcon sx={{ fontSize: 64 }} />}
      </Box>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 400 }}>
          {description}
        </Typography>
      )}
      {actionLabel && onAction && (
        <Button variant="contained" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
