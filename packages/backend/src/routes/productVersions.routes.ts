import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateJWT, requireRole, filterByUserProducts } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';

const router = Router();
router.use(authenticateJWT);
router.use(filterByUserProducts);

const versionSchema = z.object({
  productId: z.string().uuid(),
  version: z.string().min(1).regex(/^v?\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/, 'Geçerli bir semver formatı girin (örn: 1.2.3 veya v1.2.3-rc1)'),
  phase: z.enum(['PLANNED', 'DEVELOPMENT', 'RC', 'STAGING', 'PRODUCTION', 'ARCHIVED']).optional(),
  isHotfix: z.boolean().optional(),
  masterStartDate: z.string().datetime().optional().nullable(),
  testDate: z.string().datetime().optional().nullable(),
  preProdDate: z.string().datetime().optional().nullable(),
  targetDate: z.string().datetime().optional().nullable(),
  description: z.string().optional(),
});

const PHASE_ORDER = ['PLANNED', 'DEVELOPMENT', 'RC', 'STAGING', 'PRODUCTION'];

// GET /api/product-versions
router.get('/', async (req, res, next) => {
  try {
    const { productId, phase, upcoming } = req.query;
    const versions = await prisma.productVersion.findMany({
      where: {
        ...(req.accessibleProductIds ? { productId: { in: req.accessibleProductIds } } : {}),
        ...(productId ? { productId: String(productId) } : {}),
        ...(phase ? { phase: String(phase) } : {}),
        ...(upcoming === 'true' ? { targetDate: { gte: new Date() } } : {}),
      },
      include: { product: { select: { id: true, name: true } } },
      orderBy: [{ targetDate: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ data: versions });
  } catch (err) {
    next(err);
  }
});

// GET /api/product-versions/customer-calendar?customerId={id}
// C-06: Müşteri takvimi — CPM üzerinden ürünlerini bul, customerVisibleStatuses ile filtrele
router.get('/customer-calendar', async (req, res, next) => {
  try {
    const customerId = req.query.customerId ? String(req.query.customerId) : null;
    if (!customerId) throw new AppError(400, 'customerId zorunludur');

    // Müşterinin abone olduğu ürünleri bul
    const mappings = await prisma.customerProductMapping.findMany({
      where: { customerId, isActive: true },
      select: { productId: true },
    });
    const productIds = [...new Set(mappings.map((m) => m.productId))];

    if (productIds.length === 0) {
      return res.json({ data: [] });
    }

    // Her ürünün customerVisibleStatuses'ını çek
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, customerVisibleStatuses: true },
    });

    // productId → allowed phases map
    const allowedPhasesMap = new Map<string, string[]>();
    for (const p of products) {
      allowedPhasesMap.set(p.id, p.customerVisibleStatuses.length > 0 ? p.customerVisibleStatuses : ['PRODUCTION']);
    }

    // Her ürün grubu için versiyonları çek (phase filtreli)
    const versionResults = await Promise.all(
      products.map((p) =>
        prisma.productVersion.findMany({
          where: { productId: p.id, phase: { in: allowedPhasesMap.get(p.id) ?? ['PRODUCTION'] } },
          select: {
            id: true, version: true, phase: true, targetDate: true, releaseDate: true,
            isHotfix: true, description: true, notesPublished: true,
            product: { select: { id: true, name: true } },
          },
          orderBy: { targetDate: 'asc' },
        })
      )
    );

    res.json({ data: versionResults.flat() });
  } catch (err) {
    next(err);
  }
});

