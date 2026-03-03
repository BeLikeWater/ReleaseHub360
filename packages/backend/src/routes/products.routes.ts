import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';
import { encryptIfNeeded, mask } from '../lib/encryption';

const router = Router();
router.use(authenticateJWT);

// ── Enums ──
const SOURCE_CONTROL_TYPES = ['AZURE', 'GITHUB'] as const;
const ARTIFACT_TYPES = ['DOCKER', 'BINARY', 'GIT_SYNC'] as const;
const CONCURRENT_UPDATE_POLICIES = ['WARN', 'BLOCK'] as const;

// ── Validation Schema ──
const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isActive: z.boolean().optional(),

  // Source control
  sourceControlType: z.enum(SOURCE_CONTROL_TYPES).nullable().optional(),
  azureOrg: z.string().optional().nullable(),
  azureProject: z.string().optional().nullable(),
  azureReleaseProject: z.string().optional().nullable(),
  azurePat: z.string().optional().nullable(),
  githubOwner: z.string().optional().nullable(),
  githubToken: z.string().optional().nullable(),

  // Artifact & branching
  supportedArtifactTypes: z.array(z.enum(ARTIFACT_TYPES)).optional(),
  usesReleaseBranches: z.boolean().optional(),
  concurrentUpdatePolicy: z.enum(CONCURRENT_UPDATE_POLICIES).nullable().optional(),

  // Visibility
  customerVisibleStatuses: z.array(z.string()).optional(),

  // Deprecated — geriye uyumluluk için kabul edilir
  repoUrl: z.string().url().optional().or(z.literal('')).or(z.literal(null)),
  pmType: z.enum(SOURCE_CONTROL_TYPES).nullable().optional(),
  deploymentType: z.string().optional().nullable(),
});

/**
 * Masks sensitive fields (PAT/tokens) in product responses.
 */
function maskProduct<T extends Record<string, unknown>>(product: T): T {
  // pmType is deprecated — populated from sourceControlType for backward compat with frontend
  const pmTypeResolved =
    (product.pmType as string | null) ?? (product.sourceControlType as string | null) ?? null;

  return {
    ...product,
    azurePat: mask(product.azurePat as string | null),
    githubToken: mask(product.githubToken as string | null),
    pmType: pmTypeResolved,
  };
}

// GET /api/products
router.get('/', async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      include: { _count: { select: { services: true, versions: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ data: products.map(maskProduct) });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: String(req.params.id) },
      include: {
        services: { orderBy: { name: 'asc' } },
        apis: { orderBy: { path: 'asc' } },
        moduleGroups: {
          include: {
            modules: {
              include: { services: { orderBy: { name: 'asc' } } },
              orderBy: { name: 'asc' },
            },
          },
          orderBy: { name: 'asc' },
        },
      },
    });
    if (!product) throw new AppError(404, 'Ürün bulunamadı');
    res.json({ data: maskProduct(product) });
  } catch (err) {
    next(err);
  }
});

// POST /api/products
router.post('/', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const data = productSchema.parse(req.body);
    const initialVersion = typeof req.body.initialVersion === 'string' ? req.body.initialVersion.trim() : null;

    // Backward compat: pmType → sourceControlType
    if (data.pmType && !data.sourceControlType) {
      data.sourceControlType = data.pmType;
    }

    // Encrypt sensitive fields
    const createData = {
      ...data,
      azurePat: encryptIfNeeded(data.azurePat),
      githubToken: encryptIfNeeded(data.githubToken),
    };

    if (initialVersion) {
      // Atomically create product + initial version
      const [product] = await prisma.$transaction(async (tx) => {
        const p = await tx.product.create({ data: createData });
        await tx.productVersion.create({
          data: {
            productId: p.id,
            version: initialVersion,
            phase: 'PLANNED',
          },
        });
        return [p];
      });
      res.status(201).json({ data: maskProduct(product) });
    } else {
      const product = await prisma.product.create({ data: createData });
      res.status(201).json({ data: maskProduct(product) });
    }
  } catch (err) {
    next(err);
  }
});

// PUT /api/products/:id
router.put('/:id', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const data = productSchema.partial().parse(req.body);

    // Backward compat: pmType → sourceControlType
    if (data.pmType && !data.sourceControlType) {
      data.sourceControlType = data.pmType;
    }

    // Encrypt sensitive fields only if provided
    const updateData: Record<string, unknown> = { ...data };
    if (data.azurePat !== undefined) {
      updateData.azurePat = data.azurePat ? encryptIfNeeded(data.azurePat) : null;
    }
    if (data.githubToken !== undefined) {
      updateData.githubToken = data.githubToken ? encryptIfNeeded(data.githubToken) : null;
    }

    const product = await prisma.product.update({
      where: { id: String(req.params.id) },
      data: updateData,
    });
    res.json({ data: maskProduct(product) });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/products/:id
router.delete('/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    await prisma.product.delete({ where: { id: String(req.params.id) } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
