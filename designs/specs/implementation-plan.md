# ReleaseHub360 — Uygulama Planı (Implementation Roadmap)

**Tarih:** 1 Mart 2026  
**Hazırlayan:** Release Manager  
**Kaynak:** `docs/DESIGN_DOCUMENT.md` (5793 satır, 11 bölüm, 120 gap item)  
**Durum:** ONAY BEKLİYOR

---

## Mevcut Durum Özeti

### ✅ Altyapı — Hazır
| Katman | Durum | Detay |
|--------|-------|-------|
| Monorepo | ✅ | `packages/frontend`, `packages/backend`, `packages/mcp-server` |
| PostgreSQL | ✅ | Docker Compose, 21 Prisma model, seed çalışıyor |
| JWT Auth | ✅ | Login + refresh + role middleware |
| Backend Routes | ✅ | 23 route dosyası, 128 endpoint |
| Frontend Routes | ✅ | 21 sayfa, tümü router'da tanımlı |
| MCP Server | ✅ | FastAPI, code-sync + TFS proxy |
| n8n | ✅ | Workflow proxy (backend üzerinden) |

### ⚠️ Mevcut Kodun Eksikleri (Tasarıma Göre)
| Eksik | Etki |
|-------|------|
| Prisma schema tasarım dokümanının ~%40'ını karşılıyor | Büyük model genişletme + yeni modeller gerekli |
| Frontend API çağrıları inline (sayfa içinde) | TanStack Query + service layer yok |
| Shared component library yok | Her sayfada tekrar eden UI pattern'ler |
| HomeDashboardPage stub (33 satır) | Section 11'deki DORA dashboard implement edilmemiş |
| Rol bazlı erişim frontend'de yüzeysel | Section 10 RBAC entegrasyonu eksik |

---

## Faz Stratejisi

Tasarım dokümanındaki 11 bölümü **olduğu gibi sırasıyla** implement etmek verimsiz olur. Bunun yerine: bağımlılıkları analiz edip **altyapı → temel entity → türetilmiş ekran** sırasıyla ilerleriz.

```
Faz 0 — UX Foundation + Shared Infra      (1 hafta)
  ↓
Faz 1 — Core Entities: Product + Service  (1-2 hafta)
  ↓
Faz 2 — Customer + Mapping               (1-2 hafta)
  ↓
Faz 3 — Release Calendar + ProductVersion (1-2 hafta)
  ↓
Faz 4 — Release Health Check             (2-3 hafta)  ← en büyük faz
  ↓
Faz 5 — Customer Dashboard + Service Matrix (1-2 hafta)
  ↓
Faz 6 — Transition Issues (Hata Bildir)  (1 hafta)
  ↓
Faz 7 — RBAC + Auth Genişletme           (1-2 hafta)
  ↓
Faz 8 — Kurum Dashboard + DORA           (2-3 hafta)
  ↓
Faz 9 — Code Sync (Section 12 — gelecek) (2-3 hafta)
```

**Toplam tahmini:** ~14-21 hafta (tek developer), paralel çalışmada ~8-12 hafta.

---

## Faz 0 — UX Foundation + Shared Infrastructure

**Süre:** 1 hafta  
**Hedef:** Tüm fazların üzerine inşa edeceği ortak altyapıyı kur.

### UX Designer Görevleri

| # | Görev | Çıktı | Süre |
|---|-------|-------|------|
| 0.1 | **Shared Component Kütüphanesi tanımla** | `designs/specs/shared-components.md` — DataTable, FilterBar, StatCard, DrawerForm, EmptyState, ErrorBoundary, ConfirmDialog pattern'leri | 1-2 gün |
| 0.2 | **Navigation / Sidebar tasarımını finalize et** | `designs/screens/` sidebar güncelle — Section 10 RBAC rol-erişim matrisine göre | 0.5 gün |

> **UX NE ZAMAN GİRER?** Hemen, Faz 0'da. Ama her ekranı tek tek tasarlamak yerine **ortak bileşen kütüphanesi** tanımlar. Bireysel ekranlar zaten `designs/screens/` altında ve tasarım dokümanında detaylı wireframe'ler var — bunlar yeterli.

