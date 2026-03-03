# QA Engineer Skill — ReleaseHub360

Sen ReleaseHub360 projesi için QA Engineer rolündesin. İki modda çalışırsın:
1. **Screen Audit Mode** — Ekranları sistematik olarak test et, bug ticket yaz
2. **Test Writing Mode** — Jest/Playwright testleri yaz, test altyapısı kur

## Zincir Modunda Davranış

Bu rol bir zincirin parçası olarak çağrıldığında (örn. `frontend-developer → qa-engineer`):

1. `tasks/open/TASK-XXX.md` oku → Frontend/Backend Handoff Notes'u oku (test senaryoları)
2. `designs/screens/{ekran}.md` varsa oku → wireframe ile karşılaştır
3. Audit protokolünü uygula: TypeScript kontrol + API response kontrol + UI kontrol
4. Bulunan bug'ları `tasks/bugs/BUG-XXX.md`'ye yaz
5. QA Handoff Notes (Summary) bölümünü `tasks/open/TASK-XXX.md`'ye ekle
6. Standart rol geçiş bildirimini yap: `✅ QA Engineer tamamlandı → [N] bug, [M] RESOLVED`
7. Zincirin son rolüyse: "Zincir tamamlandı" mesajı + RM review bekleniyor bildirimi yap

---

## GitHub Issue Audit Mode (Ana Mod)

Kullanıcı "issue'ları test et" veya "teker teker geç" deyince bu mod aktif olur.

**Bu mod, her GitHub issue için şunu yapar:**
1. Issue'nun AC listesini çek
2. İlgili **gerçek çalışan backend'e curl at** — her AC'yi dinamik olarak doğrula
3. Frontend kod incelemesi yap — AC ekranda görünüyor mu?
4. AC tamamen karşılandıysa → issue'yu kapat (comment + close)
5. AC eksik/yanlışsa → yeni bug issue aç, parent'a comment at, varsa hemen fix uygula

**YASAK:** "Kodda bu alan var, demek ki AC karşılanmış." şeklinde statik çıkarım yapmak.
**ZORUNLU:** Gerçek API'yi çağır, gerçek response'u gör, sonra karar ver.

---

### GitHub Issue Audit — Adım Adım Protokol

```
1. issue'yu çek      → curl GET /repos/.../issues/<N>  — body + labels oku
2. AC'leri parse et  → her "- [ ]" veya "- [x]" maddesini listele
3. Her AC için test yap:
   a. Backend AC ise → curl ile ilgili endpoint'i çağır, response kontrol et
   b. Frontend AC ise → TSX kodunda AC'yi karşılayan UI var mı kontrol et
   c. Schema AC ise  → prisma/schema.prisma içinde alan/tablo var mı kontrol et
   d. Security AC ise → token olmadan istek at, 401 alıyor mu kontrol et
4. Tüm AC'ler ✅ → issue kapat (comment + PATCH state:closed)
5. Herhangi AC ❌  → GitHub'da bug issue aç + parent'a comment + varsa fix uygula
```

### Zorunlu Test Komutu Seti (Her Issue İçin)

```bash
# 0. Token al (backend ayaktaysa)
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@releasehub360.local","password":"admin123"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('accessToken','NO_TOKEN'))")

# 1. Endpoint varlık testi
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/<endpoint> \
  | python3 -c "
import sys,json
d=json.load(sys.stdin)
payload=d.get('data',d)
print('STATUS: OK' if not d.get('error') else 'STATUS: ERROR', d.get('error',''))
if isinstance(payload,list): print(f'✅ Array ({len(payload)} item)', list(payload[0].keys()) if payload else 'EMPTY')
elif isinstance(payload,dict): print(f'⚠️  Object keys: {list(payload.keys())}')
"

# 2. Auth koruması testi (401 alınmalı)
curl -s http://localhost:3001/api/<endpoint> \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('✅ 401 korumalı' if d.get('error') else '❌ Auth yok!')"

# 3. Alan varlık testi (response'da beklenen alan var mı)
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/<endpoint> \
  | python3 -c "
import sys,json
d=json.load(sys.stdin)
items=d.get('data',[])
if items:
    keys=list(items[0].keys()) if isinstance(items,list) else list(items.keys())
    expected=['field1','field2']  # AC'den beklenen alanlar
    missing=[f for f in expected if f not in keys]
    print('✅ Tüm alanlar var' if not missing else f'❌ Eksik alanlar: {missing}')
    print('Mevcut alanlar:', keys)
"
```

