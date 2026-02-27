import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';

const router = Router();
router.use(authenticateJWT);

// ---------- ModuleGroups ----------

const groupSchema = z.object({
  name: z.string().min(1),
  productId: z.string(),
  description: z.string().optional(),
});

router.get('/groups', async (req, res, next) => {
  try {
    const { productId } = req.query;
    const items = await prisma.moduleGroup.findMany({
      where: productId ? { productId: String(productId) } : undefined,
      include: { modules: true },
      orderBy: { name: 'asc' },
    });
    res.json({ data: items });
  } catch (err) { next(err); }
});

router.post('/groups', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const data = groupSchema.parse(req.body);
    const item = await prisma.moduleGroup.create({ data });
    res.status(201).json({ data: item });
  } catch (err) { next(err); }
});

router.put('/groups/:id', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const data = groupSchema.partial().parse(req.body);
    const item = await prisma.moduleGroup.update({ where: { id: String(req.params.id) }, data });
    res.json({ data: item });
  } catch (err) { next(err); }
});

router.delete('/groups/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    await prisma.moduleGroup.delete({ where: { id: String(req.params.id) } });
    res.status(204).send();
  } catch (err) { next(err); }
});

// ---------- Modules ----------

const moduleSchema = z.object({
  name: z.string().min(1),
  productId: z.string(),
  moduleGroupId: z.string().optional(),
  description: z.string().optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const { groupId } = req.query;
    const items = await prisma.module.findMany({
      where: groupId ? { moduleGroupId: String(groupId) } : undefined,
      orderBy: { name: 'asc' },
    });
    res.json({ data: items });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const item = await prisma.module.findUnique({ where: { id: String(req.params.id) } });
    if (!item) throw new AppError(404, 'Modül bulunamadı');
    res.json({ data: item });
  } catch (err) { next(err); }
});

router.post('/', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const data = moduleSchema.parse(req.body);
    const item = await prisma.module.create({ data });
    res.status(201).json({ data: item });
  } catch (err) { next(err); }
});

router.put('/:id', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const data = moduleSchema.partial().parse(req.body);
    const item = await prisma.module.update({ where: { id: String(req.params.id) }, data });
    res.json({ data: item });
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    await prisma.module.delete({ where: { id: String(req.params.id) } });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
