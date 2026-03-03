// ═══════════════════════════════════════════════
// StatusChip — Color-coded status indicator
// ═══════════════════════════════════════════════

import Chip from '@mui/material/Chip';
import type { ChipProps } from '@mui/material/Chip';

type StatusColor = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';

/** Default status→color mapping. Override via colorMap prop. */
const DEFAULT_COLOR_MAP: Record<string, StatusColor> = {
  // Version phases
  DEVELOPMENT: 'info',
  MASTER_START: 'info',
  TEST: 'warning',
  PRE_PRODUCTION: 'warning',
  PRODUCTION: 'success',

  // Hotfix / request statuses
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  RESOLVED: 'success',
  CANCELLED: 'default',

  // Generic
  ACTIVE: 'success',
  INACTIVE: 'default',
  OPEN: 'info',
  CLOSED: 'default',
  CRITICAL: 'error',
  HIGH: 'error',
  MEDIUM: 'warning',
  LOW: 'info',

  // Workflow
  SUCCESS: 'success',
  FAILED: 'error',
  RUNNING: 'info',
};

export interface StatusChipProps extends Omit<ChipProps, 'color' | 'label'> {
  /** Status value (e.g., 'PRODUCTION', 'PENDING') */
  status: string;
  /** Custom label (defaults to status key) */
  label?: string;
  /** Custom color map overrides */
  colorMap?: Record<string, StatusColor>;
}

export function StatusChip({ status, label, colorMap, ...chipProps }: StatusChipProps) {
  const merged = { ...DEFAULT_COLOR_MAP, ...colorMap };
  const color = merged[status.toUpperCase()] ?? 'default';
  const displayLabel = label ?? status.replace(/_/g, ' ');

  return (
    <Chip
      label={displayLabel}
      color={color}
      size="small"
      variant="outlined"
      {...chipProps}
    />
  );
}