// GET /api/product-versions/:id
router.get('/:id', async (req, res, next) => {
  try {
    const version = await prisma.productVersion.findUnique({
      where: { id: String(req.params.id) },
      include: {
        product: true,
        releaseNotes: { orderBy: { sortOrder: 'asc' } },
        releaseTodos: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!version) throw new AppError(404, 'Versiyon bulunamadı');
    res.json({ data: version });
  } catch (err) {
    next(err);
  }
});

// POST /api/product-versions
router.post('/', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const data = versionSchema.parse(req.body);
    const { masterStartDate, testDate, preProdDate, targetDate, ...rest } = data;

    // C-05: concurrentUpdatePolicy kontrolü
    const product = await prisma.product.findUnique({
      where: { id: rest.productId },
      select: { concurrentUpdatePolicy: true },
    });
    if (!product) throw new AppError(404, 'Ürün bulunamadı');

    const concurrentCount = await prisma.productVersion.count({
      where: {
        productId: rest.productId,
        phase: { in: ['DEVELOPMENT', 'RC', 'STAGING'] },
      },
    });

    if (concurrentCount > 0 && product.concurrentUpdatePolicy) {
      if (product.concurrentUpdatePolicy === 'BLOCK') {
        throw new AppError(409, `Bu ürün için zaten aktif geliştirme aşamasında (DEVELOPMENT/RC/STAGING) ${concurrentCount} versiyon mevcut. concurrentUpdatePolicy=BLOCK: yeni versiyon oluşturulamaz.`);
      }
      // WARN: oluştururuz ama uyarıyla birlikte
      const version = await prisma.productVersion.create({
        data: {
          ...rest,
          phase: 'PLANNED',
          devStartDate: masterStartDate ? new Date(masterStartDate) : null,
          testStartDate: testDate ? new Date(testDate) : null,
          preProdDate: preProdDate ? new Date(preProdDate) : null,
          targetDate: targetDate ? new Date(targetDate) : null,
        },
      });
      return res.status(201).json({
        data: version,
        warning: `Bu ürün için zaten ${concurrentCount} aktif versiyon var (DEVELOPMENT/RC/STAGING). concurrentUpdatePolicy=WARN.`,
      });
    }

    const version = await prisma.productVersion.create({
      data: {
        ...rest,
        phase: 'PLANNED',
        devStartDate: masterStartDate ? new Date(masterStartDate) : null,
        testStartDate: testDate ? new Date(testDate) : null,
        preProdDate: preProdDate ? new Date(preProdDate) : null,
        targetDate: targetDate ? new Date(targetDate) : null,
      },
    });
    res.status(201).json({ data: version });
  } catch (err) {
    next(err);
  }
});

// PUT /api/product-versions/:id
router.put('/:id', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const data = versionSchema.partial().parse(req.body);
    const { productId, masterStartDate, testDate, preProdDate, targetDate, ...rest } = data;
    const version = await prisma.productVersion.update({
      where: { id: String(req.params.id) },
      data: {
        ...rest,
        ...(productId !== undefined && { product: { connect: { id: productId } } }),
        devStartDate: masterStartDate !== undefined ? (masterStartDate ? new Date(masterStartDate) : null) : undefined,
        testStartDate: testDate !== undefined ? (testDate ? new Date(testDate) : null) : undefined,
        preProdDate: preProdDate !== undefined ? (preProdDate ? new Date(preProdDate) : null) : undefined,
        targetDate: targetDate !== undefined ? (targetDate ? new Date(targetDate) : null) : undefined,
      },
    });
    res.json({ data: version });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/product-versions/:id — general field update (e.g., notesPublished)
router.patch('/:id', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const patchSchema = z.object({
      notesPublished: z.boolean().optional(),
      description: z.string().optional(),
      isHotfix: z.boolean().optional(),
      masterStartDate: z.string().datetime().optional().nullable(),
      testDate: z.string().datetime().optional().nullable(),
      preProdDate: z.string().datetime().optional().nullable(),
      targetDate: z.string().datetime().optional().nullable(),
    });
    const data = patchSchema.parse(req.body);
    const version = await prisma.productVersion.update({
      where: { id: String(req.params.id) },
      data: {
        ...data,
        devStartDate: data.masterStartDate !== undefined ? (data.masterStartDate ? new Date(data.masterStartDate) : null) : undefined,
        testStartDate: data.testDate !== undefined ? (data.testDate ? new Date(data.testDate) : null) : undefined,
        preProdDate: data.preProdDate !== undefined ? (data.preProdDate ? new Date(data.preProdDate) : null) : undefined,
        targetDate: data.targetDate !== undefined ? (data.targetDate ? new Date(data.targetDate) : null) : undefined,
      },
    });
    res.json({ data: version });
  } catch (err) { next(err); }
});

