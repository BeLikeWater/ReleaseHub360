import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';
import { decrypt } from '../lib/encryption';
import prisma from '../lib/prisma';

const router = Router();
router.use(authenticateJWT);

type Creds = { org: string; project: string; releaseProject: string; pat: string };

// Per-request credentials: productId query param önceliklidir, yoksa env fallback
async function resolveCredentials(productId?: string): Promise<Creds> {
  if (productId) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    // pmType is deprecated — check both pmType and sourceControlType for backward compat
    const isAzure = product?.pmType === 'AZURE' || product?.sourceControlType === 'AZURE';
    if (product && isAzure && product.azureOrg && product.azureProject && product.azurePat) {
      return {
        org: product.azureOrg,
        project: product.azureProject,
        releaseProject: product.azureReleaseProject || product.azureProject,
        pat: decrypt(product.azurePat),
      };
    }
  }
  // Fallback: env vars
  return {
    org: process.env.TFS_ORG_URL ?? '',
    project: process.env.TFS_PROJECT ?? '',
    releaseProject: process.env.TFS_PROJECT ?? '',
    pat: process.env.TFS_PAT_TOKEN ?? '',
  };
}

function buildHeaders(pat: string) {
  const token = Buffer.from(`:${pat}`).toString('base64');
  return { Authorization: `Basic ${token}`, 'Content-Type': 'application/json' };
}

async function tfsGet(path: string, creds: Creds) {
  const url = `https://dev.azure.com/${creds.org}/${creds.project}/_apis/${path}&api-version=7.1`;
  const res = await fetch(url, { headers: buildHeaders(creds.pat) });
  if (!res.ok) throw new AppError(res.status, `TFS API hatası: ${res.statusText}`);
  return res.json();
}

// Org-level (proje scoping olmadan) API çağrısı — work items için gerekli
async function tfsGetOrg(path: string, creds: Creds) {
  // Trailing & karakterini temizle, ?/& ile uygun şekilde api-version ekle
  const cleanPath = path.replace(/&+$/, '');
  const sep = cleanPath.includes('?') ? '&' : '?';
  const url = `https://dev.azure.com/${creds.org}/_apis/${cleanPath}${sep}api-version=7.1`;
  const res = await fetch(url, { headers: buildHeaders(creds.pat) });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new AppError(res.status, `TFS API hatası: ${res.statusText} — ${body.slice(0, 200)}`);
  }
  return res.json();
}

// Helper: ürünün tüm servislerine ait benzersiz repoName listesini döner
async function getProductRepoNames(productId: string): Promise<string[]> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      services: true,
      moduleGroups: {
        include: {
          modules: {
            include: { services: true },
          },
        },
      },
    },
  });
  if (!product) return [];

  const repoNames = new Set<string>();
  product.services.forEach(s => { if (s.repoName) repoNames.add(s.repoName); });
  product.moduleGroups.forEach(g =>
    g.modules.forEach(m =>
      m.services.forEach(s => { if (s.repoName) repoNames.add(s.repoName); })
    )
  );
  return [...repoNames];
}

// Helper: belirli bir PR için Azure DevOps'tan work item ID'lerini çeker
async function fetchWorkItemRefs(
  repo: string,
  prId: number,
  creds: Creds,
): Promise<{ id: string; url: string }[]> {
  try {
    const url = `https://dev.azure.com/${creds.org}/${creds.project}/_apis/git/repositories/${encodeURIComponent(repo)}/pullRequests/${prId}/workitems?api-version=7.1`;
    const res = await fetch(url, { headers: buildHeaders(creds.pat) });
    if (!res.ok) return [];
    const data = (await res.json()) as { value?: { id: string; url: string }[] };
    return (data.value ?? []).map(wi => ({ id: String(wi.id), url: wi.url }));
  } catch {
    return [];
  }
}

