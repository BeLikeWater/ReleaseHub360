# Feature Spec: Service Release Snapshot

**Hazırlayan:** Release Manager / Product Owner  
**Tarih:** 23 Şubat 2026  
**Durum:** Taslak — Onay Bekliyor  
**Öncelik:** P1  
**Etkilenen Ekranlar:** Release Health Check, (ileride: Releases sayfası servis detayı)

---

## Özet

Bir üründe 7 servis varsa, her birinin kendi repo/pipeline/release döngüsü var. Bir versiyon yayınlandığında bazı servisler değişmemiş olabilir ve önceki release numarasıyla devam eder. Health Check sayfasında her servisin "son yayınlanan release"ini ve o tarihten bu yana gelen yeni PR'ları gösterebilmek için **her servis için bir release snapshot** tutmak gerekiyor. Bu snapshot aynı zamanda o release'in servis bazlı Bill of Materials'ını (BoM) oluşturuyor.

---

## Problem / Fırsat

### Şu An Ne Oluyor?

`Service` modelinde `currentVersion`, `currentVersionCreatedAt` ve `releaseName` alanları var. Ancak bunlar:

1. **Anlık durum** tutuyor — geçmiş release'lerin kaydı yok
2. **PR listesi yok** — hangi PR'ların o release'e girdiği belli değil, sonradan rekonstrükte edilemiyor
3. **Zaman damgası hassassizliği** — `currentVersionCreatedAt` var ama bu timestamp ile `preProdDate` arasında hangisi "anchor" olacağı belirsiz; PR sorgusunda hangi tarihi baz alacağız?
4. **Multi-service release numarası yönetimi zor** — 7 servisten 2'si değişmediyse onların release numarası farklı, bu bilgi sağlık skoruna dahil edilemiyor

### Gerçek Senaryo (Release Manager Gözüyle)

Pazartesi sabahı standup öncesi Health Check açıyorum:

- `ServiceA` → Son release: `Release-47` (3 gün önce) → O tarihten bu yana 2 PR merge edilmiş → Bu 2 PR yeni versiyona dahil olacak
- `ServiceB` → Son release: `Release-32` (3 hafta önce) → O tarihten bu yana 0 PR → Bu servis için yeni release tetiklememe gerek yok, önceki release numarasıyla devam
- `ServiceC` → **Hiç snapshot yok** → Ne zaman son release çıktığı belli değil → Kör uçuş

Şu an bu tabloyu göremiyorum. PR sorgusu `preProdDate`'i baz alıyor — bu ürün versiyonunun tarihi, servisin last release tarihi değil. Bu yüzden delta hesabı yanlış.

### Neden PR Listesini Snapshot'ta Saklamak Zorunlu?

PR delta'sını her seferinde Azure'dan hesaplayabiliriz (tarih bazlı sorgu). Ancak:

1. **BoM tutarlılığı:** "Release-48'de hangi PR'lar vardı?" sorusunun cevabı kalıcı olmalı. Azure repo geçmişi değişebilir (squash, rebase, force push); DB'deki kayıt gerçek kaynaktır.
2. **Audit:** Compliance gerekliliklerinde "X tarihinde production'a ne çıktı?" sorusu yanıtlanabilmeli.
3. **Delta hesabının doğruluğu:** Bugünkü delta = `bugün çekilen PR'lar` - `snapshot'taki PR'lar`. Snapshot olmadan bu fark hesaplanamaz.
4. **Performans:** Her Health Check yüklemesinde Azure'dan tüm repo geçmişini taramak yerine son snapshot tarihinden sonrasını sorgula.

### Kısıt: currentVersion Tek Başına Yetmez

`Service.currentVersion = "1.0.20251009.4"` → Azure build numarasını biliriz ama:
- Hangi PR'lar o build'e girdi? → Azure'da bulunabilir ama sorgulanabilir değil (build ↔ PR mapping API'si var ama yavaş ve tutarsız)
- Ne zaman production'a çıktı? → `currentVersionCreatedAt` var ama bu "deploy tarihi" mi "build tarihi" mi? Belirsiz.

**Sonuç:** Snapshot olmadan doğru PR delta hesabı mümkün değil. Snapshot zorunlu.

---

