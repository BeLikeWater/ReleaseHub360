import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateJWT } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';

const router = Router();
router.use(authenticateJWT);

// GET /api/workflow-history
router.get('/', async (req, res, next) => {
  try {
    const { status, workflowType, limit = '50', offset = '0' } = req.query;
    const where: Record<string, unknown> = {};
    if (status) where.status = String(status);
    if (workflowType) where.workflowType = String(workflowType);

    const [items, total] = await Promise.all([
      prisma.workflowHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.workflowHistory.count({ where }),
    ]);
    res.json({ data: items, total });
  } catch (err) { next(err); }
});

// GET /api/workflow-history/summary
router.get('/summary', async (_req, res, next) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [success, failed, pending] = await Promise.all([
      prisma.workflowHistory.count({ where: { status: 'SUCCESS', createdAt: { gte: sevenDaysAgo } } }),
      prisma.workflowHistory.count({ where: { status: 'FAILED', createdAt: { gte: sevenDaysAgo } } }),
      prisma.workflowHistory.count({ where: { status: 'PENDING' } }),
    ]);
    res.json({ data: { success, failed, pending } });
  } catch (err) { next(err); }
});

// GET /api/workflow-history/:id
router.get('/:id', async (req, res, next) => {
  try {
    const item = await prisma.workflowHistory.findUnique({ where: { id: String(req.params.id) } });
    if (!item) throw new AppError(404, 'Kayıt bulunamadı');
    res.json({ data: item });
  } catch (err) { next(err); }
});

// POST /api/workflow-history/:id/retry
router.post('/:id/retry', async (req, res, next) => {
  try {
    const item = await prisma.workflowHistory.findUnique({ where: { id: String(req.params.id) } });
    if (!item) throw new AppError(404, 'Kayıt bulunamadı');

    const N8N_BASE = process.env.N8N_URL ?? 'http://localhost:5678';
    const url = `${N8N_BASE}/webhook/retry`;
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowType: item.workflowType, payload: item.payload }),
      });
    } catch {
      // n8n may not be running in dev, just update status to PENDING
    }

    const updated = await prisma.workflowHistory.update({
      where: { id: String(req.params.id) },
      data: { status: 'PENDING', errorMessage: null },
    });
    res.json({ data: updated });
  } catch (err) { next(err); }
});

export default router;
