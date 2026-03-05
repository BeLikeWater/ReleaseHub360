import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';
import { cascadeServiceVersions } from '../lib/serviceVersionCascade';

const router = Router();
router.use(authenticateJWT);

const ENVIRONMENTS = ['TEST', 'PRE_PROD', 'PROD'] as const;
const STATUSES = ['PLANNED', 'COMPLETED', 'CANCELLED'] as const;

const createSchema = z.object({
  customerId: z.string().uuid(),
  toVersionId: z.string().uuid(),
  fromVersionId: z.string().uuid().optional().nullable(),
  environment: z.enum(ENVIRONMENTS).default('PROD'),
  plannedDate: z.string().datetime().optional().nullable(),
  actualDate: z.string().datetime().optional().nullable(),
  status: z.enum(STATUSES).default('PLANNED'),
  transitionDate: z.string().datetime().optional(),
  notes: z.string().optional().nullable(),
  createdBy: z.string().optional().nullable(),
});

const updateSchema = z.object({
  plannedDate: z.string().datetime().optional().nullable(),
  actualDate: z.string().datetime().optional().nullable(),
  status: z.enum(STATUSES).optional(),
  notes: z.string().optional().nullable(),
});

// Shared include for responses
const cvtInclude = {
  customer: { select: { id: true, name: true, code: true } },
  fromVersion: { select: { id: true, version: true, phase: true, product: { select: { id: true, name: true } } } },
  toVersion: { select: { id: true, version: true, phase: true, product: { select: { id: true, name: true } } } },
} as const;

// GET /api/customer-version-transitions
// Filtered by customerId and/or productId for customer self-service
router.get('/', async (req, res, next) => {
  try {
    const { customerId, toVersionId, fromVersionId, productId } = req.query;

    // CUSTOMER users can only see their own transitions
    const user = req.user!;
    const effectiveCustomerId = user.userType === 'CUSTOMER' ? user.customerId : (customerId ? String(customerId) : undefined);

    // If productId filter requested, resolve via versions
    let versionIds: string[] | undefined;
    if (productId) {
      const versions = await prisma.productVersion.findMany({
        where: { productId: String(productId) },
        select: { id: true },
      });
      versionIds = versions.map(v => v.id);
    }

    const items = await prisma.customerVersionTransition.findMany({
      where: {
        ...(effectiveCustomerId ? { customerId: effectiveCustomerId } : {}),
        ...(toVersionId ? { toVersionId: String(toVersionId) } : {}),
        ...(fromVersionId ? { fromVersionId: String(fromVersionId) } : {}),
        ...(versionIds ? { toVersionId: { in: versionIds } } : {}),
      },
      include: cvtInclude,
      orderBy: [{ environment: 'asc' }, { plannedDate: 'asc' }, { transitionDate: 'desc' }],
    });
    res.json({ data: items });
  } catch (err) { next(err); }
});

// POST /api/customer-version-transitions
// CUSTOMER users can plan their own transitions; ORG roles need ADMIN/RELEASE_MANAGER
router.post('/', async (req, res, next) => {
  try {
    const user = req.user!;
    const data = createSchema.parse(req.body);

    // Enforce customerId for CUSTOMER role
    if (user.userType === 'CUSTOMER') {
      if (!user.customerId) throw new AppError(403, 'Müşteri bağlantısı bulunamadı');
      data.customerId = user.customerId;
    } else if (!['ADMIN', 'RELEASE_MANAGER'].includes(user.role)) {
      throw new AppError(403, 'Bu işlem için yetkiniz yok');
    }

    // Validate toVersion exists
    const toVersion = await prisma.productVersion.findUnique({ where: { id: data.toVersionId } });
    if (!toVersion) throw new AppError(404, 'Hedef versiyon bulunamadı');

    // E3-01: Sequential environment order check
    const ENV_ORDER = ['TEST', 'PRE_PROD', 'PROD'];
    const envIndex = ENV_ORDER.indexOf(data.environment);
    if (envIndex > 0) {
      const prevEnv = ENV_ORDER[envIndex - 1];
      const prevTransition = await prisma.customerVersionTransition.findFirst({
        where: {
          customerId: data.customerId,
          toVersionId: data.toVersionId,
          environment: prevEnv,
          status: 'COMPLETED',
        },
      });
      if (!prevTransition) {
        throw new AppError(400, `Önce ${prevEnv} geçişini tamamlayın.`);
      }
    }

    // Upsert by unique [customerId, toVersionId, environment]
    const item = await prisma.customerVersionTransition.upsert({
      where: {
        customerId_toVersionId_environment: {
          customerId: data.customerId,
          toVersionId: data.toVersionId,
          environment: data.environment,
        },
      },
      update: {
        plannedDate: data.plannedDate ? new Date(data.plannedDate) : null,
        actualDate: data.actualDate ? new Date(data.actualDate) : null,
        status: data.status,
        notes: data.notes,
        fromVersionId: data.fromVersionId,
      },
      create: {
        customerId: data.customerId,
        toVersionId: data.toVersionId,
        fromVersionId: data.fromVersionId,
        environment: data.environment,
        status: data.status,
        plannedDate: data.plannedDate ? new Date(data.plannedDate) : null,
        actualDate: data.actualDate ? new Date(data.actualDate) : null,
        transitionDate: data.transitionDate ? new Date(data.transitionDate) : undefined,
        notes: data.notes,
        createdBy: data.createdBy ?? user.name,
      },
      include: cvtInclude,
    });
    res.status(200).json({ data: item });
  } catch (err) { next(err); }
});

