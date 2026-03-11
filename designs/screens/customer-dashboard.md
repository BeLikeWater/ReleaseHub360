# Müşteri Dashboard

**Route:** `/customers/:id/dashboard`  
**Kategori:** Dashboard  
**Öncelik:** P1  
**Absorbe Edilenler:** CustomerReleaseTrackV2.js, CustomerServiceMapping.js

---

## Amaç

Belirli bir müşteriye ait tüm ürün versiyonları, servis durumları, release takibi ve branch bilgilerini tek ekranda gör. Müşteri bazlı operasyonel görünüm.

---

## ASCII Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ← Müşteri Dashboard: Akbank                       [Müşteriyi Düzenle] [⋮]  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│ │ 3            │  │ 2            │  │ v3.1.0       │  │ 14 Mar 2026  │     │
│ │ Aktif Ürün   │  │ Bekl. Güncell│  │ En Son Ver.  │  │ Son Deploy   │     │
│ └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                                              │
│ [Özet] [Release Takibi] [Servis Eşleştirme] [Geçmiş]                       │
│ ─────────────────────────────────────────────────────                       │
│                                                                              │
│ [Tab: Özet] ──────────────────────────────────────────────────────────────  │
│                                                                              │
│ ┌─ Ürün & Versiyon Durumu ──────────────────────────────────────────────┐  │
│ │ Ürün          │ Müşteri Versiyonu │ Güncel Versiyon │ Durum            │  │
│ ├───────────────┼──────────────────┼─────────────────┼──────────────────┤  │
│ │ Cofins BFF    │ v3.1.0           │ v3.2.1          │ ⚠️ Güncelleme var │  │
│ │ Cofins File   │ v1.9.0           │ v1.9.0          │ ✅ Güncel        │  │
│ │ Cofins Worker │ v1.7.2           │ v1.8.0          │ ⚠️ Güncelleme var │  │
│ └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│ [Tab: Release Takibi] ──────────────────────────────────────────────────── │
│                                                                              │
│ Cofins BFF:  v3.1.0 → v3.2.0 → v3.2.1    Hedef: v3.2.1  📅 24 Şub        │
│ [─────────────────────────●────────────────────────────────]                │
│  Başlangıç            Şu an                               Hedef             │
│                                                                              │
│ Cofins Worker: v1.7.2 → v1.8.0            Hedef: v1.8.0  📅 05 Mar         │
│ [─────────────────●──────────────────────────────────────]                  │
│                                                                              │
│ [Tab: Servis Eşleştirme] ──────────────────────────────────────────────── │
│ Filtre: [Ürün ▾]                                                            │
│ ┌──────────────────────────────────────────────────────────┐               │
│ │ Servis             │ Port    │ Branch     │ Environment  │               │
│ ├────────────────────┼─────────┼────────────┼──────────────┤               │
│ │ cofins-bff-api     │ 8080    │ production │ prod         │               │
│ │ cofins-file-service│ 8090    │ production │ prod         │               │
│ └──────────────────────────────────────────────────────────┘               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Tab Yapısı

### Tab 1 — Özet
- 4 StatCard (aktif ürün, bekleyen güncelleme, en son versiyon, son deploy)
- Ürün & Versiyon Durumu tablosu — "Güncelleme var" linki → Release Health Check
- Güncelleme var → "Güncelleme Planla" CTA butonu

### Tab 2 — Release Takibi
- Her ürün için bir progress bar
- Progress: Müşterinin versiyonu / Güncel versiyon / Hedef versiyon
- Timeline bileşeni — geçmiş deployment tarihleri
- Yaklaşan deployment tarihleri

### Tab 3 — Servis Eşleştirme
- CustomerServiceMapping absorbed
- Servis, port, branch, environment, SSL durumu, ip whitelist

### Tab 4 — Geçmiş
- Deployment geçmişi, versiyon geçişleri, notlar
- Tarih sıralı liste

