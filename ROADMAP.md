# ReleaseHub360 — MVP'den Gerçek Ürüne Yol Haritası

**TL;DR:** ReleaseHub360 şu an Firebase-backed saf bir React SPA. Hedef: Monorepo içinde Express+TypeScript backend, PostgreSQL, JWT auth; Firebase tamamen kaldırılıyor. Önce skills oluşturulur, UX Designer ile 30+ route konsolide edilip wireframe'lenir, Backend Developer ile schema+API inşa edilir, Frontend Developer ile Firebase→API migration yapılır.

---

## Kararlar

| Konu | Karar |
|---|---|
| Backend | Express + TypeScript (monolith, sonradan microservice'e bölünebilir) |
| Auth | JWT custom — Firebase Auth tamamen kaldırılıyor |
| Repo | Monorepo — `packages/frontend`, `packages/backend`, `packages/mcp-server` |
| DB | PostgreSQL 16 (Firebase Firestore yerine) |
| İlk adım | Skills dosyaları → UX tasarım |

---

## Faz 0 — Skills Oluştur (Agent modunda, ~30 dk)

`.github/copilot/skills/` altında 3 dosya oluştur:

1. `ux-designer.md` — UX konvansiyonları, MUI Design System, Mermaid flow diagramları, ekran akış şablonu
2. `frontend-developer.md` — React 19 + MUI v7 conventions, API entegrasyon pattern'i, mevcut component envanteri, migration kuralları
3. `backend-developer.md` — Express+TypeScript standartları, PostgreSQL schema convention'ları, JWT pattern, n8n webhook proxy pattern, MCP proxy pattern, REST naming rules

---

## Faz 1 — UX Tasarım (UX Designer Skill ile, ~1-2 gün)

### 1a. Screen Inventory
Sub-agent görevi: 30+ route'u incele, hangisi gerçek ürüne alınacak, hangisi archive.
Çıktı: `designs/SCREEN_INVENTORY.md`

Şu an mevcut route'lar (30+):
- ProcessFlow, CustomerDashboard/V2, Releases, TodoList, ChangeTracking, ReportIssue
- ReleaseNotes, HotfixManagement, UrgentChanges, ReleaseCalendar/V3
- ReleaseHealthCheck / Simplified / V2, PipelineStatus
- BetaTagRequest, HotfixRequest, HotfixRequestApproval, VersionLifecycle
- ServiceVersionMatrix/V2, CustomerReleaseTrack/V2, CustomerServiceMapping
- CustomerManagement/V2, CustomerProductMappingV2, ProductManagement
- ReleaseTodoManagement, UrgentChangesManagement, ProductCatalog
- ModuleGroupManagement, ModuleManagement, ApiManagement
- ReleaseNoteForVersion, CodeSyncManagement

### 1b. Navigation Redesign
V1/V2/V3 kopyaları temizlenir. Hedef ~15 ana ekran.

### 1c. Wireframe'ler
Her ekran için `designs/screens/{screen}.md` — layout, componentler, action'lar, API bağlantıları.

Öncelik sırası:
1. Release Health Check V2 (en karmaşık)
2. Product Catalog + Module/API Management (konsolidasyon)
3. Customer Dashboard V2
4. Release Calendar V3
5. Code Sync Management (MCP entegrasyonlu)
6. Hotfix Flow (Request → Approval → Management)
7. Customer Management + Mapping

---

## Faz 2 — Backend (Backend Developer Skill ile, ~3-5 gün)

### 2a. Monorepo Yapısı
```
/packages
  /frontend   ← mevcut ReleaseHub360/src
  /backend    ← yeni Express+TS
  /mcp-server ← referans / git submodule
```

### 2b. PostgreSQL Schema

| Firebase Koleksiyonu | PostgreSQL Tablo(lar) |
|---|---|
| `products` + embedded arrays | `products`, `services`, `apis`, `modules`, `module_groups` |
| `productVersions` | `product_versions` |
| `customers` | `customers` |
| `customerProductMappings` | `customer_product_mappings` |
| `masterVersionReleaseNotes` | `release_notes` |
| `customer_branches` | `customer_branches` |
| `sync_history` | `sync_history` |
| *(yeni)* | `hotfix_requests`, `release_todos`, `urgent_changes`, `users` |

### 2c. API Routes
- Her tablo = REST resource (`/api/{resource}`)
- `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`
- `/api/webhooks/n8n/*` — n8n proxy
- `/api/code-sync/*` — MCP server proxy

### 2d. JWT Auth
- `POST /api/auth/login` → access token (15 dk) + refresh token (7 gün)
- Tüm route'lar `authenticateJWT` middleware'den geçiyor

### 2e. n8n Standardizasyonu

Eski (güvensiz): Frontend → doğrudan TFS API çağrısı

Yeni:
```
Frontend → POST /api/workflows/trigger { workflowId, payload }
Backend  → POST n8n-webhook-url + auth header
```

Mevcut n8n workflow: `tfs-merge-with-ai-conflict-resolution`
- Webhook: `POST /webhook/tfs-merge-start`
- Approval callback: `POST /webhook/approval-response-webhook`
- AI: `gpt-4-turbo-preview` ile conflict resolution + Slack approval

### 2f. MCP Server Proxy

Eski (güvensiz): Frontend → `http://localhost:8083/api`

Yeni:
```
Frontend → GET /api/code-sync/completed-prs
Backend  → GET http://mcp-server:8083/api/repository/completed-prs
```

MCP Endpoints:
- `GET /api/repository/completed-prs`
- `GET /api/code-sync/get-merged-pr-history`
- `POST /api/code-sync/branch-compare`
- `POST /api/code-sync/preview`
- `POST /api/code-sync/execute`

---

## Faz 3 — Frontend Migration (Frontend Developer Skill ile, ~2-3 gün)

Paralel sub-agent task'ları (birbirinden bağımsız):

1. Firebase config kaldır → `packages/frontend/src/api/client.ts` (axios + JWT interceptor)
2. `products/*` — ProductCatalog, ModuleManagement, ApiManagement, ModuleGroupManagement
3. `customers/*` + `customerProductMappings/*` — CustomerManagementV2, CustomerProductMappingV2
4. `productVersions/*` + `releaseNotes/*` — Releases, ReleaseCalendarV3, ReleaseNoteForVersion
5. `customerBranches/*` + `syncHistory/*` + MCP proxy — CodeSyncManagement
6. `hotfixRequests/*`, `releaseTodos/*`, `urgentChanges/*`

---

## Faz 4 — Docker Compose (~0.5 gün)

`docker-compose.yml` servisleri:
- `frontend` (nginx static)
- `backend` (Express:3001)
- `postgres:16`
- `n8n`
- `mcp-server`
- `jaeger` (mevcut docker-compose.jaeger.yml'den)

nginx reverse proxy: `/api/*` → backend, `/` → frontend

---

## Verification

- **Backend:** `packages/backend/src/__tests__/` — her resource için supertest integration test
- **Frontend:** `grep -r "firebase" packages/frontend/src` → 0 sonuç
- **E2E:** 3 kritik akış → Release oluşturma, Hotfix talebi, Code Sync yürütme

---

## Mevcut Durum (Referans)

### Kullanılan Firebase Koleksiyonları
`products`, `productVersions`, `customers`, `customerProductMappings`, `masterVersionReleaseNotes`, `customer_branches`, `sync_history`

### Tech Stack (Şu an)
- React 19 + React Router v7 + MUI v7
- Firebase Firestore v11
- Jaeger (docker-compose)
- n8n (TFS/Azure DevOps + OpenAI)
- External MCP Server @ localhost:8083

### Tech Stack (Hedef)
- React 19 + React Router v7 + MUI v7 (korunuyor)
- Express + TypeScript (yeni backend)
- PostgreSQL 16
- JWT Auth
- n8n (backend üzerinden proxy)
- MCP Server (backend üzerinden proxy)
- Docker Compose (tüm servisler)