// PATCH /api/customer-version-transitions/:id
// Update plannedDate, actualDate, status, notes
// When Prod actualDate is set → update CPM.currentVersionId
router.patch('/:id', async (req, res, next) => {
  try {
    const user = req.user!;
    const existing = await prisma.customerVersionTransition.findUnique({
      where: { id: String(req.params.id) },
    });
    if (!existing) throw new AppError(404, 'Geçiş kaydı bulunamadı');

    // CUSTOMER can only update their own records
    if (user.userType === 'CUSTOMER' && existing.customerId !== user.customerId) {
      throw new AppError(403, 'Bu kaydı güncelleme yetkiniz yok');
    }

    const updates = updateSchema.parse(req.body);
    const newActualDate = updates.actualDate ? new Date(updates.actualDate) : undefined;
    const newStatus = updates.status ?? (newActualDate ? 'COMPLETED' : undefined);

    const updated = await prisma.customerVersionTransition.update({
      where: { id: String(req.params.id) },
      data: {
        ...(updates.plannedDate !== undefined ? { plannedDate: updates.plannedDate ? new Date(updates.plannedDate) : null } : {}),
        ...(updates.actualDate !== undefined ? { actualDate: updates.actualDate ? new Date(updates.actualDate) : null } : {}),
        ...(newStatus ? { status: newStatus } : {}),
        ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
      },
      include: cvtInclude,
    });

    // If PROD actual date was just set → update CPM.currentVersionId + cascade CustomerServiceVersion
    if (newActualDate && existing.environment === 'PROD') {
      const productId = updated.toVersion.product.id;
      const cpm = await prisma.customerProductMapping.findFirst({
        where: { customerId: existing.customerId, productId },
      });
      if (cpm) {
        await prisma.customerProductMapping.update({
          where: { id: cpm.id },
          data: { currentVersionId: existing.toVersionId },
        });
      }
      // Cascade CustomerServiceVersion snapshot records
      await cascadeServiceVersions(existing.id, newActualDate);
    }

    // E3-02: actualDate → ServiceVersion cascade
    if (newActualDate) {
      // Find the primary package version string (HELM_CHART or DOCKER_IMAGE preferred)
      const primaryPkg = await prisma.versionPackage.findFirst({
        where: {
          productVersionId: existing.toVersionId,
          packageType: { in: ['HELM_CHART', 'DOCKER_IMAGE'] },
        },
        orderBy: { publishedAt: 'desc' },
      });
      const releaseVersion = primaryPkg?.version ?? updated.toVersion.version;

      // Find all ServiceVersion records for this productVersion
      const serviceVersions = await prisma.serviceVersion.findMany({
        where: { productVersionId: existing.toVersionId },
        select: { id: true, serviceId: true },
      });

      if (serviceVersions.length > 0) {
        const updateData: Record<string, unknown> = {
          lastCheckedAt: new Date(),
          isStale: false,
        };
        if (existing.environment === 'PROD') updateData.prodVersion = releaseVersion;
        if (existing.environment === 'PRE_PROD') updateData.prepVersion = releaseVersion;

        await prisma.serviceVersion.updateMany({
          where: { id: { in: serviceVersions.map(sv => sv.id) } },
          data: updateData,
        });
      }
    }

    res.json({ data: updated });
  } catch (err) { next(err); }
});

// DELETE /api/customer-version-transitions/:id
router.delete('/:id', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const item = await prisma.customerVersionTransition.findUnique({ where: { id: String(req.params.id) } });
    if (!item) throw new AppError(404, 'Geçiş kaydı bulunamadı');
    await prisma.customerVersionTransition.delete({ where: { id: String(req.params.id) } });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
