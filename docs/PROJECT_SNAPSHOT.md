# ReleaseHub360 — Project Snapshot & Design Document

**Tarih:** 27 Şubat 2026  
**Hazırlayan:** Release Manager  
**Amaç:** Projenin mevcut durumunu, eksikliklerini ve nihai tasarım hedefini tek dokümanda toplamak

---

## 1. Proje Vizyonu

ReleaseHub360, kurumsal yazılım ürünlerinin **release yaşam döngüsünü uçtan uca yöneten** bir platformdur.

**Kime?** Release Manager, DevOps, QA, teknik ekip liderlerine.

**Ne yapar?**
- Ürün versiyonlarını planlama → geliştirme → test → staging → production → hotfix döngüsünde takip eder
- Müşteriye özel branch'leri, versiyon farklılıklarını ve kod senkronizasyonunu yönetir
- CI/CD pipeline'larını izler, release health check ile "Bu versiyon production'a çıkabilir mi?" sorusunu yanıtlar
- Hotfix taleplerini, acil değişiklikleri ve release notlarını merkezi olarak yönetir
- TFS/Azure DevOps, n8n workflow ve MCP Server entegrasyonlarıyla süreçleri otomatize eder

---

## 2. Teknik Mimari

### 2.1 Stack

| Katman | Teknoloji | Durum |
|--------|-----------|-------|
| **Frontend** | React 19 + MUI v7 + TanStack Query v5 | ✅ Aktif |
| **Backend** | Express + TypeScript + Prisma ORM | ✅ Aktif |
| **Database** | PostgreSQL 16 (Docker) | ✅ Aktif |
| **MCP Server** | FastAPI / Python (Code Sync) | ✅ Aktif |
| **Auth** | JWT (bcrypt + jsonwebtoken) | ✅ Aktif |
| **Workflow Engine** | n8n (external, webhook proxy) | ✅ Aktif |
| **DevOps Platform** | Azure DevOps / TFS (external) | ✅ Entegre |
| **Eski Firebase** | Tamamen kaldırıldı | ✅ 0 import |

### 2.2 Monorepo Yapısı

```
packages/
├── frontend/          7.464 satır (21 page, 2 layout comp, 1 store, 1 api client)
├── backend/           3.075 satır (23 route dosyası, 109 endpoint)
└── mcp-server/        Python FastAPI (TFS/Git entegrasyonu, cherry-pick, PR analizi)
```

### 2.3 Veritabanı (PostgreSQL — 22 tablo)

| Tablo | Model | Açıklama |
|-------|-------|----------|
| `users` | User | JWT auth, roller (ADMIN, RELEASE_MANAGER, DEVELOPER) |
| `products` | Product | Ürün tanımları + TFS/Azure bağlantı bilgileri |
| `services` | Service | Ürüne ait servisler (repo, pipeline, port, image) |
| `apis` | Api | Servis API endpoint'leri (breaking change takibi) |
| `module_groups` | ModuleGroup | Modül grupları (ürün altında) |
| `modules` | Module | Modüller (grup altında, servise bağlı) |
| `product_versions` | ProductVersion | Sürüm lifecycle (PLANNED→DEV→RC→STAGING→PRODUCTION) |
| `release_notes` | ReleaseNote | Sürüm bazlı release notları |
| `system_changes` | SystemChange | API/sistem değişiklikleri (breaking flag) |
| `customers` | Customer | Müşteri yönetimi (tenant, environment, SLA) |
| `customer_product_mappings` | CustomerProductMapping | Müşteri→Sürüm eşleştirmeleri |
| `customer_service_mappings` | CustomerServiceMapping | Müşteri→Servis eşleştirmeleri |
| `customer_branches` | CustomerBranch | Müşteriye özel Git branch'leri |
| `sync_history` | SyncHistory | Code sync geçmişi (conflict, payload, commit) |
| `hotfix_requests` | HotfixRequest | Hotfix talebi workflow (PENDING→APPROVED→REJECTED) |
| `release_todos` | ReleaseTodo | Release checklist (template + instance) |
| `service_release_snapshots` | ServiceReleaseSnapshot | Servis bazlı release snapshot (BoM) |
| `urgent_changes` | UrgentChange | Acil değişiklik kayıtları |
| `notifications` | Notification | Kullanıcı bildirimleri |
| `workflow_history` | WorkflowHistory | n8n workflow execution log |
| `settings` | Setting | Sistem ayarları (TFS URL, PAT, n8n webhook URL) |

