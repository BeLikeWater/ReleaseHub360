---
id: TASK-011
status: OPEN
type: FEATURE
scope: FULLSTACK
ux-required: true
n8n-required: false
priority: P1
created-by: release-manager
date: 2026-03-06
---

# TASK-011: Release Onayında Otomatik Paket Üretimi + Müşteri Tarafı Paket Filtresi

## Özet
Release Health Check ekranındaki "Release Onayla" wizardında kullanıcıdan manuel paket tipi seçmesi isteniyor. Bu gereksiz bir adım: ürünün `supportedArtifactTypes` alanında hangi artifact tiplerini desteklediği zaten tanımlı. Sistem bunu kendi bilmeli ve her artifact tipi için otomatik paket oluşturmalı. Ayrıca müşteri dashboard'unda paketler listesi müşterinin CPM artifact tipiyle eşleşmeyen paketleri de gösteriyor — müşteri sadece kendi ilgili paketini görmeli.

## Problem / Fırsat
**Problem 1 — Manuel paket seçimi (Release Manager acısı):**
Wizard'ın "Paket Oluştur" adımında RM, ürün konfigürasyonunda zaten var olan bilgiyi tekrar giriyor. Bu hem hata üretir (yanlış tip seçilir) hem zaman kaybıdır. Ürün `supportedArtifactTypes: ['DOCKER', 'BINARY']` tanımlıysa sistem zaten ne tür paket oluşturacağını bilmeli.

**Problem 2 — Aşırı paket görünümü (Müşteri acısı):**
SaaS DOCKER müşteriyle eşleştirilmiş bir ürünün versiyonu hem HELM_CHART hem BINARY paket içerebilir. Müşteri tüm paketleri görüyor — ama kendi artifact tipiyle eşleşen tek paketi kullanabilir, diğerleri anlamsız gürültü.

## Kullanıcı Hikayeleri
- Release Manager olarak "Release Onayla" dediğimde ürünün hangi artifact tiplerini desteklediğini sistem bildiği için bana tekrar sormamalarını istiyorum, çünkü aynı bilgiyi iki kez girmek hem zaman kaybı hem hata riski.
- Banka çalışanı olarak paketler sekmesinde sadece benim kullandığım artifact tipine ait paketi görmek istiyorum, çünkü ilgisiz paketler kafa karıştırıyor.

## Kabul Kriterleri (AC)
- [ ] Release Health Check → "Release Onayla" dialog'unda "Paket Oluştur" adımı (Step 1) kaldırılır; wizard 2 adıma düşer: "Son Kontrol" → "Yayınla".
- [ ] Backend `/product-versions/:id/release` endpoint'i: request body'de `versionPackages` gelmese de `Product.supportedArtifactTypes` okunarak her tip için otomatik paket oluşturulur.
  - `DOCKER` → `DOCKER_IMAGE` tipi paket
  - `BINARY` → `BINARY` tipi paket
  - `GIT_SYNC` → `GIT_ARCHIVE` tipi paket
  - `DOCKER` + `ON_PREM` stratejisi mevcut ürün konfigürasyonuna göre ayrıca `HELM_CHART` eklenebilir (opsiyonel, out-of-scope bu versiyonda)
- [ ] Paket adı otomatik üretilir: `{productSlug}-{version}` formatında (ör: `appwys-io-v1.1.0`).
- [ ] Eğer versiyon için paket zaten varsa (yeniden yayınlama senaryosu) aynı tipte ikinci paket oluşturulmaz.
- [ ] `CustomerProductVersionsPage` → Paketler sekmesinde yalnızca müşterinin `CPM.artifactType`'ına uygun paketler gösterilir:
  - `CPM.artifactType === 'DOCKER'` → `DOCKER_IMAGE` paketleri gösterilir
  - `CPM.artifactType === 'BINARY'` → `BINARY` paketleri gösterilir
  - `CPM.artifactType === 'GIT_SYNC'` → `GIT_ARCHIVE` paketleri gösterilir
  - `CPM.artifactType === null` veya eşleşme yoksa tüm paketler gösterilir (fallback)
  - `deploymentModel === 'ON_PREM' && hostingType === 'IAAS'` ise `HELM_CHART` paketleri de gösterilir
- [ ] Filtre sonucunda 0 paket kalırsa "Bu versiyon için eşleşen paket yok" boş state gösterilir.
- [ ] TypeScript 0 hata.

## Kapsam Dışı (Out of Scope)
- HELM_CHART paketinin otomatik oluşturulması (ayrı task — hosting type context gerekiyor)
- Artifact URL'in otomatik doldurulması (pipeline entegrasyonu gelecekte)
- Fazla paket görünümü admin ekranında (admin tümünü görmeye devam eder)

## İş Kuralları
- Otomatik paket ismi: `{product.name.toLowerCase().replace(/\s+/g, '-')}-{version}` (ör: `ethix-ng-v1.1.0`)
- Müşteri filtresi istemci tarafında (frontend) uygulanır — API ek endpoint gerektirmez
- `CPM.artifactType` null ise filtre uygulanmaz; tüm paketler gösterilir

## Öncelik ve Etki
| Boyut | Değerlendirme |
|---|---|
| Kullanıcı etkisi | Her release onayında RM vakit kaybediyor |
| İş etkisi | Hatalı paket tipi seçimini önler; müşteri UX'ini temizler |
| Teknik risk | Backend ufak değişiklik; frontend filtre eklemesi |
| Öncelik | P1 |

## Bağımlılıklar
- `Product.supportedArtifactTypes[]` verisi `/release` endpoint'inde `productVersion.product` include'u ile erişilebilir
- `VersionPackage` modeli mevcut — yeni alan gerekmez
- `CPM.artifactType` frontend'e zaten prop zinciriyle geliyor (TASK-009/010 ile eklendi)

## Açık Sorular
- [ ] DOCKER artifact'ı hem `DOCKER_IMAGE` hem `HELM_CHART` üretmeli mi? → Bu versiyonda hayır; HELM_CHART ayrı task.

## Tasarım Notları (UX İçin)
"Paket Oluştur" adımı wizard'dan çıkıyor. Yayınla adımında şu bilgi eklenebilir:
`"{N} paket otomatik oluşturulacak: Docker Image, Binary"` — kullanıcıyı ne olduğu konusunda bilgilendir.

## Handoff Notları
(Developer doldurur)

## RM Handoff — 2026-03-06
- Scope kararı: FULLSTACK
- ux-required: true
- n8n-required: false
- Öncelik: P1
- Sıradaki rol: ux-designer → backend-developer → frontend-developer
- RM Review bekleniyor: Hayır (akışkan mod)
