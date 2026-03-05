import 'dotenv/config';
import app from './app';
import prisma from './lib/prisma';
import { calculateDora } from './lib/doraCalculator';

// ── Startup validation ────────────────────────────────────────────────────────
if (!process.env.ENCRYPTION_KEY && !process.env.JWT_SECRET) {
  console.error('❌ ENCRYPTION_KEY (veya JWT_SECRET) tanımlı değil. Hassas alanlar şifrelenemez.');
  process.exit(1);
}

// ── Background Jobs ───────────────────────────────────────────────────────────

/**
 * Auto-Close Cron: RESOLVED → CLOSED after 7 days
 * Runs every hour. Transition issues that have been RESOLVED for 7+ days are closed.
 */
async function autoCloseResolvedIssues() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const result = await prisma.transitionIssue.updateMany({
      where: {
        status: 'RESOLVED',
        resolvedAt: { lte: sevenDaysAgo },
      },
      data: { status: 'CLOSED' },
    });
    if (result.count > 0) {
      console.log(`[AutoClose] ${result.count} issue(s) RESOLVED→CLOSED (7-day rule)`);
    }
  } catch (err) {
    console.error('[AutoClose] Error:', err);
  }
}

// Run on startup + every hour
autoCloseResolvedIssues();
const AUTO_CLOSE_INTERVAL = 60 * 60 * 1000; // 1 hour
const autoCloseTimer = setInterval(autoCloseResolvedIssues, AUTO_CLOSE_INTERVAL);

/**
 * Escalation Cron (G-03): CRITICAL + unassigned + >4h old issues
 * Runs every hour. Creates notifications for ADMIN and RELEASE_MANAGER users.
 */
async function escalateCriticalUnassignedIssues() {
  try {
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const criticalIssues = await prisma.transitionIssue.findMany({
      where: {
        priority: 'CRITICAL',
        assignedTo: null,
        createdAt: { lt: fourHoursAgo },
        status: { notIn: ['RESOLVED', 'CLOSED'] },
      },
      select: { id: true, title: true, customerId: true },
    });

    if (criticalIssues.length === 0) return;

    const admins = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'RELEASE_MANAGER'] } },
      select: { id: true },
    });

    if (admins.length === 0) return;

    const notifications = criticalIssues.flatMap((issue) =>
      admins.map((admin) => ({
        userId: admin.id,
        type: 'ISSUE_ESCALATION',
        title: 'Kritik Issue Atanmadı',
        message: `"${issue.title}" issue'su 4+ saattir atanmamış (CRITICAL). Lütfen ilgili kişiye atayın.`,
        isRead: false,
      }))
    );

    await prisma.notification.createMany({ data: notifications, skipDuplicates: false });
    console.log(`[Escalation] ${criticalIssues.length} critical issue(s) → ${notifications.length} notification(s) sent`);
  } catch (err) {
    console.error('[Escalation] Error:', err);
  }
}

escalateCriticalUnassignedIssues();
const ESCALATION_INTERVAL = 60 * 60 * 1000; // 1 hour
const escalationTimer = setInterval(escalateCriticalUnassignedIssues, ESCALATION_INTERVAL);

/**
 * DORA Calculator Cron (H1-02): Runs daily at 02:00.
 * Computes DORA metrics for the last 4 weeks and writes to MetricSnapshot.
 */
