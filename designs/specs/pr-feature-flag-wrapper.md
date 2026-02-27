# Feature Spec: PR Bazlı Müşteri Özelliği Algılama ve Feature Flag Sarmalama

**Tarih:** 2026-02-25  
**Durum:** Netleştirilmiş — Geliştirmeye hazır  
**Öncelik:** P1  

---

## Özet

Kullanıcı, bir PR'ı ReleaseHub360 üzerinden manuel olarak "Feature Flag Analizi" tetiklemesine tabi tutar. Sistem önce PR'a bağlı workitem(lar) üzerinde kayıtlı müşteri bilgisine bakar. Müşteri bilgisi varsa doğrudan flag üretimine geçer; yoksa PR diff'ini LLM'e gönderir. LLM müşteriye özgü kod tespit ederse "Feature flag gerekli" feedback'i döner. Kullanıcı onayladığında C# kodu feature flag ile sarmalanır ve bu dönüşümü içeren yeni bir PR otomatik açılır. Merge kararı tamamen insana aittir — sistem yalnızca PR oluşturur.

Flag sistemi: AppConfig benzeri varsayılan pattern. Projede özel bir flag yapısı varsa tarif edilir ve o syntax kullanılır.

---

## Problem / Fırsat

### Şu an ne oluyor?

Geliştirme ekibi belirli bir müşteri için özel bir davranış kodladığında bunu genellikle doğrudan `if (customer === "ACME")` ya da müşteri bazlı config okuma ile trunk'a merge ediyor. Bu yaklaşımın üç kritik sorunu var:

1. **Görünmezlik:** Hangi kod kimin için yazıldığı PR açıklamasında yok; review eden bunu anlamakta zorlanıyor.
2. **Yayılma riski:** Müşteri A için yazılan kritik bir if dalı, müşteri B'nin ortamını etkiliyor çünkü feature flag yoksa hepsi çalışır.
3. **Kaldırma zorluğu:** Müşteri ilişkisi bittiğinde ya da özellik genel platforma alındığında, o koda ait tüm dalları bulmak manuel bir arkeoloji işi oluyor.

### Düzeltilmezse ne olur?

- Her müşteri için fork sayısı artar, code sync giderek daha maliyetli olur.
- Hotfix'ler yanlış müşterileri etkiler.
- QA hangi müşterinin hangi feature'ı test etmesi gerektiğini ayırt edemez.

### Fırsat

Sistemin zaten MCP Server üzerinden kod analizi yapabildiği (PR diff okuma, LLM analizi) ve Azure DevOps API ile PR oluşturabildiği biliniyor. Bu altyapıyı kullanarak zero-touch bir "feature flag önerici" pipeline kurulabilir.

---

## Kullanıcı Hikayeleri

- **Release Manager olarak** bir PR'ı seçip "Feature Flag Analizi Başlat" diyebilmek istiyorum, çünkü code freeze öncesinde hangi değişikliklerin hangi müşteriyle ilgili olduğunu belirlemem gerekiyor.
- **Developer olarak** LLM'in "bu kod müşteriye özgü" dediği sonucu görüp onaylayabilmek istiyorum, çünkü yanlış tespite kör güvenmek istemiyorum.
- **Release Manager olarak** onayımın ardından feature flag sarmalı PR'ın otomatik açılmasını istiyorum, çünkü bunu elle yapmak zaman alıyor; işin sahibi gereksiz görürse onaylamaz, bu yeterli.

---

## Kabul Kriterleri (AC)

### Tetikleme (Manuel)

- [ ] **AC-1:** Kullanıcı, PR detay ekranındaki "Feature Flag Analizi Başlat" butonuna tıklar. Sistem analizi başlatır; tamamlandığında sonuç paneli otomatik açılır.
- [ ] **AC-2:** Analiz sırasında adım adım ilerleme göstergesi gösterilir: "Workitem kontrol ediliyor... / Diff okunuyor... / LLM analizi yapılıyor..."

### Müşteri Tespiti — İki Aşamalı

