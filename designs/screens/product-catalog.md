# Ürün Kataloğu

**Route:** `/products`  
**Kategori:** Management  
**Öncelik:** P1  
**Absorbe Edilenler:** ApiManagement, ModuleManagement, ModuleGroupManagement, ProductManagement

---

## Amaç

Ürün, servis, API ve modül hiyerarşisini tek yerden yönet. Bir ürünün hangi servislerden oluştuğunu, hangi API'leri sunduğunu ve hangi modüllerden yapılandığını göster ve düzenle.

---

## ASCII Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Ürün Kataloğu                                        [+ Yeni Ürün]          │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Ürünler] [Servisler] [API'ler] [Modüller] [Modül Grupları]                │
│  ─────────────────────────────────────────────────────────                  │
│                                                                              │
│  [Tab: Ürünler] ──────────────────────────────────────────────────────────  │
│                                                                              │
│  🔍 Ara...   [Filtre ▾]                              Toplam: 7 ürün         │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Ürün Adı         │ Servis Sayısı │ Aktif Versiyon │ Durum   │ Aksiyon │ │
│  ├──────────────────┼───────────────┼────────────────┼─────────┼─────────┤ │
│  │ Cofins BFF       │ 3             │ v3.2.1         │ ✅Aktif │ [⋮]    │ │
│  │ Cofins File Svc  │ 1             │ v2.0.0         │ ✅Aktif │ [⋮]    │ │
│  │ Cofins Worker    │ 2             │ v1.8.0         │ 🟡 Dev  │ [⋮]    │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  [Satıra tıklama → sağ drawer açılır: ürün detayı + bağlı servisler]       │
│                                                                              │
│  [Tab: Servisler] ─────────────────────────────────────────────────────────  │
│                                                                              │
│  Filtre: [Ürün ▾] 🔍 Ara...                                                │
│                                                                              │
│  Grid kartlar — her servis bir kart:                                        │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐               │
│  │ cofins-bff-api  │ │ cofins-file-svc │ │ cofins-worker   │               │
│  │ Ürün: Cofins BFF│ │ Ürün: File Svc  │ │ Ürün: Worker    │               │
│  │ Repo: git-url   │ │ Port: 8080      │ │ Port: 9090      │               │
│  │ [Düzenle] [Sil] │ │ [Düzenle] [Sil] │ │ [Düzenle] [Sil] │               │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Tab Yapısı (5 Tab)

### Tab 1 — Ürünler
- DataGrid: Ürün adı, Açıklama, Servis sayısı, Aktif versiyon, Durum, Aksiyon menü
- Satıra tıklayınca: **Sağ Drawer** — ürün detayı, bağlı servisler listesi, son versiyonlar
- CRUD: + Yeni Ürün (dialog), Düzenle (drawer içinde), Sil (confirm dialog)

### Tab 2 — Servisler
- Grid kart layoutu (3 kolon)
- Her kart: Servis adı, Ürün adı, Port, Repo URL, Durum
- Kart sağ üst: `...` menü (Düzenle / Sil)
- Filtre: Ürüne göre

### Tab 3 — API'ler
- DataGrid: API adı, Servis, HTTP method (Chip), Path, Durum (aktif/deprecated), Breaking change flag
- Breaking change → kırmızı badge
- Detay drawer: Request/Response model

### Tab 4 — Modüller
- DataGrid: Modül adı, Grup, Bağlı servisler, Açıklama
- Hiyerarşik görünüm: Modül Grubu → Modüller (collapse/expand)

### Tab 5 — Modül Grupları
- Basit DataGrid: Grup adı, Modül sayısı, Açıklama
- CRUD işlemleri

---

## CRUD Pattern (tüm tablolar için aynı)

```
Oluştur: [+ Yeni X] buton → Dialog form → POST /api/x
Okuma:   DataGrid satır → Sağ drawer detay
Güncelle: Drawer içinde [Düzenle] → form alanları aktif → PUT /api/x/:id
Sil:      ⋮ menü → [Sil] → Confirm dialog ("X silinecek. Bağlı verileri etkiler.") → DELETE /api/x/:id
```

---

## API Bağlantıları

| Endpoint | Kullanım |
|---|---|
| `GET /api/products` | Ürünler tablosu |
| `POST /api/products` | Yeni ürün |
| `PUT /api/products/:id` | Güncelle |
| `DELETE /api/products/:id` | Sil |
| `GET /api/services?productId=x` | Servisler tab |
| `GET /api/apis?serviceId=x` | API'ler tab |
| `GET /api/modules?groupId=x` | Modüller tab |
| `GET /api/module-groups` | Modül Grupları tab |

---

## Boş State

- Her tab için: "Henüz [ürün/servis/API] eklenmemiş. [+ Yeni X Ekle]"

## Tasarım Notları

- Tab'lar: `MUI Tabs` — `scrollable` özelliği aktif (mobil için)
- DataGrid'ler: `density="compact"` — daha fazla satır görmek için
- Drawer: `width: 500px`, sağdan açılır, backdrop ile
