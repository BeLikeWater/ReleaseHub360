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
      role: z.string().default('DEVELOPER'),
      password: z.string().min(6).default('changeme123'),
    }).parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError(409, 'Bu e-posta zaten kayıtlı');

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
    const { role } = z.object({ role: z.string() }).parse(req.body);
    const user = await prisma.user.update({
      where: { id: String(req.params.id) },
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
    const user = await prisma.user.update({
      where: { id: String(req.params.id) },
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
    if (req.user!.userId === String(req.params.id)) throw new AppError(400, 'Kendi hesabınızı silemezsiniz');
    await prisma.user.delete({ where: { id: String(req.params.id) } });
    res.json({ data: { message: 'Kullanıcı silindi' } });
  } catch (err) { next(err); }
});

export default router;
