---
id: TASK-009
status: OPEN
type: FEATURE
scope: FULLSTACK
ux-required: true
n8n-required: false
priority: P1
created-by: release-manager
date: 2026-03-06
---

# TASK-009: ON_PREM + IaaS Helm Chart Onaylama Akışı

## Özet
Müşteri-ürün eşleştirmesi `deploymentModel: ON_PREM` ve `hostingType: IAAS` olarak yapılandırıldığında, müşteri portalındaki "Paketler" bölümünde Helm Chart için "İndir" butonu yerine "Helm Onayla" butonu gösterilmeli. Müşteri onayladığında kurumun IaaS tarafındaki Helm repo'su güncellenmiş kabul edilmeli ve approval log kaydı + bildirim oluşturulmalı.

## Problem / Fırsat
Şu an her türlü HELM_CHART paketi için "HelmChart İndir" butonu gösteriliyor. Ancak:
- **SELF_HOSTED** müşteri: kendi Kubernetes cluster'ını yönetir → Helm Chart'ı indirip kendi uygular → "İndir" butonu doğru
- **IaaS** müşteri: Helm Chart'ı kurum (Teknoser vb.) yönetir → müşteri cluster'a erişemez, chart'ı indiremez → sadece "onaylayabilirim, uygula" diyebilir

IaaS müşterilere download butonu göstermek hem semantik olarak yanlış hem de işlevsel olarak anlamsız (chart'ı uygulayacak yetkiye sahip değiller). Doğru akış: müşteri versiyonu onaylar → kurum tarafı onayı görür ve helm repo'yu günceller.

## Kullanıcı Hikayeleri
- **IaaS müşteri yöneticisi** olarak, yeni versiyon paketini onaylayabilmek istiyorum; çünkü bu onay kurumun Helm repo'sunu güncelleme adımını tetikleyecek ve bizim açımızdan resmi kabul anlamına geliyor.
- **Release Manager (kurum)** olarak, hangi müşterinin hangi versiyonu ne zaman onayladığını görmek istiyorum; çünkü bunu IaaS tarafı repo güncellemesi için tetikleyici olarak kullanıyorum.

## Kabul Kriterleri (AC)
- [ ] AC-1: `deploymentModel: ON_PREM` AND `hostingType: IAAS` olan eşleştirmedeki HELM_CHART paketi için "HelmChart İndir" butonu gösterilmez; yerine "Helm Onayla" butonu gösterilir
- [ ] AC-2: "Helm Onayla" butonuna tıklandığında onay dialog'u açılır: ortam bilgisi (environment) + isteğe bağlı yorum alanı
- [ ] AC-3: Onay gönderildiğinde `POST /api/customer-deployments/approve` çağrılır; body: `{ customerProductMappingId, environment, comment? }`
- [ ] AC-4: Backend, `deploymentModel: ON_PREM` + `hostingType: IAAS` kombinasyonu için `approvalLog` kaydı oluşturur; metadata'ya `hostingType: IAAS` dahil edilir
- [ ] AC-5: Onay sonrası bir `Notification` (kurum RM'e) oluşturulur: "Müşteri X, Ürün Y v1.2.3 IaaS Helm onayı verdi"
- [ ] AC-6: Frontend'de onay başarılıysa Snackbar mesajı: "Onay gönderildi. Kurum ekibi bilgilendirildi."
- [ ] AC-7: `deploymentModel: ON_PREM` + `hostingType: SELF_HOSTED` durumda HELM_CHART paketi için mevcut "HelmChart İndir" butonu çalışmaya devam eder (regression yok)
- [ ] AC-8: SAAS mapping'de paketler bölümünde herhangi bir HELM_CHART varsa mevcut davranış korunur (regression yok)

## Kapsam Dışı (Out of Scope)
- Helm repo'ya gerçek push / Git commit operasyonu (bu Faz 2 — şimdilik approval log + notification yeterli)
- n8n ile helm repo sync workflow'u (sonraki sprint)
- Approval history listelemesi (UI'da) — sadece backend'de log mevcut

## İş Kuralları
- `ON_PREM + IAAS` → "Helm Onayla" butonu
- `ON_PREM + SELF_HOSTED` → "HelmChart İndir" butonu (mevcut davranış)
- `SAAS` → mevcut davranış korunur
- Onay sadece `CUSTOMER_ADMIN` ve `CUSTOMER_USER` rolleri tarafından yapılabilir
- Aynı mapping+environment için birden fazla onay verilebilir (her yeni versiyon için tekrar onay alınır)
- Backend'deki `/approve` endpoint'i şu an sadece `ON_PREM` kontrolü yapıyor; `IAAS` specific metadata eklenmeli

## Öncelik ve Etki
| Boyut | Değerlendirme |
|---|---|
| Kullanıcı etkisi | IaaS hosting kullanan müşterilerin tüm Helm Chart akışı |
| İş etkisi | Müşteri onayı kurumun Helm repo güncelleme sinyali — kritik iş akışı |
| Teknik risk | Düşük — sadece frontend button logic + backend metadata zenginleştirme |
| Öncelik | P1 |

## Bağımlılıklar
- Backend: `POST /api/customer-deployments/approve` endpoint mevcut — metadata'ya `hostingType` eklenmeli
- Frontend: `CustomerProductVersionsPage.tsx` → `VersionCard` → `VersionPackagesSection` → `ArtifactActionButton` prop zinciri: `hostingType` + `mappingId` eklenmeli
- Veri: `customer-product-mappings` API zaten `hostingType` ve `id` döndürüyor

## Açık Sorular
- [ ] IaaS Helm repo URL'si `CustomerProductMapping.helmRepoUrl` alanından mı çekiliyor? → Backend ekibi doğrulayacak

## Tasarım Notları (UX İçin)
- Ekran: `customers/:customerId/products/:productId` — `CustomerProductVersionsPage.tsx`
- "Paketler" accordion içinde, HELM_CHART satırı
- IaaS iken: mor/warning renk tonuyla "Helm Onayla" butonu — kullanıcı "imzalıyorum" hissini almalı
- Dialog minimal: environment dropdown (varsa CPM'deki environment) + textarea (yorum, isteğe bağlı) + İptal/Onayla butonları
- Onay sonrası satırda küçük bir "onaylandı" chip gösterilebilir (son onay tarihi)

## Handoff Notları
(Tamamlayan developer doldurur)

## RM Handoff — 2026-03-06
- Scope kararı: FULLSTACK
- ux-required: true
- n8n-required: false
- Öncelik: P1
- Sıradaki rol: ux-designer
- RM Review bekleniyor: Hayır (akışkan mod)
