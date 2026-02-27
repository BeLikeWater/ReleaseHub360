# UX Tasarım: Release Takvimi — Versiyon Lifecycle Yönetimi

**Route:** `/release-calendar`  
**Kategori:** Management  
**Öncelik:** P1  
**Spec:** `designs/specs/release-calendar-redesign.md`  
**Tarih:** 23 Şubat 2026  
**Tasarımcı:** UX Designer Agent

---

## Tasarım Kararları

1. **Default view: Liste** — Release Manager hızlı tarama yapar, takvim view ek bağlam için
2. **Satır bazlı milestone chips** — 4 tarih kompakt olarak her satırda gösterilir, açılır drawer ile düzenlenir
3. **Right Drawer** — detay/düzenleme için yeni sayfa değil drawer tercih edildi (bağlam kaybını önler)
4. **Phase → renkli chip** — PLANNED=gri, DEVELOPMENT=mavi, RC=turuncu, STAGING=sarı, PRODUCTION=yeşil, ARCHIVED=default
5. **"İlerlet" butonu** — her satırda tek tıkla phase geçişi (inline action, dialog yok)
6. **Takvim view** — 4 ayrı renk/ikon: Dev=yeşil, Test=sarı, PreProd=turuncu, Release=mavi

---

## ASCII Layout — Liste Görünümü (Default)

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ Yayın Takvimi                                                        [+ Yeni Versiyon]   │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│  [Ürün: Tümü ▾]  [Aşama: Aktif ▾]  [☑ Arşivlenenleri Gizle]   [≡ Liste] [📅 Takvim]   │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  Aşama        Ürün               Versiyon   Dev Start   Test        Pre-Prod    Target   │
│ ─────────────────────────────────────────────────────────────────────────────────────── │
│  🔵 DEV       Cofins BFF         v3.2.1     12 Şub      24 Şub      03 Mar      10 Mar  │
│               ──────────────────────────────────────────────────────── [→ RC] [···]      │
│                                                                                          │
│  🟡 RC        Cofins File        v2.0.0     01 Şub      15 Şub      24 Şub      27 Şub  │
│               ──────────────────────────────────────────────────────── [→ STG] [···]     │
│                                                                                          │
│  🟠 STG       Cofins Worker      v1.8.0     10 Oca      28 Oca      05 Şub      12 Şub  │
│               ──────────────────────────────────────────────────────── [→ PROD] [···]    │
│                                                                                          │
│  ⬛ PLANNED   ETX Backend        v4.0.0     —           —           —           15 Mar  │
│               ──────────────────────────────────────────────────────── [→ DEV] [···]     │
│                                                                                          │
│  🟢 PROD      Cofins BFF         v3.1.0     01 Ara 25   15 Ara 25   28 Ara 25   03 Oca  │
│               ──────────────────────────────────────────────────────── [Arşivle] [···]   │
│                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ASCII Layout — Sağ Drawer (Tarih & Detay Düzenleme)

```
┌────────────────────────────────────┐
│ Cofins BFF — v3.2.1          [✕]  │
│ ─────────────────────────────────  │
│ Ürün       Cofins BFF              │
│ Versiyon   v3.2.1                  │
│ Aşama      🔵 DEVELOPMENT          │
│ Hotfix     Hayır                   │
│                                    │
│ ─── Milestone Tarihleri ────────── │
│                                    │
│ 🟢 Dev Başlangıcı                  │
│    [12/02/2026          ]          │
│                                    │
│ 🟡 Test Tarihi                     │
│    [24/02/2026          ]          │
│                                    │
│ 🟠 Pre-Prod Tarihi                 │
│    [03/03/2026          ]          │
│                                    │
│ 🔵 Hedef Yayın Tarihi              │
│    [10/03/2026          ]          │
│                                    │
│ ─── Açıklama ───────────────────── │
│ [Sprint 12 hedefleri...          ] │
│                                    │
│ ─── Kayıt Bilgisi ──────────────── │
│ Oluşturan: admin                   │
│ Yayın Tarihi: —                    │
│                                    │
│ [  İptal  ]    [   Kaydet   ]      │
└────────────────────────────────────┘
```

---

## ASCII Layout — Yeni Versiyon Dialog

