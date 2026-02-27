#!/usr/bin/env node
/**
 * Firebase childApis → PostgreSQL services POPULATE migration
 *
 * Mevcut 611 servis kaydının boş alanlarını Firebase'deki verilerle doldurur:
 *   repoName, pipelineName, serviceImageName, currentVersion,
 *   currentVersionCreatedAt, releaseName
 *
 * Servisler productId + name kombinasyonuna göre eşleştirilir.
 *
 * Çalıştırma:
 *   cd /Users/vacitb/Desktop/Work/ReleaseHub360
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 \
 *   DATABASE_URL="postgresql://releasehub:password@localhost:5432/releasehub360?sslmode=disable" \
 *   node tasks/populate-service-fields.mjs
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

function str(val) {
  if (!val) return null;
  const s = String(val).trim();
  return s || null;
}

function toDate(val) {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

// ─── Main populate ───────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Servis alanları Firebase populate başlıyor...\n');

  // Load all PostgreSQL products
  const pgProducts = await prisma.product.findMany({ select: { id: true, name: true } });
  const pgProductByName = new Map(pgProducts.map(p => [p.name.toLowerCase().trim(), p]));
  console.log(`📦 PostgreSQL'de ${pgProducts.length} ürün`);

  // Load all PostgreSQL services (id, productId, name) for quick lookup
  const pgServices = await prisma.service.findMany({ select: { id: true, productId: true, name: true } });
  // Map: productId -> (name -> serviceId)
  const serviceMap = new Map();
  for (const s of pgServices) {
    if (!serviceMap.has(s.productId)) serviceMap.set(s.productId, new Map());
    serviceMap.get(s.productId).set(s.name.toLowerCase().trim(), s.id);
  }
  console.log(`🔧 PostgreSQL'de ${pgServices.length} servis`);

  // Fetch Firebase products
  console.log('⬇️  Firebase products alınıyor...');
  const fbProducts = await fetchCollection('products');
  console.log(`📥 Firebase'de ${fbProducts.length} ürün\n`);

  let updated = 0;
  let notFound = 0;
  let noData = 0;

  for (const fbProd of fbProducts) {
    const fbName = (fbProd.name || '').toLowerCase().trim();
    const pgProd = pgProductByName.get(fbName);
    if (!pgProd) continue;

    const apis = extractApis(fbProd);
    if (apis.length === 0) continue;

    const productServices = serviceMap.get(pgProd.id);
    if (!productServices) continue;

    console.log(`\n📦 ${pgProd.name} → ${apis.length} servis`);

    for (const { api } of apis) {
      const name = (api.name || '').trim();
      if (!name) continue;

      const serviceId = productServices.get(name.toLowerCase().trim());
      if (!serviceId) {
        console.log(`    ⚠️  Eşleşmeyen servis: "${name}"`);
        notFound++;
        continue;
      }

      // Build update payload with only non-null Firebase fields
      const repoName         = str(api.repoName);
      const pipelineName     = str(api.pipelineName);
      const serviceImageName = str(api.serviceImageName);
      const currentVersion   = str(api.currentVersion);
      const releaseName      = str(api.releaseName);
      const currentVersionCreatedAt = toDate(api.currentVersionCreatedAt);

      const hasAnyData = repoName || pipelineName || serviceImageName || currentVersion || releaseName || currentVersionCreatedAt;
      if (!hasAnyData) {
        console.log(`    ⬛ ${name} — Firebase'de ek veri yok`);
        noData++;
        continue;
      }

      await prisma.service.update({
        where: { id: serviceId },
        data: {
          ...(repoName         !== null ? { repoName }         : {}),
          ...(pipelineName     !== null ? { pipelineName }     : {}),
          ...(serviceImageName !== null ? { serviceImageName } : {}),
          ...(currentVersion   !== null ? { currentVersion }   : {}),
          ...(releaseName      !== null ? { releaseName }      : {}),
          ...(currentVersionCreatedAt !== null ? { currentVersionCreatedAt } : {}),
        },
      });
      updated++;
      const summary = [
        repoName         && `repo=${repoName}`,
        pipelineName     && `pipeline=${pipelineName}`,
        serviceImageName && `image=${serviceImageName}`,
        currentVersion   && `v${currentVersion}`,
        releaseName      && `release=${releaseName}`,
      ].filter(Boolean).join(', ');
      console.log(`    ✅ ${name} [${summary}]`);
    }
  }

  console.log('\n─────────────────────────────────────────');
  console.log(`✅ Güncellenen: ${updated}`);
  console.log(`⬛ Ek veri yok: ${noData}`);
  console.log(`❌ Eşleşmeyen servis: ${notFound}`);
  console.log('─────────────────────────────────────────');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
