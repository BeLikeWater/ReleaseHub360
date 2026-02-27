# Ekran Tasarımı: Müşteri Versiyon Senkronizasyonu (Code Sync)

**Spec:** `designs/specs/customer-version-sync.md`  
**Route:** `/code-sync/sync`  
**Kategori:** Workflow / İki Panel Command  
**MUI Versiyon:** v7  
**Tarih:** 2026-02-25

---

## Ekran Kategorisi ve Kullanıcı Profili

**Kategori:** Workflow + İki Panel Comparison — Adım adım süreç ama aynı anda iki farklı veriyi karşılaştırmak zorunda.

**Kim kullanır:** Müşteri firmanın developer / sistem yöneticisi. Teknik ama Azure DevOps'a girmek istemez. Git commit hash'lerini görmek istemez. Workitem başlıkları ve feature açıklamaları yeterli. Karar verme sürecini hızla tamamlamak ister.

**Ne zaman açar:** Ürün yeni versiyon duyurusu geldiğinde. Haftada 1-2 kez ya da büyük versiyonlarda ayda 1.

**Mental model:** "Ürünün yeni versiyonunda ne var, hangilerini alayım, al."

---

## Sayfa Yapısı (Macro Layout)

```
┌────────────────────────────────────────────────────────────────────────────┐
│  AppBar — ReleaseHub360                                        [👤 Kullanıcı]│
├────────────────────────────────────────────────────────────────────────────┤
│  ← Geri    Versiyon Senkronizasyonu                                        │
│                                                                            │
│  ┌── Bağlam Seçici ─────────────────────────────────────────────────────┐ │
│  │  Ürün: [EthixNG ▾]  Servis: [ETX.API.Gateway ▾]                     │ │
│  │  Müşteri Branch: [pre_master ▾]                                      │ │
│  │  Kaynak Versiyon: [v1.4.0 ▾]  →  Hedef Versiyon: [v1.5.0 ▾]        │ │
│  │                                                    [Delta'yı Yükle →] │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  ┌─ [Senkronizasyon] [Geçmiş] ──────────────────────────────────────────┐ │
│  │                                                                      │ │
│  │  ┌── ÜRÜN DEĞİŞİKLİKLERİ ─────────┐  ┌── MÜŞTERİ BRANCH ──────────┐│ │
│  │  │  v1.4.0 → v1.5.0               │  │  pre_master                 ││ │
│  │  │  📦 24 workitem │ 47 PR        │  │  Son 3 ay │ 31 PR           ││ │
│  │  │  ─────────────────────────────  │  │  ──────────────────────     ││ │
│  │  │  [workitem listesi - accordion] │  │  [PR listesi]               ││ │
│  │  └─────────────────────────────────┘  └─────────────────────────────┘│ │
│  │                                                                      │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  ┌── Aksiyon Çubuğu ────────────────────────────────────────────────────┐ │
│  │  Seçilen: 3 workitem, 8 PR   [Çakışma Analizi]  [Sync Başlat →]    │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Bağlam Seçici (Context Bar)

```
┌── Bağlam Seçici ──────────────────────────────────────────────────────────┐
│                                                                           │
│  Ürün         Servis              Müşteri Branch                          │
│  [EthixNG ▾]  [ETX.API.Gateway ▾] [pre_master (EthixNG-Customer) ▾]      │
│                                                                           │
│  Kaynak Versiyon         Hedef Versiyon                                   │
│  [v1.4.0 — 15 Oca ▾]  →  [v1.5.0 — 20 Şub ▾]                          │
│                                                                           │
│  💡 Son sync: v1.3.0 → v1.4.0 · 42 gün önce · ✅ Başarılı             │
│                                                              [Delta Yükle]│
└───────────────────────────────────────────────────────────────────────────┘
```

**Notlar:**
- "Son sync" satırı: CustomerBranch'e bağlı son başarılı SyncHistory'den gelir. İlk kullanımda gösterilmez.
- Kaynak versiyon default: son başarılı sync'in hedef versiyonu (ör. bir önceki). İlk kullanımda kullanıcı seçer.
- Hedef versiyon dropdown: yalnızca kaynak versiyondan yüksek, published versiyonları listeler.
- "Delta Yükle" butonu panelleri doldurur; her seçim değişiminde otomatik reload istemez (kasıtlı).

---

## Sol Panel — Ürün Değişiklikleri (Workitem Accordion)

```
┌── ÜRÜN DEĞİŞİKLİKLERİ (v1.4.0 → v1.5.0) ───────────────────────────────┐
│  📦 24 workitem  │  47 PR  │  [□ Hepsini Seç]  [Seçimi Temizle]         │
│                                                                           │
│  ┌─ [□] ✨ Feature  #4312 · E-Fatura Entegrasyonu Yenileme     (6 PR) ───┐│
│  │  Açık: 20 Oca · Tamamlanan: 8 Şub                                    ││
│  │  ──────────────────────────────────────────────────────────────────── ││
│  │  [▼ PR'ları Göster]                                                   ││
│  │    ├── ✅ #892 · feat: e-fatura header yenileme  · 5 Şub · @ali.k   ││
│  │    │       ETX.API.Gateway  │  [Cherry-pick ID: abc123f]             ││
│  │    ├── ✅ #897 · fix: vergi kodu validasyonu     · 6 Şub · @can.d   ││
│  │    ├── ✅ #901 · test: e-fatura unit tests        · 7 Şub · @selin  ││
│  │    └── ✅ #908 · refactor: invoice service split · 8 Şub · @ali.k   ││
│  └─────────────────────────────────────────────────────────────────────-─┘│
│                                                                           │
│  ┌─ [□] 🐛 Bug  #4389 · Login timeout sorunu                    (2 PR) ──┐│
│  │  Açık: 25 Oca · Tamamlanan: 1 Şub                                    ││
│  │  [▼ PR'ları Göster]                                                   ││
│  │    ├── ✅ #881 · fix: session expiry handler    · 31 Oca · @ece.y   ││
│  │    └── ✅ #883 · fix: refresh token edge case  ·  1 Şub · @ece.y   ││
│  └───────────────────────────────────────────────────────────────────────┘│
│                                                                           │
│  ┌─ [✓] ✨ Feature  #4401 · Dashboard Performans İyileştirmesi  (3 PR) ──┐│  ← Seçilmiş
│  │  SELECTED  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓           ││
│  │  ├── ✅ #912 · perf: lazy load dashboard charts · 10 Şub · @fatma  ││
│  │  ├── ✅ #915 · perf: memo hooks                 · 11 Şub · @fatma  ││
│  │  └── □  #919 · chore: bundle size report        · 12 Şub · @okan   ││  ← Individual deselect
│  └───────────────────────────────────────────────────────────────────────┘│
│                                                                           │
│  ┌─ [✓] 🐛 Bug  #4298 · [MÜŞTERİDE MEVCUT] API rate limit hatası ───────┐│  ← Zaten senkronize
│  │  ░░ Bu workitem müşteri branch'inde zaten mevcut ░░                  ││
│  │  Son sync: v1.4.0 · 15 Oca                                           ││
│  └───────────────────────────────────────────────────────────────────────┘│
│                                                                           │
│  // Sınıflandırılmamış (3 PR — workitem'sız)                             │
│  ─────────────────────────────────────────────────────────────────────── │
│  ├── □  #887 · chore: dependency updates          · 3 Şub · @bot       │
│  └── □  #889 · ci: pipeline yaml güncelleme       · 3 Şub · @devops    │
└───────────────────────────────────────────────────────────────────────────┘
```

**Bileşen Kararları:**
- Her satır: MUI `Accordion` — summary'de `Checkbox` + workitem tipi `Chip` (✨/🐛/📋) + başlık + PR sayısı badge.
- PR listesi `Accordion.details` içinde `List` + `ListItem`.
- Zaten müşteride olan workitem grubu: `alpha 0.4 opacity` + "MÜŞTERİDE MEVCUT" `Chip(color="success")` + checkbox disabled.
- Seçilmiş grup: `outlined border primary.main` + hafif `primary.light` arka plan.
- PR satırında cherry-pick commit ID gizlenebilir tooltip'te — kullanıcının buna bakması gerekmiyor.
- "Sınıflandırılmamış" grubu: collapsible, açık olmayan PR'ların gösterildiği bölüm — checkbox ile seçilebilir.

---

## Sağ Panel — Müşteri Branch'i Mevcut Durumu

```
┌── MÜŞTERİ BRANCH (pre_master) ────────────────────────────────────────────┐
│  Son 3 ay  │  31 PR  │  Repo: EthixNG-Customer / ETX.API.Gateway          │
│                                                                            │
│  🔍 [PR başlığı ara...]                              [Tarih: Yeniden ▾]  │
│  ──────────────────────────────────────────────────────────────────────── │
│                                                                            │
│  ✅ #298 · fix: API rate limit hatası              · 15 Oca · @ibrahim    │
│       🔗 Kaynak: ReleaseHub sync v1.3.0→v1.4.0                           │
│                                                                            │
│  ✅ #301 · feat: kullanıcı davet modülü            · 18 Oca · @ibrahim    │
│       🔗 Kaynak: ReleaseHub sync v1.3.0→v1.4.0                           │
│                                                                            │
│  ✅ #310 · fix: login redirect sorunu              · 22 Oca · @devops    │
│       ⚠️  Kaynak: Manuel (ReleaseHub dışı)                               │
│                                                                            │
│  ─── Sync Sınırı (v1.4.0) ─────────────────────────────────────────────  │
│                                                                            │
│  ✅ #287 · feat: rapor export özelliği             · 28 Ara · @ibrahim    │
│  ...                                                                       │
└────────────────────────────────────────────────────────────────────────────┘
```

**Bileşen Kararları:**
- MUI `List` + `ListItem` — PR'lar merge tarihe göre yeniden eskiye.
- "Kaynak: ReleaseHub sync" etiketi — mevcut PR'ların hangi sync'ten geldiğini gösterir. SyncHistory payload'dan.
- "Kaynak: Manuel" — kaynak bilinmiyorsa gösterilir; bilgi amaçlı.
- "Sync Sınırı" divider: son başarılı sync noktasını görsel olarak ayırır.
- Sağ panel scroll bağımsız — sol panel scroll etmeden sağ panel kaydırılabilir.
- PR adedi 50'yi geçerse "Daha fazla yükle" butonu.

---

## Çakışma Analizi Paneli (Opsiyonel Drawer)

"Çakışma Analizi" butonuna basıldığında sağ panelin üzerine `Drawer` açılır:

```
┌── Çakışma Analizi ─────────────────────────────────────────────── [✕] ────┐
│                                                                            │
│  Analiz ediliyor... ████████████░░░░░░ %60                                │
│  Seçilen 8 PR'ın pre_master ile çakışmaları kontrol ediliyor...          │
│                                                                            │
│  ─────────── Sonuç ─────────────────────────────────────────────────────  │
│                                                                            │
│  ✅ Çakışma Yok  (6 PR)                                                   │
│  ⚠️  Potansiyel Çakışma  (2 PR)                                           │
│                                                                            │
│  ⚠️  #892 · feat: e-fatura header yenileme                                │
│       Çakışan dosya: src/invoice/InvoiceHeader.cs                        │
│       Sebep: pre_master'da aynı dosya farklı değiştirilmiş              │
│                                                                            │
│  ⚠️  #901 · test: e-fatura unit tests                                     │
│       Çakışan dosya: tests/InvoiceTests.cs                               │
│                                                                            │
│  ⚠️  Bu PR'ları seçimden çıkmak ister misiniz?                           │
│     [Çakışanları Seçimden Çıkar]  [Yine de Devam Et]                    │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Sync Onay Dialogu

"Sync Başlat" butonuna basınca MUI `Dialog` açılır:

```
┌── Senkronizasyonu Onayla ─────────────────────────────────── [✕] ─────────┐
│                                                                            │
│  Servis:         ETX.API.Gateway                                          │
│  Hedef Branch:   pre_master                                               │
│                                                                            │
│  Alınacak Değişiklikler                                                   │
│  ─────────────────────                                                    │
│  ✨ Feature  #4312 · E-Fatura Entegrasyonu Yenileme      (6 PR)          │
│  ✨ Feature  #4401 · Dashboard Performans İyileştirmesi   (3 PR / 2 seçili)│
│  🐛 Bug     #4389 · Login timeout sorunu                  (2 PR)          │
│                                                                            │
│  Toplam: 11 PR, 3 workitem                                                │
│                                                                            │
│  Oluşturulacak Branch:                                                    │
│  sync/v1.5.0-etx-api-gateway-20260225                                     │
│                                                                            │
│  Bu işlem seçilen commit'leri cherry-pick ederek yeni bir branch açar    │
│  ve pre_master'a PR oluşturur. Merge kararı size aittir.                 │
│                                                                            │
│                  [Vazgeç]          [Sync Başlat  →]                       │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Sync Devam Ediyor — İlerleme Görünümü

Onay sonrası ekran "Sync devam ediyor" moduna geçer. Tüm ekran değişmez; üst kısma progress bar + adım göstergesi eklenir, aksiyon çubuğu devre dışı kalır:

```
┌── Sync Devam Ediyor ─────────────────────────────────────────────────────┐
│  ████████████████████████░░░░░░░░░░░░  %65                               │
│                                                                           │
│  ✅ Feature branch oluşturuldu     sync/v1.5.0-etx-api-gateway-20260225  │
│  ✅ Cherry-pick: 7/11 PR tamamlandı                                       │
│  🔄 Cherry-pick: #912 perf: lazy load dashboard charts...                │
│  ─ Sırada: #915, #919                                                     │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Sync Tamamlandı — Başarı Durumu

```
┌── ✅ Senkronizasyon Tamamlandı ──────────────────────────────────────────┐
│                                                                           │
│  11 PR başarıyla cherry-pick edildi.                                      │
│                                                                           │
│  PR Oluşturuldu:                                                          │
│  🔗 [sync/v1.5.0 → pre_master] PR #342 — Azure DevOps'ta görüntüle →    │
│                                                                           │
│  ┌── Özet ───────────────────────────────────────────────┐               │
│  │  Branch:  sync/v1.5.0-etx-api-gateway-20260225       │               │
│  │  PR:      #342  pre_master ← sync/v1.5.0-...         │               │
│  │  Süre:    1 dk 23 sn                                  │               │
│  └───────────────────────────────────────────────────────┘               │
│                                                                           │
│  [Yeni Senkronizasyon Başlat]    [Geçmişe Git]                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Sync Başarısız — Conflict Durumu

```
┌── ⚠️  Çakışma Tespit Edildi ─────────────────────────────────────────────┐
│  Cherry-pick işlemi 8. PR'da durdu.                                      │
│                                                                           │
│  🔴 #912 · perf: lazy load dashboard charts                               │
│       Çakışan dosyalar:                                                   │
│       • src/Dashboard/DashboardLayout.cs (3 conflict)                    │
│       • src/Dashboard/ChartUtils.cs      (1 conflict)                    │
│                                                                           │
│  Oluşturulan branch silinmedi:                                            │
│  sync/v1.5.0-etx-api-gateway-20260225                                    │
│                                                                           │
│  Sonraki Adım:                                                            │
│  1. Azure DevOps'ta branch'i manuel resolve edin                         │
│  2. Ya da bu PR'ı seçimden çıkarıp tekrar deneyin                        │
│                                                                           │
│  [Bu PR'ı çıkar, kalan commit'lerle devam et]   [Azure DevOps'ta Aç →]  │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Geçmiş Sekmesi

```
┌── Senkronizasyon Geçmişi ────────────────────────────────────────────────┐
│  ETX.API.Gateway  ·  pre_master                                          │
│                                                                          │
│  ┌──────┬──────────────────────┬─────────────┬──────┬──────────────────┐│
│  │ Tarih│ Versiyon Aralığı     │ İçerik      │ Durum│ PR               ││
│  ├──────┼──────────────────────┼─────────────┼──────┼──────────────────┤│
│  │ Bugün│ v1.4.0 → v1.5.0     │ 3 WI, 11 PR │ ✅   │ #342 [→]        ││
│  │ 15 Oc│ v1.3.0 → v1.4.0     │ 5 WI, 18 PR │ ✅   │ #298 [→]        ││
│  │ 8 Ar │ v1.2.1 → v1.3.0     │ 2 WI, 7 PR  │ ⚠️   │ Conflict (3 dosya)││
│  │ 20 Ka│ v1.2.0 → v1.2.1     │ 1 WI, 3 PR  │ ✅   │ #241 [→]        ││
│  └──────┴──────────────────────┴─────────────┴──────┴──────────────────┘│
└──────────────────────────────────────────────────────────────────────────┘
```

- MUI X Data Grid — sıralama, filtreleme
- PR linki: Azure DevOps'a dış link (yeni sekme)
- Durum chip: SUCCESS=green, CONFLICT=orange, FAILED=red, RUNNING=blue+spinner

---

## Boş State'ler

**Hiç sync yapılmamış (ilk kullanım):**
```
Henüz senkronizasyon yapılmamış.
pre_master branch'ini ürün versiyonuyla senkronize etmeye başlamak için
kaynak ve hedef versiyon seçin.
[Delta Yükle →]
```

**Delta yok (zaten senkronize):**
```
✅  pre_master zaten güncel!
v1.4.0 → v1.5.0 arasındaki tüm değişiklikler bu branch'te mevcut.
[Geçmişi Görüntüle]
```

---

## Renk Kodları ve İkonlar

| Durum | Renk | İkon |
|---|---|---|
| Müşteride mevcut | success.light arka plan | ✅ |
| Seçili | primary.light arka plan + primary border | ☑️ |
| Seçilebilir | default | □ |
| Conflict riski | warning | ⚠️ |
| Çakışma tespiti | error | 🔴 |
| Feature workitem | info chip | ✨ |
| Bug workitem | error chip | 🐛 |
| PBI / Task | default chip | 📋 |

---

## API Bağlantıları (Frontend → Backend)

| Frontend İhtiyacı | Backend Endpoint |
|---|---|
| Ürün / Servis / Version listesi | Mevcut `GET /api/products`, `/api/services`, `/api/versions` |
| Müşteri branch listesi | `GET /api/customer-branches?serviceId=...` |
| Delta PR listesi (workitem gruplu) | `GET /api/code-sync/delta?sourceVersionId=&targetVersionId=&serviceId=` |
| Müşteri branch PR'ları | `GET /api/code-sync/customer-prs?customerBranchId=` |
| Çakışma analizi | `POST /api/code-sync/conflict-check` |
| Sync başlat | `POST /api/code-sync/start` |
| Sync durumu polling | `GET /api/code-sync/:syncId/status` (5sn interval) |
| Geçmiş | `GET /api/code-sync/history?customerBranchId=` |

---

## Handoff Notu — UX Designer

**Tarih:** 2026-02-25  
**Tasarım dosyası:** `designs/screens/customer-version-sync.md`  
**Spec:** `designs/specs/customer-version-sync.md`

### Backend Developer için
Tüm AC'ler tasarımda karşılandı. Kritik notlar:
- Sol panel accordion render'ı için `GET /api/code-sync/delta` yanıtı şu formatta bekleniyor:
  ```json
  {
    "workitems": [{
      "id": 4312, "title": "...", "type": "Feature",
      "prs": [{ "prId": 892, "title": "...", "mergeDate": "...", "author": "...", "repoName": "...", "commitIds": ["abc123"] }]
    }],
    "unclassified": [{ "prId": 887, "title": "...", ... }]
  }
  ```
- Müşteri branch PR'ları için `GET /api/code-sync/customer-prs` yanıtında `syncSource` alanı bekleniyor: `"RELEASEHUB"` veya `"MANUAL"`.
- Sync başlatma `POST /api/code-sync/start` async çalışır; response'ta `syncId` döner. Frontend bu ID ile `GET /api/code-sync/:syncId/status` polling yapar.
- Status endpoint yanıtı:
  ```json
  {
    "status": "RUNNING|SUCCESS|CONFLICT|FAILED",
    "progress": { "total": 11, "done": 7, "current": "#912" },
    "result": { "prUrl": "...", "prId": 342 } // SUCCESS'te
    "conflict": { "prId": 912, "files": ["..."] } // CONFLICT'te
  }
  ```
- Conflict durumunda "Bu PR'ı çıkar, kalan commit'lerle devam et" aksiyonu için: `POST /api/code-sync/:syncId/skip-and-continue` endpoint gerekiyor.

### DevOps Engineer için
- Cherry-pick işleminin Azure DevOps'ta nasıl çalıştığını validate et: `POST /git/cherryPicks` async mı, sync mı? Timeout süresi nedir?
- Büyük PR setlerinde (20+ PR) chunk stratejisi gerekebilir.
- PAT scope tablosunu belgele: Code Read/Write + PR Contribute minimum.
- pre_master branch'e write izni olmadan işlem yapılamaz — hata mesajı backend'de anlamlı olmalı.

### RM Review Beklenyor
UX tasarımı RM GATE'de kullanıcı onayı bekliyor.
