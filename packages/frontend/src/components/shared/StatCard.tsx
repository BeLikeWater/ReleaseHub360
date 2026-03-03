// ═══════════════════════════════════════════════
// StatCard — Dashboard metric card
// ═══════════════════════════════════════════════

import type { ReactNode } from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

export interface StatCardProps {
  /** Card title */
  title: string;
  /** Main value */
  value: string | number;
  /** Icon displayed top-right */
  icon?: ReactNode;
  /** Trend percentage (positive = up, negative = down) */
  trend?: number;
  /** Trend comparison label (e.g., "geçen haftaya göre") */
  trendLabel?: string;
  /** Card click handler */
  onClick?: () => void;
  /** Background color (subtle) */
  bgColor?: string;
}

export function StatCard({
  title,
  value,
  icon,
  trend,
  trendLabel,
  onClick,
  bgColor,
}: StatCardProps) {
  const trendPositive = trend != null && trend >= 0;

  return (
    <Card
      variant="outlined"
      onClick={onClick}
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        bgcolor: bgColor,
        '&:hover': onClick ? { boxShadow: 2 } : undefined,
        height: '100%',
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          {icon && (
            <Box sx={{ color: 'primary.main', opacity: 0.7 }}>{icon}</Box>
          )}
        </Box>

        <Typography variant="h4" sx={{ fontWeight: 700, my: 1 }}>
          {value}
        </Typography>

        {trend != null && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {trendPositive ? (
              <TrendingUpIcon fontSize="small" color="success" />
            ) : (
              <TrendingDownIcon fontSize="small" color="error" />
            )}
            <Typography
              variant="caption"
              color={trendPositive ? 'success.main' : 'error.main'}
              fontWeight={600}
            >
              {trendPositive ? '+' : ''}{trend}%
            </Typography>
            {trendLabel && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                {trendLabel}
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
