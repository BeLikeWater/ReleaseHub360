import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed başlatılıyor...');

  // ── Users ──────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@releasehub360.local' },
    update: {},
    create: { email: 'admin@releasehub360.local', passwordHash, name: 'Admin User', role: 'ADMIN' },
  });
  const rm = await prisma.user.upsert({
    where: { email: 'rm@releasehub360.local' },
    update: {},
    create: { email: 'rm@releasehub360.local', passwordHash, name: 'Release Manager', role: 'RELEASE_MANAGER' },
  });
  const dev = await prisma.user.upsert({
    where: { email: 'dev@releasehub360.local' },
    update: {},
    create: { email: 'dev@releasehub360.local', passwordHash, name: 'Developer User', role: 'DEVELOPER' },
  });

  console.log('✅ Users:', [admin.email, rm.email, dev.email]);

  // ── Products ──────────────────────────────────────────
  const erpProduct = await prisma.product.upsert({
    where: { id: 'product-erp-001' },
    update: {},
    create: {
      id: 'product-erp-001',
      name: 'ERP Core',
      description: 'Kurumsal kaynak planlama ana modülü',
      repoUrl: 'https://dev.azure.com/your_org/ReleaseHub360/_git/erp-core',
    },
  });
  const portalProduct = await prisma.product.upsert({
    where: { id: 'product-portal-001' },
    update: {},
    create: {
      id: 'product-portal-001',
      name: 'Customer Portal',
      description: 'Müşteri self-servis portalı',
      repoUrl: 'https://dev.azure.com/your_org/ReleaseHub360/_git/customer-portal',
    },
  });

  console.log('✅ Products:', [erpProduct.name, portalProduct.name]);

  // ── Services ──────────────────────────────────────────
  await prisma.service.createMany({
    skipDuplicates: true,
    data: [
      { id: 'svc-erp-api', productId: erpProduct.id, name: 'ERP API', port: 8080 },
      { id: 'svc-erp-worker', productId: erpProduct.id, name: 'ERP Worker', port: 8081 },
      { id: 'svc-portal-api', productId: portalProduct.id, name: 'Portal API', port: 9080 },
    ],
  });

  // ── ProductVersions ────────────────────────────────────
  const v250 = await prisma.productVersion.upsert({
    where: { productId_version: { productId: erpProduct.id, version: '2.5.0' } },
    update: {},
    create: {
      id: 'ver-erp-250',
      productId: erpProduct.id,
      version: '2.5.0',
      phase: 'PRODUCTION',
      releaseDate: new Date('2026-01-15'),
      description: 'Q1 2026 major release',
      notesPublished: true,
      createdBy: admin.id,
    },
  });
  const v260 = await prisma.productVersion.upsert({
    where: { productId_version: { productId: erpProduct.id, version: '2.6.0' } },
    update: {},
    create: {
      id: 'ver-erp-260',
      productId: erpProduct.id,
      version: '2.6.0',
      phase: 'RC',
      targetDate: new Date('2026-03-01'),
      description: 'Q2 2026 release candidate',
      createdBy: admin.id,
    },
  });
  const portalV1 = await prisma.productVersion.upsert({
    where: { productId_version: { productId: portalProduct.id, version: '1.2.0' } },
    update: {},
    create: {
      id: 'ver-portal-120',
      productId: portalProduct.id,
      version: '1.2.0',
      phase: 'STAGING',
      targetDate: new Date('2026-02-28'),
      createdBy: rm.id,
    },
  });

  console.log('✅ ProductVersions:', [v250.version, v260.version, portalV1.version]);

  // ── ReleaseNotes ──────────────────────────────────────
  await prisma.releaseNote.createMany({
    skipDuplicates: true,
    data: [
      { id: 'rn-001', productVersionId: v250.id, category: 'FEATURE', title: 'Yeni raporlama modülü eklendi', isBreaking: false, sortOrder: 1, createdBy: rm.id },
      { id: 'rn-002', productVersionId: v250.id, category: 'BUG', title: 'Fatura hesaplama hatası düzeltildi', description: 'KDV dahil fiyatlarda yuvarlama hatası giderildi', isBreaking: false, sortOrder: 2, createdBy: dev.id },
      { id: 'rn-003', productVersionId: v250.id, category: 'BREAKING', title: 'Auth token formatı değişti', description: 'v2 token formatına geçildi — tüm istemcilerin güncellenmesi gerekiyor', isBreaking: true, sortOrder: 3, createdBy: admin.id },
      { id: 'rn-004', productVersionId: v260.id, category: 'FEATURE', title: 'Müşteri bazlı fiyatlandırma', isBreaking: false, sortOrder: 1, createdBy: rm.id },
    ],
  });

  // ── ReleaseTodos ───────────────────────────────────────
  await prisma.releaseTodo.createMany({
    skipDuplicates: true,
    data: [
      { id: 'todo-001', productVersionId: v260.id, title: 'DB migration scriptlerini doğrula', category: 'TECHNICAL', priority: 'P0', isCompleted: false },
      { id: 'todo-002', productVersionId: v260.id, title: 'QA smoke test koş', category: 'TECHNICAL', priority: 'P0', isCompleted: true, completedBy: dev.id, completedAt: new Date() },
      { id: 'todo-003', productVersionId: v260.id, title: 'Müşterilere release mail gönder', category: 'COMMUNICATION', priority: 'P1', isCompleted: false },
      { id: 'todo-004', productVersionId: v260.id, title: 'Deployment approval al', category: 'APPROVAL', priority: 'P0', isCompleted: false },
    ],
  });

  // ── Customers ──────────────────────────────────────────
  const c1 = await prisma.customer.upsert({
    where: { code: 'ACME-001' },
    update: {},
    create: { id: 'cust-001', code: 'ACME-001', name: 'ACME Holding', contactEmail: 'it@acme.com', isActive: true },
  });
  const c2 = await prisma.customer.upsert({
    where: { code: 'BETA-002' },
    update: {},
    create: { id: 'cust-002', code: 'BETA-002', name: 'Beta Teknoloji', contactEmail: 'release@beta.tech', isActive: true },
  });
  const c3 = await prisma.customer.upsert({
    where: { code: 'GAMMA-003' },
    update: {},
    create: { id: 'cust-003', code: 'GAMMA-003', name: 'Gamma Yazılım', contactEmail: 'ops@gamma.com.tr', isActive: true },
  });

  console.log('✅ Customers:', [c1.name, c2.name, c3.name]);

  // ── CustomerProductMappings ────────────────────────────
  await prisma.customerProductMapping.createMany({
    skipDuplicates: true,
    data: [
      { id: 'cpm-001', customerId: c1.id, productVersionId: v250.id, environment: 'production', branch: 'release/2.5.0' },
      { id: 'cpm-002', customerId: c2.id, productVersionId: v250.id, environment: 'production', branch: 'release/2.5.0' },
      { id: 'cpm-003', customerId: c3.id, productVersionId: v260.id, environment: 'staging', branch: 'release/2.6.0-rc' },
    ],
  });

  // ── HotfixRequests ─────────────────────────────────────
  await prisma.hotfixRequest.createMany({
    skipDuplicates: true,
    data: [
      { id: 'hfx-001', productVersionId: v250.id, title: 'KDV hesaplama kritik hata', description: 'ACME müşterisinde fatura KDV yanlış hesaplanıyor', severity: 'CRITICAL', status: 'PENDING', requestedBy: dev.id, customerImpact: 'ACME Holding fatura kesemiyor' },
      { id: 'hfx-002', productVersionId: v250.id, title: 'Rapor export PDF hatası', description: 'Büyük raporlar export edilemiyor', severity: 'HIGH', status: 'APPROVED', requestedBy: rm.id },
    ],
  });

  // ── UrgentChanges ──────────────────────────────────────
  await prisma.urgentChange.createMany({
    skipDuplicates: true,
    data: [
      // @ts-ignore — id field upsert için
      { id: 'uc-001', title: 'Login servis kesintisi', description: 'SSO entegrasyonunda 403 hatası', priority: 'CRITICAL', status: 'IN_PROGRESS', requestedBy: admin.id },
      { id: 'uc-002', title: 'DB backup politikası güncellendi', description: 'Günlük backup saati 02:00 olarak değiştirildi', priority: 'LOW', status: 'RESOLVED', requestedBy: admin.id },
    ],
  });

  // ── Notifications ──────────────────────────────────────
  await prisma.notification.createMany({
    skipDuplicates: true,
    data: [
      { id: 'notif-001', userId: admin.id, title: 'Hotfix onayı bekliyor', message: 'KDV hesaplama hatası için hotfix onayınızı bekliyor', type: 'ACTION_REQUIRED', isRead: false },
      { id: 'notif-002', userId: admin.id, title: '2.6.0 RC hazır', message: 'ERP Core 2.6.0 RC aşamasına geçti', type: 'INFO', isRead: false },
      { id: 'notif-003', userId: rm.id, title: 'Yeni release todo eklendi', message: 'DB migration scripti doğrulama görevi eklendi', type: 'INFO', isRead: true },
    ],
  });

  // ── Settings ───────────────────────────────────────────
  await prisma.setting.createMany({
    skipDuplicates: true,
    data: [
      { key: 'app.name', value: 'ReleaseHub360', category: 'GENERAL' },
      { key: 'app.timezone', value: 'Europe/Istanbul', category: 'GENERAL' },
      { key: 'tfs.orgUrl', value: process.env.TFS_ORG_URL ?? '', category: 'TFS' },
      { key: 'tfs.project', value: process.env.TFS_PROJECT ?? '', category: 'TFS' },
    ],
  });

  console.log('🎉 Seed tamamlandı!');
  console.log('\n📋 Demo hesaplar:');
  console.log('  admin@releasehub360.local / admin123  (ADMIN)');
  console.log('  rm@releasehub360.local    / admin123  (RELEASE_MANAGER)');
  console.log('  dev@releasehub360.local   / admin123  (DEVELOPER)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
