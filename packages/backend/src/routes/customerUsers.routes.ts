import { Router, Request, Response } from 'express';
import { PrismaClient, CustomerRole } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { authenticateJWT, requireRole, requireCustomerRole, resolveCustomerId } from '../middleware/auth.middleware';
import { sendInvitationEmail } from '../lib/mailer';

const router = Router();
const prisma = new PrismaClient();

const VALID_ROLES = Object.values(CustomerRole);

// All customer-user endpoints require authentication + ADMIN or RELEASE_MANAGER role
router.use(authenticateJWT);

// GET /api/customer-users?customerId=xxx
router.get('/', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.query;
    const users = await prisma.customerUser.findMany({
      where: customerId ? { customerId: String(customerId) } : {},
      select: {
        id: true, customerId: true, email: true, name: true,
        customerRole: true, isActive: true, lastLoginAt: true,
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
        customerRole: true, isActive: true, lastLoginAt: true,
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
router.post('/', requireRole('ADMIN', 'RELEASE_MANAGER', 'PRODUCT_OWNER'), async (req: Request, res: Response) => {
  try {
    const { customerId, email, name, customerRole, password } = req.body;
    if (!customerId || !email || !name) {
      return res.status(400).json({ error: 'customerId, email ve name zorunludur' });
    }

    // B1-05: Kurum kullanıcılarında da e-posta çakışması kontrolü
    const existingOrgUser = await prisma.user.findUnique({ where: { email } });
    if (existingOrgUser) {
      return res.status(409).json({ error: 'Bu e-posta adresi zaten sistemde kayıtlı.' });
    }

    const passwordHash = password ? await bcrypt.hash(String(password), 12) : null;

    // Generate invitation token when no password is provided upfront
    const invitationToken = !password ? crypto.randomBytes(32).toString('hex') : null;
    const invitationExpiry = invitationToken ? new Date(Date.now() + 48 * 60 * 60 * 1000) : null;

    const user = await prisma.customerUser.create({
      data: {
        customerId,
        email,
        name,
        customerRole: VALID_ROLES.includes(customerRole) ? customerRole : 'BUSINESS_USER',
        passwordHash,
        invitationToken,
        invitationExpiry,
      },
      select: {
        id: true, customerId: true, email: true, name: true,
        customerRole: true, isActive: true, createdAt: true,
      },
    });

    // Fire-and-forget invitation email when token was generated
    if (invitationToken) {
      sendInvitationEmail({ to: email, name, token: invitationToken }).catch(err =>
        console.error('[InvitationEmail] Failed to send:', err)
      );
    }

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
router.patch('/:id', requireRole('ADMIN', 'RELEASE_MANAGER', 'PRODUCT_OWNER'), async (req: Request, res: Response) => {
  try {
    const { name, customerRole, isActive, password } = req.body;
    const passwordHash = password ? await bcrypt.hash(String(password), 12) : undefined;

    const user = await prisma.customerUser.update({
      where: { id: String(req.params.id) },
      data: {
        ...(name !== undefined && { name }),
        ...(customerRole !== undefined && VALID_ROLES.includes(customerRole) && { customerRole }),
        ...(isActive !== undefined && { isActive }),
        ...(passwordHash !== undefined && { passwordHash }),
      },
      select: {
        id: true, customerId: true, email: true, name: true,
        customerRole: true, isActive: true, updatedAt: true,
      },
    });
    res.json({ data: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Kullanıcı güncellenemedi' });
  }
});

// DELETE /api/customer-users/:id
router.delete('/:id', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req: Request, res: Response) => {
  try {
    await prisma.customerUser.delete({ where: { id: String(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Kullanıcı silinemedi' });
  }
});

// ── B2-05: Müşteri Portal Route'ları ──────────────────────────────────────────
// Müşteri portalından CUSTOMER_ADMIN'in kendi müşterisindeki kullanıcıları yönetmesi

// GET /api/customer-users/portal/users
router.get('/portal/users', requireCustomerRole('CUSTOMER_ADMIN'), resolveCustomerId, async (req: Request, res: Response) => {
  try {
    const users = await prisma.customerUser.findMany({
      where: { customerId: req.customerId! },
      select: {
        id: true, email: true, name: true, customerRole: true,
        isActive: true, createdAt: true, lastLoginAt: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json({ data: users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Kullanıcılar alınamadı' });
  }
});

// POST /api/customer-users/portal/users
router.post('/portal/users', requireCustomerRole('CUSTOMER_ADMIN'), resolveCustomerId, async (req: Request, res: Response) => {
  try {
    const { email, name, customerRole, password } = req.body;
    if (!email || !name) {
      return res.status(400).json({ error: 'email ve name zorunludur' });
    }

    // CUSTOMER_ADMIN başka CUSTOMER_ADMIN oluşturamaz
    if (customerRole === 'CUSTOMER_ADMIN') {
      return res.status(403).json({ error: 'CUSTOMER_ADMIN rolünde kullanıcı oluşturamazsınız.' });
    }

    // Cross-table email check
    const existingOrg = await prisma.user.findUnique({ where: { email } });
    if (existingOrg) {
      return res.status(409).json({ error: 'Bu e-posta adresi zaten sistemde kayıtlı.' });
    }

    const passwordHash = password ? await bcrypt.hash(String(password), 12) : null;

    const user = await prisma.customerUser.create({
      data: {
        customerId: req.customerId!,
        email,
        name,
        customerRole: VALID_ROLES.includes(customerRole) ? customerRole : 'BUSINESS_USER',
        passwordHash,
      },
      select: {
        id: true, email: true, name: true, customerRole: true,
        isActive: true, createdAt: true,
      },
    });
    res.status(201).json({ data: user });
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === 'P2002') {
      return res.status(409).json({ error: 'Bu e-posta zaten kayıtlı' });
    }
    console.error(err);
    res.status(500).json({ error: 'Kullanıcı oluşturulamadı' });
  }
});

// PATCH /api/customer-users/portal/users/:id
router.patch('/portal/users/:id', requireCustomerRole('CUSTOMER_ADMIN'), resolveCustomerId, async (req: Request, res: Response) => {
  try {
    const targetId = String(req.params.id);

    // Hedef kullanıcının aynı müşteriye ait olduğunu doğrula
    const target = await prisma.customerUser.findUnique({ where: { id: targetId }, select: { customerId: true, customerRole: true } });
    if (!target || target.customerId !== req.customerId!) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    // CUSTOMER_ADMIN rolüne yükseltme engeli
    if (req.body.customerRole === 'CUSTOMER_ADMIN') {
      return res.status(403).json({ error: 'CUSTOMER_ADMIN rolüne yükseltemezsiniz.' });
    }

    const data: Record<string, unknown> = {};
    if (req.body.name) data.name = req.body.name;
    if (req.body.customerRole && VALID_ROLES.includes(req.body.customerRole)) data.customerRole = req.body.customerRole;
    if (req.body.isActive !== undefined) data.isActive = req.body.isActive;

    const user = await prisma.customerUser.update({
      where: { id: targetId },
      data,
      select: { id: true, email: true, name: true, customerRole: true, isActive: true },
    });
    res.json({ data: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Kullanıcı güncellenemedi' });
  }
});

// DELETE /api/customer-users/portal/users/:id
router.delete('/portal/users/:id', requireCustomerRole('CUSTOMER_ADMIN'), resolveCustomerId, async (req: Request, res: Response) => {
  try {
    const targetId = String(req.params.id);

    // Kendi kendini silme engeli
    if (req.user!.userId === targetId) {
      return res.status(400).json({ error: 'Kendi hesabınızı silemezsiniz.' });
    }

    // Hedef aynı müşteriye ait mi?
    const target = await prisma.customerUser.findUnique({ where: { id: targetId }, select: { customerId: true } });
    if (!target || target.customerId !== req.customerId!) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    await prisma.customerUser.delete({ where: { id: targetId } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Kullanıcı silinemedi' });
  }
});

export default router;
