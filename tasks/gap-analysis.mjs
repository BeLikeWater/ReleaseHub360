#!/usr/bin/env node
// Gap analysis: Firebase service/API fields vs PostgreSQL schema
const FIREBASE_API_KEY = 'AIzaSyAfZlFeyOq4pWBjZvDPpKIMUDqhT_qqbso';
const BASE = 'https://firestore.googleapis.com/v1/projects/releasehub360/databases/(default)/documents';

function parse(v) {
  if (!v || typeof v !== 'object') return v;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return parseInt(v.integerValue, 10);
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(parse);
  if ('mapValue' in v) {
    const o = {};
    for (const [k, vv] of Object.entries(v.mapValue.fields || {})) o[k] = parse(vv);
    return o;
  }
  return null;
}

(async () => {
  const res = await fetch(`${BASE}/products?key=${FIREBASE_API_KEY}&pageSize=300`);
  const json = await res.json();
  const docs = json.documents || [];

  let serviceSamples = [];
  let totalEndpoints = 0;
  let endpointSamples = [];
  const allServiceFields = new Set();

  for (const doc of docs) {
    const fields = Object.fromEntries(
      Object.entries(doc.fields || {}).map(([k, v]) => [k, parse(v)])
    );
    for (const mg of fields.childModuleGroups || []) {
      for (const mod of mg.childModules || []) {
        for (const api of mod.childApis || []) {
          Object.keys(api).forEach(k => allServiceFields.add(k));
          if (serviceSamples.length < 3) {
            serviceSamples.push({ product: fields.name, module: mod.name, service: api });
          }
          for (const ep of api.childApiEndpoints || []) {
            totalEndpoints++;
            if (endpointSamples.length < 5) {
              endpointSamples.push({ product: fields.name, service: api.name, endpoint: ep });
            }
          }
        }
      }
    }
  }

  console.log('=== ALL FIREBASE SERVICE FIELDS ===');
  console.log([...allServiceFields].sort().join(', '));

  console.log('\n=== SAMPLE SERVICE (full data) ===');
  console.log(JSON.stringify(serviceSamples[0], null, 2));

  console.log('\n=== childApiEndpoints ===');
  console.log('Total endpoints with data:', totalEndpoints);
  if (endpointSamples.length > 0) {
    console.log('Sample endpoint:', JSON.stringify(endpointSamples[0], null, 2));
  } else {
    console.log('⚠️  All childApiEndpoints arrays are EMPTY — no HTTP endpoint data in Firebase.');
  }

  console.log('\n=== CURRENT PostgreSQL Service fields ===');
  console.log('id, productId, name, description, repoUrl, port, isActive, createdAt, updatedAt');

  console.log('\n=== GAP ANALYSIS ===');
  const pgFields = new Set(['id', 'productid', 'name', 'description', 'repourl', 'port', 'isactive', 'createdat', 'updatedat']);
  const fbFieldNormalized = {
    apiId: 'firebase internal ID — skip',
    moduleId: 'firebase internal ID — skip',
    name: 'name ✅ migrated',
    description: 'description ✅ migrated',
    repoName: 'repoUrl ⚠️ stored as name string, not as URL',
    pipelineName: '❌ MISSING — not in schema',
    serviceImageName: '❌ MISSING — not in schema (Docker image name)',
    currentVersion: '❌ MISSING — last known deploy version',
    currentVersionCreatedAt: '❌ MISSING — last deploy date',
    releaseName: '❌ MISSING — pipeline release name',
    childApiEndpoints: `ℹ️ Always empty in Firebase (${totalEndpoints} total with data)`,
  };

  for (const [fb, status] of Object.entries(fbFieldNormalized)) {
    console.log(`  ${fb}: ${status}`);
  }
})();
