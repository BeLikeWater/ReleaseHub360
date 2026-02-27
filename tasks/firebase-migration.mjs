/**
 * Firebase → PostgreSQL Migration Script
 * 
 * Koleksiyonlar:
 *   Firestore                    →  PostgreSQL
 *   products                     →  products + module_groups + modules
 *   productVersions              →  product_versions
 *   customers                    →  customers
 *   customerProductMappings      →  customer_product_mappings
 *   masterVersionReleaseNotes    →  release_notes
 *   customer_branches            →  customer_branches
 * 
 * Çalıştırma:
 *   cd /Users/vacitb/Desktop/Work/ReleaseHub360
 *   DATABASE_URL="postgresql://releasehub:password@localhost:5432/releasehub360?sslmode=disable" \
 *   node tasks/firebase-migration.mjs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FIREBASE_API_KEY = 'AIzaSyAfZlFeyOq4pWBjZvDPpKIMUDqhT_qqbso';
const FIREBASE_PROJECT = 'releasehub360';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents`;

// ─── Firestore REST API helpers ───────────────────────────────────────────────

/** Firestore typed value → plain JS value */
function parseValue(val) {
  if (!val || typeof val !== 'object') return val;
  if ('stringValue'  in val) return val.stringValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue'  in val) return val.doubleValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('nullValue'    in val) return null;
  if ('timestampValue' in val) return new Date(val.timestampValue);
  if ('arrayValue'   in val) {
    return (val.arrayValue.values || []).map(parseValue);
  }
  if ('mapValue' in val) {
    return parseFields(val.mapValue.fields || {});
  }
  return null;
}

function parseFields(fields) {
  const result = {};
  for (const [k, v] of Object.entries(fields || {})) {
    result[k] = parseValue(v);
  }
  return result;
}

/** Fetch all documents in a Firestore collection (handles pagination) */
async function fetchCollection(collectionName) {
  const docs = [];
  let pageToken = null;
  let page = 1;

  while (true) {
    const url = new URL(`${BASE_URL}/${collectionName}`);
    url.searchParams.set('key', FIREBASE_API_KEY);
    url.searchParams.set('pageSize', '300');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url.toString());
    if (!res.ok) {
      const text = await res.text();
      console.warn(`  ⚠️  ${collectionName} sayfa ${page}: HTTP ${res.status} - ${text.slice(0, 200)}`);
      break;
    }

    const json = await res.json();
    if (!json.documents || json.documents.length === 0) break;

    for (const doc of json.documents) {
      // Extract Firestore doc ID from name path
      const id = doc.name.split('/').pop();
      docs.push({ _id: id, ...parseFields(doc.fields) });
    }

    console.log(`  📄 ${collectionName}: ${docs.length} döküman yüklendi`);
    pageToken = json.nextPageToken;
    if (!pageToken) break;
    page++;
  }

  return docs;
}

// ─── Step 1: Products + ModuleGroups + Modules ────────────────────────────────

async function migrateProducts() {
  console.log('\n🚀 [1/6] Products migrasyonu...');
  const fbProducts = await fetchCollection('products');
  console.log(`  Firestore'dan ${fbProducts.length} product alındı`);

  // firestoreId → PG Product id map
  const productIdMap = {}; // firestoreId => pgId

  for (const fbProd of fbProducts) {
    // Check if already exists
    const existing = await prisma.product.findFirst({ where: { name: fbProd.name } });
    if (existing) {
      console.log(`  ↩️  Zaten var: ${fbProd.name}`);
      productIdMap[fbProd._id] = existing.id;
      continue;
    }

    const product = await prisma.product.create({
      data: {
        name: fbProd.name || 'Unnamed',
        description: fbProd.description || null,
        repoUrl: null,
        serviceImageName: null,
        deploymentType: null,
        isActive: true,
      }
    });
    productIdMap[fbProd._id] = product.id;
    console.log(`  ✅ Product: ${product.name} (${product.id})`);

    // ModuleGroups
    const moduleGroups = fbProd.childModuleGroups || [];
    for (const mg of moduleGroups) {
      const existingMg = await prisma.moduleGroup.findFirst({
        where: { productId: product.id, name: mg.name }
      });
      let pgMg = existingMg;
      if (!pgMg) {
        pgMg = await prisma.moduleGroup.create({
          data: {
            productId: product.id,
            name: mg.name || 'Unnamed Group',
            description: mg.description || null,
          }
        });
      }

      // Modules inside this group
      const childModules = mg.childModules || [];
      for (const mod of childModules) {
        const existingMod = await prisma.module.findFirst({
          where: { productId: product.id, name: mod.name }
        });
        if (!existingMod) {
          await prisma.module.create({
            data: {
              productId: product.id,
              moduleGroupId: pgMg.id,
              name: mod.name || 'Unnamed Module',
              description: mod.description || null,
            }
          });
        }
      }
    }

    // Top-level childModules (not in groups)
    const topModules = fbProd.childModules || [];
    for (const mod of topModules) {
      const existingMod = await prisma.module.findFirst({
        where: { productId: product.id, name: mod.name || mod }
      });
      if (!existingMod) {
        const modName = typeof mod === 'string' ? mod : (mod.name || 'Unnamed');
        await prisma.module.create({
          data: {
            productId: product.id,
            moduleGroupId: null,
            name: modName,
            description: null,
          }
        });
      }
    }
  }

  console.log(`  ✅ Products tamamlandı. ${Object.keys(productIdMap).length} ürün eşlendi.`);
  return productIdMap;
}

