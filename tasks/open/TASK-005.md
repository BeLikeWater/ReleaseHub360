---
id: TASK-005
status: OPEN
type: REFACTOR
scope: FULLSTACK
ux-required: true
n8n-required: false
priority: P1
created-by: release-manager
date: 2026-03-03
---

# TASK-005: Customer Dashboard — Hiyerarşik UX Yeniden Tasarımı

## Özet
Müşteri Dashboard'undaki tab-tabanlı yapı, müşterilerin ürün bazlı aksiyonlara ulaşmasını zorlaştırıyor. Tüm ürünler için ortak tablar yerine: (1) ürün kartlarından oluşan bir overview sayfası, (2) ürün bazlı versiyon geçmişi için ayrı bir ekran, (3) her versiyona özel inline aksiyonlar (release notları, geçiş planı, todo listesi, sorun bildirme) getirilecek.

## Problem / Fırsat
Mevcut dashboard tasarımı:
- "Release Takibi", "Servis Eşleştirme", "Yapılacaklar", "Sorunlarım" gibi global tablar tüm ürünleri aynı bağlamda karıştırıyor
- Kullanıcı "Cofins BFF için geçiş planı" gibi ürün+versiyon bağlarında işlem yapmak istiyor ama hangi tabda olduğunu kaybediyor
- Versiyon geçmişi tab içinde küçük bir bileşen olarak sıkışmış; yeni bir ekran olması gerekiyor
- Mevcut aksiyon butonları (onay, geçiş planı, release notları) hangi versiyona ait olduğu belirsiz satırlarda sunuluyor

## Kullanıcı Hikayeleri
- Müşteri kullanıcısı olarak sahip olduğum ürünleri ve mevcut–güncel versiyon farklarını tek bakışta görmek istiyorum, çünkü önce hangi ürünün güncellenmesi gerektiğini anlamam lazım.
- Müşteri kullanıcısı olarak bir ürüne tıklayarak o ürünün versiyon tarihçesini yeni bir ekranda görmek istiyorum, çünkü hangi versiyondan hangisine geçtiğimi zaman çizelgesiyle takip etmem gerekiyor.
- Müşteri kullanıcısı olarak her versiyona özel olarak release notlarını okumak, geçiş planımı görmek, yapılacaklarımı işaretlemek ve sorun bildirmek istiyorum, çünkü bu aksiyonlar versiyona özel bağlamda yapılmalı.

## Kabul Kriterleri (AC)

