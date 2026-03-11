import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';

const router = Router();
router.use(authenticateJWT);

const MCP_BASE = () => process.env.MCP_SERVER_URL ?? 'http://localhost:8083';

async function mcpRequest(path: string, method = 'GET', body?: unknown, opts?: { allowNotFound?: boolean }) {
  let res: Response;
  try {
    res = await fetch(`${MCP_BASE()}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new AppError(503, 'MCP sunucusuna ulaşılamıyor. Servis geçici olarak kullanım dışı.');
  }
  if (res.status === 404 && opts?.allowNotFound) return null;
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new AppError(res.status, `MCP Server hatası: ${detail}`);
  }
  return res.json() as Promise<unknown>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Resolve Azure credentials from service → product chain. */
async function getProductCredsByService(serviceId: string) {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: { product: true },
  });
  if (!service?.product) return null;
  const p = service.product;
  if (!p.azureOrg || !p.azureProject || !p.azurePat) return null;
  return { org: p.azureOrg, project: p.azureProject, pat: p.azurePat };
}

function buildSyncBranchPrefix(version: string, serviceName: string): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const safeService = serviceName.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);
  return `features/sync/v${version}-${safeService}-${date}`;
}

/** Customer branch'in azureOrg/azureProject'i varsa onları kullan; yoksa product credentials'ı kullan. */
function resolveSyncCredentials(
  productCreds: { org: string; project: string; pat: string },
  customerBranch: { azureOrg?: string | null; azureProject?: string | null; azurePat?: string | null },
) {
  return {
    org: customerBranch.azureOrg || productCreds.org,
    project: customerBranch.azureProject || productCreds.project,
    pat: customerBranch.azurePat || productCreds.pat,
  };
}

interface UserPayload { id?: string; userType?: string; customerId?: string; role?: string }

// ─── 1. List customer branches ─────────────────────────────────────────────
// GET /api/code-sync/customer-branches?customerId=&serviceId=
router.get('/customer-branches', async (req, res, next) => {
  try {
    const { customerId, serviceId: _serviceId } = req.query as Record<string, string | undefined>;
    // serviceId gelirse gelecekte kullanılabilir; branch filtrelemesi sadece customerId üzerinden yapılır
    // (müşteri reposu ürün reposundan farklı org/proje olabilir — repoName eşleştirmesi yapılmaz)

    const branches = await prisma.customerBranch.findMany({
      where: {
        ...(customerId ? { customerId } : {}),
        isActive: true,
      },
      include: {
        customer: { select: { id: true, name: true } },
        syncHistory: {
          where: { status: 'SUCCESS' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, createdAt: true, payload: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      data: branches.map((b) => ({
        id: b.id,
        customerId: b.customerId,
        customerName: b.customer.name,
        branchName: b.branchName,
        repoName: b.repoName,
        baseBranch: b.baseBranch,
        azureOrg: b.azureOrg,
        azureProject: b.azureProject,
        description: b.description,
        isActive: b.isActive,
        lastSync: b.syncHistory[0] ?? null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ─── 1b. Create customer branch (admin) ────────────────────────────────────
// POST /api/code-sync/customer-branches
router.post('/customer-branches', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const body = z.object({
      customerId: z.string().min(1),
      branchName: z.string().min(1),
      repoName: z.string().min(1),
      azureOrg: z.string().optional(),
      azureProject: z.string().optional(),
      azurePat: z.string().optional(),
      baseBranch: z.string().optional(),
      description: z.string().optional(),
      isActive: z.boolean().default(true),
    }).parse(req.body);

    const branch = await prisma.customerBranch.create({
      data: body,
      include: { customer: { select: { id: true, name: true } } },
    });
    res.status(201).json({
      data: {
        id: branch.id,
        customerId: branch.customerId,
        customerName: branch.customer.name,
        branchName: branch.branchName,
        repoName: branch.repoName,
        azureOrg: branch.azureOrg,
        azureProject: branch.azureProject,
        description: branch.description,
        isActive: branch.isActive,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── 1c. Update customer branch ─────────────────────────────────────────────
// PUT /api/code-sync/customer-branches/:id
// Admin: tüm alanlar; Müşteri: sadece azurePat, branchName, description
router.put('/customer-branches/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = ((req as unknown as { user?: UserPayload }).user);
    const isAdmin = user?.userType === 'ORG' && ['ADMIN', 'RELEASE_MANAGER'].includes(user.role ?? '');
    const isCustomer = user?.userType === 'CUSTOMER';

    if (!isAdmin && !isCustomer) throw new AppError(403, 'Yetersiz yetki.');

    const branch = await prisma.customerBranch.findUnique({ where: { id } });
    if (!branch) throw new AppError(404, 'Branch bulunamadı.');

    // Customer kendi branch'ini mi güncelliyor?
    if (isCustomer && branch.customerId !== user?.customerId) {
      throw new AppError(403, 'Bu branch\'i düzenleme yetkiniz yok.');
    }

    let updateData: Record<string, unknown>;
    if (isAdmin) {
      updateData = z.object({
        branchName: z.string().min(1).optional(),
        repoName: z.string().min(1).optional(),
        azureOrg: z.string().nullable().optional(),
        azureProject: z.string().nullable().optional(),
        azurePat: z.string().nullable().optional(),
        baseBranch: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
      }).parse(req.body);
    } else {
      // Customer: sadece izin verilen alanlar
      updateData = z.object({
        azurePat: z.string().nullable().optional(),
        branchName: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
      }).parse(req.body);
    }

    const updated = await prisma.customerBranch.update({
      where: { id },
      data: updateData,
      include: { customer: { select: { id: true, name: true } } },
    });
    res.json({
      data: {
        id: updated.id,
        customerId: updated.customerId,
        customerName: updated.customer.name,
        branchName: updated.branchName,
        repoName: updated.repoName,
        azureOrg: updated.azureOrg,
        azureProject: updated.azureProject,
        description: updated.description,
        isActive: updated.isActive,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── 1d. Delete (soft) customer branch (admin) ──────────────────────────────
// DELETE /api/code-sync/customer-branches/:id
router.delete('/customer-branches/:id', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const id = String(req.params['id']);
    await prisma.customerBranch.update({
      where: { id },
      data: { isActive: false },
    });
    res.json({ data: { id, isActive: false } });
  } catch (err) {
    next(err);
  }
});

// ─── 2. Delta (workitem-grouped PR diff between two versions) ──────────────
// GET /api/code-sync/delta?sourceVersionId=&targetVersionId=&serviceId=&customerBranchId=
router.get('/delta', async (req, res, next) => {
  try {
    const { sourceVersionId, targetVersionId, serviceId, customerBranchId } = z
      .object({
        sourceVersionId: z.string().min(1),
        targetVersionId: z.string().min(1),
        serviceId: z.string().min(1),
        customerBranchId: z.string().min(1),
      })
      .parse(req.query);

    const [srcSnap, tgtSnap] = await Promise.all([
      prisma.serviceReleaseSnapshot.findFirst({
        where: { serviceId, productVersionId: sourceVersionId },
      }),
      prisma.serviceReleaseSnapshot.findFirst({
        where: { serviceId, productVersionId: targetVersionId },
      }),
    ]);

    if (!tgtSnap) {
      throw new AppError(404, 'Hedef versiyon snapshot\'u bulunamadı. Servis snapshot\'u yayınlanmış olmalı.');
    }

    // prIds alanı integer[] veya {prId:number,...}[] olabilir — normalize et
    const normalizePrIds = (raw: unknown): number[] => {
      if (!Array.isArray(raw)) return [];
      return raw.map((item) => {
        if (typeof item === 'number') return item;
        if (typeof item === 'object' && item !== null && 'prId' in item) return Number((item as { prId: unknown }).prId);
        return NaN;
      }).filter((n) => !isNaN(n));
    };

    const srcPrIds = new Set<number>(normalizePrIds(srcSnap?.prIds));
    const tgtPrIds: number[] = normalizePrIds(tgtSnap.prIds);
    const deltaPrIds = tgtPrIds.filter((id) => !srcPrIds.has(id));

    if (deltaPrIds.length === 0) {
      return res.json({ data: { workitems: [], unclassified: [], total_pr_count: 0, alreadySyncedPrIds: [] } });
    }

    const [creds, customerBranch] = await Promise.all([
      getProductCredsByService(serviceId),
      prisma.customerBranch.findUnique({ where: { id: customerBranchId } }),
    ]);
    if (!creds) throw new AppError(400, 'Bu servise ait Azure DevOps credentials bulunamadı.');
    if (!customerBranch) throw new AppError(404, 'Müşteri branch bulunamadı.');

    const syncCreds = resolveSyncCredentials(creds, customerBranch);

    const deltaDetails = (await mcpRequest('/api/code-sync/delta-details', 'POST', {
      azure_org: syncCreds.org,
      azure_project: syncCreds.project,
      azure_pat: syncCreds.pat,
      pr_ids: deltaPrIds,
    })) as { workitems: unknown[]; unclassified: unknown[]; total_pr_count: number };

    let alreadySyncedPrIds: number[] = [];
    if (customerBranch.repoName) {
      const customerPRs = (await mcpRequest('/api/code-sync/customer-branch-prs', 'POST', {
        azure_org: syncCreds.org,
        azure_project: syncCreds.project,
        azure_pat: syncCreds.pat,
        repository_name: customerBranch.repoName,
        branch_name: customerBranch.branchName,
      }).catch(() => ({ prs: [] }))) as { prs: { prId: number }[] };
      alreadySyncedPrIds = (customerPRs.prs ?? []).map((p) => p.prId);
    }

    return res.json({ data: { ...deltaDetails, alreadySyncedPrIds } });
  } catch (err) {
    next(err);
  }
});

// ─── 3. Customer branch PRs ────────────────────────────────────────────────
// GET /api/code-sync/customer-prs?customerBranchId=&serviceId=
router.get('/customer-prs', async (req, res, next) => {
  try {
    const { customerBranchId, serviceId } = z
      .object({ customerBranchId: z.string().min(1), serviceId: z.string().min(1) })
      .parse(req.query);

    const [customerBranch, creds] = await Promise.all([
      prisma.customerBranch.findUnique({ where: { id: customerBranchId } }),
      getProductCredsByService(serviceId),
    ]);
    if (!customerBranch) throw new AppError(404, 'Müşteri branch bulunamadı.');
    if (!creds) throw new AppError(400, 'Azure DevOps credentials bulunamadı.');
    if (!customerBranch.repoName) throw new AppError(400, 'Branch\'e bağlı repo adı eksik.');

    const syncCreds = resolveSyncCredentials(creds, customerBranch);
    const data = await mcpRequest('/api/code-sync/customer-branch-prs', 'POST', {
      azure_org: syncCreds.org,
      azure_project: syncCreds.project,
      azure_pat: syncCreds.pat,
      repository_name: customerBranch.repoName,
      branch_name: customerBranch.branchName,
    });
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// ─── 4. Conflict check ─────────────────────────────────────────────────────
// POST /api/code-sync/conflict-check
// Body: { serviceId, customerBranchId, prIds: number[] }
router.post('/conflict-check', async (req, res, next) => {
  try {
    const { serviceId, customerBranchId, prIds } = z
      .object({
        serviceId: z.string().min(1),
        customerBranchId: z.string().min(1),
        prIds: z.array(z.number()).min(1),
      })
      .parse(req.body);

    const [creds, customerBranch, svc] = await Promise.all([
      getProductCredsByService(serviceId),
      prisma.customerBranch.findUnique({ where: { id: customerBranchId } }),
      prisma.service.findUnique({ where: { id: serviceId } }),
    ]);
    if (!creds) throw new AppError(400, 'Azure DevOps credentials bulunamadı.');
    if (!customerBranch) throw new AppError(404, 'Müşteri branch bulunamadı.');

    const repoName = customerBranch.repoName || svc?.repoName;
    if (!repoName) throw new AppError(400, 'Repo adı bulunamadı.');

    const syncCreds = resolveSyncCredentials(creds, customerBranch);
    const data = await mcpRequest('/api/code-sync/preview', 'POST', {
      azure_org: syncCreds.org,
      azure_project: syncCreds.project,
      azure_pat: syncCreds.pat,
      repository_name: repoName,
      source_branch: 'master',
      target_branch: customerBranch.branchName,
      pr_ids: prIds,
    });
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// ─── 5. Start sync ─────────────────────────────────────────────────────────
// POST /api/code-sync/start
// Body: { serviceId, customerBranchId, sourceVersionId, targetVersionId, prIds, workitemSummary? }
router.post('/start', async (req, res, next) => {
  try {
    const { serviceId, customerBranchId, sourceVersionId, targetVersionId, prIds, workitemSummary, workitemCount } =
      z.object({
        serviceId: z.string().min(1),
        customerBranchId: z.string().min(1),
        sourceVersionId: z.string().min(1),
        targetVersionId: z.string().min(1),
        prIds: z.array(z.number()).min(1),
        workitemSummary: z.string().optional(),
        workitemCount: z.number().optional(),
      }).parse(req.body);

    const [creds, customerBranch, srcVersion, tgtVersion, svc] = await Promise.all([
      getProductCredsByService(serviceId),
      prisma.customerBranch.findUnique({ where: { id: customerBranchId } }),
      prisma.productVersion.findUnique({ where: { id: sourceVersionId }, select: { version: true } }),
      prisma.productVersion.findUnique({ where: { id: targetVersionId } }),
      prisma.service.findUnique({ where: { id: serviceId } }),
    ]);
    if (!creds) throw new AppError(400, 'Azure DevOps credentials bulunamadı.');
    if (!customerBranch) throw new AppError(404, 'Müşteri branch bulunamadı.');
    if (!tgtVersion) throw new AppError(404, 'Hedef versiyon bulunamadı.');

    const repoName = customerBranch.repoName || svc?.repoName;
    if (!repoName) throw new AppError(400, 'Repo adı bulunamadı.');

    const syncCreds = resolveSyncCredentials(creds, customerBranch);
    const syncBranchPrefix = buildSyncBranchPrefix(tgtVersion.version, svc?.name ?? serviceId);
    const prDescription =
      `ReleaseHub360 tarafından otomatik oluşturulmuştur.\n\n` +
      `Kaynak versiyon: ${sourceVersionId}\n` +
      `Hedef versiyon: ${tgtVersion.version}\n\n` +
      (workitemSummary ? `Alınan özellikler:\n${workitemSummary}` : '');

    const userId = ((req as unknown as { user?: UserPayload }).user)?.id;

    const syncRecord = await prisma.syncHistory.create({
      data: {
        customerBranchId,
        sourceBranch: 'master',
        targetBranch: customerBranch.branchName,
        status: 'RUNNING',
        syncBranchName: syncBranchPrefix,
        triggeredBy: userId,
        payload: { serviceId, sourceVersionId, targetVersionId, sourceVersionStr: srcVersion?.version, targetVersionStr: tgtVersion.version, prIds, repositoryName: repoName, workitemCount: workitemCount ?? null },
      },
    });

    const mcpResp = (await mcpRequest('/api/code-sync/async-cherry-pick', 'POST', {
      azure_org: syncCreds.org,
      azure_project: syncCreds.project,
      azure_pat: syncCreds.pat,
      repository_name: repoName,
      source_branch: 'master',
      target_branch: customerBranch.branchName,
      pr_ids: prIds,
      sync_branch_prefix: syncBranchPrefix,
      pr_title: `${syncBranchPrefix} → ${customerBranch.branchName}`,
      pr_description: prDescription,
    })) as { jobId: string };

    await prisma.syncHistory.update({
      where: { id: syncRecord.id },
      data: {
        payload: {
          serviceId, sourceVersionId, targetVersionId, sourceVersionStr: srcVersion?.version, targetVersionStr: tgtVersion.version, prIds, repositoryName: repoName,
          mcpJobId: mcpResp.jobId, workitemCount: workitemCount ?? null,
        },
      },
    });

    res.status(202).json({ data: { syncId: syncRecord.id, mcpJobId: mcpResp.jobId, status: 'RUNNING' } });
  } catch (err) {
    next(err);
  }
});

// ─── 6. Sync history ───────────────────────────────────────────────────────
// GET /api/code-sync/history?customerBranchId=&limit=
router.get('/history', async (req, res, next) => {
  try {
    const { customerBranchId, limit } = z
      .object({
        customerBranchId: z.string().min(1),
        limit: z.coerce.number().int().positive().max(100).default(20),
      })
      .parse(req.query);

    const records = await prisma.syncHistory.findMany({
      where: { customerBranchId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { customerBranch: { select: { branchName: true, repoName: true } } },
    });
    res.json({ data: records });
  } catch (err) {
    next(err);
  }
});

// ─── 7. Sync status polling ────────────────────────────────────────────────
// GET /api/code-sync/:syncId/status
router.get('/:syncId/status', async (req, res, next) => {
  try {
    const { syncId } = req.params;
    const record = await prisma.syncHistory.findUnique({ where: { id: syncId } });
    if (!record) throw new AppError(404, 'Sync kaydı bulunamadı.');

    if (['SUCCESS', 'FAILED', 'CONFLICT'].includes(record.status)) {
      return res.json({
        data: {
          status: record.status,
          syncBranchName: record.syncBranchName,
          conflictDetails: record.conflictDetails,
          completedAt: record.completedAt,
          payload: record.payload,
        },
      });
    }

    const payload = record.payload as Record<string, unknown> | null;
    const mcpJobId = payload?.mcpJobId as string | undefined;
    if (!mcpJobId) {
      return res.json({ data: { status: record.status, syncBranchName: record.syncBranchName } });
    }

    const mcpStatus = (await mcpRequest(`/api/code-sync/async-cherry-pick/${mcpJobId}`, 'GET', undefined, { allowNotFound: true })) as {
      status: string;
      syncBranchName?: string;
      progress?: unknown;
      result?: { prUrl?: string; prId?: number } | null;
      conflict?: { prId?: number; files?: string[] } | null;
      error?: string | null;
    } | null;

    // MCP job bulunamadı (servis yeniden başlatılmış olabilir) → FAILED olarak işaretle
    if (!mcpStatus) {
      await prisma.syncHistory.update({
        where: { id: syncId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          payload: {
            ...(payload ?? {}),
            mcpError: 'MCP job kaydı bulunamadı. MCP servisi yeniden başlatılmış olabilir.',
          },
        },
      });
      return res.json({
        data: {
          status: 'FAILED',
          error: 'MCP job kaydı bulunamadı. Sync işlemi kesildi — tekrar başlatın.',
          syncBranchName: record.syncBranchName,
        },
      });
    }

    const newStatus = (mcpStatus.status ?? record.status).toUpperCase();

    if (['SUCCESS', 'FAILED', 'CONFLICT'].includes(newStatus)) {
      await prisma.syncHistory.update({
        where: { id: syncId },
        data: {
          status: newStatus,
          syncBranchName: mcpStatus.syncBranchName ?? record.syncBranchName,
          completedAt: new Date(),
          conflictDetails: mcpStatus.conflict ? (mcpStatus.conflict as object) : undefined,
          mergeCommitId: newStatus === 'SUCCESS' ? String(mcpStatus.result?.prId ?? '') : undefined,
          payload: {
            ...(payload ?? {}),
            prUrl: mcpStatus.result?.prUrl,
            mcpResult: mcpStatus.result,
          },
        },
      });
    }

    return res.json({
      data: {
        status: newStatus,
        syncBranchName: mcpStatus.syncBranchName ?? record.syncBranchName,
        progress: mcpStatus.progress,
        result: mcpStatus.result,
        conflict: mcpStatus.conflict,
        error: mcpStatus.error,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── 8. Skip conflicted PR and continue ───────────────────────────────────
// POST /api/code-sync/:syncId/skip-and-continue
// Body: { skipPrId: number }
router.post('/:syncId/skip-and-continue', async (req, res, next) => {
  try {
    const { syncId } = req.params;
    const { skipPrId } = z.object({ skipPrId: z.number().int() }).parse(req.body);

    const record = await prisma.syncHistory.findUnique({ where: { id: syncId } });
    if (!record) throw new AppError(404, 'Sync kaydı bulunamadı.');

    const payload = record.payload as Record<string, unknown> | null;
    const originalPrIds = (payload?.prIds as number[] | undefined) ?? [];
    const remainingPrIds = originalPrIds.filter((id) => id !== skipPrId);

    if (remainingPrIds.length === 0) {
      throw new AppError(400, 'Seçimi kaldırdıktan sonra sync edilecek PR kalmadı.');
    }

    const [customerBranch, creds, svc] = await Promise.all([
      prisma.customerBranch.findUnique({ where: { id: record.customerBranchId } }),
      getProductCredsByService(payload?.serviceId as string),
      prisma.service.findUnique({ where: { id: payload?.serviceId as string } }),
    ]);
    if (!customerBranch) throw new AppError(404, 'Müşteri branch bulunamadı.');
    if (!creds) throw new AppError(400, 'Azure DevOps credentials bulunamadı.');

    const repoName = (payload?.repositoryName ?? customerBranch.repoName ?? svc?.repoName) as string;
    const syncCreds = resolveSyncCredentials(creds, customerBranch);
    const syncBranchPrefix = buildSyncBranchPrefix(
      (payload?.targetVersionId ?? 'unknown') as string,
      svc?.name ?? repoName,
    );

    const mcpResp = (await mcpRequest('/api/code-sync/async-cherry-pick', 'POST', {
      azure_org: syncCreds.org,
      azure_project: syncCreds.project,
      azure_pat: syncCreds.pat,
      repository_name: repoName,
      source_branch: record.sourceBranch,
      target_branch: record.targetBranch,
      pr_ids: remainingPrIds,
      sync_branch_prefix: syncBranchPrefix,
      pr_title: `${syncBranchPrefix} → ${record.targetBranch} (conflict düzeltme)`,
    })) as { jobId: string };

    await prisma.syncHistory.update({
      where: { id: syncId },
      data: {
        status: 'RUNNING',
        completedAt: null,
        conflictDetails: undefined,
        syncBranchName: syncBranchPrefix,
        payload: {
          ...(payload ?? {}),
          prIds: remainingPrIds,
          skippedPrIds: [...((payload?.skippedPrIds as number[] | undefined) ?? []), skipPrId],
          mcpJobId: mcpResp.jobId,
        },
      },
    });

    res.status(202).json({ data: { syncId, mcpJobId: mcpResp.jobId, status: 'RUNNING', skippedPrId: skipPrId } });
  } catch (err) {
    next(err);
  }
});

// ─── Legacy routes ─────────────────────────────────────────────────────────

router.get('/completed-prs', async (_req, res, next) => {
  try {
    const data = await mcpRequest('/api/repository/completed-prs');
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.get('/merged-pr-history', async (_req, res, next) => {
  try {
    const data = await mcpRequest('/api/code-sync/get-merged-pr-history');
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.post('/branch-compare', async (req, res, next) => {
  try {
    const data = await mcpRequest('/api/code-sync/branch-compare', 'POST', req.body);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.post('/preview', async (req, res, next) => {
  try {
    const data = await mcpRequest('/api/code-sync/preview', 'POST', req.body);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.post('/execute', async (req, res, next) => {
  try {
    const data = await mcpRequest('/api/code-sync/execute', 'POST', req.body);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

router.get('/status/:jobId', async (req, res, next) => {
  try {
    const data = await mcpRequest(`/api/code-sync/status/${req.params.jobId}`);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

export default router;
