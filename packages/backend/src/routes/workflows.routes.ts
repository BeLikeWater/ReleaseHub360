import { Router } from 'express';
import { z } from 'zod';
import { authenticateJWT } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';

const router = Router();
router.use(authenticateJWT);

const N8N_BASE = () => process.env.N8N_URL ?? 'http://localhost:5678';

const webhookMap: Record<string, string> = {
  'tfs-merge-start': '/webhook/tfs-merge-start',
  'approval-response': '/webhook/approval-response-webhook',
  'deployment-trigger': '/webhook/deployment-trigger',
  'breaking-change-alert': '/webhook/breaking-change-alert',
  'hotfix-notify': '/webhook/hotfix-notification',
};

// POST /api/workflows/trigger
router.post('/trigger', async (req, res, next) => {
  try {
    const { workflowId, payload } = z.object({
      workflowId: z.string(),
      payload: z.record(z.unknown()).optional(),
    }).parse(req.body);

    const webhookPath = webhookMap[workflowId];
    if (!webhookPath) throw new AppError(400, `Bilinmeyen workflow: ${workflowId}`);

    const url = `${N8N_BASE()}${webhookPath}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.N8N_AUTH_TOKEN ? { 'X-N8N-Auth': process.env.N8N_AUTH_TOKEN } : {}),
      },
      body: JSON.stringify({ ...payload, triggeredBy: req.user!.userId }),
    });

    const data = await response.json().catch(() => null);
    res.json({ data: { success: response.ok, status: response.status, result: data } });
  } catch (err) {
    next(err);
  }
});

export default router;
