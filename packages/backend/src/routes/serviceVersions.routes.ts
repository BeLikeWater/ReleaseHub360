import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';

const router = Router();
router.use(authenticateJWT);

// GET /api/service-versions
// Filter by serviceId, productVersionId
router.get('/', async (req, res, next) => {
  try {
    const { serviceId, productVersionId } = req.query;
    const items = await prisma.serviceVersion.findMany({
      where: {
        ...(serviceId ? { serviceId: String(serviceId) } : {}),
        ...(productVersionId ? { productVersionId: String(productVersionId) } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ data: items });
  } catch (err) { next(err); }
});

// POST /api/service-versions/bootstrap
// F-03: Bulk import service version data from parsed CSV/JSON
// Body: { records: [{ serviceId, productVersionId, prodVersion?, prepVersion?, isStale? }] }
router.post(
  '/bootstrap',
  requireRole('ADMIN', 'RELEASE_MANAGER'),
  async (req, res, next) => {
    try {
      const bootstrapSchema = z.object({
        records: z.array(z.object({
          serviceId: z.string().min(1),
          productVersionId: z.string().min(1),
          prodVersion: z.string().optional().nullable(),
          prepVersion: z.string().optional().nullable(),
          isStale: z.boolean().optional().default(false),
          staleThresholdDays: z.number().int().optional().nullable(),
        })).min(1).max(1000),
      });

      const { records } = bootstrapSchema.parse(req.body);

      const results: { created: number; updated: number; failed: number; errors: string[] } = {
        created: 0, updated: 0, failed: 0, errors: [],
      };

      // Validate all serviceIds and productVersionIds exist before upserting
      const uniqueServiceIds = [...new Set(records.map(r => r.serviceId))];
      const uniqueVersionIds = [...new Set(records.map(r => r.productVersionId))];

      const [existingServices, existingVersions] = await Promise.all([
        prisma.service.findMany({ where: { id: { in: uniqueServiceIds } }, select: { id: true } }),
        prisma.productVersion.findMany({ where: { id: { in: uniqueVersionIds } }, select: { id: true } }),
      ]);

      const validServiceIds = new Set(existingServices.map(s => s.id));
      const validVersionIds = new Set(existingVersions.map(v => v.id));

      await Promise.all(records.map(async (record) => {
        try {
          if (!validServiceIds.has(record.serviceId)) {
            results.failed++;
            results.errors.push(`Servis bulunamadı: ${record.serviceId}`);
            return;
          }
          if (!validVersionIds.has(record.productVersionId)) {
            results.failed++;
            results.errors.push(`Versiyon bulunamadı: ${record.productVersionId}`);
            return;
          }

          const existing = await prisma.serviceVersion.findUnique({
            where: {
              serviceId_productVersionId: {
                serviceId: record.serviceId,
                productVersionId: record.productVersionId,
              },
            },
          });

          if (existing) {
            await prisma.serviceVersion.update({
              where: { id: existing.id },
              data: {
                prodVersion: record.prodVersion ?? existing.prodVersion,
                prepVersion: record.prepVersion ?? existing.prepVersion,
                isStale: record.isStale,
                staleThresholdDays: record.staleThresholdDays ?? existing.staleThresholdDays,
                lastCheckedAt: new Date(),
              },
            });
            results.updated++;
          } else {
            await prisma.serviceVersion.create({
              data: {
                serviceId: record.serviceId,
                productVersionId: record.productVersionId,
                prodVersion: record.prodVersion ?? null,
                prepVersion: record.prepVersion ?? null,
                isStale: record.isStale ?? false,
                staleThresholdDays: record.staleThresholdDays ?? null,
                lastCheckedAt: new Date(),
              },
            });
            results.created++;
          }
        } catch (e) {
          results.failed++;
          results.errors.push(`[${record.serviceId}/${record.productVersionId}]: ${e instanceof Error ? e.message : 'Hata'}`);
        }
      }));

      res.status(200).json({
        data: {
          total: records.length,
          ...results,
        },
      });
    } catch (err) {
      if (err instanceof AppError) throw err;
      next(err);
    }
  },
);

// POST /api/service-versions/notify-stale
// F-04: Find stale service-version records and send notifications
router.post(
  '/notify-stale',
  requireRole('ADMIN', 'RELEASE_MANAGER'),
  async (req, res, next) => {
    try {
      const body = z.object({
        defaultThresholdDays: z.number().int().min(1).default(90),
      }).parse(req.body ?? {});

      const staleRecords = await prisma.serviceVersion.findMany({
        where: {
          OR: [
            { isStale: true },
            {
              lastCheckedAt: {
                lt: new Date(Date.now() - body.defaultThresholdDays * 24 * 60 * 60 * 1000),
              },
            },
          ],
        },
        take: 200,
      });

      // Mark them as stale
      const staleIds = staleRecords.map(r => r.id);
      if (staleIds.length > 0) {
        await prisma.serviceVersion.updateMany({
          where: { id: { in: staleIds } },
          data: { isStale: true },
        });
      }

      // Phase 1: Log only — real notification system via Notification model would require userId
      console.info(`[notify-stale] Found ${staleIds.length} stale service versions. Threshold: ${body.defaultThresholdDays} days.`);

      res.json({
        data: {
          staleCount: staleIds.length,
          threshold: body.defaultThresholdDays,
          status: 'LOGGED',
          message: `${staleIds.length} eski versiyon kaydı tespit edildi.`,
        },
      });
    } catch (err) { next(err); }
  },
);

export default router;
