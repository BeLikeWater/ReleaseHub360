# Feature Spec: Release Health Check v3

**Hazırlayan:** Release Manager / Product Owner  
**Tarih:** 23 Şubat 2026  
**Hedef Dosya:** `packages/frontend/src/pages/ReleaseHealthCheckPage.tsx` (tam yeniden yazım)  
**Referans:** `ReleaseHub360/src/components/releaseHealthCheckParts/ReleaseHealthCheckV2.js` + ekip deneyimi

---

## Özet

Release Health Check sayfası, **bir ürünün belirli bir versiyonunun nihai yayın öncesi sağlık durumunu** gözlemlemek için kullanılır. Temel soru şudur: "Bu versiyon bugün üretime çıkabilir mi?" Bu soruyu yanıtlamak için prep ortamındaki fiili servis durumu, o release'e dahil olan PR'lar, onların work item'ları, release note'ları, sistem değişiklikleri ve bekleyen release todo'ları tek ekranda sergilenir. Ürünün modül grubu → modül → servis/API hiyerarşisi korunur (BoM perspektifi).

---

## Problem / Fırsat

### Oturmuş Olan (V2'den Güçlü Yönler)

| Bölüm | Ne işe yarıyor |
|---|---|
| Servis bazlı PR kırılımı | Her reponun PR'ları ayrı gösteriliyor — hangi servisin "kirli" olduğu anında belli |
| Work Item zinciri | PR → Work Item → Release Note zinciri izlenebilir |
| Module Group hiyerarşisi | BoM `ModuleGroup → Module → Service/API` üzerinden tanımlanıyor |
| Prep pod durumu | Ortamdaki fiili versiyon ile katalog versiyonu karşılaştırılıyor |
| İki tab ayırımı | "Yayına Hazır Paket" vs "Devam Eden Geliştirmeler" net ayrım |
| System Changes | Breaking change uyarısı var |
| Release Todos | Pre/during/post deployment checklist var |

### Sorunlar ve İyileştirme Fırsatları

| Sorun | Etki | V3 Çözümü |
|---|---|---|
| Versiyon seçimi yok — ürün seçince her şey o anın snapshot'ı | Hangi release için bakıyoruz belli değil | **Version selector**: PREP veya WAITING fazdaki versiyon seçilir |
| Sağlık skoru yüzeysel (sadece sayı) | Karar vermeyi desteklemiyor | **Detaylı skor kartı** + engel listesi |
| Firebase bağımlılığı | Yeni mimaride yok | Tüm veri backend API üzerinden |
| Hardcoded release date | Tarihe göre sınırlama mantığı kırık | Versiyon'un `preProdDate` / `targetDate` kullanılır |
| PR → WorkItem çağrısı n8n webhook'a gidiyor | Backend proxy olmadan frontend direkt çağırıyor | Backend `/tfs` proxy üzerinden |
| System Changes mock data | Gerçek veri yok | DB'deki `system-changes` tablosundan |
| Pod status n8n webhook'a gidiyor | Bağımlılık | MCP server veya backend üzerinden |
| UX: her şey accordion — bilgi gömülü kalıyor | Kritik uyarılar gözden kaçıyor | **Dashboard kartları** üstte, detaylar alt bölümlerde |
| Hotfix yayınlama bu sayfada | Sorumluluk karışıklığı | **Kapsam dışı** — Hotfix Merkezi sayfasına ait |
| "Devam eden geliştirmeler" aynı sayfada | Odak dağıtıyor | Ayrı tab → V3'te **ayrı sayfa veya drawer** |

---

## Kullanıcı Hikayeleri

