import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';
import { encrypt, mask, isEncrypted } from '../lib/encryption';

const router = Router();
router.use(authenticateJWT);

const customerSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
  approverEmails: z.array(z.string()).optional(),
  devOpsEmails: z.array(z.string()).optional(),
  emailDomains: z.array(z.string()).optional(),
  environments: z.array(z.string()).optional(),
  supportSuffix: z.string().optional(),
  tenantName: z.string().optional(),
  azureReleaseTemplate: z.string().optional(),

  // Ticket Platform
  ticketPlatform: z.enum(['AZURE', 'GITHUB', 'JIRA', 'NONE']).optional(),
  ticketBaseUrl: z.string().optional(),
  ticketApiToken: z.string().optional(),
  ticketProjectKey: z.string().optional(),

  // Azure Ticket Targets
  azureTargetAreaPath: z.string().optional(),
  azureTargetIterationPath: z.string().optional(),
  azureTargetWorkItemType: z.string().optional(),
  azureTargetTags: z.array(z.string()).optional(),

  // GitHub Ticket Targets
  githubTargetRepo: z.string().optional(),
  githubTargetLabels: z.array(z.string()).optional(),
});

function maskCustomer(c: Record<string, unknown>) {
  if (c.ticketApiToken && typeof c.ticketApiToken === 'string') {
    c.ticketApiToken = mask(c.ticketApiToken);
  }
  return c;
}

// GET /api/customers
router.get('/', async (_req, res, next) => {
  try {
    const customers = await prisma.customer.findMany({
      include: { _count: { select: { productMappings: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ data: customers.map((c) => maskCustomer(c as unknown as Record<string, unknown>)) });
  } catch (err) {
    next(err);
  }
});

// GET /api/customers/:id
router.get('/:id', async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: String(req.params.id) },
      include: {
        productMappings: { include: { productVersion: { include: { product: true } } } },
        serviceMappings: true,
        branches: true,
      },
    });
    if (!customer) throw new AppError(404, 'Müşteri bulunamadı');
    res.json({ data: maskCustomer(customer as unknown as Record<string, unknown>) });
  } catch (err) {
    next(err);
  }
});

// POST /api/customers
router.post('/', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const data = customerSchema.parse(req.body);
    if (data.ticketApiToken) {
      data.ticketApiToken = encrypt(data.ticketApiToken);
    }
    const customer = await prisma.customer.create({ data });
    res.status(201).json({ data: maskCustomer(customer as unknown as Record<string, unknown>) });
  } catch (err) {
    next(err);
  }
});

// PUT /api/customers/:id
router.put('/:id', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const data = customerSchema.partial().parse(req.body);
    if (data.ticketApiToken && !isEncrypted(data.ticketApiToken)) {
      data.ticketApiToken = encrypt(data.ticketApiToken);
    }
    const customer = await prisma.customer.update({ where: { id: String(req.params.id) }, data });
    res.json({ data: maskCustomer(customer as unknown as Record<string, unknown>) });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/customers/:id
router.delete('/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    await prisma.customer.delete({ where: { id: String(req.params.id) } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
