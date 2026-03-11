# Code Sync Yönetimi

**Route:** `/code-sync`  
**Kategori:** Workflow  
**Öncelik:** P1  
**Kaynak:** CodeSyncManagement.js (MCP entegrasyonu korunacak)

---

## Amaç

Servisler arasında kod senkronizasyonunu başlat, takip et. MCP Server entegrasyonu üzerinden çalışır. Farklı ortamlar arası branch kopyalama, conflict resolution, sync geçmişi.

---

## ASCII Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Code Sync Yönetimi                                    [+ Yeni Sync Başlat]  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ [Aktif Syncler (2)] [Bekleyenler (1)] [Tamamlanan] [Hata Verenler (1)]      │
│ ─────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│ [Tab: Aktif Syncler] ─────────────────────────────────────────────────────  │
│                                                                              │
│ ┌─ cofins-bff-api ─────────────────────────────────────────────────────┐    │
│ │ main → production  │  Başlayan: 14:22  │ Tahmini: 5 dk  │ Ali K.  │    │
│ │                                                                      │    │
│ │ [─────────────────────────────────────────────────  ] %73           │    │
│ │                                                                      │    │
│ │ ✅ Kod analiz        ✅ Conflict tarama      🔄 Branch kopyalama...   │    │
│ │                                                                      │    │
│ │ Log:                                                                 │    │
│ │ [14:22:01] Sync başlatıldı                                           │    │
│ │ [14:22:05] Conflict analizi tamamlandı — 0 conflict                 │    │
│ │ [14:22:31] Kopyalama devam ediyor (23/31 dosya)                     │    │
│ │                                                                 [⏹] │    │
│ └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│ ┌─ cofins-file-service ─────────────────────────────────────────────────┐   │
│ │ hotfix/42 → main  │  Başlayan: 14:45  │  🔴 CONFLICT (3 dosya)       │   │
│ │ [Conflict'leri Çöz →]                                                 │   │
│ └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Yeni Sync Başlat — Stepper Wizard

```
Adım 1: Servis & Branch Seçimi
  Servis:        [cofins-bff-api ▾]
  Kaynak Branch: [main ▾]
  Hedef Branch:  [production ▾]
  [İleri →]

Adım 2: Conflict Analizi (otomatik)
  [Analiz ediliyor... ⏳]
  → Conflict bulunmadı ✅  veya
  → 3 conflict bulundu ⚠️ [Detayları Gör]
  [← Geri] [İleri →]

Adım 3: Onay & Başlat
  Servis:  cofins-bff-api
  İşlem:   main → production
  Risk:    Düşük (0 conflict)
  [← Geri] [Sync'i Başlat]
```

---

## Conflict Çözme Ekranı

```
┌─ Conflict Resolution: cofins-file-service ──────────────────────────────────┐
│ 3 dosyada conflict var                                                       │
│                                                                              │
│ Dosya 1: src/services/upload.service.ts                    [Çözüldü ✅]    │
│ Dosya 2: src/config/limits.config.ts                       [Manuel Çöz]     │
│ Dosya 3: package.json                                      [Kaynak Seç]     │
│                                                                              │
│ [src/config/limits.config.ts ─────────────────────────────────────────────]│
│ ┌──────────────────┬──────────────────────────────────────────────────────┐ │
│ │ KAYNAK (main)    │ HEDEF (production)                                   │ │
│ ├──────────────────┼──────────────────────────────────────────────────────┤ │
│ │ maxSize: 50MB    │ maxSize: 25MB                                         │ │
│ │ timeout: 30s     │ timeout: 60s                                          │ │
│ └──────────────────┴──────────────────────────────────────────────────────┘ │
│                                                                              │
│ Karar: ○ Kaynağı kullan  ○ Hedefi koru  ○ Manuel düzenle                   │
│                                                                              │
│ [Tüm Conflictleri Çözdüm → Sync'e Devam Et]                                │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## API Bağlantıları (Backend → MCP Proxy)

| Endpoint | Kullanım |
|---|---|
| `GET /api/sync-history` | Liste |
| `POST /api/sync/analyze` | Branch analizi başlat |
| `POST /api/sync/start` | Sync başlat |
| `GET /api/sync/:id/status` | Canlı durum (polling 5sn) |
| `POST /api/sync/:id/resolve-conflict` | Conflict çöz |
| `DELETE /api/sync/:id` | İptal et |

---

## Real-time Güncelleme

- Aktif sync kartları: `refetchInterval: 5_000` (5 sn poll)
- Log satırları: canlı eklenir — `append` ile

---

## TASK-012: Müşteri Code Sync Akışı — Tasarım Güncellemesi

### Yeni Akış Şeması (Müşteri Perspektifi)

```
CustomerProductVersionsPage
  └─ ArtifactActionButton (GIT_SYNC)
       │
       └─ "Code Sync'e Git" butonu
            ↓ navigate('/code-sync', { state: { customerId, productId,
                                                targetVersionId, sourceVersionId } })
CodeSyncPage
  └─ useLocation() → state okunur
       │
       ├─ Bağlam Banner: "Ethix-NG v2.3.0 → v2.5.0 için sync"
       ├─ Ürün + Servis otomatik seçili (değiştirilebilir)
       ├─ Delta yüklenir: Workitem listesi + PR'lar
       └─ Sync başlat / cherry-pick
```

### 1. Bağlam Banner (CodeSyncPage üstü)

```
┌───────────────────────────────────────────────────────────────┐
│ ℹ️  ACME Corp — Ethix-NG v2.3.0 → v2.5.0 için sync           │
│    Kaynak: v2.3.0 (şu an çalışan)  Hedef: v2.5.0 (PRODUCTION)│
│                                               [Seçimi Değiştir] │
└───────────────────────────────────────────────────────────────┘
```

- `useLocation().state` den customer/product/version bilgileri okunur
- Context yoksa (doğrudan /code-sync'e gidildiyse) banner gösterilmez, manuel seçim
- "Seçimi Değiştir" → selector'ları unlock eder

### 2. CustomerManagement → Code Branch'ler Sekmesi (Admin)

```
[Müşteriler] [Ürün Eşleştirmeleri] [Code Branch'ler]
─────────────────────────────────────────────────────
Filtrele: [Müşteri Seç ▾]                [+ Branch Ekle]

┌──────────────────────────────────────────────────────────────────────────┐
│ Müşteri      │ Branch Adı     │ Repo       │ AzDO Org/Project │ Son Sync │
├──────────────────────────────────────────────────────────────────────────┤
│ ACME Corp    │ main           │ acme-erp   │ acme/erp-project │ 2 gün    │
│              │                │            │                  │ [Düzenle][Sil] │
├──────────────────────────────────────────────────────────────────────────┤
│ Beta Müşteri │ dev/sync       │ beta-core  │ betacorp/main    │ Hiç      │
│              │                │            │                  │ [Düzenle][Sil] │
└──────────────────────────────────────────────────────────────────────────┘
```

#### Branch Ekle / Düzenle Dialog

```
┌─ Code Branch Tanımla ─────────────────────────────────────────────┐
│ Müşteri:     [ACME Corp ▾]                                        │
│ Branch Adı:  [main___________________]                            │
│ Repo Adı:    [acme-erp-repository____]                            │
│ AzDO Org:    [acme-corporation________]  (boşsa ürün org'u)       │
│ AzDO Project:[erp-project_____________]  (boşsa ürün project'i)   │
│ PAT:         [••••••••••••••••]  [Göster/Gizle]                   │
│ Açıklama:    [Prod sync branch_________]                          │
│ Aktif:       [✓]                                                  │
│                                          [İptal] [Kaydet]        │
└───────────────────────────────────────────────────────────────────┘
```

- AzDO Org/Project boş bırakılırsa ürün credentials'ı fallback
- PAT girilmezse ürün PAT'i fallback (farklı org'da ise şart)

### 3. Müşteri Self-Edit (CustomerDashboardPage)

Müşteri kendi dashboard'undan "Code Branch Ayarları" bölümüne erişir:

```
Ürünlerim sekme / bölüm altında:

┌─ Code Branch Ayarları ────────────────────────────────────────────┐
│ Branch Adı:  main                          [Güncelle]             │
│ Repo:        acme-erp-repository           (salt okunur)          │
│ AzDO Org:    acme-corporation              (salt okunur)          │
│ PAT:         [••••••••••]  [Yeni PAT gir]                         │
│ Son Sync:    2 gün önce — ✅ Başarılı                             │
└───────────────────────────────────────────────────────────────────┘
```

- Müşteri yalnızca: `azurePat`, `branchName`, `description` düzenleyebilir
- `azureOrg`, `azureProject`, `repoName` read-only (admin tanımlar)

### 4. CodeSyncPage — Delta Bölümü İyileştirmesi

Mevcut delta (workitem/PR) tablosu korunur. Eklenenler:

```
[Kaynak: v2.3.0 ▾] → [Hedef: v2.5.0 ▾]   Servis: [ethix-ng-bff ▾]
  Branch: [ACME Corp — main ▾]                   [Delta'yı Hesapla]

Delta Sonucu: 3 WorkItem | 7 PR

✨ Feature: Yeni raporlama modülü (WI-1234)
   └─ PR #452: feat: add report endpoints          ☑ Seç
   └─ PR #456: feat: report UI components          ☑ Seç

🐛 Bug: Upload hatası düzeltildi (WI-1240)
   └─ PR #459: fix: file upload size limit         ☑ Seç

⚠️ Zaten sync edilmiş PR'lar gri gösterilir
                          [Tümünü Seç] [Seçilenleri Sync Et →]
```

### 5. Boş State

- `CustomerBranch` tanımlı değilse:
  ```
  ⚠️ Bu müşteri için henüz branch tanımlanmamış.
  Yöneticinizden Code Branch tanımlamasını isteyin
  veya Customer Management → Code Branch'ler'den ekleyin.
  ```
- `sourceVersionId` null ise (cpm.currentVersionId yok):
  ```
  ℹ️ Kaynak versiyon tespit edilemedi. Lütfen manuel seçin.
  ```

---

## Handoff Notu — UX → Backend

**Yeni/Değişen Endpoint İhtiyaçları:**

| Endpoint | Değişiklik |
|---|---|
| `GET /customer-branches?customerId=` | Mevcut — çalışıyor |
| `POST /customer-branches` | YENİ — admin: azureOrg + azureProject eklendi |
| `PUT /customer-branches/:id` | YENİ — admin (tüm alanlar) / müşteri (limitli) |
| `DELETE /customer-branches/:id` | YENİ — soft delete (isActive: false) |
| `GET /code-sync/delta` | Mevcut — credentials fallback güncellenecek |
| `POST /code-sync/start` | Mevcut — credentials fallback güncellenecek |
| `POST /code-sync/conflict-check` | Mevcut — credentials fallback güncellenecek |

**Schema değişikliği (additive):**
- `CustomerBranch.azureOrg String?`
- `CustomerBranch.azureProject String?`

**RM Review bekleniyor:** Hayır (akışkan zincir)

---

## Tasarım Notları

- Progress: `LinearProgress variant="determinate"` + yüzde text
- Log alanı: `<Box component="pre">` — monospace, koyu arka plan, max-height 200px, overflow scroll
- Conflict → kırmızı kart arka planı
- Stepper Wizard: `MUI Stepper` bileşeni, 3 adım
- Diff görünümü: iki panel yan yana `Grid xs={6}`
