import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// Tüm metrik endpoint'leri auth gerektirir
router.use(authenticateJWT);

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
          orderBy: [{ releaseDate: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
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

// ── H1-03: GET /api/metrics/dora/trend ────────────────────────────────────────
// Returns weekly DORA metric time series from MetricSnapshot.
// Query: ?months=6&productIds=id1,id2
router.get('/dora/trend', async (req: Request, res: Response) => {
  try {
    const months = Math.min(parseInt(String(req.query.months ?? '6'), 10), 24);
    const productIds = req.query.productIds
      ? String(req.query.productIds).split(',').filter(Boolean)
      : undefined;

    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const snapshots = await prisma.metricSnapshot.findMany({
      where: {
        periodType: 'WEEK',
        metricType: { in: ['DEPLOY_FREQ', 'LEAD_TIME', 'CHANGE_FAIL_RATE', 'MTTR'] },
        computedAt: { gte: since },
        ...(productIds ? { productId: { in: productIds } } : {}),
      },
      orderBy: { period: 'asc' },
      select: { period: true, productId: true, metricType: true, value: true },
    });

    // Group by metricType → periods → aggregate across products
    const grouped: Record<string, Record<string, number[]>> = {};
    for (const s of snapshots) {
      if (!grouped[s.metricType]) grouped[s.metricType] = {};
      if (!grouped[s.metricType][s.period]) grouped[s.metricType][s.period] = [];
      grouped[s.metricType][s.period].push(s.value);
    }

    const periods = [...new Set(snapshots.map(s => s.period))].sort();
    const series: Record<string, { period: string; value: number }[]> = {};
    for (const [metric, periodMap] of Object.entries(grouped)) {
      series[metric] = periods
        .filter(p => periodMap[p])
        .map(p => {
          const vals = periodMap[p];
          const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
          return { period: p, value: Math.round(avg * 100) / 100 };
        });
    }

    // Period-over-period change (last vs previous period)
    const changes: Record<string, number | null> = {};
    for (const [metric, data] of Object.entries(series)) {
      if (data.length >= 2) {
        const last = data[data.length - 1].value;
        const prev = data[data.length - 2].value;
        changes[metric] = prev !== 0 ? Math.round(((last - prev) / prev) * 100) : null;
      } else {
        changes[metric] = null;
      }
    }

    res.json({ data: { periods, series, periodChangePct: changes } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DORA trend verisi alınamadı' });
  }
});

// ── H2-01: GET /api/metrics/release-ops ───────────────────────────────────────
// Cycle Time, MR Throughput, Pipeline Success Rate, Todo Count per Version
router.get('/release-ops', async (req: Request, res: Response) => {
  try {
    const days = parseInt(String(req.query.days ?? '30'), 10);
    const productIds = req.query.productIds
      ? String(req.query.productIds).split(',').filter(Boolean)
      : undefined;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const whereVersion = {
      phase: 'RELEASED',
      actualReleaseDate: { gte: since },
      ...(productIds ? { productId: { in: productIds } } : {}),
    };

    const [releasedVersions, pipelineSnapshots, todos] = await Promise.all([
      prisma.productVersion.findMany({
        where: whereVersion,
        select: { id: true, devStartDate: true, actualReleaseDate: true, productId: true, commitCount: true },
      }),
      prisma.metricSnapshot.findMany({
        where: {
          metricType: 'PIPELINE_SUCCESS_RATE',
          computedAt: { gte: since },
          ...(productIds ? { productId: { in: productIds } } : {}),
        },
        select: { value: true, productId: true },
      }),
      prisma.releaseTodo.findMany({
        where: {
          productVersion: {
            phase: 'RELEASED',
            actualReleaseDate: { gte: since },
            ...(productIds ? { productId: { in: productIds } } : {}),
          },
        },
        select: { isCompleted: true, productVersionId: true },
      }),
    ]);

    // Cycle Time: avg days from devStartDate → actualReleaseDate
    const ctValues = releasedVersions
      .filter(v => v.devStartDate && v.actualReleaseDate)
      .map(v => (v.actualReleaseDate!.getTime() - v.devStartDate!.getTime()) / (1000 * 60 * 60 * 24));
    const avgCycleTimeDays = ctValues.length > 0
      ? Math.round((ctValues.reduce((a, b) => a + b, 0) / ctValues.length) * 10) / 10
      : 0;

    // MR Throughput: avg commits per version
    const commitValues = releasedVersions.filter(v => v.commitCount != null).map(v => v.commitCount!);
    const avgCommitsPerVersion = commitValues.length > 0
      ? Math.round((commitValues.reduce((a, b) => a + b, 0) / commitValues.length) * 10) / 10
      : 0;

    // Pipeline Success Rate: from MetricSnapshot (collected by M-01 later)
    const avgPipelineSuccess = pipelineSnapshots.length > 0
      ? Math.round((pipelineSnapshots.reduce((a, s) => a + s.value, 0) / pipelineSnapshots.length) * 10) / 10
      : null;

    // Avg todos per version
    const versionTodoCounts: Record<string, { total: number; done: number }> = {};
    for (const t of todos) {
      const vId = t.productVersionId;
      if (!vId) continue;
      if (!versionTodoCounts[vId]) versionTodoCounts[vId] = { total: 0, done: 0 };
      versionTodoCounts[vId].total++;
      if (t.isCompleted) versionTodoCounts[vId].done++;
    }
    const todoCountValues = Object.values(versionTodoCounts).map(c => c.total);
    const avgTodosPerVersion = todoCountValues.length > 0
      ? Math.round((todoCountValues.reduce((a, b) => a + b, 0) / todoCountValues.length) * 10) / 10
      : 0;

    res.json({
      data: {
        cycleTimeDays: avgCycleTimeDays,
        mrThroughput: avgCommitsPerVersion,
        pipelineSuccessRate: avgPipelineSuccess,
        avgTodosPerVersion,
        releasedVersionCount: releasedVersions.length,
        periodDays: days,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Release ops metrikleri alınamadı' });
  }
});

// ── H2-02: GET /api/metrics/release-ops/todo-trend ────────────────────────────
// Last N versions: todo count (total + done + completion rate) per version
router.get('/release-ops/todo-trend', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(String(req.query.n ?? '10'), 10), 50);
    const productIds = req.query.productIds
      ? String(req.query.productIds).split(',').filter(Boolean)
      : undefined;

    const versions = await prisma.productVersion.findMany({
      where: {
        phase: 'RELEASED',
        ...(productIds ? { productId: { in: productIds } } : {}),
      },
      orderBy: { actualReleaseDate: 'desc' },
      take: limit,
      select: {
        id: true,
        version: true,
        actualReleaseDate: true,
        product: { select: { name: true } },
        releaseTodos: { select: { isCompleted: true } },
      },
    });

    const trend = versions
      .map(v => {
        const total = v.releaseTodos.length;
        const done = v.releaseTodos.filter((t: { isCompleted: boolean }) => t.isCompleted).length;
        return {
          versionId: v.id,
          version: v.version,
          product: v.product.name,
          releaseDate: v.actualReleaseDate,
          total,
          done,
          completionRate: total > 0 ? Math.round((done / total) * 100) : 100,
        };
      })
      .reverse(); // ascending order for charts

    res.json({ data: trend });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Todo trend verisi alınamadı' });
  }
});

// ── H3-02: Awareness Detail Endpoints ─────────────────────────────────────────
// GET /api/metrics/awareness/codebase-detail
router.get('/awareness/codebase-detail', async (_req: Request, res: Response) => {
  try {
    const branches = await prisma.customerBranch.findMany({
      where: { isActive: true },
      include: {
        customer: { select: { id: true, name: true } },
        syncHistory: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true, status: true },
        },
      },
    });

    const now = Date.now();
    const data = branches.map(b => {
      const lastSync = b.syncHistory[0]?.createdAt;
      const daysSinceSync = lastSync ? Math.floor((now - lastSync.getTime()) / (1000 * 60 * 60 * 24)) : null;
      return {
        customerId: b.customerId,
        customerName: b.customer.name,
        branchName: b.branchName,
        repoName: b.repoName,
        daysSinceSync,
        lastSyncStatus: b.syncHistory[0]?.status ?? 'NEVER',
        lastSyncAt: lastSync ?? null,
      };
    });

    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Codebase divergence detayı alınamadı' });
  }
});

// GET /api/metrics/awareness/config-detail
router.get('/awareness/config-detail', async (_req: Request, res: Response) => {
  try {
    function countKeys(obj: unknown, depth = 0): number {
      if (typeof obj !== 'object' || obj === null || depth > 10) return 0;
      let count = 0;
      for (const val of Object.values(obj as Record<string, unknown>)) {
        count += 1;
        if (typeof val === 'object' && val !== null) count += countKeys(val, depth + 1);
      }
      return count;
    }

    const cpms = await prisma.customerProductMapping.findMany({
      where: { isActive: true },
      select: {
        id: true,
        customerId: true,
        productId: true,
        helmValuesOverrides: true,
        customer: { select: { name: true } },
        product: { select: { name: true } },
      },
    });

    const data = cpms.map(c => ({
      customerId: c.customerId,
      customerName: c.customer.name,
      productId: c.productId,
      productName: c.product.name,
      overrideKeyCount: c.helmValuesOverrides ? countKeys(c.helmValuesOverrides) : 0,
      hasOverrides: !!c.helmValuesOverrides,
    }));

    res.json({ data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Config difference detayı alınamadı' });
  }
});

// GET /api/metrics/awareness/deployment-detail
router.get('/awareness/deployment-detail', async (_req: Request, res: Response) => {
  try {
    const cpms = await prisma.customerProductMapping.findMany({
      where: { isActive: true },
      select: {
        customerId: true,
        productId: true,
        artifactType: true,
        deploymentModel: true,
        hostingType: true,
        customer: { select: { name: true } },
        product: { select: { name: true } },
      },
    });

    // Group counts by deployment type combination
    const groupMap: Record<string, { label: string; count: number; customers: string[] }> = {};
    for (const c of cpms) {
      const key = [c.artifactType ?? 'N/A', c.deploymentModel ?? 'N/A', c.hostingType ?? 'N/A'].join(' + ');
      if (!groupMap[key]) groupMap[key] = { label: key, count: 0, customers: [] };
      groupMap[key].count++;
      if (!groupMap[key].customers.includes(c.customer.name)) {
        groupMap[key].customers.push(c.customer.name);
      }
    }

    const distribution = Object.values(groupMap).sort((a, b) => b.count - a.count);
    const details = cpms.map(c => ({
      customerId: c.customerId,
      customerName: c.customer.name,
      productName: c.product.name,
      artifactType: c.artifactType,
      deploymentModel: c.deploymentModel,
      hostingType: c.hostingType,
    }));

    res.json({ data: { distribution, details } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Deployment diversity detayı alınamadı' });
  }
});

export default router;
