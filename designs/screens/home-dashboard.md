# Ana Dashboard — Home

**Route:** `/`  
**Kategori:** Dashboard  
**Öncelik:** P0

---

## Amaç

Giriş sonrası kullanıcıya rolüne göre özelleştirilmiş özet. Tek bakışta: aktif versiyonlar, açık hotfix'ler, pipeline uyarıları, bekleyen aksiyonlar. "Bugün ne yapmalıyım?" sorusunu yanıtlar.

---

## ASCII Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ ≡  ReleaseHub360         [🔔3] [Vacit B. ▾]                       │
├──────────┬──────────────────────────────────────────────────────────┤
│          │                                                          │
│ Sidebar  │  Merhaba, Vacit 👋   Bugün 21 Şubat 2026               │
│          │                                                          │
│ ○ Home   │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│   Release│  │ 🔴 2          │ │ 🟡 5         │ │ ✅ 18        │    │
│   Ürün   │  │ Kritik Alert │ │ Bekleyen Onay│ │ Tamamlanan   │    │
│   Müşteri│  │ pipeline+pod │ │  (Bu hafta)  │ │ (Bu ay)      │    │
│   Ops    │  └──────────────┘ └──────────────┘ └──────────────┘    │
│   Admin  │                                                          │
│          │  ┌─ AKTİF RELEASE'LER ─────────────────────────────┐   │
│          │  │ Ürün        Versiyon  Aşama       Sağlık  Eylem │   │
│          │  │ Cofins BFF  v3.2.1    RC           🟢 87%  [→]  │   │
│          │  │ Cofins File v2.0.0    Development  🟡 62%  [→]  │   │
│          │  │ Cofins BOS  v1.5.3    Staging      🔴 41%  [→]  │   │
│          │  └─────────────────────────────────────────────────┘   │
│          │                                                          │
│          │  ┌─ BEKLEYEN AKSİYONLAR ──────┐ ┌─ SON AKTİVİTE ───┐  │
│          │  │ ⚠️ PR onayı bekliyor (3)   │ │ 14:22 Pipeline OK│  │
│          │  │ 📋 Hotfix onayı gerekiyor  │ │ 13:45 PR merge   │  │
│          │  │ 📝 Release notes eksik (1) │ │ 11:30 Todo done  │  │
│          │  │ [Tümünü Gör →]             │ │ [Tümü →]         │  │
│          │  └────────────────────────────┘ └──────────────────┘  │
│          │                                                          │
│          │  ┌─ HIZLI ERİŞİM ──────────────────────────────────┐   │
│          │  │ [Release Health Check]  [Hotfix Oluştur]         │   │
│          │  │ [Yeni Versiyon]         [Code Sync Başlat]       │   │
│          │  └─────────────────────────────────────────────────┘   │
└──────────┴──────────────────────────────────────────────────────────┘
```

---

## Bileşenler

### Üst Metrik Kartlar (3 StatCard)

| Kart | Veri | Renk | Tıklanınca |
|---|---|---|---|
| Kritik Alert | Kırmızı pipeline + pod sayısı | Kırmızı | `/release-health-check` |
| Bekleyen Onay | Hotfix + PR onayları | Sarı | `/hotfixes` filtreli |
| Tamamlanan | Bu ayki deployment sayısı | Yeşil | `/releases` filtreli |

### Aktif Release'ler Tablosu

- `MUI DataGrid` ya da basit `Table`
- Kolonlar: Ürün, Versiyon, Aşama (Chip), Sağlık (LinearProgress + %), Eylem (→ Release Health Check'e yönlendir)
- Sağlık skoru renklendirmesi: ≥80 yeşil, 60-79 sarı, <60 kırmızı

### Bekleyen Aksiyonlar Paneli

- Kullanıcının rolüne göre filtrelenir
- Her madde tıklanabilir → ilgili sayfaya gider
- `List` bileşeni, `ListItemButton` ile

### Son Aktivite Feed

- `Timeline` bileşeni (MUI Lab) ya da basit liste
- Son 10 aksiyon: timestamp, olay tipi, kim yaptı
- API: `GET /api/activity-log?limit=10`

### Hızlı Erişim

- 4 `Button variant="outlined"` — en sık kullanılan aksiyonlar

---

## Rol Bazlı Görünüm

| Rol | Farklı ne görür? |
|---|---|
| ADMIN | Tüm aktif release'ler, kullanıcı sayısı metriği |
| RELEASE_MANAGER | Kendi ürünlerine ait release'ler, bekleyen onaylar |
| DEVELOPER | Kendi PR'ları, pipeline durumları |
| VIEWER | Sadece aktif release listesi, eylem yok |

---

## API Bağlantıları

| Endpoint | Ne için? |
|---|---|
| `GET /api/dashboard/summary` | 3 üst metrik kart |
| `GET /api/product-versions?status=active` | Aktif release tablosu |
| `GET /api/dashboard/pending-actions` | Bekleyen aksiyonlar (rol bazlı) |
| `GET /api/activity-log?limit=10` | Son aktivite feed |

---

## Boş State

- Aktif release yoksa: "Henüz aktif bir release yok. [Yeni Versiyon Oluştur →]"

## Tasarım Notları

- Sol: 240px sabit sidebar — tüm sayfalar için aynı
- İçerik: `padding: 24px`, `maxWidth: 1400px centered`
- Üst bar: 64px — logo, bildirim ikonu, kullanıcı menüsü
- Metrik kartlar: `Grid xs={12} sm={4}` — responsive