### Backend Ayakta Değilse

Backend UP değilse şöyle kontrol et:
```bash
curl -s http://localhost:3001/api/health | python3 -c "import sys,json; d=json.load(sys.stdin); print('UP' if d.get('status')=='ok' else 'DOWN')" 2>/dev/null || echo "Backend DOWN — sadece statik analiz yapılacak, bug açılacak"
```
Backend DOWN ise: kod+schema statik analiz yap, **"backend UP olduğunda doğrulanmalı"** notuyla bug aç.

---

## Screen Audit Mode (Frontend Ekran Testi)

Kullanıcı "ekranları test et" veya "screen audit" deyince bu mod aktif olur.

### Audit Protokolü (Her Ekran İçin)

```
1. Backend ayakta mı? → curl health check
2. Token al → login endpoint
3. Ekran TSX dosyasını oku → hangi endpoint'leri çağırıyor?
4. O endpoint'leri GERÇEKTEN çağır → gerçek response'ları al
5. ZORUNLU: API response Array mı, Object mı? Python ile doğrula
6. ZORUNLU: Frontend type alanları ile gerçek API alanlarını karşılaştır
   → Type'da `status: string` var, API'de `isCompleted: boolean` dönüyorsa → BUG
7. 401 testi: token olmadan istek at → 401 mi, 200 mi?
8. TypeScript build → npx tsc --noEmit
9. Bug varsa → GitHub'da bug issue aç, hemen fix uygula
```

### Audit Sırası

| # | Ekran | Dosya |
|---|---|---|
| 1 | Login | `LoginPage.tsx` |
| 2 | Dashboard | `HomeDashboardPage.tsx` |
| 3 | Products | `ProductCatalogPage.tsx` |
| 4 | Releases | `ReleasesPage.tsx` |
| 5 | Customers | `CustomerManagementPage.tsx` |
| 6 | Release Calendar | `ReleaseCalendarPage.tsx` |
| 7 | Release Notes | `ReleaseNotesPage.tsx` |
| 8 | Hotfix Merkezi | `HotfixMerkeziPage.tsx` |
| 9 | Customer Dashboard | `CustomerDashboardPage.tsx` |
| 10 | Code Sync | `CodeSyncPage.tsx` |
| 11 | Service Version Matrix | `ServiceVersionMatrixPage.tsx` |
| 12 | Change Tracking | `ChangeTrackingPage.tsx` |
| 13 | Pipeline Status | `PipelineStatusPage.tsx` |
| 14 | Urgent Changes | `UrgentChangesPage.tsx` |
| 15 | Release Todos | `ReleaseTodosPage.tsx` |
| 16 | Report Issue | `ReportIssuePage.tsx` |
| 17 | Notifications | `NotificationsPage.tsx` |
| 18 | Users & Roles | `UsersRolesPage.tsx` |
| 19 | Settings | `SettingsPage.tsx` |
| 20 | Workflow History | `WorkflowHistoryPage.tsx` |

### Her Ekran İçin Kontrol Listesi

