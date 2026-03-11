# Müşteri Yönetimi

**Route:** `/customers`  
**Kategori:** Management  
**Öncelik:** P1  
**Absorbe Edilenler:** CustomerProductMappingV2.js (tab olarak)

---

## Amaç

Müşterileri listele, ekle, düzenle. Her müşterinin hangi ürünlere abone olduğunu yönet. Müşteriye tıklayınca o müşterinin dashboard'una git.

---

## ASCII Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Müşteri Yönetimi                                          [+ Yeni Müşteri]  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ [Müşteriler] [Ürün Eşleştirmeleri]                                          │
│ ─────────────────────────────────                                           │
│                                                                              │
│ [Tab: Müşteriler] ────────────────────────────────────────────────────────  │
│                                                                              │
│ 🔍 Ara...   [Durum ▾]                                    Toplam: 42 müşteri │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────┐    │
│ │ Müşteri Adı  │ Kod    │ Ürün Sayısı │ Durum    │ Son Güncelleme │[⋮]│    │
│ ├──────────────┼────────┼─────────────┼──────────┼────────────────┼───┤    │
│ │ Akbank       │ AKB001 │ 3           │ ✅Aktif  │ 15 Şub 2026   │[⋮]│    │
│ │ Garanti BBVA │ GAR001 │ 2           │ ✅Aktif  │ 10 Şub 2026   │[⋮]│    │
│ │ İş Bankası   │ ISB001 │ 1           │ ✅Aktif  │ 05 Şub 2026   │[⋮]│    │
│ │ Test Müşteri │ TST001 │ 0           │ 🟡Pasif  │ 01 Oca 2026   │[⋮]│    │
│ └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│ [Müşteri adına tıkla → /customers/:id/dashboard yönlendir]                 │
│                                                                              │
│ [Tab: Ürün Eşleştirmeleri] ──────────────────────────────────────────────── │
│                                                                              │
│ Filtre: [Müşteri ▾] [Ürün ▾] [Sürüm Aşaması ▾]                            │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────┐    │
│ │ Müşteri      │ Ürün        │ Versiyon │ Branch     │ Notlar  │ [⋮]  │    │
│ ├──────────────┼─────────────┼──────────┼────────────┼─────────┼──────┤    │
│ │ Akbank       │ Cofins BFF  │ v3.1.0   │ production │ -       │ [⋮] │    │
│ │ Akbank       │ Cofins File │ v1.9.0   │ production │ -       │ [⋮] │    │
│ │ Garanti BBVA │ Cofins BFF  │ v3.0.5   │ production │ pilot   │ [⋮] │    │
│ └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│ [+ Eşleştirme Ekle]                                                         │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## CRUD İşlemleri

### Müşteri Oluşturma / Düzenleme — Drawer (500px)

```
Müşteri Adı:     [__________________________]
Müşteri Kodu:    [__________________________]  (unique, otomatik oluştur?)
E-posta:         [__________________________]
Telefon:         [__________________________]
Adres:           [__________________________]
Durum:           ○ Aktif  ○ Pasif
Notlar:          [__________________________]
                 [__________________________]

[İptal]                          [Kaydet]
```

### Ürün Eşleştirme Oluşturma / Düzenleme — Modal (800px geniş)

