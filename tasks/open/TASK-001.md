---
id: TASK-001
status: OPEN
type: FEATURE
scope: FULLSTACK
ux-required: true
n8n-required: false
priority: P1
created-by: release-manager
date: 2026-03-02
---

# TASK-001: Servis Bazlı Release Project Overrideı

## Özet
Azure DevOps'ta bir servisin release pipeline'ı, kod repository'sinin bulunduğu project'ten farklı bir project'te tanımlı olabilir. Şu an bu bilgi yalnızca ürün seviyesinde (`azureReleaseProject`) tutulabilmekte; ancak aynı ürün içindeki farklı servisler farklı projelerdeki release pipeline'larını kullanabilmektedir. Servis tanımının "Stage & Pipeline" sekmesine **"Release ayrı project'tedir"** checkbox'ı ve koşullu olarak görünen **Release Project** text alanı eklenerek bu eksiklik giderilecektir.

## Problem / Fırsat
Gerçek dünyada bir ürüne ait servisler birden fazla Azure DevOps project'i kullanabilir. Örneğin repo `ProductAndDelivery` project'inde olabilirken Classic Release pipeline'ı `SharedReleases` project'inde tanımlanmış olabilir. Şu anki yapı bu senaryoyu servis seviyesinde desteklememekte; servis bazlı release takibi yapılamamaktadır. Öte yandan ürün seviyesinde `azureReleaseProject` alanı tek değer aldığı için mixed proje konfigürasyonlarını karşılayamamaktadır.

## Kullanıcı Hikayeleri
- Release Manager olarak bir servisi tanımlarken, release pipeline'ının farklı bir Azure DevOps project'inde olduğunu belirtebilmek istiyorum, çünkü Azure Baseline ve Release Health Check işlemleri doğru project'e istek göndermeli.
- Geliştirici olarak servis düzenleme formunda checkbox işaretleyince yeni alan görünmesini istiyorum, çünkü her servisin konfigürasyonu farklı ve tek tek kontrol edilebilir olmalı.

## Kabul Kriterleri (AC)
- [ ] Servis düzenleme formu "Stage & Pipeline" sekmesinde **"Release ayrı project'tedir"** Toggle/Checkbox bulunur
- [ ] Checkbox işaretlendiğinde, hemen altında **"Release Project"** text alanı görünür (işaretsizken gizli)
- [ ] Checkbox işaretsizken Release Project alanına veri girilmiş olsa bile kayıt sırasında `null` gönderilir
- [ ] `PUT /api/services/:id` endpoint'i `releaseProject` alanını kabul edip kaydeder
- [ ] `GET /api/services` ve `GET /api/products/:id` (with services) response'larında `releaseProject` döner
- [ ] Servis kartında (ServiceRow) `releaseProject` değeri dolu ise küçük bir badge/chip ile gösterilir
- [ ] Boş state: checkbox işaretsiz = Release Project product seviyesindeki `azureReleaseProject`'ten türetilir (mevcut davranış korunur)

## Kapsam Dışı (Out of Scope)
- Service Release Snapshot / Azure Baseline endpoint'lerine `releaseProject` override entegrasyonu (Faz 2)
- Ürün seviyesindeki `azureReleaseProject` alanının kaldırılması
- Release pipeline validasyonu (geçerli bir project adı mı kontrolü)

## İş Kuralları
- `releaseProject` alanı dolu ise: bu servis için Azure Release API çağrıları bu project'e yapılmalı (Faz 2'de devreye girer)
- `releaseProject` boş ise: product'ın `azureReleaseProject` → yok ise `azureProject` fallback zinciri devam eder
- Checkbox state'i UI'ya özgüdür; backend yalnızca `releaseProject: string | null` değerine bakar

## Öncelik ve Etki
| Boyut | Değerlendirme |
|---|---|
| Kullanıcı etkisi | Çok-project kullanan tüm müşteriler — servis başına tanımlama yapılabilecek |
| İş etkisi | Release Health Check doğruluğunu artırır, Azure baseline hatasını azaltır |
| Teknik risk | Düşük — yeni nullable kolon, mevcut davranışı bozmaz |
| Öncelik | P1 |

## Bağımlılıklar
- Backend: `Service` modeline `releaseProject String?` kolonu eklenmesi + migration
- Frontend: `ServiceDialog.tsx` Stage & Pipeline tab güncellenmesi
- Mevcut `azureReleaseProject` (product seviyesi) ve fallback zinciri korunacak

## Açık Sorular
- [ ] ServiceRow kartında release project görünmesi gerekiyor mu sadece ikon ile mi yeterli? → UX kararı

## Tasarım Notları (UX İçin)
Bu form sabah standupına hazırlık sırasında veya yeni servis onboarding'inde kullanılır. Kullanıcı teknik bir yapılandırma yapıyor; form sade kalmalı. Checkbox default kapalı olmalı; işaretlenince alan smooth bir şekilde (Collapse ile) açılmalı. Alan placeholder'ı gerçekçi örnek içermeli: `örn: SharedReleases`.

## RM Handoff — 2026-03-02
- Scope kararı: FULLSTACK
- ux-required: true
- n8n-required: false
- Öncelik: P1
- Sıradaki rol: ux-designer → backend-developer → frontend-developer
- RM Review bekleniyor: Hayır (akışkan mod)

## Handoff Notları

### Backend — 2026-03-02
- `packages/backend/prisma/schema.prisma` → `Service` modeline `releaseProject String?` eklendi
- Migration uygulandı: `20260302090752_add_service_release_project`
- `services.routes.ts` Zod schema'sına `releaseProject: z.string().optional().nullable()` eklendi
- `tsc --noEmit` → 0 hata

### Frontend — 2026-03-02
- `src/types/index.ts` → `Service` interface'e `releaseProject: string | null` eklendi
- `src/services/serviceService.ts` → `CreateServiceInput`'a `releaseProject?: string | null` eklendi
- `ServiceDialog.tsx` → `Collapse` + `Checkbox` import edildi; `releaseProjectOverride` + `releaseProject` state'leri eklendi; payload'a `releaseProject` eklendi; Tab 1 JSX'e checkbox + Collapse + TextField eklendi
- `ServiceRow.tsx` → `releaseProject` dolu ise sarı `proj: SharedReleases` chip gösterimi eklendi
- `tsc --noEmit` → 0 hata

**status: DONE**