---

## API Bağlantıları

| Endpoint | Kullanım |
|---|---|
| `GET /api/customers/:id` | Müşteri detayı (breadcrumb, stat) |
| `GET /api/customer-product-mappings?customerId=x` | Ürün versiyon tablosu |
| `GET /api/customer-release-tracking?customerId=x` | Release Takibi tab |
| `GET /api/customer-service-mappings?customerId=x` | Servis Eşleştirme tab |
| `GET /api/deployment-history?customerId=x` | Geçmiş tab |

---

## Tasarım Notları

- "Güncelleme var" → sarı `WarningAmber` ikonu + `warning.main` renk
- "Güncel" → yeşil `CheckCircle` ikonu
- Progress bar: `LinearProgress` bileşeni, mavi themed
- Breadcrumb: `Müşteri Yönetimi > Akbank`

---

## TASK-009 — IaaS Helm Chart Onaylama

**Route:** `/customers/:customerId/products/:productId`  
**Bileşen:** `CustomerProductVersionsPage.tsx`  
**Değişen bölüm:** "Paketler" accordion → `ArtifactActionButton` → HELM_CHART satırı

### Senaryo Matrisi

| deploymentModel | hostingType | HELM_CHART butonu |
|---|---|---|
| ON_PREM | SELF_HOSTED | "HelmChart İndir" (mevcut, değişmez) |
| ON_PREM | IAAS | "Helm Onayla" (yeni) |
| SAAS | — | mevcut davranış |

### Paketler Tablosu — IaaS Satırı

```
┌──────────────────────────────────────────────────────────────────┐
│ 📦 İndirilebilir Paketler                                        │
├───────────────┬──────────────┬──────────┬────────────────────────┤
│ Paket         │ Tür          │ Versiyon │ Aksiyon                │
├───────────────┼──────────────┼──────────┼────────────────────────┤
│ ethix-ng-helm │ ⛵ HELM CHART│ v3.2.1   │ [✅ Helm Onayla]       │
│               │              │          │  warning/contained     │
├───────────────┼──────────────┼──────────┼────────────────────────┤
│ (önceki onay) │              │          │ ✓ Onaylandı 03 Mar     │
└───────────────┴──────────────┴──────────┴────────────────────────┘
```

Buton: `color="warning" variant="contained"` + `VerifiedOutlined` ikon  
Son onay chip: `GET /api/customer-deployments/approvals?customerProductMappingId=X` → son kayıt

### Onay Dialog'u

```
┌──────────────────────────────────────────────────┐
│  Helm Chart Onayı                              X │
├──────────────────────────────────────────────────┤
│  ℹ️  IaaS Helm deposu güncelleme onayı           │
│                                                  │
│  Ürün: Ethix NG v3.2.1                          │
│                                                  │
│  Ortam: [________________] ← required            │
│           (CPM.environment varsa pre-fill)       │
│                                                  │
│  Yorum (isteğe bağlı):                          │
│  [__________________________________________]    │
│  [__________________________________________]    │
│                                                  │
├──────────────────────────────────────────────────┤
│                   [İptal]  [✅ Onaylıyorum]     │
└──────────────────────────────────────────────────┘
```

- `maxWidth="sm"`, `disableEscapeKeyDown`
- "Onaylıyorum": `color="success" variant="contained"` — loading: `CircularProgress size={18}`
- Başarı Snackbar: `"Onay gönderildi. Kurum ekibi bilgilendirildi."` (5 sn)

### Prop Zinciri

```
mapping?.hostingType → VersionCard (cpmHostingType)
mapping?.id          → VersionCard (cpmId)
  ↓ VersionPackagesSection (hostingType, cpmId)
    ↓ ArtifactActionButton (hostingType, mappingId)
```

### API Çağrıları

