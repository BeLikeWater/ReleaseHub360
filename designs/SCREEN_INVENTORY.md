# Screen Inventory — ReleaseHub360

**Tarih:** 21 Şubat 2026  
**Rol:** UX Designer  
**Kaynak:** `ReleaseHub360-old/src/components/` — 40+ component analizi

---

## Karar Özeti

| Karar | Sayı |
|---|---|
| KEEP (korunacak, yeniden tasarlanacak) | 15 |
| MERGE (başka ekrana absorbe edilecek) | 13 |
| ARCHIVE (silinecek) | 10 |
| NEW (hiç yokken olacak) | 6 |
| **Hedef ekran sayısı** | **21** |

---

## Kararlar — Detaylı

### ✅ KEEP — Gerçek Ürüne Alınacak

Bu ekranlar yeniden tasarlanarak `packages/frontend` içinde hayata geçirilecek.

| Ekran | Mevcut Component | Yeni Route | Kategori | Notlar |
|---|---|---|---|---|
| Login | *(yok)* | `/login` | Auth | → bkz. NEW |
| Ana Dashboard | *(yok)* | `/` | Dashboard | → bkz. NEW |
| **Release Health Check** | `releaseHealthCheckParts/ReleaseHealthCheckV2.js` | `/release-health-check` | **Command Center** | Tamamen yeniden tasarlanacak. Mevcut en değerli ekran. |
| Release Takvimi | `ReleaseCalendarV3.js` | `/release-calendar` | Management | Firebase → API, takvim görünümü iyileştirilecek |
| Versiyon Listesi | `Releases.js` | `/releases` | Management | Firebase → API |
| Release Notları | `ReleaseNoteForVersion.js` | `/release-notes/:versionId` | Detail | İçinde düzenleme var, korunacak |
| **Ürün Kataloğu** | `ProductCatalog.js` | `/products` | Management | Module, API, Service yönetimi buraya absorbe edilecek (tab'lar ile) |
| Servis Versiyon Matrisi | `ServiceVersionMatrixV2.js` | `/service-matrix` | Detail | Hangi servis hangi versiyonda — değerli |
| **Müşteri Yönetimi** | `CustomerManagementV2.js` | `/customers` | Management | Müşteri-ürün mapping buraya tab olarak eklenecek |
| **Müşteri Dashboard** | `CustomerDashboardV2.js` | `/customers/:id/dashboard` | Dashboard | Müşteri bazlı sürüm takibi buraya merge edilecek |
| **Hotfix Merkezi** | `HotfixManagement.js` | `/hotfixes` | Workflow | Hotfix Request + Approval + BetaTag buraya absorbe |
| **Code Sync** | `CodeSyncManagement.js` | `/code-sync` | Workflow | MCP entegrasyonu korunacak, wizard yeniden tasarlanacak |
| Pipeline Durumu | `PipelineStatus.js` | `/pipeline` | Detail | TFS → backend proxy üzerinden |
| Değişiklik Takibi | `ChangeTracking.js` | `/change-tracking` | Management | Yeniden tasarlanacak |
| Acil Değişiklik Yönetimi | `UrgentChangesManagement.js` | `/urgent-changes` | Management | Admin ekranı, korunacak |
| Release Todo Yönetimi | `ReleaseTodoManagement.js` | `/release-todos` | Management | Şablon yönetimi, admin ekranı |
| Sorun Bildir | `ReportIssue.js` | `/report-issue` | Workflow | Basit ama değerli, korunacak |

---

### 🔀 MERGE — Başka Ekrana Absorbe Edilecek

Bu component'lerin mantığı KEEP listesindeki ekranlara taşınacak. Ayrı route'larına ihtiyaç yok.

| Mevcut Component | Nereye Merge? | Nasıl? |
|---|---|---|
| `ApiManagement.js` | Ürün Kataloğu `/products` | "API'ler" tab'ı olarak |
| `ModuleManagement.js` | Ürün Kataloğu `/products` | "Modüller" tab'ı olarak |
| `ModuleGroupManagement.js` | Ürün Kataloğu `/products` | "Modül Grupları" tab'ı olarak |
| `ProductManagement.js` | Ürün Kataloğu `/products` | V1 — V2 olan ProductCatalog absorbe eder |
| `CustomerProductMappingV2.js` | Müşteri Yönetimi `/customers` | "Ürün Eşleştirmeleri" tab'ı olarak |
| `CustomerReleaseTrackV2.js` | Müşteri Dashboard `/customers/:id/dashboard` | "Release Takibi" tab'ı olarak |
| `CustomerServiceMapping.js` | Müşteri Dashboard `/customers/:id/dashboard` | "Servis Eşleştirme" tab'ı olarak |
| `HotfixRequest.js` | Hotfix Merkezi `/hotfixes` | Dialog/drawer içinde form olarak |
| `HotfixRequestApproval.js` | Hotfix Merkezi `/hotfixes` | "Onay Bekleyenler" tab/section olarak |
| `BetaTagRequest.js` | Release Takvimi `/release-calendar` | Versiyon kartında inline action olarak |
| `UrgentChanges.js` | Acil Değişiklik Yönetimi `/urgent-changes` | Okuma/izleme view'u admin sayfasıyla birleşir |
| `TodoList.js` | Release Health Check `/release-health-check` | Zaten `ReleaseTodosSection.js` olarak parçası var |
| `ReleaseNotes.js` | Versiyon Listesi `/releases` | Read-only görünüm, Releases ekranında version detayında gösterilir |

---

### 🗄️ ARCHIVE — Silinecek

Bu dosyalar `ReleaseHub360-old/` klasöründe kalır, `packages/frontend` klasörüne taşınmaz.

| Component | Neden Archive? |
|---|---|
| `CustomerDashboard.js` | V1 — V2 ile değiştirildi |
| `CustomerManagement.js` | V1 — V2 ile değiştirildi |
| `CustomerReleaseTrack.js` | V1 — V2 ile değiştirildi |
| `ReleaseCalendar.js` | V1 — V3 ile değiştirildi |
| `ReleaseHealthCheck.js` | V1 — V2 ile değiştirildi |
| `ReleaseHealthCheckSimplified.js` | Yarım kalmış deneme, V2 bunu karşılıyor |
| `ReleaseHealthCheckV2 copy.js` | Kopya dosya |
| `ReleaseHealthCheckV2old.js` | Eski versiyon |
| `Releases_old.js` | Eski versiyon |
| `ProcessFlow.js` | Statik animasyon — gerçek ürüne değer katmıyor |
| `VersionLifecycle.js` | Statik animasyon — dokümantasyona taşınabilir |
| `ServiceVersionMatrix.js` | V1 — V2 ile değiştirildi |

---

### 🆕 NEW — Hiç Olmayan, Tasarlanacak

| Ekran | Route | Kategori | Öncelik | Gerekçe |
|---|---|---|---|---|
| **Login / Auth** | `/login` | Auth | P0 | JWT auth olacak, giriş ekranı şart |
| **Ana Dashboard (Home)** | `/` | Dashboard | P0 | Giriş sonrası rol bazlı özet — şu an ProcessFlow statik animasyonu var |
| **Bildirimler Merkezi** | `/notifications` | Detail | P1 | Hotfix onayı, pipeline fail, sync tamamlandı → actionable feed |
| **Kullanıcı & Rol Yönetimi** | `/admin/users` | Management | P1 | JWT auth ile gelen zorunluluk — kim hangi rolde |
| **Ayarlar** | `/admin/settings` | Management | P1 | TFS URL, n8n webhook, MCP server URL — şu an hardcoded |
| **Workflow Geçmişi** | `/admin/workflows` | Detail | P2 | n8n üzerinden tetiklenen tüm iş akışlarının audit logu |

---

## Hedef Navigation Yapısı

```
Sidebar Menü
├── 🏠 Ana Sayfa                    → /
├── 📋 RELEASE
│   ├── Release Health Check        → /release-health-check   ⭐ Command Center
│   ├── Release Takvimi             → /release-calendar
│   ├── Versiyon Listesi            → /releases
│   └── Release Notları             → /release-notes/:versionId
├── 📦 ÜRÜN
│   ├── Ürün Kataloğu               → /products               (tabs: Ürünler, Servisler, API'ler, Modüller)
│   └── Servis Versiyon Matrisi     → /service-matrix
├── 👥 MÜŞTERİ
│   ├── Müşteri Yönetimi            → /customers              (tabs: Liste, Eşleştirmeler)
│   └── Müşteri Dashboard           → /customers/:id/dashboard (tabs: Özet, Release Takibi, Servisler)
├── ⚙️ OPERASYON
│   ├── Release Health Check        → /release-health-check
│   ├── Code Sync                   → /code-sync
│   ├── Hotfix Merkezi              → /hotfixes               (tabs: Aktif, Onay Bekleyen, Tamamlanan)
│   ├── Pipeline Durumu             → /pipeline
│   └── Değişiklik Takibi           → /change-tracking
├── 🔔 Bildirimler                  → /notifications
└── 🔧 ADMİN
    ├── Kullanıcı & Roller          → /admin/users
    ├── Release Todo Yönetimi       → /release-todos
    ├── Acil Değişiklik Yönetimi    → /urgent-changes
    ├── Sorun Bildir                → /report-issue
    ├── Ayarlar                     → /admin/settings
    └── Workflow Geçmişi            → /admin/workflows
```

---

## Wireframe Öncelik Sırası

| # | Ekran | Kategori | Neden önce? |
|---|---|---|---|
| 1 | 🔐 Login | Auth | Giriş noktası, her şeyden önce olmalı |
| 2 | 🏠 Ana Dashboard | Dashboard | Giriş sonrası ilk ekran, rol bazlı |
| 3 | ⭐ Release Health Check | Command Center | En karmaşık, en değerli — TL yeniden tasarım |
| 4 | 📦 Ürün Kataloğu | Management | Tüm product management konsolide |
| 5 | 📅 Release Takvimi | Management | Versiyon yönetiminin kalbi |
| 6 | 🔥 Hotfix Merkezi | Workflow | 3 ekran → tek akış |
| 7 | 👥 Müşteri Yönetimi | Management | Müşteri + mapping konsolide |
| 8 | 👁️ Müşteri Dashboard | Dashboard | Müşteri bazlı perspektif |
| 9 | 🔄 Code Sync | Workflow | MCP entegrasyonu, wizard yapısı |
| 10 | 🔔 Bildirimler | Detail | Yeni, actionable feed |
| 11 | 📊 Servis Versiyon Matrisi | Detail | Teknik tablo |
| 12 | 🚀 Pipeline Durumu | Detail | TFS bağlantılı |
| 13 | 📝 Versiyon Listesi | Management | Release listesi |
| 14 | 📋 Release Notları | Detail | Sürüm bazlı not editörü |
| 15 | 👤 Kullanıcı & Roller | Management | Admin — JWT zorunluluğu |
| 16 | ⚙️ Ayarlar | Management | Admin — bağlantı konfigürasyonu |
| 17 | 📌 Değişiklik Takibi | Management | Sistem değişiklikleri |
| 18 | 🗂️ Release Todo Yönetimi | Management | Şablon admin |
| 19 | ⚡ Acil Değişiklik Yönetimi | Management | Admin |
| 20 | 🐛 Sorun Bildir | Workflow | Basit form |
| 21 | 🔧 Workflow Geçmişi | Detail | n8n audit |

---

## releaseHealthCheckParts/ Değerlendirmesi

Bu klasördeki tüm sub-component'ler KEEP — Release Health Check Command Center ekranının bölümleri:

| Component | Kapsam | Yeni Tasarımda |
|---|---|---|
| `PipelineStatusSection.js` | Build/deploy pipeline durumu | Üst grid — "Pipeline" kartı |
| `PodStatusSection.js` | Kubernetes pod sağlığı | Üst grid — "Pod Status" kartı |
| `PRDetailedAnalyze.js` | PR detay analizi | Sağ drawer — tıklanınca açılır |
| `PullRequestListReadyToPublish.js` | Yayına hazır PR'lar | Ayrı tab veya section |
| `PullRequestsList.js` | Tüm PR listesi (TFS) → backend proxy | "PR Durumu" kartı |
| `ReleaseNotesSection.js` | Inline release note editörü | Alt section |
| `ReleaseTodosSection.js` | Checklist | Alt section |
| `ServicesNeedingUpdateSection.js` | Güncelleme gereken servisler | Uyarı bölümü |
| `SystemChangesSection.js` | Sistem değişiklikleri özeti | Bölüm |
| `WorkItemsSection.js` | Azure DevOps work item'ları | "Work Items" kartı |
