// ═══════════════════════════════════════════════
// LoadingSkeleton — Generic loading placeholder
// ═══════════════════════════════════════════════

import { Skeleton, Box, type SxProps, type Theme } from '@mui/material';

export interface LoadingSkeletonProps {
  /** Predefined variant */
  variant?: 'table' | 'card' | 'form' | 'text';
  /** Number of rows/items to show */
  rows?: number;
  /** Custom sx */
  sx?: SxProps<Theme>;
}

export function LoadingSkeleton({ variant = 'table', rows = 5, sx }: LoadingSkeletonProps) {
  if (variant === 'card') {
    return (
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', ...sx }}>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} variant="rounded" width={240} height={120} />
        ))}
      </Box>
    );
  }

  if (variant === 'form') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, ...sx }}>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={56} />
        ))}
        <Skeleton variant="rounded" width={120} height={36} sx={{ alignSelf: 'flex-end' }} />
      </Box>
    );
  }

  if (variant === 'text') {
    return (
      <Box sx={{ ...sx }}>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} variant="text" sx={{ fontSize: '1rem' }} />
        ))}
      </Box>
    );
  }

  // table (default)
  return (
    <Box sx={{ ...sx }}>
      <Skeleton variant="rounded" height={48} sx={{ mb: 1 }} />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={40} sx={{ mb: 0.5 }} />
      ))}
    </Box>
  );
}
