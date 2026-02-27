#!/usr/bin/env node
/**
 * Firebase childApis → PostgreSQL services migration
 *
 * Firebase'deki her ürünün altındaki childApis (yani mikroservisler) PostgreSQL
 * services tablosuna aktarılır. Product adına göre eşleşme yapılır.
 *
 * Çalıştırma:
 *   cd /Users/vacitb/Desktop/Work/ReleaseHub360
 *   DATABASE_URL="postgresql://releasehub:password@localhost:5432/releasehub360?sslmode=disable" \
 *   node tasks/migrate-firebase-apis-to-services.mjs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FIREBASE_API_KEY = 'AIzaSyAfZlFeyOq4pWBjZvDPpKIMUDqhT_qqbso';
const BASE_URL = 'https://firestore.googleapis.com/v1/projects/releasehub360/databases/(default)/documents';

// ─── Firestore parser ────────────────────────────────────────────────────────
function parseValue(val) {
  if (!val || typeof val !== 'object') return val;
  if ('stringValue'  in val) return val.stringValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue'  in val) return val.doubleValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('nullValue'    in val) return null;
  if ('timestampValue' in val) return new Date(val.timestampValue);
  if ('arrayValue'   in val) return (val.arrayValue.values || []).map(parseValue);
  if ('mapValue'     in val) {
    const out = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) out[k] = parseValue(v);
    return out;
  }
  return null;
}

function parseFields(fields) {
  const result = {};
  for (const [k, v] of Object.entries(fields || {})) result[k] = parseValue(v);
  return result;
}

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
      console.warn(`  ⚠️  ${collectionName} sayfa ${page}: HTTP ${res.status}`);
      break;
    }
    const json = await res.json();
    if (!json.documents || json.documents.length === 0) break;
    for (const doc of json.documents) {
      const id = doc.name.split('/').pop();
      docs.push({ _id: id, ...parseFields(doc.fields) });
    }
    pageToken = json.nextPageToken;
    page++;
    if (!pageToken) break;
  }
  return docs;
}

// ─── Extract all childApis from Firebase product structure ───────────────────
function extractApis(fbProd) {
  const result = [];
  // ModuleGroups → Modules → childApis
  for (const mg of (fbProd.childModuleGroups || [])) {
    for (const mod of (mg.childModules || [])) {
      for (const api of (mod.childApis || [])) {
        result.push({ api, moduleName: mod.name, groupName: mg.name });
      }
    }
  }
  // Top-level childModules → childApis
  for (const mod of (fbProd.childModules || [])) {
    if (typeof mod === 'object' && mod !== null) {
      for (const api of (mod.childApis || [])) {
        result.push({ api, moduleName: mod.name, groupName: null });
      }
    }
  }
  return result;
}

// ─── Main migration ──────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Firebase childApis → PostgreSQL services migrasyonu başlıyor...\n');

  // Load all PostgreSQL products for name-based matching
  const pgProducts = await prisma.product.findMany({ select: { id: true, name: true } });
  const pgProductByName = new Map(pgProducts.map(p => [p.name.toLowerCase().trim(), p]));
  console.log(`📦 PostgreSQL'de ${pgProducts.length} ürün bulundu`);

  // Fetch Firebase products
  console.log('⬇️  Firebase products alınıyor...');
  const fbProducts = await fetchCollection('products');
  console.log(`📥 Firebase'de ${fbProducts.length} ürün bulundu\n`);

  let created = 0;
  let skipped = 0;
  let noProduct = 0;

  for (const fbProd of fbProducts) {
    const fbName = (fbProd.name || '').toLowerCase().trim();
    const pgProd = pgProductByName.get(fbName);

    if (!pgProd) {
      const apis = extractApis(fbProd);
      if (apis.length > 0) {
        console.log(`  ⚠️  Eşleşen ürün bulunamadı: "${fbProd.name}" (${apis.length} servis atlandı)`);
        noProduct += apis.length;
      }
      continue;
    }

    const apis = extractApis(fbProd);
    if (apis.length === 0) continue;

    console.log(`\n📦 ${pgProd.name} → ${apis.length} servis`);

    for (const { api, moduleName } of apis) {
      const name = (api.name || '').trim();
      if (!name) { skipped++; continue; }

      // Check if already exists (by productId + name)
      const existing = await prisma.service.findFirst({
        where: { productId: pgProd.id, name },
      });
      if (existing) {
        skipped++;
        continue;
      }

      // Map Firebase fields to Service schema
      const repoUrl = api.repoName && api.repoName.trim() ? api.repoName.trim() : null;
      const description = api.description && api.description.trim() !== name
        ? api.description.trim()
        : (moduleName ? `${moduleName} modülü servisi` : null);

      await prisma.service.create({
        data: {
          productId: pgProd.id,
          name,
          description,
          repoUrl,
          isActive: true,
        },
      });
      created++;
      console.log(`    ✅ ${name}`);
    }
  }

  console.log('\n─────────────────────────────────────────');
  console.log(`✅ Oluşturulan: ${created}`);
  console.log(`⏭️  Atlanan (zaten var): ${skipped}`);
  console.log(`❌ Eşleşmeyen ürün (oluşturulamadı): ${noProduct}`);
  console.log('─────────────────────────────────────────');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
