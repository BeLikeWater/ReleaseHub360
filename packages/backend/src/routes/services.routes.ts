import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';

const router = Router();
router.use(authenticateJWT);

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  productId: z.string(),
  moduleId: z.string().optional().nullable(),
  repoName: z.string().optional(),
  repoUrl: z.string().optional(),
  pipelineName: z.string().optional(),
  serviceImageName: z.string().optional(),
  currentVersion: z.string().optional(),
  currentVersionCreatedAt: z.string().datetime().optional().nullable(),
  releaseName: z.string().optional(),
  releaseStage: z.string().optional().nullable(),
  lastReleaseName: z.string().optional().nullable(),
  port: z.number().int().optional().nullable(),
  isActive: z.boolean().optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const { productId, moduleId } = req.query;
    const where: Record<string, unknown> = {};
    if (productId) where.productId = String(productId);
    if (moduleId) where.moduleId = String(moduleId);
    const items = await prisma.service.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { name: 'asc' },
    });
    res.json({ data: items });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const item = await prisma.service.findUnique({ where: { id: String(req.params.id) } });
    if (!item) throw new AppError(404, 'Servis bulunamadı');
    res.json({ data: item });
  } catch (err) { next(err); }
});

router.post('/', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const data = schema.parse(req.body);
    const item = await prisma.service.create({
      data: {
        ...data,
        currentVersionCreatedAt: data.currentVersionCreatedAt
          ? new Date(data.currentVersionCreatedAt)
          : undefined,
      },
    });
    res.status(201).json({ data: item });
  } catch (err) { next(err); }
});

router.put('/:id', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const data = schema.partial().parse(req.body);
    const item = await prisma.service.update({
      where: { id: String(req.params.id) },
      data: {
        ...data,
        currentVersionCreatedAt: data.currentVersionCreatedAt
          ? new Date(data.currentVersionCreatedAt)
          : data.currentVersionCreatedAt === null ? null : undefined,
      },
    });
    res.json({ data: item });
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    await prisma.service.delete({ where: { id: String(req.params.id) } });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