- [ ] **AC-3:** Sistem önce PR'a bağlı workitem(lar) üzerindeki müşteri alanını kontrol eder. Kayıtlı müşteri varsa LLM analizine girmeden doğrudan "Feature flag gerekli" kararı verilir; algılanan müşteri ve kaynak ("Workitem'dan") gösterilir.
- [ ] **AC-4:** Workitem'da müşteri bilgisi yoksa PR diff'i MCP Server üzerinden okunur ve LLM analizine gönderilir.
- [ ] **AC-5:** LLM analizi sonucunda müşteri spesifik kod tespit edilirse "Feature flag gerekli" paneli açılır; tespit edilmezse "Bu PR'da müşteri spesifik kod tespit edilmedi" mesajı gösterilir ve akış sonlanır. Gereksiz PR açılmaz.
- [ ] **AC-6:** LLM analiz sonucunda şunlar gösterilir: tespit edilen müşteri (veya "Belirsiz"), ilgili dosya ve satır aralıkları, kısa açıklama, güven skoru (0–100).

### Onay Adımı

- [ ] **AC-7:** Kullanıcıya "Feature flag ile sarmala ve PR aç" / "İptal" seçeneği sunulur. İş sahibi gereksiz bulursa "İptal" diyerek akışı sonlandırabilir; hiçbir branch veya PR açılmaz.
- [ ] **AC-8:** Onay öncesinde kullanıcıya flag adı gösterilir. Varsayılan format: `CUSTOMER_{CUSTOMER_CODE}_{FEATURE_SLUG}`. Kullanıcı bu ismi düzenleyebilir.
- [ ] **AC-9:** Projede özel flag syntax tanımlıysa (proje ayarlarından) o syntax kullanılır. Tanımlı değilse AppConfig benzeri varsayılan pattern uygulanır.

### Sarmalama — Yalnızca C# (v1)

- [ ] **AC-10:** Sarmalama yalnızca `.cs` uzantılı dosyalar için yapılır. Diff içinde başka dil dosyaları varsa atlanır ve kullanıcıya bilgi verilir ("X.ts atlandı — C# dışı diller v1 kapsamında değil").
- [ ] **AC-11:** Varsayılan sarmalama pattern'i:
  ```csharp
  if (FeatureFlags.IsEnabled("CUSTOMER_{CUSTOMER_CODE}_{FEATURE_SLUG}"))
  {
      // orijinal müşteri kodu
  }
  ```
  Projede özel template varsa o template kullanılır (örn. `FeatureToggle.Get("FLAG_NAME")`, `_config.IsFeatureEnabled("FLAG_NAME")`).
- [ ] **AC-12:** Sarmalama orijinal kod mantığını bozmaz: koşul ekler, kodu taşımaz veya yeniden düzenlemez.
- [ ] **AC-13:** Aynı dosyada birden fazla müşteri kodu bloğu varsa her biri ayrı `if` bloğuyla sarmalanır; tek büyük blok yapılmaz.

### PR Oluşturma

- [ ] **AC-14:** Kullanıcı onayladıktan sonra sarmalı değişiklikler `feature-flag/{kaynak-pr-id}-{customer-code}` adlı yeni branch'e commit edilir.
- [ ] **AC-15:** Açılan PR açıklamasında bulunur: kaynak PR referansı, hangi müşteri için flag eklendiği, LLM analiz özeti, "Bu PR AI destekli olarak oluşturulmuştur — kodu review edin" uyarısı.
- [ ] **AC-16:** Açılan PR, kaynak PR'ın yazarına ve Release Manager grubuna reviewer olarak atanır.
- [ ] **AC-17:** PR açıldıktan sonra kullanıcıya PR URL'i gösterilir ve ReleaseHub360 PR detay sayfasına link verilir.
- [ ] **AC-18:** Merge kararı tamamen insana aittir — sistem otomatik merge yapmaz.

### Takip

- [ ] **AC-19:** Oluşturulan feature flag PR kaydı DB'de tutulur: kaynak PR ID, müşteri kodu, flag adı, oluşturulma tarihi, oluşturan kullanıcı, durum (open / merged / closed / rejected).
- [ ] **AC-20:** Aynı kaynak PR × müşteri kombinasyonu için açık flag PR varken ikinci kez analiz tetiklenirse uyarı gösterilir: "Bu PR için zaten açık bir flag PR var: #X". Kullanıcı yine de devam edebilir (override seçeneği).