- **Release Manager olarak** belirli bir versiyonu seçip "Bu versiyon bugün üretime çıkabilir mi?" sorusunu tek bakışta yanıtlamak istiyorum; çünkü sabah standupında 5 ürün hakkında karar vermem lazım.
- **Release Manager olarak** bu release'e giren servislerin (BoM) prep ortamındaki fiili versiyonlarını görmek istiyorum; çünkü bazı servisler release'e dahil olmayabilir.
- **Release Manager olarak** ilgili PR'ları modül bazında görmek istiyorum; çünkü hangi modülde "açık/merge edilmemiş PR" olduğunu bilmeden onay veremem.
- **Release Manager olarak** her PR'ın hangi work item'lara bağlı olduğunu ve bu work item'ların release note'larının hazır olup olmadığını görmek istiyorum.
- **Release Manager olarak** API breaking change uyarılarını release öncesi görmek istiyorum; çünkü müşteri iletişimini erken planlamam gerekiyor.
- **Release Manager olarak** release todo'larını (geçiş öncesi/anında/sonrası) görmek istiyorum; eksik todo varsa onay veremem.

---

## Kabul Kriterleri (AC)

### Genel
- [ ] Kullanıcı ürün seçer → o ürünün PREP veya WAITING fazındaki versiyonları listelenir
- [ ] Kullanıcı versiyon seçer → tüm bölümler o versiyona filtreli çalışır
- [ ] Versiyon seçilmeden hiçbir veri yüklenmez (skeleton / empty state gösterilir)
- [ ] Ürünün `pmType === 'AZURE'` değilse TFS bölümleri "Bu ürün için Azure DevOps yapılandırılmamış" uyarısı gösterir

### Sağlık Skoru
- [ ] Skor 0–100 arası hesaplanır, renk: ≥80 yeşil, 60–79 sarı, <60 kırmızı
- [ ] Skoru düşüren her etken ayrı card'da görünür: "X açık PR", "Y başarısız pipeline", "Z bekleyen P0 todo"
- [ ] Skor ≥ 80 ise "Release Onayla" butonu aktif olur
- [ ] Skor < 80 ise buton disabled, üzerinde tooltip açıklar: "3 açık PR ve 1 başarısız pipeline var"

### BoM — Servis Versiyonları
- [ ] Ürünün ModuleGroup → Module → Service hiyerarşisi gösterilir
- [ ] Her servis için: katalog versiyonu, prep ortamındaki fiili versiyon, fark var mı (chip rengi)
- [ ] Prep ortamı verisi yoksa "Ortam verisi alınamadı" satır bazlı uyarı gösterilir
- [ ] Versiyon farkı olan servisler önce listelenir (sıralama)

### PR Listesi
- [ ] Azure DevOps'tan çekilen PR'lar servis (repo) bazında gruplanır
- [ ] Her PR için: başlık, durum (active/merged/abandoned), kaynak branch, tarih
- [ ] Son release tarihinden (`preProdDate` veya `testDate`) bu yana olan PR'lar filtrelenir
- [ ] PR'dan linked work item ID'leri toplanır → Work Items bölümüne iletilir
- [ ] PR yoksa "Bu servis için PR bulunamadı" boş state gösterilir

### Work Items
- [ ] PR'lardan toplanan work item ID'leri ile Azure DevOps'tan detay çekilir
- [ ] Her work item: ID, başlık, tür (Bug/Feature/Task), durum, atanan kişi
- [ ] Hangi servisin PR'ından geldiği etiket olarak gösterilir
- [ ] Work item yoksa bilgilendirici boş state

### Release Notes
- [ ] Work item başına release note var mı yok mu gösterilir
- [ ] Release note yoksa "Eksik" chip ile işaretlenir
- [ ] Release note varsa açılabilir detay (accordion)
- [ ] Tüm work item'ların release note'u hazırsa bölüm başlığı "✅ Hazır" gösterir

### Sistem Değişiklikleri (System Changes)
- [ ] DB'deki `system-changes` tablosundan, seçili version ID'ye filtreli çekim
- [ ] Breaking change olanlar kırmızı chip ile öne çıkarılır
- [ ] Her değişiklik: alan adı, değişiklik tipi (eklendi/kaldırıldı/güncellendi), servis
- [ ] Breaking change varsa sağlık skorunu etkiler (−10 puan/adet)

### Release Todos
- [ ] Seçili versiyona ait release todo'lar zamanlamaya göre gruplanır: Geçiş Öncesi / Geçiş Anında / Geçiş Sonrası
- [ ] Her todo: açıklama, sorumlu takım, öncelik, tamamlanma durumu (checkbox)
- [ ] Tamamlanmamış P0 todo varsa sağlık skorunu etkiler
- [ ] Todo üzerinden tamamlandı işaretlenebilir (inline güncelleme)

