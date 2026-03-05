# ReleaseHub360 — Gap Backlog

> Kaynak: `docs/DESIGN_DOCUMENT.md` (5792 satır, 11 bölüm)
> Oluşturulma: Mevcut kod taraması + tasarım dokümanı karşılaştırması
> Format: `- [x] ID | FILE(S) | NE YAPILACAK | GREP_DOĞRULAMA`
> Boyut: Her task ~yarım gün (4 saat)
> Kural: Gap-based — çalışan kodu bozma, sadece eksikleri kapat

---

## BÖLÜM A — SCHEMA & VERİ MODELİ (Prisma)

### A1: Enum & Role Düzeltmeleri

- [x] A1-01 | `prisma/schema.prisma` | OrgRole enum'ına PRODUCT_OWNER, DEVOPS_ENGINEER ekle; QA → QA_ENGINEER yap. Mevcut DB'deki "QA" değerlerini migration ile "QA_ENGINEER"a çevir. `requireRole` kullanılan tüm route dosyalarındaki 'QA' referanslarını güncelle. | `grep -r "QA_ENGINEER" packages/backend/src`
- [x] A1-02 | `prisma/schema.prisma` | CustomerRole enum değerlerini CUSTOMER_ADMIN, APP_ADMIN, APPROVER, BUSINESS_USER, PARTNER olarak yeniden tanımla. Mevcut CONTACT → BUSINESS_USER, VIEWER → BUSINESS_USER, ADMIN → CUSTOMER_ADMIN migration yaz. | `grep "CUSTOMER_ADMIN" packages/backend/prisma/schema.prisma`
- [x] A1-03 | `prisma/schema.prisma` | CustomerUser modelinde `role` alanını `customerRole` olarak yeniden adlandır (design doc Section 10.8.1 uyumu). Tüm backend referanslarını güncelle. | `grep "customerRole" packages/backend/prisma/schema.prisma`

### A2: ProductVersion Alan Güncellemeleri

- [x] A2-01 | `prisma/schema.prisma` | ProductVersion: `masterStartDate` → `devStartDate` rename. @map kullanıldı, backend+frontend tüm referanslar güncellendi. | `grep -r "devStartDate" packages/`
- [x] A2-02 | `prisma/schema.prisma` | ProductVersion: `testDate` → `testStartDate` rename. @map kullanıldı, backend+frontend tüm referanslar güncellendi. | `grep -r "testStartDate" packages/`
- [x] A2-03 | ~~CANCELLED~~ `preProdDate` design spec'inde (release-calendar-redesign.md) açıkça mevcut — 5 tarih alanından biri. Kaldırılmayacak.
- [x] A2-04 | ~~CANCELLED~~ `phase` değerleri zaten design spec ile uyumlu: PLANNED, DEVELOPMENT, RC, STAGING, PRODUCTION, ARCHIVED. Design spec'te `IN_DEVELOPMENT/TESTING/RELEASED/DEPRECATED` yok — backlog açıklaması hatalıydı.

### A3: Diğer Model Güncellemeleri

