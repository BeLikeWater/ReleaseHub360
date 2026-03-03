# GAP ANALİZİ — Tasarım Dokümanları vs Mevcut İmplementasyon

**Tarih:** 2026-03-02  
**Hazırlayan:** Release Manager (Copilot Agent)  
**Kaynak:** `docs/DESIGN_DOCUMENT.md` (5.792 satır), `designs/screens/*.md` (22 ekran), `designs/specs/*.md` (6 spec)  
**Karşılaştırma:** `packages/frontend/src/pages/` (21 sayfa, ~8.800+ satır)

---

## Yönetici Özeti

21 frontend sayfası taranmış, 22 ekran tasarımı ve 5.792 satırlık master DESIGN_DOCUMENT ile karşılaştırılmıştır. Sonuç:

| Kategori | Sayı | Etiket |
|---|---|---|
| Tam uyumlu veya küçük kozmetik fark | 10 ekran | ✅ |
| Orta düzey eksik (özellik/view/export) | 6 ekran | ⚠️ |
| Kritik eksik (alt sistem/akış tamamen yok) | 5 ekran | 🔴 |

**En büyük 3 boşluk:**
1. **Customer Dashboard** — artifact dağıtımı (download/onay/talep butonları) tamamen yok
2. **Home Dashboard** — DORA metrikleri ve Awareness Score'lar yok
3. **Service Version Matrix** — 3-view toggle, export, stale hesaplama yok

---

## Ekran Bazlı Detaylı Analiz

### 🔴 1. Customer Dashboard — KRİTİK

**Mevcut:** 465 satır, 4 tab (Özet, Release Takibi, Servis Eşleştirme, Geçmiş). Tek API: `GET /dashboard/customer/:id`. Salt okunur görüntüleme.

**Tasarımda olup eksik olan:**

| # | Eksik Özellik | DESIGN_DOCUMENT Referans | Seviye |
|---|---|---|---|
| 1 | **Download butonları** — `deploymentModel`'e göre: HelmChart İndir (Docker), Güncelleme Paketi İndir (Binary), Kaynak Referansı Göster (GIT_SYNC) | §7.5 | P0 |
| 2 | **"Versiyonu Onayla"** butonu — OnPrem-IaaS müşterileri için ortam bazlı onay akışı | §7.5 | P0 |
| 3 | **"Güncelleme Talep Et"** butonu — SaaS müşterileri için güncelleme talebinin org'a iletilmesi | §7.5 | P0 |
| 4 | **deploymentModel-based conditional rendering** — `artifactType` ve `deploymentModel`'e göre farklı buton/aksiyon seti | §7.5 | P0 |
| 5 | **Version Transition Planning** — ortam bazlı planlanan/gerçekleşen tarih takibi (`CustomerVersionTransition`) | §7.3–7.4 | P1 |
| 6 | **Todo Execution (müşteri tarafı)** — müşteri checkbox ile todo tamamlama, progress bar, faz gruplandırması | §7.4 | P1 |
| 7 | **GIT_SYNC dashboard view** — kaynak referans, son sync zamanı, conflict durumu | §7.5 | P1 |
| 8 | **Servis tab zenginleştirme** — SSL bilgisi, IP whitelist, human-readable servis adları, filtre | §7.3 | P2 |
| 9 | **"Müşteriyi Düzenle"** butonu | §7.1 | P2 |
| 10 | **Deployment history endpoint** — gerçek deploy geçmişi (şu an mock/statik) | §7.3 | P2 |

**Not:** `deploymentModel` ve `artifactType` type tanımları `types/index.ts`'de **mevcut** (`CpmDeploymentModel`, `ArtifactType`). `VersionPackage` tipi de tanımlı. Yani backend altyapısı kısmen hazır; sadece frontend aksiyon katmanı eksik.

---

### 🔴 2. Home Dashboard — KRİTİK

**Mevcut:** 407 satır. 3 stat card, 4 widget (Aktif Release'ler, Yaklaşan Release'ler, Bekleyen Aksiyonlar, Hızlı Erişim), layout toggle sistemi, 30s polling.

**Tasarımda olup eksik olan:**

