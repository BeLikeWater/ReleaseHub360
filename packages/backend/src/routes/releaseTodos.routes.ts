import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateJWT } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';

const router = Router();
router.use(authenticateJWT);

const createSchema = z.object({
  productVersionId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(['TECHNICAL', 'OPERATIONAL', 'COMMUNICATION', 'APPROVAL']).optional(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
  timing: z.enum(['PRE', 'DURING', 'POST']).optional(),
  sortOrder: z.number().int().optional(),
});

const patchSchema = z.object({
  isCompleted: z.boolean().optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.enum(['TECHNICAL', 'OPERATIONAL', 'COMMUNICATION', 'APPROVAL']).optional(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
  timing: z.enum(['PRE', 'DURING', 'POST']).optional(),
  sortOrder: z.number().int().optional(),
});

// GET /api/release-todos?versionId=x
router.get('/', async (req, res, next) => {
  try {
    const { versionId } = req.query;
    if (!versionId) throw new AppError(400, 'versionId gerekli');
    const todos = await prisma.releaseTodo.findMany({
      where: { productVersionId: String(versionId) },
      orderBy: [{ timing: 'asc' }, { priority: 'asc' }, { sortOrder: 'asc' }],
    });
    res.json({ data: todos });
  } catch (err) {
    next(err);
  }
});

// POST /api/release-todos — create a version-specific todo
router.post('/', async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const todo = await prisma.releaseTodo.create({ data: { ...data, isTemplate: false } });
    res.status(201).json({ data: todo });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/release-todos/:id — toggle completion or update fields
router.patch('/:id', async (req, res, next) => {
  try {
    const patch = patchSchema.parse(req.body);
    const dataUpdate: Record<string, unknown> = { ...patch };

    if (patch.isCompleted !== undefined) {
      dataUpdate.completedBy = patch.isCompleted ? req.user!.userId : null;
      dataUpdate.completedAt = patch.isCompleted ? new Date() : null;
    }

    const todo = await prisma.releaseTodo.update({
      where: { id: String(req.params.id) },
      data: dataUpdate,
    });
    res.json({ data: todo });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/release-todos/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.releaseTodo.delete({ where: { id: String(req.params.id) } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
