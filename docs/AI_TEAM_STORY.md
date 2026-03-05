# ReleaseHub360 × AI Ekibi — Hayat Hikayesi

**Tarih:** Mart 2026  
**Konu:** Gerçek bir kurumsal yazılımı, gerçek bir AI ekibiyle sıfırdan nasıl inşa ettik?

---

## 0. Başlangıç Sorusu

> *"AI bir yazılımcının yerini alabilir mi?"*

Bu soruyu sormak yerine, onu yaşayarak yanıtlamaya karar verdik.  
Sonuç: Hem evet hem hayır. Ve tam olarak *neden* hem evet hem hayır olduğunu bulmak, bu projenin en değerli çıktısı oldu.

---

## 1. Proje: ReleaseHub360

**Ne yapar?**  
Kurumsal yazılım ekipleri için uçtan uca **release yaşam döngüsü yönetim platformu**.

- Ürün versiyonlarını `PLANNED → DEV → RC → STAGING → PRODUCTION → HOTFIX` döngüsünde takip eder
- Müşteriye özel branch'leri, versiyon farklarını ve kod senkronizasyonunu yönetir
- Release sağlığını gerçek zamanlı izler: *"Bu versiyon production'a çıkabilir mi?"*
- TFS/Azure DevOps, n8n workflow engine ve MCP Server ile entegre çalışır

**Teknik stack:**
```
Frontend   → React 19 + MUI v7 + TanStack Query v5
Backend    → Express + TypeScript + Prisma ORM
Database   → PostgreSQL 16
Auth       → JWT (bcrypt)
Workflows  → n8n (webhook proxy)
DevOps     → Azure DevOps / TFS
Code Sync  → Python FastAPI (MCP Server)
```

**Bugünün rakamları:**
- 21 ekran, 109 backend endpoint, 22 veritabanı tablosu
- ~11.000 satır TypeScript (frontend + backend)
- 0 Firebase import (tamamen migrate edildi)
- 7 skill dosyası, 12 öğrenme dersi, 5 n8n workflow

---

## 2. Nasıl Başladık: Firebase'den Monorepo'ya

Proje aslında **saf bir React + Firebase SPA** olarak doğdu. 30'dan fazla route, Firestore doğrudan frontend'den çağrılan, auth Firebase'de.

İlk büyük karar:

> *"Bunu gerçek bir mühendislik projesi yapalım."*

### Kararlar:
| Konu | Eski | Yeni |
|---|---|---|
| Backend | Yok (Firebase doğrudan) | Express + TypeScript |
| Auth | Firebase Auth | JWT custom |
| DB | Firestore (NoSQL) | PostgreSQL 16 |
| Yapı | Tek SPA | Monorepo (3 package) |
| Ekip | 1 insan | 1 insan + AI ekibi |

Bu kararı aldıktan sonra soru şu oldu:  
**"Bunu kim yapacak?"**

---

## 3. AI Ekibini Kurmak: Skill Dosyaları

Tek bir AI prompt'uyla büyük bir yazılım projesi yönetmek mümkün değil. Neden?

- AI her sohbette hafızasını sıfırlar
- "Şimdi frontend developer ol" dediğinde — hangi frontend developer? Hangi kurallarla?
- Proje büyüdükçe "ne bilmesi gerektiği" de büyür

### Çözüm: Her rol için bir kimlik dosyası

`.github/copilot/skills/` klasörü altında **7 uzman persona** oluşturduk:

| Dosya | Rol | Sorumluluk |
|---|---|---|
| `release-manager.prompt.md` | Release Manager / PO | Feature spec, AC listesi, önceliklendirme, müşteri perspektifi |
| `ux-designer.prompt.md` | UX Designer | Wireframe, bileşen kararları, Command Center pattern |
| `frontend-developer.prompt.md` | Frontend Dev | React + TanStack Query, Firebase→API migration kuralları |
| `backend-developer.prompt.md` | Backend Dev | Express+TS, Prisma, PostgreSQL, JWT pattern |
| `n8n-engineer.prompt.md` | n8n Engineer | Workflow tasarımı, split döngüleri, webhook proxy |
| `qa-engineer.prompt.md` | QA Engineer | Screen Audit, bug ticket, Jest, Playwright |
| `devops-engineer.prompt.md` | DevOps | Docker, CI/CD, ortam yönetimi |

