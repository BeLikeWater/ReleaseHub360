# Release Notları Detay

**Route:** `/release-notes/:versionId`  
**Kategori:** Detail  
**Öncelik:** P1

---

## Amaç

Belirli bir versiyon için release notlarını oluştur, düzenle ve yayınla. İki mod: düzenleme (iç kullanım) ve önizleme (müşteri görünümü).

---

## ASCII Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ← Cofins BFF — v3.2.1 — Release Notları          [Önizleme] [PDF İndir]    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ Durum: 🟡 Taslak              Son düzenleme: Vacit B., 10 dk önce           │
│                                                                              │
│ ┌─ Work Items ─────────────────┐  ┌─ Release Notu Düzenleyici ───────────┐  │
│ │ 🔍 Ara...                    │  │                                       │  │
│ │                              │  │  Kategori:  [✨ Feature ▾]           │  │
│ │ ☑ [#1234] Auth token fix    │  │  Başlık:    [_______________________] │  │
│ │ ☑ [#1235] Upload size limit │  │  Açıklama:  [_______________________] │  │
│ │ ☐ [#1236] Login perf        │  │             [_______________________] │  │
│ │ ☑ [#1237] Session exp.      │  │  Breaking:  [ ] Bu değişiklik        │  │
│ │ ☐ [#1238] Cache bug         │  │             kırıcı değişiklik içeriyor│  │
│ │                              │  │                                       │  │
│ │ Toplam: 12  Seçili: 8       │  │  [İptal]              [Not Ekle/Güncelle]│
│ └──────────────────────────────┘  └───────────────────────────────────────┘  │
│                                                                              │
│ ┌─ Mevcut Release Notları ────────────────────────────────────────────────┐  │
│ │                                                                          │  │
│ │  ✨ YENİ ÖZELLİKLER (3)                                      [Tümü ▾]  │  │
│ │  ├─ Auth token yenileme süresi 15 dakikaya güncellendi        [↑][↓][✕]│  │
│ │  ├─ Dosya yükleme limiti 50MB'a çıkarıldı                     [↑][↓][✕]│  │
│ │  └─ Session timeout uyarısı eklendi                            [↑][↓][✕]│  │
│ │                                                                          │  │
│ │  🐛 HATA DÜZELTMELERİ (5)                                    [Tümü ▾]  │  │
│ │  ├─ Dashboard yüklenme sorunu giderildi                        [↑][↓][✕]│  │
│ │  └─ ... (4 daha)                                                         │  │
│ │                                                                          │  │
│ │  ⚠️ KIRICI DEĞİŞİKLİKLER (1)         🔴 Müşterilere önceden bildir!    │  │
│ │  └─ LoginResponse'dan sessionId alanı kaldırıldı               [↑][↓][✕]│  │
│ │                                                                          │  │
│ └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│ [Yayınla]  [Taslak Kaydet]                          [Geri Al]              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Modlar

### Düzenleme Modu (varsayılan)
- Sol panel: Work item listesi (TFS'den çekilen) — notla ilişkilendir
- Orta: Not ekleme/düzenleme formu
- Alt: Mevcut notların kategorize sıralaması

### Önizleme Modu
- Markdown render, müşteri görünümü
- Başlık: "v3.2.1 — Sürüm Notları"
- Kategoriler düzgün formatlanmış
- Breaking change kırmızı banner ile vurgulu

---

## Kategori Tipleri

| Tip | İkon | Açıklama |
|---|---|---|
| Feature | ✨ | Yeni özellik |
| Bug | 🐛 | Hata düzeltme |
| Security | 🔒 | Güvenlik güncellemesi |
| Breaking | ⚠️ | Kırıcı değişiklik |
| Performance | ⚡ | Performans iyileştirmesi |
| Deprecated | 🚫 | Kullanımdan kaldırılan |

---

## Yayınlama Akışı

```
[Yayınla] → Kontrol:
  - Breaking change var + uyarı okunmadıysa → "Breaking change mevcut. Müşterilere bildirim gönderilsin mi?"
  - OK → PATCH /api/product-versions/:id {notesPublished: true}
  - Bildirim seçildiyse → POST /api/notifications/broadcast
```

---

## API Bağlantıları

| Endpoint | Kullanım |
|---|---|
| `GET /api/release-notes?versionId=x` | Mevcut notlar |
| `GET /api/tfs/work-items?versionId=x` | Sol panel work items |
| `POST /api/release-notes` | Yeni not |
| `PUT /api/release-notes/:id` | Güncelle |
| `DELETE /api/release-notes/:id` | Sil |
| `PATCH /api/release-notes/:id/order` | Sıralama (drag & drop) |
| `PATCH /api/product-versions/:id/publish-notes` | Yayınla |

---

## Tasarım Notları

- Sol panel: `width: 280px`, `overflowY: auto`
- Düzenleyici: `width: calc(100% - 280px)` ya da `flex: 1`
- Breaking change notu: kırmızı `Paper` bileşeni, `bgcolor: 'error.light'`
- Sıralama: `react-beautiful-dnd` veya MUI drag
- Önizleme geçişi: `Fade` animasyonu
