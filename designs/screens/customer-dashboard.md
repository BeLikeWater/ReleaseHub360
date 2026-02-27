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
