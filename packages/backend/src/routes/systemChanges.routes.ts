import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';

const router = Router();
router.use(authenticateJWT);

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  changeType: z.string().min(1),
  isBreaking: z.boolean().default(false),
  productVersionId: z.string().optional(),
  workitemId: z.string().optional(),
  source: z.enum(['MANUAL', 'MCP']).default('MANUAL'),
  apiPath: z.string().optional(),
  previousValue: z.string().optional(),
  newValue: z.string().optional(),
});

// GET /api/system-changes?versionId=xxx&productId=xxx&isBreaking=true
router.get('/', async (req, res, next) => {
  try {
    const { versionId, productId, isBreaking } = req.query;

    const where: Record<string, unknown> = {};

    if (versionId) {
      where.productVersionId = String(versionId);
    } else if (productId) {
      // Ürüne ait tüm version'ların değişikliklerini getir
      where.productVersion = { productId: String(productId) };
    }

    if (isBreaking === 'true') {
      where.isBreaking = true;
    }

    const items = await prisma.systemChange.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        productVersion: {
          select: { version: true, productId: true },
        },
      },
    });

    res.json({ data: items });
  } catch (err) { next(err); }
});

// GET /api/system-changes/:id
router.get('/:id', async (req, res, next) => {
  try {
    const item = await prisma.systemChange.findUnique({
      where: { id: String(req.params.id) },
      include: { productVersion: { select: { version: true, productId: true } } },
    });
    if (!item) throw new AppError(404, 'Kayıt bulunamadı');
    res.json({ data: item });
  } catch (err) { next(err); }
});

// GET /api/system-changes/:id/affected-customers
router.get('/:id/affected-customers', async (req, res, next) => {
  try {
    const item = await prisma.systemChange.findUnique({
      where: { id: String(req.params.id) },
      include: {
        productVersion: {
          include: {
            customerMappings: {
              include: {
                customer: { select: { id: true, name: true, code: true } },
              },
            },
          },
        },
      },
    });

    if (!item) throw new AppError(404, 'Kayıt bulunamadı');

    const customers = item.productVersion?.customerMappings.map((m) => m.customer) ?? [];
    res.json({ data: customers, total: customers.length });
  } catch (err) { next(err); }
});

// POST /api/system-changes
router.post('/', requireRole('ADMIN', 'RELEASE_MANAGER', 'DEVELOPER'), async (req, res, next) => {
  try {
    const data = schema.parse(req.body);
    const item = await prisma.systemChange.create({ data });
    res.status(201).json({ data: item });
  } catch (err) { next(err); }
});

// POST /api/system-changes/bulk — n8n MCP otomatik kayıt için
router.post('/bulk', requireRole('ADMIN', 'RELEASE_MANAGER', 'DEVELOPER'), async (req, res, next) => {
  try {
    const bodySchema = z.object({
      items: z.array(schema).min(1),
    });
    const { items } = bodySchema.parse(req.body);

    const created = await prisma.$transaction(
      items.map((item) => prisma.systemChange.create({ data: item }))
    );

    res.status(201).json({ data: created, count: created.length });
  } catch (err) { next(err); }
});

// PUT /api/system-changes/:id
router.put('/:id', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const data = schema.partial().parse(req.body);
    const item = await prisma.systemChange.update({
      where: { id: String(req.params.id) },
      data,
    });
    res.json({ data: item });
  } catch (err) { next(err); }
});

// DELETE /api/system-changes/:id
router.delete('/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    await prisma.systemChange.delete({ where: { id: String(req.params.id) } });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