- [x] A3-01 | `prisma/schema.prisma` | TransitionIssue modeline `reportMode String @default("MANUAL")` (MANUAL | AUTOMATIC), `severity String?` (CRITICAL | HIGH | MEDIUM | LOW — mevcut priority enum'dan farklı) alanları ekle. | `grep "reportMode" packages/backend/prisma/schema.prisma`
- [x] A3-02 | `prisma/schema.prisma` | IssueComment modeline `authorSide String @default("ORG")` (ORG | CUSTOMER) alanı ekle. Backend comment oluştururken JWT'deki userType'a göre set et. | `grep "authorSide" packages/backend/prisma/schema.prisma`
- [x] A3-03 | `prisma/schema.prisma` | UserProductAccess modelinden `canWrite` alanını kaldır (design'da yok, rol bazlı yetki yeterli). | `grep -c "canWrite" packages/backend/prisma/schema.prisma` → 0
- [x] A3-04 | `prisma/schema.prisma` | MetricSnapshot modelini design'a hizala: `periodStart DateTime`, `periodEnd DateTime`, `metricType String`, `value Float`, `metadata Json?` yapısına geçir. Mevcut specific field'ları kaldır (deployFreq, leadTimeDays vb.). Migration ile mevcut verileri dönüştür. | `grep "metricType" packages/backend/prisma/schema.prisma`
- [x] A3-05 | `prisma/schema.prisma` | CPM modeline FTP alanları ekle: `ftpHost String?`, `ftpPort Int?`, `ftpUser String?`, `ftpPassword String?` (encrypted). Binary artifact müşterileri için FTP upload desteği. | `grep "ftpHost" packages/backend/prisma/schema.prisma`
- [x] A3-06 | `prisma/schema.prisma` | ReleaseTodo modeline `phase String @default("PRE")` (PRE | DURING | POST), `responsibleTeam String?`, `isRecurring Boolean @default(false)`, `customerScope String?` (ALL | SPECIFIC — müşteri-spesifik todo), `guideUrl String?` alanları ekle. Mevcut `timing` alanını `phase` ile birleştir veya migrate et. | `grep "responsibleTeam" packages/backend/prisma/schema.prisma`

### A4: Tablo Temizliği (Dikkatli — Faz 2)

- [x] A4-01 | `prisma/schema.prisma` | CustomerServiceMapping tablosunu soft-deprecate et: üstüne `@deprecated` yorum ekle. CPM subscription mekanizması tam çalışır hale gelince silinecek. Frontend'de hâlâ kullanılıyorsa CPM'e geçişi planlayıp uygulamadan kaldırma. | `grep -r "CustomerServiceMapping" packages/frontend/src | wc -l`
- [x] A4-02 | `prisma/schema.prisma` | CPM `productVersionId` alanını isteğe bağlı yap (`String?`), `productId` alanını zorunlu (`String`) yap. Migration: mevcut kayıtlarda productVersionId'den productId'yi çıkarıp doldur. Unique constraint güncelle. | `grep "productId.*String" packages/backend/prisma/schema.prisma` (CPM bölümünde)

---

## BÖLÜM B — RBAC & YETKİ MİMARİSİ

### B1: Backend Middleware

- [x] B1-01 | `packages/backend/src/middleware/auth.middleware.ts` | `requireCustomerRole(...roles: string[])` middleware fonksiyonu yaz. JWT'deki `userType === 'CUSTOMER'` kontrolü + `customerRole` kontrolü. 403 döndür: "Bu işlem için yetkiniz yok". | `grep "requireCustomerRole" packages/backend/src/middleware/auth.middleware.ts`
- [x] B1-02 | `packages/backend/src/middleware/auth.middleware.ts` | `filterByUserProducts` middleware yaz. `req.user.role === 'ADMIN'` ise bypass. Aksi halde `UserProductAccess` tablosundan `accessibleProductIds` çek ve `req.accessibleProductIds`'e set et. Boşsa 403: "Erişebileceğiniz ürün bulunmuyor." | `grep "filterByUserProducts" packages/backend/src/middleware/auth.middleware.ts`
- [x] B1-03 | `packages/backend/src/middleware/auth.middleware.ts` | `resolveCustomerId` middleware yaz. `req.customerUser.customerId`'yi `req.customerId`'ye set et. Tüm müşteri sorgularında bu ID filtre olarak kullanılacak. | `grep "resolveCustomerId" packages/backend/src/middleware/auth.middleware.ts`
- [x] B1-04 | `packages/backend/src/routes/auth.routes.ts` | Birleşik login endpoint: Mevcut `/api/auth/login` endpoint'ini güncelle — önce `users` tablosunda ara, bulunamazsa `customer_users`'da ara. Token payload'a uygun `type: 'ORG' | 'CUSTOMER'` ekle. Mevcut `/api/auth/customer-login` endpoint'ini koru ama deprecated işaretle. | `grep "customer_users" packages/backend/src/routes/auth.routes.ts`
- [x] B1-05 | `packages/backend/src/routes/auth.routes.ts` | E-posta çakışma kontrolü: `POST /api/users` ve `POST /api/customer-users` endpoint'lerinde hem `users` hem `customer_users` tablolarını kontrol et. Çakışma varsa 409: "Bu e-posta adresi zaten sistemde kayıtlı." | `grep "email.*unique.*customer_users\|users.*email.*exist" packages/backend/src/routes` (regex)
- [x] B1-06 | `packages/backend/src/routes/users.routes.ts` | Son ADMIN koruması: Rol değiştirme, deaktive, silme işlemlerinde aktif ADMIN sayısını kontrol et. 1'e düşecekse 400: "Son yönetici hesabı kaldırılamaz." | `grep "Son yönetici\|last.*admin\|ADMIN.*count" packages/backend/src/routes/users.routes.ts`

### B2: Backend Route Güvenlik Güncellemeleri

- [x] B2-01 | `packages/backend/src/routes/customerUsers.routes.ts` | `authenticateJWT` middleware'i ekle (şu an YOK — publicerişim!). Role guard ekle: kurum tarafı CRUD = `requireRole('ADMIN', 'PRODUCT_OWNER')`. | `grep "authenticateJWT" packages/backend/src/routes/customerUsers.routes.ts`
- [x] B2-02 | `packages/backend/src/routes/metrics.routes.ts` | `authenticateJWT` middleware'i ekle (şu an YOK — public erişim!). | `grep "authenticateJWT" packages/backend/src/routes/metrics.routes.ts`
- [x] B2-03 | Tüm backend route dosyaları | `filterByUserProducts` middleware'ini ürün verisi döndüren tüm endpoint'lere ekle: products, services, productVersions, releaseNotes, releaseTodos, systemChanges, serviceReleaseSnapshots, healthChecks, versionPackages. `req.accessibleProductIds` ile sorguları filtrele. | `grep -r "filterByUserProducts" packages/backend/src/routes/ | wc -l` ≥ 8
- [x] B2-04 | `packages/backend/src/routes/users.routes.ts` | Ürün erişimi CRUD endpoint'leri ekle: `GET /api/users/:id/product-access`, `PUT /api/users/:id/product-access` (toplu güncelle — productId array gönder). Sadece `requireRole('ADMIN')`. | `grep "product-access" packages/backend/src/routes/users.routes.ts`
- [x] B2-05 | `packages/backend/src/routes/customerUsers.routes.ts` | Müşteri portal route'ları ekle: `GET/POST/PATCH/DELETE /api/customer-portal/users`. `authenticateJWT` + `requireCustomerRole('CUSTOMER_ADMIN')`. CUSTOMER_ADMIN başka CUSTOMER_ADMIN oluşturamaz kuralı. | `grep "customer-portal" packages/backend/src/routes/customerUsers.routes.ts`
- [x] B2-06 | `packages/backend/src/routes/users.routes.ts` | Self-deactivation engeli: `PATCH /api/users/:id/status` ve `DELETE /api/users/:id` endpoint'lerinde `req.user.userId === id` kontrolü. Aynıysa 400: "Kendi hesabınızı deaktive edemezsiniz." | `grep "kendi hesab\|self.*deactivat" packages/backend/src/routes/users.routes.ts`
- [x] B2-07 | `packages/backend/src/routes/auth.routes.ts` | Yetki matrisi endpoint'i ekle: `GET /api/roles/permissions`. Frontend'in buton/menü gizlemesi için rol→yetki JSON mapping döndürsün. Design doc Section 10.4 matrislerine göre. | `grep "roles/permissions\|permission.*matrix" packages/backend/src/routes/auth.routes.ts`

### B3: Frontend RBAC

- [x] B3-01 | `packages/frontend/src/components/RoleGuard.tsx` | RoleGuard bileşeni oluştur: `roles` prop → kullanıcı rolü eşleşmezse `/` 'e redirect veya `null` render. `useAuthStore` kullan. | `grep "RoleGuard" packages/frontend/src/components/RoleGuard.tsx`
- [x] B3-02 | `packages/frontend/src/components/CustomerRoleGuard.tsx` | CustomerRoleGuard bileşeni oluştur: `customerRoles` prop → müşteri userType + customerRole eşleşmezse `/customer-dashboard`'a redirect. | `grep "CustomerRoleGuard" packages/frontend/src/components/CustomerRoleGuard.tsx`
- [x] B3-03 | `packages/frontend/src/lib/permissions.ts` | `hasPermission(role, action)` ve `hasCustomerPermission(customerRole, action)` utility fonksiyonları yaz. Design doc Section 10.4+ matrislerini JSON config olarak embed et. Buton/UI gizleme için kullanılacak. | `grep "hasPermission" packages/frontend/src/lib/permissions.ts`
- [x] B3-04 | `packages/frontend/src/routes/index.tsx` | Tüm route'ları RoleGuard ile sar. Design doc Section 10.9 matrisine göre: `/settings` ve `/users-roles` = ADMIN only, `/code-sync` = ADMIN+RM+DevOps. Müşteri route'larını CustomerRoleGuard ile sar. | `grep "RoleGuard" packages/frontend/src/routes/index.tsx`
- [x] B3-05 | `packages/frontend/src/components/Layout/Sidebar.tsx` | Sidebar menü görünürlüğünü Design doc Section 10.9 matrisine göre güncelle. Mevcut `roles` array'leri design ile uyumsuz — PRODUCT_OWNER, DEVOPS_ENGINEER, QA_ENGINEER rolleri eklenmeli. 📖 = görünür ama CTA gizli. | `grep "PRODUCT_OWNER\|DEVOPS_ENGINEER" packages/frontend/src/components/Layout/Sidebar.tsx`
- [x] B3-06 | `packages/frontend/src/pages/UsersRolesPage.tsx` | Kullanıcı davet/düzenleme drawer'ına ürün erişimi checkbox listesi ekle. `GET /api/users/:id/product-access` ile mevcut seçimleri çek, `PUT /api/users/:id/product-access` ile kaydet. | `grep "product-access\|productAccess\|ürün erişim" packages/frontend/src/pages/UsersRolesPage.tsx`

---

## BÖLÜM C — RELEASE CALENDAR & VERSİYON YÖNETİMİ

- [x] C-01 | `packages/frontend/src/pages/ReleaseCalendarPage.tsx` | Yeni versiyon oluşturma dialog'una semver validasyonu ekle: `/^v?\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/`. Hatalı format → kırmızı helper text. Backend'de de aynı regex ile validate et. | `grep "semver\|\\\\d+\\\\.\\\\d+\\\\.\\\\d+" packages/frontend/src/pages/ReleaseCalendarPage.tsx`
- [x] C-02 | `packages/frontend/src/pages/ReleaseCalendarPage.tsx` | Tarih bazlı uyarı sistemi: `devStartDate` geçmişte ama hâlâ PLANNED → amber chip "Geliştirme başlamalıydı". `testStartDate` geçmişte ama hâlâ IN_DEVELOPMENT → "Test gecikmesi". `releaseDate` geçmişte ama RELEASED değil → kırmızı chip "Release gecikmiş". | `grep "tarih.*uyarı\|date.*warning\|gecikmesi\|gecikmiş" packages/frontend/src/pages/ReleaseCalendarPage.tsx`
- [x] C-03 | `packages/backend/src/routes/productVersions.routes.ts` | RELEASED geçişini sadece Health Check üzerinden izin ver (doğrudan phase change engelle). `advance-phase` endpoint'inde `TESTING → RELEASED` geçişini reddet, bunun yerine health check sayfasından `release` endpoint'ini kullandır. | `grep "RELEASED.*health\|health.*check.*release" packages/backend/src/routes/productVersions.routes.ts`
- [x] C-04 | `packages/backend/src/routes/productVersions.routes.ts` | Deprecation flow'da müşteri sayısı kontrolü: `DEPRECATED` geçişinde `CustomerVersionTransition` + `CustomerProductMapping` tablosundan aktif müşteri sayısını hesapla. >0 ise uyarı dön (force flag ile override). | `grep "customer.*count\|müşteri.*sayı\|deprecat.*customer" packages/backend/src/routes/productVersions.routes.ts`
- [x] C-05 | `packages/backend/src/routes/productVersions.routes.ts` | `concurrentUpdatePolicy` validasyonu: Yeni versiyon oluşturulurken aynı product'ta başka IN_DEVELOPMENT/TESTING versiyon varsa → product.concurrentUpdatePolicy'ye göre WARN veya BLOCK. | `grep "concurrentUpdatePolicy" packages/backend/src/routes/productVersions.routes.ts`
- [x] C-06 | `packages/backend/src/routes/productVersions.routes.ts`, `packages/frontend/` | Müşteri takvim API'si: `GET /api/product-versions/customer-calendar?customerId={id}` — müşterinin CPM'deki ürünlerinin versiyonlarını, `product.customerVisibleStatuses` ile filtrele. Frontend müşteri dashboard'dan çağrılsın. | `grep "customer-calendar\|customerVisibleStatuses" packages/backend/src/routes/productVersions.routes.ts`

---

## BÖLÜM D — RELEASE HEALTH CHECK (Büyük Yeniden Yapılandırma)

### D1: Dual-Segment Mimari

- [x] D1-01 | `packages/frontend/src/pages/ReleaseHealthCheckPage.tsx` | Sayfaya iki segment tab'ı ekle: "Release Hazırlık" (Segment 1) ve "Geliştirme Takibi" (Segment 2). Mevcut tüm section'lar Segment 1'e taşınsın. Segment 2 boş placeholder olarak başlasın. Her segment'te bağımsız versiyon seçimi olsun. | `grep "Segment\|Release Hazırlık\|Geliştirme Takibi" packages/frontend/src/pages/ReleaseHealthCheckPage.tsx`
- [x] D1-02 | `packages/frontend/src/pages/ReleaseHealthCheckPage.tsx` | Health Score hesaplamasını design formülüne göre güncelle: -3/açık PR, -5/P0 tamamlanmamış todo, -10/breaking change, -2/eksik release note. Mevcut dashboard.routes.ts'deki basit hesaplamayı da aynı formüle güncelle. Skor kartı segment header'da gösterilsin. | `grep "healthScore\|health.*score.*formula\|P0.*todo\|breaking.*change.*score" packages/frontend/src/pages/ReleaseHealthCheckPage.tsx`

### D2: Release Notes Cascade

- [x] D2-01 | `packages/frontend/src/pages/ReleaseHealthCheckPage.tsx` | Release Notes section'ında cascade gösterimi: Her PR/WI için 3-aşamalı status → ① Azure'da field varsa "Azure DevOps'tan alındı" (yeşil) ② Yoksa "AI üret" butonu (sarı) ③ Hiç yoksa "Eksik" (kırmızı uyarı). Mevcut flat liste bu cascade yapısına dönüşsün. | `grep "cascade\|AI üret\|azure.*field\|releaseNote.*status" packages/frontend/src/pages/ReleaseHealthCheckPage.tsx`
- [x] D2-02 | `prisma/schema.prisma`, `packages/backend/src/routes/releaseNotes.routes.ts` | ReleaseNote modeline `source String @default("MANUAL")` (MANUAL | AZURE_FIELD | AI_GENERATED) ve `isNotRequired Boolean @default(false)` alanları ekle. `ReleaseNoteNotRequired` işaretleme endpoint'i: `PATCH /api/release-notes/:id/mark-not-required`. | `grep "isNotRequired\|mark-not-required\|AI_GENERATED" packages/backend/`

### D3: Release Publish Wizard

- [x] D3-01 | `packages/frontend/src/pages/ReleaseHealthCheckPage.tsx` | 3-adımlı release publish wizard dialog'u ekle: Adım 1 → "Son Kontrol" (health score + eksik öğeler), Adım 2 → "Paket Oluştur" (VersionPackage form — her servis için artifact bilgisi), Adım 3 → "Yayınla" (onay + notes publish). MUI Stepper kullan. | `grep "publish.*wizard\|PublishWizard\|release.*stepper" packages/frontend/src/pages/ReleaseHealthCheckPage.tsx`
- [x] D3-02 | `packages/backend/src/routes/productVersions.routes.ts` | Release publish endpoint'ini genişlet: `PATCH /api/product-versions/:id/release` — body'de `versionPackages[]` array kabul et, `VersionPackage` kayıtları oluştur, `notesPublished = true` set et, `actualReleaseDate = now()` set et, phase = RELEASED yap. | `grep "versionPackages\|notesPublished.*true\|actualReleaseDate.*now" packages/backend/src/routes/productVersions.routes.ts`

### D4: Development Tracking Segment

- [x] D4-01 | `packages/frontend/src/pages/ReleaseHealthCheckPage.tsx` | Segment 2 "Geliştirme Takibi" içeriği: Aktif PR'lar listesi (yaş uyarısı: >3 gün sarı, >7 gün kırmızı), Work Item ilerleme barı (New/Active/Resolved/Closed), erken uyarı system changes. TFS API'lerinden veri çek. | `grep "Geliştirme Takibi\|pr.*age\|work.*item.*progress\|early.*warning" packages/frontend/src/pages/ReleaseHealthCheckPage.tsx`
- [x] D4-02 | `packages/frontend/src/pages/ReleaseHealthCheckPage.tsx` | "Teste Al" butonu ekle: IN_DEVELOPMENT versiyonu seçiliyken Segment 2'de görünsün. Tıklanınca `PATCH /api/product-versions/:id/advance-phase` çağır (IN_DEVELOPMENT → TESTING). Onay dialog'u göster. | `grep "Teste Al\|teste.*al\|advance.*phase.*TESTING" packages/frontend/src/pages/ReleaseHealthCheckPage.tsx`

### D5: Product Onboarding

- [x] D5-01 | `packages/frontend/src/pages/product-catalog/ProductDialog.tsx` | 2-adımlı wizard'ın Adım 2'sine "İlk versiyon oluştur" toggle'ı ekle (varsayılan: açık). Açıkken v1.0.0 otomatik oluşturulsun (product create response'undan productId alınıp `POST /api/product-versions` çağrılsın). Design doc Section 6 "mandatory starting version" kuralı. | `grep "v1.0.0\|ilk versiyon\|initial.*version\|onboarding" packages/frontend/src/pages/product-catalog/ProductDialog.tsx`

---

## BÖLÜM E — MÜŞTERİ DASHBOARD

### E1: Müşteri Portal Altyapısı

- [x] E1-01 | `packages/frontend/src/pages/CustomerDashboardPage.tsx` | Müşteri giriş yapınca ürün kartlarını CPM tabanlı göster: her kart ürün adı + güncel versiyon + status chip + son güncelleme tarihi. Kartlara tıklayınca CustomerProductVersionsPage'e yönlendir. | `grep "product.*card\|ürün.*kart\|CPM.*product" packages/frontend/src/pages/CustomerDashboardPage.tsx`
- [x] E1-02 | `packages/backend/src/routes/dashboard.routes.ts` | Müşteri product card status API: `GET /api/dashboard/customer-products?customerId={id}` — CPM'deki ürünleri döndür, her biri için: güncel versionId, son release tarihi, toplam todo sayısı, tamamlanan todo yüzdesi, açık issue sayısı. | `grep "customer-products" packages/backend/src/routes/dashboard.routes.ts`

### E2: Artifact Dağıtım Kanalları

- [x] E2-01 | `packages/frontend/src/pages/CustomerProductVersionsPage.tsx` | Versiyon detayında artifact tipine göre aksiyon butonları göster: HelmChart → "HelmChart İndir", Binary → "Paket İndir", Docker IaaS → "Güncelleme Onayla", SaaS → "Güncelleme Talep Et", GIT_SYNC → "Code Sync'e Git". CPM.artifactType'a göre koşullu render. | `grep "artifactType\|helm.*indir\|binary.*indir\|güncelleme.*onayla" packages/frontend/src/pages/CustomerProductVersionsPage.tsx`
- [x] E2-02 | `packages/backend/src/routes/versionPackages.routes.ts` | Binary ZIP oluşturma endpoint'i: `POST /api/version-packages/:versionId/generate-binary` — VersionPackage kayıtlarındaki binary artifact'leri tek ZIP'e paketle. Mevcut download endpoint'ini ZIP dosya servisi ile genişlet. | `grep "generate-binary\|zip\|ZIP" packages/backend/src/routes/versionPackages.routes.ts`
- [x] E2-03 | `packages/backend/src/routes/customerDeployments.routes.ts` | Docker IaaS deploy tetikleme: `POST /api/customer-deployments/trigger` — müşteri ortamına deploy komutu gönder. Service'in platformUrl+platformToken ile hedef cluster'a bağlan. Faz 1'de sadece log kaydı + bildirim. | `grep "trigger\|deploy.*command\|platform.*url" packages/backend/src/routes/customerDeployments.routes.ts`

### E3: Ortam & Geçiş Yönetimi

- [x] E3-01 | `packages/backend/src/routes/customerVersionTransitions.routes.ts` | Sıralı ortam kontrolü: Transition oluşturulurken CPM.environments sırasını kontrol et. Önceki ortamdaki transition COMPLETED değilse → 400: "Önce [önceki ortam] geçişini tamamlayın." | `grep "environment.*order\|ortam.*sıra\|sequential.*env" packages/backend/src/routes/customerVersionTransitions.routes.ts`
- [x] E3-02 | `packages/backend/src/routes/customerVersionTransitions.routes.ts` | Gerçekleşen tarih → Service Matrix cascade: Transition `actualDate` set edildiğinde ilgili `ServiceVersion` kayıtlarını otomatik güncelle (UPSERT). VersionPackage'daki servis bilgileriyle eşleştir. | `grep "cascade\|serviceVersion.*update\|actualDate.*trigger" packages/backend/src/routes/customerVersionTransitions.routes.ts`
- [x] E3-03 | `packages/frontend/src/pages/CustomerProductVersionsPage.tsx` | Müşteri todo listesi: Versiyona bağlı ReleaseTodo'ları göster, `CustomerTodoCompletion` ile tamamlama durumunu göster. Sadece CUSTOMER_ADMIN ve APP_ADMIN checkbox'ı tıklayabilsin. İlerleme barı üstte. | `grep "todo.*completion\|CustomerTodoCompletion\|checkbox.*complete" packages/frontend/src/pages/CustomerProductVersionsPage.tsx`

---

## BÖLÜM F — SERVİS VERSİYON MATRİSİ

- [x] F-01 | `packages/backend/src/routes/serviceReleaseSnapshots.routes.ts` | Service Matrix cascade endpoint'i: `POST /api/service-release-snapshots/cascade` — Prod transition'da `ServiceVersion` kayıtlarını otomatik güncelle (UPSERT: serviceId + customerId → currentRelease). | `grep "cascade" packages/backend/src/routes/serviceReleaseSnapshots.routes.ts`
- [x] F-02 | `packages/frontend/src/pages/ServiceVersionMatrixPage.tsx` | CSV export'u Excel (.xlsx) export'a yükselt. `xlsx` npm paketi ile proper Excel dosyası üret. PDF export ekle (basit tablo formatı). | `grep "xlsx\|excel\|pdf\|PDF" packages/frontend/src/pages/ServiceVersionMatrixPage.tsx`
- [x] F-03 | `packages/backend/src/routes/`, `packages/frontend/src/pages/ServiceVersionMatrixPage.tsx` | Bootstrap (ilk veri yükleme) endpoint'i: `POST /api/service-versions/bootstrap` — CSV/JSON upload ile mevcut müşteri-servis versiyon bilgilerini toplu import et. Frontend'de "İçe Aktar" butonu + dosya upload dialog'u. | `grep "bootstrap\|import\|içe aktar" packages/frontend/src/pages/ServiceVersionMatrixPage.tsx`
- [x] F-04 | `packages/backend/src/routes/` | Stale bildirim endpoint'i: `POST /api/service-versions/notify-stale` — stale threshold'u aşan müşterilere bildirim gönder. `staleDays > product.staleThreshold` olanları tespit et. | `grep "notify-stale\|stale.*notification" packages/backend/src/routes/`
- [x] F-05 | `packages/frontend/src/pages/HomeDashboardPage.tsx` | Service Matrix dashboard widget'ı: "Güncel olmayan servisler" kartı — stale müşteri-servis kombinasyonlarının sayısı + ürün bazlı breakdown. | `grep "stale.*widget\|güncel olmayan\|service.*matrix.*card" packages/frontend/src/pages/HomeDashboardPage.tsx`

---

## BÖLÜM G — GEÇİŞ SORUN TAKİBİ (Transition Issues)

- [x] G-01 | `packages/frontend/src/pages/ReportIssuePage.tsx` | Kanban board'a drag-and-drop ekle: `@dnd-kit/core` + `@dnd-kit/sortable` paketlerini kur. Kartları sütunlar arası sürükleyince `PATCH /api/transition-issues/:id` ile status güncelle. | `grep "@dnd-kit\|useDraggable\|onDragEnd" packages/frontend/src/pages/ReportIssuePage.tsx`
- [x] G-02 | `packages/backend/src/routes/transitionIssues.routes.ts` | Attachment upload S3/minio entegrasyonu: `POST /api/transition-issues/:id/attachments/upload` — multer + S3 client ile dosya yükle, `IssueAttachment` kaydı oluştur. Faz 1'de local disk storage kullan (env ile S3'e geçilebilir). | `grep "multer\|upload\|S3\|minio" packages/backend/src/routes/transitionIssues.routes.ts`
- [x] G-03 | `packages/backend/src/index.ts` | Escalation cron job'ı ekle: Her saat çalışsın — `priority = 'CRITICAL'` ve `assignedTo IS NULL` ve `createdAt < now() - 4 hours` olan issue'ları tespit et, ADMIN + RELEASE_MANAGER'lara notification oluştur. | `grep "escalat\|CRITICAL.*unassigned\|4.*hour" packages/backend/src/index.ts`
- [x] G-04 | `packages/frontend/src/pages/ReportIssuePage.tsx` | Issue detay drawer'ına cross-reference linkleri ekle: İlişkili versiyon → Release Calendar link, ilişkili müşteri → Customer Dashboard link, ilişkili PR → Azure DevOps link. TransitionIssue.productVersionId ve customerId'yi kullan. | `grep "cross.*reference\|related.*version\|related.*customer" packages/frontend/src/pages/ReportIssuePage.tsx`
- [x] G-05 | `packages/frontend/src/pages/ReportIssuePage.tsx` | Comment section'da authorSide gösterimi: ORG → mavi arka plan (sağ hizalı), CUSTOMER → gri arka plan (sol hizalı). Chat benzeri görünüm. | `grep "authorSide\|ORG.*customer.*chat\|message.*side" packages/frontend/src/pages/ReportIssuePage.tsx`