// Azure Classic Release Management API — vsrm.dev.azure.com (farklı host)
// releaseProject kullanır: ürünün azureReleaseProject alanı (yoksa azureProject)
async function vsrmGet(path: string, creds: Creds) {
  const cleanPath = path.replace(/&+$/, '');
  const sep = cleanPath.includes('?') ? '&' : '?';
  const url = `https://vsrm.dev.azure.com/${creds.org}/${creds.releaseProject}/_apis/${cleanPath}${sep}api-version=7.1`;
  const res = await fetch(url, { headers: buildHeaders(creds.pat) });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new AppError(res.status, `VSRM API hatası: ${res.statusText} — ${body.slice(0, 200)}`);
  }
  return res.json();
}

// GET /api/tfs/release-stages?serviceId=X
// Servisin releaseName (Release Definition adı) kullanarak Azure Classic Release API'den
// en son release'in environment/stage listesini döner.
// Kullanıcı bu listeden hangi aşamayı izlemek istediğini seçer → Service.releaseStage
router.get('/release-stages', async (req, res, next) => {
  try {
    const { serviceId, productId, releaseName: releaseNameParam } = req.query;

    let defName: string | null = null;
    let resolvedProductId: string | undefined = productId as string | undefined;

    if (serviceId) {
      const service = await prisma.service.findUnique({ where: { id: String(serviceId) } });
      if (!service) throw new AppError(404, 'Servis bulunamadı');
      defName = service.releaseName ?? null;
      resolvedProductId = service.productId;
    } else if (releaseNameParam) {
      defName = String(releaseNameParam);
    }

    if (!defName) {
      res.json({ data: [] }); // Release Definition adı girilmemiş
      return;
    }

    const creds = await resolveCredentials(resolvedProductId);
    if (!creds.org || !creds.pat) {
      throw new AppError(400, 'Azure credentials bulunamadı');
    }

    // En son release'i çek, environment'ları genişlet
    const data = (await vsrmGet(
      `release/releases?searchText=${encodeURIComponent(defName)}&$expand=environments&$top=5`,
      creds,
    )) as { value?: Record<string, unknown>[] };

    const releases = data.value ?? [];
    if (releases.length === 0) {
      res.json({ data: [], message: `"${defName}" için release bulunamadı` });
      return;
    }

    // İlk (en son) release'in environment'larını al
    const latestRelease = releases[0];
    const environments = (latestRelease['environments'] as Record<string, unknown>[] | undefined) ?? [];

    const stages = environments
      .sort((a, b) => ((a['rank'] as number) ?? 0) - ((b['rank'] as number) ?? 0))
      .map((env) => ({
        id: env['id'] as number,
        name: env['name'] as string,
        rank: env['rank'] as number,
        status: env['status'] as string,
      }));

    res.json({
      data: stages,
      releaseName: latestRelease['name'],
      releaseDefinition: (latestRelease['releaseDefinition'] as Record<string, unknown> | undefined)?.['name'],
    });
  } catch (err) {
    next(err);
  }
});


