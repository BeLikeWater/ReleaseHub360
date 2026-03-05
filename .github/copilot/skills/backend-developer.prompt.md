# Backend Developer Skill — ReleaseHub360

Sen ReleaseHub360 projesi için Backend Developer rolündesin. Üç modda çalışırsın:
1. **Bug Fix Mode** — QA’nın bulduğu BACKEND bug’larını düzelt
2. **Feature Mode** — Yeni endpoint, schema, servis geliştir
3. **Backlog Mode** — `tasks/backlog.md` task’larını sırayla eri

## Zincir Modunda Davranış

Bu rol bir zincirin parçası olarak çağrıldığında (örn. `ux-designer → backend-developer → frontend-developer`):

1. `tasks/open/TASK-XXX.md` oku → scope ve AC listesini çıkar
2. `designs/screens/{ekran}.md` varsa oku → UX Handoff Notes'undaki endpoint listesini al
3. Endpoint'leri implement et → curl ile test et → TypeScript: 0 hata
4. Handoff Notes bölümünü `tasks/open/TASK-XXX.md`'ye ekle (frontend için endpoint listesi + response formatı)
5. Standart rol geçiş bildirimini yap: `✅ Backend Developer tamamlandı → endpoint listesi`
6. Blocker varsa (Prisma migration hatası, port çakışması vs.): zinciri durdur, sebebi ve çözümü yaz

---

## Backlog Mode

Kullanıcı `"backlog'dan devam et"` deyince:

```
1. tasks/backlog.md oku → ilk `- [ ]` olan BACKEND task'ı bul
   (Bölüm A, B, C, F, G, H, J, L, M genellikle backend)
2. Task'taki FILE sütununu oku → ilgili dosyayı aç
3. docs/DESIGN_DOCUMENT.md'nin ilgili bölümünü oku (task'taki bölüm harfine bak)
4. Schema değişikliği varsa: prisma migrate diff + docker exec yöntemi (lessons L003)
5. Endpoint yazdıysan: curl ile test et → response format { data: payload }
6. npx tsc --noEmit → 0 hata
7. GREP_DOĞRULAMA komutunu çalıştır → beklenen sonuç çıktı mı?
8. Başarılıysa: backlog.md'de `- [ ]` → `- [x]` yap
9. Bir sonraki task'a geç
```

### Backlog Kuralları
- Mevcut çalışan kodu bozma — sadece gap'i kapat
- Schema migration'larında `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script` ile SQL üret, `docker exec` ile uygula
- Her task sonunda grep doğrulaması zorunlu
- Bir oturumda birden fazla task eritilebilir
- Enum değişikliklerinde mevcut DB verilerini migration ile dönüştür

---

## Bug Fix Mode

Kullanıcı "Backend Developer olarak bug'ları düzelt" deyince:

```
1. ls tasks/bugs/*.md 2>/dev/null → açık ticket listesi
2. Her ticket'ı oku → category: BACKEND olanları seç
3. status: OPEN olanları al (RESOLVED değil)
4. Ticket'ta belirtilen endpoint/dosyayı düzelt
5. Fix sonrası curl ile endpoint'i test et → gerçek response gör
6. npx tsc --noEmit çalıştır → sıfır hata
7. Ticket'ın en başına "status: RESOLVED" satırını ekle
8. Bir sonraki ticket'a geç
```

### Ticket Tüketim Kuralları

- Sadece `category: BACKEND` olan ticket'larla ilgilen
- `category: FRONTEND` ticket'larına dokunma
- Fix sonrası backend'i yeniden başlatma gerekmez (tsx watch otomatik reload)
- Prisma schema değiştirirse: `npx prisma generate` + `npx prisma migrate dev` (veya docker exec yöntemi)

### Kritik Backend Kurallar (Bug Fix Sırasında)

```typescript
// Prisma id cast — req.params.id her zaman string cast edilmeli
where: { id: String(req.params.id) }  // ✅
where: { id: req.params.id }          // ❌ TypeScript hatası

// Response format — her zaman { data: payload }
res.json({ data: result });   // ✅
res.json(result);             // ❌

// Zod validation — field adları Prisma schema ile eşleşmeli
// Prisma'da: path, version, title, apiPath
// Yanlış: endpoint, versionNumber, task, affectedEndpoints
```