// ─── Step 2: ProductVersions ──────────────────────────────────────────────────

const PHASE_MAP = {
  'Draft': 'PLANNED',
  'Planned': 'PLANNED',
  'Development': 'DEVELOPMENT',
  'In Progress': 'DEVELOPMENT',
  'RC': 'RC',
  'Staging': 'STAGING',
  'Published': 'PRODUCTION',
  'Production': 'PRODUCTION',
  'Archived': 'ARCHIVED',
  'Deprecated': 'ARCHIVED',
};

async function migrateProductVersions(productIdMap) {
  console.log('\n🚀 [2/6] ProductVersions migrasyonu...');
  const fbVersions = await fetchCollection('productVersions');
  console.log(`  Firestore'dan ${fbVersions.length} version alındı`);

  // firestoreVersionId → PG ProductVersion id map
  const versionIdMap = {};
  // (pgProductId + version) → pgVersionId for customerProductMapping lookup
  const productVersionLookup = {}; // `${pgProductId}::${version}` => pgVersionId

  for (const fbV of fbVersions) {
    const pgProductId = productIdMap[fbV.productId];
    if (!pgProductId) {
      console.log(`  ⚠️  Bilinmeyen productId: ${fbV.productId} (version: ${fbV.version})`);
      continue;
    }

    const versionStr = (fbV.version || '').replace('v', '').trim() || '0.0.0';
    const phase = PHASE_MAP[fbV.status] || 'PLANNED';

    const existing = await prisma.productVersion.findFirst({
      where: { productId: pgProductId, version: versionStr }
    });

    if (existing) {
      versionIdMap[fbV._id] = existing.id;
      productVersionLookup[`${pgProductId}::${versionStr}`] = existing.id;
      productVersionLookup[`${pgProductId}::v${versionStr}`] = existing.id;
      console.log(`  ↩️  Zaten var: ${fbV.productName} v${versionStr}`);
      continue;
    }

    try {
      const pv = await prisma.productVersion.create({
        data: {
          productId: pgProductId,
          version: versionStr,
          phase,
          isHotfix: false,
          masterStartDate: fbV.masterStartDate ? new Date(fbV.masterStartDate) : null,
          testDate: fbV.testDate ? new Date(fbV.testDate) : null,
          preProdDate: fbV.preProdDate ? new Date(fbV.preProdDate) : null,
          releaseDate: fbV.releaseDate ? new Date(fbV.releaseDate) : null,
          description: null,
          notesPublished: phase === 'PRODUCTION',
          createdBy: fbV.createdBy || null,
        }
      });
      versionIdMap[fbV._id] = pv.id;
      productVersionLookup[`${pgProductId}::${versionStr}`] = pv.id;
      productVersionLookup[`${pgProductId}::v${versionStr}`] = pv.id;
      console.log(`  ✅ Version: ${fbV.productName} v${versionStr} (${phase})`);
    } catch (e) {
      console.log(`  ⚠️  Hata: ${fbV.productName} v${versionStr}: ${e.message}`);
    }
  }

  console.log(`  ✅ Versions tamamlandı. ${Object.keys(versionIdMap).length} versiyon eklendi.`);
  return { versionIdMap, productVersionLookup };
}

// ─── Step 3: Customers ────────────────────────────────────────────────────────

