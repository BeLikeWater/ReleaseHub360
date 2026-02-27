# Pipeline Durumu

**Route:** `/pipeline`  
**Kategori:** Detail  
**Öncelik:** P2  
**Kaynak:** PipelineStatus.js (TFS → backend proxy)

---

## Amaç

Tüm servislerin CI/CD pipeline durumunu izle. Failed olanları hızlıca tespit et ve yeniden tetikle.

---

## ASCII Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Pipeline Durumu        [Ürün ▾] [Durum ▾]     [🔄 Yenile]  Otomatik: 1dk   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ Özet: ✅ 7 Başarılı  |  🔄 2 Çalışıyor  |  🔴 1 Başarısız  |  ⏸ 3 Bekliyor  │
│                                                                              │
│ [Tüm Servisler] [Sadece Hatalı (1)] [Çalışıyor (2)]                         │
│                                                                              │
│ ┌─────────────────────────────────────────────────────────────────────────┐  │
│ │ ┌─ cofins-bff-api ──────────────────────────────────────┐              │  │
│ │ │ Build #234  │ ✅ Başarılı  │ 3 dk 42 sn  │ 21 Şub 14:22 │  Ali K.  │  │
│ │ │ Branch: main → production                 [Log'u Gör]  [Tetikle]    │  │
│ │ └────────────────────────────────────────────────────────────────────┘  │  │
│ │                                                                         │  │
│ │ ┌─ cofins-file-service ─────────────────────────────────┐              │  │
│ │ │ Build #89   │ 🔴 Başarısız │ 1 dk 12 sn  │ 21 Şub 14:45 │ Vacit B. │  │
│ │ │ Branch: hotfix/42          Hata: npm test failed       │             │  │
│ │ │ [Log'u Gör]                                [Tekrar Çalıştır]        │  │
│ │ └────────────────────────────────────────────────────────────────────┘  │  │
│ │                                                                         │  │
│ │ ┌─ cofins-worker-service ───────────────────────────────┐              │  │
│ │ │ Build #156  │ 🔄 Çalışıyor │ [▓▓▓▓▓▓░░░░] %68        │ Sistem      │  │
│ │ │ Adım: Deploy (3/4)                      Tahmini: 2 dk  │             │  │
│ │ └────────────────────────────────────────────────────────────────────┘  │  │
│ └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

── Log Görünümü (drawer veya expand) ────────────────────────────────────────
│ cofins-file-service — Build #89 Logları                              [✕]   │
│ ─────────────────────────────────────────────────────────────────────────── │
│ [14:45:01] npm ci... OK                                                     │
│ [14:45:23] npm run build... OK                                              │
│ [14:45:31] npm test...                                                      │
│ [14:46:03] FAIL src/upload.service.test.ts                                  │
│ [14:46:03]   ● UploadService › should reject file over 25MB                │
│ [14:46:03]     Expected: 413 | Received: 200                                │
│ [14:46:03] Tests: 1 failed, 24 passed                                       │
│ [14:46:03] Build failed — exit code 1                                       │
──────────────────────────────────────────────────────────────────────────────
```

---

## API Bağlantıları

| Endpoint | Kullanım |
|---|---|
| `GET /api/tfs/pipelines` | Pipeline listesi |
| `GET /api/tfs/pipelines/:id/logs` | Log dosyası |
| `POST /api/tfs/pipelines/:id/trigger` | Yeniden tetikle |

---

## Real-time

- `refetchInterval: 60_000` — 1 dk otomatik yenileme
- Çalışıyor durumdaki pipeline'lar için: `refetchInterval: 10_000`

---

## Tasarım Notları

- Her servis bir `Card` bileşeni — `elevation: 2`
- Çalışan pipeline `LinearProgress` animasyonu
- Log: monospace, dark background `<Box component="pre">`
- Durum renk sistemi: başarılı `success.main`, başarısız `error.main`, çalışıyor `info.main`