| Endpoint | Tetikleyici |
|---|---|
| `POST /api/customer-deployments/approve` | "Onaylıyorum" tıklanınca |
| `GET /api/customer-deployments/approvals?customerProductMappingId=X` | Paket satırı açılınca (IAAS+HELM_CHART) |

### Handoff Notları — UX → Backend

- Backend `/approve` endpoint mevcut; `hostingType: IAAS` metadata'ya dahil edilmeli
- Notification mesajı: `"Müşteri X, Ürün Y vZ.Z.Z IaaS Helm onayı verdi."`
- RM Review bekleniyor: Hayır (akışkan mod)

---

## TASK-010 — SaaS Deployment Modelinde Aksiyon Butonu Düzeltmesi

**Tarih:** 2026-03-06
**Bağlı task:** `tasks/open/TASK-010.md`

### Sorun

`ArtifactActionButton` kararını `cpmArtifactType` + `hostingType` üzerinden veriyor;
`deploymentModel` hiç kullanılmıyor. SaaS müşteri DOCKER artifact tipiyle eşleştiğinde
"Güncelleme Onayla" butonu geliyor — oysa müşteri uygulamayı barındırmıyor, yalnızca
**güncelleme talep edebilir**.

### Düzeltilmiş Aksiyon Matrisi

| deploymentModel | hostingType   | packageType  | cpmArtifactType | Aksiyon Butonu         |
|-----------------|---------------|--------------|-----------------|------------------------|
| `SAAS`          | (herhangi)    | (herhangi)   | (herhangi)      | **Güncelleme Talep Et** |
| `ON_PREM`       | `IAAS`        | `HELM_CHART` | —               | **Helm Onayla**         |
| `ON_PREM`       | `SELF_HOSTED` | `HELM_CHART` | —               | **HelmChart İndir**     |
| `ON_PREM`       | (herhangi)    | `BINARY`     | —               | **Paket İndir**         |
| `ON_PREM`       | (herhangi)    | —            | `DOCKER`        | **Güncelleme Onayla**   |
| `ON_PREM`       | (herhangi)    | —            | `GIT_SYNC`      | **Code Sync'e Git**     |
| `null` / tanımsız | —           | —            | —               | artifact-type fallback  |

> **Kural sırası:** `deploymentModel === 'SAAS'` kontrolü her şeyden önce gelir.

### Karar Ağacı (Kod Akışı)

```
ArtifactActionButton(deploymentModel, hostingType, cpmArtifactType, pkg)
  │
  ├─ deploymentModel === 'SAAS'
  │     └─► "Güncelleme Talep Et"  (her paket tipi için)
  │
  ├─ pkg.packageType === 'HELM_CHART'
  │     ├─ hostingType === 'IAAS'  → "Helm Onayla" (dialog)
  │     └─ diğer                  → "HelmChart İndir"
  │
  ├─ pkg.packageType === 'BINARY'  → "Paket İndir"
  │
  ├─ cpmArtifactType === 'DOCKER'  → "Güncelleme Onayla"
  │
  ├─ cpmArtifactType === 'GIT_SYNC' → "Code Sync'e Git"
  │
  └─ fallback → "Güncelleme Talep Et"
```

### Prop Zinciri Güncellemesi

```
mapping?.deploymentModel  →  VersionCard (cpmDeploymentModel)
  ↓ VersionPackagesSection (deploymentModel)
    ↓ ArtifactActionButton (deploymentModel)
```

`mapping?.hostingType`, `mapping?.id`, `mapping?.environment` zinciri TASK-009'dan mevcut; bu task yalnızca `deploymentModel` ekler.

### Handoff Notları — UX → Frontend

- Backend değişikliği yok; `deploymentModel` zaten CPM API'dan dönüyor.
- Frontend'de tek değişiklik: `deploymentModel` prop zincire eklenir + karar ağacına `SAAS` öncelikli dal yazılır.
- RM Review bekleniyor: Hayır (akışkan mod)