**DB ↔ Prisma uyumu:** ✅ Tam senkron — 22 tablo, 22 model, 0 drift.

---

## 3. Ekran Envanteri — Mevcut Durum

### 3.1 Tüm Ekranlar (21 sayfa — hepsi IMPLEMENTED)

| # | Ekran | Route | Satır | Kategori | API Bağlantısı |
|---|-------|-------|-------|----------|----------------|
| 1 | Login | `/login` | 57 | Auth | `POST /auth/login` |
| 2 | Ana Dashboard | `/` | 35 | Dashboard | `GET /dashboard/summary` |
| 3 | Release Health Check | `/release-health-check` | 1.307 | **Command Center** | 10+ endpoint (TFS, notes, todos, services...) |
| 4 | Ürün Kataloğu | `/product-catalog` | 738 | Management | CRUD `/products`, `/services`, `/modules`, `/module-groups` |
| 5 | Release Takvimi | `/release-calendar` | 579 | Management | `/product-versions` CRUD + phase |
| 6 | Versiyon Listesi | `/releases` | 222 | Management | `/product-versions`, `/release-notes` |
| 7 | Release Notları | `/release-notes` | 347 | Detail | `/release-notes` CRUD + publish |
| 8 | Hotfix Merkezi | `/hotfix-merkezi` | 206 | Workflow | `/hotfix-requests` CRUD + approve/reject |
| 9 | Müşteri Yönetimi | `/customer-management` | 605 | Management | `/customers`, `/customer-product-mappings` |
| 10 | Müşteri Dashboard | `/customer-dashboard` | 303 | Dashboard | `/customers/:id`, `/customer-product-mappings` |
| 11 | Code Sync | `/code-sync` | 703 | Workflow | `/code-sync/*` (delta, start, status, history) |
| 12 | Servis Versiyon Matrisi | `/service-version-matrix` | 156 | Detail | `/customer-product-mappings`, `/products` |
| 13 | Değişiklik Takibi | `/change-tracking` | 241 | Management | `/system-changes` CRUD |
| 14 | Pipeline Durumu | `/pipeline-status` | 193 | Detail | `/tfs/pipelines` + trigger + logs |
| 15 | Acil Değişiklikler | `/urgent-changes` | 357 | Management | `/urgent-changes` CRUD |
| 16 | Release Todos | `/release-todos` | 229 | Management | `/release-todos` CRUD |
| 17 | Sorun Bildir | `/report-issue` | 189 | Workflow | `/urgent-changes` POST |
| 18 | Bildirimler | `/notifications` | 220 | Detail | `/notifications` read/mark |
| 19 | Kullanıcı & Roller | `/users-roles` | 268 | Admin | `/users` CRUD + role/status |
| 20 | Ayarlar | `/settings` | 304 | Admin | `/settings` GET/PUT + test-connection |
| 21 | Workflow Geçmişi | `/workflow-history` | 230 | Admin | `/workflow-history` + retry |

### 3.2 Backend API Özeti

| Kategori | Route Dosyası | Endpoint Sayısı |
|----------|---------------|-----------------|
| Auth | auth.routes.ts | 3 |
| Dashboard | dashboard.routes.ts | 2 |
| Products | products.routes.ts | 5 |
| Services | services.routes.ts | 5 |
| APIs | apis.routes.ts | 5 |
| Modules | modules.routes.ts | 9 (incl. groups) |
| Product Versions | productVersions.routes.ts | 7 |
| Release Notes | releaseNotes.routes.ts | 5 |
| Customers | customers.routes.ts | 5 |
| Customer Mappings | customerProductMappings.routes.ts | 4 |
| Code Sync | codeSync.routes.ts | 14 |
| Hotfix Requests | hotfixRequests.routes.ts | 5 |
| Release Todos | releaseTodos.routes.ts | 4 |
| Service Snapshots | serviceReleaseSnapshots.routes.ts | 3 |
| System Changes | systemChanges.routes.ts | 6 |
| Urgent Changes | urgentChanges.routes.ts | 4 |
| TFS Proxy | tfs.routes.ts | 7 |
| MCP Proxy | mcp.routes.ts | 6 |
| Notifications | notifications.routes.ts | 4 |
| Users | users.routes.ts | 7 |
| Settings | settings.routes.ts | 3 |
| Workflows (trigger) | workflows.routes.ts | 1 |
| Workflow History | workflowHistory.routes.ts | 4 |
| **TOPLAM** | **23 dosya** | **109 endpoint** |