// PATCH /api/product-versions/:id/release — release onayı: releaseDate set, phase=PRODUCTION
// D3-02: versionPackages[] kabul et, VersionPackage kayıtları oluştur, notesPublished=true set et
const releaseBodySchema = z.object({
  versionPackages: z.array(z.object({
    packageType: z.string().min(1),
    name: z.string().min(1),
    version: z.string().min(1),
    description: z.string().optional(),
    artifactUrl: z.string().optional(),
    helmRepoUrl: z.string().optional(),
    helmChartName: z.string().optional(),
    imageRegistry: z.string().optional(),
    imageName: z.string().optional(),
    imageTag: z.string().optional(),
    publishedBy: z.string().optional(),
  })).optional(),
  notesPublished: z.boolean().optional(),
});

router.patch('/:id/release', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const versionId = String(req.params.id);
    const version = await prisma.productVersion.findUnique({ where: { id: versionId } });
    if (!version) throw new AppError(404, 'Versiyon bulunamadı');
    if (version.releaseDate) throw new AppError(400, 'Bu versiyon zaten yayınlanmış');

    const body = releaseBodySchema.parse(req.body);

    // Atomik: versiyon güncelle + paket kayıtları oluştur
    const [updated] = await prisma.$transaction([
      prisma.productVersion.update({
        where: { id: versionId },
        data: {
          phase: 'PRODUCTION',
          releaseDate: new Date(),
          notesPublished: body.notesPublished ?? true,
        },
      }),
      ...(body.versionPackages ?? []).map(pkg =>
        prisma.versionPackage.create({
          data: {
            productVersionId: versionId,
            packageType: pkg.packageType,
            name: pkg.name,
            version: pkg.version,
            description: pkg.description,
            artifactUrl: pkg.artifactUrl,
            helmRepoUrl: pkg.helmRepoUrl,
            helmChartName: pkg.helmChartName,
            imageRegistry: pkg.imageRegistry,
            imageName: pkg.imageName,
            imageTag: pkg.imageTag,
            publishedBy: pkg.publishedBy ?? 'system',
          },
        })
      ),
    ]);

    res.json({ data: updated, packagesCreated: (body.versionPackages ?? []).length });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/product-versions/:id/advance-phase — durum makinesi: bir sonraki aşamaya ilerlet
router.patch('/:id/advance-phase', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const version = await prisma.productVersion.findUnique({ where: { id: String(req.params.id) } });
    if (!version) throw new AppError(404, 'Versiyon bulunamadı');
    if (version.phase === 'ARCHIVED') throw new AppError(400, 'Arşivlenmiş versiyon ilerletilemez');

    const currentIndex = PHASE_ORDER.indexOf(version.phase);
    if (currentIndex === -1 || currentIndex >= PHASE_ORDER.length - 1) {
      throw new AppError(400, 'Bu versiyon zaten son aşamada (PRODUCTION). Arşivlemek için /deprecate kullanın.');
    }

    const nextPhase = PHASE_ORDER[currentIndex + 1];
    // C-03: PRODUCTION geçişi yalnızca Health Check (release endpoint) üzerinden
    if (nextPhase === 'PRODUCTION') {
      throw new AppError(403, 'PRODUCTION geçişi advance-phase ile yapılamaz. Health Check sayfasından /:id/release endpoint\'ini kullanın.');
    }

    const updateData: Record<string, unknown> = { phase: nextPhase };

    const updated = await prisma.productVersion.update({
      where: { id: String(req.params.id) },
      data: updateData,
    });
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/product-versions/:id/phase — explicit phase set with transition validation
router.patch('/:id/phase', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const { phase: newPhase } = z.object({ phase: z.enum(['PLANNED', 'DEVELOPMENT', 'RC', 'STAGING', 'PRODUCTION', 'ARCHIVED']) }).parse(req.body);
    const version = await prisma.productVersion.findUnique({ where: { id: String(req.params.id) } });
    if (!version) throw new AppError(404, 'Versiyon bulunamadı');

    const currentIndex = PHASE_ORDER.indexOf(version.phase);
    const nextIndex = PHASE_ORDER.indexOf(newPhase);
    if (nextIndex < currentIndex) {
      throw new AppError(400, `Geri geçiş yapılamaz: ${version.phase} → ${newPhase}`);
    }
    // C-03: PRODUCTION geçişi yalnızca Health Check (release endpoint) üzerinden
    if (newPhase === 'PRODUCTION') {
      throw new AppError(403, 'PRODUCTION geçişi bu endpoint üzerinden yapılamaz. Health Check sayfasından /:id/release endpoint\'ini kullanın.');
    }

    const updateData: Record<string, unknown> = { phase: newPhase };
    if (newPhase === 'ARCHIVED') {
      updateData.deprecatedAt = new Date();
    }

    const updated = await prisma.productVersion.update({
      where: { id: String(req.params.id) },
      data: updateData,
    });
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/product-versions/:id/deprecate — arşivle (müşteri kontrolü ile)
router.patch('/:id/deprecate', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const versionId = String(req.params.id);
    const force = req.query.force === 'true';

    // Check for active customers on this version (productVersionId OR currentVersionId)
    const [mappingsByVersionId, mappingsByCurrentId] = await Promise.all([
      prisma.customerProductMapping.findMany({
        where: { productVersionId: versionId, isActive: true },
        include: { customer: { select: { id: true, name: true } } },
      }),
      prisma.customerProductMapping.findMany({
        where: { currentVersionId: versionId, isActive: true },
        include: { customer: { select: { id: true, name: true } } },
      }),
    ]);

    // Deduplicate by customer id
    const seen = new Set<string>();
    const activeMappings = [...mappingsByVersionId, ...mappingsByCurrentId].filter((m) => {
      if (seen.has(m.customer.id)) return false;
      seen.add(m.customer.id);
      return true;
    });

    if (activeMappings.length > 0 && !force) {
      return res.status(409).json({
        error: 'ACTIVE_CUSTOMERS',
        message: `Bu versiyonda ${activeMappings.length} aktif müşteri var. Arşivlemek için force=true kullanın.`,
        activeCustomers: activeMappings.map(m => ({
          customerId: m.customer.id,
          customerName: m.customer.name,
        })),
        count: activeMappings.length,
      });
    }

    const updated = await prisma.productVersion.update({
      where: { id: versionId },
      data: { phase: 'ARCHIVED', deprecatedAt: new Date() },
    });

    // Notify affected customers
    if (activeMappings.length > 0) {
      const user = (req as unknown as { user: { id: string } }).user;
      await Promise.all(
        activeMappings.map(m =>
          prisma.notification.create({
            data: {
              userId: user.id,
              type: 'VERSION_DEPRECATED',
              title: 'Versiyon Arşivlendi',
              message: `${m.customer.name} müşterisinin kullandığı versiyon arşivlendi. Güncelleme planlanmalıdır.`,
              linkUrl: `/customer-dashboard/${m.customer.id}`,
            },
          })
        )
      );
    }

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/product-versions/:id
router.delete('/:id', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    await prisma.productVersion.delete({ where: { id: String(req.params.id) } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// GET /api/product-versions/:id/health-score ─ server-side sağlık skoru hesaplama
// Formül: 100 − (openPRs×3) − (incompleteP0Todos×5) − (breakingChanges×10)
router.get('/:id/health-score', async (req, res, next) => {
  try {
    const version = await prisma.productVersion.findUnique({
      where: { id: String(req.params.id) },
      include: {
        systemChanges: true,
        releaseTodos: { where: { priority: 'P0', isCompleted: false } },
      },
    });
    if (!version) throw new AppError(404, 'Versiyon bulunamadı');

    const breakingChanges = version.systemChanges.filter((c) => c.isBreaking);
    const incompleteP0Todos = version.releaseTodos;

    // openPRs gelmiyor (TFS live data) — placeholder 0, frontend hâlâ kendi hesaplar
    const score = Math.max(
      0,
      100 -
        incompleteP0Todos.length * 5 -
        breakingChanges.length * 10,
    );

    res.json({
      data: {
        score,
        details: {
          incompleteP0TodoCount: incompleteP0Todos.length,
          breakingChangeCount: breakingChanges.length,
          openPRCount: 0, // TFS live — hesap frontend'de
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
