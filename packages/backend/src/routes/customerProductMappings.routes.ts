import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';

const router = Router();
router.use(authenticateJWT);

const schema = z.object({
  customerId: z.string(),
  productVersionId: z.string(),
  trackingBranch: z.string().optional(),
  notes: z.string().optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const { customerId, productVersionId } = req.query;
    const items = await prisma.customerProductMapping.findMany({
      where: {
        ...(customerId ? { customerId: String(customerId) } : {}),
        ...(productVersionId ? { productVersionId: String(productVersionId) } : {}),
      },
      include: {
        customer: { select: { id: true, name: true } },
        productVersion: { select: { id: true, version: true, phase: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: items });
  } catch (err) { next(err); }
});

router.post('/', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const data = schema.parse(req.body);
    const item = await prisma.customerProductMapping.create({
      data,
      include: {
        customer: { select: { id: true, name: true } },
        productVersion: { select: { id: true, version: true, phase: true } },
      },
    });
    res.status(201).json({ data: item });
  } catch (err) { next(err); }
});

router.put('/:id', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const data = schema.partial().parse(req.body);
    const item = await prisma.customerProductMapping.update({
      where: { id: String(req.params.id) },
      data,
    });
    res.json({ data: item });
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const item = await prisma.customerProductMapping.findUnique({ where: { id: String(req.params.id) } });
    if (!item) throw new AppError(404, 'Eşleme bulunamadı');
    await prisma.customerProductMapping.delete({ where: { id: String(req.params.id) } });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
