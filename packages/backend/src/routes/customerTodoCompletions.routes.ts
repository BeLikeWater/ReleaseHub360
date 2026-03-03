/**
 * Customer Todo Completions
 *
 * Müşteri kullanıcıların versiyon geçişlerine ait todo'ları
 * tamamlayıp/geri alabildiği endpoint.
 *
 * GET  /api/customer-todo-completions?customerId=&versionId=
 *   → todo'ların completion durumu + todo detayları
 *
 * PATCH /api/customer-todo-completions
 *   Body: { todoId, versionId, completed, notes? }
 *   → upsert CustomerTodoCompletion kaydı
 *   → CUSTOMER rolü: customerId JWT'den alınır
 *   → ORG rolü: body'den customerId alınır (ADMIN/RELEASE_MANAGER)
 */
import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateJWT } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';

const router = Router();
router.use(authenticateJWT);

const upsertSchema = z.object({
  todoId: z.string().uuid(),
  versionId: z.string().uuid(),
  customerId: z.string().uuid().optional(), // ORG users only
  completed: z.boolean(),
  notes: z.string().optional().nullable(),
});

// GET /api/customer-todo-completions?customerId=&versionId=
// Todos linked to a version, enriched with completion status for target customer
router.get('/', async (req, res, next) => {
  try {
    const user = req.user!;
    const { versionId, customerId: qCustomerId } = req.query;

    if (!versionId) throw new AppError(400, 'versionId gerekli');

    // Resolve effective customerId
    let customerId: string;
    if (user.userType === 'CUSTOMER') {
      if (!user.customerId) throw new AppError(403, 'Müşteri bağlantısı bulunamadı');
      customerId = user.customerId;
    } else {
      if (!qCustomerId) throw new AppError(400, 'customerId gerekli');
      customerId = String(qCustomerId);
    }

    // Fetch todos for this version
    const todos = await prisma.releaseTodo.findMany({
      where: { productVersionId: String(versionId) },
      orderBy: [{ timing: 'asc' }, { sortOrder: 'asc' }, { priority: 'asc' }],
    });

    // Fetch completion records for this customer + version
    const completions = await prisma.customerTodoCompletion.findMany({
      where: { customerId, versionId: String(versionId) },
    });

    const completionMap = new Map(completions.map(c => [c.todoId, c]));

    // Merge todos with completion status
    const data = todos.map(todo => ({
      ...todo,
      completion: completionMap.get(todo.id) ?? null,
    }));

    // Summary stats
    const total = todos.length;
    const completed = completions.filter(c => c.completed).length;
    const p0Incomplete = todos.filter(t => t.priority === 'P0' && !completionMap.get(t.id)?.completed).length;

    res.json({ data, summary: { total, completed, p0Incomplete } });
  } catch (err) { next(err); }
});

// PATCH /api/customer-todo-completions
// Upsert a single todo's completion status for current customer
router.patch('/', async (req, res, next) => {
  try {
    const user = req.user!;
    const parsed = upsertSchema.parse(req.body);

    // Resolve customerId
    let customerId: string;
    if (user.userType === 'CUSTOMER') {
      if (!user.customerId) throw new AppError(403, 'Müşteri bağlantısı bulunamadı');
      customerId = user.customerId;
    } else {
      if (!parsed.customerId) throw new AppError(400, 'customerId gerekli');
      customerId = parsed.customerId;
    }

    // Validate todo + version exist
    const [todo, version] = await Promise.all([
      prisma.releaseTodo.findUnique({ where: { id: parsed.todoId } }),
      prisma.productVersion.findUnique({ where: { id: parsed.versionId } }),
    ]);
    if (!todo) throw new AppError(404, 'Todo bulunamadı');
    if (!version) throw new AppError(404, 'Versiyon bulunamadı');

    const now = new Date();
    const record = await prisma.customerTodoCompletion.upsert({
      where: {
        todoId_customerId_versionId: {
          todoId: parsed.todoId,
          customerId,
          versionId: parsed.versionId,
        },
      },
      update: {
        completed: parsed.completed,
        completedAt: parsed.completed ? now : null,
        completedBy: parsed.completed ? (user.name ?? user.email) : null,
        notes: parsed.notes ?? undefined,
      },
      create: {
        todoId: parsed.todoId,
        customerId,
        versionId: parsed.versionId,
        completed: parsed.completed,
        completedAt: parsed.completed ? now : null,
        completedBy: parsed.completed ? (user.name ?? user.email) : null,
        notes: parsed.notes ?? undefined,
      },
    });

    res.json({ data: record });
  } catch (err) { next(err); }
});

export default router;
