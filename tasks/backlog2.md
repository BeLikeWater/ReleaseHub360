# Backlog 2 — Design Document Kapsamlı Gap Analizi

> Kaynak: `docs/DESIGN_DOCUMENT.md` tam okuma (5792 satır, 11 bölüm)
> Oluşturulma: Design doc audit sonrası, backlog.md tamamlama sonrası
> Durum: Gap 56-120 arası tüm eksikler + backlog.md'de eksik kalan faz 2 görevler

---

## BÖLÜM N — Section 8: Customer–Servis Versiyon Matrisi (Backend)

### N-01 | schema.prisma | CustomerServiceVersion + CustomerServiceVersionHistory modelleri + migration
- [x] N-01 | `packages/backend/prisma/schema.prisma` | `CustomerServiceVersion` modeli: id, customerId (FK→Customer), productId (FK→Product, denormalize), serviceId (FK→Service), currentRelease (String), currentVersionId (FK→ProductVersion), takenAt (DateTime), previousRelease (String?), updatedAt. Unique: [customerId, serviceId]
- [x] N-02 | `packages/backend/prisma/schema.prisma` | `CustomerServiceVersionHistory` modeli: id, customerId, serviceId, fromRelease, toRelease, fromVersionId, toVersionId, transitionDate (DateTime), createdAt. Index: [customerId, serviceId, transitionDate DESC]. Append-only.
- [x] N-03 | `packages/backend/prisma/migrations/` | `prisma migrate dev --name add_customer_service_version` — migration oluştur ve uygula
- [x] N-04 | `packages/backend/prisma/schema.prisma` | Product modeline `staleThresholdWarning Int @default(3)` ve `staleThresholdCritical Int @default(5)` alanları ekle (Gap 65)

### N-05 | Transition Cascade Service
- [x] N-05 | `packages/backend/src/lib/serviceVersionCascade.ts` | `cascadeServiceVersions(transitionId: string)` fonksiyonu: CustomerVersionTransition'ı oku → VersionPackage'ı bul → her VersionPackageItem için CustomerServiceVersion UPSERT + CustomerServiceVersionHistory INSERT. Tek Prisma transaction içinde.

### N-06 | Matrix API Routes (9 endpoint)
- [x] N-06 | `packages/backend/src/routes/serviceVersionMatrix.routes.ts` (Yeni dosya) | 9 endpoint:
  - `GET /api/service-version-matrix?productId` — pivot matrix (tüm müşteriler × servisler)
  - `GET /api/service-version-matrix/by-service?serviceId` — servis odaklı
  - `GET /api/service-version-matrix/by-customer?customerId&productId` — müşteri odaklı
  - `GET /api/service-version-matrix/history?customerId&serviceId` — geçiş geçmişi
  - `GET /api/service-version-matrix/stale?productId&threshold` — N+ release geridekiler
  - `GET /api/service-version-matrix/summary` — dashboard widget (Gap 64)
  - `POST /api/service-version-matrix/bootstrap` — admin batch import (Gap 61)
  - `GET /api/service-version-matrix/export?format=excel|csv&productId` — Excel/CSV (Gap 62)
  - `POST /api/service-version-matrix/notify-stale` — toplu bildirim tetikle (Gap 63)
- [x] N-07 | `packages/backend/src/app.ts` | serviceVersionMatrix router'ı mount et

### N-08 | Stale Calculator
- [x] N-08 | `packages/backend/src/lib/staleCalculator.ts` | `calculateStaleness(customerId, serviceId, productId)` → VersionPackageItem'lardan release listesini sırala → fark hesapla → `{ currentRelease, latestRelease, staleCount, status: 'CURRENT'|'WARNING'|'CRITICAL' }`

### N-09 | Cascade Entegrasyonu — CustomerVersionTransition PATCH
- [x] N-09 | `packages/backend/src/routes/customerVersionTransitions.routes.ts` | `PATCH /:id` (actualDate set edilince AND ortam = Prod) → transaction içinde: status → COMPLETED, actualDate set, CPM.currentVersionId güncelle, `cascadeServiceVersions(transitionId)` çağır

---

## BÖLÜM O — Section 7: Customer Dashboard Artifact Delivery (Backend)

### O-01 | HelmChart Gerçek Üretimi
- [x] O-01 | `packages/backend/src/lib/helmChartGenerator.ts` | `generateHelmChart(cpmId, versionId)` → `getEffectiveServices()` → her servis için `values.yaml` üret (dockerImageName + release tag) → `helmValuesOverrides` merge → `.tgz` buffer üret (tar + gzip). Kütüphane: `tar` npm paketi. Dosya içeriği: `Chart.yaml`, `values.yaml`, `templates/deployment.yaml`
- [x] O-02 | `packages/backend/src/routes/customerDeployments.routes.ts` | `GET /api/customer-deployments/helmchart?versionId&customerId` — helmChartGenerator'ı çağır → buffer'ı binary response olarak döndür (`Content-Disposition: attachment; filename=...tgz`). AuditLog'a kaydet (Gap 54)