## Kullanıcı Hikayeleri

- **Release Manager olarak** Health Check sayfasında her servisin son yayınlanan release bilgisini (numara + tarih) görmek istiyorum; çünkü hangi serviste değişiklik olmadığını anlayıp gereksiz release tetiklemekten kaçınmak istiyorum.
- **Release Manager olarak** her servis için son release'den bu yana merge edilmiş PR'ların listesini görmek istiyorum; çünkü yeni versiyonun BoM'unu oluşturmam ve release notes yazmam lazım.
- **Release Manager olarak** "Yayınla" butonuna bastığımda sistemin o anki PR listesini snapshot olarak kaydetmesini istiyorum; çünkü gelecekte "o release'de ne vardı?" sorusuna kesin cevap verebilmeliyim.
- **Release Manager olarak** hiç snapshot almamış servisleri özel bir ikonla görmek istiyorum; çünkü o servisler için referans noktası belirsiz ve sağlık skoru hesabı güvenilmez.

---

## Kabul Kriterleri (AC)

### ServiceReleaseSnapshot Kaydı
- [ ] "Yayınla" butonuna basıldığında, ürünün tüm aktif servisleri için snapshot alınır
- [ ] Her snapshot şunları içerir: `serviceId`, `productVersionId`, `releaseName` (Azure release adı ya da manual), `releasedAt` (o anki UTC timestamp), `prIds` (JSON — snapshot alınma anında merge edilmiş PR ID + title + mergeDate listesi), `publishedBy` (userId)
- [ ] Eğer bir servis için daha önceki snapshot varsa, **yeni snapshot eklenir, eski silinmez** (versiyon geçmişi korunur)
- [ ] Değişiklik yoksa (önceki snapshot'tan bu yana yeni PR yok) snapshot yine de kaydedilir — release tarihi güncellenir, PR listesi boş kalır. (Servis "bu versiyona dahil değil" olarak işaretlenmiş sayılır)

### Health Check — Servis Başına Görünüm
- [ ] Her servis satırında: son snapshot `releaseName`, `releasedAt`, ve o tarihten bu yana merge edilen PR sayısı gösterilir
- [ ] PR sayısı 0 ise: yeşil chip "Değişiklik yok" 
- [ ] PR sayısı > 0 ise: mavi chip "N yeni PR" — tıklanınca PR listesi açılır
- [ ] Hiç snapshot yoksa: gri chip "Hiç yayınlanmadı" + uyarı ikonu

### Health Check — PR Delta Listesi (Servis Detayı)
- [ ] Görüntülenen PR'lar: son `ServiceReleaseSnapshot.releasedAt` tarihinden bugüne, o servisin `repoName`'i üzerinden Azure DevOps'tan çekilir
- [ ] Her PR için: `title`, `prId`, `author`, `mergeDate`, ve linked work item sayısı gösterilir
- [ ] Snapshot alınmamış servisler için: `preProdDate` veya ürün versiyonunun `testDate`'i fallback olarak kullanılır (bugünkü davranış korunur, uyarı gösterilir)

### "Yayınla" Flow'u — Servis Snapshot Entegrasyonu
- [ ] Mevcut "Yayınla" butonu zaten product-level onay yapıyor; buna ek olarak `POST /api/services/release-snapshot` çağrısı yapılır
- [ ] Modal'da: "Bu işlem tüm servislerin release snapshot'ını güncelleyecek. Devam etmek istiyor musunuz?" onayı istenir
- [ ] Başarı sonrası Health Check sayfası yenilenir (invalidateQueries)
- [ ] Snapshot alma kısmen başarısız olursa (N servis OK, M servis hata) → toast uyarısı: "X servisin snapshot'ı alınamadı, manuel kontrol gerekebilir"

### Sağlık Skoru Etkisi
- [ ] Snapshot'ı olmayan servis sayısı > 0 ise: skor hesabına "bilinmeyen servis" uyarısı eklenir (skor kesintisi yok, sadece uyarı badge)
- [ ] Hiç snapshot olmayan ürünlerin genel PR filtresi: bugünkü `preProdDate` fallback'i devam eder

---

## Kapsam Dışı (Bu Versiyonda Yapılmayacak)

- Servis bazlı ayrı "Yayınla" butonu — şimdilik ürün genelinde tek işlem
- Azure pipeline run ID'sini snapshot'a bağlama — ileride P2
- Servis bazlı sağlık skoru (şu an ürün geneli tek skor)
- Snapshot geçmişini görüntüleme ekranı — ileride Releases sayfasında
- Otomatik snapshot (pipeline job tamamlandığında webhook ile) — ileride DevOps entegrasyonu

---

## İş Kuralları

1. **Snapshot zamanlaması:** "Yayınla" butonu = prod adımı onayı anı. Snapshot bu an alınır; build tamamlanma anı değil.
2. **PR listesi kesilmez:** Snapshot alınırken o anki tüm merge edilmiş PR'lar kaydedilir. Sonraki snapshot için delta = `yeni PR'lar - snapshot'taki PR'lar` değil, delta = `snapshot.releasedAt'ten sonra merge olanlar`. PR set farkı değil, tarih bazlı sorgu.
3. **Aynı PR birden fazla snapshot'a girebilir mi?** Evet. Eğer servis A için Release-47 snapshot'ı alındıktan sonra Release-48 snapshot'ı alınıyorsa ve Release-47'den sonra PR-123 merge edilmişse, PR-123 Release-48 snapshot'ındaki listede görünür. Bu doğru davranış — PR o versiyona dahil edildi anlamına gelir.
4. **releaseName zorunluluğu:** Snapshot alınırken `releaseName` boş bırakılabilir. Backend otomatik bir isim üretir: `{productName}-{version}-{tarih}` formatında.
5. **Snapshot silinmez:** GDPR veya audit nedenleriyle snapshot'lar hard delete edilmez. İleride `isArchived` flag eklenebilir.
6. **Fallback tarihi:** Bir serviste snapshot yoksa, PR delta sorgusunda `ProductVersion.preProdDate ?? ProductVersion.testDate ?? (bugünden 30 gün önce)` kullanılır.

---

## Veri Modeli — Önerilen

### Yeni Tablo: `ServiceReleaseSnapshot`

```prisma
model ServiceReleaseSnapshot {
  id               String    @id @default(uuid())
  serviceId        String
  productVersionId String    // Hangi ürün versiyonu ile yayınlandı
  releaseName      String?   // "Release-47" veya "myapp-2.6.0-20260223"
  releasedAt       DateTime  // Snapshot'ın alındığı UTC zaman — PR delta anchor'ı
  prIds            Json      // Array of { prId, title, mergeDate, repoName }
  publishedBy      String?   // User.id
  notes            String?
  createdAt        DateTime  @default(now())

  service          Service        @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  productVersion   ProductVersion @relation(fields: [productVersionId], references: [id])

  @@map("service_release_snapshots")
}
```

### Service Modeline Eklenti

`Service` modelinde mevcut `currentVersion`, `currentVersionCreatedAt`, `releaseName` korunur.  
Ek alan:
```prisma
  releaseSnapshots ServiceReleaseSnapshot[]
```

### ProductVersion Modeline Eklenti

```prisma
  serviceSnapshots ServiceReleaseSnapshot[]
```

---

## API Tasarımı

### `POST /api/services/release-snapshot` — Toplu snapshot oluştur

**Request:**
```json
{
  "productId": "uuid",
  "productVersionId": "uuid",
  "releaseName": "Release-47",          // optional
  "serviceIds": ["uuid1", "uuid2"]      // optional — belirtilmezse tüm ürün servisleri
}
```

**İş Akışı (backend):**
1. `productId`'nin servislerini DB'den çek (serviceId + repoName listesi)
2. Ürünün Azure credentials'ını DB'den çek
3. Her servis için paralel:
   - O servisin son snapshot'ını bul (`lastSnapshot = MAX(releasedAt)`)
   - `lastSnapshot.releasedAt`'ten bugüne kadar Azure'dan PR listesi çek (`repoName` bazlı)
   - Yeni `ServiceReleaseSnapshot` oluştur
4. Tümü tamamlandıktan sonra `Service.currentVersionCreatedAt` ve `releaseName`'i güncelle
5. Kısmi hata varsa başarılı olanları commit et, hatalıları response'a ekle

**Response:**
```json
{
  "success": ["serviceId1", "serviceId2"],
  "failed": [{ "serviceId": "uuid3", "reason": "Azure API timeout" }]
}
```

### `GET /api/services/:id/release-snapshots` — Bir servisin snapshot geçmişi

```
GET /api/services/:id/release-snapshots?limit=10
```

**Response:** Son N snapshot, azalan tarih sırasıyla.

### `GET /api/services/:id/pr-delta` — Snapshot'tan bu yana PR'lar

```
GET /api/services/:id/pr-delta?productId=uuid
```

**Backend:**
1. `serviceId` için son snapshot'ı bul
2. `snapshot.releasedAt`'ten bugüne Azure PR'larını çek (`tfsGet` ile)
3. Snapshot listteki PR'ları filtrele (opsiyonel: delta list)

---

## Öncelik ve Etki

| Boyut | Değerlendirme |
|---|---|
| Kullanıcı etkisi | Her release'de kullanılır — yüksek frekans |
| İş etkisi | Yanlış PR delta → yanlış release notes → müşteri şikayeti |
| Teknik risk | Yeni tablo + Azure PR sorgusu — mevcut kodu kırmaz |
| Öncelik | P1 — Health Check'in güvenilirliğini doğrudan etkiliyor |

---

## Bağımlılıklar

- **Backend:** `ServiceReleaseSnapshot` Prisma modeli + migration + 2 yeni route
- **Frontend:** Health Check BoM section'ında per-service son snapshot + PR delta gösterimi; "Yayınla" modal'ına snapshot trigger eklenmesi
- **Azure DevOps:** Per-repo, tarih bazlı PR listesi — `tfsGet` üzerinden zaten çalışıyor
- **MCP Server:** Bu feature için doğrudan bağımlılık yok (BoM analizi ileride MCP'ye offload edilebilir — P3)

---

## Açık Sorular

- [ ] **S1:** "Yayınla" butonu şu an product-level onay yapıyor (`ProductVersion.phase` güncelliyor). Snapshot bu buton ile mi tetiklensin, yoksa ayrı bir "Snapshot Al" butonu mu olsun? → Öneri: aynı butona entegre et, kullanıcı ek adım istemez.
- [ ] **S2:** Servis için Azure'da bir "release" dediğimizde tam olarak ne kastediyoruz? Azure Releases (classic pipeline) mi, Azure Pipelines (YAML) run'ı mı? `releaseName` hangi kaynaktan geliyor? → Şimdilik manual input + otomatik isim üretimi yeterli.
- [ ] **S3:** Snapshot alınırken PR'lar gerçek zamanlı mı çekilsin (Azure API call), yoksa Health Check'te zaten listelenen PR'lar mı kullanılsın? → Backend'de Azure call daha güvenilir (güncel veri); cache edilebilir.

---

## Tasarım Notları (UX İçin)

Bu ekranı açan kişi sabah 09:00'da standup öncesinde, kafasında 5 ürün varken açıyor. Şu soruları sormak istiyor:

> "Hangi servisim değişti, hangisi değişmedi? Kaç PR bekliyor?"

Servis satırı tasarımında:
- **Sol:** Servis adı (repoName veya name)
- **Orta:** Son release adı + tarihi (örn: "Release-47 · 3 gün önce")
- **Sağ:** PR sayısı chip'i — tıklanınca PR listesi drawer veya accordion açılır

Değişiklik yoksa: o satır soluklaştırılabilir veya "No Change" grubuna taşınabilir. Release Manager'ı asıl ilgilendiren değişen servisler.

"Hiç snapshot yok" durumu: sarı uyarı badge, tooltip: "Bu servis için henüz release kaydı yok — PR geçmişi tahmini gösteriliyor."

---

## Önerilen Geliştirme Sırası

1. **Backend:** Prisma schema → migration → `POST /release-snapshot` route (Azure PR + DB yazma)
2. **Backend:** `GET /services/:id/pr-delta` route
3. **Frontend:** Health Check BoM section — per-service snapshot + PR delta gösterimi
4. **Frontend:** "Yayınla" modal'ına snapshot trigger entegrasyonu
5. **QA:** Servis bazlı PR delta doğruluğu, kısmi hata senaryosu, fallback tarih davranışı
