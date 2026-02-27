# Değişiklik Takibi

**Route:** `/change-tracking`  
**Kategori:** Management  
**Öncelik:** P2  
**Kaynak:** ChangeTracking.js

---

## Amaç

Versiyon bazlı API ve sistem değişikliklerini takip et. Breaking change'leri işaretle. Hangi değişikliğin hangi müşterileri etkilediğini göster.

---

## ASCII Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Değişiklik Takibi      [Ürün ▾] [Versiyon ▾] [Tip ▾]      [+ Değişiklik]   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ [Tüm Değişiklikler] [Breaking (3)] [API Değişiklikleri] [Sistem Değişiklikleri]│
│                                                                              │
│ 🔍 Filtre: [Tarih aralığı]  [Yalnızca Breaking ☐]  [Etkilenen Müşteri ▾]  │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────┐    │
│ │ Tarih  │ Versiyon │ Tip          │ Açıklama          │ Etki   │ [⋮] │    │
│ ├────────┼──────────┼──────────────┼───────────────────┼────────┼──────┤    │
│ │ 21 Şub │ v3.2.1   │ ⚠️ Breaking  │ sessionId kaldırıldı│ 15 müş│ [⋮]│    │
│ │ 20 Şub │ v3.2.1   │ ✨ Feature   │ Token yenileme    │ Tümü  │ [⋮] │    │
│ │ 18 Şub │ v2.0.0   │ ⚡ Perf      │ Upload optimizasyon│ -    │ [⋮] │    │
│ │ 15 Şub │ v3.2.0   │ ⚠️ Breaking  │ API key zorunlu   │ 8 müş │ [⋮] │    │
│ └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│ [Satır tıkla → Detay Drawer]                                               │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

── Değişiklik Detay Drawer ───────────────────────────────────────────────────
│ ⚠️ Breaking Change — Cofins BFF v3.2.1                       [Düzenle] [✕] │
│ ─────────────────────────────────────────────────────────────────────────── │
│ API: POST /api/auth/login                                                   │
│ Değişiklik: Response'dan sessionId alanı kaldırıldı                         │
│                                                                             │
│ Önceki Response:                 Yeni Response:                             │
│ {                                {                                          │
│   "accessToken": "...",            "accessToken": "...",                    │
│   "sessionId": "abc123",  →        "refreshToken": "..."                   │
│   "refreshToken": "..."          }                                          │
│ }                                                                           │
│                                                                             │
│ Etkilenen Müşteriler (15):                                                  │
│ [Akbank] [Garanti] [İşbank] ... +12 daha                                   │
│                                                                             │
│ Bildirim Durumu: 🔴 Henüz bildirim gönderilmedi                             │
│ [📧 Müşterilere Bildir]                                                     │
──────────────────────────────────────────────────────────────────────────────
```

---

## Yeni Değişiklik Kaydetme

```
Versiyon:    [v3.2.1 ▾]
Tip:         ○ Feature  ○ Breaking  ○ Bug Fix  ○ Performance  ○ Security
API Path:    [/api/auth/login_____]  (opsiyonel)
Açıklama:    [_______________________________________]
Önceki:      [_______________________________________]  (opsiyonel kod bloğu)
Sonrası:     [_______________________________________]
Breaking → Müşteri etki analizi: [Otomatik Hesapla]
```

---

## API Bağlantıları

| Endpoint | Kullanım |
|---|---|
| `GET /api/system-changes` | Liste |
| `POST /api/system-changes` | Yeni kayıt |
| `GET /api/system-changes/:id/affected-customers` | Etki analizi |
| `POST /api/system-changes/:id/notify` | Bildirim gönder |

---

## Tasarım Notları

- Breaking change satırları: `bgcolor: alpha(error.main, 0.08)`, kalın metin
- Kod diff: `<pre>` ile iki kolon yan yana, syntax highlighting basit renklendirme
- "Etkilenen Müşteriler" chip listesi: tıklanınca `/customers/:id/dashboard`
