import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';

const router = Router();
router.use(authenticateJWT);

// ── Validation schemas ────────────────────────────────────────────────────────

const approveSchema = z.object({
  customerProductMappingId: z.string().uuid(),
  environment: z.string().min(1),
  comment: z.string().optional(),
});

const requestUpdateSchema = z.object({
  customerProductMappingId: z.string().uuid(),
  comment: z.string().optional(),
});

// ── POST /api/customer-deployments/approve ───────────────────────────────────
// Customer (ON_PREM + IAAS) approves a version for a specific environment
router.post('/approve', async (req, res, next) => {
  try {
    const body = approveSchema.parse(req.body);
    const user = (req as unknown as { user: { id: string; name?: string; role?: string } }).user;

    const cpm = await prisma.customerProductMapping.findUnique({
      where: { id: body.customerProductMappingId },
      include: {
        productVersion: { include: { product: { select: { id: true, name: true } } } },
        customer: { select: { id: true, name: true } },
      },
    });

    if (!cpm) throw new AppError(404, 'Müşteri-ürün eşleştirmesi bulunamadı');
    if (cpm.deploymentModel !== 'ON_PREM') {
      throw new AppError(400, 'Bu işlem yalnızca ON_PREM modeli için geçerlidir');
    }

    // Create approval log
    const approval = await prisma.approvalLog.create({
      data: {
        productVersionId: cpm.productVersionId,
        approvedBy: user.id,
        approverRole: user.role ?? 'CUSTOMER',
        approvalType: 'DEPLOY_APPROVE',
        comment: body.comment ?? null,
        metadata: {
          customerProductMappingId: body.customerProductMappingId,
          customerId: cpm.customerId,
          customerName: cpm.customer.name,
          environment: body.environment,
          deploymentModel: cpm.deploymentModel,
          hostingType: cpm.hostingType,
        },
      },
    });

    // Create notification for org RM
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: `Müşteri Onayı: ${cpm.customer.name}`,
        message: `${cpm.customer.name} müşterisi ${cpm.productVersion.product.name} v${cpm.productVersion.version} versiyonunu ${body.environment} ortamı için onayladı.`,
        type: 'RELEASE',
        linkUrl: `/customer-dashboard/${cpm.customerId}`,
      },
    });

    res.status(201).json({
      data: {
        approvalId: approval.id,
        status: 'APPROVED',
        environment: body.environment,
        productName: cpm.productVersion.product.name,
        version: cpm.productVersion.version,
      },
    });
  } catch (err) { next(err); }
});

// ── POST /api/customer-deployments/request-update ────────────────────────────
// Customer (SAAS) requests an update — notifies org
router.post('/request-update', async (req, res, next) => {
  try {
    const body = requestUpdateSchema.parse(req.body);
    const user = (req as unknown as { user: { id: string; name?: string } }).user;

    const cpm = await prisma.customerProductMapping.findUnique({
      where: { id: body.customerProductMappingId },
      include: {
        productVersion: { include: { product: { select: { id: true, name: true } } } },
        customer: { select: { id: true, name: true } },
      },
    });

    if (!cpm) throw new AppError(404, 'Müşteri-ürün eşleştirmesi bulunamadı');
    if (cpm.deploymentModel !== 'SAAS') {
      throw new AppError(400, 'Bu işlem yalnızca SAAS modeli için geçerlidir');
    }

    // Create notification for org RM
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: `Güncelleme Talebi: ${cpm.customer.name}`,
        message: `${cpm.customer.name} müşterisi ${cpm.productVersion.product.name} v${cpm.productVersion.version} için güncelleme talep etti.${body.comment ? ` Not: ${body.comment}` : ''}`,
        type: 'RELEASE',
        linkUrl: `/customer-dashboard/${cpm.customerId}`,
      },
    });

    // Log the request as well
    await prisma.approvalLog.create({
      data: {
        productVersionId: cpm.productVersionId,
        approvedBy: user.id,
        approverRole: 'CUSTOMER',
        approvalType: 'DEPLOY_APPROVE',
        comment: body.comment ?? `SaaS güncelleme talebi — ${cpm.customer.name}`,
        metadata: {
          customerProductMappingId: body.customerProductMappingId,
          customerId: cpm.customerId,
          customerName: cpm.customer.name,
          deploymentModel: 'SAAS',
          requestType: 'UPDATE_REQUEST',
        },
      },
    });

    res.status(201).json({
      data: {
        status: 'REQUESTED',
        productName: cpm.productVersion.product.name,
        version: cpm.productVersion.version,
        customerName: cpm.customer.name,
      },
    });
  } catch (err) { next(err); }
});

// ── GET /api/customer-deployments/approvals ──────────────────────────────────
// List approval logs for a customer/version
router.get('/approvals', async (req, res, next) => {
  try {
    const { customerProductMappingId, productVersionId } = req.query;

    const where: Record<string, unknown> = {};
    if (productVersionId) where.productVersionId = String(productVersionId);
    if (customerProductMappingId) {
      where.metadata = { path: ['customerProductMappingId'], equals: String(customerProductMappingId) };
    }

    const approvals = await prisma.approvalLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ data: approvals });
  } catch (err) { next(err); }
});

export default router;