// ?repo=  →  tek repo (mevcut davranış)
// ?productId=  →  ürünün tüm repoları + her PR için workItemRefs
// (ikisi de yoksa)  →  proje geneli (mevcut davranış)
router.get('/pull-requests', async (req, res, next) => {
  try {
    const { repo, productId } = req.query;
    const creds = await resolveCredentials(productId as string | undefined);

    // -- Belirli bir repo istendi --
    if (repo) {
      const data = await tfsGet(`git/repositories/${encodeURIComponent(repo as string)}/pullrequests?status=all&`, creds);
      res.json({ data });
      return;
    }

    // -- productId var: ürün bazlı multi-repo fetch --
    if (productId) {
      const repoNames = await getProductRepoNames(productId as string);

      // Katalogda repo tanımlı değil → proje geneline düş
      if (repoNames.length === 0) {
        const data = await tfsGet('git/pullrequests?status=all&', creds);
        res.json({ data });
        return;
      }

      // Her repo için paralel PR fetch + her PR için workItemRefs
      const settled = await Promise.allSettled(
        repoNames.map(async (repoName) => {
          const data = await tfsGet(
            `git/repositories/${encodeURIComponent(repoName)}/pullrequests?status=all&`,
            creds,
          ) as { value?: unknown[] };
          const prs = (data.value ?? []) as Record<string, unknown>[];

          // Her PR için work item refs paralel çek
          const prsWithWI = await Promise.all(
            prs.map(async (pr) => {
              const workItemRefs = await fetchWorkItemRefs(repoName, pr['pullRequestId'] as number, creds);
              return { ...pr, workItemRefs };
            }),
          );
          return prsWithWI;
        }),
      );

      const allPRs: unknown[] = [];
      settled.forEach(result => {
        if (result.status === 'fulfilled') allPRs.push(...result.value);
      });

      res.json({ data: { value: allPRs, count: allPRs.length } });
      return;
    }

    // -- Fallback: tüm proje --
    const data = await tfsGet('git/pullrequests?status=all&', creds);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// GET /api/tfs/pipelines
router.get('/pipelines', async (req, res, next) => {
  try {
    const { productId } = req.query;
    const creds = await resolveCredentials(productId as string | undefined);
    const data = await tfsGet('pipelines?', creds);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// GET /api/tfs/pipelines/:id/logs
router.get('/pipelines/:id/logs', async (req, res, next) => {
  try {
    const { productId } = req.query;
    const creds = await resolveCredentials(productId as string | undefined);
    const data = await tfsGet(`pipelines/${req.params.id}/runs?`, creds);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// POST /api/tfs/pipelines/:id/trigger
router.post('/pipelines/:id/trigger', async (req, res, next) => {
  try {
    const { productId } = req.body;
    const creds = await resolveCredentials(productId);
    const url = `https://dev.azure.com/${creds.org}/${creds.project}/_apis/pipelines/${req.params.id}/runs?api-version=7.1`;
    const r = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(creds.pat),
      body: JSON.stringify({ resources: { repositories: { self: { refName: 'refs/heads/main' } } } }),
    });
    res.json(await r.json());
  } catch (err) {
    next(err);
  }
});

// GET /api/tfs/work-items
router.get('/work-items', async (req, res, next) => {
  try {
    const { ids, productId } = req.query;
    if (!ids) {
      res.json({ data: [] });
      return;
    }
    const creds = await resolveCredentials(productId as string | undefined);
    // Work items API — org-level endpoint (proje-scope 400 üretir)
    const data = await tfsGetOrg(`wit/workitems?ids=${ids}&`, creds);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// ─── Yardımcı: AbortController ile timeout'lu fetch ───────────────────────
const fetchWithTimeout = (url: string, opts: RequestInit, ms = 15_000): Promise<Response> => {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(tid));
};

// GET /api/tfs/last-prep-releases?productId=X
// Her servis için "Son Release" bilgisini döner:
//   - releaseName dolu + prepStageName dolu → prepStageName environment'ı succeeded olan en son release
//   - releaseName dolu + prepStageName boş  → en son tetiklenen release ($top=1, status filtresi yok)
//   - releaseName boş → servis atlanır
// Servis bazlı releaseProject override'ını destekler.
router.get('/last-prep-releases', async (req, res, next) => {
  try {
    const { productId } = req.query;
    if (!productId) throw new AppError(400, 'productId zorunlu');

    const creds = await resolveCredentials(String(productId));
    if (!creds.org || !creds.pat) throw new AppError(400, 'Azure credentials bulunamadı');

    const product = await prisma.product.findUnique({
      where: { id: String(productId) },
      include: {
        services: true,
        moduleGroups: { include: { modules: { include: { services: true } } } },
      },
    });
    if (!product) throw new AppError(404, 'Ürün bulunamadı');

    // Tüm servisleri topla (deduplication ile)
    const allServicesMap = new Map<string, {
      id: string;
      releaseName: string | null;
      prepStageName: string | null;
      releaseProject: string | null;
    }>();
    product.services.forEach(s => allServicesMap.set(s.id, s));
    product.moduleGroups.forEach(g =>
      g.modules.forEach(m => m.services.forEach(s => allServicesMap.set(s.id, s)))
    );

    const headers = buildHeaders(creds.pat);
    const defIdCache = new Map<string, number | null>(); // releaseName → defId (null = bulunamadı)

    const results: { serviceId: string; lastPrepReleaseName: string | null }[] = [];
    let authError: string | null = null;

    await Promise.allSettled(
      [...allServicesMap.values()].map(async (svc) => {
        // releaseName yoksa bu servis için release sorgusu yapılamaz — atla
        if (!svc.releaseName) return;

        // Servis bazlı releaseProject override — yoksa product'ın azureReleaseProject → azureProject fallback
        const releaseProject = svc.releaseProject
          ?? product.azureReleaseProject
          ?? creds.releaseProject;
        const vsrmBase = `https://vsrm.dev.azure.com/${creds.org}/${releaseProject}/_apis`;

        try {
          // 1) Release Definition ID (cache)
          const defKey = `${releaseProject}::${svc.releaseName.toLowerCase()}`;
          let defId = defIdCache.get(defKey);
          if (defId === undefined) {
            const defUrl = `${vsrmBase}/release/definitions?searchText=${encodeURIComponent(svc.releaseName)}&api-version=7.1`;
            const r = await fetchWithTimeout(defUrl, { headers });
            if (!r.ok) {
              if (r.status === 401 || r.status === 403) {
                authError = `vsrm ${r.status} — Azure kimlik doğrulama hatası. PAT ve proje adını kontrol edin.`;
              }
              defIdCache.set(defKey, null);
              return;
            }
            const d = (await r.json()) as { value?: { id: number; name: string }[] };
            const matched = (d.value ?? []).find(
              x => x.name.toLowerCase() === svc.releaseName!.toLowerCase()
            ) ?? d.value?.[0];
            defId = matched?.id ?? null;
            defIdCache.set(defKey, defId ?? null);
          }
          if (!defId) return;

          if (svc.prepStageName) {
            // prepStageName varsa: en son succeeded release'i bul
            const relR = await fetchWithTimeout(
              `${vsrmBase}/release/releases?definitionId=${defId}&$top=50&$expand=environments&api-version=7.1`,
              { headers },
            );
            if (!relR.ok) {
              if (relR.status === 401 || relR.status === 403) {
                authError = `vsrm ${relR.status} — Azure kimlik doğrulama hatası.`;
              }
              return;
            }
            const relD = (await relR.json()) as {
              value?: {
                name: string;
                environments: { name: string; status: string }[];
              }[];
            };
            const releases = relD.value ?? [];
            const prepLower = svc.prepStageName.toLowerCase();
            const found = releases.find(rel => {
              const env = rel.environments?.find(e => e.name.toLowerCase() === prepLower);
              return env?.status?.toLowerCase() === 'succeeded';
            });
            results.push({ serviceId: svc.id, lastPrepReleaseName: found?.name ?? null });
          } else {
            // prepStageName boşsa: en son tetiklenen release (status filtresi yok)
            const relUrl = `${vsrmBase}/release/releases?definitionId=${defId}&$top=1&api-version=7.1`;
            const relR = await fetchWithTimeout(relUrl, { headers });
            if (!relR.ok) {
              if (relR.status === 401 || relR.status === 403) {
                authError = `vsrm ${relR.status} — Azure kimlik doğrulama hatası.`;
              }
              return;
            }
            const relD = (await relR.json()) as { value?: { name: string }[] };
            const latestName = relD.value?.[0]?.name ?? null;
            results.push({ serviceId: svc.id, lastPrepReleaseName: latestName });
          }
        } catch {
          results.push({ serviceId: svc.id, lastPrepReleaseName: null });
        }
      }),
    );

    res.json({ data: results, ...(authError ? { authError } : {}) });
  } catch (err) {
    next(err);
  }
});

// GET /api/tfs/release-delta?productId=X
// currentVersion → lastReleaseName arasındaki merged PR'ları servis bazlı döner.
// Aynı repo için PR listesi bir kez çekilir (cache).
router.get('/release-delta', async (req, res, next) => {
  try {
    const { productId } = req.query;
    if (!productId) throw new AppError(400, 'productId zorunlu');

    const creds = await resolveCredentials(String(productId));
    if (!creds.org || !creds.pat) throw new AppError(400, 'Azure credentials bulunamadı');

    const product = await prisma.product.findUnique({
      where: { id: String(productId) },
      include: {
        services: true,
        moduleGroups: { include: { modules: { include: { services: true } } } },
      },
    });
    if (!product) throw new AppError(404, 'Ürün bulunamadı');

    const headers = buildHeaders(creds.pat);
    const vsrmBase = `https://vsrm.dev.azure.com/${creds.org}/${creds.releaseProject}/_apis`;
    const gitBase  = `https://dev.azure.com/${creds.org}/${creds.project}/_apis`;

    // Tüm servisleri topla
    const allServices = new Map<string, {
      id: string; releaseName: string | null; currentVersion: string | null;
      lastReleaseName: string | null; repoName: string | null;
    }>();
    product.services.forEach(s => allServices.set(s.id, s));
    product.moduleGroups.forEach(g => g.modules.forEach(m => m.services.forEach(s => allServices.set(s.id, s))));

    // Tekrar sorgu yapmamak için cache'ler
    const defIdCache  = new Map<string, number>();
    const repoPRCache = new Map<string, Record<string, unknown>[]>();

    const results: { serviceId: string; prs: Record<string, unknown>[] }[] = [];
    let authError: string | null = null;

    await Promise.allSettled(
      [...allServices.values()].map(async (svc) => {
        if (!svc.releaseName || !svc.currentVersion || !svc.lastReleaseName || !svc.repoName) return;
        if (svc.currentVersion === svc.lastReleaseName) {
          results.push({ serviceId: svc.id, prs: [] });
          return;
        }
        try {
          // 1) Definition ID (cache'den veya API'den)
          const defKey = svc.releaseName.toLowerCase();
          let defId = defIdCache.get(defKey);
          if (defId === undefined) {
            const r = await fetchWithTimeout(
              `${vsrmBase}/release/definitions?searchText=${encodeURIComponent(svc.releaseName)}&api-version=7.1`,
              { headers },
            );
            if (!r.ok) {
              if (r.status === 401 || r.status === 403) {
                authError = `vsrm ${r.status} — Microsoft Entra Conditional Access Policy engelledi. Backend VPN bağlantısını kontrol edin.`;
              }
              return;
            }
            const d = (await r.json()) as { value?: { id: number; name: string }[] };
            const matched = (d.value ?? []).find(x => x.name.toLowerCase() === defKey) ?? d.value?.[0];
            if (!matched) return;
            defId = matched.id;
            defIdCache.set(defKey, defId);
          }

          // 2) Son 100 release içinden her iki versiyonu bul → tarih aralığı al
          const relR = await fetchWithTimeout(
            `${vsrmBase}/release/releases?definitionId=${defId}&$top=100&api-version=7.1`,
            { headers },
          );
          if (!relR.ok) {
            if (relR.status === 401 || relR.status === 403) {
              authError = `vsrm ${relR.status} — Microsoft Entra Conditional Access Policy engelledi. Backend VPN bağlantısını kontrol edin.`;
            }
            return;
          }
          const relD = (await relR.json()) as { value?: Record<string, unknown>[] };
          const releases = relD.value ?? [];

          const baseRel = releases.find(r => r['name'] === svc.currentVersion);
          const headRel = releases.find(r => r['name'] === svc.lastReleaseName);
          if (!baseRel || !headRel) return;

          const baseDate = new Date(baseRel['createdOn'] as string);
          const headDate = new Date(headRel['createdOn'] as string);

          // 3) Repo PR'larını çek (cache)
          let repoPRs = repoPRCache.get(svc.repoName);
          if (!repoPRs) {
            const prR = await fetchWithTimeout(
              `${gitBase}/git/repositories/${encodeURIComponent(svc.repoName)}/pullrequests?status=completed&$top=500&api-version=7.1`,
              { headers },
            );
            if (!prR.ok) return;
            const prD = (await prR.json()) as { value?: Record<string, unknown>[] };
            repoPRs = prD.value ?? [];
            repoPRCache.set(svc.repoName, repoPRs);
          }

          // 4) baseDate < closedDate <= headDate filtrele
          const deltaPRs = repoPRs.filter(pr => {
            const closed = pr['closedDate'] ? new Date(pr['closedDate'] as string) : null;
            return closed && closed > baseDate && closed <= headDate;
          });

          // 5) Her delta PR için work item refs paralel çek
          const prsWithWI = await Promise.all(
            deltaPRs.map(async pr => {
              try {
                const wiUrl = `${gitBase}/git/repositories/${encodeURIComponent(svc.repoName!)}/pullRequests/${pr['pullRequestId']}/workitems?api-version=7.1`;
                const wiRes = await fetch(wiUrl, { headers });
                const wiD = wiRes.ok ? (await wiRes.json()) as { value?: { id: number | string; url: string }[] } : { value: [] };
                return { ...pr, workItemRefs: (wiD.value ?? []).map(w => ({ id: Number(w.id), url: w.url })) };
              } catch {
                return { ...pr, workItemRefs: [] };
              }
            }),
          );

          results.push({ serviceId: svc.id, prs: prsWithWI });
        } catch {
          // hata varsa bu servisi atla
        }
      }),
    );

    res.json({ data: results, ...(authError ? { authError } : {}) });
  } catch (err) {
    next(err);
  }
});

// POST /api/tfs/refresh-prep-release?productId=X[&serviceId=Y]
// Bir veya tüm servisler için Azure VSRM'den son prep release adı + tarihini çeker
// ve services tablosuna yazar (lastPrepReleaseName + lastPrepReleaseDate).
// serviceId verilmezse ürünün tüm servisleri güncellenir.
router.post('/refresh-prep-release', async (req, res, next) => {
  try {
    const productId = String(req.query.productId ?? '');
    const serviceId = req.query.serviceId ? String(req.query.serviceId) : null;

    if (!productId) throw new AppError(400, 'productId zorunludur');

    // Ürün + servisler + creds
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        services: true,
        moduleGroups: { include: { modules: { include: { services: true } } } },
      },
    });
    if (!product) throw new AppError(404, 'Ürün bulunamadı');

    const creds = await resolveCredentials(productId);
    if (!creds.pat) throw new AppError(400, 'Azure PAT tanımlı değil');

    // Tüm servisleri birleştir (düz liste, tekrarsız)
    const allServicesMap = new Map<string, {
      id: string;
      releaseName: string | null;
      prepStageName: string | null;
      releaseProject: string | null;
    }>();
    product.services.forEach(s => allServicesMap.set(s.id, s));
    product.moduleGroups.forEach(g =>
      g.modules.forEach(m => m.services.forEach(s => allServicesMap.set(s.id, s)))
    );

    // Hedef servisleri belirle
    const targets = serviceId
      ? [allServicesMap.get(serviceId)].filter(Boolean) as typeof product.services
      : [...allServicesMap.values()];

    if (serviceId && targets.length === 0) {
      throw new AppError(404, 'Servis bulunamadı veya bu ürüne ait değil');
    }

    const headers = buildHeaders(creds.pat);
    const defIdCache = new Map<string, number | null>();

    type RefreshResult = {
      serviceId: string;
      lastPrepReleaseName: string | null;
      lastPrepReleaseDate: string | null;
      error?: string;
    };
    const results: RefreshResult[] = [];
    let authError: string | null = null;

    await Promise.allSettled(
      targets.map(async (svc) => {
        if (!svc.releaseName) {
          results.push({ serviceId: svc.id, lastPrepReleaseName: null, lastPrepReleaseDate: null });
          return;
        }

        const releaseProject = svc.releaseProject
          ?? product.azureReleaseProject
          ?? creds.releaseProject;
        const vsrmBase = `https://vsrm.dev.azure.com/${creds.org}/${releaseProject}/_apis`;

        try {
          // 1) Definition ID (cache per releaseProject + releaseName)
          const defKey = `${releaseProject}::${svc.releaseName.toLowerCase()}`;
          let defId = defIdCache.get(defKey);
          if (defId === undefined) {
            const defUrl = `${vsrmBase}/release/definitions?searchText=${encodeURIComponent(svc.releaseName)}&api-version=7.1`;
            const r = await fetchWithTimeout(defUrl, { headers });
            if (!r.ok) {
              if (r.status === 401 || r.status === 403) {
                authError = `vsrm ${r.status} — Azure kimlik doğrulama hatası. PAT ve proje adını kontrol edin.`;
              }
              defIdCache.set(defKey, null);
              results.push({ serviceId: svc.id, lastPrepReleaseName: null, lastPrepReleaseDate: null, error: `definition lookup ${r.status}` });
              return;
            }
            const d = (await r.json()) as { value?: { id: number; name: string }[] };
            const matched = (d.value ?? []).find(
              x => x.name.toLowerCase() === svc.releaseName!.toLowerCase()
            ) ?? d.value?.[0];
            defId = matched?.id ?? null;
            defIdCache.set(defKey, defId ?? null);
          }
          if (!defId) {
            results.push({ serviceId: svc.id, lastPrepReleaseName: null, lastPrepReleaseDate: null, error: 'definition not found' });
            return;
          }

          let releaseName: string | null = null;
          let releaseDate: string | null = null;

          if (svc.prepStageName) {
            // prepStageName dolu → succeeded olan en son release'i bul
            const relR = await fetchWithTimeout(
              `${vsrmBase}/release/releases?definitionId=${defId}&$top=50&$expand=environments&api-version=7.1`,
              { headers },
            );
            if (!relR.ok) {
              if (relR.status === 401 || relR.status === 403) {
                authError = `vsrm ${relR.status} — Azure kimlik doğrulama hatası.`;
              }
              results.push({ serviceId: svc.id, lastPrepReleaseName: null, lastPrepReleaseDate: null, error: `releases ${relR.status}` });
              return;
            }
            const relD = (await relR.json()) as {
              value?: { name: string; createdOn?: string; environments: { name: string; status: string }[] }[];
            };
            const prepLower = svc.prepStageName.toLowerCase();
            const found = (relD.value ?? []).find(rel => {
              const env = rel.environments?.find(e => e.name.toLowerCase() === prepLower);
              return env?.status?.toLowerCase() === 'succeeded';
            });
            releaseName = found?.name ?? null;
            releaseDate = found?.createdOn ?? null;
          } else {
            // prepStageName boş → en son tetiklenen release
            const relR = await fetchWithTimeout(
              `${vsrmBase}/release/releases?definitionId=${defId}&$top=1&api-version=7.1`,
              { headers },
            );
            if (!relR.ok) {
              if (relR.status === 401 || relR.status === 403) {
                authError = `vsrm ${relR.status} — Azure kimlik doğrulama hatası.`;
              }
              results.push({ serviceId: svc.id, lastPrepReleaseName: null, lastPrepReleaseDate: null, error: `releases ${relR.status}` });
              return;
            }
            const relD = (await relR.json()) as { value?: { name: string; createdOn?: string }[] };
            releaseName = relD.value?.[0]?.name ?? null;
            releaseDate = relD.value?.[0]?.createdOn ?? null;
          }

          // 2) DB'ye yaz
          await prisma.service.update({
            where: { id: svc.id },
            data: {
              lastPrepReleaseName: releaseName,
              lastPrepReleaseDate: releaseDate ? new Date(releaseDate) : null,
            },
          });

          results.push({
            serviceId: svc.id,
            lastPrepReleaseName: releaseName,
            lastPrepReleaseDate: releaseDate,
          });
        } catch {
          results.push({ serviceId: svc.id, lastPrepReleaseName: null, lastPrepReleaseDate: null, error: 'unexpected error' });
        }
      }),
    );

    res.json({ data: results, ...(authError ? { authError } : {}) });
  } catch (err) {
    next(err);
  }
});

export default router;

