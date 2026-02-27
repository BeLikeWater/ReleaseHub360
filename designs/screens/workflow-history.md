# Workflow Geçmişi

**Route:** `/admin/workflows`  
**Kategori:** Detail (Admin)  
**Öncelik:** P2  
**Yeni Ekran** — n8n üzerinden tetiklenen iş akışlarının audit logu

---

## Amaç

n8n üzerinden otomatik tetiklenen tüm iş akışlarını (hotfix onay bildirimi, deployment tetikleme, sync başlatma, breaking change bildirimi) audit logu olarak raporla. Başarısız olanları tespit et ve yeniden tetikle.

---

## ASCII Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Workflow Geçmişi          [Tip ▾] [Durum ▾] [Tarih ▾]     [🔄 Yenile]      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Özet (Son 7 gün): ✅ 142 başarılı  |  🔴 8 başarısız  |  🔄 2 bekliyor     │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────┐    │
│ │ Tarih       │ Workflow Tipi           │ Tetikleyen    │ Durum │ [⋮] │    │
│ ├─────────────┼────────────────────────┼───────────────┼───────┼──────┤   │
│ │ 21Şub 14:35 │ Hotfix Onay Bildirimi  │ Sistem        │ ✅    │ [⋮]│    │
│ │ 21Şub 14:22 │ Deployment Tetikleme   │ Vacit B.      │ ✅    │ [⋮]│    │
│ │ 21Şub 13:55 │ Code Sync Bildirimi    │ Sistem        │ 🔴Hata│ [⋮]│    │
│ │ 21Şub 12:00 │ Breaking Change Alert  │ Sistem        │ ✅    │ [⋮]│    │
│ │ 20Şub 22:00 │ Deployment Tetikleme   │ Ali K.        │ ✅    │ [⋮]│    │
│ └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│ [Sayfalama: ← 1 2 3 ... →]                                                  │
└──────────────────────────────────────────────────────────────────────────────┘

── Workflow Detay Drawer ─────────────────────────────────────────────────────
│ Code Sync Bildirimi — 21 Şub 13:55                           [Tekrar Dene] │
│ ─────────────────────────────────────────────────────────────────────────── │
│ n8n Workflow ID: wf_89abc123                                                │
│ Tetikleyen: Sistem (sync tamamlandı event)                                  │
│ Hedef: Slack webhook + E-posta                                              │
│                                                                             │
│ Durum: 🔴 Hata                                                              │
│ Hata: Slack webhook timeout (30s)                                           │
│                                                                             │
│ Gönderilecekti:                                                             │
│ Mesaj: "cofins-bff-api sync tamamlandı (main→prod)"                        │
│ Alıcılar: #releases-channel, ali@company.com                               │
│                                                                             │
│ Adım Logları:                                                               │
│ ✅ Trigger alındı (13:55:02)                                                │
│ ✅ E-posta gönderildi (13:55:04)                                            │
│ 🔴 Slack webhook failed — timeout (13:55:34)                                │
│                                                                             │
│ [n8n'de Gör →]                                              [Tekrar Dene]  │
──────────────────────────────────────────────────────────────────────────────
```

---

## Workflow Tipleri

| Tip | Tetikleyen Olay |
|---|---|
| Hotfix Onay Bildirimi | Yeni hotfix talebi oluşturuldu |
| Deployment Tetikleme | Release onaylandı |
| Code Sync Bildirimi | Sync tamamlandı / hata |
| Breaking Change Alert | Breaking change kaydedildi |
| Versiyon Aşama Bildirimi | Versiyon aşama geçişi |
| Todo Hatırlatma | P0 todo X saat sonra hâlâ açık |

---

## API Bağlantıları

| Endpoint | Kullanım |
|---|---|
| `GET /api/workflow-history` | Liste (filtrelenmiş) |
| `GET /api/workflow-history/:id` | Detay |
| `POST /api/workflow-history/:id/retry` | Yeniden tetikle |
| `GET /api/workflow-history/summary` | Üst özet istatistik |

---

## Tasarım Notları

- Başarısız satırlar: `bgcolor: alpha(error.main, 0.05)`
- Tarih: `relative` (15 dk önce) + hover'da absolute (`21 Şub 13:55`)
- Sayfalama: `TablePagination` bileşeni
- "n8n'de Gör" → n8n UI URL'ine yeni tab açar
- Tekrar Dene: `POST` → başarı/hata `Snackbar` ile bildir
