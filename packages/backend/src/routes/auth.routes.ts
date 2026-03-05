import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateJWT, JwtPayload } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function generateTokens(payload: JwtPayload) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const signOpts = (exp: string): any => ({ expiresIn: exp });
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, signOpts(process.env.JWT_ACCESS_EXPIRES_IN ?? '15m'));
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, signOpts(process.env.JWT_REFRESH_EXPIRES_IN ?? '7d'));
  return { accessToken, refreshToken };
}

// POST /api/auth/login — Birleşik login: önce users, bulunamazsa customer_users
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // 1) Önce kurum kullanıcısı ara
    const user = await prisma.user.findUnique({ where: { email } });

    if (user && user.isActive) {
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) throw new AppError(401, 'E-posta veya şifre hatalı');

      const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role, name: user.name, userType: 'ORG' };
      const tokens = generateTokens(payload);

      res.json({
        data: {
          ...tokens,
          user: { id: user.id, email: user.email, name: user.name, role: user.role, userType: 'ORG' },
        },
      });
      return;
    }

    // 2) Kurum kullanıcısı bulunamadı — müşteri kullanıcısı ara
    const customerUser = await prisma.customerUser.findFirst({
      where: { email, isActive: true },
      include: { customer: { select: { id: true, name: true, code: true } } },
    });

    if (!customerUser) throw new AppError(401, 'E-posta veya şifre hatalı');
    if (!customerUser.passwordHash) throw new AppError(401, 'Şifre tanımlı değil, sistem yöneticisiyle iletişime geçin');

    const isCustomerMatch = await bcrypt.compare(password, customerUser.passwordHash);
    if (!isCustomerMatch) throw new AppError(401, 'E-posta veya şifre hatalı');

    const customerPayload: JwtPayload = {
      userId: customerUser.id,
      email: customerUser.email,
      role: customerUser.customerRole,
      name: customerUser.name,
      userType: 'CUSTOMER',
      customerId: customerUser.customerId,
    };
    const customerTokens = generateTokens(customerPayload);

    await prisma.customerUser.update({
      where: { id: customerUser.id },
      data: { lastLoginAt: new Date() },
    });

    res.json({
      data: {
        ...customerTokens,
        user: {
          id: customerUser.id,
          email: customerUser.email,
          name: customerUser.name,
          role: customerUser.customerRole,
          userType: 'CUSTOMER',
          customerId: customerUser.customerId,
          customerName: customerUser.customer.name,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as JwtPayload;
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });

    if (!user || !user.isActive) {
      throw new AppError(401, 'Geçersiz token');
    }

    const newPayload: JwtPayload = { userId: user.id, email: user.email, role: user.role, name: user.name, userType: 'ORG' };
    const { accessToken } = generateTokens(newPayload);
    res.json({ data: { accessToken } });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticateJWT, async (req, res, next) => {
  try {
    const { userType, userId, customerId } = req.user!;

    if (userType === 'CUSTOMER') {
      const cu = await prisma.customerUser.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, customerRole: true, customerId: true, isActive: true },
      });
      if (!cu) throw new AppError(404, 'Kullanıcı bulunamadı');
      res.json({ data: { ...cu, role: cu.customerRole, userType: 'CUSTOMER', customerId: customerId ?? cu.customerId } });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    if (!user) throw new AppError(404, 'Kullanıcı bulunamadı');
    res.json({ data: { ...user, userType: 'ORG' } });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/customer-login — @deprecated: Birleşik /login endpoint'ini kullanın
router.post('/customer-login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const customerUser = await prisma.customerUser.findFirst({
      where: { email, isActive: true },
      include: { customer: { select: { id: true, name: true, code: true } } },
    });

    if (!customerUser) throw new AppError(401, 'E-posta veya şifre hatalı');
    if (!customerUser.passwordHash) throw new AppError(401, 'Şifre tanımlı değil, sistem yöneticisiyle iletişime geçin');

    const isMatch = await bcrypt.compare(password, customerUser.passwordHash);
    if (!isMatch) throw new AppError(401, 'E-posta veya şifre hatalı');

    const payload: JwtPayload = {
      userId: customerUser.id,
      email: customerUser.email,
      role: customerUser.customerRole,
      name: customerUser.name,
      userType: 'CUSTOMER',
      customerId: customerUser.customerId,
    };
    const tokens = generateTokens(payload);

    // Update lastLoginAt
    await prisma.customerUser.update({
      where: { id: customerUser.id },
      data: { lastLoginAt: new Date() },
    });

    res.json({
      data: {
        ...tokens,
        user: {
          id: customerUser.id,
          email: customerUser.email,
          name: customerUser.name,
          role: customerUser.customerRole,
          userType: 'CUSTOMER',
          customerId: customerUser.customerId,
          customerName: customerUser.customer.name,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── B2-07: Yetki Matrisi ──────────────────────────────────────────────────────

const ORG_PERMISSION_MATRIX: Record<string, string[]> = {
  ADMIN: [
    'users.manage', 'users.invite', 'users.deactivate', 'users.changeRole',
    'products.manage', 'products.create', 'products.delete',
    'releases.manage', 'releases.create', 'releases.approve',
    'customers.manage', 'customers.create', 'customers.delete',
    'settings.manage', 'code-sync.manage',
    'health-check.view', 'health-check.release',
    'reports.view', 'metrics.view',
  ],
  RELEASE_MANAGER: [
    'products.manage', 'products.create',
    'releases.manage', 'releases.create', 'releases.approve',
    'customers.manage', 'customers.create',
    'health-check.view', 'health-check.release',
    'reports.view', 'metrics.view',
  ],
  PRODUCT_OWNER: [
    'products.view',
    'releases.view', 'releases.create',
    'customers.view',
    'health-check.view',
    'reports.view', 'metrics.view',
  ],
  DEVELOPER: [
    'products.view',
    'releases.view',
    'health-check.view',
    'reports.view',
  ],
  DEVOPS_ENGINEER: [
    'products.view',
    'releases.view',
    'code-sync.manage',
    'health-check.view',
    'metrics.view',
  ],
  QA_ENGINEER: [
    'products.view',
    'releases.view',
    'health-check.view',
    'reports.view',
  ],
  VIEWER: [
    'products.view',
    'releases.view',
    'reports.view',
  ],
};

const CUSTOMER_PERMISSION_MATRIX: Record<string, string[]> = {
  CUSTOMER_ADMIN: [
    'customer.users.manage', 'customer.users.invite',
    'customer.releases.view', 'customer.releases.approve',
    'customer.issues.create', 'customer.issues.view',
    'customer.calendar.view',
  ],
  APP_ADMIN: [
    'customer.releases.view', 'customer.releases.approve',
    'customer.issues.create', 'customer.issues.view',
    'customer.calendar.view',
  ],
  APPROVER: [
    'customer.releases.view', 'customer.releases.approve',
    'customer.issues.view',
    'customer.calendar.view',
  ],
  BUSINESS_USER: [
    'customer.releases.view',
    'customer.issues.create', 'customer.issues.view',
    'customer.calendar.view',
  ],
  PARTNER: [
    'customer.releases.view',
    'customer.calendar.view',
  ],
};

// GET /api/auth/roles/permissions
router.get('/roles/permissions', authenticateJWT, (_req, res) => {
  res.json({
    data: {
      org: ORG_PERMISSION_MATRIX,
      customer: CUSTOMER_PERMISSION_MATRIX,
    },
  });
});

// POST /api/auth/set-password
// Sets password via invitation/reset token for CustomerUser
router.post('/set-password', async (req, res, next) => {
  try {
    const { token, password } = z.object({
      token: z.string().min(1),
      password: z.string().min(8, 'Şifre en az 8 karakter olmalıdır'),
    }).parse(req.body);

    const customerUser = await prisma.customerUser.findUnique({
      where: { invitationToken: token },
      select: { id: true, invitationExpiry: true, name: true, email: true, customerId: true, customerRole: true },
    });

    if (!customerUser) {
      throw new AppError(400, 'Geçersiz veya kullanılmış token.');
    }
    if (customerUser.invitationExpiry && customerUser.invitationExpiry < new Date()) {
      throw new AppError(400, 'Bu bağlantının süresi dolmuş. Lütfen yöneticinizden yeni davet isteyin.');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.customerUser.update({
      where: { id: customerUser.id },
      data: {
        passwordHash,
        invitationToken: null,
        invitationExpiry: null,
        isActive: true,
      },
    });

    // Issue a JWT so the user is logged in immediately after setting password
    const secret = process.env.JWT_SECRET ?? process.env.ENCRYPTION_KEY ?? '';
    const accessToken = jwt.sign(
      {
        userId: customerUser.id,
        email: customerUser.email,
        role: customerUser.customerRole,
        name: customerUser.name,
        userType: 'CUSTOMER' as const,
        customerId: customerUser.customerId,
      } satisfies JwtPayload,
      secret,
      { expiresIn: '8h' }
    );

    res.json({
      data: {
        accessToken,
        user: {
          id: customerUser.id,
          name: customerUser.name,
          email: customerUser.email,
          userType: 'CUSTOMER',
          customerId: customerUser.customerId,
          customerRole: customerUser.customerRole,
        },
      },
    });
  } catch (err) { next(err); }
});

export default router;
