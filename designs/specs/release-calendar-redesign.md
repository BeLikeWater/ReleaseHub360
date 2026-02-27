# Feature Spec: Release Takvimi — Versiyon Lifecycle Yönetimi

**Tarih:** 23 Şubat 2026  
**RM:** Release Manager Agent  
**Öncelik:** P1  
**Etkilenen route:** `/release-calendar`

---

## Özet

Release Calendar ekranı, her ürün versiyonunun tüm lifecycle aşamalarını (geliştirme başlangıcı → test → pre-prod → production) görsel olarak yönetebileceğimiz merkezi planlama ekranına dönüştürülecek. Şu anki read-only, tek tarihli gösterimden çıkıp; tarih atama, versiyon oluşturma ve phase takibi yapılabilen bir ekran olacak.

---

## Problem / Fırsat

**Şu an ne oluyor?**
- `ProductVersion` modelinde 5 tarih alanı var: `masterStartDate`, `testDate`, `preProdDate`, `targetDate`, `releaseDate`
- Ancak backend route'u sadece `targetDate` kabul ediyor — diğer 4 tarih hiç doldurulamıyor
- Frontend sadece `targetDate | releaseDate` tek nokta gösteriyor — lifecycle görünmüyor
- Versiyon oluşturma/düzenleme bu ekranda yok — kullanıcı release planlamasını yapamıyor
- Fase geçişleri (PLANNED → DEVELOPMENT → RC → STAGING → PRODUCTION) takip edilemiyor

**Neden acil?**  
Release Manager sabah ofise geldiğinde "bu hafta hangi ürünlerin hangi aşamasında ne var?" sorusunu tek ekranda görmek ister. Şu an bunu yapamıyor.

---

## Kullanıcı Hikayeleri

- **Release Manager olarak** yeni bir versiyon planı oluşturmak istiyorum (ürün + versiyon no + tüm milestone tarihler), çünkü planı erkenden ekiplerle paylaşmam lazım.
- **Release Manager olarak** bir versiyonun development'a ne zaman başlayacağını, testlerin ne zaman yapılacağını, pre-prod'a ne zaman çıkacağını tek bakışta görmek istiyorum.
- **Release Manager olarak** bir versiyonun tarihlerini kolayca güncelleyebilmek istiyorum, çünkü planlar değişiyor.
- **Release Manager olarak** takvimde aynı anda birden fazla farklı ürünün versiyonlarını görmek istiyorum, çünkü çakışan tarihleri tespit etmem gerekiyor.
- **Release Manager olarak** bir versiyonun phase'ini bir sonraki aşamaya ilerletebilmek (PLANNED → DEVELOPMENT) istiyorum.

---

## Kabul Kriterleri

**Versiyon Oluşturma:**
- [ ] "+ Yeni Versiyon" butonuna tıklandığında; ürün seçimi, versiyon numarası, açıklama ve 5 tarih alanı (masterStartDate, testDate, preProdDate, targetDate) içeren dialog açılır
- [ ] Ürün ve versiyon numarası zorunlu, tarihler opsiyonel
- [ ] Aynı üründe aynı versiyon numarası 2 kez oluşturulamaz (backend unique constraint, frontend hata gösterir)

**Timeline/Gantt Görünümü:**
- [ ] Liste görünümünde her versiyon satırı 4 milestone tarihini chip/ikon olarak gösterir: Dev Start, Test, Pre-Prod, Release
- [ ] Tarih olmayan milestone "—" ile gösterilir
- [ ] Takvim görünümünde her milestone ayrı renk/ikon ile işaretlenir (yeşil=dev, sarı=test, turuncu=pre-prod, kırmızı=release)
- [ ] Bugün çizgisi takvimde belirgin şekilde gösterilir

**Tarih Düzenleme:**
- [ ] Liste görünümünde bir versiyona tıklandığında drawer/panel açılır, tüm milestone tarihleri düzenlenebilir
- [ ] Tarih düzenleme: DatePicker ile, UTC midnight olarak kaydedilir
- [ ] Kaydet butonuna basıldığında PUT /api/product-versions/:id çağrılır ve tüm tarih alanları gönderilir

**Phase Yönetimi:**
- [ ] Her versiyon satırında mevcut phase chip olarak gösterilir (PLANNED/DEVELOPMENT/RC/STAGING/PRODUCTION/ARCHIVED)
- [ ] "Sonraki Aşamaya İlerlet" butonu her versiyonda mevcut
- [ ] PRODUCTION aşamasındaki versiyonlara ilerletme butonu gösterilmez

