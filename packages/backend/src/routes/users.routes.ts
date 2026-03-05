import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';
import bcrypt from 'bcrypt';

const router = Router();
router.use(authenticateJWT);

// GET /api/users
router.get('/', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
      orderBy: { name: 'asc' },
    });
    res.json({ data: users });
  } catch (err) { next(err); }
});

// GET /api/users/:id
router.get('/:id', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: String(req.params.id) },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    });
    if (!user) throw new AppError(404, 'Kullanıcı bulunamadı');
    res.json({ data: user });
  } catch (err) { next(err); }
});

// POST /api/users (create/invite)
router.post('/', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { email, name, role, password } = z.object({
      email: z.string().email(),
      name: z.string().min(1),
      role: z.enum(['ADMIN', 'RELEASE_MANAGER', 'PRODUCT_OWNER', 'DEVELOPER', 'DEVOPS_ENGINEER', 'QA_ENGINEER', 'VIEWER']).default('DEVELOPER'),
      password: z.string().min(6).default('changeme123'),
    }).parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError(409, 'Bu e-posta zaten kayıtlı');

    // B1-05: Müşteri kullanıcılarında da e-posta çakışması kontrolü
    const existingCustomer = await prisma.customerUser.findFirst({ where: { email } });
    if (existingCustomer) throw new AppError(409, 'Bu e-posta adresi zaten sistemde kayıtlı.');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, name, role, passwordHash },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    });
    res.status(201).json({ data: user });
  } catch (err) { next(err); }
});

// PATCH /api/users/:id/role
router.patch('/:id/role', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { role } = z.object({ role: z.enum(['ADMIN', 'RELEASE_MANAGER', 'PRODUCT_OWNER', 'DEVELOPER', 'DEVOPS_ENGINEER', 'QA_ENGINEER', 'VIEWER']) }).parse(req.body);
    const targetId = String(req.params.id);

    // B1-06: Son ADMIN koruması — rol ADMIN'den başka bir şeye değiştiriliyorsa
    if (role !== 'ADMIN') {
      const targetUser = await prisma.user.findUnique({ where: { id: targetId }, select: { role: true } });
      if (targetUser?.role === 'ADMIN') {
        const adminCount = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } });
        if (adminCount <= 1) throw new AppError(400, 'Son yönetici hesabı kaldırılamaz.');
      }
    }

    const user = await prisma.user.update({
      where: { id: targetId },
      data: { role },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
    res.json({ data: user });
  } catch (err) { next(err); }
});

// PATCH /api/users/:id/status
router.patch('/:id/status', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
    const targetId = String(req.params.id);

    // B2-06: Self-deactivation engeli
    if (!isActive && req.user!.userId === targetId) {
      throw new AppError(400, 'Kendi hesabınızı deaktive edemezsiniz.');
    }

    // B1-06: Son ADMIN koruması — deaktive ediliyorsa
    if (!isActive) {
      const targetUser = await prisma.user.findUnique({ where: { id: targetId }, select: { role: true } });
      if (targetUser?.role === 'ADMIN') {
        const adminCount = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } });
        if (adminCount <= 1) throw new AppError(400, 'Son yönetici hesabı kaldırılamaz.');
      }
    }

    const user = await prisma.user.update({
      where: { id: targetId },
      data: { isActive },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
    res.json({ data: user });
  } catch (err) { next(err); }
});

// PATCH /api/users/:id/password
router.patch('/:id/password', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { password } = z.object({ password: z.string().min(6) }).parse(req.body);
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: String(req.params.id) }, data: { passwordHash } });
    res.json({ data: { message: 'Şifre güncellendi' } });
  } catch (err) { next(err); }
});

// DELETE /api/users/:id
router.delete('/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const targetId = String(req.params.id);
    // B2-06: Self-deletion engeli
    if (req.user!.userId === targetId) throw new AppError(400, 'Kendi hesabınızı silemezsiniz.');

    // B1-06: Son ADMIN koruması
    const targetUser = await prisma.user.findUnique({ where: { id: targetId }, select: { role: true } });
    if (targetUser?.role === 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } });
      if (adminCount <= 1) throw new AppError(400, 'Son yönetici hesabı kaldırılamaz.');
    }

    await prisma.user.delete({ where: { id: targetId } });
    res.json({ data: { message: 'Kullanıcı silindi' } });
  } catch (err) { next(err); }
});

// ── B2-04: Ürün Erişimi CRUD ──────────────────────────────────────────────────

// GET /api/users/:id/product-access
router.get('/:id/product-access', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const accesses = await prisma.userProductAccess.findMany({
      where: { userId: String(req.params.id) },
      select: { productId: true, product: { select: { id: true, name: true } } },
    });
    res.json({ data: accesses });
  } catch (err) { next(err); }
});

// PUT /api/users/:id/product-access (toplu güncelle — productId array gönder)
router.put('/:id/product-access', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { productIds } = z.object({ productIds: z.array(z.string()) }).parse(req.body);
    const userId = String(req.params.id);

    // Kullanıcının varlığını kontrol et
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new AppError(404, 'Kullanıcı bulunamadı');

    // Transaction: mevcut erişimleri sil, yenilerini ekle
    await prisma.$transaction([
      prisma.userProductAccess.deleteMany({ where: { userId } }),
      ...productIds.map((productId) =>
        prisma.userProductAccess.create({ data: { userId, productId } })
      ),
    ]);

    const updatedAccesses = await prisma.userProductAccess.findMany({
      where: { userId },
      select: { productId: true, product: { select: { id: true, name: true } } },
    });
    res.json({ data: updatedAccesses });
  } catch (err) { next(err); }
});

export default router;