Her dosya sadece "ne yapacağını" değil, **nasıl düşüneceğini** de tanımlıyor:
- Domain bilgisi (release türleri, risk seviyeleri, müşteri etkisi)
- Bu proje'ye özel kurallar (Firebase import yasak, raw SQL yasak, `any` tipi yasak)
- Hangi dosyayı okuyacağı, hangisine yazacağı
- Blocker tetikleyici koşulları

### Her skill dosyasının hikayesi farklı

**Release Manager** en önce yazıldı. O olmadan hiçbir iş başlamıyor. Her feature'ın "neden" sorusunu cevaplayan kişi o.

**QA Engineer** en çok evrildi. Başlangıçta sadece "bug ticket yaz" modundaydı. Zamanla öğrendik ki: *ticket yaz ama fix yapma* iş akışı işe yaramıyor (lessons L006). QA artık bulduğu bug'ı anında fix'liyor, TypeScript doğrulaması yapıyor, sonra ticket yazıyor.

**n8n Engineer** en teknik spesifik olan. n8n'in döngü mantığı (split node) standart programlama mantığından çok farklı. Bu bilgiyi skill dosyasına yazmak, her seferinde "döngüyü nasıl yazacağız" diye konuşmayı ortadan kaldırdı.

---

## 4. İş Geliştirme Zinciri

Her feature tek bir promptla değil, **zincirleme rol aktivasyonları** ile gelişiyor:

```
Release Manager  →  UX Designer  →  Backend Dev  →  Frontend Dev  →  QA Engineer
     ↓                  ↓               ↓                ↓               ↓
  TASK-XXX.md    designs/screens/   routes/ +       pages/*.tsx     BUG-XXX.md
                   {ekran}.md       schema.prisma
```

### Gerçek bir örnek: Customer Version Sync özelliği

```
"release-manager → ux-designer → backend-developer → frontend-developer → qa-engineer:
 müşteriye özel versiyon geçiş planlaması ekle"
```

Bu tek satır prompt ile AI şunu yaptı:
1. **RM:** `tasks/open/TASK-012.md` yazdı — AC listesi, scope, edge case analizi
2. **UX:** `designs/screens/customer-version-sync.md` yazdı — wireframe + bileşen kararları
3. **Backend:** Prisma schema'ya `CustomerVersionTransition` tablosu, 5 yeni endpoint
4. **Frontend:** `CustomerVersionSyncPage.tsx` — tam CRUD + tarih input ISO dönüşümü
5. **QA:** 3 bug tespit etti, 2'sini anında fix'ledi, 1 ticket açtı

**Toplam insan müdahalesi:** Tek prompt + "devam" onayı.

### Kapılı vs Akışkan Mod

```
# Akışkan — durmadan ilerler
"rm → ux → backend → frontend → qa: özellik adı"

# Kapılı — her RM review'da dur, kullanıcı onayı iste
"rm → ux → [RM GATE] → backend → [RM GATE] → frontend → qa: özellik adı"
```

Kapılı mod önemli: Büyük özellikler için AI tasarımı tamamlar, insana gösterir, "devam" denmeden ilerlemez. Bu, **kontrol kaybı** yaşamamak için kritik bir mekanizma.

---

## 5. Design Doküman: Beynin Dışarıya Alınması

Projenin en kritik aşamalarından biri **`docs/DESIGN_DOCUMENT.md`**'nin yazılmasıydı.

**5.792 satır.**

Bu doküman şunları içeriyor:
- 22 ekranın tam spesifikasyonu
- Her ekranda hangi buton, hangi aksyon, hangi API çağrısı
- Deployment model'e göre conditional rendering kuralları
- DORA metrikleri ve nasıl hesaplanacağı
- Müşteri portal akışları (download, onay, güncelleme talebi)

**Neden önemli?**  
AI her oturumda hafızasını sıfırlıyor. Ama bu döküman sıfırlanmıyor.  
Her oturum başında AI bu dökümanı okuyarak "nerede olduğunu" hatırlıyor.

**Backlog sistemi:**  
Bu döküman `tasks/backlog.md`'deki task listesine dönüştürüldü.  
Her task: hangi dosya, hangi bölüm, hangi grep doğrulaması.

```
"backlog'dan devam et" → AI ilk tamamlanmamış task'ı alır → implement eder → 
grep doğrulaması yapar → checkbox'ı işaretler → sıradaki task'a geçer
```

---

## 7. Backlog: Makineye Sprint Yönetimi