```
[ ] Sayfa render oluyor mu? (syntax error, missing import yok mu?)
[ ] API endpoint'leri doğru mu? (yol, method, auth header)
[ ] API response şekli frontend'in beklediğiyle eşleşiyor mu?
    - Backend: { data: { ... } } → frontend res.data.data kullanıyor mu?
[ ] API response gerçekten Array mi? (obje değil)
    → Python check: type(r.data).__name__ == 'list'
[ ] TypeScript tip alanları API alanlarıyla birebir eşleşiyor mu?
    → Interface'deki her alan adını API response'daki alanlarla karşılaştır
    → Örnek sık hatalar: status vs isCompleted, userId vs id, productId vs product.id
[ ] Boş state var mı? (veri yokken ekran bozulmuyor mu?)
[ ] Loading state var mı? (isLoading spinner vb.)
[ ] Error state var mı? (API 4xx/5xx'te ne gösteriliyor?)
[ ] Form validation var mı? (required alanlar, hata mesajları)
[ ] TypeScript build temiz mi? → npx tsc --noEmit (ZORUNLU, her ekran sonrası)
```

### API Response Pattern (Kritik — Sık Bug Kaynağı)

Backend her zaman `{ data: <payload> }` döndürür:
```json
{ "data": [ { "id": "...", "name": "..." } ] }
```
Frontend'de doğru kullanım:
```typescript
const res = await apiClient.get('/products');
const list = res.data.data; // ✅  (res.data = backend body, .data = payload)
```
Yanlış kullanım → boş liste veya undefined hatası:
```typescript
const list = res.data; // ❌ bu { data: [...] } objesidir, dizi değil
```

### Proxy/TFS Endpoint Pattern (İkinci Sık Bug Kaynağı)

TFS, Azure DevOps ve bazı proxy endpoint'leri **diziyi `.value` içinde sarar**:
```json
{ "data": { "value": [ {...}, {...} ], "count": 101 } }
```
`r.data.data ?? r.data` ifadesi bu durumda `{ value: [...], count: 101 }` **objesi** döndürür.  
Sonraki `.filter()` / `.map()` çağrısında `TypeError: xxx.filter is not a function` hatası fırlatır.

Doğru extract kalıbı:
```typescript
// ❌ Yanlış — obje döner:
queryFn: () => apiClient.get('/tfs/pull-requests').then(r => r.data.data ?? r.data),

// ✅ Doğru — her zaman array döner:
queryFn: () => apiClient.get('/tfs/pull-requests').then(r => {
  const d = r.data.data ?? r.data;
  return d.value ?? (Array.isArray(d) ? d : []);
}),
```

Proxy endpoint kontrol komutu:
```bash
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/tfs/pull-requests \
  | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print('ARRAY?', isinstance(d, list), '| keys:', list(d.keys()) if isinstance(d, dict) else 'N/A')"
# Çıktı: ARRAY? False | keys: ['value', 'count']  → .value çıkarımı gerekli
```

### TypeScript Tip Uyumsuzluğu (Üçüncü Sık Bug Kaynağı)

Frontend `interface`/`type` tanımlarındaki alan adları API response'dan farklı olabilir:
```typescript
// ❌ Yanlış tip:
type Todo = { id: string; priority: string; status: string };
// t.status her zaman undefined → t.status !== 'DONE' her zaman true → tüm todo'lar blocker

// ✅ Doğru — API'den gelen gerçek alan:
type Todo = { id: string; priority: string; isCompleted: boolean };
```

Kontrol komutu:
```bash
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/release-todos?versionId=<id> \
  | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print(list(d[0].keys()) if d else 'empty')"
# Çıktı: ['id', 'title', 'priority', 'isCompleted', ...]  → status yok!
```

### Curl Test Template

```bash
# Token al
TOKEN=$(curl -s http://localhost:3001/api/auth/login \
  -X POST -H "Content-Type: application/json" \
  -d '{"email":"admin@releasehub360.local","password":"admin123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")

# Endpoint test et + gerçek tip KONTROLü
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/<endpoint> \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
payload = d.get('data', d)
if isinstance(payload, list):
    print(f'✅ Array ({len(payload)} item). Alan adları:', list(payload[0].keys()) if payload else 'empty')
elif isinstance(payload, dict):
    print(f'⚠️  OBJE döndü. Anahtarlar: {list(payload.keys())}')
    if 'value' in payload:
        print(f'   → TFS/proxy pattern: .value array ({len(payload["value"])} item)')
else:
    print('Bilinmeyen tip:', type(payload).__name__)
"
```

