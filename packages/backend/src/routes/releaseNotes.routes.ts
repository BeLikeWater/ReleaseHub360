import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateJWT } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';
import { decrypt } from '../lib/encryption';

// Helper: workitemId alanına sahip release note'ların ID kümesini döner (sayı olarak)
async function coveredWorkItemIds(productVersionId: string): Promise<Set<number>> {
  const rows = await prisma.releaseNote.findMany({
    where: { productVersionId, workitemId: { not: null } },
    select: { workitemId: true },
  });
  return new Set(rows.map(r => Number(r.workitemId)).filter(n => !isNaN(n)));
}

const router = Router();
router.use(authenticateJWT);

const noteSchema = z.object({
  productVersionId: z.string().uuid(),
  workitemId: z.string().optional().nullable(),
  category: z.enum(['FEATURE', 'BUG', 'SECURITY', 'BREAKING', 'PERFORMANCE', 'DEPRECATED']),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  isBreaking: z.boolean().default(false),
  sortOrder: z.number().int().optional(),
});

// GET /api/release-notes?versionId=x
router.get('/', async (req, res, next) => {
  try {
    const { versionId } = req.query;
    if (!versionId) throw new AppError(400, 'versionId gerekli');
    const notes = await prisma.releaseNote.findMany({
      where: { productVersionId: String(versionId) },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
    res.json({ data: notes });
  } catch (err) {
    next(err);
  }
});

// POST /api/release-notes
router.post('/', async (req, res, next) => {
  try {
    const data = noteSchema.parse(req.body);
    const note = await prisma.releaseNote.create({ data: { ...data, createdBy: req.user!.userId } });
    res.status(201).json({ data: note });
  } catch (err) {
    next(err);
  }
});

// PUT /api/release-notes/:id
router.put('/:id', async (req, res, next) => {
  try {
    const data = noteSchema.partial().parse(req.body);
    const note = await prisma.releaseNote.update({ where: { id: String(req.params.id) }, data });
    res.json({ data: note });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/release-notes/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.releaseNote.delete({ where: { id: String(req.params.id) } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /api/release-notes/trigger-generation
// Delta PR'lardan toplanan work item ID'leri için n8n üzerinden AI release note üretir.
// Zaten release note'u olan work item'ları atlar, yalnızca eksikleri n8n'e gönderir.
router.post('/trigger-generation', async (req, res, next) => {
  try {
    const body = z.object({
      versionId:   z.string().uuid(),
      productId:   z.string().uuid(),
      workItemIds: z.array(z.number().int()).min(1),
    }).parse(req.body);

    // Hangi work item'ların zaten release note'u var?
    const covered = await coveredWorkItemIds(body.versionId);
    const missingIds = body.workItemIds.filter(id => !covered.has(id));

    if (missingIds.length === 0) {
      res.json({ data: { triggered: false, message: 'Tüm work item\'lar için release note zaten mevcut.' } });
      return;
    }

    // Azure credentials ürün DB'sinden al
    const product = await prisma.product.findUnique({ where: { id: body.productId } });
    if (!product?.azureOrg || !product.azureProject || !product.azurePat) {
      throw new AppError(400, 'Azure credentials bulunamadı. Ürün Kataloğu\'ndan yapılandırın.');
    }

    const webhookUrl = process.env.N8N_RELEASE_NOTES_WEBHOOK_URL;
    if (!webhookUrl) throw new AppError(500, 'N8N_RELEASE_NOTES_WEBHOOK_URL ortam değişkeni tanımlı değil.');

    // JWT token'ı n8n'e ilet — n8n release note kaydetmek için backend'e geri çağıracak
    const token = (req.headers.authorization ?? '').replace('Bearer ', '');

    const payload = {
      versionId:           body.versionId,
      productId:           body.productId,
      missingWorkItemIds:  missingIds,
      azureOrg:            product.azureOrg,
      azureProject:        product.azureProject,
      azurePat:            product.azurePat ? decrypt(product.azurePat) : undefined,
      mcpServerUrl:        process.env.MCP_SERVER_URL  ?? 'http://localhost:8000',
      backendUrl:          process.env.BACKEND_URL     ?? 'http://localhost:3001',
      token,
    };

    // Fire-and-forget: backend hemen yanıt verir, n8n arka planda işler
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(err => console.error('[release-notes/trigger-generation] n8n webhook hatası:', err));

    res.json({
      data: {
        triggered:    true,
        missingCount: missingIds.length,
        missingIds,
        message:      `${missingIds.length} work item için release note üretimi başlatıldı. Birkaç dakika sonra sayfayı yenileyin.`,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/release-notes/by-version/:versionId
// Customer-accessible endpoint — verifies CPM access for CUSTOMER role
router.get('/by-version/:versionId', async (req, res, next) => {
  try {
    const user = req.user!;
    const versionId = String(req.params.versionId);

    const version = await prisma.productVersion.findUnique({
      where: { id: versionId },
      select: { id: true, version: true, productId: true },
    });
    if (!version) throw new AppError(404, 'Versiyon bulunamadı');

    // For CUSTOMER users: verify they have CPM access to this product
    if (user.userType === 'CUSTOMER') {
      if (!user.customerId) throw new AppError(403, 'Müşteri bağlantısı bulunamadı');
      const cpm = await prisma.customerProductMapping.findFirst({
        where: {
          customerId: user.customerId,
          isActive: true,
          OR: [
            // New CPMs: productId set directly
            { productId: version.productId },
            // Legacy CPMs: productId is null, check via productVersion's product
            { productVersion: { productId: version.productId } },
          ],
        },
      });
      if (!cpm) throw new AppError(403, 'Bu versiyona erişim yetkiniz yok');
    }

    const notes = await prisma.releaseNote.findMany({
      where: { productVersionId: versionId },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
    res.json({ data: notes, version: { id: version.id, version: version.version } });
  } catch (err) {
    next(err);
  }
});

export default router;