Modal iki bölümden oluşur: sol taraf eşleştirme meta bilgileri, sağ taraf Lisans Ağacı.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Ürün Eşleştirme                                                         [✕] │
├───────────────────────────┬─────────────────────────────────────────────────┤
│  Eşleştirme Bilgileri    │  Lisans Ağacı                                   │
│  ─────────────────────── │  ──────────────────────────────────────────────  │
│  Müşteri:                 │  ☑ Cofins BFF                                   │
│  [Akbank              ▾]  │    ☑ Core Banking (3/3 servis)                  │
│                           │      ☑ Account Management (2/2)                 │
│  Ürün:                    │          ☑ account-api                           │
│  [Cofins BFF          ▾]  │          ☑ account-query-svc                    │
│                           │      ☑ Transaction (1/1)                        │
│  Versiyon:                │          ☑ transaction-svc                      │
│  [v3.1.0              ▾]  │    [−] Reporting (2/3 servis)            ← indt │
│                           │      ☑ Analytics (2/2)                          │
│  Branch:                  │          ☑ analytics-api                        │
│  [production__________]   │          ☑ analytics-worker                     │
│                           │      [−] Export (0/1)                   ← indt  │
│  Lisans Etiketleri:        │          ☐ export-svc                           │
│  [enterprise  ×] [+]      │                                                 │
│                           │  ──────────────────────────────────────────────  │
│  Notlar:                  │  Lisanslı: 5 / 6 servis                         │
│  [_____________________]  │  [Tümünü Seç]  [Tümünü Kaldır]                 │
│                           │                                                 │
├───────────────────────────┴─────────────────────────────────────────────────┤
│                                                  [İptal]    [Kaydet]        │
└─────────────────────────────────────────────────────────────────────────────┘
```

**İnteraksiyon Kuralları:**

| Aksiyon | Sonuç |
|---|---|
| Ürün seçildiğinde | `GET /api/products/:id/license-tree` çağrılır, ağaç yüklenir |
| Yeni eşleştirme açıldığında | Tüm node'lar ☑ (tam seçili) varsayılan |
| Mevcut eşleştirme düzenleme | `licensedModuleGroupIds / ModuleIds / ServiceIds` ile pre-populate |
| Parent checkbox tıklama (☑ → ☐) | Tüm child node'lar ☐ olur (cascade deselect) |
| Parent checkbox tıklama (☐ → ☑) | Tüm child node'lar ☑ olur (cascade select) |
| Child node değiştiğinde | Parent: hepsi seçili = ☑ / hepsi boş = ☐ / karışık = [−] (indeterminate) |
| [Tümünü Seç] | Tüm node'lar ☑ |
| [Tümünü Kaldır] | Tüm node'lar ☐ |
| Ürün değiştirilirse | Ağaç sıfırlanır, yeni ürünün tree'si yüklenir |

**Lisans Etiketleri (licenseTags):**
- MUI Autocomplete `freeSolo` + `multiple` + chip → kullanıcı "enterprise", "pilot", "beta" gibi serbest tag girebilir
- Zorunlu değil — boş bırakılabilir

**Loading / Edge Case:**
- Ağaç yüklenirken: skeleton (3 satır MUI Skeleton)
- Ürünün hiç ModuleGroup'u yoksa: `"Bu ürüne henüz modül tanımlanmamış"` uyarı kutusu (Alert severity="info")
- Tüm servisler deselect edilirse: sarı uyarı → `"En az bir servis lisanslanmalı"` (save bloke DEĞİL, uyarı amaçlı)

---

## SECTION 7 — Lisans Ağacı Bileşeni Spesifikasyonu

### Bileşen: `LicenseTree`

Müşteri-ürün eşleştirme modalinde ve ileride başka ekranlarda kullanılmak üzere tasarlanmış yeniden kullanılabilir MUI checkbox ağacı.

**Props:**
```typescript
interface LicenseTreeProps {
  productId: number;                       // License tree fetch için
  value: LicenseSelection;                 // Dışarıdan kontrol edilen seçim
  onChange: (selection: LicenseSelection) => void;
  readOnly?: boolean;                      // Sadece görüntüleme modu
}