Design Document tek başına yetmiyordu. 5.792 satırlık spesifikasyonun *hangi parçasını* önce yapacaksın?

### Gap analizi: Tasarım vs Gerçeklik

Önce mevcut kod + tasarım dokümanı karşılaştırıldı. Sub-agent'a görev verildi:

```
"21 frontend sayfasını tara, 22 ekran tasarımıyla karşılaştır, 
hangi AC'ler eksik, hangiler hatalı, hangilerde hiç yok?"
```

Sonuç: `tasks/GAP-ANALYSIS.md` — 36 eksik özellik, P0'dan P3'e önceliklendirilmiş.

**En büyük 3 boşluk:**
1. Customer Dashboard — download/onay/talep butonları **tamamen yok**
2. Home Dashboard — DORA metrikleri **tamamen yok**
3. Service Version Matrix — 3-view toggle, export **tamamen yok**

### Backlog'un anatomisi

Gap analizi, `tasks/backlog.md`'ye dönüştürüldü. Her satır:

```markdown
- [ ] A3-06 | prisma/schema.prisma | ReleaseTodo modeline phase, 
  responsibleTeam, isRecurring alanları ekle |
  GREP: grep "responsibleTeam" packages/backend/prisma/schema.prisma
```

Format: **ID | Dosya | Ne yapılacak | Doğrulama komutu**

Her task ~yarım gün. Bölüm harfi sistemi:
- **A** → Schema & Veri Modeli  
- **B** → RBAC & Yetki  
- **C** → Backend Routes  
- **D** → Frontend Features  
- **E** → UI & Component  

### Otonom çalışma modu

```
"backlog'dan devam et"
    ↓
AI: İlk [ ] task'ı bulur
    ↓
Design Document'ın ilgili bölümünü okur
    ↓
Implement eder
    ↓
Grep doğrulamasını çalıştırır
    ↓
[ ] → [x] olarak işaretler
    ↓
Bir sonraki task'a geçer
    ↓
(Oturum boyunca devam eder)
```

**Neden önemli?**  
Bu, sprint yönetimini AI'a devrediyor. İnsan sadece "devam et" diyor.  
Bağımlılık sırası (Schema önce, Backend sonra, Frontend en son) korunuyor.  
Context kaybolsa bile — checkbox'lar nerede kalındığını gösteriyor.

### Gerçek sayı

`tasks/backlog.md` → **265 satır, 60+ task**  
Bunların ~%80'i tamamlandı. Tüm bunlar "backlog'dan devam et" komutuyla, 
insan müdahalesi minimumda.

---

## 7. Quality Gate: Her İşten Sonra "Doğru mu?"

Her fazın sonunda **Release Manager review** zorunlu:

| Geçiş | Kontrol |
|---|---|
| RM Spec → UX | AC eksiksiz mi? Kapsam net mi? |
| UX → Backend | Tüm AC ekranları wireframe'de var mı? Edge case'ler? |
| Backend → Frontend | Endpoint'ler dokümante mi? Response format açık mı? |
| Frontend → QA | TypeScript 0 hata, 0 Firebase import, AC görsel olarak var mı? |
| QA → Done | Kritik bug'lar RESOLVED mi? Release blocker kalmadı mı? |

### Handoff Notu Standardı

Her rol işini bitirince bir sonraki role mesaj bırakıyor:

```markdown
## Handoff Notu — Backend Developer
**Tamamlanan:** 5 endpoint, 2 yeni tablo
**Önemli:** CustomerVersionTransition.plannedDate → ISO 8601 formatı bekliyor
**Frontend için:** POST /api/customer-version-transitions/{id}/complete
**RM review bekleniyor**
```

Bu sayede roller arası bilgi kaybı olmadan devam ediliyor.

---

## 8. Öğrenen Sistemler: Lessons.md

Her hata sadece bir kez yapıldı.

`tasks/lessons.md` dosyası projenin "kurumsal hafızası". Bir şey ters gidince:

1. Sorun analiz edilir
2. Yapısal kural çıkarılır
3. Dosyaya yazılır

**Gerçek örnekler:**

**L002 — PostgreSQL port çakışması**  
Homebrew'dan yüklü local PostgreSQL, Docker'daki ile çakışıyordu. Prisma hataları saatler sürdü. Kural: *"Önce `lsof -i :5432` çalıştır."*

