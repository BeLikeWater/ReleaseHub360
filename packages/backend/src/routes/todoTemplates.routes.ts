import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';

const router = Router();
router.use(authenticateJWT);

const templateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const itemSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(['TECHNICAL', 'OPERATIONAL', 'COMMUNICATION', 'APPROVAL']).default('TECHNICAL'),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).default('P1'),
  timing: z.enum(['PRE', 'DURING', 'POST']).default('PRE'),
  sortOrder: z.number().int().default(0),
});

// ─── Templates CRUD ──────────────────────────────────────────────────────────

// GET /api/todo-templates
router.get('/', async (_req, res, next) => {
  try {
    const templates = await prisma.todoTemplate.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: { select: { items: true } },
      },
    });
    res.json({ data: templates });
  } catch (err) {
    next(err);
  }
});

// GET /api/todo-templates/:id
router.get('/:id', async (req, res, next) => {
  try {
    const template = await prisma.todoTemplate.findUnique({
      where: { id: String(req.params.id) },
      include: {
        items: { orderBy: [{ category: 'asc' }, { priority: 'asc' }, { sortOrder: 'asc' }] },
      },
    });
    if (!template) throw new AppError(404, 'Şablon bulunamadı');
    res.json({ data: template });
  } catch (err) {
    next(err);
  }
});

// POST /api/todo-templates
router.post('/', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const data = templateSchema.parse(req.body);
    const template = await prisma.todoTemplate.create({ data });
    res.status(201).json({ data: template });
  } catch (err) {
    next(err);
  }
});

// PUT /api/todo-templates/:id
router.put('/:id', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const data = templateSchema.partial().parse(req.body);
    const template = await prisma.todoTemplate.update({
      where: { id: String(req.params.id) },
      data,
    });
    res.json({ data: template });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/todo-templates/:id — itemi de cascade siler (onDelete: SetNull varsa manuel sil)
router.delete('/:id', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    // Önce template item'larını sil (isTemplate: true olanlar)
    await prisma.releaseTodo.deleteMany({ where: { templateId: id, isTemplate: true } });
    await prisma.todoTemplate.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ─── Template Items CRUD ─────────────────────────────────────────────────────

// GET /api/todo-templates/:id/items
router.get('/:id/items', async (req, res, next) => {
  try {
    const items = await prisma.releaseTodo.findMany({
      where: { templateId: String(req.params.id), isTemplate: true },
      orderBy: [{ category: 'asc' }, { priority: 'asc' }, { sortOrder: 'asc' }],
    });
    res.json({ data: items });
  } catch (err) {
    next(err);
  }
});

// POST /api/todo-templates/:id/items
router.post('/:id/items', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const template = await prisma.todoTemplate.findUnique({ where: { id: String(req.params.id) } });
    if (!template) throw new AppError(404, 'Şablon bulunamadı');

    const data = itemSchema.parse(req.body);
    const item = await prisma.releaseTodo.create({
      data: {
        ...data,
        templateId: template.id,
        isTemplate: true,
      },
    });
    res.status(201).json({ data: item });
  } catch (err) {
    next(err);
  }
});

// PUT /api/todo-templates/:id/items/:itemId
router.put('/:id/items/:itemId', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const data = itemSchema.partial().parse(req.body);
    const item = await prisma.releaseTodo.update({
      where: { id: String(req.params.itemId) },
      data,
    });
    res.json({ data: item });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/todo-templates/:id/items/:itemId
router.delete('/:id/items/:itemId', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    await prisma.releaseTodo.delete({ where: { id: String(req.params.itemId) } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ─── Apply Template to Version ───────────────────────────────────────────────

// POST /api/todo-templates/:id/apply  body: { versionId: string }
router.post('/:id/apply', requireRole('ADMIN', 'RELEASE_MANAGER', 'DEVELOPER'), async (req, res, next) => {
  try {
    const { versionId } = z.object({ versionId: z.string().uuid() }).parse(req.body);
    const templateId = String(req.params.id);

    const template = await prisma.todoTemplate.findUnique({
      where: { id: templateId },
      include: { items: true },
    });
    if (!template) throw new AppError(404, 'Şablon bulunamadı');

    const version = await prisma.productVersion.findUnique({ where: { id: versionId } });
    if (!version) throw new AppError(404, 'Versiyon bulunamadı');

    // Şablon item'larını versiyona kopyala
    const created = await prisma.$transaction(
      template.items.map((item) =>
        prisma.releaseTodo.create({
          data: {
            productVersionId: versionId,
            templateId: templateId,
            title: item.title,
            description: item.description,
            category: item.category,
            priority: item.priority,
            phase: item.phase,
            sortOrder: item.sortOrder,
            isTemplate: false,
          },
        })
      )
    );

    res.status(201).json({ data: created, count: created.length });
  } catch (err) {
    next(err);
  }
});

export default router;
