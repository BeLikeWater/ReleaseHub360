import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';

const router = Router();
router.use(authenticateJWT);

const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  repoUrl: z.string().url().optional().or(z.literal('')),
  isActive: z.boolean().optional(),
  pmType: z.enum(['AZURE', 'GITHUB']).nullable().optional(),
  azureOrg: z.string().optional().nullable(),
  azureProject: z.string().optional().nullable(),
  azureReleaseProject: z.string().optional().nullable(),
  azurePat: z.string().optional().nullable(),
});

// GET /api/products
router.get('/', async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      include: { _count: { select: { services: true, versions: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ data: products });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: String(req.params.id) },
      include: {
        services: { orderBy: { name: 'asc' } },
        apis: { orderBy: { path: 'asc' } },
        moduleGroups: {
          include: {
            modules: {
              include: { services: { orderBy: { name: 'asc' } } },
              orderBy: { name: 'asc' },
            },
          },
          orderBy: { name: 'asc' },
        },
      },
    });
    if (!product) throw new AppError(404, 'Ürün bulunamadı');
    res.json({ data: product });
  } catch (err) {
    next(err);
  }
});

// POST /api/products
router.post('/', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const data = productSchema.parse(req.body);
    const product = await prisma.product.create({ data });
    res.status(201).json({ data: product });
  } catch (err) {
    next(err);
  }
});

// PUT /api/products/:id
router.put('/:id', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const data = productSchema.partial().parse(req.body);
    const product = await prisma.product.update({ where: { id: String(req.params.id) }, data });
    res.json({ data: product });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/products/:id
router.delete('/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    await prisma.product.delete({ where: { id: String(req.params.id) } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
