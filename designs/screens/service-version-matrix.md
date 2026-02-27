# Servis Versiyon Matrisi

**Route:** `/service-matrix`  
**Kategori:** Detail  
**Öncelik:** P2  
**Kaynak:** ServiceVersionMatrixV2.js

---

## Amaç

Hangi müşterinin hangi servisi hangi versiyonda kullandığını matris formatında göster. Versiyon tutarsızlıklarını görsel olarak vurgula.

---

## ASCII Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Servis Versiyon Matrisi         [Ürün ▾] [Servis ▾]   [🔍 Müşteri Ara...]  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ Filtre: [Sadece Güncel Olmayan ☐]  [Sadece Aktif Müşteriler ☑]             │
│                                                                              │
│ ┌──────────────────┬──────────────────────────────────────────────────┐     │
│ │                  │          SERVISLER                                │     │
│ │ MÜŞTERİ          │ cofins-bff │ cofins-file │ cofins-worker │ ...   │     │
│ │                  │ (güncel:   │ (güncel:    │ (güncel:      │       │     │
│ │                  │  v3.2.1)   │  v2.0.0)    │  v1.8.0)      │       │     │
│ ├──────────────────┼────────────┼─────────────┼───────────────┼───────┤     │
│ │ Akbank           │ 🟡v3.1.0   │ ✅v2.0.0    │ ⚠️ v1.7.2     │       │     │
│ │ Garanti BBVA     │ 🔴v3.0.5   │ 🟡v1.9.5    │ ✅v1.8.0     │       │     │
│ │ İş Bankası       │ ✅v3.2.1   │ ✅v2.0.0    │ ✅v1.8.0     │       │     │
│ │ Yapı Kredi       │ 🟡v3.2.0   │ ✅v2.0.0    │ —             │       │     │
│ └──────────────────┴────────────┴─────────────┴───────────────┴───────┘     │
│                                                                              │
│ ✅ Güncel  🟡 1 minor geride  🔴 Major geride  — Kullanmıyor               │
│                                                                              │
│ Özet: 12 müşteri · 34 servis · 8 güncelleme gerekiyor                       │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Hücre Tıklama — Popover

```
Akbank / cofins-bff-api
Mevcut: v3.1.0
Güncel:  v3.2.1
Fark:    2 minor, 1 patch geride

Release Notes özeti (2 major değişiklik):
• Breaking: sessionId kaldırıldı
• Feature: Auth token süresi güncellendi

[Güncelleme Planla]  [Müşteri Dashboard →]
```

---

## API Bağlantıları

| Endpoint | Kullanım |
|---|---|
| `GET /api/service-version-matrix` | Matris verisi (pivoted) |
| `GET /api/product-versions/latest?serviceId=x` | Güncel versiyon |

---

## Tasarım Notları

- Tablo: `sticky` ilk kolon (müşteri adı) — yatay scroll sorunsuz
- Hücre rengi: CSS `backgroundColor` ile conditional
- Büyük tablo (50+ müşteri, 10+ servis) → `virtualizeRows` aktif
- Export: "Excel'e Aktar" → `SheetJS` veya backend endpoint