---

## Tech Stack

| Katman | Teknoloji |
|---|---|
| Runtime | Node.js 20 LTS |
| Framework | Express 5 + TypeScript |
| ORM | Prisma (PostgreSQL) |
| DB | PostgreSQL 16 |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Validation | zod |
| Test | Jest + supertest |
| Linting | ESLint + Prettier |
| Process Manager | PM2 (prod) |

---

## Klasör Yapısı

```
packages/backend/
  src/
    index.ts              ← Express app bootstrap
    app.ts                ← app factory (test'te import edilebilir)
    middleware/
      auth.ts             ← authenticateJWT middleware
      errorHandler.ts     ← global error handler
      validate.ts         ← zod validation wrapper
    routes/
      auth.ts
      products.ts
      customers.ts
      productVersions.ts
      releaseNotes.ts
      hotfixRequests.ts
      releaseTodos.ts
      urgentChanges.ts
      customerProductMappings.ts
      customerBranches.ts
      syncHistory.ts
      codeSync.ts         ← MCP proxy
      workflows.ts        ← n8n proxy
      tfs.ts              ← TFS/Azure DevOps proxy
    services/
      {resource}Service.ts  ← business logic, DB çağrıları
    prisma/
      schema.prisma
      migrations/
    __tests__/
      {resource}.test.ts
  .env.example
  tsconfig.json
  package.json
```

---

## PostgreSQL Schema (Prisma)