**L004 — TFS API `.value` sarmalı**  
Azure DevOps API'leri `{value: [...], count: N}` formatta döndürüyor. Frontend direkt `.filter()` çağırınca crash. Kural: *"Her TFS endpoint'i için `.value` çıkarımı zorunlu."*

**L006 — QA ticket yazar ama fix yapmaz**  
QA bug bulunca ticket açıp bitiriyordu. Bug bir sonraki oturuma kalıyordu. Kural: *"QA audit = Bul + Yaz + Düzelt. Kullanıcı 'developer çağır' demeden fix uygulanır."*

**L008 — Tasarım yazıldı ≠ ekranda uygulandı**  
22 ekran tasarımı yazılmış, frontend implement edilmişti. Ama gap analizi 36 eksik özellik tespit etti. Kural: *"Her fazın sonunda RM zorunlu gap review yapar."*

### Skill dosyaları da kendini güncelliyor

Bir role çalışırken o rolün skill dosyasında eksik kural fark edilirse, iş bittikten sonra skill dosyası güncelleniyor. Döngü:

```
Hata yaşandı → Lessons.md güncellendi → Skill dosyası güncellendi → 
Aynı rol bir daha çağrıldığında → Aynı hatayı yapmıyor
```

---

## 9. GitHub Enterprise Entegrasyonu

Proje sadece kod değil, **GitHub Issues'u task sistemi olarak** kullanıyor.

QA Engineer'ın GitHub Issue Audit Modu:

```bash
# Her issue için:
1. Issue'yu çek → AC listesini parse et
2. Backend'e gerçek curl at → response kontrol et
3. Frontend kodunda AC'yi karşılayan UI var mı gözden geçir
4. Tüm AC ✅ → issue'yu kapat (comment + PATCH state:closed)
5. Herhangi AC ❌ → bug issue aç + parent'a comment + fix uygula
```

**Önemli kural:**  
*"Kodda bu alan var, demek ki AC karşılanmış" çıkarımı YASAK.*  
Gerçek API'yi çağır, gerçek response'u gör, sonra karar ver.

Bu, AI'ın "hallucinate etmesini" (gerçek test yapmadan "çalışıyor" demesini) engelleyen en önemli kalite mekanizması.

---

## 10. Mikro Acceptance Criteria Mimarisi

**En büyük öğrenim bu oldu.**

Başlarda şöyle yazıyorduk:

```
"Customer dashboard'u geliştir"
```

Çıktı: Temel CRUD çalışıyordu ama download butonu yoktu, onay akışı yoktu, 
conditional rendering yoktu. Aksyon katmanı tamamen eksikti.

### Sorun: Büyük prompt → geniş yorum alanı → eksik implementasyon

**Çözüm: Her AC somut ve test edilebilir olmalı**

```
✅ DOĞRU:
- [ ] `deploymentModel === 'DOCKER'` ise "HelmChart İndir" butonu görünür
- [ ] "Versiyonu Onayla" butonuna tıklayınca POST /api/.../approve çağrılır
- [ ] Başarılı onay sonrası toast ile "Onaylandı" mesajı gösterilir

❌ YANLIŞ:
- [ ] Customer dashboard'da onay akışı çalışır
```

TASK dosyasındaki her AC:
- Bir UI elementi veya davranışa bağlı
- Test edilebilir (grep veya curl ile doğrulanabilir)
- Belirsizlik içermiyor

**Kural:** "Çalışıyor" ≠ "Tasarıma uygun".  
Her AC bağımsız olarak doğrulanana kadar tamamlanmış sayılmaz.

---

## 11. Context Uzunluğu: En Büyük Engel

Bu projenin en çarpıcı bulgusu:

> **AI, tek bir oturumda ne kadar çok şey biliyor olursa o kadar az şey üretiyor.**

### Context kaybı nasıl oluyor?

Bir oturum uzadıkça:
- AI eski kararları "unutmaya" başlıyor
- Bir yerde düzeltilen bug başka yerde tekrar yazılıyor
- "Zaten yaptık bunu" denen şeyler tekrar soruluyor

### Bunu nasıl yönettik?

**1. Oturumları küçük tut**  
Her oturum tek bir task. Task tamamlanınca oturum bitirilir.

**2. Hafıza dosyaları**  
- `tasks/lessons.md` → hata bilgisi
- `tasks/open/TASK-XXX.md` → görev açıklaması + handoff notları
- `designs/screens/{ekran}.md` → tasarım kararları
- `docs/DESIGN_DOCUMENT.md` → sistemin tam spesifikasyonu

