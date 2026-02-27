# Feature Spec: Müşteri Versiyon Senkronizasyonu (Code Sync)

**Tarih:** 2026-02-25  
**Durum:** Spec tamamlandı — UX tasarım aşaması  
**Öncelik:** P1  
**POC Projesi:** EthixNG ürünü → ETX.API.Gateway servisi → master (ürün) / pre_master (müşteri)

---

## Özet

Bir ürün versiyonu yayınlandığında, o versiyon ile bir önceki versiyon arasındaki değişiklikler (PR'lar) müşterinin kendi reposuna aktarılması gerekir. Bu ekran, müşterinin kendi reposunu ürün versiyonuyla workitem (Feature / PBI / Bug) seviyesinde seçici olarak senkronize etmesini sağlar. Müşteri, hangi özellikleri alacağına kendisi karar verir; sistem seçilen workitem'lardaki tüm PR commit'lerini cherry-pick ederek müşteri branch'inden bir feature branch açar ve o branch'ten müşteri branch'ine PR oluşturur. Merge kararı müşteriye aittir.

---

## Problem / Fırsat

### Şu an ne oluyor?

Ürün yeni bir versiyon çıkardığında müşteri, git geçmişine bakarak hangi commit'lerin kendi reposuna gelmesi gerektiğini manuel olarak belirliyor. Bu süreç:

1. **Hatalı seçim riski:** Müşteri alakasız commiti alabilir ya da kritik bir commiti atlayabilir.
2. **Workitem görünürlüğü yok:** Hangi PR'ın hangi özelliğe / bug'a karşılık geldiği görünmüyor; çakışma analizi yapılamıyor.
3. **İzlenebilirlik yok:** Hangi versiyon değişikliklerinin müşteriye gittiği kayıt altında değil.
4. **Zaman kaybı:** Kıdemli geliştirici saatler harcıyor; hata oranı yüksek.

### Fırsat

Azure DevOps workitem ağacı ve PR - workitem ilişkisi zaten mevcut. Cherry-pick git API'si de kullanılabilir. Bu veriyi kullanarak müşteriyi workitem seviyesinde görmesini sağlamak ve tek tıkla cherry-pick + PR akışını otomatize etmek mümkün.

---

## Kullanıcı Hikayeleri

- **Müşteri Geliştirici olarak** ürünün yeni versiyonunda hangi feature ve bug fix'lerin olduğunu görmek istiyorum, çünkü hangilerini kendi repoma almam gerektiğine karar vermeliyim.
- **Müşteri Geliştirici olarak** seçtiğim workitem'ları tek tıkla kendi branch'ime cherry-pick olarak almak istiyorum, çünkü bu işi manuel yapmak saatler alıyor ve hatalara açık.
- **Müşteri Geliştirici olarak** senkronizasyon geçmişini ve durumunu görmek istiyorum, çünkü hangi versiyonun zaten alındığını, hangisinin beklemede olduğunu takip etmem gerekiyor.
- **Release Manager olarak** hangi müşterinin hangi versiyonda ne aldığını görmek istiyorum, çünkü destek süreçlerinde "bu özellik bu müşteride var mı?" sorusuna hızla yanıt vermem gerekiyor.

---

## Kabul Kriterleri (AC)

### Ekran Yapısı

- [ ] **AC-1:** Ekran; üst kısımda bağlam seçici (ürün, servis, müşteri branch'i), ortada iki panelli diff görünümü, altta aksiyon çubuğu içerir.
- [ ] **AC-2:** Sol panel: seçili ürün versiyonunda yer alan değişiklikler workitem bazlı gruplu gösterilir (Feature/PBI/Bug → altında PR'lar).
- [ ] **AC-3:** Sağ panel: müşterinin hedef branch'inde (ör. pre_master) mevcut olan PR'lar listelenir.
- [ ] **AC-4:** Sol panelde her workitem grubu açılıp kapanabilir (accordion). Default: kapalı.
- [ ] **AC-5:** Her workitem grubunda: workitem başlığı, tipi (Feature/Bug/PBI), ID'si, altındaki PR sayısı, ve PR listesi görünür.
- [ ] **AC-6:** Her PR'da: PR başlığı, PR numarası, merge tarihi, yazar, repo adı görünür.

### Bağlam Seçimi

- [ ] **AC-7:** Kullanıcı üst bardan ürün ve servis seçer.
- [ ] **AC-8:** Kullanıcı, senkronize edeceği ürün versiyonu aralığını "kaynak versiyon" (son senkronizasyonu yaptığı versiyon) ve "hedef versiyon" (almak istediği versiyon) olarak seçer.
- [ ] **AC-9:** Müşteri branch'i (ör. pre_master) sistemde kayıtlı CustomerBranch'ten otomatik gelir. Birden fazla kayıtlı branch varsa seçici gösterilir.

### Delta Hesaplama

- [ ] **AC-10:** "Kaynak → Hedef" aralığındaki PR'lar ServiceReleaseSnapshot üzerinden ya da canlı Azure DevOps sorgusuyla alınır.
- [ ] **AC-11:** PR'lar workitem hiyerarşisine göre gruplandırılır: Feature/Epic → PBI/UserStory → Bug altında toplanır.
- [ ] **AC-12:** Sağ panelde müşteri branch'indeki PR'larla sol paneldeki PR'lar karşılaştırılır; zaten alınmış olan PR'lar "Mevcut" rozeti ile işaretlenir ve seçim dışı bırakılır.
- [ ] **AC-13:** Delta sıfırsa (tüm değişiklikler zaten müşteride) "Bu versiyon zaten senkronize edilmiş" mesajı gösterilir.

### Workitem Seçimi ve Sync

- [ ] **AC-14:** Kullanıcı workitem grubunu checkbox ile seçer. Bir grup seçilince altındaki tüm PR'lar da seçili state'e geçer.
- [ ] **AC-15:** Bireysel PR da seçilebilir/deselectable olmalı (partial selection).
- [ ] **AC-16:** "Hepsini Seç" ve "Seçimi Temizle" kısayolları bulunur.
- [ ] **AC-17:** Seçim öncesinde "Çakışma Analizi" butonu ile seçili PR'ların müşteri branch'inde çakışma yaratıp yaratmayacağı kontrol edilebilir.
- [ ] **AC-18:** "Sync Başlat" butonuna basıldığında onay dialogu açılır: seçilen workitem özeti, oluşturulacak branch adı, hedef branch gösterilir.

### Git İşlemleri (Arka Plan)

- [ ] **AC-19:** Sistem, müşteri branch'inden (`pre_master`) otomatik olarak `sync/v{hedef-versiyon}-{servis-adı}-{tarih}` adında bir feature branch açar.
- [ ] **AC-20:** Seçilen PR'lardaki tüm commit'ler sırayla (merge tarihe göre) bu feature branch'e cherry-pick edilir.
- [ ] **AC-21:** Tüm cherry-pick'ler başarılıysa `feature branch → pre_master` PR'ı Azure DevOps'ta otomatik açılır.
- [ ] **AC-22:** PR açıklamasında: alınan workitem'lar listesi, kaynak ve hedef versiyon, "ReleaseHub360 tarafından oluşturulmuştur" notu yer alır.
- [ ] **AC-23:** PR açılır açılmaz ReleaseHub360'ta kullanıcıya PR URL'i gösterilir ve bildirim gönderilir.
- [ ] **AC-24:** Cherry-pick sırasında conflict çıkarsa işlem durur, çakışan dosyalar ve commit'ler raporlanır, kullanıcı bilgilendirilir (manual resolution gerekiyor uyarısı).

### Geçmiş

- [ ] **AC-25:** Her senkronizasyon girişimi (başarılı/başarısız) SyncHistory tablosuna kaydedilir.
- [ ] **AC-26:** Geçmiş sekmesi: tarih, versiyon aralığı, alınan workitem sayısı, durum (SUCCESS / CONFLICT / FAILED) ve PR linki içerir.

---

## Kapsam Dışı (Out of Scope)

- Otomatik merge — PR açılır, merge müşteri kararı
- Conflict otomatik çözümü — v1'de conflict varsa kullanıcı uyarılır, çözüm elle yapılır
- Birden fazla servis aynı anda sync — v1'de tek servis, tek işlem
- Rebase / merge stratejisi seçimi — v1 yalnızca cherry-pick
- Müşteri reposunda write izni yoksa işlem başlamaz (hata döner) — şimdilik hata mesajı yeterli, takip edilmez

---

## İş Kuralları

1. **Kaynak Versiyon:** Müşterinin sahip olduğu son versiyon. CustomerProductMapping üzerinden gelir; ilk senkronizasyonda kullanıcı manuel seçer.
2. **Hedef Versiyon:** Müşterinin almak istediği versiyon. Yalnızca kaynak versiyondan yüksek versiyonlar seçilebilir.
3. **Delta PR'lar:** Kaynak versiyon snapshot'ındaki prIds ile hedef versiyon snapshot'ındaki prIds farkı alınır. Bu fark senkronize edilecek PR kümesini oluşturur.
4. **Workitem Hiyerarşisi:** Feature → PBI → Bug/Task. PR'lar önce PBI/Feature'a, bulunmazsa Bug'a veya "Sınıflandırılmamış" grubuna atılır.
5. **Branch Adlandırma:** `sync/v{hedef_versiyon}-{repo_name}-{YYYYMMDD}` — özel karakter yok, lowercase.
6. **Cherry-pick Sırası:** PR'lar merge tarihine göre kronolojik sırayla cherry-pick edilir.
7. **Idempotency:** Aynı (kaynak versiyon × hedef versiyon × müşteri branch) kombinasyonu için zaten açık bir PR varsa yeni işlem başlatılmaz. Kullanıcıya mevcut PR gösterilir.
8. **Azure DevOps Yetki:** Sistemde kayıtlı product-level Azure PAT ile işlem yapılır. Customer'ın kendi reposuna yazabilmek için o repoya erişim yetkisi olan PAT gerekir — bu CustomerBranch kaydında ayrı `azurePat` alanı olarak tutulur.

---

## Akış Diyagramı

```
Kullanıcı Ekrana Girer
    ↓
[1] Ürün + Servis + Müşteri Branch seç
    ↓
[2] Versiyon aralığı seç (kaynak → hedef)
    ↓
[3] Sol panel: Delta PR'ları workitem gruplu yükle
    Sağ panel: Müşteri branch'indeki mevcut PR'ları yükle
    ↓
Kullanıcı workitem(lar) seçer
    ↓
[4] (Opsiyonel) "Çakışma Analizi Yap" → conflict raporu
    ↓
"Sync Başlat" butonuna bas
    ↓
[5] Onay dialogu (seçim özeti + branch adı)
    ↓
Kullanıcı onaylar
    ↓
[6] Arka plan: feature branch aç (pre_master'dan)
    ↓
[7] Seçilen PR commit'lerini sırayla cherry-pick et
    ├── CONFLICT → DUR, çakışma raporu göster → AKIŞ SONA ERER
    └── BAŞARILI ↓
[8] feature branch → pre_master PR oluştur (Azure DevOps)
    ↓
[9] SyncHistory'ye kaydet
    ↓
[10] Kullanıcıya PR URL + bildirim göster
```

---

## Bağımlılıklar

### Mevcut Altyapıdan Kullanılacaklar
- `CustomerBranch` modeli — müşteri branch'i ve repo bilgisi
- `SyncHistory` modeli — geçmiş kaydı (payload alanı zenginleştirilecek)
- `ServiceReleaseSnapshot` — versiyonlar arası PR delta
- `azure_client.py` — Azure DevOps PR ve workitem sorguları (`get_pull_requests_by_work_item`, `get_child_work_items` mevcut)

### Yeni Backend Endpoint'leri
| Endpoint | Açıklama |
|---|---|
| `GET /api/code-sync/delta` | Kaynak→hedef versiyon delta PR'larını workitem gruplu getir |
| `GET /api/code-sync/customer-prs` | Müşteri branch'indeki mevcut PR'ları getir |
| `POST /api/code-sync/conflict-check` | Seçili PR'lar için çakışma analizi |
| `POST /api/code-sync/start` | Senkronizasyon başlat (async job) |
| `GET /api/code-sync/:syncId/status` | İş durumu polling |
| `GET /api/code-sync/history` | SyncHistory listesi |

### Yeni MCP Server Endpoint'leri
| Endpoint | Açıklama |
|---|---|
| `POST /api/git/cherry-pick` | Feature branch aç + commit listesini cherry-pick et |
| `POST /api/git/create-pr` | Azure DevOps'ta PR oluştur |
| `POST /api/git/conflict-check` | Branch'ler arası diff + çakışma analizi |

### Schema Değişiklikleri
- `CustomerBranch`: `azurePat String?` alanı eklenir — müşteri reposuna yazma yetkisi için ayrı PAT
- `SyncHistory.payload`: `{ workitemIds, prIds, cherryPickResults, prUrl, prId }` yapısında zenginleştirilir

### DevOps / Azure Git API Notları
- Cherry-pick için Azure DevOps Git API native endpoint kullanılabilir: `POST /repositories/{repo}/cherryPicks`
  - Bu async çalışır — polling ile `GET /repositories/{repo}/cherryPicks/{id}` takip edilir
  - Alternatif: `POST /repositories/{repo}/pushes` ile commit seviyesinde cherry-pick
- Branch oluşturma: `POST /repositories/{repo}/refs` ile refs güncellenerek yeni branch açılır
- PR oluşturma: `POST /repositories/{repo}/pullrequests`

### Frontend
- PR detay + workitem accordion bileşeni
- İki panel split view (resizable tercih edilir, sabit minimum)
- Sync durumu için polling + progress göstergesi

---

## Öncelik ve Etki

| Boyut | Değerlendirme |
|---|---|
| Kullanıcı etkisi | Her versiyon çıkışında müşteri başına saatlerce süren manuel süreci ortadan kaldırır |
| İş etkisi | Müşteri bağımsızlığını artırır; destek talebi azalır; sürüm geçiş süresi düşer |
| Teknik risk | Azure DevOps cherry-pick API async çalışır — polling ve hata yönetimi kritik |
| Öncelik | **P1** — code-sync sayfasının temel kullanım senaryosu bu |

---

## Açık Sorular

- [ ] **A1:** CustomerBranch kaydında müşteri reposuna özel Azure PAT gerekiyor mu, yoksa product PAT müşteri reposuna da yazabilir mi? → POC'da sorgulanacak
- [ ] **A2:** İlk senkronizasyon için "kaynak versiyon sıfır" kabul edilir mi? Yani müşteri hiç sync yapmamışsa tüm versiyonun PR'larını alır mı? → Ürün kararı

---

## Tasarım Notları (UX ve DevOps İçin)

**Ekranı kim kullanır:** Müşteri firmanın geliştirici ya da sistem yöneticisi. Teknik kullanıcı ama Azure DevOps'u detaylıca bilmeyebilir. Git commit referanslarını görmek istemez — workitem başlıkları ve özellik açıklamaları yeterli olmalı.

**En kritik UX kararı:** Sol panel (ürün versiyonu değişiklikleri) ile sağ panel (müşteri branch'i) arasındaki ilişkiyi okumak zor olmamalı. Zaten alınmış değişiklikler açıkça işaretlenmeli, seçilecekler öne çıkmalı.

**DevOps için notlar:**
- Azure DevOps cherry-pick API, source commit OID'lerini bekler — bu commit'leri PR listesinden değil, `GET /repositories/{repo}/pullrequests/{id}/commits` ile çekmek gerekir.
- Branch oluşturma `newObjectId` boş string ile yapılırsa hata verir; `oldObjectId` kaynak branch'in son commit SHA'sı olmalı.
- Cherry-pick işlemi conflict durumunda `status: "conflicts"` döner — bu state polling ile yakalanmalı.
- PAT'ın `Code (Read & Write)` ve `Pull Request (Contribute)` yetkilerine sahip olması zorunlu.

---

## RM Review — 2026-02-25 — UX Fazı

**Gelen:** UX Designer  
**Karar:** ✅ Yeşil Işık — Koşullu (aşağıdaki nokta backend fazında çözülecek)

### AC Kontrolü
| Kabul Kriteri | Durum | Not |
|---|---|---|
| AC-1: Bağlam seçici + iki panel + aksiyon çubuğu | ✅ Karşılandı | |
| AC-2: Sol panel — workitem gruplu PR'lar | ✅ Karşılandı | Accordion tasarlandı |
| AC-3: Sağ panel — müşteri branch PR'ları | ✅ Karşılandı | |
| AC-4: Accordion açılır/kapanır | ✅ Karşılandı | MUI Accordion kullanımı |
| AC-5: Workitem grubu içeriği | ✅ Karşılandı | Tip, ID, başlık, PR sayısı |
| AC-6: PR detayları | ✅ Karşılandı | Başlık, no, tarih, yazar, repo |
| AC-7: Ürün + servis seçici | ✅ Karşılandı | |
| AC-8: Versiyon aralığı seçici | ✅ Karşılandı | Kaynak + hedef dropdown |
| AC-9: Müşteri branch seçici | ✅ Karşılandı | CustomerBranch'ten otomatik |
| AC-10: Delta hesaplama | ✅ Karşılandı | API bağlantısı tanımlandı |
| AC-11: Workitem hiyerarşisi | ✅ Karşılandı | Feature/PBI/Bug + Sınıflandırılmamış |
| AC-12: Zaten alınmış PR'lar işaretli | ✅ Karşılandı | "MÜŞTERİDE MEVCUT" rozeti |
| AC-13: Delta sıfır state | ✅ Karşılandı | Boş state tasarımı mevcut |
| AC-14: Workitem seviye checkbox | ✅ Karşılandı | |
| AC-15: Bireysel PR seçimi | ✅ Karşılandı | Partial selection gösterildi |
| AC-16: Hepsini seç / temizle | ✅ Karşılandı | Panel başlığında |
| AC-17: Çakışma analizi | ✅ Karşılandı | Drawer tasarımı mevcut |
| AC-18: Onay dialogu | ✅ Karşılandı | Branch adı + seçim özeti |
| AC-19: Feature branch açma | ✅ Karşılandı | Branch adı formatı tanımlandı |
| AC-20: Cherry-pick | ✅ Karşılandı | Progress göstergesi tasarlandı |
| AC-21: PR oluşturma | ✅ Karşılandı | Başarı ekranında PR linki |
| AC-22: PR açıklaması içeriği | ✅ Karşılandı | Backend handoff'ta belirtildi |
| AC-23: PR sonrası bildirim | ✅ Karşılandı | Başarı ekranında URL gösterimi |
| AC-24: Conflict durumu | ✅ Karşılandı | Conflict ekranı + "çıkar ve devam" aksiyonu |
| AC-25: SyncHistory kaydı | ✅ Karşılandı | Backend scope'unda |
| AC-26: Geçmiş sekmesi | ✅ Karşılandı | MUI X Data Grid ile tasarlandı |

### Bir Sonraki Role Talimat — Backend Developer
- API yanıt şeması UX handoff'ta tanımlandı — buna uymak zorunlu.
- `skip-and-continue` endpoint gereği belirlendi — AC'de yoktu ama UX conflict akışından çıktı; backend eklenmeli.
- Async cherry-pick polling mekanizması kritik — 5sn interval, status RUNNING|SUCCESS|CONFLICT|FAILED.
- DevOps Engineer cherry-pick API validation'ı tamamlamadan backend implementasyonu başlamamalı.

### Blocker'lar
- [ ] **B1 (POC):** CustomerBranch'te müşteri reposuna write yetkisi olan PAT bilgisi yok. POC'da ürün PAT'ının her iki repoya da erişimi olduğu varsayılacak. Production için ayrı field açılmalı.



**Tarih:** 2026-02-25  
**Spec dosyası:** `designs/specs/customer-version-sync.md`  
**POC:** EthixNG / ETX.API.Gateway / master → pre_master

### UX Designer için
- İki panelli split layout — sol: ürün versiyonu delta; sağ: müşteri branch mevcut durumu.
- Workitem gruplaması accordion tarzı, PR'lar grup içinde liste.
- Zaten senkronize edilmiş PR'lar ve workitem grupları gri + "Mevcut" rozeti.
- Seçim checkbox'ı workitem grubunda → grup altındaki tüm PR'lar seçilir.
- Aksiyon çubuğu altta sabit: "Seçilen: X workitem, Y PR" + "Çakışma Analizi" + "Sync Başlat" butonu.
- Progress görünümü: sync başladıktan sonra ekran "Sync devam ediyor" moduna geçer, stepper ile aşamalar gösterilir.
- Geçmiş sekmesi: önceki sync işlemlerinin listesi.
- Mobil uyumluluk şart değil — masaüstü öncelikli.

### Backend Developer için (RM GATE sonrası)
- Cherry-pick için Azure DevOps native async API kullanılması tercih edilir.
- `CustomerBranch.azurePat` alanı eklenmeli — POC'da aynı PAT kullanılabilir ama mimari ayrılmalı.
- Git işlemleri MCP Server üzerinden proxy edilir — backend doğrudan Azure Git API çağırmaz.

### DevOps Engineer için
- Azure DevOps cherry-pick ve refs API davranışını validation environment'ta test et.
- PAT permission matrisini dokümente et (hangi scope neyin için gerekli).
- Büyük PR sayısı (20+) cherry-pick sırasında timeout riski — chunk stratejisi değerlendir.

### RM GATE Onay Beklenecek Konular
- UX wireframe'in tüm AC'leri karşılayıp karşılamadığı
- DevOps engineer'ın git/API validasyon sonucu

---

## RM Review — 2026-02-25 — Backend Fazı

**Gelen:** Backend Developer  
**Karar:** ✅ Yeşil Işık — Frontend fazına geçilebilir

### Uygulanan Değişiklikler
| # | Bileşen | Durum |
|---|---|---|
| Prisma migration | `azurePat` alanı `customer_branches` tablosuna eklendi | ✅ |
| MCP `POST /api/code-sync/delta-details` | PR ID listesine göre workitem gruplu delta hesaplama | ✅ |
| MCP `POST /api/code-sync/customer-branch-prs` | Müşteri branch'indeki tamamlanmış PR'lar | ✅ |
| MCP `POST /api/code-sync/async-cherry-pick` | Async cherry-pick başlatır, jobId döner | ✅ |
| MCP `GET /api/code-sync/async-cherry-pick/{jobId}` | Job status polling | ✅ |
| Backend `GET /api/code-sync/customer-branches` | CustomerBranch listesi (serviceId ile filtrelenebilir) | ✅ |
| Backend `GET /api/code-sync/delta` | Snapshot delta + MCP delta-details + alreadySyncedPrIds | ✅ |
| Backend `GET /api/code-sync/customer-prs` | Müşteri branch PR'ları | ✅ |
| Backend `POST /api/code-sync/conflict-check` | MCP preview'a proxy | ✅ |
| Backend `POST /api/code-sync/start` | SyncHistory oluştur + MCP async-cherry-pick başlat | ✅ |
| Backend `GET /api/code-sync/history` | SyncHistory DB sorgusu | ✅ |
| Backend `GET /api/code-sync/:syncId/status` | DB + MCP polling, terminal state'leri DB'ye yazar | ✅ |
| Backend `POST /api/code-sync/:syncId/skip-and-continue` | Conflict'li PR'ı atlayıp restart | ✅ |

### AC Kontrolü (Backend Sorumluluğundaki AC'ler)
| AC | Durum | Endpoint |
|---|---|---|
| AC-9: CustomerBranch otomatik/seçici | ✅ | `GET /api/code-sync/customer-branches` |
| AC-10: Delta PR'lar snapshot üzerinden | ✅ | `GET /api/code-sync/delta` |
| AC-11: Workitem hiyerarşisine göre gruplama | ✅ | MCP delta-details |
| AC-12: Zaten alınmış PR'lar işaretli | ✅ | `alreadySyncedPrIds` array'i |
| AC-13: Delta 0 ise boş yanıt | ✅ | `total_pr_count: 0` |
| AC-17: Çakışma analizi | ✅ | `POST /api/code-sync/conflict-check` |
| AC-19-20-21: Feature branch + cherry-pick + PR | ✅ | MCP async-cherry-pick |
| AC-22: PR açıklaması içeriği | ✅ | `prDescription` içinde versiyon + workitem listesi |
| AC-23: PR URL döner | ✅ | SUCCESS status'ta `result.prUrl` |
| AC-24: Conflict raporlama | ✅ | CONFLICT status'ta `conflict.prId + files` |
| skip-and-continue (UX'ten eklenen AC) | ✅ | `POST /api/code-sync/:syncId/skip-and-continue` |
| AC-25: SyncHistory kaydı | ✅ | `POST /api/code-sync/start` → Prisma |
| AC-26: Geçmiş görüntüleme | ✅ | `GET /api/code-sync/history` |

### Frontend Developer için Handoff Notları
- TypeScript 0 hata, Python syntax temiz ✅
- Tüm endpoint'ler `GET /api/code-sync/...` prefix'i altında, JWT auth zorunlu
- Delta yanıtı format:
  ```json
  { "data": { "workitems": [...], "unclassified": [...], "total_pr_count": 47, "alreadySyncedPrIds": [892, 897] } }
  ```
- Sync başlatma → `POST /api/code-sync/start` → `{ "data": { "syncId": "uuid", "mcpJobId": "uuid", "status": "RUNNING" } }`
- Status polling → `GET /api/code-sync/:syncId/status` her 5sn; `status` değerleri: `RUNNING | SUCCESS | CONFLICT | FAILED`
- SUCCESS'te `data.result.prUrl` ile Azure DevOps PR linki gösterilir
- CONFLICT'te `data.conflict.prId` ve `data.conflict.files` ile çakışma bilgisi gösterilir
- Skip-and-continue: `POST /api/code-sync/:syncId/skip-and-continue` body: `{ "skipPrId": 912 }` → yeni job başlar, 202 döner

**Tarih:** 2026-02-25

---

## QA Audit — 2026-02-25 — Frontend Fazı

**Gelen:** QA Engineer  
**AC Kapsamı:** 26 AC — Tam Kod İncelemesi  
**Genel Karar:** ⚠️ 4 Bug Bulundu — Release Blocker YOK, P1 + 3×P2

### AC Kapsam Tablosu

| AC | Başlık | Durum |
|---|---|---|
| AC-1 | Bağlam seçici + iki panel + aksiyon çubuğu | ✅ |
| AC-2 | Sol panel: workitem bazlı accordion | ✅ |
| AC-3 | Sağ panel: müşteri branch PR listesi | ✅ |
| AC-4 | Accordion default kapalı | ✅ |
| AC-5 | Workitem: başlık, tip, ID, PR sayısı | ✅ |
| AC-6 | PR: başlık, numara, merge tarihi, yazar, repo | ✅ |
| AC-7 | Ürün + Servis seçici | ✅ |
| AC-8 | Kaynak → Hedef versiyon seçimi | ⚠️ BUG-017 (düşük versiyonlar filtrelenmiyor) |
| AC-9 | CustomerBranch seçici | ✅ |
| AC-10 | Delta: ServiceReleaseSnapshot | ✅ |
| AC-11 | Workitem hiyerarşisine gruplama | ✅ |
| AC-12 | Mevcut PR'lar "MEVCUT" rozeti + disabled | ✅ |
| AC-13 | Delta 0 ise "zaten senkronize" mesajı | ✅ |
| AC-14 | Workitem checkbox → altındaki PR'lar seçili | ✅ |
| AC-15 | Bireysel PR seçimi/deselect | ✅ |
| AC-16 | "Hepsini Seç" / "Temizle" kısayolları | ✅ |
| AC-17 | Çakışma Analizi butonu + dialog | ✅ |
| AC-18 | Onay dialogunda oluşturulacak branch adı | ❌ BUG-015 (sync branch adı yok) |
| AC-19 | `sync/v{ver}-{servis}-{tarih}` branch açılır | ✅ (backend/MCP) |
| AC-20 | Cherry-pick sıralı | ✅ (backend/MCP) |
| AC-21 | Başarıda PR oluşturulur | ✅ (backend/MCP) |
| AC-22 | PR açıklamasında workitem listesi | ✅ (backend) |
| AC-23 | PR URL kullanıcıya gösterilir | ✅ (SUCCESS state'te link mevcut) |
| AC-24 | Conflict: dosyalar raporlanır + skip seçeneği | ✅ |
| AC-25 | SyncHistory kaydı | ✅ (backend) |
| AC-26 | Geçmiş: tarih, versiyon, workitem sayısı, durum, PR linki | ❌ BUG-016 + BUG-018 |

### Açık Bug'lar

| ID | Priority | Başlık |
|---|---|---|
| BUG-015 | P1 | Confirm dialog'da sync feature branch adı gösterilmiyor (AC-18) |
| BUG-016 | P2 | Geçmiş sekmesinde versiyon UUID gösteriyor, okunabilir isim yok (AC-26) |
| BUG-017 | P2 | Hedef versiyon seçici düşük versiyonları filtrelemiyor (İş Kuralı 2) |
| BUG-018 | P2 | Geçmiş sekmesinde workitem sayısı gösterilmiyor (AC-26) |

### Release Blocker Değerlendirmesi

- **BUG-015 (P1):** AC-18'i ihlal ediyor — onay öncesinde kullanıcı bilgi eksik. Fix basit (frontend string compute). **Merge öncesi yap.**
- **BUG-016 (P2):** UUID sorunu rahatsız edici ama functional olarak çalışıyor; backend fix gerekiyor.
- **BUG-017 (P2):** Yanlış versiyon aralığı seçilebilir; kullanıcı hatası riski var. `semver` ile düzeltilmeli.
- **BUG-018 (P2):** AC-26'da zorunlu alan eksik; history okunabilirliğini düşürüyor.

**Öneri:** BUG-015 fix edilirse feature branch açılabilir. BUG-016/017/018 bir sonraki iterasyonda kapatılabilir.

**Tarih:** 2026-02-25