### Release Onayla
- [ ] Onay butonu tıklanınca confirmation dialog açılır
- [ ] Onay verilince `PATCH /api/product-versions/:id/release` çağrılır
- [ ] Versiyon fazı PROD'a geçer, `releaseDate` set edilir
- [ ] Başarı durumunda toast mesajı + sağlık bölümleri refresh olur

---

## Kapsam Dışı (Out of Scope) — V3

| Kapsam Dışı | Neden |
|---|---|
| Hotfix yayınlama akışı | Hotfix Merkezi sayfasına ait |
| Devam eden geliştirmeler (pipeline, pod status, PR analiz) | Odak dağıtıyor; ayrı "Dev Dashboard" sayfası olabilir |
| Release note manuel yazımı | Ayrı Release Notes sayfasında |
| Pod status (Kubernetes) | MCP server entegrasyonu ayrı sprint |
| PR otomatik approve / merge | Tehlikeli aksiyon — kapsam dışı |
| n8n webhook direkt çağrıları | Backend proxy zorunlu |

---

## İş Kuralları

1. **Versiyon seçimi:** Sadece `computePhase(v) === 'PREP' || computePhase(v) === 'WAITING'` olan versiyonlar seçilebilir. PROD olmuş versiyon read-only gösterilir.
2. **BoM eşleştirme:** Service'in `repoName` alanı Azure repo match için, `serviceImageName` pod eşleştirme içindir.
3. **PR zaman filtresi:** Son release'in `preProdDate` veya `testDate`'inden bugüne — hangisi daha eski ise o baz alınır.
4. **Skor hesaplama (başlangıç formülü):**
   - Başlangıç: 100
   - Her açık/active PR: -3
   - Her başarısız pipeline: -10
   - Her tamamlanmamış P0 todo: -5
   - Her breaking change: -10
   - Minimum: 0
5. **Azure yapılandırma kontrolü:** Ürünün `pmType !== 'AZURE'` ise TFS bölümleri render edilmez, uyarı gösterilir. BoM ve Todo bölümleri her zaman gösterilir.
6. **Release onayla yetkisi:** Tüm kullanıcılar görebilir, onay sadece skor ≥ 80 ise aktif.
7. **Work Item - Release Note bağlantısı:** Work item ID'si üzerinden JOIN. Release note DB'de `workItemId` foreign key ile bağlı kabul edilir.

---

## Öncelik ve Etki

| Boyut | Değerlendirme |
|---|---|
| Kullanıcı etkisi | Release Manager günde 1–5 kez açar, release günlerinde sürekli açık |
| İş etkisi | Yanlış/erken release kararları önlenir → müşteri şikayeti azalır |
| Teknik risk | Orta — TFS bağımlılığı var, pod status entegrasyonu ayrı sprint |
| Öncelik | **P1** |

---

## Bağımlılıklar

| Bağımlılık | Durum | Not |
|---|---|---|
| `GET /api/products` | ✅ Var | |
| `GET /api/product-versions` | ✅ Var | `preProdDate`, `testDate` alanları dolu mu? |
| `GET /api/products/:id` (ModuleGroup + Module + Service) | ✅ Var | Nested include gerekirmi backend'de? |
| `GET /api/tfs/pull-requests?productId=` | ✅ Var | Per-product credentials eklendi |
| `GET /api/tfs/work-items?ids=&productId=` | ✅ Var | |
| `GET /api/release-todos?versionId=` | ✅ Var | |
| `GET /api/system-changes?versionId=` | ✅ Var | `productVersionId` field üzerinden filtre çalışıyor |
| `GET /api/release-notes?versionId=` | ✅ Var | `productVersionId` FK ile bağlı |
| `PATCH /api/product-versions/:id/release` | ✅ Var | |
| Pod Status (Prep ortamı servis versiyonları) | 🔴 Yok | MCP server entegrasyonu — V3'te mock/skip |

---

## Açık Sorular ✅ Tamamı Yanıtlandı