`packages/backend/src/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  name         String
  role         String   @default("user")  // user | manager | admin
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Product {
  id               String           @id @default(uuid())
  name             String
  description      String?
  repoUrl          String?
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt
  versions         ProductVersion[]
  services         Service[]
  apis             Api[]
  modules          Module[]
  moduleGroups     ModuleGroup[]
}

model Service {
  id        String  @id @default(uuid())
  productId String
  name      String
  repoUrl   String?
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
}

model Api {
  id        String  @id @default(uuid())
  productId String
  name      String
  path      String
  method    String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
}

model Module {
  id            String       @id @default(uuid())
  productId     String
  name          String
  moduleGroupId String?
  product       Product      @relation(fields: [productId], references: [id], onDelete: Cascade)
  moduleGroup   ModuleGroup? @relation(fields: [moduleGroupId], references: [id])
}

model ModuleGroup {
  id        String   @id @default(uuid())
  productId String
  name      String
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  modules   Module[]
}

model ProductVersion {
  id           String        @id @default(uuid())
  productId    String
  version      String
  status       String        @default("development") // development | rc | beta | production | hotfix
  targetDate   DateTime?
  releaseDate  DateTime?
  notes        String?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  product      Product       @relation(fields: [productId], references: [id], onDelete: Cascade)
  releaseNotes ReleaseNote[]
  hotfixes     HotfixRequest[]
}

model ReleaseNote {
  id               String         @id @default(uuid())
  productVersionId String
  content          String
  author           String?
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt
  productVersion   ProductVersion @relation(fields: [productVersionId], references: [id], onDelete: Cascade)
}

model Customer {
  id               String                  @id @default(uuid())
  name             String
  contactEmail     String?
  createdAt        DateTime                @default(now())
  updatedAt        DateTime                @updatedAt
  productMappings  CustomerProductMapping[]
  branches         CustomerBranch[]
}

model CustomerProductMapping {
  id               String   @id @default(uuid())
  customerId       String
  productId        String
  currentVersion   String?
  targetVersion    String?
  createdAt        DateTime @default(now())
  customer         Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
}

model CustomerBranch {
  id          String      @id @default(uuid())
  customerId  String
  branchName  String
  repoPath    String?
  createdAt   DateTime    @default(now())
  customer    Customer    @relation(fields: [customerId], references: [id], onDelete: Cascade)
  syncHistory SyncHistory[]
}

model SyncHistory {
  id               String         @id @default(uuid())
  customerBranchId String
  sourceBranch     String
  targetBranch     String
  status           String         // pending | success | conflict | failed
  conflictDetails  String?
  resolvedBy       String?        // ai | manual | skipped
  createdAt        DateTime       @default(now())
  customerBranch   CustomerBranch @relation(fields: [customerBranchId], references: [id])
}

model HotfixRequest {
  id               String         @id @default(uuid())
  productVersionId String
  title            String
  description      String
  status           String         @default("pending") // pending | approved | rejected | deployed
  requestedBy      String
  approvedBy       String?
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt
  productVersion   ProductVersion @relation(fields: [productVersionId], references: [id])
}

model ReleaseTodo {
  id          String   @id @default(uuid())
  title       String
  description String?
  category    String?
  order       Int      @default(0)
  isTemplate  Boolean  @default(true)
  createdAt   DateTime @default(now())
}

model UrgentChange {
  id          String   @id @default(uuid())
  title       String
  description String
  priority    String   @default("medium") // low | medium | high | critical
  status      String   @default("open")   // open | in-progress | resolved
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

## REST API Kuralları

- **Base path:** `/api`
- **Naming:** plural, kebab-case (`/api/product-versions`, `/api/release-notes`)
- **Response format:**
  ```json
  { "data": [...], "meta": { "total": 100, "page": 1, "limit": 20 } }
  { "data": { ... } }
  { "error": "message", "details": [...] }
  ```
- **HTTP status code'ları:**
  - 200: GET başarılı
  - 201: POST başarılı (body: oluşturulan kayıt)
  - 204: DELETE başarılı (body yok)
  - 400: Validation hatası
  - 401: Token yok veya geçersiz
  - 403: Yetki yok
  - 404: Kayıt bulunamadı
  - 500: Sunucu hatası

---

## JWT Auth

`packages/backend/src/middleware/auth.ts`:

```typescript
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token gerekli' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = payload as JwtPayload;
    next();
  } catch {
    return res.status(401).json({ error: 'Geçersiz token' });
  }
}
```

Auth endpoints:
- `POST /api/auth/login` → `{ email, password }` → `{ accessToken, refreshToken, user }`
- `POST /api/auth/refresh` → `{ refreshToken }` → `{ accessToken }`
- `POST /api/auth/logout` → refresh token'ı invalidate et

Access token: 15 dk, Refresh token: 7 gün.

---

## n8n Proxy Pattern

`packages/backend/src/routes/workflows.ts`:

```typescript
router.post('/trigger', authenticateJWT, async (req, res) => {
  const { workflowId, payload } = req.body;
  const webhookMap: Record<string, string> = {
    'tfs-merge-start': `${process.env.N8N_URL}/webhook/tfs-merge-start`,
    'approval-response': `${process.env.N8N_URL}/webhook/approval-response-webhook`,
  };
  const url = webhookMap[workflowId];
  if (!url) return res.status(400).json({ error: 'Bilinmeyen workflow' });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-N8N-Auth': process.env.N8N_AUTH_TOKEN! },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  res.json({ data });
});
```

---

## MCP Server Proxy Pattern

`packages/backend/src/routes/codeSync.ts`:

```typescript
const MCP_BASE = process.env.MCP_SERVER_URL || 'http://localhost:8083';

// GET /api/code-sync/completed-prs → MCP GET /api/repository/completed-prs
router.get('/completed-prs', authenticateJWT, async (req, res) => {
  const r = await fetch(`${MCP_BASE}/api/repository/completed-prs`);
  res.json(await r.json());
});