### Backend Developer Görevleri

| # | Görev | Gap Items | Süre |
|---|-------|-----------|------|
| 0.3 | **TanStack Query altyapısı** — Frontend'de `QueryClientProvider` + `queryClient` konfigürasyonu | — | 0.5 gün |
| 0.4 | **API Service Layer** — `packages/frontend/src/services/` dizini: her entity için `useXxxQuery`, `useXxxMutation` hook'ları pattern'i | — | 1 gün |
| 0.5 | **Shared UI Components** — UX çıktısına göre DataTable, FilterBar, StatCard, DrawerForm, EmptyState implement et | — | 2 gün |
| 0.6 | **Error handling standardı** — Backend'de tutarlı error response formatı + Frontend'de toast/snackbar | — | 0.5 gün |

### Çıktı
- Frontend: `services/*.ts`, `components/shared/*`, `QueryClientProvider` entegre
- `designs/specs/shared-components.md` oluşturulmuş

---

## Faz 1 — Product + Service Entity (Design Doc Section 1-2)

**Süre:** 1-2 hafta  
**Bağımlılık:** Faz 0

### UX Designer
Mevcut `designs/screens/product-catalog.md` wireframe'i yeterli. **UX ek çalışma gerektirmez** — doğrudan implementasyona geçilebilir.

### Backend Developer

| # | Görev | Gap Items | Süre |
|---|-------|-----------|------|
| 1.1 | **Product schema genişlet** — `sourceControlType`, `githubOwner`, `githubToken`, `supportedArtifactTypes[]`, `usesReleaseBranches`, `branchStrategy`, PAT şifreleme | G1-G9 | 2 gün |
| 1.2 | **Service schema genişlet** — `stage`, `pipelineName`, `releaseName`, product ilişkisi | G10-G13 | 1 gün |
| 1.3 | **Product API genişlet** — PAT maskeleme, artifact type CRUD, validation kuralları | G1-G9 | 1 gün |

### Frontend Developer

| # | Görev | Gap Items | Süre |
|---|-------|-----------|------|
| 1.4 | **ProductCatalogPage refactor** — mevcut 737 satırlık sayfayı TanStack Query + yeni schema ile güncelle | G1-G9 | 2 gün |
| 1.5 | **Service yönetimi tab'ı** — ürün detayında servis CRUD | G10-G13 | 1 gün |
| 1.6 | **API/Module/ModuleGroup tab'ları** — mevcut yapıyı product tab sistemi altına taşı | G14-G18 | 1 gün |

### QA Engineer
Faz 1 bittiğinde: Product + Service ekranlarını audit et → `tasks/bugs/BUG-XXX.md`

---

## Faz 2 — Customer + Mapping (Design Doc Section 3-4)

**Süre:** 1-2 hafta  
**Bağımlılık:** Faz 1 (Product tablosu hazır olmalı)

### UX Designer
Mevcut `designs/screens/customer-management.md` wireframe'i yeterli. **Ek UX çalışması gerekmez.**

### Backend Developer

| # | Görev | Gap Items | Süre |
|---|-------|-----------|------|
| 2.1 | **Customer schema genişlet** — `emailDomains[]`, `ticketPlatform`, `ticketBaseUrl`, `n8nWebhookUrl`, yeni alanlar | G19-G25 | 1 gün |
| 2.2 | **CPM schema genişlet** — `subscriptionLevel`, `deploymentModel`, `hostingType`, `artifactType`, `helmValuesOverrides`, `environments[]`, `currentVersionId` | G26-G40 | 2 gün |
| 2.3 | **CPM API** — validasyon kuralları (artifact uyumluluk, subscription seviye kontrolü) | G26-G40 | 1 gün |

### Frontend Developer

| # | Görev | Gap Items | Süre |
|---|-------|-----------|------|
| 2.4 | **CustomerManagementPage refactor** — 604 satır → TanStack Query + yeni alanlar | G19-G25 | 2 gün |
| 2.5 | **CPM tab/drawer** — granüler subscription, deployment model seçimi, HelmChart/Binary flow | G26-G40 | 2 gün |