### O-02 | Binary/DLL ZIP Üretimi
- [x] O-03 | `packages/backend/src/lib/binaryPackageGenerator.ts` | `generateBinaryPackage(cpmId, versionId)` → efektif servisler → her servisin `binaryArtifacts` array → klasör yapısı oluştur → ZIP buffer üret. Kütüphane: `archiver` npm paketi. README.md ekle (kurulum notları)
- [x] O-04 | `packages/backend/src/routes/customerDeployments.routes.ts` | `GET /api/customer-deployments/binary-package?versionId&customerId` — binaryPackageGenerator → ZIP response. AuditLog kaydet.

### O-03 | FTP Upload Servisi
- [x] O-05 | `packages/backend/src/lib/ftpUploader.ts` | `uploadToFtp(buffer, fileName, cpm)` → CPM'den `ftpHost`, `ftpPath`, `ftpCredentials` oku → `basic-ftp` kütüphanesi ile FTP'ye yükle. Connection error handling + timeout.
- [x] O-06 | `packages/backend/src/routes/customerDeployments.routes.ts` | `POST /api/customer-deployments/ftp-upload` — `{ versionId, customerId, artifactType }` → uygun generator → FTP upload. Response: `{ success, path }`. AuditLog kaydet.

### O-04 | Sequential Environment Enforcement
- [x] O-07 | `packages/backend/src/routes/customerDeployments.routes.ts` | `/approve` endpoint'inde sequential check: CPM.environments (sıralı array) → mevcut env index bulun → önceki ortamın onayı `APPROVED/COMPLETED` değilse 409 döndür. Mesaj: "Önce {prevEnv} ortamını onaylayın"

### O-05 | Download Audit Trail (Gap 54)
- [x] O-08 | `packages/backend/src/routes/customerDeployments.routes.ts` | HelmChart ve Binary download endpoint'lerinde `logAudit()` çağrısı: action=`DOWNLOAD`, resource=`HELMCHART`/`BINARY_PACKAGE`, resourceId=`${versionId}:${customerId}`

---

## BÖLÜM P — Section 9: Geçiş Sorunları Tamamlama

### P-01 | Issue Stats Endpoint (Gap 78)
- [x] P-01 | `packages/backend/src/routes/transitionIssues.routes.ts` | `GET /api/transition-issues/stats?productId&customerId&from&to` — döndür: `{ totalCount, openCount, resolvedCount, avgResolutionHours, categoryDistribution: Record<string, number>, severityDistribution: Record<string, number> }`

### P-02 | Issue Summary Dashboard Widget (Gap 79)
- [x] P-02 | `packages/backend/src/routes/transitionIssues.routes.ts` | `GET /api/transition-issues/summary` — kurum dashboard widget'ı: `{ critical, high, medium, unassigned, avgResolutionDays }`. Dashboard'daki "Açık Sorunlar" kartı için.

### P-03 | Customer Dashboard Issue Badge (Gap 79)
- [x] P-03 | `packages/backend/src/routes/dashboard.routes.ts` | `GET /api/dashboard/customer/:id` (mevcut endpoint) — response'a `openIssueCount` alanı ekle: `TransitionIssue.count WHERE customerId=X AND status IN ['OPEN','IN_PROGRESS']`

### P-04 | Auto-close Cron Job (Gap 71)
- [x] P-04 | `packages/backend/src/index.ts` | `autoCloseResolvedIssues()` cron: günlük 01:00'de çalışır. `TransitionIssue WHERE status=RESOLVED AND updatedAt < now()-7days` → status CLOSED yaparak batch günceller. Notification gönderir.

### P-05 | Escalation Cron Job (Gap 72)
- [x] P-05 | `packages/backend/src/index.ts` | `escalateCriticalIssues()` cron: saatlik çalışır. `TransitionIssue WHERE severity=CRITICAL AND status=OPEN AND assignedTo IS NULL AND createdAt < now()-4h` → RM rolündeki kullanıcılara Notification yazar.

---

## BÖLÜM Q — Section 10: RBAC Tamamlama

### Q-01 | Email Uniqueness Cross-Table (Gap 95)
- [x] Q-01 | `packages/backend/src/routes/users.routes.ts` | `POST /api/users` ve `PUT /api/users/:id` endpoint'lerinde: email değişiyorsa önce `customerUser.findFirst({ where: { email } })` → varsa 409: "Bu e-posta müşteri kullanıcısı olarak kayıtlı"
- [x] Q-02 | `packages/backend/src/routes/customerUsers.routes.ts` | `POST` ve `PUT` endpoint'lerinde: email önce `user.findFirst({ where: { email } })` kontrol → varsa 409: "Bu e-posta kurum kullanıcısı olarak kayıtlı"