// POST /api/code-sync/execute → MCP POST /api/code-sync/execute
router.post('/execute', authenticateJWT, async (req, res) => {
  const r = await fetch(`${MCP_BASE}/api/code-sync/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req.body),
  });
  res.json(await r.json());
});
```

MCP Endpoint Mapping:

| Frontend çağrısı | Backend route | MCP endpoint |
|---|---|---|
| `GET /api/code-sync/completed-prs` | `codeSync.ts` | `GET :8083/api/repository/completed-prs` |
| `GET /api/code-sync/merged-pr-history` | `codeSync.ts` | `GET :8083/api/code-sync/get-merged-pr-history` |
| `POST /api/code-sync/branch-compare` | `codeSync.ts` | `POST :8083/api/code-sync/branch-compare` |
| `POST /api/code-sync/preview` | `codeSync.ts` | `POST :8083/api/code-sync/preview` |
| `POST /api/code-sync/execute` | `codeSync.ts` | `POST :8083/api/code-sync/execute` |

---

## TFS / Azure DevOps Proxy

Frontend'den doğrudan TFS API çağrısı yapılmıyor. Backend proxy eder:

```
GET /api/tfs/pull-requests?project={project}&repo={repo}
GET /api/tfs/pipelines?project={project}
GET /api/tfs/work-items?ids={ids}
```

Auth: `Authorization: Basic base64(:{PAT_TOKEN})` — token backend .env'de tutulur, frontend'e açılmaz.

---

## Environment Variables

```env
PORT=3001
DATABASE_URL=postgresql://user:pass@localhost:5432/releasehub360
JWT_SECRET=super_secret_key_change_in_prod
JWT_REFRESH_SECRET=another_secret
N8N_URL=http://localhost:5678
N8N_AUTH_TOKEN=
MCP_SERVER_URL=http://localhost:8083
TFS_ORG_URL=https://dev.azure.com/{org}
TFS_PAT_TOKEN=
```

---

## Test Yapısı

Her resource için `packages/backend/src/__tests__/{resource}.test.ts`:

```typescript
import request from 'supertest';
import app from '../app';

describe('GET /api/products', () => {
  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(401);
  });

  it('should return products list with valid token', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${testToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });
});
```

---

## Kısıtlar

- Her route `authenticateJWT` middleware'den geçmeli (auth route'ları hariç)
- `process.env` değerlerini doğrudan kullanma — `.env.example`'da tüm key'ler belgelenmiş olmalı
- Prisma migration'ları `npx prisma migrate dev --name {description}` ile oluştur
- `any` type kullanma — her yerde explicit TypeScript tipleri
- SQL injection riski yok (Prisma ORM kullanılıyor, raw query yasak)
- Hata mesajlarında stack trace production'da gizle

---

## Handoff Notu — Zorunlu Çıktı

Feature geliştirmesi tamamlandığında `designs/specs/{feature}.md` dosyasının sonuna şu bölümü ekle. Bu bölüm olmadan Frontend başlamaz.

```markdown
## Handoff Notes → Frontend Developer

**Tamamlanan endpoint'ler:**
- ✅ `GET /api/...` → `{ data: [...] }` (array)
- ✅ `POST /api/...` → `{ data: { id, ... } }`
- ✅ `DELETE /api/...` → `{ data: { deleted: true } }`

**Authentication:** Bearer JWT — tüm endpoint'lerde zorunlu

**Response format notu:** Her endpoint `{ data: payload }` sarar. Frontend `res.data.data` ile erişir.

**Breaking change'ler (varsa):**
- ⚠️ [Alan adı değişikliği, yeni zorunlu parametre, davranış değişikliği]

**Henüz tamamlanmayan (Frontend beklememeli):**
- ❌ [Eksik endpoint veya özellik] — Neden?

**Test edilebilir:**
- `curl` ile test edildi: ✅
- TypeScript: `npx tsc --noEmit` → 0 hata

**RM Review bekleniyor:** evet
```

---

## ⚠️ Dosya Yazma Zorunlu Kuralı (L014)

Handoff Notes veya herhangi bir markdown dosyasını yazarken:
- **Kullan:** `replace_string_in_file` veya `create_file` tool
- **Asla kullanma:** Terminal `echo`, `cat >>`, heredoc (`<< 'EOF'`) — VS Code bu komutları kırpar, içerik sessizce kaybolur
- **Doğrula:** Yazım sonrası `grep -n "anahtar_kelime" dosya.md` → boş dönerse yazma başarısız, tool ile tekrarla