### QA Engineer
Faz 2 bittiğinde: Customer + CPM ekranlarını audit et.

---

## Faz 3 — Release Calendar + ProductVersion (Design Doc Section 5)

**Süre:** 1-2 hafta  
**Bağımlılık:** Faz 1+2 (Product + Customer + CPM)

### UX Designer
Mevcut `designs/screens/release-calendar.md` + `designs/specs/release-calendar-redesign.md` zaten detaylı. **Ek UX gerekmez.**

### Backend Developer

| # | Görev | Gap Items | Süre |
|---|-------|-----------|------|
| 3.1 | **ProductVersion schema genişlet** — `phase` (5-status machine), `targetDate`/`actualReleaseDate` farkı, `isHotfix`, `deprecatedAt`, `concurrentUpdatePolicy` | G41-G50 | 2 gün |
| 3.2 | **CustomerVersionTransition model** — yeni tablo + API | G41-G50 | 1 gün |
| 3.3 | **Durum makinesi validasyonu** — PLANNED→IN_DEV→TESTING→RELEASED→DEPRECATED, geri geçiş engelleme | G41-G50 | 1 gün |

### Frontend Developer

| # | Görev | Gap Items | Süre |
|---|-------|-----------|------|
| 3.4 | **ReleaseCalendarPage refactor** — 578 satır → yeni status machine, takvim + liste view | G41-G50 | 2 gün |
| 3.5 | **ReleasesPage refactor** — versiyon listesi, filtreleme, durum geçişi | G41-G50 | 1 gün |

### QA Engineer
Faz 3 bittiğinde: Calendar + Version ekranlarını audit et.

---

## Faz 4 — Release Health Check (Design Doc Section 6)

**Süre:** 2-3 hafta ⚠️ En büyük faz  
**Bağımlılık:** Faz 1+2+3 (Product + Service + Version + Customer hepsi hazır)

### UX Designer
`designs/screens/release-health-check.md` + `designs/specs/release-health-check-v3.md` çok detaylı. **UX hazır.** Ancak:
- **ux-required: true** — Segment UX davranışı (collapsed/expanded, indicator renkleri) üzerinde UX refinement yapılabilir
- UX, 1 günlük "micro-interaction + segment geçişi" refinement'ı yapabilir

### Backend Developer

| # | Görev | Gap Items | Süre |
|---|-------|-----------|------|
| 4.1 | **VersionPackage model** — yeni tablo (HelmChart metadata, download tracking) | G51-G60 | 1 gün |
| 4.2 | **Health Score hesaplama servisi** — segment ağırlıkları, puan algoritması | G51-G60 | 2 gün |
| 4.3 | **BoM (Bill of Materials) API** — ServiceReleaseSnapshot zenginleştirme | G51-G60 | 1 gün |
| 4.4 | **PR + Work Item proxy** — Azure DevOps API'den PR detay + WI detay çekimi | G51-G60 | 2 gün |
| 4.5 | **Release Notes cascade** — otomatik oluşturma (MCP AI), müşteri cascade | G51-G60 | 2 gün |
| 4.6 | **"Release'i Yayınla" wizard endpoint'leri** — pre-check, publish, post-actions | G51-G60 | 1 gün |

### Frontend Developer

| # | Görev | Gap Items | Süre |
|---|-------|-----------|------|
| 4.7 | **ReleaseHealthCheckPage BÜYÜK refactor** — 1306 satırlık mevcut kodu tasarım dokümanındaki segment pattern'e göre yeniden yaz | G51-G60 | 4-5 gün |
| 4.8 | → Segment 1: Genel Bilgi | | |
| 4.9 | → Segment 2: BoM (Bill of Materials) | | |
| 4.10 | → Segment 3: PR'lar | | |
| 4.11 | → Segment 4: Work Items | | |
| 4.12 | → Segment 5: Release Notes | | |
| 4.13 | → Segment 6: System Changes | | |
| 4.14 | → Segment 7: Release Todos | | |
| 4.15 | → Segment 8: Release'i Yayınla wizard | | |

