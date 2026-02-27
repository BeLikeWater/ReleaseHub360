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
  changeType: z.string().min(1),
  isBreaking: z.boolean().default(false),
  productVersionId: z.string().optional(),
  apiPath: z.string().optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const { versionId } = req.query;
    const items = await prisma.systemChange.findMany({
      where: versionId ? { productVersionId: String(versionId) } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: items });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const item = await prisma.systemChange.findUnique({ where: { id: String(req.params.id) } });
    if (!item) throw new AppError(404, 'Kayıt bulunamadı');
    res.json({ data: item });
  } catch (err) { next(err); }
});

router.get('/:id/affected-customers', async (req, res, next) => {
  try {
    const item = await prisma.systemChange.findUnique({ where: { id: String(req.params.id) } });
    if (!item) throw new AppError(404, 'Kayıt bulunamadı');
    // TODO: resolve affected customers from productVersionId → customerProductMappings
    res.json({ data: [] });
  } catch (err) { next(err); }
});

router.post('/', requireRole('ADMIN', 'RELEASE_MANAGER', 'DEVELOPER'), async (req, res, next) => {
  try {
    const data = schema.parse(req.body);
    const item = await prisma.systemChange.create({ data });
    res.status(201).json({ data: item });
  } catch (err) { next(err); }
});

router.put('/:id', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const data = schema.partial().parse(req.body);
    const item = await prisma.systemChange.update({ where: { id: String(req.params.id) }, data });
    res.json({ data: item });
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    await prisma.systemChange.delete({ where: { id: String(req.params.id) } });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
