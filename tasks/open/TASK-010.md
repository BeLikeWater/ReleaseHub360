---
id: TASK-010
status: OPEN
type: FIX
scope: FRONTEND
ux-required: true
n8n-required: false
priority: P1
created-by: release-manager
date: 2026-03-06
---

# TASK-010: SaaS Deployment Modelinde Aksiyon Butonu Düzeltmesi

## Özet
`CustomerProductVersionsPage` bileşenindeki `ArtifactActionButton`, müşteri–ürün eşleştirmesinin `deploymentModel` bilgisini göz ardı ederek aksiyon türünü yalnızca `cpmArtifactType` ve `hostingType` üzerinden belirliyor. Bu durum **SaaS modeli**nde hatalı aksiyon butonlarının gösterilmesine yol açıyor. SaaS'ta müşteri uygulamayı host etmez; dolayısıyla deploy / indirme aksiyonu değil, yalnızca **"Güncelleme Talep Et"** aksiyonu mevcut olmalı.

## Problem / Fırsat
Bir banka SaaS olarak Appwys.io kullanıyor. Bu müşterinin aksiyon butonu "Güncelleme Onayla" (DOCKER branch'e düşüyor) olarak geliyor. Ama banka kendi sunucusunda çalışmıyor — uygulamayı biz host ediyoruz. Müşterinin yapabileceği tek şey **güncelleme talep etmek**; onay ya da indirme aksiyonu onun sorumluluğunda değil.

Mevcut karar ağacı `deploymentModel`'i hiç kullanmıyor. `cpmArtifactType === 'DOCKER'` gören her eşleşme "Güncelleme Onayla" düşüyor; SaaS/ON_PREM ayrımı yapılmıyor.

## Kullanıcı Hikayeleri
- Banka çalışanı olarak paket listesinde yalnızca "Güncelleme Talep Et" görmek istiyorum, çünkü uygulamayı biz barındırmıyoruz ve deploy etme yetkimiz yok.
- Release Manager olarak SaaS müşterilerin yanlışlıkla "Güncelleme Onayla" butonuna basmalarını engellemek istiyorum, çünkü bu API çağrısı yanlış deployment kaydı yaratabilir.

## Kabul Kriterleri (AC)
- [ ] `deploymentModel === 'SAAS'` olan tüm eşleşmelerde aksiyon butonu **"Güncelleme Talep Et"** olarak gösterilir; artifact tipi veya paket tipi ne olursa olsun.
- [ ] `deploymentModel === 'ON_PREM' && hostingType === 'IAAS'` + `HELM_CHART` paketi → **"Helm Onayla"** (mevcut davranış korunur).
- [ ] `deploymentModel === 'ON_PREM' && hostingType === 'SELF_HOSTED'` + `HELM_CHART` paketi → **"HelmChart İndir"** (mevcut davranış korunur).
- [ ] `deploymentModel === 'ON_PREM'` + `BINARY` paketi → **"Paket İndir"** (mevcut davranış korunur).
- [ ] `deploymentModel === 'ON_PREM'` + `cpmArtifactType === 'DOCKER'` → **"Güncelleme Onayla"** (mevcut davranış korunur).
- [ ] `deploymentModel === 'ON_PREM'` + `cpmArtifactType === 'GIT_SYNC'` → **"Code Sync'e Git"** (mevcut davranış korunur).
- [ ] `deploymentModel` null / tanımsız olduğunda mevcut fallback davranışı korunur (geriye dönük uyumluluk).
- [ ] TypeScript 0 hata.

## Kapsam Dışı (Out of Scope)
- Backend değişikliği yok — `deploymentModel` zaten API'dan dönüyor.
- SaaS modunda "Güncelleme Talep Et" butonunun arka plandaki `/trigger` endpoint'ini değiştirmek bu task'ta yok.
- Rol bazlı aksiyon kısıtlaması (örn. müşteri user'ı sadece talep edebilir, admin her şeyi yapabilir) bu versiyona dahil değil.

## İş Kuralları
- SaaS → müşteri sadece talep eder, deploy edemez.
- ON_PREM + IAAS → müşteri helm onayı verir, kurumun IaaS altyapısı devreye girer.
- ON_PREM + SELF_HOSTED → müşteri kendi serverında çalıştırır, chart/binary indirir.
- `deploymentModel` null ise mevcut `cpmArtifactType`-tabanlı mantık fallback olarak çalışmaya devam eder.

## Öncelik ve Etki
| Boyut | Değerlendirme |
|---|---|
| Kullanıcı etkisi | SaaS müşterilerin tümü yanlış buton görüyor |
| İş etkisi | Yanlış API çağrısı → sahte deployment kaydı riski |
| Teknik risk | Sadece frontend prop zinciri + buton karar ağacı — minimal |
| Öncelik | P1 |

## Bağımlılıklar
- `mapping?.deploymentModel` zaten `CustomerProductMapping` tipinde ve API'dan dönüyor — ek backend değişikliği yok.
- `ArtifactActionButton` prop zinciri: `VersionCard → VersionPackagesSection → ArtifactActionButton` genişletilmeli.

## Açık Sorular
- [ ] `deploymentModel` null olan eski kayıtlar için varsayılan davranış ne olmalı? → Şimdilik mevcut artifact-type-bazlı fallback yeterli.

## Tasarım Notları (UX İçin)
Senaryo matrisi `designs/screens/customer-dashboard.md`'deki TASK-009 bölümüne `deploymentModel` satırı eklenmeli. Aksiyon butonları tablosu güncellenmeli.

## Handoff Notları
(Developer doldurur)

## RM Handoff — 2026-03-06
- Scope kararı: FRONTEND
- ux-required: true
- n8n-required: false
- Öncelik: P1
- Sıradaki rol: ux-designer
- RM Review bekleniyor: Hayır (akışkan mod)
