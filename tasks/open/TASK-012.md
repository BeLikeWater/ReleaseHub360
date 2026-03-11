---
id: TASK-012
status: OPEN
type: FEATURE
scope: FULLSTACK
ux-required: true
n8n-required: false
priority: P1
created-by: release-manager
date: 2026-03-06
---

# TASK-012: Müşteri Code Sync Akışı — Branch Tanımlama + Versiyondan Bağlamsal Açılış

## Özet
Codebase satın almış müşteriler, vendor'ın yayınladığı yeni bir versiyonu müşteri dashboard'dan görüp tek tıkla Code Sync sayfasına bağlam bilgisiyle geçebilmeli; bu sayfada versiyona ait workitem + PR listesini görerek cherry-pick veya toplu sync başlatabilmeli. Bunun için önce müşterinin kod deposunun (farklı Azure DevOps org/project olabilen) sisteme tanıtılması gerekir.

## Problem / Fırsat
- Müşteri dashboard'da sürümü görüyor, "Code Sync'e Git" butonuna basıyor — ancak CodeSyncPage boş açılıyor, hangi ürün/versiyon/müşteri için açıldığını bilmiyor.
- `CustomerBranch` tablosunda `azureOrg`, `azureProject` alanları yok; farklı AzDO organizasyonundaki müşteri repoları desteklenemiyor.
- Admin'in müşteriye branch tanımlaması için UI yok; müşterinin kendi branch bilgisini güncelleyebileceği bir ekran yok.
- Mevcut codeSync endpoints `customerBranch.azureOrg/azureProject` değil, yalnızca ürünün credentials'ını kullanıyor.

## Kullanıcı Hikayeleri
- **Müşteri** olarak versiyona tıkladığımda Code Sync sayfasının benim müşteri bağlamım ve hedef versiyonum dolu şekilde açılmasını istiyorum, çünkü her seferinde ürün/branş seçmek zaman kaybettiriyor.
- **Admin (Release Manager)** olarak müşteriye özel Azure DevOps org/project/PAT ve repo/branch tanımlayabilmek istiyorum, çünkü her müşterinin kodu farklı bir ortamda olabilir.
- **Müşteri** olarak kendi branch PAT'imi ve branch adımı sistem içinden güncelleyebilmek istiyorum, çünkü PAT süresi dolunca yenisini girebilmem gerekiyor.

## Kabul Kriterleri (AC)

### Branch Tanımlama (Admin)
- [ ] AC1: CustomerManagement → müşteri detayında "Code Branch" sekmesi / bölümü var; mevcut CustomerBranch kayıtları listeleniyor
- [ ] AC2: Admin yeni branch ekleyebilir: azureOrg, azureProject, azurePat, repoName, branchName, description alanları
- [ ] AC3: Admin branch silebilir / pasif yapabilir (isActive toggle)
- [ ] AC4: Aynı müşteride birden fazla branch tanımlanabilir (farklı servisler için)

### Branch Tanımlama (Müşteri Self-Edit)
- [ ] AC5: Customer Settings veya customer dashboard'da kendi branch'larını görebilir
- [ ] AC6: Müşteri sadece kendi branch'larının `azurePat`, `branchName`, `description` alanlarını güncelleyebilir (azureOrg / azureProject değiştiremez)
- [ ] AC7: PAT güncelleme sonrası "Kaydedildi" feedback'i gösterilir

### Context Geçişi (CustomerProductVersionsPage → CodeSyncPage)
- [ ] AC8: ArtifactActionButton'daki "Code Sync'e Git" butonu `navigate('/code-sync', { state: { customerId, productId, targetVersionId, sourceVersionId } })` ile bağlam geçirir
- [ ] AC9: `sourceVersionId` = `cpm.currentVersionId` (müşterinin şu an çalıştığı versiyon); null ise kullanıcı manuel seçer
- [ ] AC10: CodeSyncPage `useLocation()` ile state okur; selectedProductId, targetVersionId, sourceVersionId, customerBranchId pre-populate edilir
- [ ] AC11: Navigate state'ten gelen seçimler kullanıcı tarafından değiştirilebilir (kilitli değil)