interface LicenseSelection {
  licensedModuleGroupIds: number[];
  licensedModuleIds: number[];
  licensedServiceIds: number[];
}
```

**API Yanıt Şekli — `GET /api/products/:id/license-tree`:**
```json
{
  "productId": 61,
  "productName": "Cofins BFF",
  "moduleGroups": [
    {
      "id": 151,
      "name": "Core Banking",
      "modules": [
        {
          "id": 164,
          "name": "Account Management",
          "services": [
            { "id": 74, "name": "account-api" },
            { "id": 75, "name": "account-query-svc" }
          ]
        }
      ]
    }
  ]
}
```

**MUI Bileşen Seçimi:**
- `Checkbox` + `indeterminate` prop (MUI built-in)
- `Collapse` / `TreeView` yerine basit `<Box sx={{ pl: 3 }}>` nesting (TreeView deprecated MUI v7)
- Her node: `FormControlLabel` + `Checkbox`

**Renk / Stil:**
- Seçili node label: `text.primary`
- Deselected node label: `text.disabled` (hafif solar)
- Lisanslı servis sayısı badge: `<Chip size="small" label="5/6" color="primary" />`

---

## Handoff Notu — UX → Backend Developer

**Tarih:** 2025  
**Hazırlayan:** UX Designer

### Backend'in İnşa Etmesi Gerekenler

1. **`GET /api/products/:id/license-tree`**
   - Yanıt: `{ productId, productName, moduleGroups: [{ id, name, modules: [{ id, name, services: [{ id, name }] }] }] }`
   - Auth: JWT zorunlu, rol kısıtı yok
   - ModuleGroup'u olmayan product → `{ moduleGroups: [] }` döner

2. **`PUT /api/customer-product-mappings/:id/license`**
   - Body: `{ licensedModuleGroupIds, licensedModuleIds, licensedServiceIds, licenseTags }`
   - Yanıt: güncellenmiş mapping objesi
   - Auth: `ADMIN` veya `RELEASE_MANAGER`

3. **Schema değişiklikleri:**
   - `subscriptionLevel String?` → KALDIR
   - `subscribedModuleGroupIds` → `licensedModuleGroupIds` RENAME
   - `subscribedModuleIds` → `licensedModuleIds` RENAME
   - `subscribedServiceIds` → `licensedServiceIds` RENAME
   - `licenseTags String[] @default([])` → EKLE

4. **`GET /api/customer-product-mappings`** yanıtına `licensedServiceIds`, `licenseTags`, `licensedModuleGroupIds`, `licensedModuleIds` alanları eklenecek

### Frontend'in Beklediği
- `LicenseTree` bileşeni `productId` prop alarak kendi verisini fetch eder
- Modal open'da selection pre-populate için mapping'deki `licensed*Ids` dönmeli
- Kaydet'te tek endpoint: `PUT /api/customer-product-mappings/:id/license`

**RM Review bekleniyor:** UX tasarımı tamamlandı, Backend başlayabilir.

---

## API Bağlantıları

| Endpoint | Kullanım |
|---|---|
| `GET /api/customers` | Müşteri listesi |
| `POST /api/customers` | Yeni müşteri |
| `PUT /api/customers/:id` | Güncelle |
| `DELETE /api/customers/:id` | Sil |
| `GET /api/customer-product-mappings` | Eşleştirme tab |
| `POST /api/customer-product-mappings` | Yeni eşleştirme |
| `PUT /api/customer-product-mappings/:id` | Güncelle |
| `PUT /api/customer-product-mappings/:id/license` | Lisans ağacı kaydet (TASK-008) |
| `DELETE /api/customer-product-mappings/:id` | Sil |
| `GET /api/products/:id/license-tree` | Ürün hiyerarşisi — LicenseTree için (TASK-008) |

---

## Handoff Notu — Backend → Frontend Developer

**Tarih:** 2025  
**Hazırlayan:** Backend Developer

### Tamamlanan Değişiklikler

1. **Schema migration uygulandı:**
   - `subscriptionLevel` → **kaldırıldı**
   - `subscribedModuleGroupIds` → `licensedModuleGroupIds` **(renamed)**
   - `subscribedModuleIds` → `licensedModuleIds` **(renamed)**
   - `subscribedServiceIds` → `licensedServiceIds` **(renamed)**
   - `licenseTags String[] @default([])` → **eklendi**

2. **Yeni endpoint:** `GET /api/products/:id/license-tree`
   - Yanıt: `{ productId, productName, moduleGroups: [{ id, name, modules: [{ id, name, services: [{ id, name }] }] }] }`
   - Auth: JWT gerekli, rol kısıtı yok

3. **Yeni endpoint:** `PUT /api/customer-product-mappings/:id/license`
   - Body: `{ licensedModuleGroupIds: string[], licensedModuleIds: string[], licensedServiceIds: string[], licenseTags: string[] }`
   - Auth: `ADMIN` veya `RELEASE_MANAGER`
   - Yanıt: güncellenmiş mapping (customer + productVersion include)

4. **`effectiveServices.ts` güncellendi:** Yeni lisans modeline göre çalışıyor

### Frontend'in Yapması Gerekenler

- `LicenseTree` reusable component: `src/components/LicenseTree.tsx`
- `useQuery(['license-tree', productId])` → `GET /api/products/:id/license-tree`
- Eşleştirme modalinde pre-populate: mevcut mapping'in `licensedModuleGroupIds`, `licensedModuleIds`, `licensedServiceIds` değerlerini tree'ye ver
- Kaydet: `useMutation` → `PUT /api/customer-product-mappings/:id/license`
- Lisans sayısı badge: `licensedServiceIds.length / toplam servis sayısı`

**RM Review bekleniyor:** Backend tamamlandı, Frontend başlayabilir.

---

## Tasarım Notları

- Müşteri adı link olarak stil: `color: primary.main, cursor: pointer`
- Pasif müşteriler: soluk satır rengi `alpha(text.primary, 0.4)`
- Eşleştirme tablosunda versiyon: `monospace font`
- `⋮` menü: Detay / Düzenle / Dashboard'a Git / Sil