---

## Kapsam Dışı (Out of Scope)

- Feature flag'ları runtime'da açıp kapatan admin paneli — ayrı özellik
- C# dışı dil desteği (TypeScript, Python, Java vb.) — v2'ye bırakıldı
- Otomatik PR tetikleyici (merge eventi vb.) — tetikleyici her zaman manueldir
- Geriye dönük tarama: eski PR'ların toplu analizi — ayrı özellik
- Feature flag'ın GA'ya alınması / silinmesi otomasyonu — ayrı özellik
- Otomatik PR merge — hiçbir zaman yapılmayacak; merge kararı insana aittir

---

## İş Kuralları

1. **Tetikleyici:** Yalnızca manuel. PR sayfasından "Feature Flag Analizi Başlat" butonu.
2. **Müşteri Tespiti Önceliği:** Workitem müşteri bilgisi > LLM analizi. Workitem'da müşteri varsa LLM atlanır.
3. **LLM Fallback:** Workitem'da müşteri bilgisi yokken PR diff'in tamamı LLM'e gönderilir.
4. **Müşteri Kaydı Zorunluluğu:** Tespit edilen müşteri ReleaseHub360'ta kayıtlı (`customers`, `isActive: true`) olmalı. Tanımlanmamış müşteri için flag PR açılmaz, kullanıcıya uyarı gösterilir.
5. **Dil Kısıtı (v1):** Yalnızca `.cs` uzantılı dosyalar sarmalanır. Diğer dil dosyaları atlanır ve bilgi mesajıyla kullanıcıya gösterilir.
6. **Flag İsimlendirme Standardı:** `CUSTOMER_{CUSTOMER_CODE}_{FEATURE_SLUG}` — boşluk yok, snake_case, büyük harf. Kullanıcı onay adımında bu ismi düzenleyebilir.
7. **Proje Bazlı Flag Syntax:** Proje ayarlarında flag syntax template tanımlanabilir. Tanımlıysa o template kullanılır; tanımlı değilse `FeatureFlags.IsEnabled("FLAG_NAME")` varsayılanı kullanılır.
8. **Onay Olmadan İşlem Yok:** LLM "gerekli" dese bile kullanıcı iptal edebilir. İptal edildiğinde hiçbir branch veya PR açılmaz.
9. **İdempotency:** Aynı kaynak PR × müşteri kombinasyonu için birden fazla açık flag PR oluşturulamaz. Override istenirse kullanıcı onayı gerekir.
10. **Otomatik Merge Yok:** Sistem PR açar, merge etmez. İşin sahibi PR'ı gereksiz bulup kapatabilir.

---

## Akış Diyagramı

```
Kullanıcı → "Feature Flag Analizi Başlat"
    ↓
[1] PR'a bağlı workitem(lar)ı al
    ↓
Workitem'da müşteri bilgisi var mı?
    ├── EVET → Müşteri tespit edildi (workitem'dan) → [4]'e atla
    └── HAYIR ↓
        [2] PR diff'ini MCP Server'dan al
            ↓
        [3] LLM analizi → müşteri spesifik kod var mı?
            ├── HAYIR → "Tespit edilmedi" mesajı → AKIŞ SONA ERER
            └── EVET → Müşteri tespit edildi (LLM'den)
    ↓
[4] "Feature flag gerekli" paneli göster
    (tespit kaynağı, satırlar, önerilen flag adı, güven skoru)
    ↓
Kullanıcı onaylıyor mu?
    ├── HAYIR / İPTAL → AKIŞ SONA ERER (PR açılmaz)
    └── EVET ↓
        [5] .cs dosyalarını sarmala (flag pattern uygula)
            (diğer dil dosyaları atlanır, bilgi mesajı gösterilir)
            ↓
        [6] feature-flag/{pr-id}-{customer-code} branch'i oluştur, commit at
            ↓
        [7] PR aç (Azure DevOps), reviewer ata
            ↓
        [8] DB'ye kayıt ekle, kullanıcıya PR URL'i göster
```

---

