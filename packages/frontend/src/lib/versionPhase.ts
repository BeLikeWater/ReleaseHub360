// Shared version phase utilities — kullanılan yerler:
// ReleaseCalendarPage.tsx, ReleaseHealthCheckPage.tsx

export type VersionForPhase = {
  phase: string;
  releaseDate?: string | null;
  targetDate?: string | null;
  preProdDate?: string | null;
  testDate?: string | null;
};

export const PHASE_META: Record<string, { label: string; color: 'default' | 'info' | 'warning' | 'success' | 'error' }> = {
  DEV:      { label: 'Dev',            color: 'info'    },
  TEST:     { label: 'Test',           color: 'warning' },
  PREP:     { label: 'Prep',           color: 'warning' },
  WAITING:  { label: 'Yayın Bekliyor', color: 'error'   },
  PROD:     { label: 'Prod',           color: 'success' },
  ARCHIVED: { label: 'Arşiv',          color: 'default' },
};

/** Tarihe göre aşamayı otomatik hesapla — DB phase'ine değil tarihlere dayanır */
export function computePhase(v: VersionForPhase): string {
  if (v.phase === 'ARCHIVED') return 'ARCHIVED';
  if (v.releaseDate || v.phase === 'PRODUCTION') return 'PROD';
  const now = new Date();
  const tgt  = v.targetDate  ? new Date(v.targetDate)  : null;
  const prep = v.preProdDate ? new Date(v.preProdDate) : null;
  const test = v.testDate    ? new Date(v.testDate)    : null;
  if (tgt  && now >= tgt)  return 'WAITING';
  if (prep && now >= prep) return 'PREP';
  if (test && now >= test) return 'TEST';
  return 'DEV';
}

/** Computed phase'in görünen etiketini döndürür */
export function phaseLabel(v: VersionForPhase): string {
  return PHASE_META[computePhase(v)]?.label ?? computePhase(v);
}