### Dashboard (`/customers/:id`)
- [ ] Sekme (Tab) yapısı kaldırılır; yerini ürün kartları alır
- [ ] Her ürün kartında: ürün adı, mevcut versiyon (müşteri → CPM.currentVersionId), en son versiyon (ürünün son release'i), güncelleme gerekip gerekmediği (chip rengiyle)
- [ ] Güncelleme gerekiyorsa kart üzerinde belirgin `⚠️ Güncelleme Gerekiyor` badge'i gösterilir
- [ ] "Versiyonları Gör →" butonu yeni ekrana (`/customers/:id/products/:productId`) yönlendirir
- [ ] Üstte özet istatistik çubuğu: toplam ürün, güncelleme bekleyen sayısı, açık sorun sayısı
- [ ] Servis eşleştirmeleri dashboard'un altında collapsible bölüm olarak kalır

### Versiyon Geçmişi Sayfası — YENİ EKRAN (`/customers/:id/products/:productId`)
- [ ] Breadcrumb: `Müşteri Yönetimi → [Müşteri Adı] → [Ürün Adı]`
- [ ] Sayfanın başında: ürün adı, müşterinin mevcut versiyonu chip olarak, en son (güncel) versiyon chip olarak
- [ ] Versiyon listesi: en yeni üstte, kronolojik aşağı doğru
- [ ] Her versiyon satırı/kartında: versiyon numarası, faz (beta/rc/production), relase tarihi, "MEVCUT" / "YENİ" / "GEÇMİŞ" etiketleri
- [ ] Her versiyon için inline aksiyon butonları:
  - `📋 Release Notları` → CustomerReleaseNoteDrawer açar
  - `📅 Geçiş Planı` → TransitionPlanDialog açar (sadece mevcut ve üzeri versiyonlarda)
  - `✅ Yapılacaklar` → TodoDrawer açar
  - `🐛 Sorun Bildir` → IssueDialog açar
- [ ] Mevcut versiyon satırı görsel olarak vurgulanmış (sol kenarda renkli bar veya background)
- [ ] Geçmişte kalan versiyonlar soluk/disabled aksiyonlarla listelenir

## Kapsam Dışı (Out of Scope)
- Servis eşleştirme CRUD işlemleri (salt okunur, dashboard'a taşınacak)
- Release calendar sayfası ayrı ekran olduğu için burada kaldırılacak — link ile erişilecek
- Müşteri bilgilerini düzenleme ekranı bu sprint değil
- Push notification / e-posta entegrasyonu

## İş Kuralları
- Mevcut versiyon: `CustomerProductMapping.currentVersionId` alanından gelir
- En son versiyon: o ürüne ait `production` fazındaki en yeni `ProductVersion`
- Versiyonlar tarih sıralı listelenir; faz = production olan versiyonlar gösterilir (beta/rc opsiyonel toggle)
- Geçiş Planı butonu: hedef versiyon müşterinin mevcut versiyonundan büyükse aktif
- Yapılacaklar: her versiyona ait `ReleaseTodo` + `CustomerTodoCompletion` ikili kayıtları
- Sorun Bildir: `TransitionIssue` tablosuna yazar, `productVersionId` versiyona referans verir

## Öncelik ve Etki
| Boyut | Değerlendirme |
|---|---|
| Kullanıcı etkisi | Tüm müşteri kullanıcıları (customer role) her giriş yapışında görür |
| İş etkisi | UX karmaşası müşteri onboarding'i yavaşlatıyor; düzeltme NPS'i artırır |
| Teknik risk | Yeni route ekleniyor, mevcut bileşenler taşınıyor — DB değişikliği yok |
| Öncelik | P1 |

## Bağımlılıklar
- Backend: mevcut endpoint'ler yeterli (`/customer-product-mappings`, `/product-versions`, `/release-notes/by-version`, `/customer-todo-completions`, `/transition-issues`, `/customer-version-transitions`) — yeni endpoint gerekmeyebilir
- `CustomerTodoList`, `CustomerReleaseNoteDrawer`, `TransitionPlanDialog` bileşenleri TASK-004'te yazıldı — yeni sayfada yeniden kullanılacak
- Route: `App.tsx`'e yeni `/customers/:id/products/:productId` route eklenmeli

## Açık Sorular
- [ ] Servis eşleştirmeleri tamamen dashboard altına mı taşınsın yoksa product card'dan da erişilsin mi? → PM kararı

## Tasarım Notları (UX İçin)
- Müşteri bu dashboarda sabah standuptan önce veya deployment öncesi girer — hızlı orientasyon gerekir
- "Kaç ürününde güncelleme var?" sorusu 3 saniyede cevaplanmalı
- Versiyon geçmişi sayfası bir "zaman tüneli" gibi hissettirmeli — en yeni üstte
- Aksiyonlar (release notları, geçiş planı) versiyonun yanında görünüyor olmalı — kullanıcı bağlam değiştirmiyor

## Handoff Notları
(Frontend developer doldurur)

---

## RM Handoff — 2026-03-03
- Scope kararı: FULLSTACK (minimal backend, ağırlıklı FRONTEND)
- ux-required: true
- n8n-required: false
- Öncelik: P1
- Sıradaki rol: ux-designer
- RM Review bekleniyor: Hayır (akışkan mod)
