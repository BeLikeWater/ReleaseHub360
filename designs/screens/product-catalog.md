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

---

## Servis Dialog — Stage & Pipeline Sekmesi (Güncel)

Servis oluşturma/düzenleme diyaloğunun **"Stage & Pipeline"** sekmesi. Kullanıcı burada release pipeline adı ve stage bilgilerini yapılandırır.

### ASCII Layout — Stage & Pipeline Sekmesi

```
┌─────────────────────────────────────────────────────────────┐
│  [Temel]  [Stage & Pipeline ●]  [Docker / Binary]           │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│  PİPELİNE BİLGİLERİ                                        │
│                                                             │
│  Pipeline Adı  [________________________]                   │
│                                                             │
│  Release Adı   [________________________]                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ☑  Release ayrı project'tedir                       │   │
│  └──────────────────────────────────────────┬──────────┘   │
│                                             │              │
│  (checkbox işaretliyse aşağıdaki alan açılır ▼)            │
│  Release Project  [________________________]                │
│                    örn: SharedReleases                      │
│                                                             │
│  ─────────────────────────────────────────────────────     │
│  STAGE KONFİGÜRASYONU (İkili Stage)                        │
│                                                             │
│  [Prod Stage Adı ______] [Prep Stage Adı ______]           │
│  [Prod Stage ID  ______] [Prep Stage ID  ______]           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Davranış Kuralları

| Durum | Görünüm |
|---|---|
| Checkbox `kapalı` (default) | Release Project alanı gizli (`Collapse` animasyonu ile) |
| Checkbox `açık` | Release Project alanı görünür, focus verilir |
| Checkbox `kapalı` iken veri varmış olsa bile | Kayıt sırasında `releaseProject: null` gönderilir |
| Kayıt yüklenirken `releaseProject` dolu | Checkbox otomatik `açık`, alan değeriyle dolar |

### Bileşen Kararları
- **Checkbox:** `MUI FormControlLabel` + `Checkbox` — label yanında
- **Conditional alan:** `MUI Collapse` (`in={releaseProjectOverride}`) — smooth animasyonlu açılış
- **Placeholder:** `örn: SharedReleases`
- **Helper text:** "Boş bırakılırsa ürün ayarlarındaki Release Project kullanılır"
- **ServiceRow kart:** `releaseProject` dolu ise `Chip size="small"` ile `proj: SharedReleases` gösterilir

### Boş State
- Checkbox açılınca alan boş — placeholder ile yönlendirme yeterli
- Kayıt edilmeden sekme değiştirilirse veri kaybolmaz (state korunur)

---

---

## Servis Dialog — Stage & Pipeline Sekmesi — Release Bilgileri Bölümü (TASK-003)

Mevcut Stage & Pipeline sekme içeriğinin **altına** eklenen yeni bölüm. Pipeline konfigürasyonuyla ilgili olduğu için ayrı sekme yerine aynı sekme içinde gruplanır.

### ASCII Layout — Release Bilgileri Bölümü

```
┌─────────────────────────────────────────────────────────────┐
│  [Temel]  [Stage & Pipeline ●]  [Docker / Binary]           │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│  PİPELİNE BİLGİLERİ                                        │
│  ... (mevcut alanlar) ...                                   │
│                                                             │
│  ─────────────────────────────────────────────────────     │
│  RELEASE BİLGİLERİ                                         │
│                                                             │
│  PRODUCTION (düzenlenebilir)                               │
│  Son Prod Release   [________________________]              │
│                      örn: 1.0.20260215.3                   │
│                                                             │
│  Son Prod Tarihi    [__________________]  🕐               │
│                      Tarih + saat:dakika seçici            │
│                                                             │
│  ─────────────────────────────────────────────────────     │
│  PREP (salt okunur — Refresh ile güncellenir)              │
│                                                             │
│  Son Prep Release    1.0.20260223.2            [gri metin] │
│  Son Prep Tarihi     23 Şub 2026, 14:35        [gri metin] │
│                                                             │
│  ℹ  Prep bilgisi Health Check ekranından                   │
│     servis satırındaki 🔄 ile güncellenir.                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Bileşen Kararları

| Alan | Bileşen | Davranış |
|---|---|---|
| Son Prod Release | `TextField fullWidth` | Serbest metin — sürüm adı, örn. `1.0.20260215.3` |
| Son Prod Tarihi | `TextField type="datetime-local"` | Saat + dakika dahil seçici; MUI'da `InputLabelProps={{ shrink: true }}` gerekir |
| Son Prep Release | `Typography color="text.secondary"` | Read-only — düzenleme inputu gösterilmez |
| Son Prep Tarihi | `Typography color="text.secondary"` | `fmtDatetime()` ile `23 Şub 2026, 14:35` formatında |
| Bilgi notu | `Alert severity="info" variant="outlined"` sx küçük | Kullanıcıyı prep alanının nereden güncellendiğine yönlendir |

### Davranış Kuralları

| Durum | Görünüm |
|---|---|
| `lastProdReleaseDate` null | datetime-local input boş görünür; kaydedilirse `null` yazılır |
| `lastPrepReleaseName` null | "—" metni gösterilir |
| `lastPrepReleaseDate` null | "—" metni gösterilir |
| Kaydet basılınca | Sadece `lastProdReleaseName` + `lastProdReleaseDate` payload'a girer; prep alanları gönderilmez |

### Servis Kart Görünümü (ServiceRow)

Mevcut kart üzerine minimal ekleme:
```
┌─────────────────────────────────────────────┐
│  cofins-service-api            [Düzenle ▼]  │
│  Port: 8080  |  Repo: cofins-api            │
│  Prod: 1.0.45  (15 Şub 2026, 09:15)        │  ← yeni satır
│  Prep: 1.0.47  (23 Şub 2026, 14:35)        │  ← yeni satır
└─────────────────────────────────────────────┘
```
- Sadece değer doluysa göster; ikisi de boşsa bu satır görünmez
- Font: `variant="caption" fontFamily="monospace"`

---

## UX Handoff — TASK-001 — 2026-03-02

**Tasarlanan bileşenler:**
- `ServiceDialog.tsx` → Tab 1 (Stage & Pipeline): checkbox + Collapse + TextField
- `ServiceRow.tsx` → kart üzerinde `releaseProject` chip gösterimi

**AC Kontrolü:**
- ✅ Checkbox default kapalı
- ✅ Checkbox açıkken smooth Collapse animasyonu
- ✅ Kapalıyken null gönderilir
- ✅ Boş state helper text ile açıklanmış
- ✅ ServiceRow'da chip gösterimi tanımlandı

**Sıradaki rol:** backend-developer → `releaseProject String?` kolonu schema'ya ekle, route'ları güncelle
