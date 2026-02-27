import { Router } from 'express';
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
  if (!res.ok) throw new AppError(res.status, `MCP Server hatası: ${res.statusText}`);
  return res.json();
}

// GET /api/code-sync/completed-prs
router.get('/completed-prs', async (_req, res, next) => {
  try {
    const data = await mcpRequest('/api/repository/completed-prs');
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// GET /api/code-sync/merged-pr-history
router.get('/merged-pr-history', async (_req, res, next) => {
  try {
    const data = await mcpRequest('/api/code-sync/get-merged-pr-history');
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// POST /api/code-sync/branch-compare
router.post('/branch-compare', async (req, res, next) => {
  try {
    const data = await mcpRequest('/api/code-sync/branch-compare', 'POST', req.body);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// POST /api/code-sync/preview
router.post('/preview', async (req, res, next) => {
  try {
    const data = await mcpRequest('/api/code-sync/preview', 'POST', req.body);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// POST /api/code-sync/execute
router.post('/execute', async (req, res, next) => {
  try {
    const data = await mcpRequest('/api/code-sync/execute', 'POST', req.body);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// GET /api/code-sync/status/:jobId
router.get('/status/:jobId', async (req, res, next) => {
  try {
    const data = await mcpRequest(`/api/code-sync/status/${req.params.jobId}`);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

export default router;