### Q-02 | Last ADMIN Protection (Gap 96)
- [x] Q-03 | `packages/backend/src/routes/users.routes.ts` | `PUT /api/users/:id` (rol değişikliği): kullanıcı ADMIN iken farklı role atanıyorsa → `user.count({ where: { role: 'ADMIN', isActive: true } })` → 1 ise 422: "Son aktif ADMIN'in rolü değiştirilemez"
- [x] Q-04 | `packages/backend/src/routes/users.routes.ts` | `DELETE /api/users/:id` veya deactivate: ADMIN silindi/deaktive → aynı kontrol. Son ADMIN ise 422.

### Q-03 | Customer Invitation Email (Gap 98)
- [x] Q-05 | `packages/backend/src/lib/mailer.ts` (Yeni) | `sendInvitationEmail(email, name, resetToken)` → nodemailer SMTP. Token: JWT `{ email, purpose: 'password-set', exp: 24h }`. Template: "Hesabınız oluşturulmuştur. Şifrenizi belirleyin: [link]"
- [x] Q-06 | `packages/backend/src/routes/customerUsers.routes.ts` | `POST /api/customer-users` (kurum tarafından oluşturma) → başarılı kayıt sonrası `sendInvitationEmail()` çağır
- [x] Q-07 | `packages/backend/src/routes/auth.routes.ts` | `POST /api/auth/set-password` — `{ token, newPassword }` → token doğrula → passwordHash güncelle. CustomerUser ve User tabloları için ortak endpoint.

### Q-04 | Frontend CustomerRoleGuard (Gap 93)
- [x] Q-08 | `packages/frontend/src/components/shared/CustomerRoleGuard.tsx` (Yeni) | Props: `customerRoles: CustomerRole[]`. `useAuthStore()` → `user.customerRole` → roles'a dahil değilse `<Navigate to="/customer-dashboard" />`. Kullanım: portal rotalarında

---

## BÖLÜM R — Section 8: ServiceVersionMatrixPage Refactor (Frontend)

### R-01 | Frontend servis — CustomerServiceVersion API bağlantısı
- [x] R-01 | `packages/frontend/src/services/serviceVersionMatrixService.ts` (Yeni) | Fonksiyonlar:
  - `getMatrix(productId)` → `/api/service-version-matrix?productId`
  - `getByService(serviceId)` → `/api/service-version-matrix/by-service?serviceId`
  - `getByCustomer(customerId, productId)` → `/api/service-version-matrix/by-customer`
  - `getHistory(customerId, serviceId)` → `/api/service-version-matrix/history`
  - `getStale(productId, threshold)` → `/api/service-version-matrix/stale`
  - `getSummary()` → `/api/service-version-matrix/summary`
  - `bootstrap(productId, data)` → `POST /api/service-version-matrix/bootstrap`
  - `exportMatrix(productId, format)` → `/api/service-version-matrix/export`

### R-02 | ServiceVersionMatrixPage refactor
- [x] R-02 | `packages/frontend/src/pages/ServiceVersionMatrixPage.tsx` | Mevcut sayfa CustomerProductMapping kullanıyor. Yeni `CustomerServiceVersion` API'sini kullanacak şekilde refactor et:
  - **Matrix view:** satır=servisler (hiyerarşik), sütun=müşteriler, hücre=release adı + stale badge (✅/⚠️/🔴)
  - **Service view:** servis seç → müşteri listesi + release + stale durumu
  - **Customer view:** müşteri seç → servis listesi + release farkı
  - Hücre popup: detay + history link
  - Export butonu (xlsx)
  - Bootstrap butonu (ADMIN only)

---

## BÖLÜM S — Section 7: Customer Dashboard Tamamlama (Frontend)

### S-01 | CustomerDashboardPage artifact butonları
- [x] S-01 | `packages/frontend/src/pages/CustomerDashboardPage.tsx` | Versiyon kartında artifact aksiyonları:
  - `deploymentModel=SAAS`: "Güncelleme Talep Et" butonu → `POST /api/customer-deployments/request-update`
  - `deploymentModel=ON_PREM, artifactType=DOCKER, hostingType=IAAS`: ortam bazlı onay tablosu + [Onayla] → sequential enforcement
  - `deploymentModel=ON_PREM, artifactType=DOCKER, hostingType=SELF_HOSTED`: [⬇️ HelmChart İndir] butonu
  - `deploymentModel=ON_PREM, artifactType=BINARY`: [⬇️ Paketi İndir] butonu
  - `deploymentModel=ON_PREM, artifactType=GIT_SYNC`: [🔄 Code Sync Başlat →] link

