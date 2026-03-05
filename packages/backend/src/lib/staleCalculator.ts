/**
 * staleCalculator.ts
 *
 * Section 8.4 — Eski (Stale) Hesaplama Mantığı
 *
 * Bir müşterinin belirli bir serviste kaç release geride olduğunu hesaplar.
 * ServiceReleaseSnapshot tablosundan release sıralaması türetilir.
 */

import prisma from './prisma';

export type StaleStatus = 'CURRENT' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';

export interface StaleInfo {
  currentRelease: string | null;
  latestRelease: string | null;
  staleCount: number;
  status: StaleStatus;
}

/**
 * Bir servisin productId kapsamındaki tüm release'lerini kronolojik sırayla döndürür.
 * ServiceReleaseSnapshot.releaseName + createdAt ASC kullanılır.
 */
export async function getServiceReleasesOrdered(
  serviceId: string,
  productId: string | null,
): Promise<string[]> {
  // Prisma typed where clause
  const where = productId
    ? { serviceId, productVersion: { productId } }
    : { serviceId };

  const snapshots = await prisma.serviceReleaseSnapshot.findMany({
    where,
    select: {
      releaseName: true,
      releasedAt: true,
    },
    orderBy: { releasedAt: 'asc' },
  });

  return snapshots
    .map((s) => s.releaseName)
    .filter((r): r is string => !!r)
    .filter((v, i, a) => a.indexOf(v) === i); // deduplicate
}

/**
 * Müşterinin belirli bir serviste kaç release geride olduğunu hesaplar.
 *
 * @param customerId  - Müşteri ID
 * @param serviceId   - Servis ID
 * @param productId   - Ürün ID (filtre için)
 * @param warningThreshold  - Uyarı eşiği (varsayılan: 3)
 * @param criticalThreshold - Kritik eşiği (varsayılan: 5)
 */
export async function calculateStaleness(
  customerId: string,
  serviceId: string,
  productId: string | null = null,
  warningThreshold = 3,
  criticalThreshold = 5,
): Promise<StaleInfo> {
  // Müşterinin bu servisteki mevcut release'ini bul
  const csv = await prisma.customerServiceVersion.findUnique({
    where: {
      customerId_serviceId: { customerId, serviceId },
    },
    select: {
      currentRelease: true,
    },
  });

  if (!csv) {
    return {
      currentRelease: null,
      latestRelease: null,
      staleCount: 0,
      status: 'UNKNOWN',
    };
  }

  // Tüm release'leri sırala
  const releases = await getServiceReleasesOrdered(serviceId, productId);

  if (releases.length === 0) {
    return {
      currentRelease: csv.currentRelease,
      latestRelease: csv.currentRelease,
      staleCount: 0,
      status: 'CURRENT',
    };
  }

  const latestRelease = releases[releases.length - 1];
  const currentIndex = releases.indexOf(csv.currentRelease);
  const latestIndex = releases.length - 1;

  if (currentIndex === -1) {
    // Release bulunamadı — veri tutarsız
    return {
      currentRelease: csv.currentRelease,
      latestRelease,
      staleCount: 0,
      status: 'UNKNOWN',
    };
  }

  const staleCount = latestIndex - currentIndex;

  let status: StaleStatus = 'CURRENT';
  if (staleCount >= criticalThreshold) {
    status = 'CRITICAL';
  } else if (staleCount >= warningThreshold) {
    status = 'WARNING';
  }

  return {
    currentRelease: csv.currentRelease,
    latestRelease,
    staleCount,
    status,
  };
}

/**
 * Bir ürün için tüm müşteri-servis çiftlerinin stale durumunu hesaplar.
 * Matrix API'nin backbone'u.
 */
export async function calculateProductStaleness(
  productId: string,
  threshold: number,
): Promise<
  {
    customerId: string;
    customerName: string;
    serviceId: string;
    serviceName: string;
    currentRelease: string | null;
    latestRelease: string | null;
    staleCount: number;
    status: StaleStatus;
  }[]
> {
  // Ürün için tüm CustomerServiceVersion kayıtlarını çek
  const csvs = await prisma.customerServiceVersion.findMany({
    where: { productId },
    include: {
      customer: { select: { id: true, name: true } },
      service: { select: { id: true, name: true } },
    },
  });

  // Her servis için release sıralamasını bir kez hesapla (cache)
  const releaseCache = new Map<string, string[]>();

  const results = await Promise.all(
    csvs.map(async (csv) => {
      if (!releaseCache.has(csv.serviceId)) {
        const releases = await getServiceReleasesOrdered(csv.serviceId, productId);
        releaseCache.set(csv.serviceId, releases);
      }

      const releases = releaseCache.get(csv.serviceId)!;
      const latestRelease = releases.length > 0 ? releases[releases.length - 1] : null;
      const currentIndex = releases.indexOf(csv.currentRelease);
      const latestIndex = releases.length - 1;
      const staleCount = currentIndex === -1 ? 0 : latestIndex - currentIndex;

      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { staleThresholdWarning: true, staleThresholdCritical: true },
      });

      const warnThreshold = product?.staleThresholdWarning ?? 3;
      const critThreshold = product?.staleThresholdCritical ?? 5;

      let status: StaleStatus = 'CURRENT';
      if (staleCount >= critThreshold) {
        status = 'CRITICAL';
      } else if (staleCount >= warnThreshold) {
        status = 'WARNING';
      }

      return {
        customerId: csv.customerId,
        customerName: csv.customer.name,
        serviceId: csv.serviceId,
        serviceName: csv.service.name,
        currentRelease: csv.currentRelease,
        latestRelease,
        staleCount,
        status,
      };
    }),
  );

  return results.filter((r) => r.staleCount >= threshold);
}
