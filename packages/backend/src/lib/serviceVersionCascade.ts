/**
 * serviceVersionCascade.ts
 *
 * Section 8.2 — Otomatik Doldurma Mekanizması
 *
 * Müşteri Prod ortamında gerçekleşen tarihi girince çağrılır.
 * ServiceReleaseSnapshot üzerinden:
 *   - CustomerServiceVersion UPSERT (mevcut kaydı güncelle)
 *   - CustomerServiceVersionHistory INSERT (geçmiş append-only)
 *   - CustomerProductMapping.currentVersionId güncelle
 *
 * Tüm işlem tek Prisma transaction içinde yapılır.
 */

import prisma from './prisma';

export interface CascadeResult {
  transitionId: string;
  upsertedCount: number;
  historyCount: number;
  skippedCount: number;
}

/**
 * Prod geçişi tamamlandığında customer service version tablosunu günceller.
 *
 * @param transitionId  - CustomerVersionTransition.id
 * @param actualDate    - Gerçekleşen tarih (Prod)
 */
export async function cascadeServiceVersions(
  transitionId: string,
  actualDate: Date,
): Promise<CascadeResult> {
  // 1. Transition'ı oku (toVersion üzerinden productId'yi al)
  const transition = await prisma.customerVersionTransition.findUnique({
    where: { id: transitionId },
    include: {
      toVersion: {
        select: {
          id: true,
          productId: true,
        },
      },
    },
  });

  if (!transition) {
    throw new Error(`CustomerVersionTransition not found: ${transitionId}`);
  }

  const { toVersionId, customerId } = transition;
  const productId = transition.toVersion.productId;

  // 2. Bu versiyon için tüm servis release snapshot'larını bul
  const snapshots = await prisma.serviceReleaseSnapshot.findMany({
    where: { productVersionId: toVersionId },
    select: {
      serviceId: true,
      releaseName: true,
      productVersionId: true,
    },
  });

  // 3. CPM bul (currentVersionId güncellemek için)
  const cpm = await prisma.customerProductMapping.findFirst({
    where: { customerId, productId },
  });

  let upsertedCount = 0;
  let historyCount = 0;
  const skippedCount = 0;

  // 4. Transaction: her snapshot için UPSERT + history INSERT + CPM güncelleme
  await prisma.$transaction(async (tx) => {
    for (const snapshot of snapshots) {
      if (!snapshot.releaseName) continue;

      // Mevcut kaydı bul (varsa previousRelease için)
      const existing = await tx.customerServiceVersion.findUnique({
        where: {
          customerId_serviceId: {
            customerId,
            serviceId: snapshot.serviceId,
          },
        },
      });

      const previousRelease = existing?.currentRelease ?? null;
      const fromVersionId = existing?.currentVersionId ?? null;

      // UPSERT CustomerServiceVersion
      await tx.customerServiceVersion.upsert({
        where: {
          customerId_serviceId: {
            customerId,
            serviceId: snapshot.serviceId,
          },
        },
        create: {
          customerId,
          productId,
          serviceId: snapshot.serviceId,
          currentRelease: snapshot.releaseName,
          currentVersionId: toVersionId,
          takenAt: actualDate,
          previousRelease: null,
        },
        update: {
          currentRelease: snapshot.releaseName,
          currentVersionId: toVersionId,
          takenAt: actualDate,
          previousRelease: previousRelease,
          productId,
        },
      });
      upsertedCount++;

      // History INSERT (append-only — sadece değişiklik varsa)
      if (previousRelease && previousRelease !== snapshot.releaseName && fromVersionId) {
        await tx.customerServiceVersionHistory.create({
          data: {
            customerId,
            serviceId: snapshot.serviceId,
            fromRelease: previousRelease,
            toRelease: snapshot.releaseName,
            fromVersionId,
            toVersionId,
            transitionDate: actualDate,
          },
        });
        historyCount++;
      }
    }

    // CPM.currentVersionId güncelle
    if (cpm) {
      await tx.customerProductMapping.update({
        where: { id: cpm.id },
        data: { currentVersionId: toVersionId },
      });
    }

    // Transition → COMPLETED
    await tx.customerVersionTransition.update({
      where: { id: transitionId },
      data: {
        status: 'COMPLETED',
        actualDate,
      },
    });
  });

  return { transitionId, upsertedCount, historyCount, skippedCount };
}

/**
 * Bootstrap: Mevcut müşteriler için ilk veri oluşturma.
 * Idempotent — varolan kayıtları tekrar yazmaz.
 *
 * @param customerId  - Müşteri ID
 * @param productId   - Ürün ID
 * @param versionId   - Başlangıç olarak kabul edilecek versiyon ID
 * @param takenAt     - Bootstrap tarihi (genellikle şu an veya manuel giriş)
 */
export async function bootstrapCustomerServiceVersions(
  customerId: string,
  productId: string,
  versionId: string,
  takenAt: Date,
): Promise<{ created: number; skipped: number }> {
  const snapshots = await prisma.serviceReleaseSnapshot.findMany({
    where: { productVersionId: versionId },
    select: {
      serviceId: true,
      releaseName: true,
    },
  });

  let created = 0;
  let skipped = 0;

  for (const snapshot of snapshots) {
    if (!snapshot.releaseName) continue;

    const existing = await prisma.customerServiceVersion.findUnique({
      where: {
        customerId_serviceId: {
          customerId,
          serviceId: snapshot.serviceId,
        },
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.customerServiceVersion.create({
      data: {
        customerId,
        productId,
        serviceId: snapshot.serviceId,
        currentRelease: snapshot.releaseName,
        currentVersionId: versionId,
        takenAt,
        previousRelease: null,
      },
    });
    created++;
  }

  return { created, skipped };
}