Bu dosyalar AI'ın "dışsal hafızası". Her oturum başında okunuyor.

**3. Modüler roller**  
Her rol sadece kendi alanını biliyor. Backend developer tüm frontend'i bilmek zorunda değil. Bu, her rolün context'ini küçük ve odaklı tutuyor.

**Sonuç:**  
Projenin tamamını tek bir oturumda bilmek mümkün değil (~11.000 satır kod, 22 ekran, 109 endpoint). Ama doğru dosyaya bakan doğru rol — 300-500 satırlık odaklı bir bağlamda — mükemmel iş çıkarıyor.

---

## 12. "Yazdığın Koda Hakim Olamama" Gerçeği

Projenin büyüdükçe ortaya çıkan en dürüst itiraf:

> *"Bu kodu tamamen anlamak artık mümkün değil."*

11.000 satır, 22 ekran, 109 endpoint. Bunun hepsini aynı anda aklında tutmak bir insana da zor, bir AI oturumuna da.

**Bu bir başarısızlık değil — bu gerçekçilik:**

- Büyük yazılım projelerinde hiçbir bireysel geliştirici tüm kodu %100 bilmiyor
- Ekiplerin var olmasının nedeni bu
- AI ekibinin var olmasının nedeni de bu

**Ama bir fark var:**  
İnsan bir ekipte her üye *kendi domenini* gerçekten biliyor.  
AI bir oturumda her şeyi "yaklaşık olarak" biliyor.

Bu fark, AI'ın gerçek mühendislik ekibinin **yerini** değil, **güçlendiricisi** olduğunu gösteriyor.

---

## 13. AI Yazılımcıların Yerini Alabilir mi?

Projenin cevabı:

### Alabildikleri:
- ✅ Belirlenmiş bir spec'e göre kod yazma
- ✅ CRUD endpoint oluşturma
- ✅ Tasarıma uygun UI bileşeni geliştirme
- ✅ Bug fix (tespit edilmiş, lokalize edilmiş)
- ✅ Test yazma (belirlenmiş senaryo için)
- ✅ Migration (Firebase → PostgreSQL gibi, kurallar net ise)

### Alamadıkları (henüz):
- ❌ Büyük sistemde gerçek debugging (context çok geniş)
- ❌ "Bunu nasıl yapsak?" sorusuna özgün mimari yanıt
- ❌ Belirsiz bir problemden doğru soruyu çıkarma
- ❌ Kullanıcı davranışını tahmin etme (UX araştırması)
- ❌ Kod'a gerçek anlamda "sahip olma"

### Asıl engel — context window değil, sahiplik:

Context window bir teknik kısıt. Zamanla büyüyecek.

Ama **"bu koda ben karar verdim, bu kararın arkasında durabilirim"** hissi — bu başka bir şey.  
Bunu AI veremez. Bunu hissedebilmek için kodu yazan olmak gerekiyor.

---

## 14. Ne Öğrendik — Özet

| Öğrenim | Sonuç |
|---|---|
| Tek prompt büyük iş üretemez | Zincirli rol sistemi kuruldu |
| AI her oturumda unutur | Hafıza dosyaları sistemi kuruldu |
| "Çalışıyor" ile "doğru" aynı şey değil | Her AC test edilebilir hale getirildi |
| Skill dosyası = kimlik | 7 uzman persona oluşturuldu |
| Hata tekrarını önle | Lessons.md + skill güncelleme döngüsü |
| Context dar olunca iş kalitesi artar | Modüler rol sistemi + küçük oturumlar |
| Tasarım ≠ implementasyon | Her fazda RM gap review zorunlu |
| Ticket açmak ≠ problemi çözmek | QA = Bul + Yaz + Düzelt |

---

## 15. Gelecek

Bu proje bir **metodoloji deneyi** kadar bir yazılım ürünü.

Sonraki adımlar:
- DORA metrikleri (Home Dashboard V2)
- Customer portal download akışı (P0 gap)
- Service Version Matrix 3-view toggle
- Playwright E2E test coverage artırma
- MCP Server → daha derin Azure DevOps entegrasyonu

Ve belki en önemlisi:  
Bu metodolojinin — skill dosyaları, zincir sistemi, hafıza dosyaları, mikro AC mimarisi — başka projelere uyarlanması.

---

## 16. Sunum Akışı Önerisi