### QA Engineer
Bu faz kritik — **Faz 4 bittiğinde tam audit.** Health Check en karmaşık ekran, edge case'ler çok.

---

## Faz 5 — Customer Dashboard + Service Version Matrix (Design Doc Section 7-8)

**Süre:** 1-2 hafta  
**Bağımlılık:** Faz 2+3+4 (Customer + Version + Health Check verileri)

### UX Designer
Mevcut wireframe'ler yeterli. **Ek UX gerekmez.**

### Backend Developer

| # | Görev | Gap Items | Süre |
|---|-------|-----------|------|
| 5.1 | **Customer Dashboard aggregate API** — ürün kartları, versiyon durumu, todo ilerlemesi | G61-G70 | 2 gün |
| 5.2 | **CustomerServiceVersion + History modelleri** — yeni tablolar | G71-G80 | 1 gün |
| 5.3 | **Auto-population cascade** — versiyon release'inde otomatik CustomerServiceVersion populate | G71-G80 | 1 gün |

### Frontend Developer

| # | Görev | Gap Items | Süre |
|---|-------|-----------|------|
| 5.4 | **CustomerDashboardPage refactor** — 302 satır → ürün kartları, versiyon detay, todo checklist, artifact action'lar | G61-G70 | 3 gün |
| 5.5 | **ServiceVersionMatrixPage refactor** — 155 satır → 3 view mode (Matrix/Servis/Müşteri) | G71-G80 | 2 gün |

### QA Engineer
Faz 5 bittiğinde: Customer Dashboard + Matrix audit.

---

## Faz 6 — Transition Issues / Hata Bildir (Design Doc Section 9)

**Süre:** 1 hafta  
**Bağımlılık:** Faz 2+3 (Customer + Version)

### UX Designer
Tasarım dokümanında detaylı wireframe var. **Ek UX gerekmez.**

### Backend Developer

| # | Görev | Gap Items | Süre |
|---|-------|-----------|------|
| 6.1 | **TransitionIssue + Attachment + Comment modelleri** — yeni tablolar | G81-G85 | 1 gün |
| 6.2 | **5-status state machine** — OPEN→ACKNOWLEDGED→IN_PROGRESS→RESOLVED→CLOSED | G81-G85 | 0.5 gün |
| 6.3 | **Issue API** — CRUD + status transitions + dosya upload | G81-G85 | 1 gün |

### Frontend Developer

| # | Görev | Gap Items | Süre |
|---|-------|-----------|------|
| 6.4 | **ReportIssuePage genişlet** — 188 satır → dual mode (Manuel + Otomatik), kanban view | G81-G85 | 2 gün |

### QA Engineer
Faz 6 bittiğinde audit.

---

## Faz 7 — RBAC + Auth Genişletme (Design Doc Section 10)

**Süre:** 1-2 hafta  
**Bağımlılık:** Faz 0-6 hepsi (tüm ekranlar var, üzerine yetkilendirme eklenir)

### UX Designer
Section 10'da detaylı wireframe var. **Ek UX gerekmez.**

### Backend Developer

| # | Görev | Gap Items | Süre |
|---|-------|-----------|------|
| 7.1 | **User model genişlet** — `UserRole` enum, `UserProductAccess` M:N tablo | G86-G92 | 1 gün |
| 7.2 | **CustomerUser model** — yeni tablo, `CustomerRole` enum | G86-G92 | 1 gün |
| 7.3 | **Auth middleware genişlet** — iki havuzlu login, JWT payload type ayrımı (ORG/CUSTOMER) | G86-G92 | 1 gün |
| 7.4 | **Permission middleware** — rol bazlı endpoint koruması, product-level access filtresi | G93-G100 | 2 gün |
| 7.5 | **User/CustomerUser management API** — 19 endpoint | G93-G100 | 1 gün |

### Frontend Developer