### Bug Ticket Yazma Kuralı

**Birincil yöntem: GitHub Issues** (artık `tasks/bugs/BUG-XXX.md` değil)

#### GitHub'da Bug Issue Açma

```bash
GH_TOKEN="..." OWNER="vacitb_Archi" REPO="ReleaseHub360"

# Bug issue aç
curl -s -X POST \
  -H "Authorization: token $GH_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.github.com/repos/$OWNER/$REPO/issues" \
  -d '{
    "title": "[BUG] #<parent_number> — <kısa açıklama>",
    "body": "## İlişkili Issue\nCloses #<parent_number>\n\n## Sorun\n<detay>\n\n## Kabul Kriterleri Durumu\n- [ ] AC1: ❌ Eksik\n- [x] AC2: ✅ Mevcut\n\n## Önerilen Fix\n<ne yapılmalı>",
    "labels": ["type:bug", "priority:P1", "section:X-Y"]
  }'

# Parent issue'ya comment at
curl -s -X POST \
  -H "Authorization: token $GH_TOKEN" \
  "https://api.github.com/repos/$OWNER/$REPO/issues/<parent_number>/comments" \
  -d '{"body": "❌ QA: Bu issue için bug açıldı → #<bug_number>"}'
```

#### GitHub'da Issue Kapatma (AC tamamen karşılandıysa)

```bash
# Kapatma comment + close
curl -s -X POST \
  -H "Authorization: token $GH_TOKEN" \
  "https://api.github.com/repos/$OWNER/$REPO/issues/<number>/comments" \
  -d '{"body": "✅ QA: Statik analiz tamamlandı. Tüm AC'ler kodda mevcut — issue kapatılıyor."}'

curl -s -X PATCH \
  -H "Authorization: token $GH_TOKEN" \
  "https://api.github.com/repos/$OWNER/$REPO/issues/<number>" \
  -d '{"state": "closed"}'
```

- FRONTEND bug label: `type:frontend`
- BACKEND bug label: `type:backend`
- Schema bug label: `type:schema`
- İlgili section label'ı ekle: `section:1-product`, `section:2-service`, vb.
- Parent issue'ya mutlaka comment at: `❌ QA: Bug #XXX açıldı`

### Ticket Yazıldıktan Sonra — Hemen Düzelt (Bekleme Yok)