async function migrateCustomers() {
  console.log('\n🚀 [3/6] Customers migrasyonu...');
  const fbCustomers = await fetchCollection('customers');
  console.log(`  Firestore'dan ${fbCustomers.length} müşteri alındı`);

  const customerIdMap = {}; // firestoreId => pgId

  for (const fbC of fbCustomers) {
    const code = (fbC.supportSuffix || fbC.name || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 20) || `CUST${Date.now()}`;

    const existing = await prisma.customer.findFirst({ where: { name: fbC.name } });
    if (existing) {
      customerIdMap[fbC._id] = existing.id;
      console.log(`  ↩️  Zaten var: ${fbC.name}`);
      continue;
    }

    // code unique olmalı
    let uniqueCode = code;
    let i = 1;
    while (await prisma.customer.findUnique({ where: { code: uniqueCode } })) {
      uniqueCode = `${code}${i++}`;
    }

    const customer = await prisma.customer.create({
      data: {
        name: fbC.name || 'Unnamed Customer',
        code: uniqueCode,
        contactEmail: null,
        contactPhone: null,
        address: null,
        notes: null,
        tenantName: fbC.tenantName || null,
        supportSuffix: fbC.supportSuffix || null,
        emailDomain: fbC.emailDomain || null,
        devOpsEmails: Array.isArray(fbC.devOpsEmails) ? fbC.devOpsEmails.filter(Boolean) : [],
        approverEmails: Array.isArray(fbC.approverEmails) ? fbC.approverEmails.filter(Boolean) : [],
        environments: Array.isArray(fbC.environments) ? fbC.environments.filter(Boolean) : [],
        azureReleaseTemplate: fbC.azureReleaseTemplate || null,
        isActive: true,
      }
    });
    customerIdMap[fbC._id] = customer.id;
    console.log(`  ✅ Customer: ${customer.name} (${customer.code})`);
  }

  console.log(`  ✅ Customers tamamlandı. ${Object.keys(customerIdMap).length} müşteri eklendi.`);
  return customerIdMap;
}

// ─── Step 4: CustomerProductMappings ─────────────────────────────────────────

async function migrateCustomerProductMappings(productIdMap, productVersionLookup, customerIdMap) {
  console.log('\n🚀 [4/6] CustomerProductMappings migrasyonu...');
  const fbMappings = await fetchCollection('customerProductMappings');
  console.log(`  Firestore'dan ${fbMappings.length} mapping alındı`);

  let created = 0, skipped = 0;

  for (const fbM of fbMappings) {
    const pgCustomerId = customerIdMap[fbM.customerId];
    const pgProductId = productIdMap[fbM.productId];

    if (!pgCustomerId || !pgProductId) {
      console.log(`  ⚠️  Bilinmeyen customer/product: ${fbM.customerId} / ${fbM.productId}`);
      skipped++;
      continue;
    }

    // Version string may have 'v' prefix
    const versionStr = (fbM.version || '').replace('v', '').trim();
    const versionStrWithV = `v${versionStr}`;

    let pgVersionId = productVersionLookup[`${pgProductId}::${versionStr}`]
      || productVersionLookup[`${pgProductId}::${versionStrWithV}`];

    if (!pgVersionId) {
      // Try to find it in DB
      const pv = await prisma.productVersion.findFirst({
        where: { productId: pgProductId, version: versionStr }
      });
      pgVersionId = pv?.id;
    }

    if (!pgVersionId) {
      console.log(`  ⚠️  Version bulunamadı: productId=${pgProductId} version=${versionStr}`);
      skipped++;
      continue;
    }

    const existing = await prisma.customerProductMapping.findFirst({
      where: { customerId: pgCustomerId, productVersionId: pgVersionId }
    });

    if (existing) {
      skipped++;
      continue;
    }

    try {
      await prisma.customerProductMapping.create({
        data: {
          customerId: pgCustomerId,
          productVersionId: pgVersionId,
          branch: null,
          environment: Array.isArray(fbM.environments) ? fbM.environments[0] : null,
          notes: null,
        }
      });
      created++;
    } catch (e) {
      console.log(`  ⚠️  Mapping hata: ${e.message}`);
      skipped++;
    }
  }

  console.log(`  ✅ Mappings tamamlandı. Oluşturulan: ${created}, Atlanan: ${skipped}`);
}

// ─── Step 5: ReleaseNotes ─────────────────────────────────────────────────────

