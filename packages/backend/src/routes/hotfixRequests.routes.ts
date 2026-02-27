import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';

const router = Router();
router.use(authenticateJWT);

const hotfixSchema = z.object({
  productVersionId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().min(1),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  prUrl: z.string().url().optional().or(z.literal('')),
  branchName: z.string().optional(),
  customerImpact: z.string().optional(),
});

// GET /api/hotfix-requests
router.get('/', async (req, res, next) => {
  try {
    const { status } = req.query;
    const hotfixes = await prisma.hotfixRequest.findMany({
      where: status ? { status: String(status).toUpperCase() } : undefined,
      include: { productVersion: { include: { product: { select: { id: true, name: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: hotfixes });
  } catch (err) {
    next(err);
  }
});

// GET /api/hotfix-requests/:id
router.get('/:id', async (req, res, next) => {
  try {
    const hotfix = await prisma.hotfixRequest.findUnique({
      where: { id: String(req.params.id) },
      include: { productVersion: { include: { product: true } } },
    });
    if (!hotfix) throw new AppError(404, 'Hotfix talebi bulunamadı');
    res.json({ data: hotfix });
  } catch (err) {
    next(err);
  }
});

// POST /api/hotfix-requests
router.post('/', async (req, res, next) => {
  try {
    const data = hotfixSchema.parse(req.body);
    const hotfix = await prisma.hotfixRequest.create({
      data: { ...data, requestedBy: req.user!.userId },
    });
    res.status(201).json({ data: hotfix });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/hotfix-requests/:id/approve
router.patch('/:id/approve', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const { note } = z.object({ note: z.string().optional() }).parse(req.body);
    const hotfix = await prisma.hotfixRequest.update({
      where: { id: String(req.params.id) },
      data: {
        status: 'APPROVED',
        approvals: [{ userId: req.user!.userId, role: req.user!.role, note, timestamp: new Date().toISOString() }],
      },
    });
    res.json({ data: hotfix });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/hotfix-requests/:id/reject
router.patch('/:id/reject', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const { reason } = z.object({ reason: z.string().min(1) }).parse(req.body);
    const hotfix = await prisma.hotfixRequest.update({
      where: { id: String(req.params.id) },
      data: { status: 'REJECTED', rejectionReason: reason },
    });
    res.json({ data: hotfix });
  } catch (err) {
    next(err);
  }
});

export default router;