```
┌─────────────────────────────────────┐
│ Yeni Versiyon Oluştur         [✕]  │
│ ───────────────────────────────── │
│ Ürün *           [Seçiniz ▾]       │
│ Versiyon *       [v3.3.0    ]      │
│ Hotfix?          [ ] Evet          │
│ Açıklama         [             ]   │
│                                    │
│ ── Milestone Planlama (opsiyonel) ─│
│ Dev Başlangıcı   [          ]      │
│ Test Tarihi      [          ]      │
│ Pre-Prod Tarihi  [          ]      │
│ Hedef Yayın      [          ]      │
│                                    │
│          [İptal]  [Oluştur]        │
└─────────────────────────────────────┘
```

---

## ASCII Layout — Takvim Görünümü

```
┌──────────────────────────────────────────────────────────────────┐
│  [≡ Liste] [📅 Takvim]    ← Şubat 2026 →  [Bugün]              │
├──────────────────────────────────────────────────────────────────┤
│  Pzt    Sal    Çar    Per    Cum    Cmt    Paz                   │
│  ────────────────────────────────────────────────                │
│  23     24     25     26     27     28                           │
│         🟡RC         🔵 2x   🟢1                                │
│         File                                                     │
│  ────────────────────────────────────────────────                │
│  02     03     04     05     06     07     08    Mar             │
│         🟠STG                                                    │
│         BFF                                                      │
└──────────────────────────────────────────────────────────────────┘
```

Takvim event renkleri:
- 🟢 masterStartDate — yeşil (Dev başlangıcı)
- 🟡 testDate — sarı (Test)
- 🟠 preProdDate — turuncu (Pre-Prod)
- 🔵 targetDate — mavi (Hedef yayın)
- 🔴 releaseDate — kırmızı (Gerçekleşen yayın, sadece PRODUCTION)

---

## Bileşen Kararları

| Bileşen | Tercih | Neden |
|---|---|---|
| Tarih seçici | MUI `DatePicker` (`@mui/x-date-pickers`) | Projeye uyumlu, TR locale |
| Drawer | MUI `Drawer anchor="right"` | Bağlam kaybı yok |
| Phase geçiş | Inline `Button` → confirm yok (hızlı akış) | Low-risk action |
| Filter bar | `Select` + `ToggleButtonGroup` | Basit, tutarlı |
| Liste satırı | Custom `Box` row (tablo değil) | Esnek milestone chip layout |
| Takvim | Manuel grid (date-fns) | Dış kütüphane gereksiz |

---

## Phase Chip Renk Haritası

| Phase | Chip rengi | Kısaltma | Sonraki Phase |
|---|---|---|---|
| PLANNED | default (gri) | PLAN | → DEVELOPMENT |
| DEVELOPMENT | info (mavi) | DEV | → RC |
| RC | warning (turuncu) | RC | → STAGING |
| STAGING | warning (sarı-turuncu) | STG | → PRODUCTION |
| PRODUCTION | success (yeşil) | PROD | Arşivle |
| ARCHIVED | default | ARC | — |

Hotfix versiyonlar: chip yanında kırmızı `HOTFIX` badge.

---

## Akış Özeti

```
Liste ekranı açılır
  → GET /api/product-versions (phase≠ARCHIVED varsayılan)
  → Satırlar render edilir

"+ Yeni Versiyon" tıklanır
  → Dialog açılır (ürün + versiyon + 4 tarih)
  → POST /api/product-versions
  → Liste refresh

Satıra tıklanır / "Düzenle" menüsü
  → Right Drawer açılır (tüm tarihler DatePicker ile düzenlenebilir)
  → PUT /api/product-versions/:id
  → Drawer kapanır, satır refresh

"→ RC" / "→ DEV" tıklanır
  → PATCH /api/product-versions/:id/phase
  → Satır phase chip'i güncellenir

"Sil" tıklanır
  → Onay dialog
  → DELETE /api/product-versions/:id

Takvim görünümüne geçilir
  → Aynı data, farklı render (4 ayrı renk)
```

---

## Amaç

Tüm versiyonların zaman çizelgesini görsel takvim üzerinde göster. Planlı, aktif ve geçmiş release'leri tarihe göre yerleştir. Beta tag ve deployment pencerelerini işaretle.

---