---

## 4. Tasarım Dokümanları Durumu

### 4.1 Ekran Tasarımları (22 dosya — `designs/screens/`)

| Tasarım Dosyası | Karşılığı Olan Sayfa | Tasarım ↔ Kod Uyumu |
|-----------------|---------------------|---------------------|
| login.md | LoginPage.tsx | ✅ Uyumlu |
| home-dashboard.md | HomeDashboardPage.tsx | ⚠️ Kısmi — tasarım daha zengin, kod minimal (35 satır) |
| release-health-check.md | ReleaseHealthCheckPage.tsx | ✅ Uyumlu (Command Center pattern) |
| product-catalog.md | ProductCatalogPage.tsx | ✅ Uyumlu |
| release-calendar.md | ReleaseCalendarPage.tsx | ✅ Uyumlu |
| releases.md | ReleasesPage.tsx | ✅ Uyumlu |
| release-notes.md | ReleaseNotesPage.tsx | ✅ Uyumlu |
| hotfix-merkezi.md | HotfixMerkeziPage.tsx | ✅ Uyumlu |
| customer-management.md | CustomerManagementPage.tsx | ✅ Uyumlu |
| customer-dashboard.md | CustomerDashboardPage.tsx | ⚠️ Kısmi — tasarımda servis durumu, branch listesi var; kodda sadece mapping |
| code-sync.md | CodeSyncPage.tsx | ✅ Uyumlu |
| customer-version-sync.md | (CodeSyncPage içinde) | ✅ Entegre edildi |
| service-version-matrix.md | ServiceVersionMatrixPage.tsx | ✅ Uyumlu |
| change-tracking.md | ChangeTrackingPage.tsx | ✅ Uyumlu |
| pipeline-status.md | PipelineStatusPage.tsx | ✅ Uyumlu |
| urgent-changes.md | UrgentChangesPage.tsx | ✅ Uyumlu |
| release-todos.md | ReleaseTodosPage.tsx | ✅ Uyumlu |
| report-issue.md | ReportIssuePage.tsx | ✅ Uyumlu |
| notifications.md | NotificationsPage.tsx | ✅ Uyumlu |
| users-roles.md | UsersRolesPage.tsx | ✅ Uyumlu |
| settings.md | SettingsPage.tsx | ✅ Uyumlu |
| workflow-history.md | WorkflowHistoryPage.tsx | ✅ Uyumlu |

### 4.2 Feature Spec'ler (6 dosya — `designs/specs/`)

| Spec | Durum | İmplementasyon |
|------|-------|----------------|
| customer-version-sync.md | ✅ Tamamlandı | CodeSyncPage.tsx + codeSync.routes.ts |
| product-catalog-redesign.md | ⚠️ Kısmi | ProductCatalogPage mevcut ama tasarımdaki ağaç yapısı tam değil |
| release-calendar-redesign.md | ✅ Tamamlandı | ReleaseCalendarPage.tsx 5 tarih alanı + phase transitions |
| release-health-check-v3.md | ⚠️ Kısmi | ReleaseHealthCheckPage var ama BoM bölümü eksik |
| service-release-snapshot.md | ⚠️ Bekliyor | DB tablosu var, backend route var, frontend entegrasyon eksik |
| pr-feature-flag-wrapper.md | ❌ Başlanmadı | Tamamen yeni özellik — LLM entegrasyonu gerekli |

---

## 5. Bug Durumu

### 5.1 Özet

| Metrik | Sayı |
|--------|------|
| Toplam bug | 18 |
| RESOLVED | 12 |
| OPEN | 6 |
| Kritik açık | 1 (BUG-014 — VSRM 403) |

### 5.2 Açık Buglar