---

## BÖLÜM H — KURUM DASHBOARD & DORA METRİKLERİ

### H1: DORA Metrik Altyapısı

- [x] H1-01 | `packages/backend/src/lib/doraCalculator.ts` | DORA metrik hesaplama servisi yaz: DF (release sayısı/hafta), LT (PR merge → release), CFR (hotfix/total), MTTR (hotfix request → release). MetricSnapshot tablosuna yaz. Period filter parametreleri kabul etsin. | `grep "doraCalculator\|deployFrequency.*calculate\|leadTime.*calculate" packages/backend/src/lib/`
- [x] H1-02 | `packages/backend/src/index.ts` | Günlük DORA metrics calculator cron job'ı ekle (gece 02:00). `doraCalculator` servisini çağır, sonuçları MetricSnapshot'a yaz. | `grep "dora.*cron\|dora.*schedule\|02:00" packages/backend/src/index.ts`
- [x] H1-03 | `packages/backend/src/routes/metrics.routes.ts` | DORA trend endpoint'i ekle: `GET /api/metrics/dora/trend?months=6&productIds=id1,id2` — MetricSnapshot'tan haftalık seriler döndür. Önceki dönem karşılaştırması hesapla (yüzde değişim). | `grep "dora/trend\|dora.*trend" packages/backend/src/routes/metrics.routes.ts`

