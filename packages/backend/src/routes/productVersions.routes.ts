import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';

const router = Router();
router.use(authenticateJWT);

const versionSchema = z.object({
  productId: z.string().uuid(),
  version: z.string().min(1),
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
    const version = await prisma.productVersion.create({
      data: {
        ...data,
        phase: 'PLANNED',
        masterStartDate: data.masterStartDate ? new Date(data.masterStartDate) : null,
        testDate: data.testDate ? new Date(data.testDate) : null,
        preProdDate: data.preProdDate ? new Date(data.preProdDate) : null,
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
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
    const version = await prisma.productVersion.update({
      where: { id: String(req.params.id) },
      data: {
        ...data,
        masterStartDate: data.masterStartDate !== undefined ? (data.masterStartDate ? new Date(data.masterStartDate) : null) : undefined,
        testDate: data.testDate !== undefined ? (data.testDate ? new Date(data.testDate) : null) : undefined,
        preProdDate: data.preProdDate !== undefined ? (data.preProdDate ? new Date(data.preProdDate) : null) : undefined,
        targetDate: data.targetDate !== undefined ? (data.targetDate ? new Date(data.targetDate) : null) : undefined,
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
        masterStartDate: data.masterStartDate !== undefined ? (data.masterStartDate ? new Date(data.masterStartDate) : null) : undefined,
        testDate: data.testDate !== undefined ? (data.testDate ? new Date(data.testDate) : null) : undefined,
        preProdDate: data.preProdDate !== undefined ? (data.preProdDate ? new Date(data.preProdDate) : null) : undefined,
        targetDate: data.targetDate !== undefined ? (data.targetDate ? new Date(data.targetDate) : null) : undefined,
      },
    });
    res.json({ data: version });
  } catch (err) { next(err); }
});

// PATCH /api/product-versions/:id/release — release onayı: releaseDate set, phase=PRODUCTION
router.patch('/:id/release', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const version = await prisma.productVersion.findUnique({ where: { id: String(req.params.id) } });
    if (!version) throw new AppError(404, 'Versiyon bulunamadı');
    if (version.releaseDate) throw new AppError(400, 'Bu versiyon zaten yayınlanmış');

    const updated = await prisma.productVersion.update({
      where: { id: String(req.params.id) },
      data: { phase: 'PRODUCTION', releaseDate: new Date() },
    });
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

export default router;
