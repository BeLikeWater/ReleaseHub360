import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateJWT } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';

const router = Router();
router.use(authenticateJWT);

const MCP_BASE = () => process.env.MCP_SERVER_URL ?? 'http://localhost:8083';

async function mcpRequest(path: string, method = 'GET', body?: unknown) {
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
  return `sync/v${version}-${safeService}-${date}`;
}

interface UserPayload { id?: string }

// ─── 1. List customer branches ─────────────────────────────────────────────
// GET /api/code-sync/customer-branches?customerId=&serviceId=
router.get('/customer-branches', async (req, res, next) => {
  try {
    const { customerId, serviceId } = req.query as Record<string, string | undefined>;

    let repoNameFilter: string | undefined;
    if (serviceId) {
      const svc = await prisma.service.findUnique({ where: { id: serviceId } });
      repoNameFilter = svc?.repoName ?? undefined;
    }

    const branches = await prisma.customerBranch.findMany({
      where: {
        ...(customerId ? { customerId } : {}),
        ...(repoNameFilter ? { repoName: repoNameFilter } : {}),
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
        lastSync: b.syncHistory[0] ?? null,
      })),
    });
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

    const srcPrIds = new Set<number>(Array.isArray(srcSnap?.prIds) ? (srcSnap!.prIds as number[]) : []);
    const tgtPrIds: number[] = Array.isArray(tgtSnap.prIds) ? (tgtSnap.prIds as number[]) : [];
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

    const deltaDetails = (await mcpRequest('/api/code-sync/delta-details', 'POST', {
      azure_org: creds.org,
      azure_project: creds.project,
      azure_pat: creds.pat,
      pr_ids: deltaPrIds,
    })) as { workitems: unknown[]; unclassified: unknown[]; total_pr_count: number };

    let alreadySyncedPrIds: number[] = [];
    if (customerBranch.repoName && customerBranch.azurePat) {
      const customerPRs = (await mcpRequest('/api/code-sync/customer-branch-prs', 'POST', {
        azure_org: creds.org,
        azure_project: creds.project,
        azure_pat: customerBranch.azurePat,
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

    const pat = customerBranch.azurePat || creds.pat;
    const data = await mcpRequest('/api/code-sync/customer-branch-prs', 'POST', {
      azure_org: creds.org,
      azure_project: creds.project,
      azure_pat: pat,
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

    const data = await mcpRequest('/api/code-sync/preview', 'POST', {
      azure_org: creds.org,
      azure_project: creds.project,
      azure_pat: customerBranch.azurePat || creds.pat,
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
      azure_org: creds.org,
      azure_project: creds.project,
      azure_pat: customerBranch.azurePat || creds.pat,
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

    const mcpStatus = (await mcpRequest(`/api/code-sync/async-cherry-pick/${mcpJobId}`)) as {
      status: string;
      syncBranchName?: string;
      progress?: unknown;
      result?: { prUrl?: string; prId?: number } | null;
      conflict?: { prId?: number; files?: string[] } | null;
      error?: string | null;
    };

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
    const syncBranchPrefix = buildSyncBranchPrefix(
      (payload?.targetVersionId ?? 'unknown') as string,
      svc?.name ?? repoName,
    );

    const mcpResp = (await mcpRequest('/api/code-sync/async-cherry-pick', 'POST', {
      azure_org: creds.org,
      azure_project: creds.project,
      azure_pat: customerBranch.azurePat || creds.pat,
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