### Backend Sync Routes Güncelleme
- [ ] AC12: `CustomerBranch.azureOrg` ve `CustomerBranch.azureProject` alanları schema'ya eklendi; null ise product credentials'ı fallback
- [ ] AC13: Tüm codeSync endpoints (delta, conflict-check, start, customer-prs) `customerBranch.azureOrg || productCreds.org` pattern kullanıyor
- [ ] AC14: Backend TS 0 hata

### Customer Branch CRUD Endpoints
- [ ] AC15: `GET /customer-branches?customerId=` mevcut
- [ ] AC16: `POST /customer-branches` (admin only) — yeni branch oluştur
- [ ] AC17: `PUT /customer-branches/:id` (admin veya branchın sahibi müşteri — yalnızca izin verilen alanlar)
- [ ] AC18: `DELETE /customer-branches/:id` (admin only veya isActive: false)

## Kapsam Dışı (Out of Scope)
- GitHub / GitLab entegrasyonu — bu sprint sadece Azure DevOps
- Conflict resolution UI değişikliği — mevcut hali yeterli
- n8n entegrasyonu
- Sync sonrası e-posta bildirimi

## İş Kuralları
- `azureOrg` / `azureProject` admin tarafından set edilir; müşteri bu alanları değiştiremez
- `azurePat` müşteri tarafından güncellenebilir; backend'e kaydedilir (encrypted değil, ileride)
- Aynı `repoName + customerId` çiftinde birden fazla aktif branch olabilir (farklı ortamlar: dev/prod)
- `sourceVersionId` null ise CodeSyncPage'de "Kaynak versiyon seçin" uyarısı gösterilir, delta butonu disable
- Eğer `customerBranch.azureOrg` null ve `product.azureOrg` da null ise hata: "Azure DevOps bağlantısı tanımlı değil"

## Öncelik ve Etki
| Boyut | Değerlendirme |
|---|---|
| Kullanıcı etkisi | Her GIT_SYNC müşteri — core workflow |
| İş etkisi | Müşteri self-service sync → satış diferansiyatörü |
| Teknik risk | Schema migration + codeSync endpoints güncelleme — orta risk |
| Öncelik | P1 |

## Bağımlılıklar
- Backend: `CustomerBranch` schema migration (additive — mevcut kayıtlar null kalır)
- Frontend: CustomerManagement customer detail sayfası (MappingDialog/CustomerDetail)
- Frontend: CustomerProductVersionsPage ArtifactActionButton
- Frontend: CodeSyncPage — mevcut ama context'siz
- MCP Server: Mevcut `/api/code-sync/*` endpoint'ler — değişiklik yok

## Açık Sorular
- [x] Branch yönetim yeri → Her ikisi (admin + müşteri) — **KARAR VERİLDİ**
- [x] Context geçişi → Evet, otomatik pre-populate — **KARAR VERİLDİ**
- [x] Repo tipi → Tamamen farklı AzDO org/project desteklenecek — **KARAR VERİLDİ**
- [ ] Şifreli PAT saklama → Bu sprintte plain text, ileride encrypt — **açık**

## Tasarım Notları (UX İçin)
- CustomerManagement'taki mevcut müşteri detay UI'ı incelenmeli: Tabs veya Accordion yapısı var mı?
- "Code Branch" paneli: tablo formatı (branchName | repoName | azureOrg | lastSync | Düzenle)
- Admin formu: azureOrg, azureProject, azurePat (password input), repoName, branchName, description, isActive
- Müşteri view: sadece azurePat + branchName + description editable; azureOrg/azureProject read-only
- CodeSyncPage: Navigation'dan gelen bağlam sarı info banner ile gösterilmeli ("X versiyonu için sync başlatılıyor")

## Handoff Notları
(Developer doldurur)

## RM Handoff — 2026-03-06
- Scope kararı: FULLSTACK
- ux-required: true
- n8n-required: false
- Öncelik: P1
- Sıradaki rol: ux-designer
- RM Review bekleniyor: Hayır (akışkan zincir)
