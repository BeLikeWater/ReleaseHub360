import { Router, Request, Response } from 'express';
import { PrismaClient, IssueStatus, IssuePriority } from '@prisma/client';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateJWT);

// GET /api/transition-issues/my
// Müşteri kullanıcısının kendi açtığı issue'ları listeler
router.get('/my', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    if (!user.customerId) {
      return res.status(403).json({ error: 'Müşteri bağlantısı bulunamadı' });
    }
    const issues = await prisma.transitionIssue.findMany({
      where: { customerId: user.customerId },
      include: {
        productVersion: {
          select: { id: true, version: true, phase: true, product: { select: { id: true, name: true } } },
        },
        _count: { select: { comments: true } },
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ data: issues });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Issue listesi alınamadı' });
  }
});

const VALID_STATUSES = Object.values(IssueStatus);
const VALID_PRIORITIES = Object.values(IssuePriority);

// Status machine: which transitions are allowed
const ALLOWED_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  OPEN: ['ACKNOWLEDGED', 'IN_PROGRESS', 'CLOSED'],
  ACKNOWLEDGED: ['IN_PROGRESS', 'CLOSED'],
  IN_PROGRESS: ['RESOLVED', 'ACKNOWLEDGED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: [],
};

// GET /api/transition-issues
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, priority, customerId, productVersionId, search, reportedById } = req.query;

    const where: Record<string, unknown> = {};
    if (status && VALID_STATUSES.includes(status as IssueStatus)) {
      where.status = status as IssueStatus;
    }
    if (priority && VALID_PRIORITIES.includes(priority as IssuePriority)) {
      where.priority = priority as IssuePriority;
    }
    if (customerId) where.customerId = String(customerId);
    if (productVersionId) where.productVersionId = String(productVersionId);
    if (reportedById) where.reportedById = String(reportedById);
    if (search) {
      where.OR = [
        { title: { contains: String(search), mode: 'insensitive' } },
        { description: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const issues = await prisma.transitionIssue.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, code: true } },
        productVersion: {
          select: {
            id: true, version: true, phase: true,
            product: { select: { id: true, name: true } },
          },
        },
        _count: { select: { comments: true, attachments: true } },
      },
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    res.json({ data: issues });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'İssue listesi alınamadı' });
  }
});

// GET /api/transition-issues/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const issue = await prisma.transitionIssue.findUnique({
      where: { id: String(req.params.id) },
      include: {
        customer: { select: { id: true, name: true, code: true } },
        productVersion: {
          select: {
            id: true, version: true, phase: true,
            product: { select: { id: true, name: true } },
          },
        },
        comments: { orderBy: { createdAt: 'asc' } },
        attachments: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!issue) return res.status(404).json({ error: 'Issue bulunamadı' });
    res.json({ data: issue });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Issue alınamadı' });
  }
});

// POST /api/transition-issues
// CUSTOMER role: customerId is taken from JWT, not from body
router.post('/', async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const {
      title, description, priority, category, module: mod,
      steps, reportedById, reportedByName,
      customerId: bodyCustomerId, productVersionId,
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Başlık ve açıklama zorunludur' });
    }

    // For CUSTOMER users, always use their own customerId
    const resolvedCustomerId = user.userType === 'CUSTOMER'
      ? (user.customerId ?? null)
      : (bodyCustomerId ?? null);

    const issue = await prisma.transitionIssue.create({
      data: {
        title,
        description,
        priority: VALID_PRIORITIES.includes(priority) ? priority : 'MEDIUM',
        category: category ?? null,
        module: mod ?? null,
        steps: steps ?? null,
        reportedById: reportedById ?? user.userId ?? null,
        reportedByName: reportedByName ?? user.name ?? null,
        customerId: resolvedCustomerId,
        productVersionId: productVersionId ?? null,
      },
    });

    res.status(201).json({ data: issue });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Issue oluşturulamadı' });
  }
});

// PATCH /api/transition-issues/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { title, description, priority, category, module: mod, steps, assignedTo, resolution } = req.body;

    const issue = await prisma.transitionIssue.update({
      where: { id: String(req.params.id) },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(priority !== undefined && VALID_PRIORITIES.includes(priority) && { priority }),
        ...(category !== undefined && { category }),
        ...(mod !== undefined && { module: mod }),
        ...(steps !== undefined && { steps }),
        ...(assignedTo !== undefined && { assignedTo }),
        ...(resolution !== undefined && { resolution }),
      },
    });
    res.json({ data: issue });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Issue güncellenemedi' });
  }
});

// POST /api/transition-issues/:id/transition
router.post('/:id/transition', async (req: Request, res: Response) => {
  try {
    const { status, resolution } = req.body as { status: IssueStatus; resolution?: string };

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Geçersiz status' });
    }

    const current = await prisma.transitionIssue.findUnique({ where: { id: String(req.params.id) } });
    if (!current) return res.status(404).json({ error: 'Issue bulunamadı' });

    const allowed = ALLOWED_TRANSITIONS[current.status] ?? [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        error: `${current.status} → ${status} geçişi izin verilmiyor`,
        allowedTransitions: allowed,
      });
    }

    const now = new Date();
    const issue = await prisma.transitionIssue.update({
      where: { id: String(req.params.id) },
      data: {
        status,
        ...(status === 'RESOLVED' && { resolvedAt: now }),
        ...(status === 'CLOSED' && { closedAt: now }),
        ...(resolution !== undefined && { resolution }),
      },
    });
    res.json({ data: issue });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Geçiş yapılamadı' });
  }
});

// DELETE /api/transition-issues/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.transitionIssue.delete({ where: { id: String(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Issue silinemedi' });
  }
});

// ── Comments ──────────────────────────────────────────────────────────────────

// GET /api/transition-issues/:id/comments
router.get('/:id/comments', async (req: Request, res: Response) => {
  try {
    const comments = await prisma.issueComment.findMany({
      where: { issueId: String(req.params.id) },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ data: comments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Yorumlar alınamadı' });
  }
});

// POST /api/transition-issues/:id/comments
router.post('/:id/comments', async (req: Request, res: Response) => {
  try {
    const { body, authorId, authorName } = req.body;
    if (!body || !authorName) {
      return res.status(400).json({ error: 'Yorum metni ve yazar adı zorunludur' });
    }
    const comment = await prisma.issueComment.create({
      data: {
        issueId: String(req.params.id),
        body,
        authorId: authorId ?? null,
        authorName,
      },
    });
    res.status(201).json({ data: comment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Yorum eklenemedi' });
  }
});

// DELETE /api/transition-issues/comments/:commentId
router.delete('/comments/:commentId', async (req: Request, res: Response) => {
  try {
    await prisma.issueComment.delete({ where: { id: String(req.params.commentId) } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Yorum silinemedi' });
  }
});

export default router;