| # | Eksik Özellik | DESIGN_DOCUMENT Referans | Seviye |
|---|---|---|---|
| 1 | **DORA Metrics** — 4 DORA kartı (Deployment Frequency, Lead Time, MTTR, Change Failure Rate) | §11.1 | P1 |
| 2 | **Awareness Scores** — Codebase Divergence, Config Drift, Deployment Diversity | §11.2 | P1 |
| 3 | **Trend grafikleri** — DORA ve Ops metriklerinin zaman serisi | §11.3 | P2 |
| 4 | **MetricSnapshot tablosu** — scheduled job ile periyodik snapshot | §11.4 | P2 |
| 5 | **Release Ops metrikleri** — ortalama release süresi, rollback oranı | §11.3 | P2 |

**Not:** Mevcut dashboard fonksiyonel ve kullanışlı. DORA/Awareness tamamen yeni bir veri katmanı gerektiriyor (backend scheduled jobs + yeni tablolar). Bunlar V2 olarak planlanabilir.

---

### 🔴 3. Service Version Matrix — KRİTİK

**Mevcut:** 271 satır. Tek view: müşteri×ürün matrix tablosu. Renk kodlu hücre (current/minor/major). Filtre + "sadece güncel olmayanlar" checkbox.

**Tasarımda olup eksik olan:**

| # | Eksik Özellik | DESIGN_DOCUMENT Referans | Seviye |
|---|---|---|---|
| 1 | **3 View Mode** — Matrix / Service-focused / Customer-focused toggle | §8.1 | P1 |
| 2 | **Excel/PDF/CSV Export** | §8.3 | P1 |
| 3 | **Cell detail popup** — hangi servislerin güncel olmadığını gösteren drill-down | §8.2 | P1 |
| 4 | **Stale gün hesaplama** — versiyon ne kadar süredir güncel değil | §8.2 | P2 |
| 5 | **Bulk reminder** — "Güncelle" hatırlatması gönder (toplu) | §8.4 | P2 |
| 6 | **Dashboard widget** — Home Dashboard'da özet matrix widget'ı | §8.5 | P3 |

---

### 🔴 4. Users & Roles — ÖNEMLİ

**Mevcut:** 470 satır. 3 tab (Kurum Kullanıcıları, Müşteri Kullanıcıları, Roller). Org: 4 rol. Customer: CRUD var ama sadece 3 rol (CONTACT, VIEWER, ADMIN).

**Tasarımda olup eksik olan:**

| # | Eksik Özellik | DESIGN_DOCUMENT Referans | Seviye |
|---|---|---|---|
| 1 | **5 Customer Role** — CUSTOMER_ADMIN, APP_ADMIN, APPROVER, BUSINESS_USER, PARTNER (şu an sadece 3) | §10.2 | P1 |
| 2 | **UserProductAccess** — kullanıcı bazlı ürün erişimi kısıtlama (ADMIN bypass) | §10.7 | P1 |
| 3 | **CustomerUser portal yönetimi** — müşterinin kendi kullanıcılarını yönetmesi | §10.5 | P2 |
| 4 | **Unified login** — tek login sayfası ile org/müşteri ayrımı | §10.6 | P2 |

---

### 🔴 5. Report Issue (Transition Issues) — ÖNEMLİ

**Mevcut:** 551 satır. 5-status state machine ✅, Kanban view ✅, Comment thread ✅, List/Board toggle ✅.

**Tasarımda olup eksik olan:**

| # | Eksik Özellik | DESIGN_DOCUMENT Referans | Seviye |
|---|---|---|---|
| 1 | **File attachment UI** — upload + download (backend `_count.attachments` var, UI yok) | §9.4 | P1 |
| 2 | **Auto-close cron** — RESOLVED 7 gün sonra otomatik CLOSED | §9.8 | P2 |
| 3 | **Escalation notification** — CRITICAL 4h unassigned → RM'ye bildirim | §9.8 | P2 |
| 4 | **Cluster auto-log mode** — otomatik hata log toplama | §9.7 | P3 |
| 5 | **Müşteri tarafı issue listesi** — Customer Dashboard'da `/customer-dashboard/issues` | §9.5 | P1 |

---

### ⚠️ 6. Release Health Check

**Mevcut:** 1.407 satır. 6 section, approve flow, BoM tablosu, PR/todo/change tracking. Oldukça kapsamlı.

**Tasarımda olup eksik olan:**

| # | Eksik Özellik | Seviye |
|---|---|---|
| 1 | **VersionPackage oluşturma** — "Release'i Yayınla" 3-adımlı flow ile VersionPackage (HelmChart/Binary/GitArchive) oluşturma | P1 |
| 2 | **GIT_SYNC conditional step** — branch/tag seçim adımı | P1 |
| 3 | **"Sadece değişen servisler" filtresi** — release'e dahil edilecek servislerin seçimi | P2 |

