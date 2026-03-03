import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticateJWT);

router.get('/summary', async (_req, res, next) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      totalProducts,
      totalCustomers,
      pendingHotfixes,
      activeVersions,
      unreadNotificationsCount,
      completedThisMonth,
      openIssues,
      criticalIssues,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.customer.count(),
      prisma.hotfixRequest.count({ where: { status: 'PENDING' } }),
      prisma.productVersion.count({ where: { phase: { notIn: ['ARCHIVED', 'PRODUCTION'] } } }),
      prisma.notification.count({ where: { isRead: false } }),
      prisma.productVersion.count({
        where: { phase: 'PRODUCTION', releaseDate: { gte: startOfMonth } },
      }),
      prisma.transitionIssue.count({ where: { status: { notIn: ['CLOSED', 'RESOLVED'] } } }),
      prisma.transitionIssue.count({ where: { priority: 'CRITICAL', status: { notIn: ['CLOSED', 'RESOLVED'] } } }),
    ]);

    res.json({
      data: {
        totalProducts,
        totalCustomers,
        pendingHotfixes,
        activeVersions,
        unreadNotificationsCount,
        completedThisMonth,
        openIssues,
        criticalIssues,
      },
    });
  } catch (err) { next(err); }
});

// GET /api/dashboard/active-releases — aktif (non-archived) sürümler + batch health score
router.get('/active-releases', async (_req, res, next) => {
  try {
    const versions = await prisma.productVersion.findMany({
      where: { phase: { notIn: ['ARCHIVED'] } },
      include: {
        product: { select: { id: true, name: true } },
        systemChanges: { select: { isBreaking: true } },
        releaseTodos: { where: { priority: 'P0', isCompleted: false }, select: { id: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    const result = versions.map(v => {
      const score = Math.max(0, 100 - v.releaseTodos.length * 5 - v.systemChanges.filter(c => c.isBreaking).length * 10);
      return {
        id: v.id,
        version: v.version,
        phase: v.phase,
        targetDate: v.targetDate,
        releaseDate: v.releaseDate,
        product: v.product,
        healthScore: score,
        incompleteP0Count: v.releaseTodos.length,
        breakingChangeCount: v.systemChanges.filter(c => c.isBreaking).length,
      };
    });

    res.json({ data: result });
  } catch (err) { next(err); }
});

router.get('/pending-actions', async (req, res, next) => {  try {
    const role = req.user!.role;

    type Action = {
      type: string; id: string; label: string; title: string;
      priority: string; createdAt: string;
      productVersion?: { version: string; product: { name: string } } | null;
      customer?: { name: string } | null;
    };
    const actions: Action[] = [];

    if (role === 'ADMIN' || role === 'RELEASE_MANAGER') {
      const pendingHotfixes = await prisma.hotfixRequest.findMany({
        where: { status: 'PENDING' },
        select: { id: true, title: true, severity: true, createdAt: true },
      });
      pendingHotfixes.forEach((h) => actions.push({
        type: 'hotfix', id: h.id, label: h.title, title: h.title,
        priority: h.severity ?? 'MEDIUM',
        createdAt: h.createdAt.toISOString(),
      }));
    }

    const incompleteTodos = await prisma.releaseTodo.findMany({
      where: { isCompleted: false },
      select: {
        id: true, title: true, priority: true, createdAt: true,
        productVersion: { select: { version: true, product: { select: { name: true } } } },
      },
      take: 10,
    });
    incompleteTodos.forEach((t) => actions.push({
      type: 'todo', id: t.id, label: t.title, title: t.title,
      priority: t.priority ?? 'MEDIUM',
      createdAt: t.createdAt.toISOString(),
      productVersion: t.productVersion ? {
        version: t.productVersion.version,
        product: { name: t.productVersion.product.name },
      } : null,
    }));

    res.json({ data: actions });
  } catch (err) { next(err); }
});

// ── GET /api/dashboard/customer/:id ──────────────────────────────────────────
// Aggregate endpoint: customer detail + product mappings + todos + service mappings
router.get('/customer/:id', async (req, res, next) => {
  try {
    const customerId = String(req.params.id);

    const [customer, productMappings, serviceMappings] = await Promise.all([
      prisma.customer.findUnique({
        where: { id: customerId },
        select: {
          id: true, name: true, code: true, contactEmail: true,
          contactPhone: true, address: true, notes: true,
          isActive: true, environments: true, ticketPlatform: true,
        },
      }),
      prisma.customerProductMapping.findMany({
        where: { customerId },
        include: {
          productVersion: {
            include: {
              product: { select: { id: true, name: true } },
              releaseTodos: {
                select: { id: true, isCompleted: true, priority: true, timing: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.customerServiceMapping.findMany({
        where: { customerId },
        include: {
          // No relation to service in schema - just return raw
        },
      }),
    ]);

    if (!customer) {
      res.status(404).json({ error: 'Müşteri bulunamadı' });
      return;
    }

    // For each product mapping, find the latest PRODUCTION version of the same product
    const productIds = [...new Set(productMappings.map((m) => m.productVersion.productId))];
    const [latestVersions, versionPackages] = await Promise.all([
      prisma.productVersion.findMany({
        where: {
          productId: { in: productIds },
          phase: 'PRODUCTION',
        },
        orderBy: { releaseDate: 'desc' },
        select: { id: true, productId: true, version: true, releaseDate: true },
      }),
      // Fetch version packages for all mapped versions so frontend can show download buttons
      prisma.versionPackage.findMany({
        where: {
          productVersionId: { in: productMappings.map((m) => m.productVersionId) },
        },
        select: {
          id: true, productVersionId: true, packageType: true,
          name: true, version: true, description: true,
          artifactUrl: true, helmRepoUrl: true, helmChartName: true,
          sizeBytes: true, checksum: true, downloadCount: true, publishedAt: true,
        },
        orderBy: { publishedAt: 'desc' },
      }),
    ]);

    // Build product → latest PRODUCTION version map
    const latestByProduct = new Map<string, { version: string; releaseDate: Date | null }>();
    for (const v of latestVersions) {
      if (!latestByProduct.has(v.productId)) {
        latestByProduct.set(v.productId, { version: v.version, releaseDate: v.releaseDate });
      }
    }

    // Enrich mappings with status info
    const enrichedMappings = productMappings.map((m) => {
      const latest = latestByProduct.get(m.productVersion.productId);
      const todos = m.productVersion.releaseTodos;
      const totalTodos = todos.length;
      const completedTodos = todos.filter((t) => t.isCompleted).length;
      const p0Incomplete = todos.filter((t) => t.priority === 'P0' && !t.isCompleted).length;

      // Version packages for this mapping's version
      const packages = versionPackages
        .filter((vp) => vp.productVersionId === m.productVersionId)
        .map((vp) => ({
          ...vp,
          sizeBytes: vp.sizeBytes ? Number(vp.sizeBytes) : null,
        }));

      return {
        id: m.id,
        productVersionId: m.productVersionId,
        branch: m.branch,
        environment: m.environment,
        notes: m.notes,
        isActive: m.isActive,
        subscriptionLevel: m.subscriptionLevel,
        artifactType: m.artifactType,
        deploymentModel: m.deploymentModel,
        hostingType: m.hostingType,
        productVersion: {
          id: m.productVersion.id,
          version: m.productVersion.version,
          phase: m.productVersion.phase,
          targetDate: m.productVersion.targetDate,
          releaseDate: m.productVersion.releaseDate,
          product: m.productVersion.product,
        },
        latestProductionVersion: latest ?? null,
        isOnLatest: latest ? latest.version === m.productVersion.version : false,
        todoProgress: { total: totalTodos, completed: completedTodos, p0Incomplete },
        versionPackages: packages,
      };
    });

    // Summary stats
    const onLatestCount = enrichedMappings.filter((m) => m.isOnLatest).length;
    const lastDeployDate = productMappings
      .filter((m) => m.productVersion.releaseDate)
      .sort((a, b) =>
        new Date(b.productVersion.releaseDate!).getTime() -
        new Date(a.productVersion.releaseDate!).getTime(),
      )[0]?.productVersion.releaseDate ?? null;

    res.json({
      data: {
        customer,
        summary: {
          totalProducts: productMappings.length,
          onLatestCount,
          pendingUpdateCount: productMappings.length - onLatestCount,
          lastDeployDate,
        },
        productMappings: enrichedMappings,
        serviceMappings,
      },
    });
  } catch (err) { next(err); }
});

// GET /api/dashboard/upcoming-releases — yaklaşan sürümler (targetDate >= bugún, ARCHIVED/PRODUCTION dışı)
router.get('/upcoming-releases', async (_req, res, next) => {
  try {
    const now = new Date();
    const versions = await prisma.productVersion.findMany({
      where: {
        phase: { notIn: ['ARCHIVED', 'PRODUCTION'] },
        targetDate: { gte: now },
      },
      include: {
        product: { select: { id: true, name: true } },
      },
      orderBy: { targetDate: 'asc' },
      take: 10,
    });

    const result = versions.map(v => ({
      id: v.id,
      version: v.version,
      phase: v.phase,
      plannedDate: v.targetDate,
      product: v.product,
    }));

    res.json({ data: result });
  } catch (err) { next(err); }
});

// ── GET /api/dashboard/customer/:id/upcoming ──────────────────────────────────
// Customer-facing calendar — upcoming versions for customer's products
router.get('/customer/:id/upcoming', async (req, res, next) => {
  try {
    const customerId = String(req.params.id);

    // Get product IDs the customer is mapped to
    const mappings = await prisma.customerProductMapping.findMany({
      where: { customerId, isActive: true },
      select: { productId: true, productVersion: { select: { productId: true } } },
    });

    const productIds = [
      ...new Set([
        ...mappings.map(m => m.productId).filter(Boolean),
        ...mappings.map(m => m.productVersion?.productId).filter(Boolean),
      ]),
    ] as string[];

    if (productIds.length === 0) return res.json({ data: [] });

    const upcoming = await prisma.productVersion.findMany({
      where: {
        productId: { in: productIds },
        phase: { notIn: ['ARCHIVED'] },
      },
      include: {
        product: { select: { id: true, name: true } },
      },
      orderBy: { targetDate: 'asc' },
    });

    res.json({
      data: upcoming.map(v => ({
        id: v.id,
        version: v.version,
        phase: v.phase,
        isHotfix: v.isHotfix,
        masterStartDate: v.masterStartDate,
        testDate: v.testDate,
        preProdDate: v.preProdDate,
        targetDate: v.targetDate,
        releaseDate: v.releaseDate,
        product: v.product,
      })),
    });
  } catch (err) { next(err); }
});

export default router;