| # | Görev | Gap Items | Süre |
|---|-------|-----------|------|
| 7.6 | **Auth store genişlet** — ORG/CUSTOMER ayrımı, role-based route guard | G86-G92 | 1 gün |
| 7.7 | **Sidebar dinamik filtreleme** — rol-ekran erişim matrisine göre menü gizleme | G93-G100 | 0.5 gün |
| 7.8 | **UsersRolesPage refactor** — 267 satır → kurum + müşteri kullanıcı yönetimi | G93-G100 | 2 gün |
| 7.9 | **LoginPage refactor** — unified login (tek form, iki havuz) | G86-G92 | 0.5 gün |

### QA Engineer
RBAC testi kritik — **her rol × her ekran kombinasyonu test edilmeli.** Matris bazlı test planı yazılmalı.

---

## Faz 8 — Kurum Dashboard + DORA Metrikleri (Design Doc Section 11)

**Süre:** 2-3 hafta  
**Bağımlılık:** Faz 1-7 hepsi (tüm veriler mevcut olmalı ki metrikler hesaplanabilsin)

### UX Designer
Section 11'de çok detaylı wireframe'ler var. Ancak:
- **ux-required: true** — Dashboard kartları, DORA trend grafiği, farkındalık skor görselleri için **1-2 günlük chart/visualization UX çalışması** önerilir
- Recharts mı, MUI Charts mı, custom SVG mi? Karar verilmeli

### Backend Developer

| # | Görev | Gap Items | Süre |
|---|-------|-----------|------|
| 8.1 | **MetricSnapshot model** — yeni tablo | G101 | 0.5 gün |
| 8.2 | **DORA calculator scheduled job** — DF, LT, CFR, MTTR hesaplama | G102-G103 | 3 gün |
| 8.3 | **Codebase divergence checker** — Git API behind/ahead | G104 | 1 gün |
| 8.4 | **Pipeline stats collector** — MCP Server build endpoint | G105, G120 | 1 gün |
| 8.5 | **Config diff analyzer** — helmValuesOverrides JSON key analizi | G106 | 0.5 gün |
| 8.6 | **Dashboard API'leri** — 13 endpoint (summary, DORA, awareness, highlights) | G107-G113 | 2 gün |

### Frontend Developer

| # | Görev | Gap Items | Süre |
|---|-------|-----------|------|
| 8.7 | **HomeDashboardPage TAM yeniden yaz** — 33 satır stub → 4 bölümlü dashboard | G107-G116 | 4-5 gün |
| 8.8 | → Bölüm A: Operasyonel Özet (5 metrik kartı + aktif release tablosu) | | |
| 8.9 | → Bölüm B: DORA Metrikleri (4 kart + trend chart) | | |
| 8.10 | → Bölüm C: Release Ops Metrikleri (4 kart + todo trend) | | |
| 8.11 | → Bölüm D: Farkındalık Skorları (3 skor + genel sağlık) | | |
| 8.12 | **Dönem + ürün filtre bileşenleri** | G115-G116 | 1 gün |

### QA Engineer
Faz 8 bittiğinde: Dashboard metriklerin doğruluğunu DB verileriyle çapraz kontrol et.

---

## Faz 9 — Code Sync (Design Doc Section 12 — Gelecek)

