import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticateJWT);

// GET /api/notifications
router.get('/', async (req, res, next) => {
  try {
    const { unread } = req.query;
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.userId, ...(unread === 'true' ? { isRead: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ data: notifications });
  } catch (err) {
    next(err);
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', async (req, res, next) => {
  try {
    const count = await prisma.notification.count({ where: { userId: req.user!.userId, isRead: false } });
    res.json({ data: { count } });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res, next) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: String(req.params.id) },
      data: { isRead: true, readAt: new Date() },
    });
    res.json({ data: notification });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    res.json({ data: { success: true } });
  } catch (err) {
    next(err);
  }
});

export default router;
