import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';
import { decrypt } from '../lib/encryption';

const router = Router();
router.use(authenticateJWT);

// ─── Shared Azure helpers (inlined to avoid circular import) ─────────────────

type Creds = { org: string; project: string; releaseProject: string; pat: string };

function buildHeaders(pat: string) {
  const token = Buffer.from(`:${pat}`).toString('base64');
  return { Authorization: `Basic ${token}`, 'Content-Type': 'application/json' };
}

/** Ürünün Azure DevOps credentials'ını DB'den çeker.
 *  releaseProject: Classic Release API için proje (azureReleaseProject || azureProject) */
async function resolveProductCreds(productId: string): Promise<Creds | null> {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  const isAzure = product?.pmType === 'AZURE' || product?.sourceControlType === 'AZURE';
  if (product && isAzure && product.azureOrg && product.azureProject && product.azurePat) {
    return {
      org: product.azureOrg,
      project: product.azureProject,
      releaseProject: product.azureReleaseProject || product.azureProject,
      pat: decrypt(product.azurePat),
    };
  }
  return null;
}

/** Belirli bir repo için tarihten itibaren merge edilmiş PR'ları çeker */
async function fetchMergedPRsSince(
  repoName: string,
  sinceDate: Date,
  creds: Creds,
): Promise<{ prId: number; title: string; mergeDate: string; repoName: string }[]> {
  try {
    const url =
      `https://dev.azure.com/${creds.org}/${creds.project}/_apis/git/repositories/` +
      `${encodeURIComponent(repoName)}/pullrequests` +
      `?status=completed&$top=200&api-version=7.1`;

    const res = await fetch(url, { headers: buildHeaders(creds.pat) });
    if (!res.ok) return [];

    const data = (await res.json()) as { value?: Record<string, unknown>[] };
    const prs = data.value ?? [];

    return prs
      .filter((pr) => {
        const closed = pr['closedDate'] as string | undefined;
        return closed ? new Date(closed) > sinceDate : false;
      })
      .map((pr) => ({
        prId: pr['pullRequestId'] as number,
        title: (pr['title'] as string) ?? '',
        mergeDate: (pr['closedDate'] as string) ?? '',
        repoName,
      }));
  } catch {
    return [];
  }
}

