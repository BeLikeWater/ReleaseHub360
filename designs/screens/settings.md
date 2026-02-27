# Ayarlar

**Route:** `/admin/settings`  
**Kategori:** Management (Admin)  
**Öncelik:** P1  
**Yeni Ekran** — TFS URL, n8n webhook, MCP URL şu an hardcoded

---

## Amaç

Dış servis bağlantılarını (TFS, n8n, MCP Server), bildirim tercihlerini ve sistem geneli konfigürasyonları yönet.

---

## ASCII Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Sistem Ayarları                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ [Entegrasyonlar] [Bildirimler] [Genel] [Güvenlik]                           │
│ ─────────────────────────────────────────────────                           │
│                                                                              │
│ [Tab: Entegrasyonlar] ────────────────────────────────────────────────────   │
│                                                                              │
│ ┌─ Azure DevOps / TFS ─────────────────────────────────────────────────┐   │
│ │ Organisation URL: [https://dev.azure.com/org__________________]      │   │
│ │ PAT Token:        [●●●●●●●●●●●●●●●●●●●●●●●●]  [Göster] [Düzenle]  │   │
│ │ Project:          [ReleaseHub360_________________]                   │   │
│ │ Durum: ✅ Bağlı — Son test: 21 Şub 14:00       [Bağlantıyı Test Et]│   │
│ └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│ ┌─ n8n Workflow Engine ────────────────────────────────────────────────┐   │
│ │ Base URL:    [http://n8n:5678_____________________]                  │   │
│ │ API Key:     [●●●●●●●●●●●●●●●●●●●●●●]  [Göster] [Düzenle]         │   │
│ │ Durum: 🟡 Bağlantı kurulamadı                  [Bağlantıyı Test Et]│   │
│ └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│ ┌─ MCP Server ─────────────────────────────────────────────────────────┐   │
│ │ Base URL:    [http://mcp-server:8083______________]                  │   │
│ │ Durum: ✅ Bağlı                                 [Bağlantıyı Test Et]│   │
│ └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│ [Tab: Bildirimler] ───────────────────────────────────────────────────────   │
│                                                                              │
│ E-posta Bildirimleri:                                                        │
│ ☑ Hotfix onayı                ☑ Pipeline başarısız                         │
│ ☑ Code sync tamamlandı        ☑ Breaking change tespit edildi              │
│ ☐ Her versiyon aşama geçişi   ☐ Tüm PR merge'leri                         │
│                                                                              │
│ Slack Webhook (opsiyonel):                                                   │
│ [https://hooks.slack.com/services/xxx_________________]                      │
│                                                                              │
│ [Tab: Genel] ─────────────────────────────────────────────────────────────   │
│                                                                              │
│ Uygulama Adı:      [ReleaseHub360__________]                                │
│ Varsayılan Zaman Dilimi: [Europe/Istanbul ▾]                                │
│ Tarih Formatı:     [DD MMM YYYY ▾]                                          │
│ Oturum Süresi:     [15 dk ▾] (access token)                                 │
│                                                                              │
│ [Değişiklikleri Kaydet]                                                      │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Bağlantı Test Mekanizması

"Bağlantıyı Test Et" butonuna basınca:
1. Backend'e `POST /api/settings/test-connection {type: 'tfs'}` 
2. Backend ilgili servisi ping eder
3. Sonuç: `✅ Bağlı` veya `🔴 Hata: connection refused`

---

## API Bağlantıları

| Endpoint | Kullanım |
|---|---|
| `GET /api/settings` | Tüm ayarlar (değerler maskelenmiş) |
| `PUT /api/settings` | Toplu güncelleme |
| `POST /api/settings/test-connection` | Bağlantı testi |

---

## Güvenlik Notları

- PAT/API key değerleri frontend'e hiçbir zaman plain text gelmez
- Görüntülenmiş hali: `●●●●●●●●●●●●` (masked)
- "Göster" → sadece o oturumda, audit log tutulur
- "Düzenle" → sadece yeni değer yazılır, eski değer döndürülmez

---

## Tasarım Notları

- Her entegrasyon `Card` / `Paper` bileşeni ile çerçevelenmiş
- Durum badge: `Chip` bileşeni, renk conditional
- Kaydet butonu: `position: sticky, bottom: 0` — uzun form için
- `TextField type="password"` + görünürlük toggle ikonu
