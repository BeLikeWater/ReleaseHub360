# Versiyon Listesi (Releases)

**Route:** `/releases`  
**Kategori:** Management  
**Öncelik:** P1  
**Absorbe Edilenler:** ReleaseNotes.js (read-only, versiyon detayında gösterilir)

---

## Amaç

Tüm ürünlere ait versiyonları listele. Yeni versiyon oluştur. Versiyon yaşam döngüsünü (Planlı → Geliştirme → RC → Staging → Yayında → Arşiv) takip et.

---

## ASCII Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Versiyon Listesi          [Ürün ▾] [Aşama ▾] [🔍 Ara...]   [+ Yeni Versiyon]│
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ Ürün          │ Versiyon │ Aşama        │ Hedef Tarih │ Durum │ [⋮] │   │
│  ├───────────────┼──────────┼──────────────┼─────────────┼───────┼─────┤   │
│  │ Cofins BFF    │ v3.2.1   │ 🟡 RC        │ 24 Şub      │ Aktif │ [⋮]│   │
│  │ Cofins BFF    │ v3.2.0   │ ✅ Yayında   │ 10 Şub      │       │ [⋮]│   │
│  │ Cofins File   │ v2.0.0   │ 🔵 Geliştirme│ 27 Şub      │ Aktif │ [⋮]│   │
│  │ Cofins Worker │ v1.8.0   │ 🔵 Planlı    │ 05 Mar      │       │ [⋮]│   │
│  │ Cofins BFF    │ v3.1.0   │ ⬛ Arşiv     │ 05 Oca      │       │ [⋮]│   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  [Satır tıklama → Versiyon Detay Drawer]                                   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

── Versiyon Detay Drawer (sağdan açılır, 600px) ─────────────────────────────
│ Cofins BFF — v3.2.1                                       [Düzenle] [✕]   │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│ Aşama: [Planlı] → [Geliştirme] → [RC] ← (şu an) → [Staging] → [Yayında]  │
│                                                                             │
│ [Genel Bilgi] [Release Notes] [Work Items] [Müşteriler]                    │
│                                                                             │
│ [Genel Bilgi Tab]                                                           │
│ Hedef Tarih: 24 Şubat 2026                                                 │
│ Sağlık Skoru: 🟢 87%    → [Release Health Check'e Git]                     │
│ Oluşturan: Vacit B.                                                         │
│ Açıklama: [düzenlenebilir textarea]                                         │
│                                                                             │
│ [Release Notes Tab]                                                         │
│ Kategoriler: ✨Feature (3) | 🐛 Bug (5) | 🔒 Security (1) | ⚠️ Breaking(1)│
│ Her kategori expand/collapse                                                │
│                                                                             │
│ [Müşteriler Tab]                                                            │
│ Bu versiyona geçiş yapacak müşteriler listesi                              │
│                                                                             │
│ Eylemler:                                                                   │
│ [Aşamayı İlerlet ▸]  [Release Health Check]  [Arşivle]                    │
──────────────────────────────────────────────────────────────────────────────
```

---

## Versiyon Yaşam Döngüsü (State Machine)

```
Planlı → Geliştirme → RC (Release Candidate) → Staging → Yayında → Arşiv
                                                              ↑
                                               Hotfix burada da devreye girer
```

- İlerleme sadece sırayla olabilir (geri gidemez, Arşiv hariç)
- "Aşamayı İlerlet" → confirm dialog → PATCH `/api/product-versions/:id/phase`

---

## Yeni Versiyon Oluşturma Dialog

```
┌─ Yeni Versiyon ─────────────────────────────────────────────┐
│ Ürün:        [Cofins BFF ▾]                                 │
│ Versiyon:    [v3.2.1________]  (semantic versioning)        │
│ Başlangıç:   Planlı (sabit)                                 │
│ Hedef Tarih: [📅 Tarih seç]                                 │
│ Açıklama:    [__________________________________]           │
│              [__________________________________]           │
│                                                             │
│              [İptal]           [Oluştur]                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Aşama Chip Renkleri

| Aşama | Renk | MUI color |
|---|---|---|
| Planlı | Mavi | `info` |
| Geliştirme | Mavi koyu | `primary` |
| RC | Turuncu | `warning` |
| Staging | Mor | `secondary` |
| Yayında | Yeşil | `success` |
| Arşiv | Gri | `default` |

---

## API Bağlantıları

| Endpoint | Kullanım |
|---|---|
| `GET /api/product-versions` | Liste (filtrelenmiş) |
| `POST /api/product-versions` | Yeni versiyon |
| `GET /api/product-versions/:id` | Drawer detay |
| `PATCH /api/product-versions/:id/phase` | Aşama ilerlet |
| `PUT /api/product-versions/:id` | Genel güncelleme |
| `GET /api/release-notes?versionId=x` | Release Notes tab |
| `GET /api/tfs/work-items?versionId=x` | Work Items tab |
| `GET /api/customer-version-mappings?versionId=x` | Müşteriler tab |

---

## Tasarım Notları

- Versiyon sütunu: `monospace font` — `fontFamily: 'monospace'`
- Aşama stepper: `MUI Stepper horizontal` — ilerlemek için geçici olmayan adımlar
- `⋮` menü: Düzenle / Aşama İlerlet / Arşivle / Sil
- Sil: Sadece Planlı aşamasında aktif