| ID | Öncelik | Ekran | Sorun |
|----|---------|-------|-------|
| BUG-011 | P2 | Release Calendar | PRODUCTION→ARCHIVED geçişi yok (buton + endpoint eksik) |
| BUG-014 | Kritik | Release Health Check | VSRM 403 (Entra CAP) — PR'lar sessizce boş dönüyor |
| BUG-015 | P1 | Code Sync | Sync confirm dialog'da sync branch adı gösterilmiyor |
| BUG-016 | P2 | Code Sync | History tab'da UUID gösteriliyor (version adı değil) |
| BUG-017 | P2 | Code Sync | Target version filtresi yok (düşük versiyon seçilebiliyor) |
| BUG-018 | P2 | Code Sync | History tab'da workitem sayısı eksik |

### 5.3 En Fazla Bug Yaşayan Ekranlar

1. **Code Sync** — 4 açık bug (P1×1, P2×3)
2. **Release Health Check** — 1 kritik bug
3. **Release Calendar** — 1 P2 bug

---

## 6. ROADMAP vs Gerçeklik

### 6.1 Faz Tamamlanma Durumu

| Faz | Hedef | Durum | Tamamlanma |
|-----|-------|-------|------------|
| **Faz 0** — Skills oluştur | Skill dosyaları | ✅ | 100% |
| **Faz 1** — UX Tasarım | Screen inventory + wireframe | ✅ | 100% (21 ekran + 22 tasarım) |
| **Faz 2** — Backend | Schema + API + Auth | ✅ | 95% (109 endpoint, 22 tablo) |
| **Faz 3** — Frontend Migration | Firebase → API | ✅ | 100% (0 Firebase import) |
| **Faz 4** — Docker Compose | Tüm servislerin containerize edilmesi | ⚠️ | 60% (DB container var, app'ler local) |

### 6.2 Roadmap'te Olup Eksik Kalan

| Hedef | Durum | Detay |
|-------|-------|-------|
| nginx reverse proxy | ❌ | Frontend dev server doğrudan çalışıyor, production build yok |
| n8n container | ❌ | n8n external olarak çalışıyor, Docker Compose'da yok |
| Backend integration testleri | ❌ | `__tests__/` klasörü yok, 0 test |
| E2E testler (3 kritik akış) | ❌ | Playwright/Cypress yok |
| Jaeger tracing | ❌ | docker-compose.yml'de Jaeger servisi yok |

---

## 7. Gap Analizi — Kritik Eksiklikler

### 7.1 Mimari Eksiklikler

| # | Eksiklik | Etki | Öncelik |
|---|----------|------|---------|
| 1 | **Test altyapısı sıfır** | Backend'de 0 test, frontend'de 0 test, E2E yok | P0 |
| 2 | **Ana Dashboard çok sığ** | 35 satırlık 4 kart — tasarımda role-based content, pending actions var | P1 |
| 3 | **Müşteri Dashboard eksik** | Tasarımda servis durumu, branch listesi, release tracking var — kodda sadece mapping tablosu | P1 |
| 4 | **Service Release Snapshot frontend'i yok** | Backend + DB hazır ama Health Check'e BoM olarak entegre değil | P1 |
| 5 | **Production deployment pipeline yok** | Docker Compose eksik (nginx, n8n, jaeger), CI/CD yok | P2 |
| 6 | **Shared component kütüphanesi yok** | Her sayfa kendi UI'ını inline yazıyor — tekrar eden pattern'ler var | P2 |
| 7 | **Error boundary yok** | Global error handling + fallback UI eksik | P2 |
| 8 | **PR Feature Flag Wrapper** | Spec hazır ama başlanmadı — LLM entegrasyonu gerekiyor | P3 |

### 7.2 UX/UI Eksiklikleri

| # | Eksiklik | Etki |
|---|----------|------|
| 1 | **Responsive design** | Tüm sayfalar masaüstü için — mobil/tablet uyum yok |
| 2 | **Dark mode** | Henüz yok — theme sadece light |
| 3 | **Loading skeleton** | Çoğu sayfada sadece CircularProgress — skeleton placeholder yok |
| 4 | **Keyboard shortcuts** | Sık kullanılan aksiyonlar için kısayol yok |
| 5 | **Boş state tasarımları** | Çoğu listede boş state görseli yok — sadece "Veri bulunamadı" yazısı |
| 6 | **Real-time güncellemeler** | WebSocket/SSE yok — sadece manual refresh veya polling |

### 7.3 Güvenlik & Operasyonel Eksiklikler

| # | Eksiklik | Etki |
|---|----------|------|
| 1 | **Rate limiting** | API'lerde rate limit yok |
| 2 | **Audit log** | Kim ne zaman ne değiştirdi — genel audit trail yok |
| 3 | **Refresh token rotation** | Refresh token tek kullanımlık değil — replay risk |
| 4 | **CORS konfigürasyonu** | Production için sıkılaştırılmamış |
| 5 | **Input sanitization** | Zod validation var ama XSS koruması kontrol edilmeli |
| 6 | **Secrets yönetimi** | .env dosyasına bağımlı — vault entegrasyonu yok |

---

## 8. Sistem Entegrasyonları

### 8.1 TFS / Azure DevOps

```
Frontend → Backend (/api/tfs/*) → Azure DevOps REST API
```

| Endpoint | Ne Yapar |
|----------|----------|
| `GET /tfs/pull-requests` | PR listesi (repo+branch bazlı) |
| `GET /tfs/pipelines` | Pipeline listesi + durumu |
| `POST /tfs/pipelines/:id/trigger` | Pipeline tetikleme |
| `GET /tfs/work-items` | Work item listesi |
| `GET /tfs/release-stages` | Release stage bilgileri |
| `GET /tfs/release-delta` | İki versiyon arası fark |

**Bilinen sorun:** BUG-014 — Entra Conditional Access Policy (CAP) VSRM endpoint'i 403 döndürüyor.

### 8.2 MCP Server (Code Sync)

```
Frontend → Backend (/api/code-sync/*) → MCP Server (FastAPI :8083) → TFS Git API
```

| Akış | Endpoint'ler |
|------|-------------|
| Delta tespit | `GET /delta` → MCP `/delta-details` |
| PR listesi | `GET /customer-prs` → MCP `/customer-branch-prs` |
| Cherry-pick başlat | `POST /start` → MCP `/async-cherry-pick` |
| Durum izle | `GET /:syncId/status` → MCP `/job/:jobId/status` |

### 8.3 n8n Workflow

```
Frontend → Backend (/api/workflows/trigger) → n8n webhook URL
```

| Workflow | Tetikleyici | Sonuç |
|----------|-------------|-------|
| TFS Merge + AI Conflict Resolution | `POST /webhook/tfs-merge-start` | GPT-4 ile conflict çözümü + Slack onayı |
| Release Notes Auto-Generate | `POST /webhook/release-notes-generate` | PR'lardan otomatik release note üretimi |

---

## 9. Mevcut Ekran Akış Diyagramları

### 9.1 Release Lifecycle

```
Versiyon Oluştur (Release Calendar / Releases)
       │
       ▼
   [PLANNED] ──→ [DEVELOPMENT] ──→ [RC] ──→ [STAGING] ──→ [PRODUCTION]
       │                                                        │
       │                                                   [HOTFIX]
       │                                                        │
       └──── Release Health Check (her aşamada) ────────────────┘
                    │
                    ├── PR durumu (TFS)
                    ├── Work item'lar (TFS)
                    ├── Release Notes (tamamlanmış mı?)
                    ├── Release Todos (checklist)
                    ├── System Changes (breaking?)
                    └── Service Snapshot (BoM)  ← ⚠️ frontend entegrasyonu eksik
```

### 9.2 Code Sync Lifecycle

```
Müşteri Branch Seç → Kaynak/Hedef Versiyon Seç → Delta Tespit
       │
       ▼
   PR/WorkItem Listesi (seçilebilir)
       │
       ▼
   Conflict Check → Conflict varsa: çözüm seçenekleri
       │
       ▼
   Cherry-Pick Başlat → Polling ile durum izle
       │
       ▼
   Tamamlandı / Hata → Sync History'ye kaydet
```

### 9.3 Hotfix Lifecycle

```
Talep Oluştur (HotfixMerkeziPage)
       │
       ▼
   [PENDING] ──→ Approve ──→ [APPROVED] ──→ (branch oluştur, fix uygula)
       │
       └──→ Reject ──→ [REJECTED]
```

---

## 10. Değerlendirme ve Sonraki Adımlar

### 10.1 Projenin Güçlü Yanları

1. **Firebase→JWT migration tam:** 0 Firebase import, 0 Firestore referansı
2. **21 ekranın tamamı çalışıyor:** Stub yok, hepsi gerçek API çağrısı yapıyor
3. **109 backend endpoint:** Kapsamlı REST API, Zod validation, role-based auth
4. **22 tablo, Prisma senkron:** Schema drift yok
5. **Tasarım dokümanları zengin:** 22 ekran tasarımı + 6 feature spec
6. **Pipeline organizasyonu kurulu:** RM→UX→Backend→Frontend→QA iş akışı tanımlı

### 10.2 Kritik Eksikler (Öncelik Sırasıyla)

| Sıra | Eksiklik | Neden P0/P1 |
|------|----------|-------------|
| 1 | BUG-014 (VSRM 403) | Release Health Check'in en kritik özelliği çalışmıyor |
| 2 | Test altyapısı (0 test) | Herhangi bir refactoring veya yeni özellik riski artırıyor |
| 3 | Ana Dashboard zenginleştirilmesi | Giriş sonrası ilk ekran — kullanıcı değer algısı |
| 4 | Müşteri Dashboard derinleştirme | Müşteri bazlı operasyonel görünüm eksik |
| 5 | Service Release Snapshot → Health Check BoM | Backend hazır, frontend entegrasyon bekliyor |
| 6 | Code Sync açık bugları (4 adet) | En yeni ve en karmaşık özellik — güven sorunu |

### 10.3 Önerilen Sprint Planı

**Sprint 1 — Stabilizasyon (1 hafta)**
- [ ] BUG-014 (Kritik): VSRM 403 çözümü veya alternatif veri kaynağı
- [ ] BUG-015 (P1): Sync branch adı dialog'a eklenmesi
- [ ] BUG-011 (P2): ARCHIVED phase geçişi
- [ ] BUG-016, BUG-017, BUG-018 (P2): Code Sync UX iyileştirmeleri
- [ ] RESOLVED bugları `tasks/bugs/resolved/` taşı

**Sprint 2 — Derinleştirme (1 hafta)**
- [ ] Ana Dashboard zenginleştirme (pending actions, role-based widgets)
- [ ] Müşteri Dashboard derinleştirme (servis durumu, branch listesi, timeline)
- [ ] Service Release Snapshot → Health Check BoM entegrasyonu
- [ ] Shared component çıkarma (DataTable, StatusChip, DrawerForm, EmptyState)

**Sprint 3 — Kalite (1 hafta)**
- [ ] Backend integration testleri (supertest — en az kritik 10 endpoint)
- [ ] Frontend component testleri (en az login + dashboard)
- [ ] Error boundary + global error handling
- [ ] Loading skeleton pattern'i

**Sprint 4 — Deployment (1 hafta)**
- [ ] Docker Compose production yapısı (nginx, backend, frontend build)
- [ ] CI/CD pipeline (GitHub Actions veya Azure Pipelines)
- [ ] Rate limiting + CORS sıkılaştırma
- [ ] Audit log altyapısı

---

## 11. Sayısal Özet

| Metrik | Değer |
|--------|-------|
| Frontend sayfalar | 21 (tamamı IMPLEMENTED) |
| Frontend toplam satır | 7.464 |
| Backend route dosyaları | 23 |
| Backend endpoint sayısı | 109 |
| Backend toplam satır | 3.075 |
| DB tabloları | 22 |
| Prisma modelleri | 22 |
| Tasarım dokümanları | 22 ekran + 6 spec |
| Toplam bug | 18 (12 RESOLVED, 6 OPEN) |
| Firebase import | 0 ✅ |
| Test dosyası | 0 ❌ |
| Shared component | 2 (Layout, Sidebar) |

---

*Bu doküman `release-manager` rolü tarafından otomatik oluşturulmuştur. Güncellemeler için `docs/PROJECT_SNAPSHOT.md` dosyasını düzenleyin.*