function scheduleDailyCron(hour: number, fn: () => Promise<void>): NodeJS.Timeout {
  const now = new Date();
  const next = new Date();
  next.setHours(hour, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const delay = next.getTime() - now.getTime();
  let timer: NodeJS.Timeout;
  const schedule = () => {
    fn().catch(e => console.error('[DoraCron] Error:', e));
    timer = setInterval(() => {
      fn().catch(e => console.error('[DoraCron] Error:', e));
    }, 24 * 60 * 60 * 1000);
  };
  timer = setTimeout(schedule, delay);
  return timer;
}

const doraCronTimer = scheduleDailyCron(2, () => calculateDora({ weeksBack: 4 }));

// ── M-01: Pipeline Stats Collector ────────────────────────────────────────────
// Runs every 6 hours. Fetches Azure DevOps Build API for each product and writes
// PIPELINE_SUCCESS_RATE to MetricSnapshot.
async function collectPipelineStats(): Promise<void> {
  try {
    const { decrypt } = await import('./lib/encryption');
    // ISO week label helper (same as doraCalculator)
    const isoLabel = (d: Date) => {
      const y = d.getFullYear();
      const startOfYear = new Date(y, 0, 1);
      const w = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
      return `${y}-W${String(w).padStart(2, '0')}`;
    };

    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, azureOrg: true, azureProject: true, azurePat: true },
    });

    const period = isoLabel(new Date());
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    for (const product of products) {
      if (!product.azureOrg || !product.azureProject || !product.azurePat) continue;
      try {
        const pat = decrypt(product.azurePat);
        const token = Buffer.from(`:${pat}`).toString('base64');
        const url = `https://dev.azure.com/${product.azureOrg}/${product.azureProject}/_apis/build/builds?$top=500&minTime=${encodeURIComponent(since)}&api-version=7.1`;
        const resp = await fetch(url, { headers: { Authorization: `Basic ${token}` } });
        if (!resp.ok) continue;
        const data = (await resp.json()) as { value?: { result: string }[] };
        const builds = data.value ?? [];
        const total = builds.length;
        if (total === 0) continue;
        const succeeded = builds.filter((b) => b.result === 'succeeded').length;
        const rate = succeeded / total;
        await prisma.metricSnapshot.create({
          data: { period, periodType: 'WEEK', productId: product.id, metricType: 'PIPELINE_SUCCESS_RATE', value: rate, metadata: { total, succeeded } as never },
        });
      } catch { /* skip individual product errors */ }
    }
    console.log('[M-01] Pipeline stats collected');
  } catch (err) {
    console.error('[M-01] Pipeline stats collector error:', err);
  }
}

collectPipelineStats();
const PIPELINE_STATS_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours
const pipelineStatsTimer = setInterval(collectPipelineStats, PIPELINE_STATS_INTERVAL);

// ── M-02: Codebase Divergence Checker ─────────────────────────────────────────
// Runs daily. For each active CustomerBranch, computes days since last sync and
// writes CODEBASE_DIVERGENCE to MetricSnapshot (per customer).
async function checkCodebaseDivergence(): Promise<void> {
  try {
    const isoLabel = (d: Date) => {
      const y = d.getFullYear();
      const startOfYear = new Date(y, 0, 1);
      const w = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
      return `${y}-W${String(w).padStart(2, '0')}`;
    };

    const period = isoLabel(new Date());
    const branches = await prisma.customerBranch.findMany({
      where: { isActive: true },
      select: { id: true, customerId: true, syncHistory: { select: { createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    // Group by customerId → pick the most recent sync among all branches
    const customerSyncMap = new Map<string, number>();
    for (const branch of branches) {
      const lastSync = branch.syncHistory[0]?.createdAt?.getTime() ?? 0;
      const existing = customerSyncMap.get(branch.customerId) ?? 0;
      if (lastSync > existing) customerSyncMap.set(branch.customerId, lastSync);
    }

    const now = Date.now();
    for (const [customerId, lastSyncMs] of customerSyncMap.entries()) {
      const daysSince = lastSyncMs === 0 ? 90 : (now - lastSyncMs) / (1000 * 3600 * 24);
      await prisma.metricSnapshot.create({
        data: { period, periodType: 'WEEK', productId: undefined, metricType: 'CODEBASE_DIVERGENCE', value: daysSince, metadata: { customerId } as never },
      });
    }
    console.log(`[M-02] Divergence checked for ${customerSyncMap.size} customers`);
  } catch (err) {
    console.error('[M-02] Codebase divergence checker error:', err);
  }
}

const divergenceCronTimer = scheduleDailyCron(3, checkCodebaseDivergence);

const PORT = process.env.PORT ?? 3001;

const server = app.listen(PORT, () => {
  console.log(`🚀 ReleaseHub360 Backend running on http://localhost:${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV ?? 'development'}`);
  console.log(`  Auto-close cron: every ${AUTO_CLOSE_INTERVAL / 60000}min`);
});

// ── Graceful Shutdown ──────────────────────────────────────────────────────────
// Ensures Prisma releases all DB connections on SIGINT (Ctrl+C) and SIGTERM (PM2/Docker stop).
// Without this, killed processes leave idle connections in PostgreSQL until pg_timeout.
const shutdown = async (signal: string) => {
  console.log(`\n[🛑] ${signal} alındı — bağlantılar kapatılıyor...`);
  clearInterval(autoCloseTimer);
  clearInterval(escalationTimer);
  clearTimeout(doraCronTimer);
  clearInterval(pipelineStatsTimer);
  clearTimeout(divergenceCronTimer);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('[DB] Prisma bağlantıları kapatıldı.');
    process.exit(0);
  });
  // Force exit after 10s if server.close() hangs
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGINT',  () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
