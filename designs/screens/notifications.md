# Bildirimler Merkezi

**Route:** `/notifications`  
**Kategori:** Detail  
**Öncelik:** P1  
**Yeni Ekran** — mevcut projede yoktu

---

## Amaç

Kullanıcıya yönelik tüm sistem bildirimlerini göster. Hotfix onayı, pipeline fail, code sync tamamlandı, versiyon aşama geçişi gibi olaylar actionable bildirimler olarak burada toplanır.

---

## ASCII Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Bildirimler                   [Tümünü Okundu İşaretle]  [Ayarlar ⚙️]       │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ [Tümü (12)] [Okunmamış (4)] [Aksiyon Gerekli (2)] [Sistem]                  │
│                                                                              │
│ ── Bugün ────────────────────────────────────────────────────────────────    │
│                                                                              │
│ 🔴 ● [14:35] Hotfix Onayı Gerekli                              15 dk önce   │
│       cofins-bff-api — #42 Auth crash talebi onayınızı bekliyor             │
│       [Hotfix Merkezi'ne Git →]                                             │
│                                                                              │
│ 🟡 ● [14:22] Pipeline Başarısız                                28 dk önce   │
│       cofins-file-service Build #89 başarısız oldu             │
│       Hata: npm test failed (1 test)                           │
│       [Pipeline Durumu'na Git →]                               │
│                                                                              │
│ 🟢   [13:45] Code Sync Tamamlandı                              1 sa önce    │
│       cofins-bff-api: main → production sync başarılı          │
│       Toplam: 31 dosya, 0 conflict                             │
│                                                                              │
│ ── Dün ──────────────────────────────────────────────────────────────────    │
│                                                                              │
│ 🔵   [20 Şub 16:30] Versiyon Aşama Geçişi                      1 gün önce  │
│       Cofins BFF v3.2.1 → RC aşamasına geçirildi               │
│       Geçiren: Ali K.                                          │
│                                                                              │
│ ── Daha Eski ────────────────────────────────────────────────────────────    │
│                            [Daha Fazla Yükle]                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Bildirim Tipleri

| Tip | İkon | Renk | Tetikleyen Olay |
|---|---|---|---|
| Aksiyon Gerekli | 🔴 | `error` | Hotfix onayı, Todo P0 kaldı |
| Uyarı | 🟡 | `warning` | Pipeline fail, pod crash |
| Bilgi | 🔵 | `info` | Versiyon geçişi, eşleştirme değişikliği |
| Başarı | 🟢 | `success` | Sync tamam, deployment başarılı |

---

## Üst Bar Bildirim İkonu (tüm sayfalarda)

```
[🔔4]  ← 4 okunmamış bildiri

Tıklanınca:
┌─────────────────────────────────────┐
│ Son 5 Bildirim                       │
│ ─────────────────────────────────── │
│ 🔴 Hotfix onayı — 15 dk            │
│ 🟡 Pipeline fail — 28 dk           │
│ 🟢 Sync tamam — 1 sa               │
│ ─────────────────────────────────── │
│         [Tümünü Gör →]             │
└─────────────────────────────────────┘
```

---

## Bildirim Tercihleri (Ayarlar'da)

- Hangi olaylar için bildirim alınsın (checkbox listesi)
- E-posta bildirimi açık/kapalı
- Slack/webhook URL (opsiyonel)

---

## API Bağlantıları

| Endpoint | Kullanım |
|---|---|
| `GET /api/notifications` | Liste |
| `PATCH /api/notifications/:id/read` | Okundu işaretle |
| `PATCH /api/notifications/read-all` | Tümünü okundu |
| `GET /api/notifications/unread-count` | Üst bar badge |

---

## Tasarım Notları

- Okunmamış: `fontWeight: 600`, ● nokta sol kenarda
- Okunmuş: normal font, no dot
- Hover: hafif `bgcolor: action.hover`
- Tarih grup başlıkları: `Typography variant="overline"`
- Bildirim satırı: `ListItem` bileşeni, `divider` ile ayrılmış
