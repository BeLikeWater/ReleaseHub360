import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticateJWT);

router.get('/summary', async (_req, res, next) => {
  try {
    const [
      totalProducts,
      totalCustomers,
      pendingHotfixes,
      activeVersions,
      unreadNotificationsCount,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.customer.count(),
      prisma.hotfixRequest.count({ where: { status: 'PENDING' } }),
      prisma.productVersion.count({ where: { phase: { notIn: ['ARCHIVED'] } } }),
      prisma.notification.count({ where: { isRead: false } }),
    ]);

    res.json({
      data: {
        totalProducts,
        totalCustomers,
        pendingHotfixes,
        activeVersions,
        unreadNotificationsCount,
      },
    });
  } catch (err) { next(err); }
});

router.get('/pending-actions', async (req, res, next) => {
  try {
    const role = req.user!.role;
    const actions: { type: string; id: string; label: string }[] = [];

    if (role === 'ADMIN' || role === 'RELEASE_MANAGER') {
      const pendingHotfixes = await prisma.hotfixRequest.findMany({
        where: { status: 'PENDING' },
        select: { id: true, title: true },
      });
      pendingHotfixes.forEach((h: { id: string; title: string }) => actions.push({ type: 'hotfix', id: h.id, label: h.title }));
    }

    const incompleteTodos = await prisma.releaseTodo.findMany({
      where: { isCompleted: false },
      select: { id: true, title: true },
      take: 10,
    });
    incompleteTodos.forEach((t: { id: string; title: string }) => actions.push({ type: 'todo', id: t.id, label: t.title }));

    res.json({ data: actions });
  } catch (err) { next(err); }
});

export default router;
