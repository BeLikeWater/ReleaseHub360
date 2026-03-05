/**
 * Awareness Score Calculator (H3-01)
 *
 * Computes 3 awareness scores (0-100, higher = healthier):
 *   - codebaseDivergence : GIT_SYNC customers — avg days since last sync
 *   - configDifference   : helmValuesOverrides key-count depth analysis
 *   - deploymentDiversity: unique artifactType × deploymentModel × hostingType combinations
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AwarenessScores {
  codebaseDivergence: number;  // 0-100
  configDifference: number;    // 0-100
  deploymentDiversity: number; // 0-100
  overallHealth: number;       // 0-100 (weighted average)
}

function countKeys(obj: unknown, depth = 0): number {
  if (typeof obj !== 'object' || obj === null || depth > 10) return 0;
  let count = 0;
  for (const val of Object.values(obj as Record<string, unknown>)) {
    count += 1;
    if (typeof val === 'object' && val !== null) count += countKeys(val, depth + 1);
  }
  return count;
}

export async function calculateAwarenessScores(): Promise<AwarenessScores> {
  const now = Date.now();

  // ── 1. Codebase Divergence ─────────────────────────────────────────────────
  const branches = await prisma.customerBranch.findMany({
    where: { isActive: true },
    include: {
      syncHistory: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true },
      },
    },
  });

  const MAX_SYNC_AGE_DAYS = 90;
  const daysSyncValues = branches.map(b => {
    const lastSync = b.syncHistory[0]?.createdAt;
    return lastSync ? (now - lastSync.getTime()) / (1000 * 60 * 60 * 24) : MAX_SYNC_AGE_DAYS;
  });
  const avgDaysSinceSync = daysSyncValues.length > 0
    ? daysSyncValues.reduce((a, b) => a + b, 0) / daysSyncValues.length
    : 0;
  const codebaseDivergence = branches.length > 0
    ? Math.round(Math.max(0, 100 - (avgDaysSinceSync / MAX_SYNC_AGE_DAYS) * 100))
    : 100;

  // ── 2. Config Difference ───────────────────────────────────────────────────
  const helmCpms = await prisma.customerProductMapping.findMany({
    where: { isActive: true },
    select: { helmValuesOverrides: true },
  });

  const MAX_KEYS = 50;
  const keyCounts = helmCpms
    .filter(c => c.helmValuesOverrides)
    .map(c => countKeys(c.helmValuesOverrides));
  const avgKeys = keyCounts.length > 0
    ? keyCounts.reduce((a, b) => a + b, 0) / keyCounts.length
    : 0;
  const configDifference = Math.round(Math.max(0, 100 - (avgKeys / MAX_KEYS) * 100));

  // ── 3. Deployment Diversity ────────────────────────────────────────────────
  const allCpms = await prisma.customerProductMapping.findMany({
    where: { isActive: true },
    select: { artifactType: true, deploymentModel: true, hostingType: true },
  });

  const MAX_DIVERSITY = 6;
  const combos = new Set(
    allCpms.map(c => `${c.artifactType ?? 'NULL'}|${c.deploymentModel ?? 'NULL'}|${c.hostingType ?? 'NULL'}`)
  );
  const deploymentDiversity = allCpms.length > 0
    ? Math.round(Math.max(0, 100 - (combos.size / MAX_DIVERSITY) * 100))
    : 100;

  // ── Overall (weighted: 40% codebase, 35% config, 25% deployment) ──────────
  const overallHealth = Math.round(
    codebaseDivergence * 0.4 + configDifference * 0.35 + deploymentDiversity * 0.25
  );

  return { codebaseDivergence, configDifference, deploymentDiversity, overallHealth };
}