// ─── GET /api/service-release-snapshots ──────────────────────────────────────
// ?productVersionId=uuid  → o versiyona ait tüm servis snapshot'larını döner (müşteri portalı için)
// ?productId=uuid         → ürünün tüm servisleri için en son snapshot'ı döner (admin view)
router.get('/', async (req, res, next) => {
  try {
    const { productId, productVersionId } = req.query;

    // ── Mod 1: productVersionId filtresi (müşteri portalı — belirli versiyonun servisleri) ──
    if (productVersionId) {
      const snapshots = await prisma.serviceReleaseSnapshot.findMany({
        where: { productVersionId: String(productVersionId) },
        orderBy: { releasedAt: 'desc' },
        include: {
          service: { select: { id: true, name: true, description: true, dockerImageName: true } },
        },
      });
      res.json({ data: snapshots });
      return;
    }

    // ── Mod 2: productId filtresi (admin — her servis için en son snapshot) ──
    if (!productId) {
      res.json({ data: [] });
      return;
    }

    // Ürünün tüm servislerini bul (direkt + modül içindekiler)
    const product = await prisma.product.findUnique({
      where: { id: String(productId) },
      include: {
        services: { select: { id: true } },
        moduleGroups: {
          include: { modules: { include: { services: { select: { id: true } } } } },
        },
      },
    });
    if (!product) {
      res.json({ data: [] });
      return;
    }

    const serviceIds = new Set<string>();
    product.services.forEach((s) => serviceIds.add(s.id));
    product.moduleGroups.forEach((g) =>
      g.modules.forEach((m) => m.services.forEach((s) => serviceIds.add(s.id))),
    );

    if (serviceIds.size === 0) {
      res.json({ data: [] });
      return;
    }

    // Her servis için en son snapshot (releasedAt DESC, limit 1)
    const snapshots = await prisma.$transaction(
      [...serviceIds].map((sid) =>
        prisma.serviceReleaseSnapshot.findFirst({
          where: { serviceId: sid },
          orderBy: { releasedAt: 'desc' },
        }),
      ),
    );

    // null'ları filtrele
    const data = snapshots.filter(Boolean);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/service-release-snapshots ─────────────────────────────────────
// Release anında çağrılır. Ürünün tüm servislerine snapshot kaydeder.
const createSchema = z.object({
  productId: z.string().uuid(),
  productVersionId: z.string().uuid(),
  releaseName: z.string().optional(),
  serviceIds: z.array(z.string().uuid()).optional(), // belirtilmezse tüm ürün servisleri
});

router.post(
  '/',
  requireRole('ADMIN', 'RELEASE_MANAGER'),
  async (req, res, next) => {
    try {
      const body = createSchema.parse(req.body);
      const publishedBy = (req as unknown as { user?: { id?: string } }).user?.id;

      // Azure credentials
      const creds = await resolveProductCreds(body.productId);
      if (!creds) {
        throw new AppError(400, 'Bu ürün için Azure DevOps yapılandırması eksik.');
      }

      // Ürünün servislerini bul
      const product = await prisma.product.findUnique({
        where: { id: body.productId },
        include: {
          services: { select: { id: true, repoName: true, name: true } },
          moduleGroups: {
            include: {
              modules: {
                include: { services: { select: { id: true, repoName: true, name: true } } },
              },
            },
          },
        },
      });
      if (!product) throw new AppError(404, 'Ürün bulunamadı.');

      // Tüm servisleri topla (repoName olan)
      const allServices = new Map<string, { id: string; repoName: string | null; name: string }>();
      product.services.forEach((s) => allServices.set(s.id, s));
      product.moduleGroups.forEach((g) =>
        g.modules.forEach((m) => m.services.forEach((s) => allServices.set(s.id, s))),
      );

      // serviceIds filtresi varsa uygula
      const targetServices = body.serviceIds
        ? [...allServices.values()].filter((s) => body.serviceIds!.includes(s.id))
        : [...allServices.values()];

      const releasedAt = new Date();
      // Otomatik release adı: "{productName}-{version}-{tarih}"
      const version = await prisma.productVersion.findUnique({
        where: { id: body.productVersionId },
        select: { version: true },
      });
      const autoReleaseName =
        body.releaseName ??
        `${product.name}-${version?.version ?? 'unknown'}-${releasedAt.toISOString().slice(0, 10)}`;

      const succeeded: string[] = [];
      const failed: { serviceId: string; reason: string }[] = [];

      // Her servis için paralel snapshot oluştur
      await Promise.allSettled(
        targetServices.map(async (svc) => {
          try {
            let prIds: { prId: number; title: string; mergeDate: string; repoName: string }[] = [];

            if (svc.repoName) {
              // Bu servisin son snapshot'ını bul
              const lastSnap = await prisma.serviceReleaseSnapshot.findFirst({
                where: { serviceId: svc.id },
                orderBy: { releasedAt: 'desc' },
                select: { releasedAt: true },
              });

              const sinceDate = lastSnap?.releasedAt ?? new Date(0); // snapshot yoksa epoch
              prIds = await fetchMergedPRsSince(svc.repoName, sinceDate, creds);
            }

            await prisma.serviceReleaseSnapshot.create({
              data: {
                serviceId: svc.id,
                productVersionId: body.productVersionId,
                releaseName: autoReleaseName,
                releasedAt,
                prIds,
                publishedBy: publishedBy ?? null,
              },
            });

            succeeded.push(svc.id);
          } catch (err) {
            failed.push({
              serviceId: svc.id,
              reason: err instanceof Error ? err.message : 'Bilinmeyen hata',
            });
          }
        }),
      );

      res.status(201).json({ data: { succeeded, failed } });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /api/service-release-snapshots/initialize ──────────────────────────
// BoM "Azure Baseline Al" butonu tarafından tetiklenir.
// Her servis için Azure Classic Release (vsrm.dev.azure.com) üzerinden
// releaseStage environment'ındaki son başarılı release'i bulur;
// Service.lastReleaseName ve (varsa) Service.currentVersion alanlarını günceller.
const initSchema = z.object({
  productId: z.string().uuid(),
});

router.post(
  '/initialize',
  requireRole('ADMIN', 'RELEASE_MANAGER'),
  async (req, res, next) => {
    try {
      const body = initSchema.parse(req.body);

      const creds = await resolveProductCreds(body.productId);
      if (!creds) throw new AppError(400, 'Bu ürün için Azure DevOps yapılandırması eksik.');

      // Tüm servisleri yükle (releaseName + releaseStage)
      const product = await prisma.product.findUnique({
        where: { id: body.productId },
        include: {
          services: {
            select: { id: true, name: true, repoName: true, releaseName: true, releaseStage: true, prodStageName: true },
          },
          moduleGroups: {
            include: {
              modules: {
                include: {
                  services: {
                    select: { id: true, name: true, repoName: true, releaseName: true, releaseStage: true, prodStageName: true },
                  },
                },
              },
            },
          },
        },
      });
      if (!product) throw new AppError(404, 'Ürün bulunamadı.');

      const allServices = new Map<
        string,
        { id: string; name: string; repoName: string | null; releaseName: string | null; releaseStage: string | null; prodStageName: string | null }
      >();
      product.services.forEach((s) => allServices.set(s.id, s));
      product.moduleGroups.forEach((g) =>
        g.modules.forEach((m) => m.services.forEach((s) => allServices.set(s.id, s))),
      );

      const succeeded: { serviceId: string; releaseName: string }[] = [];
      const skipped: { serviceId: string; reason: string }[] = [];
      const failed: { serviceId: string; reason: string }[] = [];

      await Promise.allSettled(
        [...allServices.values()].map(async (svc) => {
          // Eksik konfig varsa atla
          if (!svc.releaseName) {
            skipped.push({ serviceId: svc.id, reason: 'releaseName tanımlı değil' });
            return;
          }

          try {
            // Azure Classic Release API — releaseProject öncelikli (farklı proje olabilir)
            const token = Buffer.from(`:${creds.pat}`).toString('base64');
            const headers = { Authorization: `Basic ${token}`, 'Content-Type': 'application/json' };
            const base = `https://vsrm.dev.azure.com/${creds.org}/${creds.releaseProject}/_apis`;

            // 1) Release definition ID'sini bul (searchText burada definition adını arar)
            const defsRes = await fetch(
              `${base}/release/definitions?searchText=${encodeURIComponent(svc.releaseName)}&api-version=7.1`,
              { headers },
            );
            if (!defsRes.ok) throw new Error(`Definitions ${defsRes.status}: ${defsRes.statusText}`);
            const defsData = (await defsRes.json()) as { value?: { id: number; name: string }[] };
            const definitions = defsData.value ?? [];

            // Tam eşleşen definition'ı bul (büyük/küçük harf duyarsız)
            const matchedDef = definitions.find(
              (d) => d.name.toLowerCase() === svc.releaseName!.toLowerCase(),
            ) ?? definitions[0]; // tam eşleşme yoksa ilkini al

            if (!matchedDef) {
              skipped.push({ serviceId: svc.id, reason: `"${svc.releaseName}" definition bulunamadı` });
              return;
            }

            // 2a) En son tetiklenen release → lastReleaseName (status fark etmez, $top=1)
            // 2b) releaseStage succeed olan son release → currentVersion (artifact build no)
            // Her iki çağrıyı paralel yap
            const [latestRes, stageRes] = await Promise.all([
              fetch(
                `${base}/release/releases?definitionId=${matchedDef.id}&$top=1&api-version=7.1`,
                { headers },
              ),
              // releaseStage tanımlıysa stage filtreli çağrı; değilse null
              // releaseStage deprecated → prodStageName'e fall-back
              (svc.releaseStage ?? svc.prodStageName)
                ? fetch(
                    `${base}/release/releases?definitionId=${matchedDef.id}&$expand=environments&$top=20&api-version=7.1`,
                    { headers },
                  )
                : Promise.resolve(null),
            ]);

            if (!latestRes.ok) throw new Error(`Releases ${latestRes.status}: ${latestRes.statusText}`);
            const latestData = (await latestRes.json()) as { value?: Record<string, unknown>[] };
            const latestReleases = latestData.value ?? [];

            if (latestReleases.length === 0) {
              skipped.push({ serviceId: svc.id, reason: 'Hiç release bulunamadı' });
              return;
            }
            const lastReleaseName = latestReleases[0]['name'] as string;

            // releaseStage succeed olan release'ten artifact build versiyonu çıkar
            let buildVersion: string | undefined;
            if (stageRes && stageRes.ok) {
              const stageData = (await stageRes.json()) as { value?: Record<string, unknown>[] };
              for (const release of stageData.value ?? []) {
                const envs = (release['environments'] as Record<string, unknown>[] | undefined) ?? [];
                // releaseStage deprecated → prodStageName fall-back
                const effectiveStage = svc.releaseStage ?? svc.prodStageName;
                const targetEnv = envs.find(
                  (e) => String(e['name']).toLowerCase() === effectiveStage!.toLowerCase(),
                );
                if (targetEnv && String(targetEnv['status']).toLowerCase() === 'succeeded') {
                  // Release adını kullan (artifact build no değil)
                  buildVersion = release['name'] as string;
                  break;
                }
              }
            }

            // Service tablosunu güncelle
            await prisma.service.update({
              where: { id: svc.id },
              data: {
                lastReleaseName,
                ...(buildVersion ? { currentVersion: buildVersion } : {}),
              },
            });

            succeeded.push({ serviceId: svc.id, releaseName: lastReleaseName });
          } catch (err) {
            failed.push({
              serviceId: svc.id,
              reason: err instanceof Error ? err.message : 'Bilinmeyen hata',
            });
          }
        }),
      );

      res.status(201).json({ data: { succeeded, skipped, failed, debug: { org: creds.org, project: creds.project, patLen: creds.pat?.length ?? 0 } } });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
