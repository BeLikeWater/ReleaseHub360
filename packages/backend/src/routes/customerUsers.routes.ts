import { Router, Request, Response } from 'express';
import { PrismaClient, CustomerRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const router = Router();
const prisma = new PrismaClient();

const VALID_ROLES = Object.values(CustomerRole);

// GET /api/customer-users?customerId=xxx
router.get('/', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.query;
    const users = await prisma.customerUser.findMany({
      where: customerId ? { customerId: String(customerId) } : {},
      select: {
        id: true, customerId: true, email: true, name: true,
        role: true, isActive: true, lastLoginAt: true,
        createdAt: true, updatedAt: true,
        customer: { select: { id: true, name: true, code: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json({ data: users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Kullanıcı listesi alınamadı' });
  }
});

// GET /api/customer-users/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = await prisma.customerUser.findUnique({
      where: { id: String(req.params.id) },
      select: {
        id: true, customerId: true, email: true, name: true,
        role: true, isActive: true, lastLoginAt: true,
        createdAt: true, updatedAt: true,
        customer: { select: { id: true, name: true, code: true } },
      },
    });
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    res.json({ data: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Kullanıcı alınamadı' });
  }
});

// POST /api/customer-users
router.post('/', async (req: Request, res: Response) => {
  try {
    const { customerId, email, name, role, password } = req.body;
    if (!customerId || !email || !name) {
      return res.status(400).json({ error: 'customerId, email ve name zorunludur' });
    }

    const passwordHash = password ? await bcrypt.hash(String(password), 12) : null;

    const user = await prisma.customerUser.create({
      data: {
        customerId,
        email,
        name,
        role: VALID_ROLES.includes(role) ? role : 'VIEWER',
        passwordHash,
      },
      select: {
        id: true, customerId: true, email: true, name: true,
        role: true, isActive: true, createdAt: true,
      },
    });
    res.status(201).json({ data: user });
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === 'P2002') {
      return res.status(409).json({ error: 'Bu müşteri için bu e-posta zaten kayıtlı' });
    }
    console.error(err);
    res.status(500).json({ error: 'Kullanıcı oluşturulamadı' });
  }
});

// PATCH /api/customer-users/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { name, role, isActive, password } = req.body;
    const passwordHash = password ? await bcrypt.hash(String(password), 12) : undefined;

    const user = await prisma.customerUser.update({
      where: { id: String(req.params.id) },
      data: {
        ...(name !== undefined && { name }),
        ...(role !== undefined && VALID_ROLES.includes(role) && { role }),
        ...(isActive !== undefined && { isActive }),
        ...(passwordHash !== undefined && { passwordHash }),
      },
      select: {
        id: true, customerId: true, email: true, name: true,
        role: true, isActive: true, updatedAt: true,
      },
    });
    res.json({ data: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Kullanıcı güncellenemedi' });
  }
});

// DELETE /api/customer-users/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.customerUser.delete({ where: { id: String(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Kullanıcı silinemedi' });
  }
});

export default router;
