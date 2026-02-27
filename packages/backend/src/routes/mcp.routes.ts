/**
 * MCP Server Proxy Routes
 *
 * ReleaseHub360 backend → MCP Server (Python FastAPI, default http://localhost:8000)
 * Tüm çağrılar backend üzerinden proxy edilir — frontend doğrudan MCP server'a erişmez.
 *
 * MCP_SERVER_URL env değişkeni ile override edilebilir.
 * productId body'de varsa DB'den azure creds okunup MCP isteğine eklenir.
 */
import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

const router = Router();
router.use(authenticateJWT);

const MCP_BASE = process.env.MCP_SERVER_URL ?? 'http://localhost:8000';
const DEFAULT_TIMEOUT_MS = 30_000;
const ANALYZE_TIMEOUT_MS = 90_000; // AI analiz çağrıları daha uzun sürebilir

/** productId varsa DB'deki Azure credential'larını döner, yoksa undefined */
async function resolveAzureCreds(productId?: string) {
  if (!productId) return undefined;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (product?.pmType === 'AZURE' && product.azureOrg && product.azureProject && product.azurePat) {
    return {
      azure_org: product.azureOrg,
      azure_project: product.azureProject,
      azure_pat: product.azurePat,
    };
  }
  return undefined;
}

async function mcpFetch(
  path: string,
  options: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const url = `${MCP_BASE}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function proxyPost(
  mcpPath: string,
  req: import('express').Request,
  res: import('express').Response,
  next: import('express').NextFunction,
  timeoutMs = DEFAULT_TIMEOUT_MS,
) {
  try {
    // productId varsa DB'den azure creds al ve body'ye ekle
    const productId = req.body?.productId as string | undefined;
    const azureCreds = await resolveAzureCreds(productId);
    const body = azureCreds ? { ...req.body, ...azureCreds } : req.body;

    const r = await mcpFetch(
      mcpPath,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      timeoutMs,
    );
    const data = await r.json().catch(() => ({ detail: r.statusText }));
    res.status(r.status).json(data);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      res.status(504).json({ error: 'MCP server isteği zaman aşımına uğradı.' });
    } else {
      next(err);
    }
  }
}

// ── GET /api/mcp/health ──────────────────────────────────────────────────────
// MCP server'ın ayakta olup olmadığını döner
router.get('/health', async (_req, res) => {
  try {
    const r = await mcpFetch('/health', {}, 5_000);
    const data = await r.json().catch(() => ({})) as Record<string, unknown>;
    res.json({ status: r.ok ? 'ok' : 'error', ...data });
  } catch {
    res.status(503).json({ status: 'offline', message: 'MCP server erişilemiyor.' });
  }
});

// ── POST /api/mcp/repo/pull-requests ─────────────────────────────────────────
// Belirli bir repo + branch + tarih filtresi ile PR listesi (work_item_ids dahil)
// Body: { repository_name, target_branch, after_date }
router.post('/repo/pull-requests', (req, res, next) =>
  proxyPost('/api/repo/pull-requests', req, res, next),
);

// ── POST /api/mcp/repository/prs-by-date-range ───────────────────────────────
// Tarih aralığına göre PR listesi
// Body: { repository_name, target_branch, start_date, end_date? }
router.post('/repository/prs-by-date-range', (req, res, next) =>
  proxyPost('/api/repository/prs-by-date-range', req, res, next),
);

// ── POST /api/mcp/pbi/analyze ────────────────────────────────────────────────
// PBI ID bazlı tam analiz (work items + PR'lar + kod değişiklikleri + release notes)
// Body: { pbi_id, language? }
router.post('/pbi/analyze', (req, res, next) =>
  proxyPost('/api/pbi/analyze', req, res, next, ANALYZE_TIMEOUT_MS),
);

// ── POST /api/mcp/pbi/pull-requests ─────────────────────────────────────────
// PBI'a bağlı PR listesi
// Body: { pbi_id }
router.post('/pbi/pull-requests', (req, res, next) =>
  proxyPost('/api/pbi/pull-requests', req, res, next),
);

// ── POST /api/mcp/pbi/details ────────────────────────────────────────────────
// PBI detayları (title, state, assigned to, vb.)
// Body: { pbi_id }
router.post('/pbi/details', (req, res, next) =>
  proxyPost('/api/pbi/details', req, res, next),
);

// ── POST /api/mcp/release-notes/generate ────────────────────────────────────
// PBI bazlı release note üretimi (AI destekli)
// Body: { pbi_id, language? }
router.post('/release-notes/generate', (req, res, next) =>
  proxyPost('/api/pbi/release-notes', req, res, next, ANALYZE_TIMEOUT_MS),
);

export default router;
