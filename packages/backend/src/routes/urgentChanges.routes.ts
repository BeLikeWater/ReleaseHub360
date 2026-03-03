import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';

const router = Router();
router.use(authenticateJWT);

const schema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  affectedProducts: z.array(z.string()).optional(),
  workaroundExists: z.boolean().default(false),
  customerImpact: z.string().optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const { status } = req.query;
    const items = await prisma.urgentChange.findMany({
      where: status ? { status: String(status).toUpperCase() } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: items });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const item = await prisma.urgentChange.findUnique({ where: { id: String(req.params.id) } });
    if (!item) throw new AppError(404, 'Kayıt bulunamadı');
    res.json({ data: item });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const data = schema.parse(req.body);
    const item = await prisma.urgentChange.create({ data: { ...data, requestedBy: req.user!.userId } });
    res.status(201).json({ data: item });
  } catch (err) { next(err); }
});

router.patch('/:id/status', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const { status } = z.object({ status: z.string() }).parse(req.body);
    const item = await prisma.urgentChange.update({ where: { id: String(req.params.id) }, data: { status } });
    res.json({ data: item });
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const existing = await prisma.urgentChange.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) throw new AppError(404, 'Kayıt bulunamadı');
    await prisma.urgentChange.delete({ where: { id: String(req.params.id) } });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
