import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateJWT, requireRole, filterByUserProducts } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';

const router = Router();
router.use(authenticateJWT);
router.use(filterByUserProducts);

// ── Validation schemas ────────────────────────────────────────────────────────

const PACKAGE_TYPES = ['HELM_CHART', 'DOCKER_IMAGE', 'BINARY', 'GIT_ARCHIVE'] as const;

const createSchema = z.object({
  productVersionId: z.string().uuid(),
  packageType: z.enum(PACKAGE_TYPES),
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().optional(),
  artifactUrl: z.string().url().optional(),
  helmRepoUrl: z.string().optional(),
  helmChartName: z.string().optional(),
  imageRegistry: z.string().optional(),
  imageName: z.string().optional(),
  imageTag: z.string().optional(),
  sizeBytes: z.number().int().positive().optional(),
  checksum: z.string().optional(),
  publishedBy: z.string().optional(),
});

const updateSchema = createSchema.partial().omit({ productVersionId: true });

// ── GET /api/version-packages ─────────────────────────────────────────────────
// ?productVersionId= (required)
router.get('/', async (req, res, next) => {
  try {
    const { productVersionId } = req.query;
    const packages = await prisma.versionPackage.findMany({
      where: {
        ...(productVersionId ? { productVersionId: String(productVersionId) } : {}),
        ...(req.accessibleProductIds ? { productVersion: { productId: { in: req.accessibleProductIds } } } : {}),
      },
      orderBy: { publishedAt: 'desc' },
      include: {
        productVersion: { select: { id: true, version: true, product: { select: { id: true, name: true } } } },
      },
    });
    res.json({ data: packages });
  } catch (err) { next(err); }
});

// ── GET /api/version-packages/:id ────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const pkg = await prisma.versionPackage.findUnique({
      where: { id: String(req.params.id) },
      include: {
        productVersion: { select: { id: true, version: true, product: { select: { id: true, name: true } } } },
      },
    });
    if (!pkg) throw new AppError(404, 'Paket bulunamadı');
    res.json({ data: pkg });
  } catch (err) { next(err); }
});

// ── POST /api/version-packages ────────────────────────────────────────────────
router.post('/', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);

    // Verify productVersion exists
    const version = await prisma.productVersion.findUnique({ where: { id: body.productVersionId } });
    if (!version) throw new AppError(404, 'Versiyon bulunamadı');

    const pkg = await prisma.versionPackage.create({
      data: {
        ...body,
        sizeBytes: body.sizeBytes ? BigInt(body.sizeBytes) : undefined,
      },
      include: {
        productVersion: { select: { id: true, version: true } },
      },
    });
    res.status(201).json({ data: pkg });
  } catch (err) { next(err); }
});

// ── PATCH /api/version-packages/:id ──────────────────────────────────────────
router.patch('/:id', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const body = updateSchema.parse(req.body);
    const pkg = await prisma.versionPackage.update({
      where: { id: String(req.params.id) },
      data: {
        ...body,
        sizeBytes: body.sizeBytes !== undefined ? BigInt(body.sizeBytes) : undefined,
      },
    });
    res.json({ data: pkg });
  } catch (err) { next(err); }
});

// ── POST /api/version-packages/:id/download ───────────────────────────────────
// Track a download event and return the artifact URL
router.post('/:id/download', async (req, res, next) => {
  try {
    const pkg = await prisma.versionPackage.findUnique({ where: { id: req.params.id } });
    if (!pkg) throw new AppError(404, 'Paket bulunamadı');

    const updated = await prisma.versionPackage.update({
      where: { id: String(req.params.id) },
      data: {
        downloadCount: { increment: 1 },
        lastDownloadedAt: new Date(),
      },
    });
    res.json({ data: { artifactUrl: updated.artifactUrl, downloadCount: updated.downloadCount } });
  } catch (err) { next(err); }
});

// ── DELETE /api/version-packages/:id ─────────────────────────────────────────
router.delete('/:id', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    await prisma.versionPackage.delete({ where: { id: String(req.params.id) } });
    res.status(204).send();
  } catch (err) { next(err); }
});

// ── POST /api/version-packages/:versionId/generate-binary — E2-02 ────────────
// Faz 1: Collect BINARY packages for the version and return a manifest for download
// (actual ZIP bundling can be triggered later via S3/local storage)
router.post('/:versionId/generate-binary', requireRole('ADMIN', 'RELEASE_MANAGER', 'CUSTOMER_ADMIN'), async (req, res, next) => {
  try {
    const { versionId } = req.params;

    const binaryPackages = await prisma.versionPackage.findMany({
      where: { productVersionId: String(versionId), packageType: 'BINARY' },
    });

    if (binaryPackages.length === 0) {
      throw new AppError(404, 'Bu versiyona ait BINARY paket bulunamadı');
    }

    // Phase 1: Return manifest with artifact URLs for client to download
    const manifest = binaryPackages.map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      version: pkg.version,
      artifactUrl: pkg.artifactUrl,
      checksum: pkg.checksum,
    }));

    // Track downloads
    await prisma.versionPackage.updateMany({
      where: { productVersionId: String(versionId), packageType: 'BINARY' },
      data: { downloadCount: { increment: 1 }, lastDownloadedAt: new Date() },
    });

    res.json({ data: manifest, message: `${binaryPackages.length} binary paket hazırlandı` });
  } catch (err) { next(err); }
});

export default router;
