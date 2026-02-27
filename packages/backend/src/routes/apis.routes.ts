import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';

const router = Router();
router.use(authenticateJWT);

const schema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  description: z.string().optional(),
  isBreaking: z.boolean().default(false),
  productId: z.string(),
});

router.get('/', async (req, res, next) => {
  try {
    const { productId } = req.query;
    const items = await prisma.api.findMany({
      where: productId ? { productId: String(productId) } : undefined,
      orderBy: { name: 'asc' },
    });
    res.json({ data: items });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const item = await prisma.api.findUnique({ where: { id: String(req.params.id) } });
    if (!item) throw new AppError(404, 'API bulunamadı');
    res.json({ data: item });
  } catch (err) { next(err); }
});

router.post('/', requireRole('ADMIN', 'RELEASE_MANAGER', 'DEVELOPER'), async (req, res, next) => {
  try {
    const data = schema.parse(req.body);
    const item = await prisma.api.create({ data });
    res.status(201).json({ data: item });
  } catch (err) { next(err); }
});

router.put('/:id', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const data = schema.partial().parse(req.body);
    const item = await prisma.api.update({ where: { id: String(req.params.id) }, data });
    res.json({ data: item });
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    await prisma.api.delete({ where: { id: String(req.params.id) } });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