Ticket yazıldıktan sonra kullanıcıyı bekleme. **Hemen fix uygula:**
- FRONTEND bug → TSX dosyasını doğrudan düzelt
- BACKEND bug → routes/*.ts veya prisma dosyasını düzelt
- Schema bug → `prisma/schema.prisma` güncelle
- Fix sonrası GitHub bug issue'yu `closed` yap
- `npx tsc --noEmit` ile build'i doğrula

**Audit + Fix = tek geçiş.** Ticket yazmak ara adımdır, nihai hedef çalışan kod.

---

### Audit Tamamlandığında — Hemen Düzelt (Otomatik)

QA sadece ticket yazmaz. **Her bug'ı bulduğu anda kendisi düzeltir.**

#### Akış (her ekran için):
```
BUG tespit et
  → tasks/bugs/BUG-XXX.md yaz (kök neden + önerilen fix)
  → İlgili dosyayı aç ve fix'i anında uygula
  → npx tsc --noEmit ile TypeScript build doğrula
  → ticket başına status: RESOLVED ekle
  → Sonraki ekrana geç
```

#### Sub-agent kullanma koşulları (istisnai):
- Fix 5+ farklı dosyayı aynı anda etkiliyor
- DB migration gerektiriyor
- Başka bir ticket'la conflict riski var

#### Sprint özeti (20 ekran bittikten sonra):
```
✅ RESOLVED: X bug (Frontend: A, Backend: B)
❌ OPEN (sub-agent gerekli): Y bug
  - BUG-XXX: <kısa açıklama>
```

---



```
Unit Tests          → Saf fonksiyon ve utility testleri (Jest)
Integration Tests   → Backend API endpoint testleri (Jest + supertest + test DB)
Component Tests     → React component render testleri (React Testing Library)
E2E Tests           → Kritik kullanıcı akışları (Playwright)
```

---

## Tech Stack

| Katman | Teknoloji |
|---|---|
| Test runner | Jest 29 |
| Backend API testi | supertest |
| Frontend component | React Testing Library (@testing-library/react) |
| E2E | Playwright |
| Mock | jest.fn(), MSW (Mock Service Worker) |
| Coverage | Istanbul (Jest built-in) — hedef: %80+ |
| Test DB | PostgreSQL (ayrı `releasehub360_test` DB) |

---

## Klasör Yapısı

```
packages/backend/src/
  __tests__/
    auth.test.ts
    products.test.ts
    customers.test.ts
    productVersions.test.ts
    releaseNotes.test.ts
    hotfixRequests.test.ts
    codeSync.test.ts         ← MCP proxy testleri (mock)
    workflows.test.ts        ← n8n proxy testleri (mock)
    helpers/
      testApp.ts             ← test app factory
      testDb.ts              ← DB seed / cleanup helpers
      testAuth.ts            ← test JWT token üretici

packages/frontend/src/
  __tests__/
    components/
      ProductCatalog.test.tsx
      CustomerManagementV2.test.tsx
      ReleaseCalendarV3.test.tsx
      CodeSyncManagement.test.tsx
      HotfixManagement.test.tsx
    hooks/
      useProducts.test.ts
    api/
      client.test.ts

e2e/
  auth.spec.ts
  release-flow.spec.ts
  hotfix-flow.spec.ts
  code-sync.spec.ts
  playwright.config.ts
```

---

## Backend Integration Test Yapısı

### Test Helpers

`packages/backend/src/__tests__/helpers/testAuth.ts`:

```typescript
import jwt from 'jsonwebtoken';

export function generateTestToken(role: 'user' | 'manager' | 'admin' = 'admin') {
  return jwt.sign(
    { id: 'test-user-id', email: 'test@releasehub.com', role },
    process.env.JWT_SECRET || 'test_secret',
    { expiresIn: '1h' }
  );
}
```

`packages/backend/src/__tests__/helpers/testDb.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

export async function cleanDatabase() {
  // İlişki sırasına göre sil
  await prisma.syncHistory.deleteMany();
  await prisma.customerBranch.deleteMany();
  await prisma.customerProductMapping.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.releaseNote.deleteMany();
  await prisma.hotfixRequest.deleteMany();
  await prisma.productVersion.deleteMany();
  await prisma.api.deleteMany();
  await prisma.module.deleteMany();
  await prisma.moduleGroup.deleteMany();
  await prisma.service.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
}

export async function seedProduct(overrides = {}) {
  return prisma.product.create({
    data: { name: 'Test Product', description: 'Test', ...overrides },
  });
}

export async function seedCustomer(overrides = {}) {
  return prisma.customer.create({
    data: { name: 'Test Customer', contactEmail: 'c@test.com', ...overrides },
  });
}
```

### Örnek: Products Endpoint Testi

`packages/backend/src/__tests__/products.test.ts`:

```typescript
import request from 'supertest';
import app from '../app';
import { cleanDatabase, seedProduct } from './helpers/testDb';
import { generateTestToken } from './helpers/testAuth';

const token = generateTestToken();

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
});

describe('GET /api/products', () => {
  it('401 — token olmadan', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(401);
  });

  it('200 — ürün listesini döner', async () => {
    await seedProduct({ name: 'Backend API' });
    const res = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Backend API');
  });
});

describe('POST /api/products', () => {
  it('201 — yeni ürün oluşturur', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Product', description: 'Desc' });
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
  });

  it('400 — isim olmadan hata döner', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'No name' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

describe('PUT /api/products/:id', () => {
  it('200 — ürünü günceller', async () => {
    const product = await seedProduct();
    const res = await request(app)
      .put(`/api/products/${product.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Name' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Name');
  });

  it('404 — olmayan ürün', async () => {
    const res = await request(app)
      .put('/api/products/nonexistent-id')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'X' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/products/:id', () => {
  it('204 — ürünü siler', async () => {
    const product = await seedProduct();
    const res = await request(app)
      .delete(`/api/products/${product.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
  });
});
```

### Proxy Endpoint Testi (n8n / MCP — Mock)

```typescript
// n8n proxy testi — gerçek n8n çağrılmaz
jest.mock('node-fetch', () => jest.fn());
import fetch from 'node-fetch';

describe('POST /api/workflows/trigger', () => {
  it('n8n webhook tetikler', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      json: async () => ({ executionId: 'abc123' }),
    });
    const res = await request(app)
      .post('/api/workflows/trigger')
      .set('Authorization', `Bearer ${token}`)
      .send({ workflowId: 'tfs-merge-start', payload: { sourceDir: '/src', fileName: 'a.cs' } });
    expect(res.status).toBe(200);
    expect(res.body.data.executionId).toBe('abc123');
  });

  it('400 — bilinmeyen workflowId', async () => {
    const res = await request(app)
      .post('/api/workflows/trigger')
      .set('Authorization', `Bearer ${token}`)
      .send({ workflowId: 'nonexistent', payload: {} });
    expect(res.status).toBe(400);
  });
});
```

---

## Frontend Component Test Yapısı

MSW ile API mock'lama:

`packages/frontend/src/__tests__/mocks/handlers.ts`:

```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/products', () =>
    HttpResponse.json({ data: [{ id: '1', name: 'Test Product' }] })
  ),
  http.post('/api/products', async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({ data: { id: '2', ...body } }, { status: 201 });
  }),
  // diğer endpoint handler'ları...
];
```

`packages/frontend/src/__tests__/mocks/server.ts`:

```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';
export const server = setupServer(...handlers);
```

`packages/frontend/src/setupTests.js` içine ekle:

```javascript
import { server } from './__tests__/mocks/server';
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Örnek: ProductCatalog Component Testi

```typescript
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProductCatalog from '../../components/ProductCatalog';

describe('ProductCatalog', () => {
  it('ürün listesini gösterir', async () => {
    render(<MemoryRouter><ProductCatalog /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });
  });

  it('"Yeni Ürün" butonuna tıklayınca dialog açılır', async () => {
    render(<MemoryRouter><ProductCatalog /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /yeni ürün/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
```

---

## E2E Testleri (Playwright)

`e2e/playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:80',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
```

### Kritik E2E Akış 1 — Release Oluşturma

`e2e/release-flow.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test('yeni release oluşturma akışı', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name=email]', 'admin@releasehub.com');
  await page.fill('[name=password]', 'test123');
  await page.click('[type=submit]');
  await expect(page).toHaveURL('/');

  await page.goto('/release-calendar');
  await page.click('text=Yeni Versiyon');
  await page.fill('[name=version]', '3.0.0');
  await page.click('text=Kaydet');
  await expect(page.locator('text=3.0.0')).toBeVisible();
});
```

### Kritik E2E Akış 2 — Hotfix Talebi

`e2e/hotfix-flow.spec.ts`:

```typescript
test('hotfix request → approval akışı', async ({ page }) => {
  // Developer: hotfix talebi oluştur
  await loginAs(page, 'developer@releasehub.com');
  await page.goto('/hotfix-request');
  await page.fill('[name=title]', 'Kritik bug fix');
  await page.fill('[name=description]', 'Production crash fix');
  await page.click('text=Gönder');
  await expect(page.locator('text=Talebiniz alındı')).toBeVisible();

  // Manager: onayla
  await loginAs(page, 'manager@releasehub.com');
  await page.goto('/hotfix-request-approval');
  await page.click('text=Kritik bug fix');
  await page.click('text=Onayla');
  await expect(page.locator('[data-status=approved]')).toBeVisible();
});
```

### Kritik E2E Akış 3 — Code Sync

`e2e/code-sync.spec.ts`:

```typescript
test('code sync preview ve execute', async ({ page }) => {
  await loginAs(page, 'admin@releasehub.com');
  await page.goto('/code-sync-management');
  await page.selectOption('[name=customer]', 'Test Customer');
  await page.click('text=Branch Karşılaştır');
  await expect(page.locator('text=Preview')).toBeVisible();
  await page.click('text=Sync Başlat');
  await expect(page.locator('[data-testid=sync-status]')).toContainText('success');
});
```

---

## Test Çalıştırma Komutları

```bash
# Backend unit + integration testler
cd packages/backend && npm test

# Backend coverage raporu
cd packages/backend && npm test -- --coverage

# Frontend component testleri
cd packages/frontend && npm test -- --watchAll=false

# E2E testler (uygulama ayakta olmalı)
cd e2e && npx playwright test

# E2E rapor görüntüle
cd e2e && npx playwright show-report
```

---

## Test Yazma Kuralları

- Her yeni endpoint için en az şu 3 test: **401 (auth yok)**, **200/201 (başarılı)**, **400/404 (hata durumu)**
- Mock'lar gerçek endpoint'leri simüle etmeli — hardcoded `{ success: true }` kabul edilmez
- Test isimleri Türkçe veya İngilizce olabilir ama **davranışı** açıklamalı (`'ürünü günceller'` ✓, `'test1'` ✗)
- Her test bağımsız: `beforeEach` ile DB temizlenir, `afterAll` ile bağlantı kapatılır
- External servisler (n8n, MCP Server, TFS API) her zaman mock'lanır — gerçek çağrı yapılmaz
- E2E testlerde `data-testid` attribute'leri kullan — CSS class veya text'e bağımlılık azalt
- CI'da coverage %80 altına düşerse pipeline fail olur

---

## Handoff Notu — Zorunlu Çıktı

Audit tamamlandığında `designs/specs/{feature}.md` dosyasının sonuna (ya da ilgili screen dosyasına) şu bölümü ekle. RM bu özete göre release kararı verir.

```markdown
## Handoff Notes → Release Manager (QA Summary)

**Test edilen ekranlar:**
- ✅ `PageName` — temiz, bug yok
- ⚠️ `PageName` — [N] bug bulundu, [M] tanesi fix edildi
- ❌ `PageName` — kritik sorun, fix edilemedi

**Bug özeti:**
| Ticket | Severity | Durum | Özet |
|---|---|---|---|
| BUG-XXX | Critical | RESOLVED | [kısa açıklama] |
| BUG-YYY | Major | OPEN | [kısa açıklama] |

**Release blocker var mı?**
- [ ] Evet → BUG-XXX çözülmeden release yapılamaz
- [x] Hayır → release'e hazır

**RM kararı bekleniyor:** evet
```

---

## Kapsam Öncelikleri

| Öncelik | Kapsam | Test Türü |
|---|---|---|
| P0 | Auth (login, refresh, logout) | Integration |
| P0 | Products CRUD | Integration |
| P0 | Release oluşturma akışı | E2E |
| P1 | Hotfix talebi → onay akışı | E2E |
| P1 | Code Sync execute akışı | E2E |
| P1 | Customers + Mappings CRUD | Integration |
| P2 | n8n proxy tetikleme | Integration (mock) |
| P2 | MCP proxy endpoint'leri | Integration (mock) |
| P3 | Tüm dashboard component'leri | Component |

---

## Playwright E2E — Kurulmuş Altyapı

`e2e/` dizininde tam test altyapısı kurulu. 85 test, 20 ekran, headless Chrome.

### Testleri Çalıştırma

```bash
# Tüm ekranlar
cd e2e && npx playwright test --reporter=list

# Tek dosya
cd e2e && npx playwright test tests/04-releases.spec.ts

# Görsel mod (debug)
cd e2e && npx playwright test --headed
```

### Kritik MUI Selector Kuralları (Dersten Öğrenildi)

**YANLIŞ (Drawer ile karışır):**
```js
// [role="dialog"] hem MuiDrawer-paper hem MuiDialog-paper'ı eşleştirir!
await page.waitForSelector('[role="dialog"]');
const open = page.locator('[role="dialog"]').isVisible();
```

**DOĞRU:**
```js
// Modal dialog için:
await page.waitForSelector('.MuiDialog-paper');
// Drawer (side panel) için:
await page.waitForSelector('.MuiDrawer-paperAnchorRight');
// Hangi kullanıldığını bilmiyorsan (her ikisini de destekle):
await page.waitForSelector('.MuiDialog-paper, .MuiDrawer-paperAnchorRight');
```

**Helper fonksiyonlar (e2e/helpers/auth.ts):**
- `dialogOpen(page)` — sadece MUI Dialog (`.MuiDialog-paper`)
- `panelOpen(page)` — MUI Dialog VEYA Drawer (her ikisini kontrol eder)

### Hangi Sayfalar Dialog, Hangisi Drawer Kullanır

| Sayfa | Add/New UI | Selector |
|---|---|---|
| Product Catalog | Dialog (çok adımlı Stepper) | `.MuiDialog-paper` |
| Releases | Dialog | `.MuiDialog-paper` |
| Release Calendar | Dialog | `.MuiDialog-paper` |
| Hotfix Merkezi | Dialog | `.MuiDialog-paper` |
| Urgent Changes | Dialog | `.MuiDialog-paper` |
| **Customer Management** | **Drawer (right)** | `.MuiDrawer-paperAnchorRight` |
| **Users & Roles** | **Drawer (right)** | `.MuiDrawer-paperAnchorRight` |

### CSS Selector Hataları

**YANLIŞ — template literal ile compound selector:**
```js
const panelSel = '.MuiDrawer-paperAnchorRight, .MuiDialog-paper';
page.locator(`${panelSel} input[type="text"]`)
// → ".MuiDrawer-paperAnchorRight, .MuiDialog-paper input[type="text"]"
// → Drawer'ın kendisini seçer (input değil!)
```

**DOĞRU — her context için ayrı descendant combinator:**
```js
page.locator('.MuiDrawer-paperAnchorRight input[type="text"], .MuiDialog-paper input[type="text"]')
```

### Korporatif SSL Proxy ile Playwright Kurulumu

Chromium indirmesi `SELF_SIGNED_CERT_IN_CHAIN` hatasıyla başarısız olursa:
```js
// playwright.config.ts — system Chrome kullan
projects: [{
  name: 'chrome',
  use: { ...devices['Desktop Chrome'], channel: 'chrome' },
}],
// video kapatılmalı (ffmpeg indirmesi de başarısız)
use: { video: 'off', screenshot: 'on' }
```

### Form Save Testleri — Genel Pattern

Multi-select gerektiren formlarda save butonu disabled kalır. Test pattern:
```js
// Ürün/versiyon dropdown'unu doldur
const productSelect = page.locator('.MuiDialog-paper [role="combobox"]').first();
if (await productSelect.isVisible()) {
  await productSelect.click();
  await page.locator('[role="option"]').first().click();
}
// Save butonu enabled mı kontrol et
const saveBtn = page.getByRole('button', { name: /kaydet|oluştur|save/i });
const enabled = await saveBtn.isEnabled({ timeout: 3_000 }).catch(() => false);
if (enabled) {
  await saveBtn.click();
}
// Main assertion: crash olmadı (dialog/drawer açıldı —  bu yeterli)
```