---

### ⚠️ 7. Release Calendar

**Mevcut:** 652 satır. Liste + takvim görünümleri, faz stepper, drawer, CRUD işlemleri.

**Tasarımda olup eksik olan:**

| # | Eksik Özellik | Seviye |
|---|---|---|
| 1 | **Overdue warning system** — geçmiş tarihli PLANNED/TESTING için uyarı ikonu + banner | P1 |
| 2 | **Version deprecation flow** — aktif müşterisi olmayan versiyonların DEPRECATED'e geçişi | P1 |
| 3 | **Customer-facing calendar** — müşterinin kendi upgrade takvimini görmesi | P2 |
| 4 | **Calendar click-to-create** — takvimde güne tıklayarak yeni versiyon oluşturma | P3 |

---

### ⚠️ 8. Product Catalog

**Mevcut:** 132 satır ana sayfa + 1.337 satır sub-components (9 dosya). Hierarchical tree, ServiceDialog (3 tab), CRUD.

**Tasarımda olup eksik olan:**

| # | Eksik Özellik | Seviye |
|---|---|---|
| 1 | **2-Step Creation Wizard** — ürün oluşturmada zorunlu v1.0.0 initial version | P1 |
| 2 | **supportedArtifactTypes multi-select** — ürün tanımında artifact tipi seçimi | P1 |
| 3 | **ServiceRow prod/prep release tarih gösterimi** | P1 (TASK-003 ile çözülecek) |
| 4 | **Standalone API entity management** | P3 |

---

### ⚠️ 9. Customer Management

**Mevcut:** 605 satır. CRUD, drawer, ürün eşleştirme (CPM). 

**Tasarımda olup eksik olan:**

| # | Eksik Özellik | Seviye |
|---|---|---|
| 1 | **CPM deployment model fields** — `helmChartTemplateName`, `helmValuesOverrides`, FTP credentials, cluster bilgileri | P1 |
| 2 | **Ticket platform sync** — Zendesk/Jira/ServiceNow entegrasyonu (API token, area path mapping) | P2 |
| 3 | **Subscription levels** — FULL_PRODUCT / MODULE_GROUP / MODULE / SERVICE granülasyonu | P2 |

---

### ⚠️ 10. Notifications

**Mevcut:** 219 satır. Liste, okundu/okunmadı, toplu işaretleme.

**Tasarımda olup eksik olan:**

| # | Eksik Özellik | Seviye |
|---|---|---|
| 1 | **`link` field navigation** — bildirime tıklanınca ilgili sayfaya yönlendirme (alan var ama kullanılmıyor) | P1 |
| 2 | **Notification preferences** — kullanıcı bazlı bildirim tercihleri | P2 |
| 3 | **Email notification** — kritik olaylar için email | P2 |

---

### ✅ 11-21. Uyumlu veya Küçük Fark

| Ekran | Satır | Durum | Küçük Notlar |
|---|---|---|---|
| **Release Notes** | 435 | ✅ | Drag-and-drop reorder yok (kozmetik) |
| **Code Sync** | 730 | ✅ | Tam uyumlu — MCP proxy çalışıyor |
| **Change Tracking** | 240 | ✅ | Tam uyumlu |
| **Hotfix Merkezi** | 240 | ✅ | Tam uyumlu |
| **Pipeline Status** | 192 | ✅ | Auto-refresh toggle tanımlı ama `_setAutoRefresh` unused |
| **Urgent Changes** | 356 | ✅ | Tam uyumlu |
| **Releases** | 222 | ✅ | Tam uyumlu — drawer + phase stepper |
| **Settings** | 420 | ✅ | PAT masked display yok (security concern) |
| **Workflow History** | 229 | ✅ | Tam uyumlu |
| **Login** | 77 | ✅ | Unified login (org/müşteri) yok → Users & Roles gap |
| **Release Todos** | 294 | ✅ | Bugün düzenlendi — uyumlu |

---

## Cross-Cutting Gaps (Ekran Bağımsız)

