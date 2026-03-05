import { Router, Request, Response } from 'express';
import { PrismaClient, IssueStatus, IssuePriority } from '@prisma/client';
import { authenticateJWT } from '../middleware/auth.middleware';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${unique}-${safe}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

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

// GET /api/transition-issues/stats
// Issue sayılarını status ve priority bazında gruplandırır
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { customerId, productVersionId, assignedTo } = req.query as Record<string, string>;
    const where: Record<string, unknown> = {};
    if (customerId) where.customerId = customerId;
    if (productVersionId) where.productVersionId = productVersionId;
    if (assignedTo) where.assignedTo = assignedTo;

    const [byStatus, byPriority, byCategory, total, openCritical] = await Promise.all([
      prisma.transitionIssue.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
      }),
      prisma.transitionIssue.groupBy({
        by: ['priority'],
        where,
        _count: { id: true },
      }),
      prisma.transitionIssue.groupBy({
        by: ['category'],
        where,
        _count: { id: true },
      }),
      prisma.transitionIssue.count({ where }),
      prisma.transitionIssue.count({
        where: { ...where, priority: 'CRITICAL', status: { in: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'] } },
      }),
    ]);

    res.json({
      data: {
        total,
        openCritical,
        byStatus: byStatus.map(r => ({ status: r.status, count: r._count.id })),
        byPriority: byPriority.map(r => ({ priority: r.priority, count: r._count.id })),
        byCategory: byCategory.map(r => ({ category: r.category ?? 'Diğer', count: r._count.id })),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Stats alınamadı' });
  }
});

// GET /api/transition-issues/summary
// Dashboard widget için özet
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.query as Record<string, string>;
    const where: Record<string, unknown> = {};
    if (customerId) where.customerId = customerId;

    const [open, inProgress, critical, resolvedToday] = await Promise.all([
      prisma.transitionIssue.count({ where: { ...where, status: 'OPEN' } }),
      prisma.transitionIssue.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      prisma.transitionIssue.count({
        where: { ...where, priority: 'CRITICAL', status: { in: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'] } },
      }),
      prisma.transitionIssue.count({
        where: {
          ...where,
          status: 'RESOLVED',
          resolvedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    res.json({ data: { open, inProgress, critical, resolvedToday } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Summary alınamadı' });
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
        authorSide: req.user?.userType === 'CUSTOMER' ? 'CUSTOMER' : 'ORG',
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

// GET /api/transition-issues/:id/attachments
router.get('/:id/attachments', async (req: Request, res: Response) => {
  try {
    const attachments = await prisma.issueAttachment.findMany({
      where: { issueId: String(req.params.id) },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: attachments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ekler getirilemedi' });
  }
});

// POST /api/transition-issues/:id/attachments/upload
router.post('/:id/attachments/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const issue = await prisma.transitionIssue.findUnique({ where: { id: String(req.params.id) } });
    if (!issue) return res.status(404).json({ error: 'Issue bulunamadı' });
    if (!req.file) return res.status(400).json({ error: 'Dosya yüklenmedi' });

    const attachment = await prisma.issueAttachment.create({
      data: {
        issueId: issue.id,
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        url: `/uploads/${req.file.filename}`,
        uploadedBy: req.user?.name ?? null,
      },
    });
    res.status(201).json({ data: attachment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Dosya yüklenemedi' });
  }
});

export default router;