## Öncelik ve Etki

| Boyut | Değerlendirme |
|---|---|
| Kullanıcı etkisi | Haftada 20-50 PR açan ekiplerde her PR için elle yapılan kontrolü ortadan kaldırır |
| İş etkisi | Müşteri özgü kodun trunk'a kontrol edilmeden girmesini önler; code review kalitesini artırır |
| Teknik risk | LLM'in false positive üretmesi; orijinal kodu bozacak sarmalama hataları → **insan onayı zorunlu tutuldu** |
| Öncelik | **P1** — aktif çok-müşterili geliştirme yapan ekipler için kritik |

---

## Bağımlılıklar

### Backend (yeni)

| Endpoint | Açıklama |
|---|---|
| `POST /api/prs/:prId/analyze-customer-feature` | PR'ı analiz et — workitem check + LLM diff analizi |
| `POST /api/prs/:prId/apply-feature-flag` | Onay geldi — .cs dosyalarını sarmala, branch aç, PR oluştur |
| `GET /api/feature-flag-prs` | Kayıtlı flag PR listesi |
| `GET /api/projects/:projectId/flag-config` | Proje bazlı flag syntax yapılandırmasını getir |
| `PUT /api/projects/:projectId/flag-config` | Flag syntax yapılandırmasını kaydet |

Yeni Prisma tabloları:
```
feature_flag_prs
  id, sourcePrId, customerId, customerCode, flagName,
  flagPrId, flagPrUrl, flagBranch,
  status (OPEN / MERGED / CLOSED / REJECTED),
  triggeredBy, createdAt, updatedAt
  UNIQUE(sourcePrId, customerId)  -- idempotency

project_flag_configs
  id, productId, flagSyntaxTemplate, createdAt, updatedAt
```

### MCP Server (yeni endpoint)

| Endpoint | Açıklama |
|---|---|
| `POST /api/ai/detect-customer-feature` | PR diff + kayıtlı müşteri listesi → müşteri tespiti, satır aralıkları, güven skoru |
| `POST /api/ai/wrap-code-with-flag` | C# kod bloğu + flag adı + flag template → sarmalı C# kodu |

### Azure DevOps (mevcut altyapı)
- PR diff okuma: `GET /api/repository/file-content` — yeterli
- Workitem okuma: mevcut workitem API — müşteri alanını okuma için genişletilecek (A1 netleşince)
- Branch oluşturma + commit + PR açma: `azure_client.execute_code_sync` mantığına benzer yeni metod

### Frontend (yeni bileşenler)
- PR detay sayfasına "Feature Flag Analizi" paneli (buton + adım göstergesi + sonuç)
- Onay modal'ı: tespit özeti + flag adı düzenleme + Onayla / İptal
- Proje ayarları ekranına flag syntax yapılandırma formu

---

## Riskler

| Risk | Olasılık | Etki | Önlem |
|---|---|---|---|
| LLM müşteriye özgü olmayan kodu sarmalamak istiyor (false positive) | Orta | Yüksek | İnsan onayı zorunlu — LLM öneri yapar, karar kullanıcıda |
| Sarmalama syntax'ı C#'ta compile hatası üretiyor | Düşük | Çok yüksek | LLM çıktısı önce syntax check'ten geçirilir; hatalı sarmalama varsa PR açılmaz, hata gösterilir |
| Aynı kod satırı iki kez sarmalanıyor | Düşük | Orta | `UNIQUE(sourcePrId, customerId)` constraint + override guard |
| Çok büyük diff → LLM token limiti aşılıyor | Orta | Orta | Diff 500 satır üzeriyse kullanıcıya uyarı; dosya bazlı chunk ile işlem |
| Müşteri adı / kodu log'lara düşmemeli | Düşük | Orta | Log'a yalnızca müşteri kodu yaz, tam ad ve iş bağlamı yazma |

---

## Açık Sorular (Kalan)

- [ ] **A1:** Workitem üzerinde müşteri bilgisini tutan alan adı nedir? Azure DevOps custom field mı, tag'mi, başka bir alan mı? → Teknik ekip doğrulayacak. Netleşene kadar workitem check adımına `null` fallback koyulur, doğrudan LLM'e düşer.
- [ ] **A2:** Proje bazlı flag syntax template proje ayarlarında nasıl gösterilecek? Serbest metin mi, kod editörü mü, placeholder'lı input mu? → UX kararı.

