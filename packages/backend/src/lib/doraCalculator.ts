/**
 * DORA Metrics Calculator (H1-01)
 *
 * Computes DORA metrics for a given period and writes to MetricSnapshot:
 *   - DEPLOY_FREQ     : releases per week
 *   - LEAD_TIME       : average days from devStartDate → actualReleaseDate (hours stored)
 *   - CHANGE_FAIL_RATE: hotfix releases / total releases (0-1 ratio)
 *   - MTTR            : average hours from HotfixRequest.createdAt → version.actualReleaseDate
 *
 * Period format: "YYYY-WW" (ISO week) | "YYYY-MM" (month) | "YYYY-QN" (quarter)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type CalculatorOptions = {
  /** ISO week label, e.g. "2026-W03" or just compute for the last N weeks */
  periodLabel?: string;
  /** Number of weeks to look back if periodLabel is omitted (default: 4) */
  weeksBack?: number;
  /** Filter by productId. Undefined = compute for all products. */
  productIds?: string[];
};

function isoWeekLabel(date: Date): string {
  // ISO 8601 week: week starts Monday
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function weekStart(label: string): Date {
  const [yearStr, weekStr] = label.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);
  const jan4 = new Date(Date.UTC(year, 0, 4)); // ISO: Jan 4 always in week 1
  const dayNum = jan4.getUTCDay() || 7;
  const monday = new Date(jan4.getTime());
  monday.setUTCDate(jan4.getUTCDate() - dayNum + 1 + (week - 1) * 7);
  return monday;
}

async function upsertSnapshot(
  period: string,
  periodType: string,
  productId: string | null,
  metricType: string,
  value: number,
  metadata?: Record<string, unknown>,
) {
  await prisma.metricSnapshot.create({
    data: {
      period,
      periodType,
      productId: productId ?? undefined,
      metricType,
      value,
      metadata: metadata as never,
    },
  });
}

export async function calculateDora(opts: CalculatorOptions = {}): Promise<void> {
  const weeksBack = opts.weeksBack ?? 4;
  const now = new Date();

  // Build list of week labels to compute
  const weekLabels: string[] = [];
  if (opts.periodLabel) {
    weekLabels.push(opts.periodLabel);
  } else {
    for (let i = 0; i < weeksBack; i++) {
      const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      weekLabels.push(isoWeekLabel(d));
    }
  }

  // Fetch products to compute for
  const products = await prisma.product.findMany({
    where: opts.productIds ? { id: { in: opts.productIds } } : undefined,
    select: { id: true, name: true },
  });

  for (const week of weekLabels) {
    const wStart = weekStart(week);
    const wEnd = new Date(wStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    // All releases in this week
    const allReleased = await prisma.productVersion.findMany({
      where: {
        phase: 'RELEASED',
        actualReleaseDate: { gte: wStart, lt: wEnd },
      },
      select: {
        id: true,
        productId: true,
        isHotfix: true,
        devStartDate: true,
        actualReleaseDate: true,
      },
    });

    // Hotfix requests resolved in this week
    const hotfixRequests = await prisma.hotfixRequest.findMany({
      where: {
        status: 'APPROVED',
        updatedAt: { gte: wStart, lt: wEnd },
      },
      include: {
        productVersion: { select: { actualReleaseDate: true, productId: true } },
      },
    });

    for (const product of products) {
      const released = allReleased.filter(v => v.productId === product.id);
      const total = released.length;

      // H1-01a: DEPLOY_FREQ — releases per week
      await upsertSnapshot(week, 'WEEK', product.id, 'DEPLOY_FREQ', total, { productName: product.name });

      // H1-01b: LEAD_TIME — avg days from devStartDate → actualReleaseDate
      const ltValues = released
        .filter(v => v.devStartDate && v.actualReleaseDate)
        .map(v => (v.actualReleaseDate!.getTime() - v.devStartDate!.getTime()) / (1000 * 3600));
      const avgLtHours = ltValues.length > 0 ? ltValues.reduce((a, b) => a + b, 0) / ltValues.length : 0;
      await upsertSnapshot(week, 'WEEK', product.id, 'LEAD_TIME', avgLtHours, { unit: 'hours', sampleSize: ltValues.length });

      // H1-01c: CHANGE_FAIL_RATE — hotfix / total
      const hotfixCount = released.filter(v => v.isHotfix).length;
      const cfr = total > 0 ? hotfixCount / total : 0;
      await upsertSnapshot(week, 'WEEK', product.id, 'CHANGE_FAIL_RATE', cfr, { hotfixCount, total });

      // H1-01d: MTTR — avg hours from HotfixRequest.createdAt → version.actualReleaseDate
      const mttrValues = hotfixRequests
        .filter(hr => hr.productVersion?.productId === product.id && hr.productVersion?.actualReleaseDate)
        .map(hr => (hr.productVersion!.actualReleaseDate!.getTime() - hr.createdAt.getTime()) / (1000 * 3600));
      const avgMttr = mttrValues.length > 0 ? mttrValues.reduce((a, b) => a + b, 0) / mttrValues.length : 0;
      await upsertSnapshot(week, 'WEEK', product.id, 'MTTR', avgMttr, { unit: 'hours', sampleSize: mttrValues.length });
    }

    console.log(`[DORA] Computed week=${week} for ${products.length} product(s)`);
  }
}
