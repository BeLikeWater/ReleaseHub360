import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';

const router = Router();
router.use(authenticateJWT);

const schema = z.object({
  customerId: z.string(),
  productVersionId: z.string(),
  branch: z.string().optional().nullable(),
  environment: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  subscriptionLevel: z.enum(['FULL', 'MODULE_GROUP', 'MODULE', 'SERVICE']).optional().nullable(),
  subscribedModuleGroupIds: z.array(z.string()).optional(),
  subscribedModuleIds: z.array(z.string()).optional(),
  subscribedServiceIds: z.array(z.string()).optional(),
  artifactType: z.enum(['DOCKER', 'BINARY', 'GIT_SYNC']).optional().nullable(),
  deploymentModel: z.enum(['SAAS', 'ON_PREM']).optional().nullable(),
  hostingType: z.enum(['IAAS', 'SELF_HOSTED']).optional().nullable(),
  helmChartTemplateName: z.string().optional().nullable(),
  helmValuesOverrides: z.any().optional().nullable(),
  helmRepoUrl: z.string().optional().nullable(),
  environments: z.array(z.string()).optional(),
});

// GET /api/customer-product-mappings
router.get('/', async (req, res, next) => {
  try {
    const { customerId, productVersionId } = req.query;
    const items = await prisma.customerProductMapping.findMany({
      where: {
        ...(customerId ? { customerId: String(customerId) } : {}),
        ...(productVersionId ? { productVersionId: String(productVersionId) } : {}),
      },
      include: {
        customer: { select: { id: true, name: true, code: true } },
        productVersion: {
          select: {
            id: true, version: true, phase: true,
            product: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: items });
  } catch (err) { next(err); }
});

// GET /api/customer-product-mappings/:id
router.get('/:id', async (req, res, next) => {
  try {
    const item = await prisma.customerProductMapping.findUnique({
      where: { id: String(req.params.id) },
      include: {
        customer: { select: { id: true, name: true, code: true } },
        productVersion: {
          select: {
            id: true, version: true, phase: true,
            product: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!item) throw new AppError(404, 'Eşleme bulunamadı');
    res.json({ data: item });
  } catch (err) { next(err); }
});

// ─── Helper: GIT_SYNC CPM kaydedilince CustomerBranch otomatik oluştur ────────
async function ensureCustomerBranch(customerId: string, productId: string, branchName: string) {
  // Ürünün servislerini bul (repoName eşleştirmek için)
  const services = await prisma.service.findMany({
    where: { productId, repoName: { not: null } },
    select: { repoName: true },
  });

  if (services.length > 0) {
    // Her servisin repoName'i ile eşleşen CustomerBranch kaydı yoksa oluştur
    for (const svc of services) {
      const exists = await prisma.customerBranch.findFirst({
        where: { customerId, branchName, repoName: svc.repoName! },
      });
      if (!exists) {
        await prisma.customerBranch.create({
          data: { customerId, branchName, repoName: svc.repoName! },
        });
      }
    }
  } else {
    // Servis repoName'i yoksa repoName'siz oluştur
    const exists = await prisma.customerBranch.findFirst({
      where: { customerId, branchName, repoName: null },
    });
    if (!exists) {
      await prisma.customerBranch.create({ data: { customerId, branchName } });
    }
  }
}

// POST /api/customer-product-mappings
router.post('/', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const data = schema.parse(req.body);
    // productId: productVersionId üzerinden otomatik türet
    const pv = await prisma.productVersion.findUnique({
      where: { id: data.productVersionId },
      select: { productId: true },
    });
    if (!pv) throw new AppError(404, 'Ürün versiyonu bulunamadı');
    const item = await prisma.customerProductMapping.create({
      data: { ...data, productId: pv.productId },
      include: {
        customer: { select: { id: true, name: true, code: true } },
        productVersion: {
          select: {
            id: true, version: true, phase: true,
            product: { select: { id: true, name: true } },
          },
        },
      },
    });

    // GIT_SYNC + branch doluysa CustomerBranch kaydını otomatik oluştur
    if (item.artifactType === 'GIT_SYNC' && item.branch) {
      await ensureCustomerBranch(item.customerId, pv.productId, item.branch);
    }

    res.status(201).json({ data: item });
  } catch (err) { next(err); }
});

// PUT /api/customer-product-mappings/:id
router.put('/:id', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const data = schema.partial().parse(req.body);
    const item = await prisma.customerProductMapping.update({
      where: { id: String(req.params.id) },
      data,
      include: {
        customer: { select: { id: true, name: true, code: true } },
        productVersion: {
          select: {
            id: true, version: true, phase: true,
            product: { select: { id: true, name: true } },
          },
        },
      },
    });

    // GIT_SYNC + branch doluysa CustomerBranch kaydını otomatik oluştur/tamamla
    if (item.artifactType === 'GIT_SYNC' && item.branch) {
      await ensureCustomerBranch(item.customerId, item.productId, item.branch);
    }

    res.json({ data: item });
  } catch (err) { next(err); }
});

// DELETE /api/customer-product-mappings/:id
router.delete('/:id', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const item = await prisma.customerProductMapping.findUnique({ where: { id: String(req.params.id) } });
    if (!item) throw new AppError(404, 'Eşleme bulunamadı');
    await prisma.customerProductMapping.delete({ where: { id: String(req.params.id) } });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