## ASCII Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Release Takvimi          [Ay ▾] [Ürün ▾]     [← Şubat 2026 →]  [+ Etkinlik]│
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  View: [Ay] [Hafta] [Liste]                                 Bugün: 21 Şub   │
│                                                                              │
│  ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┐                        │
│  │  Pzt │  Sal │  Çar │  Per │  Cum │  Cmt │  Paz │                        │
│  ├──────┼──────┼──────┼──────┼──────┼──────┼──────┤                        │
│  │  16  │  17  │  18  │  19  │  20  │  21* │  22  │                        │
│  │      │      │ ░░░░ │      │      │ ████ │      │                        │
│  │      │      │ v3.1 │      │      │ Beta │      │                        │
│  ├──────┼──────┼──────┼──────┼──────┼──────┼──────┤                        │
│  │  23  │  24  │  25  │  26  │  27  │  28  │      │                        │
│  │      │ ████ │      │      │ ████ │      │      │                        │
│  │      │v3.2.1│      │      │ v2.0 │      │      │                        │
│  └──────┴──────┴──────┴──────┴──────┴──────┴──────┘                        │
│  * bugün  ░ planlı  █ deploy günü                                           │
│                                                                              │
│  ┌─ LEGEND ─────────────────────────────────────────────────────────────┐   │
│  │ 🔵 Planlı  🟢 Deployment  🟡 Beta  🔴 Acil/Hotfix  ⬛ Maintenance  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─ YAKLAŞAN ETKINLIKLER ──────────────────────────────────────────────┐    │
│  │ Tarih     Ürün           Versiyon  Tip        Aksiyon               │    │
│  │ 24 Şub    Cofins BFF     v3.2.1    Deployment [Detay] [Beta Tag]    │    │
│  │ 27 Şub    Cofins File    v2.0.0    Deployment [Detay]               │    │
│  │ 05 Mar    Cofins Worker  v1.8.0    Planlı     [Detay] [Deployment]  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Bileşenler

### Takvim Kütüphanesi

`@fullcalendar/react` + `@fullcalendar/daygrid` + `@fullcalendar/timegrid`  
Ya da daha hafif: `react-big-calendar` (mevcut projede varsa)

Görünüm modları:
- **Ay görünümü** (varsayılan) — genel bakış
- **Hafta görünümü** — detay, deployment saat bilgisi ile
- **Liste görünümü** — tabloya yakın, filtreleme kolay

### Takvim Event Tipleri

| Tip | Renk | Açıklama |
|---|---|---|
| Planlı | Mavi | Hedef deployment tarihi |
| Deployment | Yeşil | Gerçekleşen deployment |
| Beta Release | Sarı | Beta tag oluşturuldu |
| Hotfix | Kırmızı | Acil deployment |
| Maintenance | Gri | Sistem bakım penceresi |

### Event Tıklandığında — Popover

```
┌──────────────────────────────┐
│ Cofins BFF — v3.2.1          │
│ 24 Şubat 2026, 22:00         │
│ Tip: Deployment              │
│ Durum: Planlandı             │
│ Sağlık: 🟢 87%               │
│                              │
│ [Release Health Check →]     │
│ [Beta Tag Ekle]              │
│ [Tarihi Değiştir]            │
│ [İptal Et]                   │
└──────────────────────────────┘
```

### Beta Tag Ekleme — Drawer

Beta Tag Request mevcut component'ından absorbe edilen form:
- Ürün seçimi (zaten seçili gelir)
- Versiyon seçimi
- Tag açıklaması
- Onay e-postası alacak kişiler
- `POST /api/product-versions/:id/beta-tag`

### Yaklaşan Etkinlikler Tablosu

- Takvimin altında — liste görünümü
- Sıralama: tarih
- Filtre: Ürün, Tip
- "Bu haftaya git" kısayolu

---

## Etkinlik Oluştur (+ Etkinlik)

```
Dialog:
- Ürün seçimi
- Versiyon seçimi
- Tarih/Saat seçimi (DateTimePicker)
- Tip seçimi (Planlı/Maintenance/Beta)
- Notlar
POST /api/calendar-events
```

---

## API Bağlantıları

| Endpoint | Kullanım |
|---|---|
| `GET /api/calendar-events?month=2026-02` | Takvim eventleri |
| `GET /api/product-versions?upcoming=true` | Yaklaşan listesi |
| `POST /api/calendar-events` | Yeni etkinlik |
| `PUT /api/calendar-events/:id` | Tarih güncelleme (drag & drop) |
| `POST /api/product-versions/:id/beta-tag` | Beta tag |

---

## Tasarım Notları

- Drag & drop ile tarih değiştirme (FullCalendar eventDrop)
- Event'lar ürün rengine göre kodlanabilir (ürüne renk ata)
- Mobilde liste görünümü varsayılan
- Deployment penceresi: gecenin geç saatlerini (22:00-02:00) vurgula
