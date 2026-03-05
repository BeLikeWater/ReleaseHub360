/**
 * serviceVersionMatrix.routes.ts
 *
 * Section 8.8 — API Bağlantıları — Service Version Matrix
 *
 * 9 endpoint:
 *  GET  /api/service-version-matrix              — pivot matrix
 *  GET  /api/service-version-matrix/by-service   — servis odaklı
 *  GET  /api/service-version-matrix/by-customer  — müşteri odaklı
 *  GET  /api/service-version-matrix/history      — geçiş geçmişi
 *  GET  /api/service-version-matrix/stale        — N+ release geridekiler
 *  GET  /api/service-version-matrix/summary      — dashboard widget
 *  POST /api/service-version-matrix/bootstrap    — admin batch import
 *  GET  /api/service-version-matrix/export       — Excel/CSV export
 *  POST /api/service-version-matrix/notify-stale — toplu bildirim
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import prisma from '../lib/prisma';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';
import { bootstrapCustomerServiceVersions } from '../lib/serviceVersionCascade';
import { calculateProductStaleness, getServiceReleasesOrdered } from '../lib/staleCalculator';

const router = Router();
router.use(authenticateJWT);

// ─── GET /api/service-version-matrix ─────────────────────────────────────────
// Tüm müşteriler × müşterinin abone olduğu servisler — pivot matrix
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const { productId } = req.query;
    if (!productId) {
      res.status(400).json({ error: 'productId gerekli' });
      return;
    }

    // Ürün validasyonu
    const product = await prisma.product.findUnique({
      where: { id: String(productId) },
      select: { id: true, name: true, staleThresholdWarning: true, staleThresholdCritical: true },
    });
    if (!product) {
      res.status(404).json({ error: 'Ürün bulunamadı' });
      return;
    }

    // Tüm CustomerServiceVersion kayıtları (bu ürün)
    const csvs = await prisma.customerServiceVersion.findMany({
      where: { productId: String(productId) },
      include: {
        customer: { select: { id: true, name: true } },
        service: {
          select: {
            id: true,
            name: true,
            moduleId: true,
            module: {
              select: {
                id: true,
                name: true,
                moduleGroupId: true,
                moduleGroup: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
    });

    // Release sıralaması için cache
    const releaseCache = new Map<string, string[]>();
    const getLatest = async (serviceId: string) => {
      if (!releaseCache.has(serviceId)) {
        const r = await getServiceReleasesOrdered(serviceId, String(productId));
        releaseCache.set(serviceId, r);
      }
      return releaseCache.get(serviceId)!;
    };

    // Pivot: servis → müşteri → stale bilgisi
    const matrix: Record<
      string,
      {
        service: { id: string; name: string; moduleName?: string; moduleGroupName?: string };
        customers: Record<
          string,
          {
            currentRelease: string;
            latestRelease: string | null;
            staleCount: number;
            status: 'CURRENT' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
            takenAt: Date;
            previousRelease: string | null;
          }
        >;
      }
    > = {};

    for (const csv of csvs) {
      const releases = await getLatest(csv.serviceId);
      const latestRelease = releases.length > 0 ? releases[releases.length - 1] : null;
      const currentIndex = releases.indexOf(csv.currentRelease);
      const staleCount = latestRelease && currentIndex !== -1 ? releases.length - 1 - currentIndex : 0;

      let status: 'CURRENT' | 'WARNING' | 'CRITICAL' | 'UNKNOWN' = 'CURRENT';
      if (currentIndex === -1) status = 'UNKNOWN';
      else if (staleCount >= (product.staleThresholdCritical ?? 5)) status = 'CRITICAL';
      else if (staleCount >= (product.staleThresholdWarning ?? 3)) status = 'WARNING';

      if (!matrix[csv.serviceId]) {
        matrix[csv.serviceId] = {
          service: {
            id: csv.service.id,
            name: csv.service.name,
            moduleName: csv.service.module?.name,
            moduleGroupName: csv.service.module?.moduleGroup?.name,
          },
          customers: {},
        };
      }

      matrix[csv.serviceId].customers[csv.customerId] = {
        currentRelease: csv.currentRelease,
        latestRelease,
        staleCount,
        status,
        takenAt: csv.takenAt,
        previousRelease: csv.previousRelease,
      };
    }

    // Müşteri listesi (benzersiz)
    const customerMap = new Map<string, { id: string; name: string }>();
    csvs.forEach((c) => customerMap.set(c.customerId, { id: c.customerId, name: c.customer.name }));

    res.json({
      product,
      customers: Array.from(customerMap.values()),
      matrix: Object.values(matrix),
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/service-version-matrix/by-service ──────────────────────────────
// Tek servis → bu servisi kullanan tüm müşteriler
router.get('/by-service', async (req: Request, res: Response, next) => {
  try {
    const { serviceId } = req.query;
    if (!serviceId) {
      res.status(400).json({ error: 'serviceId gerekli' });
      return;
    }

    const service = await prisma.service.findUnique({
      where: { id: String(serviceId) },
      select: { id: true, name: true, productId: true },
    });
    if (!service) {
      res.status(404).json({ error: 'Servis bulunamadı' });
      return;
    }

    const csvs = await prisma.customerServiceVersion.findMany({
      where: { serviceId: String(serviceId) },
      include: {
        customer: { select: { id: true, name: true } },
        currentVersion: { select: { version: true } },
      },
      orderBy: { takenAt: 'desc' },
    });

    const releases = await getServiceReleasesOrdered(String(serviceId), service.productId);
    const latestRelease = releases.length > 0 ? releases[releases.length - 1] : null;

    const product = await prisma.product.findUnique({
      where: { id: service.productId },
      select: { staleThresholdWarning: true, staleThresholdCritical: true },
    });

    const rows = csvs.map((csv) => {
      const currentIndex = releases.indexOf(csv.currentRelease);
      const staleCount = latestRelease && currentIndex !== -1 ? releases.length - 1 - currentIndex : 0;
      let status: 'CURRENT' | 'WARNING' | 'CRITICAL' | 'UNKNOWN' = 'CURRENT';
      if (currentIndex === -1) status = 'UNKNOWN';
      else if (staleCount >= (product?.staleThresholdCritical ?? 5)) status = 'CRITICAL';
      else if (staleCount >= (product?.staleThresholdWarning ?? 3)) status = 'WARNING';

      return {
        customerId: csv.customerId,
        customerName: csv.customer.name,
        currentRelease: csv.currentRelease,
        latestRelease,
        staleCount,
        status,
        takenAt: csv.takenAt,
        version: csv.currentVersion?.version,
      };
    });

    // Release dağılımı
    const releaseDist: Record<string, number> = {};
    rows.forEach((r) => {
      releaseDist[r.currentRelease] = (releaseDist[r.currentRelease] ?? 0) + 1;
    });

    const summary = {
      totalCustomers: rows.length,
      current: rows.filter((r) => r.status === 'CURRENT').length,
      warning: rows.filter((r) => r.status === 'WARNING').length,
      critical: rows.filter((r) => r.status === 'CRITICAL').length,
      unknown: rows.filter((r) => r.status === 'UNKNOWN').length,
    };

    res.json({ service, latestRelease, customers: rows, releaseDist, summary });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/service-version-matrix/by-customer ─────────────────────────────
// Tek müşteri → müşterinin tüm servislerinin durumu
router.get('/by-customer', async (req: Request, res: Response, next) => {
  try {
    const { customerId, productId } = req.query;
    if (!customerId || !productId) {
      res.status(400).json({ error: 'customerId ve productId gerekli' });
      return;
    }

    const csvs = await prisma.customerServiceVersion.findMany({
      where: {
        customerId: String(customerId),
        productId: String(productId),
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            moduleId: true,
            module: { select: { id: true, name: true } },
          },
        },
        currentVersion: { select: { version: true } },
      },
    });

    const product = await prisma.product.findUnique({
      where: { id: String(productId) },
      select: {
        staleThresholdWarning: true,
        staleThresholdCritical: true,
        name: true,
      },
    });

    const rows = await Promise.all(
      csvs.map(async (csv) => {
        const releases = await getServiceReleasesOrdered(csv.serviceId, String(productId));
        const latestRelease = releases.length > 0 ? releases[releases.length - 1] : null;
        const currentIndex = releases.indexOf(csv.currentRelease);
        const staleCount = latestRelease && currentIndex !== -1 ? releases.length - 1 - currentIndex : 0;

        let status: 'CURRENT' | 'WARNING' | 'CRITICAL' | 'UNKNOWN' = 'CURRENT';
        if (currentIndex === -1) status = 'UNKNOWN';
        else if (staleCount >= (product?.staleThresholdCritical ?? 5)) status = 'CRITICAL';
        else if (staleCount >= (product?.staleThresholdWarning ?? 3)) status = 'WARNING';

        return {
          serviceId: csv.serviceId,
          serviceName: csv.service.name,
          moduleName: csv.service.module?.name,
          currentRelease: csv.currentRelease,
          latestRelease,
          staleCount,
          status,
          takenAt: csv.takenAt,
          version: csv.currentVersion?.version,
          previousRelease: csv.previousRelease,
        };
      }),
    );

    const summary = {
      total: rows.length,
      current: rows.filter((r) => r.status === 'CURRENT').length,
      stale: rows.filter((r) => r.status !== 'CURRENT' && r.status !== 'UNKNOWN').length,
    };

    res.json({ productName: product?.name, services: rows, summary });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/service-version-matrix/history ─────────────────────────────────
// Belirli müşteri + servis için geçiş geçmişi
router.get('/history', async (req: Request, res: Response, next) => {
  try {
    const { customerId, serviceId } = req.query;
    if (!customerId || !serviceId) {
      res.status(400).json({ error: 'customerId ve serviceId gerekli' });
      return;
    }

    const history = await prisma.customerServiceVersionHistory.findMany({
      where: {
        customerId: String(customerId),
        serviceId: String(serviceId),
      },
      orderBy: { transitionDate: 'desc' },
    });

    res.json({ data: history });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/service-version-matrix/stale ───────────────────────────────────
// N+ release gerideki müşteri-servis çiftleri
router.get('/stale', async (req: Request, res: Response, next) => {
  try {
    const { productId, threshold } = req.query;
    if (!productId) {
      res.status(400).json({ error: 'productId gerekli' });
      return;
    }

    const th = threshold ? parseInt(String(threshold), 10) : 0;
    const results = await calculateProductStaleness(String(productId), th);

    res.json({ data: results, count: results.length });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/service-version-matrix/summary ─────────────────────────────────
// Dashboard widget verisi (Gap 64)
router.get('/summary', async (_req: Request, res: Response, next) => {
  try {
    const csvs = await prisma.customerServiceVersion.findMany({
      include: {
        product: {
          select: { staleThresholdWarning: true, staleThresholdCritical: true },
        },
        customer: { select: { id: true, name: true, updatedAt: true } },
      },
    });

    // Her CSV için stale hesapla
    const releaseCache = new Map<string, string[]>();
    let currentCount = 0;
    let warningCount = 0;
    let criticalCount = 0;

    const customerStaleMap = new Map<string, { name: string; staleServices: number; lastUpdated: Date }>();

    for (const csv of csvs) {
      if (!releaseCache.has(csv.serviceId)) {
        const r = await getServiceReleasesOrdered(csv.serviceId, csv.productId);
        releaseCache.set(csv.serviceId, r);
      }

      const releases = releaseCache.get(csv.serviceId)!;
      const latestRelease = releases.length > 0 ? releases[releases.length - 1] : null;
      const currentIndex = releases.indexOf(csv.currentRelease);
      const staleCount = latestRelease && currentIndex !== -1 ? releases.length - 1 - currentIndex : 0;

      const warnTh = csv.product.staleThresholdWarning ?? 3;
      const critTh = csv.product.staleThresholdCritical ?? 5;

      if (staleCount === 0) currentCount++;
      else if (staleCount >= critTh) criticalCount++;
      else if (staleCount >= warnTh) warningCount++;

      // Customer tracking
      if (!customerStaleMap.has(csv.customerId)) {
        customerStaleMap.set(csv.customerId, {
          name: csv.customer.name,
          staleServices: 0,
          lastUpdated: csv.takenAt,
        });
      }
      if (staleCount > 0) {
        customerStaleMap.get(csv.customerId)!.staleServices++;
      }
      if (csv.takenAt > customerStaleMap.get(csv.customerId)!.lastUpdated) {
        customerStaleMap.get(csv.customerId)!.lastUpdated = csv.takenAt;
      }
    }

    // En çok stale servisi olan müşteri
    const sorted = Array.from(customerStaleMap.values()).sort(
      (a, b) => b.staleServices - a.staleServices,
    );

    // En son güncelleme alan müşteri
    const recentlyUpdated = Array.from(customerStaleMap.entries())
      .sort((a, b) => b[1].lastUpdated.getTime() - a[1].lastUpdated.getTime())
      .at(0);

    res.json({
      current: currentCount,
      warning: warningCount,
      critical: criticalCount,
      totalEntries: csvs.length,
      mostStaleCustomer: sorted[0] ?? null,
      lastUpdatedCustomer: recentlyUpdated
        ? { name: recentlyUpdated[1].name, date: recentlyUpdated[1].lastUpdated }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/service-version-matrix/bootstrap ──────────────────────────────
// Admin: mevcut müşteriler için ilk veri oluşturma (Gap 61)
router.post(
  '/bootstrap',
  requireRole('ADMIN'),
  async (req: Request, res: Response, next) => {
    try {
      const schema = z.object({
        customerId: z.string().min(1),
        productId: z.string().min(1),
        versionId: z.string().min(1),
        takenAt: z.string().datetime().optional(),
      });

      const { customerId, productId, versionId, takenAt } = schema.parse(req.body);
      const date = takenAt ? new Date(takenAt) : new Date();

      const result = await bootstrapCustomerServiceVersions(customerId, productId, versionId, date);
      res.status(201).json({ message: 'Bootstrap tamamlandı', ...result });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /api/service-version-matrix/export ──────────────────────────────────
// Excel/CSV export (Gap 62)
router.get(
  '/export',
  requireRole('ADMIN', 'RELEASE_MANAGER', 'PRODUCT_OWNER', 'DEVOPS_ENGINEER', 'DEVELOPER', 'QA_ENGINEER'),
  async (req: Request, res: Response, next) => {
    try {
      const { productId, format = 'excel' } = req.query;
      if (!productId) {
        res.status(400).json({ error: 'productId gerekli' });
        return;
      }

      const csvs = await prisma.customerServiceVersion.findMany({
        where: { productId: String(productId) },
        include: {
          customer: { select: { name: true } },
          service: { select: { name: true } },
          currentVersion: { select: { version: true } },
          product: { select: { staleThresholdWarning: true, staleThresholdCritical: true } },
        },
      });

      const rows = await Promise.all(
        csvs.map(async (csv) => {
          const releases = await getServiceReleasesOrdered(csv.serviceId, String(productId));
          const latestRelease = releases.at(-1) ?? '';
          const currentIndex = releases.indexOf(csv.currentRelease);
          const staleCount = currentIndex !== -1 ? releases.length - 1 - currentIndex : 0;
          const warnTh = csv.product.staleThresholdWarning ?? 3;
          const critTh = csv.product.staleThresholdCritical ?? 5;
          let status = 'Güncel';
          if (staleCount >= critTh) status = 'Kritik';
          else if (staleCount >= warnTh) status = 'Eski';

          return {
            Müşteri: csv.customer.name,
            Servis: csv.service.name,
            'Mevcut Release': csv.currentRelease,
            'En Güncel Release': latestRelease,
            'Release Farkı': staleCount,
            Durum: status,
            'Ürün Versiyonu': csv.currentVersion?.version ?? '',
            'Geçiş Tarihi': csv.takenAt.toISOString().split('T')[0],
          };
        }),
      );

      if (format === 'csv') {
        const headers = Object.keys(rows[0] ?? {}).join(',');
        const lines = rows.map((r) => Object.values(r).join(','));
        const csv = [headers, ...lines].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=service-matrix-${productId}.csv`);
        res.send(csv);
        return;
      }

      // Excel
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Matrix');
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=service-matrix-${productId}.xlsx`);
      res.send(buf);
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /api/service-version-matrix/notify-stale ───────────────────────────
// Geride kalan müşterilere toplu hatırlatma tetikle (Gap 63)
router.post(
  '/notify-stale',
  requireRole('ADMIN', 'RELEASE_MANAGER', 'PRODUCT_OWNER'),
  async (req: Request, res: Response, next) => {
    try {
      const schema = z.object({
        productId: z.string().min(1),
        threshold: z.number().int().min(1).default(3),
        message: z.string().optional(),
      });

      const { productId, threshold } = schema.parse(req.body);
      const staleEntries = await calculateProductStaleness(productId, threshold);
      if (staleEntries.length === 0) {
        return res.json({ message: 'Geride kalan müşteri bulunamadı', notifiedUsers: 0, staleServicePairs: 0 });
      }

      // Org kullanıcılarına (ADMIN / RELEASE_MANAGER) bildirim gönder
      const admins = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'RELEASE_MANAGER'] }, isActive: true },
        select: { id: true },
      });

      const staleCustomerCount = new Set(staleEntries.map((e) => e.customerId)).size;

      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: 'STALE_SERVICE_REMINDER',
          title: `${staleCustomerCount} müşteri servis güncellemesi gerekiyor`,
          message: `${staleEntries.length} servis sürümü geride. Lütfen güncelleme planı oluşturun.`,
          isRead: false,
        })),
        skipDuplicates: false,
      });

      res.json({
        message: `${admins.length} yöneticiye bildirim gönderildi`,
        notifiedUsers: admins.length,
        staleCustomers: staleCustomerCount,
        staleServicePairs: staleEntries.length,
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
