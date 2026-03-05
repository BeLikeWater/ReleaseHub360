// ═══════════════════════════════════════════════
// EmptyState — "No data" placeholder
// ═══════════════════════════════════════════════

import type { ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';
import BlockIcon from '@mui/icons-material/Block';
import LockClockIcon from '@mui/icons-material/LockClock';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

// ── Predefined message constants ──────────────────────────────────────────────
export const EMPTY_STATE_MESSAGES = {
  NO_PRODUCT_ACCESS: {
    title: 'Ürün erişimi yok',
    description: 'Erişebileceğiniz ürün bulunmuyor. Sistem yöneticinizden ürün erişimi talep edin.',
  },
  NO_PERMISSION: {
    title: 'Yetki gerekli',
    description: 'Bu işlem için yetkiniz yok. Yöneticinizle iletişime geçin.',
  },
  SESSION_EXPIRED: {
    title: 'Oturum sona erdi',
    description: 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.',
  },
  NO_DATA: {
    title: 'Kayıt bulunamadı',
    description: undefined as string | undefined,
  },
} as const;

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

// ── Convenience presets ───────────────────────────────────────────────────────

export function NoProductAccess({ onAction, actionLabel = 'Erişim Talep Et' }: Pick<EmptyStateProps, 'onAction' | 'actionLabel'>) {
  return (
    <EmptyState
      icon={<ShoppingCartIcon sx={{ fontSize: 64 }} />}
      {...EMPTY_STATE_MESSAGES.NO_PRODUCT_ACCESS}
      actionLabel={onAction ? actionLabel : undefined}
      onAction={onAction}
    />
  );
}

export function NoPermission() {
  return (
    <EmptyState
      icon={<BlockIcon sx={{ fontSize: 64 }} />}
      {...EMPTY_STATE_MESSAGES.NO_PERMISSION}
    />
  );
}

export function SessionExpiredState({ onAction }: Pick<EmptyStateProps, 'onAction'>) {
  return (
    <EmptyState
      icon={<LockClockIcon sx={{ fontSize: 64 }} />}
      {...EMPTY_STATE_MESSAGES.SESSION_EXPIRED}
      actionLabel="Giriş Yap"
      onAction={onAction}
    />
  );
}