> **Not:** Diğer sorular netleşti — tetikleyici manuel, flag sistemi AppConfig varsayılan + proje bazlı override, dil kısıtı C# v1, merge otomasyonu yok.

---

## Tasarım Notları (UX İçin)

**Kullanıcı profili:** Sabah standupı öncesinde PR listesine bakan, zihinsel yük taşımak istemeyen bir Release Manager veya Tech Lead. Karmaşık diff viewer değil; net bir "bunu işle / atla" kararı vermesini sağlayan sade bir panel.

**1. PR Detay Ekranı — "Feature Flag Analizi" Paneli**
- Buton: "Feature Flag Analizi Başlat" — PR aksiyonları bölümünde
- Analiz sırasında: metin tabanlı adım göstergesi (spinner değil) — "Workitem kontrol ediliyor... / Diff okunuyor... / LLM analizi yapılıyor..."
- Sonuç — Tespit VAR:
  - Tespit kaynağı: "Workitem'dan (Müşteri Adı)" veya "LLM Analizi (Güven: %87)"
  - Tespit edilen dosya + satır aralıkları listesi
  - Önerilen flag adı (düzenlenebilir input)
  - Güven skoru renk kodu: ≥85 yeşil, 70–84 sarı, <70 kırmızı + "Düşük güven — kodu kendiniz doğrulayın" uyarısı
  - "Sarmala ve PR Aç" (primary) / "Bu PR'ı atla" (secondary, küçük)
- Sonuç — Tespit YOK: "Bu PR'da müşteri spesifik kod tespit edilmedi." — yeşil bilgi mesajı
- Boş state (analiz yapılmamış): "Henüz analiz başlatılmadı." + buton

**2. Onay Modal'ı**
- Başlık: "Feature Flag ile Sarmala"
- İçerik: Tespit özeti, flag adı input alanı (pre-fill + düzenlenebilir), hangi dosyaların işleneceği, atlanacak dosyalar (C# dışı)
- Eylemler: "Onayla ve PR Aç" / "İptal"

**3. Proje Ayarları — Flag Syntax Yapılandırma**
- Basit form: "Flag Syntax Template" — placeholder ile örnek
- Örnekler: `FeatureFlags.IsEnabled("{FLAG_NAME}")`, `_toggleManager.IsActive("{FLAG_NAME}")`
- Boş bırakılırsa varsayılan AppConfig pattern kullanılır.

---

## Handoff Notu — Release Manager

**Tarih:** 2026-02-25  
**Spec dosyası:** `designs/specs/pr-feature-flag-wrapper.md`  
**Kararlar netleşti:** Tetikleyici manuel, dil kısıtı C# (v1), merge otomasyonu yok, müşteri tespiti workitem öncelikli + LLM fallback, flag sistemi AppConfig varsayılanı + proje bazlı override.

### UX Designer için
- Üç bileşen: PR detay paneli, onay modal'ı, proje ayarları flag formu.
- Adım göstergesi metin tabanlı olsun (spinner değil) — kullanıcıya "nerede olduğunu" söylesin.
- Güven skoru renk sistemi kritik — kırmızı sonucu kullanıcı fark etmeli ama engellememeli.
- "Atla" butonunu küçük tut — ana akış "onayla" ama zorlamıyoruz.

### Backend Developer için
- İki yeni MCP endpoint + beş yeni backend endpoint + iki Prisma migration (feature_flag_prs + project_flag_configs).
- `feature_flag_prs`'te `UNIQUE(sourcePrId, customerId)` constraint zorunlu.
- Proje bazlı flag syntax `project_flag_configs`'tan okunur; backend sarmalama öncesinde bu config kontrol edilir, yoksa varsayılan pattern kullanılır.
- A1 (workitem müşteri alanı) netleşene kadar: workitem check adımı `null` dönsün, doğrudan LLM fallback'e düşsün. Backend bu geliştirmeyi beklemeden başlayabilir.