**Süre:** 2-3 hafta  
**Bağımlılık:** Faz 1+2 (Product + Customer branch'leri)  
**Not:** Design dokümanında henüz yazılmadı (Section 12 olarak planlandı)

Bu faz planlaması Section 12 tasarımı tamamlandıktan sonra detaylandırılacak.

---

## Rol Görev Dağılım Özeti

### UX Designer — Toplam ~4-5 gün

| Faz | Görev | Süre |
|-----|-------|------|
| 0 | Shared Component Kütüphanesi + Navigation finalize | 1.5 gün |
| 4 | Health Check segment micro-interactions (opsiyonel) | 1 gün |
| 8 | Dashboard chart/visualization UX | 1.5 gün |

> **Sonuç:** UX Designer'ın büyük çoğunluk ekran tasarımı zaten `DESIGN_DOCUMENT.md`'de tamamlandı. UX'in asıl katkısı **ortak bileşen standardı** ve **chart kararları** olacak. Her faza ayrı UX çıktısı beklemeye gerek yok — bu önemli hız kazancı.

### Backend Developer — Toplam ~35-45 gün

| Faz | Tahmini | Ağırlık |
|-----|---------|---------|
| 0 — Infra | 2 gün | Setup |
| 1 — Product | 4 gün | Schema + API |
| 2 — Customer | 4 gün | Schema + API + validation |
| 3 — Calendar | 4 gün | Status machine + transition |
| 4 — Health Check | 9 gün | ⚠️ Büyük — score, BoM, proxy, wizard |
| 5 — Dashboard + Matrix | 4 gün | Aggregate + cascade |
| 6 — Issues | 2.5 gün | CRUD + state machine |
| 7 — RBAC | 6 gün | ⚠️ Büyük — auth, permission, 2 havuz |
| 8 — DORA | 8 gün | ⚠️ Büyük — jobs, 13 API, external API |

### Frontend Developer — Toplam ~35-40 gün

| Faz | Tahmini | Ağırlık |
|-----|---------|---------|
| 0 — Infra | 3 gün | TanStack + shared components |
| 1 — Product | 4 gün | Refactor + tabs |
| 2 — Customer | 4 gün | Refactor + CPM |
| 3 — Calendar | 3 gün | Status machine UI |
| 4 — Health Check | 5 gün | ⚠️ Büyük — 8 segment refactor |
| 5 — Dashboard + Matrix | 5 gün | Customer dash + 3-view matrix |
| 6 — Issues | 2 gün | Dual mode + kanban |
| 7 — RBAC | 4 gün | Auth store + role guard + user mgmt |
| 8 — DORA | 6 gün | ⚠️ Büyük — 4 section + charts |

### QA Engineer — Her faz sonunda

| Faz | Audit Kapsamı | Tahmini |
|-----|---------------|---------|
| 1 | Product + Service CRUD | 0.5 gün |
| 2 | Customer + CPM | 0.5 gün |
| 3 | Calendar + Version transitions | 0.5 gün |
| 4 | **Health Check** — full segment audit | 1-2 gün |
| 5 | Customer Dashboard + Matrix | 0.5 gün |
| 6 | Transition Issues | 0.5 gün |
| 7 | **RBAC** — matris test planı | 1-2 gün |
| 8 | Dashboard metrik doğruluğu | 1 gün |

---

## Task Ayrıştırma Stratejisi

### Kural: Backend Önce, Frontend Sonra, QA En Son

```
Backend → Frontend → QA → Bug Fix → Sonraki Faz
   ↑          ↑         ↑
   │          │         └── Her faz sonunda, sonraki faz beklemeden
   │          └── Backend endpoint hazır olunca başlar
   └── Schema + API + validation + business rules
```

### Paralel Çalışma Fırsatları

Bazı fazlar birbirinden bağımsızdır ve paralel yürütülebilir:

```
Faz 0 ──────────────────────┐
                              ↓
Faz 1 (Product) ──────────→ Faz 3 (Calendar) ──→ Faz 4 (Health Check)
          ↓                                              ↓
Faz 2 (Customer) ──────────────────────────→ Faz 5 (Dashboard+Matrix)
                                                         ↓
Faz 6 (Issues) ─── paralel ───→ Faz 7 (RBAC)
                                       ↓
                                 Faz 8 (DORA)
```

**Paralel çalışabilir çiftler:**
- Faz 1 BE + Faz 0 FE (shared components)
- Faz 2 BE + Faz 1 FE
- Faz 6 + Faz 5 (bağımsız)
- Faz 3 BE + Faz 2 FE

### Task Boyutlandırma

Her faz için task'lar `tasks/open/TASK-XXX.md` olarak yazılacak:

| Faz | Task Sayısı (tahmini) |
|-----|----------------------|
| 0 | 3-4 task |
| 1 | 4-5 task (BE: 3, FE: 2) |
| 2 | 3-4 task (BE: 2, FE: 2) |
| 3 | 3-4 task (BE: 2, FE: 2) |
| 4 | 8-10 task (BE: 5, FE: 5) |
| 5 | 4-5 task (BE: 3, FE: 2) |
| 6 | 3 task (BE: 2, FE: 1) |
| 7 | 5-6 task (BE: 3, FE: 3) |
| 8 | 6-8 task (BE: 4, FE: 4) |
| **Toplam** | **~40-50 task** |

---

## QA Stratejisi

### QA Ne Zaman Devreye Girer?

```
                    ❌ YANLIŞ                           ✅ DOĞRU
┌──────────────────────────────┐    ┌──────────────────────────────┐
│ Faz 1 BE                    │    │ Faz 1 BE                    │
│ Faz 1 FE                    │    │ Faz 1 FE                    │
│ Faz 2 BE                    │    │ ★ QA Faz 1 audit            │
│ Faz 2 FE                    │    │ Faz 2 BE (+Faz 1 bug fix)   │
│ Faz 3 BE                    │    │ Faz 2 FE                    │
│ Faz 3 FE                    │    │ ★ QA Faz 2 audit            │
│ ...                          │    │ Faz 3 BE (+Faz 2 bug fix)   │
│ ★ QA SONUNDA HEPSİNİ TEST  │    │ ...                          │
└──────────────────────────────┘    └──────────────────────────────┘
```

**Kural:** QA her fazdan sonra audit yapar. Bug'lar bir sonraki fazın başında düzeltilir. Biriktirilmez.

### QA Audit Formatı

Her audit sonrası:
1. `tasks/bugs/BUG-XXX.md` yazılır (mevcut format)
2. Kritik bug'lar hemen fix edilir (L006 dersi — bul+yaz+düzelt)
3. Minor bug'lar sonraki faza taşınabilir

---

## Zincirli Komut Şablonları (Faz Bazlı)

Her fazı tetiklemek için kullanılabilecek zincir komutları:

**Faz 0 başlat:**
```
"ux-designer → frontend-developer: shared component kütüphanesi + TanStack Query altyapısı"
```

**Faz 1 başlat:**
```
"release-manager → backend-developer → frontend-developer → qa-engineer: Product + Service entity implementation"
```

**Faz 4 başlat (en büyük):**
```
"release-manager → ux-designer → backend-developer → [RM GATE] → frontend-developer → [RM GATE] → qa-engineer: Release Health Check v3 implementation"
```

**Herhangi bir faz için bug fix:**
```
"qa-engineer → frontend-developer → backend-developer: Faz N audit ve fix"
```

---

## Risk ve Dikkat Noktaları

| Risk | Etki | Azaltma |
|------|------|---------|
| Health Check refactoru çok büyük (1306 satır) | Timeline kayması | Segment segment implement et, her segment ayrı PR |
| DORA metrikleri external API'ye bağımlı | Veri yoksa dashboard boş | Graceful degradation + mock data + boş state'ler |
| RBAC her ekranı etkiler | Geç eklenmesi maliyetli | Faz 7'de eklense de, Faz 0'dan itibaren `role` field'ı tasarımda var |
| TanStack Query migration | Her sayfayı değiştirir | Faz 0'da pattern kur, her fazda o sayfanın API'sini migrate et |
| Prisma schema büyümesi | Migration conflict riski | Her faz kendi migration'ını oluşturur, tek bir büyük migration yasak |

---

## Önerilen Başlangıç Komutu

Onay verirsen şu zincirle başlayabiliriz:

```
"release-manager → ux-designer → frontend-developer: Faz 0 — Shared Components + TanStack Query infra"
```

Bu faz tamamlandığında Faz 1'e geçeriz.

---

## Onay

- [ ] Faz sıralaması uygun mu?
- [ ] Paralel çalışma stratejisi kabul mü?
- [ ] QA her faz sonunda mı, yoksa 2-3 fazda bir mi?
- [ ] Hangi fazdan başlayalım?