- [x] `system-changes` tablosunda `versionId` sütunu var mı? → **EVET.** `productVersionId` alanı var, `GET /api/system-changes?versionId=` filtrelemesi çalışıyor.
- [x] `release-notes` backend endpoint mevcut mu? → **EVET.** `GET /api/release-notes?versionId=` endpoint'i var, `productVersionId` FK ile bağlı.
- [x] `products/:id` nested dönüyor mu? → **EVET.** `moduleGroups: { include: { modules: true } }` + `services` ve `apis` include ediliyor.
- [x] Prep ortamı pod status? → **V3 kapsamı dışı.** MCP server entegrasyonu ayrı sprint. Bu sayfada pod sütunu "—" gösterilir, açıklama tooltip ile: "Ortam verisi entegrasyonu planlandı".
- [ ] PR'ları son release tarihine göre filtreleme için base date: `preProdDate` mi `testDate` mi? — **Release Manager** karar vermeli (öneri: preProdDate)

---

## Tasarım Notları (UX Designer İçin)

### Kim, Nerede, Hangi Ruh Halinde Açar?
- **Kim:** Release Manager, bazen Team Lead
- **Nerede:** Sabah stand-up öncesi, release günü boyunca, prod push kararı öncesi
- **Ruh hali:** Temkinli, hızlı karar vermek istiyor, detaylara tıklamak istemiyor ama gerektiğinde inebilmeli

### Bilgi Hierarchy
```
1. SEÇİCİLER (Ürün + Versiyon) — her zaman görünür, sticky header
2. KARAR DESTEK KARTI — sağlık skoru + engel özeti + "Release Onayla" butonu
3. BOM TABLOSU — servis versiyonları, prep durumu (compact, expand edilebilir)
4. PR LİSTESİ — repo/servis bazlı, her birini expand et
5. WORK ITEMS — PR'lardan otomatik toplanan
6. RELEASE NOTES — work item başına durum
7. SİSTEM DEĞİŞİKLİKLERİ — breaking change öne çıkar
8. RELEASE TODO'LAR — zamanlamaya göre gruplanan checklist
```

### UX Prensipleri
- **Kritik uyarılar yukarıda:** Breaking change veya P0 todo varsa karar destek kartında banner göster
- **"Yeşil = geç" sistemi:** Bölüm başlıkları yeşil ✅ / sarı ⚠️ / kırmızı ❌ statü ikonu taşır
- **Collapse by default:** PR listesi ve BoM tablo ilk açılışta compact; expand butonu ile açılır
- **Sayfa kaydırma yerine tab yok:** Tüm bölümler tek sayfada, sticky header ile navigasyon
- **"Release Onayla" butonu:** Header'da sabit, her scroll pozisyonunda görünür
- **Genişlik:** Full width sayfa, iki kolon layout değil — dikey akış

### BoM Tablosu Taslak Görünüm
```
ModuleGroup: Ödeme Servisleri                              [▶ Aç]
  └ Module: Core Banking
      ├ cofins-service-api      | Katalog: 1.0.45 | Prep: 1.0.47 | ⚠ Fark Var
      ├ cofins-auth-service     | Katalog: 2.1.3  | Prep: 2.1.3  | ✅ Eşit
      └ cofins-report-api       | Katalog: 1.3.0  | Prep: —      | ⚪ Veri Yok
```

### PR Listesi Taslak
```
📁 cofins-service-api (3 PR)                              [▶ Aç]
  ├ [OPEN]   feature/payment-v2   → main    15 Şub
  ├ [MERGED] fix/timeout-issue    → main    18 Şub
  └ [MERGED] refactor/db-pool     → main    20 Şub

📁 cofins-auth-service (1 PR)                             [▶ Aç]
  └ [MERGED] security/jwt-refresh → main    22 Şub
```

---

## Sonraki Adımlar (Pipeline)

```
1. [RM ✅]     Bu spec — release-health-check-v3.md
2. [UX]        designs/screens/release-health-check.md → wireframe + component kararları
3. [Backend]   system-changes versionId kontrolü, release-notes endpoint, product nested query
4. [Frontend]  ReleaseHealthCheckPage.tsx tam yeniden yazım
5. [QA]        Ekran audit → BUG-XXX açma
```
