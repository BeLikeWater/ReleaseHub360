import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler.middleware';
import { generateHelmChart } from '../lib/helmChartGenerator';
import { generateBinaryPackage } from '../lib/binaryPackageGenerator';
import { uploadToFtp } from '../lib/ftpUploader';

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
    if (!cpm.productVersionId || !cpm.productVersion) throw new AppError(400, 'Versiyon bilgisi bulunamadı');
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
    if (!cpm.productVersionId || !cpm.productVersion) throw new AppError(400, 'Versiyon bilgisi bulunamadı');
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

// ── POST /api/customer-deployments/trigger — E2-03: Docker IaaS deploy tetikle
// Faz 1: Log kaydı + bildirim (gerçek cluster bağlantısı ileride eklenecek)
router.post('/trigger', requireRole('ADMIN', 'RELEASE_MANAGER', 'CUSTOMER_ADMIN'), async (req, res, next) => {
  try {
    const { customerId, productVersionId, environment, notes } = z.object({
      customerId: z.string(),
      productVersionId: z.string(),
      environment: z.string().optional(),
      notes: z.string().optional(),
    }).parse(req.body);

    // Validate customer + version exist
    const [customer, version] = await Promise.all([
      prisma.customer.findUnique({ where: { id: customerId }, select: { id: true, name: true } }),
      prisma.productVersion.findUnique({
        where: { id: productVersionId },
        select: { id: true, version: true, phase: true, product: { select: { name: true } } },
      }),
    ]);

    if (!customer) throw new AppError(404, 'Müşteri bulunamadı');
    if (!version) throw new AppError(404, 'Versiyon bulunamadı');

    // Phase 1: Create an approval log as "deploy triggered" record
    const logEntry = await prisma.approvalLog.create({
      data: {
        productVersionId,
        approvedBy: (req as unknown as { user?: { email?: string } }).user?.email ?? 'system',
        approvalType: 'DEPLOY_APPROVE',
        comment: `Deploy tetiklendi → Ortam: ${environment ?? 'default'}. ${notes ?? ''}`.trim(),
        metadata: {
          type: 'DEPLOY_TRIGGER',
          customerId,
          customerName: customer.name,
          environment: environment ?? 'default',
          triggeredAt: new Date().toISOString(),
        },
      },
    });

    // Phase 1: Console log (notification to real users added in Phase 2)
    console.info(`[DEPLOY_TRIGGER] Customer=${customer.name} Version=${version.product.name}@${version.version} Env=${environment ?? 'default'}`);

    res.json({
      data: {
        logId: logEntry.id,
        status: 'TRIGGERED',
        message: `Deploy komutu gönderildi (Faz 1: log kaydı oluşturuldu)`,
        customerId,
        productVersionId,
        environment: environment ?? 'default',
      },
    });
  } catch (err) { next(err); }
});

// ── O-02: GET /api/customer-deployments/download/helm/:mappingId ──────────────
// Generates and streams a Helm chart tar.gz for the customer's product mapping
router.get('/download/helm/:mappingId', requireRole('ADMIN', 'RELEASE_MANAGER', 'CUSTOMER_ADMIN', 'CUSTOMER_USER'), async (req, res, next) => {
  try {
    const mappingId = String(req.params.mappingId);
    const cpm = await prisma.customerProductMapping.findFirst({
      where: { id: mappingId },
      include: {
        customer: { select: { name: true } },
        productVersion: {
          include: { product: { select: { name: true, id: true } } },
        },
      },
    });

    if (!cpm) throw new AppError(404, 'Müşteri-ürün eşleştirmesi bulunamadı');
    if (!cpm.productVersion) throw new AppError(400, 'Versiyon bilgisi bulunamadı');

    const chartName = cpm.productVersion.product.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    const version = cpm.productVersion.version;

    const archive = await generateHelmChart({
      chartName,
      chartVersion: version,
      appVersion: version,
      imageRepository: `registry.example.com/${chartName}`,
      imageTag: version,
    });

    const filename = `${chartName}-${version}.tgz`;
    res.setHeader('Content-Type', 'application/x-tar');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', archive.length.toString());
    res.send(archive);
  } catch (err) { next(err); }
});

// ── O-04: GET /api/customer-deployments/download/binary/:mappingId ────────────
// Generates and streams a zip binary installer package
router.get('/download/binary/:mappingId', requireRole('ADMIN', 'RELEASE_MANAGER', 'CUSTOMER_ADMIN', 'CUSTOMER_USER'), async (req, res, next) => {
  try {
    const mappingId = String(req.params.mappingId);
    const cpm = await prisma.customerProductMapping.findFirst({
      where: { id: mappingId },
      include: {
        customer: { select: { name: true } },
        productVersion: {
          include: { product: { select: { name: true, id: true } } },
        },
      },
    });

    if (!cpm) throw new AppError(404, 'Müşteri-ürün eşleştirmesi bulunamadı');
    if (!cpm.productVersion) throw new AppError(400, 'Versiyon bilgisi bulunamadı');

    const productName = cpm.productVersion.product.name;
    const version = cpm.productVersion.version;

    const archive = await generateBinaryPackage({
      productName,
      version,
      customerName: cpm.customer.name,
    });

    const filename = `${productName.toLowerCase().replace(/\s+/g, '-')}-${version}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', archive.length.toString());
    res.send(archive);
  } catch (err) { next(err); }
});

// ── O-06: POST /api/customer-deployments/upload-ftp/:mappingId ───────────────
// Generates binary package and uploads it to customer FTP server
router.post('/upload-ftp/:mappingId', requireRole('ADMIN', 'RELEASE_MANAGER'), async (req, res, next) => {
  try {
    const { host, port, user, password, remotePath, secure } = z.object({
      host: z.string().min(1),
      port: z.number().int().positive().optional(),
      user: z.string().min(1),
      password: z.string().min(1),
      remotePath: z.string().min(1),
      secure: z.boolean().optional(),
    }).parse(req.body);

    const mappingId = String(req.params.mappingId);
    const cpm = await prisma.customerProductMapping.findFirst({
      where: { id: mappingId },
      include: {
        customer: { select: { name: true } },
        productVersion: {
          include: { product: { select: { name: true, id: true } } },
        },
      },
    });

    if (!cpm) throw new AppError(404, 'Müşteri-ürün eşleştirmesi bulunamadı');
    if (!cpm.productVersion) throw new AppError(400, 'Versiyon bilgisi bulunamadı');

    const productName = cpm.productVersion.product.name;
    const version = cpm.productVersion.version;

    // Generate binary package
    const archive = await generateBinaryPackage({
      productName,
      version,
      customerName: cpm.customer.name,
    });

    // Upload to FTP
    const result = await uploadToFtp({
      host,
      port,
      user,
      password,
      secure: secure ?? false,
      remotePath,
      content: archive,
    });

    if (!result.success) {
      throw new AppError(502, `FTP yükleme başarısız: ${result.error}`);
    }

    res.json({
      data: {
        success: true,
        remotePath: result.remotePath,
        bytesUploaded: result.bytesUploaded,
        durationMs: result.durationMs,
        product: productName,
        version,
      },
    });
  } catch (err) { next(err); }
});

export default router;

