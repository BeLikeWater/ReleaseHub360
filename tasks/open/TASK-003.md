---
id: TASK-003
status: OPEN
type: FEATURE
scope: FULLSTACK
ux-required: true
n8n-required: false
priority: P1
created-by: release-manager
date: 2026-03-02
---

# TASK-003: Servis Prod/Prep Release Bilgisi Takibi

## Özet

Her servis için son **prod** release adı + tarihi (saat dahil) ve son **prep** release adı + tarihi ayrı ayrı saklanır. Prod bilgileri Ürün Kataloğu'ndaki servis düzenleme ekranında elle ya da setup sırasında girilir. Prep bilgileri ise Health Check ekranındaki BoM tablosunda servis başına "Refresh" butonu ile Azure'dan çekilerek anlık güncellenir.

## Problem / Fırsat

Şu an `lastProdReleaseName` alanı var ancak saati yok. Prep için hiç kalıcı alan yok — her Health Check açılışında Azure'a canlı istek atılıyor. Bu iki soruna yol açıyor:
1. Prod release'in **ne zaman** çıktığı bilinemediği için SLA takibi impossible.
2. Prep bilgisi her açılışta yükleniyor → kullanıcı "prep ortamında ne var?" sorusunu yapay yavaşlık olmadan yanıtlayamıyor.

## Kullanıcı Hikayeleri

- Release Manager olarak her servisin prod'a en son **ne zaman** çıktığını saat hassasiyetiyle görmek istiyorum, çünkü SLA ihlali analizini bunu bilmeden yapamıyorum.
- Release Manager olarak prep ortamındaki son release'i sayfayı her açışımda yükleme beklemeden görmek istiyorum; istediğimde "Yenile" diyerek güncelleyebilmeliyim.
- Ekip lideri olarak servis tanımı sırasında mevcut prod sürümünü hızlıca girebilmek istiyorum çünkü ilk kurulumda Azure henüz bağlı olmayabilir.

## Kabul Kriterleri (AC)

### Veri Modeli
- [ ] `services` tablosuna `lastPrepReleaseName (String?)` ve `lastPrepReleaseDate (DateTime?)` eklenir
- [ ] `lastProdReleaseDate` zaten var; görüntülemede saat+dakika formatında gösterilir (yeni alan eklenmez, mevcut kullanılır)

### Ürün Kataloğu — Servis Düzenleme Ekranı
- [ ] Servis formu "Release Bilgileri" başlıklı yeni section içerir
- [ ] Bu section'da 4 alan gösterilir: Son Prod Release, Son Prod Release Tarihi, Son Prep Release, Son Prep Release Tarihi
- [ ] Son Prod Release + Tarihi düzenlenebilir text/datetime input'tur (kullanıcı elle girebilir)
- [ ] Son Prep Release + Tarihi read-only gösterilir (salt okunur — elle girilmez)
- [ ] Kaydet butonunda `lastProdReleaseName` + `lastProdReleaseDate` API'ye yazılır; prep alanları payload'a dahil edilmez
- [ ] `lastProdReleaseDate` input `datetime-local` tipinde olup saat+dakika girilmesine imkân tanır

### Health Check — BoM Tablosu
- [ ] "Son Release" kolonunun yanında "Son Release Tarihi" (saat+dakika formatında) kolonu eklenir
- [ ] Her servis satırının sonuna 🔄 ikon butonu eklenir ("Prep Release'i Güncelle")
- [ ] Butona tıklandığında: o servis için `GET /api/tfs/last-prep-releases?productId=X&serviceId=Y` çağrısı yapılır (veya mevcut productId endpoint'i ile), dönen `lastPrepReleaseName` + `lastPrepReleaseDate` DB'ye yazılır (`PATCH /api/services/:id`)
- [ ] Yükleme sırasında buton spinner gösterir, çift tıklamayı önler
- [ ] Başarı durumunda tablo satırı anlık güncellenir (optimistic update veya query invalidation)
- [ ] Hata durumunda servis satırında inline `Alert` gösterilir
- [ ] "Tümünü Yenile" butonu (section header) tüm servisleri sırayla veya paralel günceller

### Prep Fetch Mantığı (değişmedi)
- `prepStageName` dolu → Azure VSRM'de o stage'in `succeeded` durumundaki en son release + onun tarihi
- `prepStageName` boş → Azure VSRM'de en son tetiklenen release (`$top=1`) + onun tarihi
- `releaseName` boş → servis atlanır

## Kapsam Dışı (Out of Scope)
- Prod release bilgisinin otomatik Azure'dan çekilmesi (manual entry yeterli — prod zaten snapshot sırasında kaydedilecek)
- Health Check BoM tablosunun prod refresh yapması (prod için ayrı akış var: Release Onayla → snapshot)
- Servis bazlı PAT/project override — mevcut `releaseProject` mantığı devam eder

## İş Kuralları
- Prep alanları **sadece** backend PATCH ile güncellenir; form kullanıcısı bu alanları değiştiremez
- `lastProdReleaseDate` `null` gelirse input boş gösterilir, kaydet basılırsa `null` yazılır (alanı temizleme imkânı)
- `lastPrepReleaseDate` tablo satırında "—" gösterir eğer null ise
- Tek servis refresh'i başarısız olursa diğer servisler etkilenmez; "Tümünü Yenile" hataları toplar

## Öncelik ve Etki
| Boyut | Değerlendirme |
|---|---|
| Kullanıcı etkisi | Health Check ekranını kullanan tüm RM'ler — core iş akışı |
| İş etkisi | SLA takibi + prep durumu hızlı görme → karar kalitesi artar |
| Teknik risk | Düşük — ek 2 kolon migration, mevcut logic aynı kalıyor |
| Öncelik | P1 |

## Bağımlılıklar
- Backend: `services` tablosuna migration + `GET /api/tfs/last-prep-releases` servise tarih dönsün + `PATCH /api/services/:id` mevcut (prep alanları eklenmeli)
- Frontend: `ProductCatalogPage` servis formu + `ReleaseHealthCheckPage` BoM tablo
- Azure VSRM: `release/releases` response'undan `createdOn` alanı alınacak

## Açık Sorular
- [ ] `last-prep-releases` endpoint'i hem `lastPrepReleaseName` hem `lastPrepReleaseDate` dönsün mu, yoksa frontend DB'ye yazarken tarihi release adından mı türetsin? → **API'nin date döndürmesi doğru yol**, o tercih edilmeli.

## Tasarım Notları (UX İçin)
- Servis formu zaten var; yeni "Release Bilgileri" section bölümü açık/kapalı olabilir ama varsayılan açık
- Prep alanlarını gri/disabled input olarak değil, düz `Typography` ile göster — yanıltıcı olmasın
- BoM tablosunda 🔄 buton ikonunun boyutu küçük tutulsun, satırı büyütmesin
- "Tümünü Yenile" section-header'da mevcut "Refresh" buton yanına taşınabilir

## RM Handoff — 2026-03-02
- Scope kararı: FULLSTACK
- ux-required: true
- n8n-required: false
- Öncelik: P1
- Sıradaki rol: ux-designer → backend-developer → frontend-developer
- RM Review bekleniyor: Hayır (akışkan mod)