| # | Konu | Tasarım | Mevcut | Seviye |
|---|---|---|---|---|
| 1 | **PAT/Token encryption (AES-256)** | `ENCRYPTION_KEY` env, masked display, encrypt/decrypt on read/write | Plain text gösterim, encrypted storage yok | P1 |
| 2 | **HelmChart/Binary generation API** | Backend generates .tgz/ZIP from `getEffectiveServices()` | Endpoint yok | P0 (Customer Dashboard prereq) |
| 3 | **`filterByUserProducts` middleware** | Her data API'de ürün bazlı erişim filtreleme | Middleware yok | P1 |
| 4 | **Shared type definitions** | `CustomerUser`, `TransitionIssue` etc. in shared types | Her sayfada local tanım | P3 |

---

## Mevcut TASK'lar ile Örtüşme

| Mevcut Task | İlgili Gap |
|---|---|
| TASK-001 (Service Release Project Override) | Product Catalog — küçük overlap |
| TASK-002 (Son Release prepStageName boşken) | Backend fix — bağımsız |
| TASK-003 (Service Prod/Prep Release Bilgisi) | Product Catalog #3 + Health Check BoM tablosu |

---

## Önceliklendirilmiş Aksiyon Planı

### Faz A — Customer-Facing Delivery (P0, tahmini 3-5 gün)

Bu faz müşteri deneyiminin çekirdek boşluğunu kapatır.

1. **Backend: VersionPackage generation API** — HelmChart .tgz, Binary ZIP, GIT_SYNC referans
2. **Backend: Customer approval endpoints** — versiyonu onayla/talep et
3. **Frontend: Customer Dashboard action layer** — `deploymentModel`-based download/approve/request butonları
4. **Frontend: Health Check "Yayınla" 3-step flow** — VersionPackage + ServiceReleaseSnapshot oluşturma

### Faz B — Data Quality & Access (P1, tahmini 2-3 gün)

5. **Service Version Matrix 3-view** — Matrix/Service/Customer toggle + Excel export
6. **UserProductAccess middleware** — backend `filterByUserProducts` + frontend kullanıcı-ürün checkbox UI
7. **Customer roles expansion** — 3 → 5 rol
8. **File attachment UI** — ReportIssue sayfasında upload/download

### Faz C — Operational Intelligence (P1-P2, tahmini 3-4 gün)

9. **Release Calendar overdue warnings** — tarih bazlı uyarı sistemi
10. **Product Catalog creation wizard** — 2-step + zorunlu v1.0.0
11. **Notification link navigation** — link field'ı aktif et
12. **PAT masked display + encrypted storage**

### Faz D — Strategic Metrics (P2, tahmini 3-5 gün)

13. **DORA Metrics backend** — scheduled jobs, MetricSnapshot tablosu
14. **DORA Metrics frontend** — 4 kart + trend grafikleri
15. **Awareness Scores** — Divergence, Drift, Diversity hesaplama + görselleştirme

### Faz E — Advanced Features (P2-P3, tahmini 2-3 gün)

16. **Version deprecation flow**
17. **Customer-facing calendar**
18. **Auto-close cron** — RESOLVED → CLOSED 7 gün
19. **Subscription levels** (granular CPM)
20. **Customer Dashboard todo execution** (müşteri checkbox)

---

## Sayısal Özet

| Metrik | Değer |
|---|---|
| Toplam taranan ekran | 21 |
| Toplam tasarım dokümanı | 22 ekran + 6 spec + 1 master (5.792 satır) |
| P0 gap | 6 (4 Customer Dashboard + 1 Backend API + 1 Health Check flow) |
| P1 gap | 14 |
| P2 gap | 12 |
| P3 gap | 4 |
| **Toplam tespit edilen gap** | **36** |
| Mevcut TASK ile çözülecek | 2 (TASK-001, TASK-003) |
| **Net yeni iş** | **34 gap** |

---

## Sonuç

Ekranların **temel CRUD işlevleri** büyük ölçüde çalışıyor. Asıl boşluk **aksiyon katmanında**: müşterinin indirme/onaylama/talep etme gibi işlemler yapabildiği nokta tamamen eksik. DESIGN_DOCUMENT'taki artifact dağıtım sistemi (`§7.5`) frontend'e hiç yansımamış. Bu, ürünün "release yönetim aracı" yerine "release görüntüleme aracı" olarak kalmasına neden oluyor.

Önerilen ilk hamle: **Faz A** (Customer-Facing Delivery) — müşteri dashboard'una download/approve/request butonlarını eklemek. Bu tek değişiklik ürünün algılanan değerini dramatik olarak artırır.
