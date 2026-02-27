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

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      throw new AppError(401, 'E-posta veya şifre hatalı');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError(401, 'E-posta veya şifre hatalı');
    }

    const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role, name: user.name };
    const tokens = generateTokens(payload);

    res.json({
      data: {
        ...tokens,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
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

    const newPayload: JwtPayload = { userId: user.id, email: user.email, role: user.role, name: user.name };
    const { accessToken } = generateTokens(newPayload);
    res.json({ data: { accessToken } });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticateJWT, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    if (!user) throw new AppError(404, 'Kullanıcı bulunamadı');
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
});

export default router;
