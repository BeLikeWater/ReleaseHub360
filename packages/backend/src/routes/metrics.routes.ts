import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// ── GET /api/metrics/snapshots ────────────────────────────────────────────────
router.get('/snapshots', async (req: Request, res: Response) => {
  try {
    const { productId, period, periodType } = req.query;
    const snapshots = await prisma.metricSnapshot.findMany({
      where: {
        ...(productId ? { productId: String(productId) } : {}),
        ...(period ? { period: String(period) } : {}),
        ...(periodType ? { periodType: String(periodType) } : {}),
      },
      include: {
        product: { select: { id: true, name: true } },
      },
      orderBy: { period: 'desc' },
      take: 24,
    });
    res.json({ data: snapshots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Metrikler alınamadı' });
  }
});

// ── GET /api/metrics/dora ──────────────────────────────────────────────────────
// Computes DORA metrics from DB data (deployments = PRODUCTION versions, failures = P0 todos)
router.get('/dora', async (req: Request, res: Response) => {
  try {
    const { productId, months = '3' } = req.query;
    const monthsBack = parseInt(String(months), 10) || 3;
    const since = new Date();
    since.setMonth(since.getMonth() - monthsBack);

    const pvWhere: Record<string, unknown> = {
      phase: 'PRODUCTION',
      releaseDate: { gte: since },
    };
    if (productId) pvWhere.productId = String(productId);

    const [productionVersions, allTodos, allIssues] = await Promise.all([
      prisma.productVersion.findMany({
        where: pvWhere,
        select: { id: true, releaseDate: true, productId: true, createdAt: true },
        orderBy: { releaseDate: 'asc' },
      }),
      prisma.releaseTodo.findMany({
        where: {
          productVersion: { phase: 'PRODUCTION', releaseDate: { gte: since } },
          priority: 'P0',
        },
        select: { isCompleted: true, productVersionId: true },
      }),
      prisma.transitionIssue.findMany({
        where: {
          status: 'RESOLVED',
          resolvedAt: { gte: since },
        },
        select: { createdAt: true, resolvedAt: true },
      }),
    ]);

    const periodDays = monthsBack * 30;

    // Deployment Frequency (deploys/day)
    const deployFreq = productionVersions.length / periodDays;

    // Lead Time (avg days from version created to releaseDate)
    const leadTimes = productionVersions
      .filter(v => v.releaseDate)
      .map(v => (v.releaseDate!.getTime() - v.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const leadTimeDays = leadTimes.length > 0
      ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length
      : 0;

    // Change Failure Rate (versions that had P0 todos incomplete / total)
    const failedVersionIds = new Set(allTodos.filter(t => !t.isCompleted).map(t => t.productVersionId));
    const changeFailRate = productionVersions.length > 0
      ? failedVersionIds.size / productionVersions.length
      : 0;

    // MTTR (avg hours to resolve issues)
    const resolveTimes = allIssues
      .filter(i => i.resolvedAt)
      .map(i => (i.resolvedAt!.getTime() - i.createdAt.getTime()) / (1000 * 60 * 60));
    const mttrHours = resolveTimes.length > 0
      ? resolveTimes.reduce((a, b) => a + b, 0) / resolveTimes.length
      : 0;

    // DORA performance band
    function doraRating(metric: string, value: number): 'Elite' | 'High' | 'Medium' | 'Low' {
      if (metric === 'deployFreq') {
        if (value >= 1) return 'Elite';
        if (value >= 1 / 7) return 'High';
        if (value >= 1 / 30) return 'Medium';
        return 'Low';
      }
      if (metric === 'leadTime') {
        if (value <= 1) return 'Elite';
        if (value <= 7) return 'High';
        if (value <= 30) return 'Medium';
        return 'Low';
      }
      if (metric === 'cfr') {
        if (value <= 0.05) return 'Elite';
        if (value <= 0.1) return 'High';
        if (value <= 0.15) return 'Medium';
        return 'Low';
      }
      if (metric === 'mttr') {
        if (value <= 1) return 'Elite';
        if (value <= 24) return 'High';
        if (value <= 168) return 'Medium';
        return 'Low';
      }
      return 'Low';
    }

    res.json({
      data: {
        period: { months: monthsBack, since: since.toISOString() },
        deployFrequency: {
          value: Math.round(deployFreq * 100) / 100,
          unit: 'deploys/day',
          rating: doraRating('deployFreq', deployFreq),
          total: productionVersions.length,
        },
        leadTime: {
          value: Math.round(leadTimeDays * 10) / 10,
          unit: 'days',
          rating: doraRating('leadTime', leadTimeDays),
        },
        changeFailureRate: {
          value: Math.round(changeFailRate * 1000) / 10,
          unit: '%',
          rating: doraRating('cfr', changeFailRate),
          failedReleases: failedVersionIds.size,
          totalReleases: productionVersions.length,
        },
        mttr: {
          value: Math.round(mttrHours * 10) / 10,
          unit: 'hours',
          rating: doraRating('mttr', mttrHours),
          resolvedIssues: allIssues.length,
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DORA metrikleri hesaplanamadı' });
  }
});

// ── GET /api/metrics/summary ───────────────────────────────────────────────────
// Operational summary for the home dashboard
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalProducts,
      totalCustomers,
      activeVersions,
      releasesThisMonth,
      openIssues,
      criticalIssues,
      openP0Todos,
      pendingCustomerUpdates,
    ] = await Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      prisma.customer.count({ where: { isActive: true } }),
      prisma.productVersion.count({ where: { phase: { notIn: ['PRODUCTION', 'ARCHIVED'] } } }),
      prisma.productVersion.count({
        where: { phase: 'PRODUCTION', releaseDate: { gte: monthStart } },
      }),
      prisma.transitionIssue.count({ where: { status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
      prisma.transitionIssue.count({
        where: { status: { notIn: ['RESOLVED', 'CLOSED'] }, priority: 'CRITICAL' },
      }),
      prisma.releaseTodo.count({
        where: { isCompleted: false, priority: 'P0' },
      }),
      // Customers not on latest production version for any product
      prisma.customerProductMapping.count({
        where: {
          isActive: true,
          productVersion: {
            phase: { notIn: ['PRODUCTION'] },
          },
        },
      }),
    ]);

    // Active releases by phase
    const phaseBreakdown = await prisma.productVersion.groupBy({
      by: ['phase'],
      where: { phase: { notIn: ['PRODUCTION', 'ARCHIVED'] } },
      _count: true,
    });

    const phaseMap: Record<string, number> = {};
    for (const p of phaseBreakdown) phaseMap[p.phase] = p._count;

    res.json({
      data: {
        products: { total: totalProducts },
        customers: { total: totalCustomers, pendingUpdates: pendingCustomerUpdates },
        versions: {
          active: activeVersions,
          releasedThisMonth: releasesThisMonth,
          byPhase: phaseMap,
        },
        issues: { open: openIssues, critical: criticalIssues },
        todos: { openP0: openP0Todos },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Özet metrikleri alınamadı' });
  }
});

// ── GET /api/metrics/awareness ─────────────────────────────────────────────────
// How many customers are on latest versions
router.get('/awareness', async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        versions: {
          where: { phase: 'PRODUCTION' },
          orderBy: { releaseDate: 'desc' },
          take: 1,
          select: { id: true, version: true },
        },
        _count: {
          select: { versions: true },
        },
      },
    });

    const rows = await Promise.all(
      products.map(async (p) => {
        const latestVersionId = p.versions[0]?.id;
        if (!latestVersionId) return null;

        const [onLatest, total] = await Promise.all([
          prisma.customerProductMapping.count({
            where: { productVersionId: latestVersionId, isActive: true },
          }),
          prisma.customerProductMapping.count({
            where: { productVersion: { productId: p.id }, isActive: true },
          }),
        ]);

        return {
          productId: p.id,
          productName: p.name,
          latestVersion: p.versions[0]?.version ?? null,
          customersOnLatest: onLatest,
          totalCustomers: total,
          awarenessScore: total > 0 ? Math.round((onLatest / total) * 100) : 100,
        };
      })
    );

    const filtered = rows.filter(Boolean);
    const avgAwareness =
      filtered.length > 0
        ? Math.round(filtered.reduce((a, r) => a + (r?.awarenessScore ?? 0), 0) / filtered.length)
        : 100;

    res.json({
      data: {
        overallAwarenessScore: avgAwareness,
        byProduct: filtered,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Farkındalık skorları alınamadı' });
  }
});

// ── GET /api/metrics/awareness-scores ──────────────────────────────────────────
// Returns 3 awareness scores: Deployment Diversity, Config Drift, Codebase Divergence
router.get('/awareness-scores', async (_req: Request, res: Response) => {
  try {
    // ─── 1. Deployment Diversity ─────────────────────────────────────────
    // Unique combinations of artifactType × deploymentModel × hostingType
    const allCpms = await prisma.customerProductMapping.findMany({
      where: { isActive: true },
      select: { artifactType: true, deploymentModel: true, hostingType: true },
    });

    const combos = new Set(
      allCpms.map(c => `${c.artifactType ?? 'NULL'}|${c.deploymentModel ?? 'NULL'}|${c.hostingType ?? 'NULL'}`)
    );
    // Max expected = 6 (see design doc §11.5.3)
    const MAX_DIVERSITY = 6;
    const diversityScore = allCpms.length > 0
      ? Math.round(Math.max(0, 100 - (combos.size / MAX_DIVERSITY * 100)))
      : 100;

    // Distribution breakdown
    const distribution: Record<string, number> = {};
    for (const c of allCpms) {
      const key = [c.artifactType ?? '?', c.deploymentModel ?? '?', c.hostingType ?? '?'].join(' + ');
      distribution[key] = (distribution[key] ?? 0) + 1;
    }

    // ─── 2. Config Drift ────────────────────────────────────────────────
    // Analyze helmValuesOverrides JSON field depth/key-count
    const helmCpms = await prisma.customerProductMapping.findMany({
      where: { isActive: true, helmValuesOverrides: { not: undefined } },
      select: {
        id: true,
        helmValuesOverrides: true,
        customerId: true,
        productId: true,
      },
    });

    // fetch customer/product names for detail labels
    const cpmCustomerIds = [...new Set(helmCpms.map(c => c.customerId))];
    const cpmProductIds = [...new Set(helmCpms.map(c => c.productId).filter(Boolean))] as string[];
    const [helmCustomers, helmProducts] = await Promise.all([
      prisma.customer.findMany({ where: { id: { in: cpmCustomerIds } }, select: { id: true, name: true } }),
      prisma.product.findMany({ where: { id: { in: cpmProductIds } }, select: { id: true, name: true } }),
    ]);
    const custNameMap = Object.fromEntries(helmCustomers.map(c => [c.id, c.name]));
    const prodNameMap = Object.fromEntries(helmProducts.map(p => [p.id, p.name]));

    function countKeys(obj: unknown, depth = 0): number {
      if (typeof obj !== 'object' || obj === null || depth > 10) return 0;
      let count = 0;
      for (const val of Object.values(obj as Record<string, unknown>)) {
        count += 1;
        if (typeof val === 'object' && val !== null) count += countKeys(val, depth + 1);
      }
      return count;
    }

    const MAX_EXPECTED_KEYS = 50; // baseline for "too much config drift"
    const overrideCounts = helmCpms.map(c => ({
      customer: custNameMap[c.customerId] ?? '?',
      product: c.productId ? (prodNameMap[c.productId] ?? '?') : '?',
      keyCount: countKeys(c.helmValuesOverrides),
    }));
    const avgOverrides = overrideCounts.length > 0
      ? overrideCounts.reduce((a, c) => a + c.keyCount, 0) / overrideCounts.length
      : 0;
    const configDriftScore = Math.round(Math.max(0, 100 - (avgOverrides / MAX_EXPECTED_KEYS * 100)));

    // ─── 3. Codebase Divergence ─────────────────────────────────────────
    // From SyncHistory: last sync date age
    const branches = await prisma.customerBranch.findMany({
      where: { isActive: true },
      include: {
        customer: { select: { name: true } },
        syncHistory: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true, status: true },
        },
      },
    });

    const now = Date.now();
    const branchDetails = branches.map(b => {
      const lastSync = b.syncHistory[0]?.createdAt;
      const daysSinceSync = lastSync ? Math.floor((now - lastSync.getTime()) / (1000 * 60 * 60 * 24)) : 999;
      return {
        customer: b.customer.name,
        branch: b.branchName,
        daysSinceSync,
        lastSyncStatus: b.syncHistory[0]?.status ?? 'NEVER',
      };
    });

    const avgDaysSinceSync = branchDetails.length > 0
      ? branchDetails.reduce((a, b) => a + b.daysSinceSync, 0) / branchDetails.length
      : 0;
    const MAX_SYNC_AGE = 90; // days before "fully diverged"
    const divergenceScore = branchDetails.length > 0
      ? Math.round(Math.max(0, 100 - (avgDaysSinceSync / MAX_SYNC_AGE * 100)))
      : 100; // no git_sync branches = no divergence problem

    res.json({
      data: {
        deploymentDiversity: {
          score: diversityScore,
          uniqueCombinations: combos.size,
          totalMappings: allCpms.length,
          distribution,
        },
        configDrift: {
          score: configDriftScore,
          avgOverrideKeys: Math.round(avgOverrides * 10) / 10,
          totalWithOverrides: helmCpms.length,
          details: overrideCounts,
        },
        codebaseDivergence: {
          score: divergenceScore,
          avgDaysSinceSync: Math.round(avgDaysSinceSync),
          totalBranches: branchDetails.length,
          details: branchDetails,
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Awareness skorları hesaplanamadı' });
  }
});

export default router;