```
1. Proje nedir? (2 dk) — ReleaseHub360, ne yapar, kime yarar
2. Firebase'den gerçeğe (2 dk) — büyük karar, monorepo geçişi
3. AI ekibini kurmak (5 dk) — 7 skill dosyası, her birinin hikayesi
4. İş geliştirme zinciri (5 dk) — zincir sistemi, akışkan vs kapılı mod
5. Backlog: sprint otomasyonu (3 dk) — gap analizi, otonom çalışma
6. Öğrenen sistemler (3 dk) — lessons.md + skill güncelleme döngüsü
7. Context sorunu (3 dk) — asıl engel bu
8. AI yerini alabilir mi? (3 dk) — dürüst cevap
9. DEMO — canlı (5-7 dk) — tek prompt → tam zincir → çalışan ekran
10. Q&A
```

---

## APPENDIX — Sunum Demo Promptu

> Bu prompt, sunumda canlı yazılır ve dinleyicilere gösterilir. 
> Sonucu kayıt altına alıp video olarak da yedekleyebilirsin.

### Feature: "Go / No-Go Release Kararı" Widget'ı

**Neden bu?**
- Domain'i hiç bilmeyenler bile anında anlıyor: *"Bu release çıkabilir mi?"*
- Büyük yeşil/kırmızı badge — görsel olarak güçlü
- Tüm roller anlamlı iş yapıyor
- Mevcut DB'de verisi var — fake data yok
- 0 DB schema değişikliği (computed endpoint)

---

### Demo Promptu — Kopyala/Yapıştır

```
release-manager → ux-designer → backend-developer → frontend-developer → qa-engineer:

Release Health Check sayfasına "Go / No-Go Kararı" widget'ı ekle.

Bağlam: Bir release manager versiyon seçtiğinde sayfanın üst kısmında 
büyük ve net bir karar badge'i görmek istiyor: Bu versiyon production'a 
çıkabilir mi?

Karar hesabı:
- P0 öncelikli tamamlanmamış release todo sayısı → 0 ise ✅
- Açık hotfix request sayısı (PENDING veya APPROVED durumda) → 0 ise ✅  
- TFS'de review bekleyen PR sayısı → 0 ise ✅

Tüm kriterler ✅ ise → büyük yeşil badge: "🟢 GO — Production'a Hazır"
Herhangi biri ❌ ise → büyük kırmızı badge: "🔴 NO-GO" + hangi kriter 
tutmadığının listesi

Backend: GET /api/release-health/:versionId/go-no-go endpoint'i
Frontend: Mevcut ReleaseHealthCheckPage'in en üstüne GoNoBadge bileşeni
Scope: n8n-required: false, ux-required: true
```

---

### Demo Akışı (İzleyiciye Ne Anlatırsın)

**[Prompt yazılırken]**
> *"Tek bir prompt. Beş rol. Bakın ne olacak."*

**[RM tamamlandığında]**
> *"Release Manager spec'i yazdı. AC listesini görüyorsunuz. 
> Üç kriter: P0 todo, açık hotfix, bekleyen PR. Her biri test edilebilir."*

**[UX tamamlandığında]**
> *"UX Designer wireframe'i çizdi. Badge'in nasıl görüneceği, 
> breakdown listesinin formatı belgeli. Backend bu tasarımı okuyarak çalışacak."*

**[Backend tamamlandığında]**
> *"Backend developer endpoint'i yazdı. Curl ile test edebiliriz — 
> gerçek veri, gerçek hesaplama."*

**[Frontend tamamlandığında]**
> *"Frontend developer komponenti ekledi. TypeScript 0 hata. 
> Şimdi ekranı açalım."* → Tarayıcıyı aç, live göster

**[QA tamamlandığında]**
> *"QA test etti. [N] bug, [M] RESOLVED. Pipeline kapandı."*

**[Kapanış sorusu]**
> *"Bu kadar sürdü. Kaç kişilik bir ekip kaç günde yapardı bunu?"*

---

### Geri Dönüş Planı (Network/Hata Durumu)

Demo beklenmedik hata verirse:
```bash
# Önceden kayıt al:
cd packages/backend && npx tsx src/index.ts &
cd packages/frontend && npx vite &
# Tam zinciri çalıştır, ekran kaydı al
# Sunumda video göster + "gerçek zamanlı çalıştırılmış" de
```

---

*"Bir AI ekibini kurmak, onu çalıştırmaktan daha uzun sürdü. Ama bir kez kurulunca — çok şey değişti."*
