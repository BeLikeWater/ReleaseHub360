# Acil Değişiklik Yönetimi

**Route:** `/urgent-changes`  
**Kategori:** Management  
**Öncelik:** P2  
**Absorbe Edilenler:** UrgentChanges.js (okuma view'u — admin ile birleşti)

---

## Amaç

Planlı release döngüsü dışında yapılmak zorunda kalınan acil değişiklikleri kayıt altına al, eskalasyon gerekiyorsa tetikle, geçmişini tut.

---

## ASCII Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Acil Değişiklik Yönetimi          [Durum ▾] [Ürün ▾]    [+ Acil Değişiklik]│
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ⚠️ 2 aktif acil değişiklik işlemde                                         │
│                                                                              │
│ [Aktif (2)] [Onay Bekliyor (1)] [Tamamlanan] [İptal Edilen]                 │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────┐    │
│ │ # │ Başlık              │ Ürün        │ Öncelik     │ Durum   │ [⋮] │    │
│ ├───┼─────────────────────┼─────────────┼─────────────┼─────────┼──────┤   │
│ │ 7 │ DB bağlantı limiti  │ Cofins API  │ 🔴 Kritik   │ Aktif   │ [⋮]│    │
│ │ 8 │ SSL sertifika yenile│ Tüm Sisteml │ 🟡 Yüksek  │ Onay bek│ [⋮]│    │
│ └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│ [Satır tıkla → Detay Drawer]                                               │
└──────────────────────────────────────────────────────────────────────────────┘

── Detay Drawer ──────────────────────────────────────────────────────────────
│ [#7] DB bağlantı limiti aşıldı                            [Düzenle] [✕]   │
│ ─────────────────────────────────────────────────────────────────────────── │
│ Ürün: Cofins API  │  Öncelik: Kritik  │  Durum: Aktif                       │
│ Talep Eden: Vacit B., 21 Şub 13:10                                          │
│                                                                             │
│ Açıklama:                                                                   │
│ Prod ortamında DB connection pool tükendi. Uygulama 503 veriyor.            │
│ Geçici fix: pool size 50→100 artırıldı. Kalıcı fix sprint'e alındı.         │
│                                                                             │
│ Etkilenen Servisler: [cofins-bff-api] [cofins-worker]                       │
│                                                                             │
│ Aktivite:                                                                   │
│ 14:22 — Vacit B.: "Pool size artırıldı"                                     │
│ 14:30 — Ali K.: "Monitoring'de normale döndü"                               │
│                                                                             │
│ Yorum Ekle: [_______________________________________________]               │
│                                                                             │
│ [Tamamlandı Olarak İşaretle]    [Eskalasyon Tetikle]    [İptal Et]         │
──────────────────────────────────────────────────────────────────────────────
```

---

## Yeni Acil Değişiklik

```
Başlık:            [_________________________________]
Ürün(ler):         [multi-select ▾]
Öncelik:           ○ Kritik  ○ Yüksek  ○ Orta
Açıklama:          [_________________________________]
                   [_________________________________]
Müşteri Etkisi:    [_________________________________]
Workaround var mı? ○ Evet  ○ Hayır
Notlar:            [_________________________________]

[İptal]                         [Değişikliği Kaydet]
```

---

## API Bağlantıları

| Endpoint | Kullanım |
|---|---|
| `GET /api/urgent-changes` | Liste |
| `POST /api/urgent-changes` | Yeni |
| `GET /api/urgent-changes/:id` | Detay |
| `PATCH /api/urgent-changes/:id/status` | Durum güncelle |
| `POST /api/urgent-changes/:id/comments` | Yorum ekle |