async function migrateReleaseNotes() {
  console.log('\n🚀 [5/6] ReleaseNotes migrasyonu...');
  const fbNotes = await fetchCollection('masterVersionReleaseNotes');
  console.log(`  Firestore'dan ${fbNotes.length} release note alındı`);

  // Release notes'ların version bağlantısı yok — orphan olarak işaretliyoruz
  // İlerde productVersionId set edilebilir
  // İlk mevcut versiyonu bul (foreign key için gerekli)
  const firstVersion = await prisma.productVersion.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!firstVersion) {
    console.log('  ⚠️  Hiç product version yok, release notes aktarılamıyor.');
    return;
  }

  let created = 0, skipped = 0;

  for (const fbN of fbNotes) {
    // workitemId ile duplicate kontrolü
    const existing = await prisma.releaseNote.findFirst({
      where: { workitemId: String(fbN.workitemId || '') }
    });
    if (existing) {
      skipped++;
      continue;
    }

    try {
      await prisma.releaseNote.create({
        data: {
          productVersionId: firstVersion.id, // Geçici — unlinked notes
          workitemId: fbN.workitemId ? String(fbN.workitemId) : null,
          category: 'FEATURE',
          title: fbN.title || 'Untitled',
          description: fbN.description || null,
          isBreaking: false,
          sortOrder: 0,
          createdBy: 'firebase-migration',
        }
      });
      created++;
    } catch (e) {
      console.log(`  ⚠️  Note hata: ${e.message}`);
      skipped++;
    }
  }

  console.log(`  ✅ ReleaseNotes tamamlandı. Oluşturulan: ${created}, Atlanan: ${skipped}`);
  console.log(`  ℹ️  Not: Release notes geçici olarak ilk versiyona bağlandı. UI üzerinden doğru versiyona taşıyın.`);
}

// ─── Step 6: CustomerBranches ─────────────────────────────────────────────────

async function migrateCustomerBranches(customerIdMap) {
  console.log('\n🚀 [6/6] CustomerBranches migrasyonu...');
  const fbBranches = await fetchCollection('customer_branches');
  console.log(`  Firestore'dan ${fbBranches.length} branch alındı`);

  let created = 0, skipped = 0;

  for (const fbB of fbBranches) {
    // customer_branches uses customerName instead of customerId
    let pgCustomerId = customerIdMap[fbB.customerId];
    if (!pgCustomerId && fbB.customerName) {
      const found = await prisma.customer.findFirst({ where: { name: fbB.customerName } });
      if (found) pgCustomerId = found.id;
    }
    if (!pgCustomerId) {
      console.log(`  ⚠️  Bilinmeyen customer: id=${fbB.customerId} name=${fbB.customerName}`);
      skipped++;
      continue;
    }

    const branchName = fbB.branchName || fbB.branch_name || fbB.name || 'default';

    const existing = await prisma.customerBranch.findFirst({
      where: { customerId: pgCustomerId, branchName }
    });
    if (existing) {
      skipped++;
      continue;
    }

    try {
      await prisma.customerBranch.create({
        data: {
          customerId: pgCustomerId,
          branchName,
          repoUrl: fbB.repoUrl || fbB.repoPath || null,
          repoName: fbB.repoName || null,
          baseBranch: fbB.baseBranch || fbB.base_branch || 'master',
          description: fbB.description || null,
          isActive: fbB.isActive !== false,
        }
      });
      created++;
    } catch (e) {
      console.log(`  ⚠️  Branch hata: ${e.message}`);
      skipped++;
    }
  }

  console.log(`  ✅ CustomerBranches tamamlandı. Oluşturulan: ${created}, Atlanan: ${skipped}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔥 Firebase → PostgreSQL Migration Başlıyor...');
  console.log(`   Proje: ${FIREBASE_PROJECT}`);
  console.log(`   DB: ${process.env.DATABASE_URL?.replace(/:\/\/.*@/, '://<credentials>@') || '(DATABASE_URL not set)'}\n`);

  try {
    // 1. Products
    const productIdMap = await migrateProducts();

    // 2. ProductVersions
    const { versionIdMap, productVersionLookup } = await migrateProductVersions(productIdMap);

    // 3. Customers
    const customerIdMap = await migrateCustomers();

    // 4. CustomerProductMappings
    await migrateCustomerProductMappings(productIdMap, productVersionLookup, customerIdMap);

    // 5. ReleaseNotes
    await migrateReleaseNotes();

    // 6. CustomerBranches
    await migrateCustomerBranches(customerIdMap);

    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Migration tamamlandı!\n');
    const counts = {
      products: await prisma.product.count(),
      versions: await prisma.productVersion.count(),
      customers: await prisma.customer.count(),
      mappings: await prisma.customerProductMapping.count(),
      releaseNotes: await prisma.releaseNote.count(),
      branches: await prisma.customerBranch.count(),
    };
    console.table(counts);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (err) {
    console.error('\n❌ Migration başarısız:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
