---
id: TASK-006
status: DONE
type: FEATURE
scope: FULLSTACK
ux-required: true
n8n-required: false
priority: P1
created-by: release-manager
date: 2026-03-03
completed-date: 2026-03-03
---

# TASK-006: Müşteri Portalı — İkinci Tur UX İyileştirmeleri

## Özet
TASK-005 ile oluşturulan müşteri portalının (CustomerDashboardPage + CustomerProductVersionsPage) ikinci tur iyileştirmeleri. Müşteri kullanıcısı test edildi, birden fazla UX boşluğu tespit edildi: bildirilen sorunların statü takibi yok, release notes drawer hatalı, değişiklik listesi placeholder eksik, servis eşleştirmeleri anlaşılır değil, geçiş planı neden görünmüyor netlik yok.

## Problem / Fırsat

Müşteri kullanıcısı olarak giriş yapınca:
1. **Bildirilen sorunlar görüntülenemiyor** — Sorun bildirildi ama nerede olduğunu göremiyorum. Statü (açık/devam ediyor/çözüldü) bilgisi yok.
2. **Hangi serviste sorun olduğu girilemiyor** — Issue formu title+description+priority'den oluşuyor; hangi servisin/modülün etkilendiğini yazabilmek için alan yok. *(TASK-006 kapsamında fixlendi — artık "Etkilenen Servis / Modül" alanı var)*
3. **Release notes sayfası hata** — "by-version" endpoint'inde CPM erişim kontrolü eski CPM'lerde (productId=null) 403 veriyor. *(TASK-006 kapsamında fixlendi)*
4. **Değişiklik listesi yok** — TASK-005'te planlandı, placeholder oluşturulması gerekiyor. Şu an data yok ama alanı hazır olmalı.
5. **Servis eşleştirmeleri ne işe yarıyor?** — Dashboard'daki ServicesAccordion kullanıcıya bir anlam ifade etmiyor. Ya açıklanmalı ya da kaldırılmalı.
6. **Geçiş planı neden görünmüyor?** — "YENİ" statülü (currentVersionId'den daha yeni) versiyon olmadan buton gelmez. Müşteri bunu anlamiyor.
7. **Yeni versiyon oluşturma hatası (ReleasesPage)** — `targetDate` sadece YYYY-MM-DD formatında gönderiliyor ama backend Zod validasyonu ISO datetime bekliyor. 422 hatası fırlatıyor, frontend'de hata mesajı yok. *(TASK-006 kapsamında fixlendi)*

## Kullanıcı Hikayeleri

- Müşteri kullanıcısı olarak bildirdiğim sorunların listesini görmek istiyorum, çünkü hangi sorunlarımın çözüldüğünü takip etmem gerekiyor.
- Müşteri kullanıcısı olarak sorun bildirirken etkilenen servisi/modülü belirtmek istiyorum, çünkü destek ekibinin daha hızlı triaj yapabilmesi için bağlamı vermem gerekiyor.
- Müşteri kullanıcısı olarak geçiş planının neden görünmediğini anlamak istiyorum, çünkü şu an bu özelliği hiç kullanamıyorum.
- Release Manager olarak müşterinin gördüğü değişiklik listesini bir yerde tutmak istiyorum, çünkü müşteri hangi değişikliklerin kendi sürümüne geldiğini bilmeli.

## Kabul Kriterleri (AC)

### AC-1: Issue Statü Listesi (CustomerProductVersionsPage)
- [x] Versiyonlar listesinin altında "Bildirilen Sorunlar" accordionu var *(fixlendi — TASK-006'da implemente edildi)*
- [ ] Her sorunun kartında/satırında şu bilgiler görünür: Başlık, Servis, Statü chip (açık=kırmızı / devam=mavi / çözüldü=yeşil / kapatıldı=gri), Öncelik, Versiyon, Tarih
- [ ] Statü sadece görüntüleme amaçlı — müşteri statü değiştiremez (sadece RM/destek değiştirir)

### AC-2: Servis Eşleştirmeleri — Kaldır veya İyileştir (CustomerDashboardPage)
- [x] ServicesAccordion kaldırıldı — müşteriye teknik veri (serviceId UUID, port) göstermek anlamsız; gerçek servis bilgisi CustomerProductVersionsPage'deki VersionCard > Servisler bölümünde gösteriliyor

### AC-3: Değişiklik Listesi Placeholder (CustomerProductVersionsPage)
- [x] Her versiyon kartında "Değişiklikler" toggle butonu var (ChangeHistoryIcon)
- [x] Data yokken: "Bu versiyona ait değişiklik kaydı henüz girilmemiş" boş state mesajı gösterilir
- [x] Data varsa: `SystemChange` modeli verisi listelenir — breaking değişiklikler kırmızı arka plan + ⚠️ BREAKING chip

### AC-4: Geçiş Planı — Görünürlük İpucu
- [x] Müşteri en güncel versiyondaysa (newer versiyon yok) → Info Alert: "✅ En güncel sürümdesiniz. Yeni bir sürüm yayınlandığında geçiş planı oluşturabilirsiniz."
- [x] Newer versiyon varsa → "Geçiş Planı" butonu `contained color="warning"` (önceki oturumda uygulandı)

### AC-5: Release Notes — Müşteri Dostu Tasarım
- [x] Kategoriler emoji ikonlu etiketlere dönüştürüldü (✨ FEATURE, 🐛 BUG, 🔒 SECURITY, ⚠️ BREAKING, ⚡ PERFORMANCE, 🗑️ DEPRECATED)
- [x] Breaking change varsa drawer içeriğinin başında ⚠️ warning Alert banneri görünür

## Kapsam Dışı (Out of Scope)
- Müşterinin kendi issue statüsünü değiştirmesi (sadece RM/destek yapar)
- Issue yorumlama (comment) sistemi
- Release notes düzenleme (admin görevi)
- Push notification sistemi

## İş Kuralları
- Müşteri yalnızca kendi customerId'sine ait sorunları görür
- Değişiklik listesi sadece `product_systems_changes` tablosundaki `productVersionId` eşleşen kayıtları gösterir
- Geçiş planı: `newer` statülü versiyon = `sortedVersions` içinde currentVersionId'den daha küçük index'te olan versiyon

## Öncelik ve Etki
| Boyut | Değerlendirme |
|---|---|
| Kullanıcı etkisi | Her müşteri kullanıcısı — günlük kullanım |
| İş etkisi | Müşteri self-service artarsa destek yükü azalır |
| Teknik risk | Düşük — mevcut bileşenler ve endpoint'ler var |
| Öncelik | P1 |

## Bağımlılıklar
- Backend: `/api/system-changes?versionId=` endpoint'i mevcut
- Backend: `/api/transition-issues/my` endpoint'i mevcut
- Frontend: `CustomerProductVersionsPage.tsx` üzerinden tüm değişiklikler

## Açık Sorular
- [ ] AC-5 için drawer mı yeterli, yoksa ayrı sayfa mı? → UX'e bırakılıyor
- [ ] ServicesAccordion kaldırılacak mı, iyileştirilecek mi? → RM kararı

## Tasarım Notları (UX İçin)
Müşteri bu ekrana sorun bildiriminden sonra döner ve "sorunum ne durumda?" diye bakar. Statuslar görsel ve net olmalı. Çözülmüş sorunlar arşivlenmeli veya en alta sıralanmalı. Geçiş planı butonu: yeni versiyon gelince çarpıcı şekilde vurgulanmalı — "Yeni version çıktı, geçiş için tıkla" sensasyonu.

## Handoff Notları
*(Frontend Developer dolduracak)*

## RM Handoff — 2026-03-03
- Scope kararı: FULLSTACK (ağırlıklı FRONTEND — backend endpoint'ler mevcut)
- ux-required: true
- n8n-required: false
- Öncelik: P1
- Sıradaki rol: ux-designer (AC-4 ve AC-5 için wireframe), sonra frontend-developer
- RM Review bekleniyor: Evet (UX çıktısından sonra)

### Bu oturumda fixlenen bug'lar (TASK-006 öncesi yapıldı):
1. ✅ **Release notes 403** (`releaseNotes.routes.ts`) — CPM OR koşuluyla eski kayıtlar da bulunuyor
2. ✅ **Versiyon oluşturma hatası** (`ReleasesPage.tsx`) — targetDate ISO'ya çevriliyor, hata mesajı eklendi
3. ✅ **Issue servis alanı** (`CustomerProductVersionsPage.tsx`) — "Etkilenen Servis / Modül" text field eklendi
4. ✅ **Bildirilen sorunlar listesi** (`CustomerProductVersionsPage.tsx`) — Accordion section eklendi (statü chip'leri ile)
