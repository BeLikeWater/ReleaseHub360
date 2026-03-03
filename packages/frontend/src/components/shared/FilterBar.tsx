// ═══════════════════════════════════════════════
// FilterBar — Reusable horizontal filter strip
// ═══════════════════════════════════════════════

import type { ReactNode } from 'react';
import { Box, Button } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';

export interface FilterBarProps {
  /** Filter controls (select, date, text fields) */
  children: ReactNode;
  /** Called when "Clear Filters" pressed */
  onClear?: () => void;
  /** Show clear button (defaults to true when onClear provided) */
  showClear?: boolean;
}

export function FilterBar({ children, onClear, showClear }: FilterBarProps) {
  const shouldShowClear = showClear ?? !!onClear;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 1.5,
        mb: 2,
      }}
    >
      <FilterListIcon sx={{ color: 'text.secondary', mr: 0.5 }} fontSize="small" />
      {children}
      {shouldShowClear && onClear && (
        <Button
          size="small"
          startIcon={<ClearIcon />}
          onClick={onClear}
          sx={{ ml: 'auto' }}
        >
          Temizle
        </Button>
      )}
    </Box>
  );
}
