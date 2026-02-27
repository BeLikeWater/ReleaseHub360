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

### Ürün Eşleştirme Oluşturma — Dialog

```
Müşteri:      [seçili veya ▾ seç]
Ürün:         [Cofins BFF ▾]
Versiyon:     [v3.1.0 ▾]         (o ürünün versiyonları)
Branch:       [production_______]
Notlar:       [__________________]

[İptal]                [Eşleştir]
```

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
| `DELETE /api/customer-product-mappings/:id` | Sil |

---

## Tasarım Notları

- Müşteri adı link olarak stil: `color: primary.main, cursor: pointer`
- Pasif müşteriler: soluk satır rengi `alpha(text.primary, 0.4)`
- Eşleştirme tablosunda versiyon: `monospace font`
- `⋮` menü: Detay / Düzenle / Dashboard'a Git / Sil