### H2: Release Ops Metrikleri

- [x] H2-01 | `packages/backend/src/routes/metrics.routes.ts` | Release ops endpoint'i ekle: `GET /api/metrics/release-ops` — Cycle Time, MR Throughput, Pipeline Success Rate, Todo Count per Version hesapla ve döndür. | `grep "release-ops\|cycle.*time\|mr.*throughput\|pipeline.*success" packages/backend/src/routes/metrics.routes.ts`
- [x] H2-02 | `packages/backend/src/routes/metrics.routes.ts` | Todo trend endpoint: `GET /api/metrics/release-ops/todo-trend` — Son N versiyonun todo sayıları (toplam + tamamlanan + oran). Versiyon bazlı bar chart verisi. | `grep "todo-trend\|todo.*trend" packages/backend/src/routes/metrics.routes.ts`

### H3: Farkındalık Skorları

- [x] H3-01 | `packages/backend/src/lib/awarenessCalculator.ts` | Farkındalık skor hesaplama servisi: Codebase Divergence (GIT_SYNC müşterileri behind/ahead), Config Difference (helmValuesOverrides key analizi), Deployment Diversity (unique artifactType+deploymentModel+hostingType kombinasyonları). 0-100 skor üret. | `grep "awarenessCalculator\|codebase.*divergence\|config.*difference\|deployment.*diversity" packages/backend/src/lib/`
- [x] H3-02 | `packages/backend/src/routes/metrics.routes.ts` | Awareness detail endpoint'leri ekle: `GET /api/metrics/awareness/codebase-detail` (müşteri bazlı behind/ahead), `GET /api/metrics/awareness/config-detail` (müşteri bazlı override sayıları), `GET /api/metrics/awareness/deployment-detail` (dağıtım tipi kırılımı). | `grep "awareness/codebase-detail\|awareness/config-detail\|awareness/deployment-detail" packages/backend/src/routes/metrics.routes.ts`

