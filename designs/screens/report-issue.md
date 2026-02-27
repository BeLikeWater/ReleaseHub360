# Sorun Bildir

**Route:** `/report-issue`  
**Kategori:** Workflow  
**Öncelik:** P2  
**Kaynak:** ReportIssue.js

---

## Amaç

Kullanıcıların platform veya servislerle ilgili sorunları hızlıca bildirmesini sağla. Bildirilen sorunlar ilgili ekibe iletilir, takip edilebilir.

---

## ASCII Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Sorun Bildir                                                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ [Yeni Sorun Bildir] [Benim Sorunlarım (3)] [Tüm Sorunlar (Admin)]           │
│                                                                              │
│ [Tab: Yeni Sorun Bildir] ─────────────────────────────────────────────────  │
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────┐     │
│ │ Başlık: *                                                           │     │
│ │ [_______________________________________________________________]   │     │
│ │                                                                     │     │
│ │ Kategori: *                                                         │     │
│ │ ○ Platform Hatası  ○ Yanlış Veri  ○ Performans  ○ Özellik İsteği   │     │
│ │                                                                     │     │
│ │ Öncelik:                                                            │     │
│ │ ○ Kritik (sistem çalışmıyor)  ○ Yüksek  ○ Orta  ○ Düşük          │     │
│ │                                                                     │     │
│ │ İlgili Ekran / Modül:                                               │     │
│ │ [Release Health Check ▾]                                            │     │
│ │                                                                     │     │
│ │ Açıklama: *                                                         │     │
│ │ [_______________________________________________________________]   │     │
│ │ [_______________________________________________________________]   │     │
│ │ [_______________________________________________________________]   │     │
│ │                                                                     │     │
│ │ Adımları Tekrar Etmek İçin:                                        │     │
│ │ [_______________________________________________________________]   │     │
│ │                                                                     │     │
│ │ Ekran Görüntüsü: [📎 Dosya Ekle]                                   │     │
│ │                                                                     │     │
│ │                        [İptal]    [Sorunu Gönder]                  │     │
│ └─────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Benim Sorunlarım Tab

- DataGrid: Başlık, Kategori, Öncelik, Durum (Açık/İnceleniyor/Çözüldü/Kapatıldı), Tarih
- Satır tıkla → detay drawer (sorun detayı + yorum thread)

---

## API Bağlantıları

| Endpoint | Kullanım |
|---|---|
| `GET /api/issues?reportedBy=me` | Benim sorunlarım |
| `POST /api/issues` | Yeni sorun |
| `GET /api/issues/:id` | Detay |
| `POST /api/issues/:id/comments` | Yorum ekle |

---

## Tasarım Notları

- Form: `Card`'ın içinde, `maxWidth: 700px`
- Dosya yükleme: `<input type="file" accept="image/*">` — drag & drop destekli
- Gönderildi sonrası: `Snackbar` ile "Sorun bildirildi, #ID ile takip edebilirsiniz"
- Kritik öncelik seçilince: ek uyarı "Admin bilgilendirilecek"
