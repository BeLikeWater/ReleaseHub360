# Code Sync Yönetimi

**Route:** `/code-sync`  
**Kategori:** Workflow  
**Öncelik:** P1  
**Kaynak:** CodeSyncManagement.js (MCP entegrasyonu korunacak)

---

## Amaç

Servisler arasında kod senkronizasyonunu başlat, takip et. MCP Server entegrasyonu üzerinden çalışır. Farklı ortamlar arası branch kopyalama, conflict resolution, sync geçmişi.

---

## ASCII Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Code Sync Yönetimi                                    [+ Yeni Sync Başlat]  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ [Aktif Syncler (2)] [Bekleyenler (1)] [Tamamlanan] [Hata Verenler (1)]      │
│ ─────────────────────────────────────────────────────────────────────────   │
│                                                                              │
│ [Tab: Aktif Syncler] ─────────────────────────────────────────────────────  │
│                                                                              │
│ ┌─ cofins-bff-api ─────────────────────────────────────────────────────┐    │
│ │ main → production  │  Başlayan: 14:22  │ Tahmini: 5 dk  │ Ali K.  │    │
│ │                                                                      │    │
│ │ [─────────────────────────────────────────────────  ] %73           │    │
│ │                                                                      │    │
│ │ ✅ Kod analiz        ✅ Conflict tarama      🔄 Branch kopyalama...   │    │
│ │                                                                      │    │
│ │ Log:                                                                 │    │
│ │ [14:22:01] Sync başlatıldı                                           │    │
│ │ [14:22:05] Conflict analizi tamamlandı — 0 conflict                 │    │
│ │ [14:22:31] Kopyalama devam ediyor (23/31 dosya)                     │    │
│ │                                                                 [⏹] │    │
│ └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│ ┌─ cofins-file-service ─────────────────────────────────────────────────┐   │
│ │ hotfix/42 → main  │  Başlayan: 14:45  │  🔴 CONFLICT (3 dosya)       │   │
│ │ [Conflict'leri Çöz →]                                                 │   │
│ └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Yeni Sync Başlat — Stepper Wizard

```
Adım 1: Servis & Branch Seçimi
  Servis:        [cofins-bff-api ▾]
  Kaynak Branch: [main ▾]
  Hedef Branch:  [production ▾]
  [İleri →]

Adım 2: Conflict Analizi (otomatik)
  [Analiz ediliyor... ⏳]
  → Conflict bulunmadı ✅  veya
  → 3 conflict bulundu ⚠️ [Detayları Gör]
  [← Geri] [İleri →]

Adım 3: Onay & Başlat
  Servis:  cofins-bff-api
  İşlem:   main → production
  Risk:    Düşük (0 conflict)
  [← Geri] [Sync'i Başlat]
```

---

## Conflict Çözme Ekranı

```
┌─ Conflict Resolution: cofins-file-service ──────────────────────────────────┐
│ 3 dosyada conflict var                                                       │
│                                                                              │
│ Dosya 1: src/services/upload.service.ts                    [Çözüldü ✅]    │
│ Dosya 2: src/config/limits.config.ts                       [Manuel Çöz]     │
│ Dosya 3: package.json                                      [Kaynak Seç]     │
│                                                                              │
│ [src/config/limits.config.ts ─────────────────────────────────────────────]│
│ ┌──────────────────┬──────────────────────────────────────────────────────┐ │
│ │ KAYNAK (main)    │ HEDEF (production)                                   │ │
│ ├──────────────────┼──────────────────────────────────────────────────────┤ │
│ │ maxSize: 50MB    │ maxSize: 25MB                                         │ │
│ │ timeout: 30s     │ timeout: 60s                                          │ │
│ └──────────────────┴──────────────────────────────────────────────────────┘ │
│                                                                              │
│ Karar: ○ Kaynağı kullan  ○ Hedefi koru  ○ Manuel düzenle                   │
│                                                                              │
│ [Tüm Conflictleri Çözdüm → Sync'e Devam Et]                                │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## API Bağlantıları (Backend → MCP Proxy)

| Endpoint | Kullanım |
|---|---|
| `GET /api/sync-history` | Liste |
| `POST /api/sync/analyze` | Branch analizi başlat |
| `POST /api/sync/start` | Sync başlat |
| `GET /api/sync/:id/status` | Canlı durum (polling 5sn) |
| `POST /api/sync/:id/resolve-conflict` | Conflict çöz |
| `DELETE /api/sync/:id` | İptal et |

---

## Real-time Güncelleme

- Aktif sync kartları: `refetchInterval: 5_000` (5 sn poll)
- Log satırları: canlı eklenir — `append` ile

---

## Tasarım Notları

- Progress: `LinearProgress variant="determinate"` + yüzde text
- Log alanı: `<Box component="pre">` — monospace, koyu arka plan, max-height 200px, overflow scroll
- Conflict → kırmızı kart arka planı
- Stepper Wizard: `MUI Stepper` bileşeni, 3 adım
- Diff görünümü: iki panel yan yana `Grid xs={6}`
