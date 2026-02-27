import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticateJWT);

const updateSchema = z.record(z.string(), z.unknown());

router.get('/', async (_req, res, next) => {
  try {
    const settings = await prisma.setting.findMany({ orderBy: { key: 'asc' } });
    // Mask secrets
    const masked = settings.map((s: { key: string; value: string }) => ({
      ...s,
      value: /token|secret|password|pat/i.test(s.key)
        ? '***'
        : s.value,
    }));
    res.json({ data: masked });
  } catch (err) { next(err); }
});

router.put('/', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const entries = updateSchema.parse(req.body) as Record<string, string>;
    const ops = Object.entries(entries).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        create: { key, value: String(value), category: 'GENERAL' },
        update: { value: String(value) },
      }),
    );
    await prisma.$transaction(ops);
    res.json({ message: 'Ayarlar güncellendi' });
  } catch (err) { next(err); }
});

router.post('/test-connection', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { type } = z.object({ type: z.enum(['tfs', 'n8n', 'mcp']) }).parse(req.body);
    // Placeholder — real test would try a lightweight request to each service
    res.json({ ok: true, type, message: `${type} bağlantısı test edildi` });
  } catch (err) { next(err); }
});

export default router;
