import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateJWT } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';

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
        toTransitions: { select: { id: true, status: true, customerId: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    const result = versions.map(v => {
      const score = Math.max(0, 100 - v.releaseTodos.length * 5 - v.systemChanges.filter(c => c.isBreaking).length * 10);
      const totalTransitions = v.toTransitions.length;
      const completedTransitions = v.toTransitions.filter(t => t.status === 'COMPLETED').length;
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
        // H4-02: customer transition ratio
        customerTransition: {
          total: totalTransitions,
          completed: completedTransitions,
          ratio: totalTransitions > 0 ? Math.round((completedTransitions / totalTransitions) * 100) : null,
        },
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
                select: { id: true, isCompleted: true, priority: true, phase: true },
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

    // Sadece productVersion yüklü olan mapping'leri işle (productVersionId zorunlu olanlar)
    type MappingWithVersion = (typeof productMappings)[number] & {
      productVersion: NonNullable<(typeof productMappings)[number]['productVersion']>;
      productVersionId: string;
    };
    const validMappings = productMappings.filter(
      (m): m is MappingWithVersion => m.productVersion !== null && m.productVersionId !== null,
    );

    // For each product mapping, find the latest PRODUCTION version of the same product
    const productIds = [...new Set(validMappings.map((m) => m.productVersion.productId))];
    const [latestVersions, versionPackages, openIssueCount, pendingTransition, incompleteTodoCount] = await Promise.all([
      prisma.productVersion.findMany({
        where: {
          productId: { in: productIds },
          phase: 'PRODUCTION',
        },
        // PostgreSQL DESC sıralamasında NULL değerler NULLS FIRST gelir (varsayılan).
        // Bu durum, releaseDate atanmamış eski versiyonların "en son" olarak seçilmesine yol açar.
        // nulls: 'last' ile releaseDate null olan versiyonlar sona itilir → gerçek en son versiyon seçilir.
        orderBy: [
          { releaseDate: { sort: 'desc', nulls: 'last' } },
          { createdAt: 'desc' },
        ],
        select: { id: true, productId: true, version: true, releaseDate: true },
      }),
      // Fetch version packages for all mapped versions so frontend can show download buttons
      prisma.versionPackage.findMany({
        where: {
          productVersionId: { in: validMappings.map((m) => m.productVersionId) },
        },
        select: {
          id: true, productVersionId: true, packageType: true,
          name: true, version: true, description: true,
          artifactUrl: true, helmRepoUrl: true, helmChartName: true,
          sizeBytes: true, checksum: true, downloadCount: true, publishedAt: true,
        },
        orderBy: { publishedAt: 'desc' },
      }),
      // U-01: Open transition issues count
      prisma.transitionIssue.count({
        where: { customerId, status: { notIn: ['RESOLVED', 'CLOSED'] } },
      }),
      // U-01: Active pending transition
      prisma.customerVersionTransition.findFirst({
        where: { customerId, status: 'PLANNED' },
        include: {
          toVersion: { select: { version: true, product: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      // U-01: Incomplete release todos for customer's products
      prisma.releaseTodo.count({
        where: {
          productVersionId: { in: validMappings.map((m) => m.productVersionId) },
          isCompleted: false,
        },
      }),
    ]);

    // Build product → latest PRODUCTION version map
    const latestByProduct = new Map<string, { id: string; version: string; releaseDate: Date | null }>();
    for (const v of latestVersions) {
      if (!latestByProduct.has(v.productId)) {
        latestByProduct.set(v.productId, { id: v.id, version: v.version, releaseDate: v.releaseDate });
      }
    }

    // Enrich mappings with status info
    const enrichedMappings = validMappings.map((m) => {
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
        licenseTags: m.licenseTags,
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
    const lastDeployDate = validMappings
      .filter((m) => m.productVersion.releaseDate)
      .sort((a, b) =>
        new Date(b.productVersion.releaseDate!).getTime() -
        new Date(a.productVersion.releaseDate!).getTime(),
      )[0]?.productVersion.releaseDate ?? null;

    res.json({
      data: {
        customer,
        summary: {
          totalProducts: validMappings.length,
          onLatestCount,
          pendingUpdateCount: validMappings.length - onLatestCount,
          lastDeployDate,
          openIssueCount,
          incompleteTodoCount,
          pendingTransition: pendingTransition
            ? {
                id: pendingTransition.id,
                status: pendingTransition.status,
                toVersion: pendingTransition.toVersion.version,
                productName: pendingTransition.toVersion.product.name,
              }
            : null,
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
        devStartDate: v.devStartDate,
        testStartDate: v.testStartDate,
        preProdDate: v.preProdDate,
        targetDate: v.targetDate,
        releaseDate: v.releaseDate,
        product: v.product,
      })),
    });
  } catch (err) { next(err); }
});

// ── GET /api/dashboard/customer-products — E1-02: CPM-based product card API ─
// Returns customer's products with version, todo stats, open issue count
router.get('/customer-products', async (req, res, next) => {
  try {
    const customerId = String(req.query.customerId ?? '');
    if (!customerId) throw new AppError(400, 'customerId parametresi gereklidir');

    const mappings = await prisma.customerProductMapping.findMany({
      where: { customerId, isActive: true },
      include: {
        product: {
          include: {
            versions: {
              where: { phase: { notIn: ['ARCHIVED'] } },
              orderBy: [{ releaseDate: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
              take: 1,
              include: {
                releaseTodos: { select: { id: true, isCompleted: true } },
              },
            },
          },
        },
      },
    });

    // Open transition issues for this customer
    const openIssueCount = await prisma.transitionIssue.count({
      where: { customerId, status: { notIn: ['RESOLVED', 'CLOSED'] } },
    });

    const result = mappings.map(m => {
      const latestVersion = m.product.versions[0] ?? null;
      const todos = latestVersion?.releaseTodos ?? [];
      const totalTodos = todos.length;
      const completedTodos = todos.filter(t => t.isCompleted).length;
      const todoCompletionPct = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 100;

      return {
        mappingId: m.id,
        productId: m.productId,
        productName: m.product.name,
        licenseTags: m.licenseTags,
        currentVersionId: latestVersion?.id ?? null,
        currentVersion: latestVersion?.version ?? null,
        versionPhase: latestVersion?.phase ?? null,
        lastReleaseDate: latestVersion?.releaseDate ?? null,
        targetDate: latestVersion?.targetDate ?? null,
        totalTodos,
        completedTodos,
        todoCompletionPct,
        openIssueCount,
        updatedAt: m.updatedAt,
      };
    });

    res.json({ data: result });
  } catch (err) { next(err); }
});

// ── H4-09: GET /api/dashboard/highlights ─────────────────────────────────────
// Rule-based insight engine: returns up to 5 actionable highlights
router.get('/highlights', async (_req, res, next) => {
  try {
    const highlights: { type: string; message: string; severity: 'info' | 'warning' | 'critical' }[] = [];
    const now = Date.now();

    // Rule 1: Customers 3+ versions behind
    const cpms = await prisma.customerProductMapping.findMany({
      where: { isActive: true },
      include: {
        product: { select: { name: true } },
        currentVersion: { select: { version: true, createdAt: true } },
        productVersion: { select: { version: true } },
      },
    });
    for (const cpm of cpms) {
      // Rough heuristic: if currentVersion is much older, flag it
      if (cpm.currentVersion && cpm.productVersion) {
        // if they're the same, might be fine; drift detection left to DORA
      }
    }

    // Rule 2: Stale sync branches (>30 days)
    const staleBranches = await prisma.customerBranch.findMany({
      where: { isActive: true },
      include: {
        customer: { select: { name: true } },
        syncHistory: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
      },
    });
    const staleCount = staleBranches.filter(b => {
      const last = b.syncHistory[0]?.createdAt;
      return last ? (now - last.getTime()) > 30 * 24 * 60 * 60 * 1000 : true;
    }).length;
    if (staleCount > 0) {
      highlights.push({
        type: 'STALE_SYNC',
        message: `${staleCount} müşteri dal(lar)ında son 30 günde sync yapılmamış.`,
        severity: staleCount > 3 ? 'critical' : 'warning',
      });
    }

    // Rule 3: MTTR improving (last 2 weeks vs prior 2 weeks from MetricSnapshot)
    const twoWeeksAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);
    const fourWeeksAgo = new Date(now - 28 * 24 * 60 * 60 * 1000);
    const [recentMttr, priorMttr] = await Promise.all([
      prisma.metricSnapshot.aggregate({
        where: { metricType: 'MTTR', computedAt: { gte: twoWeeksAgo } },
        _avg: { value: true },
      }),
      prisma.metricSnapshot.aggregate({
        where: { metricType: 'MTTR', computedAt: { gte: fourWeeksAgo, lt: twoWeeksAgo } },
        _avg: { value: true },
      }),
    ]);
    if (recentMttr._avg.value && priorMttr._avg.value && recentMttr._avg.value < priorMttr._avg.value) {
      const improvePct = Math.round(((priorMttr._avg.value - recentMttr._avg.value) / priorMttr._avg.value) * 100);
      highlights.push({
        type: 'MTTR_IMPROVING',
        message: `MTTR son 2 haftada %${improvePct} iyileşti. Harika gidiyorsunuz!`,
        severity: 'info',
      });
    }

    // Rule 4: Open CRITICAL issues
    const criticalCount = await prisma.transitionIssue.count({
      where: { priority: 'CRITICAL', status: { notIn: ['RESOLVED', 'CLOSED'] } },
    });
    if (criticalCount > 0) {
      highlights.push({
        type: 'CRITICAL_ISSUES',
        message: `${criticalCount} kritik issue çözüm bekliyor.`,
        severity: 'critical',
      });
    }

    // Rule 5: Versions overdue (targetDate passed, not yet RELEASED)
    const overdueCount = await prisma.productVersion.count({
      where: {
        targetDate: { lt: new Date() },
        phase: { notIn: ['RELEASED', 'ARCHIVED', 'CANCELLED'] },
      },
    });
    if (overdueCount > 0) {
      highlights.push({
        type: 'OVERDUE_VERSIONS',
        message: `${overdueCount} versiyon hedef tarihi geçmiş, henüz yayınlanmamış.`,
        severity: overdueCount > 3 ? 'critical' : 'warning',
      });
    }

    res.json({ data: highlights.slice(0, 5) });
  } catch (err) { next(err); }
});

// ── H4-10: GET /api/dashboard/version-transition/:versionId ───────────────────
// Customer transition status for a specific version
router.get('/version-transition/:versionId', async (req, res, next) => {
  try {
    const { versionId } = req.params;

    const transitions = await prisma.customerVersionTransition.findMany({
      where: { toVersionId: versionId },
      include: {
        customer: { select: { id: true, name: true, code: true } },
      },
    });

    // Customers with CPM for this version's product (all potential transitioners)
    const version = await prisma.productVersion.findUnique({
      where: { id: versionId },
      select: { productId: true, version: true, product: { select: { name: true } } },
    });
    if (!version) return res.status(404).json({ error: 'Versiyon bulunamadı' });

    const allCpms = await prisma.customerProductMapping.findMany({
      where: { productId: version.productId, isActive: true },
      select: { customerId: true, customer: { select: { id: true, name: true, code: true } } },
    });

    const transitionMap = new Map(transitions.map(t => [t.customerId, t]));
    const customerList = allCpms.map(cpm => {
      const t = transitionMap.get(cpm.customerId);
      return {
        customerId: cpm.customerId,
        customerName: cpm.customer.name,
        customerCode: cpm.customer.code,
        status: t?.status ?? 'NOT_PLANNED',
        plannedDate: t?.plannedDate ?? null,
        actualDate: t?.actualDate ?? null,
        environment: t?.environment ?? null,
        notes: t?.notes ?? null,
      };
    });

    const completed = customerList.filter(c => c.status === 'COMPLETED').length;
    const planned = customerList.filter(c => c.status === 'PLANNED').length;
    const notPlanned = customerList.filter(c => c.status === 'NOT_PLANNED').length;

    res.json({
      data: {
        versionId,
        version: version.version,
        product: version.product.name,
        summary: {
          total: customerList.length,
          completed,
          planned,
          notPlanned,
          completionRate: customerList.length > 0 ? Math.round((completed / customerList.length) * 100) : 0,
        },
        customers: customerList,
      },
    });
  } catch (err) { next(err); }
});

export default router;