### S-02 | CustomerDashboardPage issue badge
- [x] S-02 | `packages/frontend/src/pages/CustomerDashboardPage.tsx` | Ürün kartında `openIssueCount` badge: `api/dashboard/customer/:id` response'undan → `🐛 N açık sorun` chip (kırmızı, N>0 ise)

### S-03 | Geçiş Planlama — Ortam bazlı tarih girişi
- [x] S-03 | `packages/frontend/src/pages/CustomerDashboardPage.tsx` veya alt bileşen | "Geçiş Planla" modal'ında CPM.environments her ortam için DatePicker → `POST /api/customer-version-transitions` body'de `environment` alanı ile

### S-04 | Gerçekleşen tarih inline girişi (Prod → cascade)
- [x] S-04 | `packages/frontend/src/pages/CustomerDashboardPage.tsx` | Transition tablosunda Prod actualDate hücresine tıklayınca DatePicker → `PATCH /api/customer-version-transitions/:id { actualDate, environment: 'Prod' }` → cascade backend'de tetiklenir

---

## BÖLÜM T — Section 9: ReportIssuePage tamamlama (Frontend)

### T-01 | ReportIssuePage validation + bağlantı
- [x] T-01 | `packages/frontend/src/pages/ReportIssuePage.tsx` | Mevcut sayfada aktif CustomerVersionTransition kontrolü: sayfaya girildiğinde `GET /api/customer-version-transitions?customerId={id}&status=PLANNED,IN_PROGRESS` → yoksa EmptyState hata. Varsa transition dropdown.
- [x] T-02 | `packages/frontend/src/pages/ReportIssuePage.tsx` | Dosya upload alanı: `POST /api/transition-issues/:id/attachments/upload` multipart form. Uzantı + boyut validasyonu (frontend tarafı).

---

## BÖLÜM U — Genel Backend Tamamlama

### U-01 | Customer Dashboard Summary API — Tam
- [x] U-01 | `packages/backend/src/routes/dashboard.routes.ts` | `GET /api/dashboard/customer-products` veya `customer/:id` → ürün kartı response'unda şunları dahil et:
  - `openIssueCount`: TransitionIssue OPEN/IN_PROGRESS count
  - `pendingTransition`: aktif CustomerVersionTransition PLANNED/IN_PROGRESS
  - `currentVersionId`, `latestReleasedVersionId` → güncel mi hesapla
  - `todoCount`: tamamlanmamış CustomerTodoCompletion count

### U-02 | VersionPackageItem'dan Efektif Release Listesi
- [x] U-02 | `packages/backend/src/lib/staleCalculator.ts` | `getServiceReleasesOrdered(serviceId, productId)` — VersionPackageItem tablosundan bu servise ait tüm release'leri createdAt ASC sırasıyla çek → ordered string[] döndür. Stale hesaplamasında kullanılır.

---

## BÖLÜM V — CPM Alanları (Gap 47 FTP + Section 8 cascade için)

### V-01 | CPM FTP + Cluster alanları (schema)
- [x] V-01 | `packages/backend/prisma/schema.prisma` | CustomerProductMapping modeline alanlar ekle:
  - `binaryDistributionMethod String? @default("DOWNLOAD")` — "DOWNLOAD" | "FTP"
  - `ftpHost String?`
  - `ftpPath String?`
  - `ftpCredentials String?` — encrypted string
  - Migration ile uygula

---

## BÖLÜM W — TypeScript + Test Doğrulama

### W-01 | TypeScript hata kontrolü
- [x] W-01 | `packages/backend` | `npx tsc --noEmit` → 0 hata
- [x] W-02 | `packages/frontend` | `npx tsc --noEmit` → 0 hata
- [x] W-03 | Grep doğrulama: `grep -r "firebase" packages/frontend/src` → 0 sonuç
- [x] W-04 | Import doğrulama: tüm yeni servis dosyaları `app.ts`'e mount edilmiş mi kontrol

---

## Öncelikli Sıra

```
1. N-01 → N-04  (schema + migration — her şeyin temeli)
2. N-05         (cascade servis — Section 7 ve 8 için ortak)
3. N-06 → N-09  (matrix API)
4. O-01 → O-08  (artifact delivery)
5. P-01 → P-05  (issue tamamlama)
6. Q-01 → Q-08  (RBAC tamamlama)
7. R-01 → R-02  (frontend matrix refactor)
8. S-01 → S-04  (frontend customer dashboard)
9. T-01 → T-02  (frontend report issue)
10. U-01, U-02  (backend tamamlama)
11. V-01        (CPM alanları)
12. W-01 → W-04 (doğrulama)
```

---

*Toplam: ~40 görev | Kapsam: Section 7 gaps 45-55, Section 8 gaps 56-65, Section 9 gaps 71-79, Section 10 gaps 93-98*
