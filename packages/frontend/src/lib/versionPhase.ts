// Shared version phase utilities — kullanılan yerler:
// ReleaseCalendarPage.tsx, ReleaseHealthCheckPage.tsx, ReleasesPage.tsx

export type VersionForPhase = {
  phase: string;
  releaseDate?: string | null;
  targetDate?: string | null;
  preProdDate?: string | null;
  testStartDate?: string | null;
};

// ── Stored phase constants ────────────────────────────────────────────────────
export const PHASE_ORDER = [
  'PLANNED', 'DEVELOPMENT', 'RC', 'STAGING', 'PRODUCTION',
] as const;

export type StoredPhase = typeof PHASE_ORDER[number] | 'ARCHIVED';

export const NEXT_PHASE: Record<string, string | null> = {
  PLANNED:     'DEVELOPMENT',
  DEVELOPMENT: 'RC',
  RC:          'STAGING',
  STAGING:     'PRODUCTION',
  PRODUCTION:  null,
  ARCHIVED:    null,
};

// ── Phase display metadata ────────────────────────────────────────────────────
export const PHASE_META: Record<string, { label: string; color: 'default' | 'info' | 'warning' | 'success' | 'error' }> = {
  // Stored DB phase values
  PLANNED:     { label: 'Henüz Başlanmadı', color: 'default'  },
  DEVELOPMENT: { label: 'Geliştirme',       color: 'info'     },
  RC:          { label: 'Test',             color: 'warning'  },
  STAGING:     { label: 'Test',             color: 'warning'  },
  PRODUCTION:  { label: 'Yayında',          color: 'success'  },
  ARCHIVED:    { label: 'Arşiv',            color: 'default'  },
  // Legacy computed keys (backward compat for date-based computation)
  DEV:         { label: 'Geliştirme',       color: 'info'     },
  TEST:        { label: 'Test',             color: 'warning'  },
  PREP:        { label: 'Test',             color: 'warning'  },
  WAITING:     { label: 'Yayın Bekliyor',   color: 'error'    },
  PROD:        { label: 'Yayında',          color: 'success'  },
};

/**
 * Returns the stored phase string directly (PLANNED, DEVELOPMENT, RC, STAGING,
 * PRODUCTION, ARCHIVED). Falls back to date-based computation for legacy data.
 */
export function computePhase(v: VersionForPhase): string {
  const STORED_PHASES: string[] = [...PHASE_ORDER, 'ARCHIVED'];
  if (STORED_PHASES.includes(v.phase)) {
    return v.phase;
  }
  // Legacy date-based fallback
  if (v.releaseDate || v.phase === 'PRODUCTION') return 'PRODUCTION';
  const now = new Date();
  const tgt  = v.targetDate  ? new Date(v.targetDate)  : null;
  const prep = v.preProdDate  ? new Date(v.preProdDate)  : null;
  const test = v.testStartDate ? new Date(v.testStartDate) : null;
  if (tgt  && now >= tgt)  return 'STAGING';
  if (prep && now >= prep) return 'RC';
  if (test && now >= test) return 'DEVELOPMENT';
  return 'PLANNED';
}

/** Görünen etiket döndürür */
export function phaseLabel(v: VersionForPhase): string {
  return PHASE_META[computePhase(v)]?.label ?? computePhase(v);
}