**Filtreleme:**
- [ ] Ürün filtresi: "Tüm Ürünler" dropdown ile tek ürün seçilebilir
- [ ] Phase filtresi: "Tüm Aşamalar" + her phase seçilebilir
- [ ] Sadece aktif versiyonlar gösterilsin (ARCHIVED hariç varsayılan)

**Silme:**
- [ ] Her versiyonun yanında "Sil" aksiyonu var
- [ ] Silme öncesi onay dialog'u çıkar

---

## Kapsam Dışı (Out of Scope)

- Gerçek Gantt chart (yatay bar) — V2'ye bırakıyoruz; şimdilik liste ile milestone chip'leri yeterli
- Beta Tag ekleme — ayrı bir özellik, bu versiyonda yok
- Müşteri bildirimleri (deployment window e-postası) — ayrı sprint
- Calendar event'leri (bakım pencereleri vs.) — ayrı özellik
- `releaseDate` manuel giriş — bu değer PRODUCTION phase'e geçince otomatik doluyor, kullanıcı el ile giremez

---

## İş Kuralları

- Phase geçişi geri alınamaz: PRODUCTION → RC geçerli değil
- `releaseDate`: sadece phase PRODUCTION'a geçince backend otomatik set ediyor, kullanıcı el ile değiştiremez
- `masterStartDate` ≤ `testDate` ≤ `preProdDate` ≤ `targetDate` olmalı (frontend uyarı verir, hard block değil)
- ARCHIVED versiyonlar varsayılan olarak gizli; ayrı toggle ile gösterilebilir
- Hotfix versiyonlar (`isHotfix: true`) kırmızı badge ile ayrışır

---

## Öncelik ve Etki

| Boyut | Değerlendirme |
|---|---|
| Kullanıcı etkisi | Her Release Manager, her gün kullanır |
| İş etkisi | Release planlaması excel'e taşındığında araç değeri düşüyor |
| Teknik risk | Düşük — şema zaten hazır, sadece route + frontend |
| Öncelik | **P1** |

---

## Bağımlılıklar

- **Backend:** PUT `/api/product-versions/:id` → `masterStartDate`, `testDate`, `preProdDate` alanlarını da kabul etmeli
- **Backend:** POST `/api/product-versions` → aynı alanları kabul etmeli
- **Backend:** GET `/api/product-versions` → `phase` ve `productId` filtresini zaten destekliyor ✅
- **Başka özellikle çakışma:** Releases screen (ayrı ekran, versiyon detay) bu ekrandan etkilenmez

---

## Açık Sorular

- [ ] `masterStartDate` yoksa versiyon PLANNED aşamasından çıkabilmeli mi? → Şimdilik: evet, zorunlu değil
- [ ] Aynı üründe birden fazla aktif (DEVELOPMENT aşamasında) versiyon olabilir mi? → Şimdilik: evet, kural yok

---

## Tasarım Notları (UX İçin)

**Kim, nerede, hangi ruh haliyle açar?**  
Release Manager sabah standupından önce veya haftalık planlama toplantısında açar. Kafası dolu, hızlı karar vermesi lazım. "Bu hafta kim nerede?" sorusunu soruyordur.

**Kritik bilgiler (öne çıksın):**
1. Versiyon adı + ürün adı
2. Phase (şu an nerede)
3. Gelecek milestone tarihi (testDate veya preProdDate veya targetDate — hangisi en yakın gelecekteyse)
4. İlerletme butonu (tek tıkla sonraki aşamaya)

**İkincil bilgiler (yan panel veya hover):**
- Tüm tarih detayları
- Açıklama
- createdBy

**Layout önerisi:**  
- Sol: ürün/phase filtre sidebar veya top filter bar  
- Sağ: versiyonların liste görünümü (default) veya takvim görünümü  
- Liste satırı: [Phase chip] [Ürün adı] [Versiyon] [4 milestone tarih] [İlerlet butonu] [... menü]  
- Tıklandığında sağdan drawer açılır: tarih düzenleme formu + phase geçmişi

**Takvim görünümü:**  
- Farklı renkte event tipi: masterStartDate=yeşil, testDate=sarı, preProdDate=turuncu, targetDate=mavi  
- Aynı güne birden fazla event binebilir — max 3 göster, "+N daha" ile expandable