### H4: Dashboard Frontend Güncellemeleri

- [x] H4-01 | `packages/frontend/src/pages/HomeDashboardPage.tsx` | Üst metrik kartlarını 5'e genişlet: Kritik Alert, Bekleyen Onay, Bu Ay Release, Devam Eden Versiyonlar, Açık Sorun. Mevcut kartlarla karşılaştırıp eksikleri ekle. | `grep "kritik.*alert\|bekleyen.*onay\|açık.*sorun\|openIssues" packages/frontend/src/pages/HomeDashboardPage.tsx`
- [x] H4-02 | `packages/frontend/src/pages/HomeDashboardPage.tsx` | Aktif Release tablosuna "Müşteri Geçişi" sütunu ekle: RELEASED versiyonlar için `CustomerVersionTransition` COMPLETED oranını göster (ör: "8/12 geçti (67%)"). Veri backendden gelsin (`active-releases` endpoint'ini genişlet). | `grep "müşteri.*geçiş\|customer.*transition.*ratio\|geçti" packages/frontend/src/pages/HomeDashboardPage.tsx`
- [x] H4-03 | `packages/frontend/src/pages/HomeDashboardPage.tsx` | DORA trend grafiği ekle: recharts veya MUI Charts ile haftalık zaman serisi çizgi grafik. Toggle butonlarıyla 4 metrik arasında geçiş (DF/LT/CFR/MTTR). `GET /api/metrics/dora/trend` çağır. | `grep "recharts\|DoraTrend\|trend.*chart\|line.*chart" packages/frontend/src/pages/HomeDashboardPage.tsx`
- [x] H4-04 | `packages/frontend/src/pages/HomeDashboardPage.tsx` | Release Ops bölümü ekle: 4 metrik kartı (Cycle Time, MR Throughput, Pipeline Success, Todo/Version) + Todo trend bar chart. `GET /api/metrics/release-ops` çağır. | `grep "cycle.*time\|mr.*throughput\|pipeline.*success\|todo.*trend" packages/frontend/src/pages/HomeDashboardPage.tsx`
- [x] H4-05 | `packages/frontend/src/pages/HomeDashboardPage.tsx` | Farkındalık Skorları bölümü ekle: 3 skor kartı (Codebase Divergence, Config Difference, Deployment Diversity) + Genel Sağlık Özeti kartı. Drill-down drawer'lar. Sadece ADMIN/PO/RM/DevOps görsün. | `grep "codebase.*divergence\|config.*difference\|deployment.*diversity\|awareness.*section" packages/frontend/src/pages/HomeDashboardPage.tsx`
- [x] H4-06 | `packages/frontend/src/pages/HomeDashboardPage.tsx` | Dönem filtresi dropdown'u ekle: Son 7g/30g/90g/6ay/1yıl. Seçim değişince tüm DORA + Release Ops sorgularını yeniden çalıştır. Awareness skorları dönemden bağımsız. | `grep "dönem\|period.*filter\|son.*gün\|date.*range.*selector" packages/frontend/src/pages/HomeDashboardPage.tsx`
- [x] H4-07 | `packages/frontend/src/pages/HomeDashboardPage.tsx` | Ürün multi-select filtresi ekle: MUI Autocomplete ile çoklu ürün seçimi. Seçim değişince tüm metrikleri seçili ürünlere göre filtrele. Boş = tümü. | `grep "product.*filter\|ürün.*filtre\|multi.*select.*product" packages/frontend/src/pages/HomeDashboardPage.tsx`
- [x] H4-08 | `packages/frontend/src/pages/HomeDashboardPage.tsx` | Version Transition detail drawer: Aktif release tablosundaki "Müşteri Geçişi" sütununa tıklayınca açılan drawer → müşteri listesi (Geçti/Planlandı/Planlamadı), ilerleme barı, "Hatırlat" butonu. `GET /api/dashboard/version-transition/:versionId`. | `grep "version.*transition.*detail\|geçiş.*detay\|transition.*drawer" packages/frontend/src/pages/HomeDashboardPage.tsx`
- [x] H4-09 | `packages/backend/src/routes/dashboard.routes.ts` | Highlights engine: `GET /api/dashboard/highlights` — rule-based insight üretimi. Kurallar: müşteri 3+ versiyon gerideyse, config drift artıyorsa, MTTR iyileşiyorsa, sync 30+ gün yoksa. Max 5 madde döndür. | `grep "highlights\|insight\|rule.*based" packages/backend/src/routes/dashboard.routes.ts`
- [x] H4-10 | `packages/backend/src/routes/dashboard.routes.ts` | Version transition detail endpoint: `GET /api/dashboard/version-transition/:versionId` — o versiyona geçiş yapan/planlayan/planlamayan müşteri listesi + oranlar. | `grep "version-transition" packages/backend/src/routes/dashboard.routes.ts`

---

## BÖLÜM I — MÜŞTERİ KULLANICI YÖNETİMİ

- [x] I-01 | `packages/frontend/src/pages/CustomerUserManagementPage.tsx` | Yeni sayfa oluştur: `/customer-dashboard/users`. CUSTOMER_ADMIN erişimli. Müşteri kullanıcı listesi (DataTable) + "Kullanıcı Ekle" drawer (ad, e-posta, rol dropdown). Roller: APP_ADMIN, APPROVER, BUSINESS_USER, PARTNER. CUSTOMER_ADMIN seçilemez (kurum tarafından atanır). | `grep "CustomerUserManagement" packages/frontend/src/pages/`
- [x] I-02 | `packages/frontend/src/routes/index.tsx` | CustomerUserManagementPage route'unu ekle: `/customer-dashboard/users` → `CustomerRoleGuard roles={['CUSTOMER_ADMIN']}` ile sar. | `grep "customer-dashboard/users" packages/frontend/src/routes/index.tsx`
- [x] I-03 | `packages/frontend/src/services/customerUserService.ts` | Müşteri portal kullanıcı CRUD servis dosyası: `GET/POST/PATCH/DELETE /api/customer-portal/users`. | `grep "customer-portal/users" packages/frontend/src/services/`
- [x] I-04 | `packages/frontend/src/components/Layout/Sidebar.tsx` | Müşteri sidebar'ına "Kullanıcı Yönetimi" menü öğesi ekle. Sadece CUSTOMER_ADMIN rolünde görünsün. Path: `/customer-dashboard/users`. | `grep "Kullanıcı Yönetimi\|customer-dashboard/users" packages/frontend/src/components/Layout/Sidebar.tsx`

---

## BÖLÜM J — BACKEND SERVİS & YARDIMCI FONKSİYONLAR

- [x] J-01 | `packages/backend/src/lib/effectiveServices.ts` | `getEffectiveServices(cpmId)` utility fonksiyonu yaz: CPM.subscriptionLevel'a göre → FULL: tüm servisler, MODULE_GROUP: seçili grupların servisleri, MODULE: seçili modüllerin servisleri, SERVICE: direkt seçili servisler. | `grep "getEffectiveServices\|effectiveServices" packages/backend/src/lib/`
- [x] J-02 | `packages/backend/src/routes/tfs.routes.ts` | Git reference endpoint'i: `GET /api/tfs/git-refs?productId={id}&repoName={name}` — branch ve tag listesi döndür. GIT_SYNC müşterileri için CPM formundaki gitSyncRef alanında kullanılacak. | `grep "git-refs\|branches.*tags\|gitSyncRef.*list" packages/backend/src/routes/tfs.routes.ts`
- [x] J-03 | `packages/backend/src/routes/tfs.routes.ts` | Branch compare endpoint'i (DORA Codebase Divergence için): `GET /api/tfs/compare?repoName={name}&source={branch}&target={branch}` — behind/ahead commit sayıları döndür. | `grep "tfs/compare\|behind.*ahead\|commit.*count.*compare" packages/backend/src/routes/tfs.routes.ts`
- [x] J-04 | `packages/backend/src/routes/tfs.routes.ts` | Pipeline builds endpoint (DORA Pipeline Success için): `GET /api/tfs/builds?productId={id}&minTime={date}` — pipeline run sonuçları (succeeded/failed/cancelled counts). | `grep "tfs/builds\|pipeline.*build.*result" packages/backend/src/routes/tfs.routes.ts`
- [x] J-05 | `packages/backend/src/lib/auditLogger.ts` | Audit log helper fonksiyonu: `logAudit(userId, action, resource, resourceId, oldValue?, newValue?)`. Hassas yetki işlemlerinde (rol değişikliği, erişim ekleme/kaldırma, kullanıcı deaktive) çağrılsın. | `grep "logAudit\|auditLogger" packages/backend/src/lib/`

---

## BÖLÜM K — FRONTEND BİLEŞEN & ALTYAPI

- [x] K-01 | `packages/frontend/src/api/queryKeys.ts` | Eksik query key'leri ekle: `customerPortalUsers`, `metricsDoaTrend`, `metricsReleaseOps`, `metricsTodoTrend`, `awarenessDetail`, `dashboardHighlights`, `versionTransitionDetail`, `customerCalendar`, `gitRefs`, `productAccess`. | `grep "metricsDoaTrend\|customerPortalUsers\|dashboardHighlights" packages/frontend/src/api/queryKeys.ts`
- [x] K-02 | `packages/frontend/src/pages/LoginPage.tsx` | Login page'de birleşik login desteği: Tek form, backend otomatik ayırım yapsın (A1-04 ile uyumlu). Mevcut 2-tab yapısını koru ama design doc'a göre tek endpoint + backend sıralı arama da desteklensin. | `grep "birleşik\|unified.*login\|customer_users.*fallback" packages/frontend/src/pages/LoginPage.tsx`
- [x] K-03 | `packages/frontend/src/lib/authStore.ts` veya ilgili auth store | Auth store'a `customerRole` alanı ekle (CUSTOMER_ADMIN, APP_ADMIN vb.). Login response'tan alınsın. `hasPermission` ve `hasCustomerPermission` helper'ları burada veya permissions.ts'de kullanılsın. | `grep "customerRole" packages/frontend/src/lib/`
- [x] K-04 | `packages/frontend/src/components/EmptyState.tsx` | Design doc boş/hata mesajlarını EmptyState bileşenine ekle: "Erişebileceğiniz ürün bulunmuyor. Sistem yöneticinizden ürün erişimi talep edin.", "Bu işlem için yetkiniz yok.", "Oturumunuz sona erdi." vb. | `grep "ürün bulunmuyor\|yetkiniz yok\|oturumunuz sona erdi" packages/frontend/src/`

---

## BÖLÜM L — KONFİGÜRASYON & SEED

- [x] L-01 | `packages/backend/prisma/seed.ts` | Seed dosyasını güncellenmiş enum değerleriyle güncelle: Yeni OrgRole (PRODUCT_OWNER, DEVOPS_ENGINEER, QA_ENGINEER) ve CustomerRole (CUSTOMER_ADMIN, APP_ADMIN, APPROVER, BUSINESS_USER, PARTNER) ile örnek kullanıcılar oluştur. | `grep "PRODUCT_OWNER\|CUSTOMER_ADMIN\|APP_ADMIN" packages/backend/prisma/seed.ts`
- [x] L-02 | `packages/backend/prisma/seed.ts` | DORA benchmark eşikleri seed'e ekle: settings tablosuna `dora.df.eliteThreshold`, `dora.cfr.highThreshold` vb. varsayılan değerleri yaz. | `grep "dora.*threshold\|dora.*elite" packages/backend/prisma/seed.ts`
- [x] L-03 | `packages/backend/prisma/seed.ts` | Örnek UserProductAccess seed verileri: Admin hariç kullanıcıların belirli ürünlere erişimi. Filtreleme test edilebilsin. | `grep "userProductAccess\|UserProductAccess" packages/backend/prisma/seed.ts`

---

## BÖLÜM M — SCHEDULED JOBS & OTOMASYONDesign doc Section 11.12.1

- [x] M-01 | `packages/backend/src/index.ts` | Pipeline stats collector job: 6 saatte bir çalışsın. Azure DevOps Build API'den (MCP proxy üzerinden) son dönem pipeline sonuçlarını çekip MetricSnapshot'a yaz. | `grep "pipeline.*stats\|pipeline.*collector\|6.*saat\|21600" packages/backend/src/index.ts`
- [x] M-02 | `packages/backend/src/index.ts` | Codebase divergence checker job: Günlük çalışsın. Her CustomerBranch için Git API'den behind/ahead commit sayısı çekip MetricSnapshot'a yaz. | `grep "divergence.*checker\|codebase.*divergence.*job\|daily.*branch" packages/backend/src/index.ts`

---

## ÖZET

| Bölüm | Task Sayısı | Alan |
|-------|-------------|------|
| A — Schema & Model | 15 | Prisma migrations |
| B — RBAC & Auth | 16 | Middleware, route güvenlik, frontend guard |
| C — Calendar & Version | 6 | Validasyon, date warnings, deprecation |
| D — Health Check | 7 | Dual-segment, cascade, publish wizard |
| E — Müşteri Dashboard | 6 | Artifact kanalları, ortam yönetimi |
| F — Service Matrix | 5 | Export, cascade, bootstrap |
| G — Transition Issues | 5 | DnD kanban, upload, escalation |
| H — Dashboard & DORA | 13 | Metrikler, trend, awareness, highlights |
| I — Müşteri Kullanıcı | 4 | Portal, CRUD, sidebar |
| J — Backend Servisler | 5 | Utility fonksiyonlar, endpoint'ler |
| K — Frontend Altyapı | 4 | Query keys, auth store, EmptyState |
| L — Seed & Config | 3 | Enum seed, DORA seed, access seed |
| M — Scheduled Jobs | 2 | Pipeline, divergence |
| **TOPLAM** | **91** | |

---

## ÖNCELİK SIRASI (Önerilen Yürütme İkonu)

1. **A1 (Enum fix)** → tüm RBAC bunun üzerine kuruluyor
2. **B1 (Middleware)** → route güvenliği temeli
3. **B2 (Route güvenlik)** → public endpoint'ler kapanmalı (ACİL)
4. **B3 (Frontend guard)** → UI güvenlik
5. **A2 + C (Calendar)** → alan renameleri + validasyonlar
6. **D (Health Check)** → en büyük feature gap
7. **H (Dashboard DORA)** → operasyonel değer
8. **E (Müşteri Dashboard)** → müşteri portalı
9. **I (Müşteri Kullanıcı)** → portal kullanıcı yönetimi
10. **F + G (Matrix + Issues)** → detay iyileştirmeleri
11. **J + K + L + M** → altyapı ve otomasyon
12. **A3 + A4** → model temizliği (en düşük risk iştahıyla)
