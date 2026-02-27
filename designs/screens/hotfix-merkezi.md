# Hotfix Merkezi

**Route:** `/hotfixes`  
**Kategori:** Workflow  
**Öncelik:** P1  
**Absorbe Edilenler:** HotfixRequest.js, HotfixRequestApproval.js, BetaTagRequest.js

---

## Amaç

Acil düzeltme taleplerini oluştur, takip et, onayla ve deploy et. Tüm hotfix yaşam döngüsü tek ekranda.

---

## ASCII Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Hotfix Merkezi                                         [+ Yeni Hotfix Talebi]│
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ [Bekleyen Onay (3)] [Aktif (5)] [Tamamlanan] [Reddedilen]                  │
│ ─────────────────────────────────────────────────────────                   │
│                                                                              │
│ [Tab: Bekleyen Onay] ────────────────────────────────────────────────────   │
│                                                                              │
│ ⚠️ 3 hotfix talep onayınızı bekliyor                                        │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────┐    │
│ │ #   │ Başlık            │ Ürün        │ Talep Eden  │ Kritiklik │ [⋮]│    │
│ ├─────┼───────────────────┼─────────────┼─────────────┼───────────┼────┤    │
│ │ #42 │ Auth crash prod   │ Cofins BFF  │ Ali K.      │ 🔴 Kritik │[⋮]│    │
│ │ #43 │ Upload null ptr   │ Cofins File │ Vacit B.    │ 🟡 Yüksek │[⋮]│    │
│ │ #44 │ Cache stale data  │ Cofins API  │ Mehmet Y.   │ 🟡 Yüksek │[⋮]│    │
│ └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│ [Satır tıkla → detay drawer]                                               │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

── Hotfix Detay Drawer ────────────────────────────────────────────────────────
│ [#42] Auth crash production                              [Onayla] [Reddet]  │
│ ─────────────────────────────────────────────────────────────────────────── │
│ Talep Eden: Ali K.  │  Tarih: 21 Şub 14:30  │  Kritiklik: 🔴 Kritik        │
│                                                                              │
│ Açıklama:                                                                   │
│ Prod'da auth servisi çöküyor. 500 users etkileniyor. JWT decode hatası.     │
│                                                                              │
│ Hedef Versiyon: Cofins BFF v3.2.1                                           │
│ Branch: hotfix/auth-crash-42                                                 │
│ PR: #891 (açık)  → [TFS'de Gör]                                             │
│                                                                              │
│ Müşteri Etkisi:                                                              │
│ ┌──────────────────────────────────┐                                        │
│ │ Etkilenen Müşteri: 15            │                                        │
│ │ Öncelikli: Akbank, Garanti, İş   │                                        │
│ └──────────────────────────────────┘                                        │
│                                                                              │
│ Onay Geçmişi:                                                               │
│ ✅ Teknik Lider: Ali K. — 14:45                                              │
│ ⏳ Bekliyor: Release Manager                                                 │
│ ⏳ Bekliyor: CTO (kritik hotfix için zorunlu)                                │
│                                                                              │
│ Onay Notu: [_____________________________________________]                  │
│                                                                              │
│ [🔴 Reddet]                                              [✅ Onayla]       │
──────────────────────────────────────────────────────────────────────────────
```

---

## Tab Yapısı (4 Tab)

### Tab 1 — Bekleyen Onay
- Kullanıcının rolüne göre onay beklediği hotfix'ler
- RELEASE_MANAGER: kendi onay adımını bekleyenler
- CTO: kritiklik seviyesi yüksek bekleyenler
- Her satır → drawer ile detay ve onayla/reddet

### Tab 2 — Aktif
- Onaylanmış, şu an geliştirme/test aşamasındaki hotfix'ler
- DataGrid: başlık, ürün, branch, PR durumu, aşama, son güncelleme
- Aşama Chip: Geliştirme / Test / Staging / Deploy'a Hazır

### Tab 3 — Tamamlanan
- Başarıyla deploy edilmiş hotfix'ler (son 30 gün)
- Hangi versiyona cherry-pick edildiği bilgisi

### Tab 4 — Reddedilen
- Reddedilen talepler + reddetme gerekçesi

---

## Yeni Hotfix Talebi — Dialog

```
┌─ Yeni Hotfix Talebi ──────────────────────────────────────────────┐
│ Başlık:        [__________________________________________]        │
│ Ürün:          [Cofins BFF ▾]                                      │
│ Hedef Versiyon:[v3.2.1 ▾]                                          │
│ Kritiklik:     ○ Kritik (prod çöküyor)                             │
│                ○ Yüksek (önemli fonksiyon bozuk)                  │
│                ○ Orta (workaround var)                             │
│ PR / Branch:   [_________________________________________]         │
│ Açıklama:      [__________________________________________]        │
│                [__________________________________________]        │
│ Müşteri Etkisi:[__________________________________________]        │
│                                                                    │
│ NOT: Kritik talepler CTO onayı gerektirir.                        │
│                                                                    │
│              [İptal]                [Talebi Gönder]               │
└────────────────────────────────────────────────────────────────────┘
```

---

## Onay Akışı (Multi-level)

```
Yeni Talep →
  Orta Kritiklik: Release Manager onayı
  Yüksek:         Release Manager → Teknik Lider
  Kritik:         Release Manager → Teknik Lider → CTO

Her onay adımında: bildirim gönder (n8n webhook → Slack/e-posta)
```

---

## API Bağlantıları

| Endpoint | Kullanım |
|---|---|
| `GET /api/hotfix-requests?status=pending` | Bekleyen tab |
| `GET /api/hotfix-requests?status=active` | Aktif tab |
| `POST /api/hotfix-requests` | Yeni talep |
| `GET /api/hotfix-requests/:id` | Detay drawer |
| `PATCH /api/hotfix-requests/:id/approve` | Onayla |
| `PATCH /api/hotfix-requests/:id/reject` | Reddet |

---

## Tasarım Notları

- Kritik hotfix → satır arka planı `error.light`, kalın başlık
- Badge ile tab sayaçları: `<Badge badgeContent={3} color="error">`
- Onayla butonu: `color="success"`, Reddet: `color="error"`
- Multi-level onay görselleştirme: `Stepper` bileşeni ile
