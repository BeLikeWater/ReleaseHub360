import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';
import { encryptIfNeeded, mask } from '../lib/encryption';

const router = Router();
router.use(authenticateJWT);

// ── Enums ──
const CONTAINER_PLATFORMS = ['RANCHER', 'OPENSHIFT', 'KUBERNETES', 'DOCKER_COMPOSE'] as const;

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  productId: z.string(),
  moduleId: z.string().optional().nullable(),
  repoName: z.string().optional(),
  pipelineName: z.string().optional(),
  releaseName: z.string().optional(),
  releaseProject: z.string().optional().nullable(),
  port: z.number().int().optional().nullable(),
  isActive: z.boolean().optional(),

  // Stage config (ikili stage)
  prodStageName: z.string().optional().nullable(),
  prepStageName: z.string().optional().nullable(),
  prodStageId: z.string().optional().nullable(),
  prepStageId: z.string().optional().nullable(),

  // Release tracking
  lastProdReleaseName: z.string().optional().nullable(),
  lastProdReleaseDate: z.string().datetime().optional().nullable(),

  // Docker
  dockerImageName: z.string().optional().nullable(),
  containerPlatform: z.enum(CONTAINER_PLATFORMS).optional().nullable(),
  platformUrl: z.string().optional().nullable(),
  platformToken: z.string().optional().nullable(),
  clusterName: z.string().optional().nullable(),
  namespace: z.string().optional().nullable(),
  workloadName: z.string().optional().nullable(),

  // Binary
  binaryArtifacts: z.array(z.string()).optional(),
  deploymentTargets: z.any().optional().nullable(),

  // Deprecated — geriye uyumluluk
  repoUrl: z.string().optional().nullable(),
  serviceImageName: z.string().optional().nullable(),
  currentVersion: z.string().optional().nullable(),
  currentVersionCreatedAt: z.string().datetime().optional().nullable(),
  releaseStage: z.string().optional().nullable(),
  lastReleaseName: z.string().optional().nullable(),
});

/**
 * Masks sensitive fields in service responses.
 */
function maskService<T extends Record<string, unknown>>(service: T): T {
  return {
    ...service,
    platformToken: mask(service.platformToken as string | null),
  };
}

router.get('/', async (req, res, next) => {
  try {
    const { productId, moduleId } = req.query;
    const where: Record<string, unknown> = {};
    if (productId) where.productId = String(productId);
    if (moduleId) where.moduleId = String(moduleId);
    const items = await prisma.service.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { name: 'asc' },
    });
    res.json({ data: items.map(maskService) });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const item = await prisma.service.findUnique({ where: { id: String(req.params.id) } });
    if (!item) throw new AppError(404, 'Servis bulunamadı');
    res.json({ data: maskService(item) });
  } catch (err) { next(err); }
});

router.post('/', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const data = schema.parse(req.body);

    // Backward compat: deprecated → new field mapping
    if (data.serviceImageName && !data.dockerImageName) {
      data.dockerImageName = data.serviceImageName;
    }
    if (data.releaseStage && !data.prodStageName) {
      data.prodStageName = data.releaseStage;
    }
    if (data.lastReleaseName && !data.lastProdReleaseName) {
      data.lastProdReleaseName = data.lastReleaseName;
    }
    if (data.currentVersionCreatedAt && !data.lastProdReleaseDate) {
      data.lastProdReleaseDate = data.currentVersionCreatedAt;
    }

    const item = await prisma.service.create({
      data: {
        ...data,
        platformToken: encryptIfNeeded(data.platformToken),
        currentVersionCreatedAt: data.currentVersionCreatedAt
          ? new Date(data.currentVersionCreatedAt)
          : undefined,
        lastProdReleaseDate: data.lastProdReleaseDate
          ? new Date(data.lastProdReleaseDate)
          : undefined,
      },
    });
    res.status(201).json({ data: maskService(item) });
  } catch (err) { next(err); }
});

router.put('/:id', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const data = schema.partial().parse(req.body);

    // Backward compat
    if (data.serviceImageName && !data.dockerImageName) {
      data.dockerImageName = data.serviceImageName;
    }
    if (data.releaseStage && !data.prodStageName) {
      data.prodStageName = data.releaseStage;
    }
    if (data.lastReleaseName && !data.lastProdReleaseName) {
      data.lastProdReleaseName = data.lastReleaseName;
    }

    const updateData: Record<string, unknown> = { ...data };

    // Encrypt sensitive fields
    if (data.platformToken !== undefined) {
      updateData.platformToken = data.platformToken ? encryptIfNeeded(data.platformToken) : null;
    }

    // Date conversions
    if (data.currentVersionCreatedAt !== undefined) {
      updateData.currentVersionCreatedAt = data.currentVersionCreatedAt
        ? new Date(data.currentVersionCreatedAt)
        : null;
    }
    if (data.lastProdReleaseDate !== undefined) {
      updateData.lastProdReleaseDate = data.lastProdReleaseDate
        ? new Date(data.lastProdReleaseDate)
        : null;
    }

    const item = await prisma.service.update({
      where: { id: String(req.params.id) },
      data: updateData,
    });
    res.json({ data: maskService(item) });
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    await prisma.service.delete({ where: { id: String(req.params.id) } });
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
